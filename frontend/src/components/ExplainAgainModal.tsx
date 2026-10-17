import React, { useState } from 'react';
import { Sparkles, Volume2, Globe, Clock, FileText, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { api } from '../utils/api';
import { t } from '../utils/i18n';

interface ExplainAgainModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  itemId: string;
  itemName: string;
  currentLanguage: string;
}

export const ExplainAgainModal: React.FC<ExplainAgainModalProps> = ({
  isOpen,
  onClose,
  planId,
  itemId,
  itemName,
  currentLanguage,
}) => {
  const [selectedMode, setSelectedMode] = useState<'simpler' | 'slower' | 'language' | 'audio' | 'source'>('simpler');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFetchExplanation = async (mode: 'simpler' | 'slower' | 'language' | 'audio' | 'source') => {
    setSelectedMode(mode);
    setLoading(true);
    setResult(null);

    // Stop existing speech if any
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const data = await api.post<any>(`/api/careplan/${planId}/explain-again?item_id=${encodeURIComponent(itemId)}&mode=${mode}`);
      setResult(data);

      if (mode === 'slower' || mode === 'audio') {
        speakText(data.simplified_explanation, mode === 'slower' ? 0.70 : 0.85);
      }
    } catch (err) {
      console.error("Failed to explain again:", err);
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text: string, rate: number = 0.85) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.0;

    // Pick voice matching language
    const voices = window.speechSynthesis.getVoices();
    const langVoice = voices.find(v => v.lang.startsWith(currentLanguage) || v.lang.includes('IN'));
    if (langVoice) {
      utterance.voice = langVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleClose = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setResult(null);
    onClose();
  };

  const options = [
    {
      id: 'simpler' as const,
      label: t('explain_simpler', currentLanguage),
      desc: "Uses plain everyday words (approx. Class 5 reading level) without altering medical numbers or doses.",
      icon: Sparkles,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200"
    },
    {
      id: 'slower' as const,
      label: t('explain_slower', currentLanguage),
      desc: "Deliberate 0.70x spoken pacing with calming pauses between numbers and instructions.",
      icon: Clock,
      color: "text-blue-700 bg-blue-50 border-blue-200"
    },
    {
      id: 'language' as const,
      label: t('explain_language', currentLanguage),
      desc: "Provides verified instruction in your chosen regional language.",
      icon: Globe,
      color: "text-purple-700 bg-purple-50 border-purple-200"
    },
    {
      id: 'audio' as const,
      label: t('explain_audio', currentLanguage),
      desc: "Reads the instruction aloud in a clear, soothing voice.",
      icon: Volume2,
      color: "text-amber-700 bg-amber-50 border-amber-200"
    },
    {
      id: 'source' as const,
      label: t('explain_source', currentLanguage),
      desc: "Displays the original unchanged line from your discharge summary.",
      icon: FileText,
      color: "text-slate-700 bg-slate-50 border-slate-200"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="explain-modal-title">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <RefreshCw className="w-5 h-5 animate-spin-reverse" />
            </div>
            <div>
              <h3 id="explain-modal-title" className="text-xl font-bold text-slate-900">
                {t('explain_modal_title', currentLanguage)}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {itemName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mt-3 mb-4">
          {t('explain_modal_subtitle', currentLanguage)}
        </p>

        {/* 5 Explicit User Options */}
        <div className="space-y-2">
          {options.map(opt => {
            const Icon = opt.icon;
            const isSelected = selectedMode === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleFetchExplanation(opt.id)}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  isSelected ? 'border-teal-500 bg-teal-50/50 shadow-sm ring-1 ring-teal-500' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-lg ${opt.color} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-slate-900">{opt.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Result Panel */}
        {loading && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-2 text-sm text-slate-600">
            <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
            Preparing gentle explanation...
          </div>
        )}

        {result && !loading && (
          <div className="mt-5 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Gentle Explanation
              </span>
              <button
                onClick={() => speakText(result.simplified_explanation, selectedMode === 'slower' ? 0.70 : 0.85)}
                className="text-xs flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-900 bg-white px-2.5 py-1 rounded-md border border-teal-200 shadow-2xs hover:bg-teal-50"
              >
                <Volume2 className="w-3.5 h-3.5" />
                {isSpeaking ? "Speaking..." : "Read Again"}
              </button>
            </div>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              {result.simplified_explanation}
            </p>

            {result.source_proof && (
              <div className="mt-3 pt-3 border-t border-emerald-200/60 text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Source Quote:</span>
                <span className="italic ml-1">"{result.source_proof}"</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            {t('explain_close', currentLanguage)}
          </button>
        </div>
      </div>
    </div>
  );
};
