import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import {
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Sparkles,
  AlertCircle,
  RotateCcw,
  Volume2,
  User,
  Bot,
  AlertTriangle,
  ShieldCheck,
  Plus,
  Trash2,
  Clock,
  ChevronRight,
  Info
} from 'lucide-react';
import { t } from '../utils/i18n';

interface ConversationSummary {
  id: string;
  user_id: string;
  document_id?: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  supporting_quote?: string;
  caution_message?: string;
  is_grounded?: boolean;
  suggested_followups?: string[];
  created_at: string;
}

type MicState = 'idle' | 'listening' | 'processing' | 'error';

export const AskSummaryPage: React.FC = () => {
  const { activePlan, language } = useAuth();
  const activeLanguage = language || 'en';

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Speech Recognition State Machine
  const [micState, setMicState] = useState<MicState>('idle');
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const defaultSampleQuestions = [
    "Why was I admitted to the hospital?",
    "What is each of my medicines for?",
    "When is my next appointment?",
    "What should I avoid doing?",
    "What warning signs should I watch for?",
    "Can you explain my discharge instructions more simply?",
    "Should I double up on a missed dose?"
  ];

  // Map app language to speech recognition BCP-47 tag
  const getSpeechLangCode = (lang: string): string => {
    switch (lang) {
      case 'hi': return 'hi-IN';
      case 'te': return 'te-IN';
      case 'ta': return 'ta-IN';
      case 'mr': return 'mr-IN';
      case 'kn': return 'kn-IN';
      case 'bn': return 'bn-IN';
      default: return 'en-IN';
    }
  };

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [activePlan]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadConversations = async () => {
    try {
      const list = await api.get<ConversationSummary[]>('/api/assistant/conversations');
      setConversations(list);
      if (list.length > 0) {
        // Load first conversation
        if (!activeConvId || !list.some(c => c.id === activeConvId)) {
          selectConversation(list[0].id);
        }
      } else {
        // Automatically create a new one
        await handleNewChat();
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const selectConversation = async (convId: string) => {
    setActiveConvId(convId);
    setLoadingConv(true);
    setErrorBanner(null);
    try {
      const detail = await api.get<{ messages: MessageItem[] }>(`/api/assistant/conversations/${convId}`);
      if (detail.messages && detail.messages.length > 0) {
        setMessages(detail.messages);
      } else {
        // Initial welcome message
        setMessages([
          {
            id: 'welcome',
            sender: 'assistant',
            text: t('chat_welcome', activeLanguage),
            is_grounded: true,
            suggested_followups: defaultSampleQuestions.slice(0, 4),
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (err: any) {
      setErrorBanner("Could not load conversation messages. Please retry.");
    } finally {
      setLoadingConv(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const docId = activePlan?.document_id || undefined;
      const newConv = await api.post<ConversationSummary>('/api/assistant/conversations', {
        document_id: docId,
        title: 'New Conversation'
      });
      setConversations(prev => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: t('chat_welcome', activeLanguage),
          is_grounded: true,
          suggested_followups: defaultSampleQuestions.slice(0, 4),
          created_at: new Date().toISOString()
        }
      ]);
    } catch (err) {
      console.error("Failed to create new conversation:", err);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/assistant/conversations/${convId}`);
      const updated = conversations.filter(c => c.id !== convId);
      setConversations(updated);
      if (activeConvId === convId) {
        if (updated.length > 0) {
          selectConversation(updated[0].id);
        } else {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || loading) return;

    setErrorBanner(null);
    setMicNotice(null);

    // Optimistically add user message
    const userMsg: MessageItem = {
      id: `tmp-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let currentId = activeConvId;
      if (!currentId) {
        const newConv = await api.post<ConversationSummary>('/api/assistant/conversations', {
          document_id: activePlan?.document_id,
          title: textToSend.slice(0, 30)
        });
        currentId = newConv.id;
        setActiveConvId(newConv.id);
      }

      const res = await api.post<{
        user_message: MessageItem;
        assistant_message: MessageItem;
      }>(`/api/assistant/conversations/${currentId}/messages`, {
        text: textToSend,
        document_id: activePlan?.document_id
      });

      // Replace optimistic messages with saved response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== userMsg.id);
        return [...filtered, res.user_message, res.assistant_message];
      });

      // Update conversation in list
      setConversations(prev =>
        prev.map(c =>
          c.id === currentId
            ? {
                ...c,
                title: c.title === 'New Conversation' ? textToSend.slice(0, 35) : c.title,
                last_message: textToSend
              }
            : c
        )
      );
    } catch (err: any) {
      console.error("Failed to send message:", err);
      setErrorBanner("Unable to verify against your discharge summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Speech-to-Text Setup & State Machine
  const toggleSpeechRecognition = () => {
    if (micState === 'listening') {
      stopSpeechRecognition();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicState('error');
      setMicNotice("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = getSpeechLangCode(activeLanguage);
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setMicState('listening');
        setMicNotice(null);

        // Auto-stop after 10s if no sound
        silenceTimerRef.current = setTimeout(() => {
          stopSpeechRecognition();
          setMicNotice("No speech detected. Tap microphone and speak clearly.");
        }, 10000);
      };

      recognition.onresult = (event: any) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        console.warn("Speech recognition error:", event.error);
        if (event.error === 'no-speech') {
          setMicState('idle');
          setMicNotice("No speech detected. Please speak clearly into your microphone.");
        } else if (event.error === 'not-allowed') {
          setMicState('error');
          setMicNotice("Microphone permission was denied. Please allow microphone access in your browser settings.");
        } else {
          setMicState('idle');
          setMicNotice(`Microphone paused: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setMicState('idle');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech initialization error:", err);
      setMicState('error');
      setMicNotice("Unable to activate microphone. Please check browser permissions.");
    }
  };

  const stopSpeechRecognition = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setMicState('idle');
  };

  // Text-to-Speech audio reader
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getSpeechLangCode(activeLanguage);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col md:flex-row gap-4">
      {/* Left Column: Conversation History Sidebar */}
      <div className="w-full md:w-72 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col shrink-0 overflow-hidden">
        {/* Top: New Chat Button */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold text-slate-800">Conversations</span>
          </div>

          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            title="Start a new grounded conversation"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No conversations yet. Tap "New Chat" to begin asking questions.
            </div>
          ) : (
            conversations.map(conv => {
              const isActive = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? 'bg-teal-50 border border-teal-200 text-teal-900 font-bold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs truncate font-semibold">{conv.title}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{new Date(conv.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </p>
                  </div>

                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    title="Delete conversation"
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Active Conversation Messages & Composer */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden min-w-0">
        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800">
              {t('chat_title', activeLanguage)}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
              Grounded AI
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Strictly answers from your verified summary
          </div>
        </div>

        {/* Notices & Banners */}
        {micNotice && (
          <div className="p-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{micNotice}</span>
          </div>
        )}

        {errorBanner && (
          <div className="p-2.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingConv ? (
            <div className="flex items-center justify-center h-48 text-xs text-slate-400 animate-pulse">
              Loading conversation history...
            </div>
          ) : (
            messages.map((m, idx) => {
              const isAssistant = m.sender === 'assistant';
              return (
                <div
                  key={m.id || idx}
                  className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shrink-0 shadow-2xs mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-xl rounded-2xl p-3.5 text-xs ${
                    isAssistant
                      ? 'bg-slate-50 border border-slate-200/80 text-slate-800 shadow-2xs'
                      : 'bg-teal-600 text-white shadow-sm'
                  }`}>
                    {/* Message Body */}
                    <p className="whitespace-pre-line leading-relaxed text-xs">
                      {m.text}
                    </p>

                    {/* Supporting Quote Pill */}
                    {m.supporting_quote && (
                      <div className="mt-2.5 p-2 rounded-lg bg-white border border-teal-100 text-[11px] text-teal-900 flex items-start gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-teal-700">Discharge Citation: </span>
                          <span className="italic">"{m.supporting_quote}"</span>
                        </div>
                      </div>
                    )}

                    {/* Caution Warning */}
                    {m.caution_message && (
                      <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span className="font-semibold">{m.caution_message}</span>
                      </div>
                    )}

                    {/* Audio Readout Button */}
                    {isAssistant && (
                      <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-200/50 text-[10px] text-slate-400">
                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <button
                          onClick={() => speakText(m.text)}
                          className="flex items-center gap-1 text-teal-700 hover:text-teal-900 font-semibold"
                          title="Read out response calmly"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Listen</span>
                        </button>
                      </div>
                    )}

                    {/* Followup suggestion chips */}
                    {isAssistant && m.suggested_followups && m.suggested_followups.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Suggested Questions:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {m.suggested_followups.map((chip, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => handleSend(chip)}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-[11px] text-slate-700 hover:text-teal-900 font-medium transition-colors text-left"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isAssistant && (
                    <div className="w-8 h-8 rounded-xl bg-teal-700 flex items-center justify-center text-white shrink-0 shadow-2xs mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-slate-400 animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                <Bot className="w-4 h-4" />
              </div>
              <span>Searching verified discharge record...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Microphone Button with State Machine */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
                micState === 'listening'
                  ? 'bg-rose-500 border-rose-600 text-white animate-pulse shadow-md shadow-rose-500/20'
                  : micState === 'error'
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title={
                micState === 'listening'
                  ? 'Listening... Tap to stop'
                  : 'Tap to speak your question in your selected language'
              }
            >
              {micState === 'listening' ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Input Field */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about medicines, dosages, appointments, or restrictions..."
              disabled={loading}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={`p-2.5 rounded-xl text-white font-bold transition-all active:scale-95 shadow-sm ${
                loading || !input.trim()
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20'
              }`}
              title="Send question"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
