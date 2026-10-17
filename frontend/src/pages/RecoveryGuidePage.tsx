import React, { useState, useEffect, useRef } from 'react';
import {
  Heart, ShieldCheck, Pill, Calendar, AlertTriangle, Activity,
  CheckCircle2, Volume2, Pause, Play, Square, Download, Share2,
  FileText, ExternalLink, HelpCircle, ChevronRight, RefreshCw, MessageSquare
} from 'lucide-react';
import { api } from '../utils/api';
import { CarePlan, MedicineItem, WarningSignItem, FollowUpAppointment, DietActivityInstruction } from '../types';
import { t } from '../utils/i18n';
import { ExplainAgainModal } from '../components/ExplainAgainModal';
import { SourceProofModal } from '../components/SourceProofModal';
import { useAuth } from '../context/AuthContext';

interface RecoveryGuidePageProps {
  onNavigate?: (tab: string) => void;
}

export const RecoveryGuidePage: React.FC<RecoveryGuidePageProps> = ({ onNavigate }) => {
  const { language } = useAuth();
  const currentLang = language || 'en';

  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<string>(currentLang);

  // Spoken Guide State
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [isAudioPaused, setIsAudioPaused] = useState<boolean>(false);
  const [audioSpeed, setAudioSpeed] = useState<number>(0.85);
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(-1);

  // Explain Again Modal State
  const [explainModalOpen, setExplainModalOpen] = useState<boolean>(false);
  const [selectedExplainItem, setSelectedExplainItem] = useState<{ id: string; name: string }>({ id: '', name: '' });

  // Source Proof Modal State
  const [sourceModalOpen, setSourceModalOpen] = useState<boolean>(false);
  const [sourceData, setSourceData] = useState<{ title: string; quote: string; page?: number }>({ title: '', quote: '' });

  // Calendar Feedback
  const [calendarSaved, setCalendarSaved] = useState<boolean>(false);
  const [downloadingFridge, setDownloadingFridge] = useState<boolean>(false);

  // Listen for language changes from Navbar
  useEffect(() => {
    const handleLangChange = () => {
      const stored = localStorage.getItem('calmcare_lang') || 'en';
      setActiveLanguage(stored);
    };
    window.addEventListener('storage', handleLangChange);
    return () => window.removeEventListener('storage', handleLangChange);
  }, []);

  // Fetch or load Care Plan
  useEffect(() => {
    const loadPlan = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const planId = queryParams.get('plan_id');

        let data: CarePlan | null = null;
        if (planId) {
          data = await api.get<CarePlan>(`/api/careplan/${planId}`);
        } else {
          // Fetch most recent document's care plan
          const docs = await api.get<any[]>('/api/documents/list');
          if (docs && docs.length > 0) {
            const firstDoc = docs[0];
            const docDetails = await api.get<any>(`/api/documents/${firstDoc.id}`);
            if (docDetails.active_care_plan) {
              data = docDetails.active_care_plan;
            } else if (docDetails.care_plan) {
              data = docDetails.care_plan;
            }
          }
        }

        if (!data) {
          setError("No discharge summary care plan found. Please upload your discharge summary first.");
          setLoading(false);
          return;
        }

        // If active language is different from plan language, translate cleanly
        if (data.language !== currentLang) {
          try {
            const transResult = await api.post<any>('/api/careplan/translate', {
              care_plan_id: data.id,
              target_language: currentLang
            });
            if (transResult && transResult.care_plan) {
              data = transResult.care_plan;
            }
          } catch (tErr) {
            console.warn("Translation notice:", tErr);
          }
        }

        setCarePlan(data);
      } catch (err: any) {
        console.error("Error loading recovery guide:", err);
        setError("Unable to load recovery guide. Please check backend connection or upload a discharge summary.");
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [currentLang]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Sections for audio reading and visual highlight
  const sectionsToRead = React.useMemo(() => {
    if (!carePlan) return [];
    const items = [
      {
        id: 'why_admitted',
        title: t('sec_why_admitted', activeLanguage),
        text: `Why you were in the hospital. ${carePlan.admission_reason || carePlan.patient_summary || carePlan.plain_diagnosis}.`
      },
      {
        id: 'findings',
        title: t('sec_findings', activeLanguage),
        text: `What the hospital found. Your primary diagnosis is ${carePlan.plain_diagnosis}. ${carePlan.hospital_course ? 'Findings: ' + carePlan.hospital_course : ''}`
      },
      {
        id: 'medicines',
        title: t('sec_medicines', activeLanguage),
        text: `Your discharge medications. You have ${carePlan.medicines.length} prescribed medicines. ` +
          carePlan.medicines.map(m => `${m.name}, take ${m.dose} ${m.unit}, ${m.frequency}. ${m.timing || ''}. ${m.plain_purpose ? 'This ' + m.plain_purpose : ''}`).join('. ')
      },
      {
        id: 'home_care',
        title: t('sec_home_care', activeLanguage),
        text: `What you should do at home. ` +
          carePlan.instructions.map(i => `${i.plain_language_explanation}`).join('. ')
      },
      {
        id: 'warnings',
        title: t('sec_warnings', activeLanguage),
        text: `Warning signs to watch for. If you notice ` +
          carePlan.warning_signs.map(w => `${w.sign}, you must ${w.action_required}`).join('. ')
      },
      {
        id: 'appointment',
        title: t('sec_appointment', activeLanguage),
        text: carePlan.follow_ups.length > 0
          ? `Your next hospital visit is on ${carePlan.follow_ups[0].date || 'the scheduled date'} ${carePlan.follow_ups[0].doctor ? 'with ' + carePlan.follow_ups[0].doctor : ''}.`
          : "Please contact your clinic to confirm your routine follow-up appointment."
      },
      {
        id: 'checklist',
        title: t('sec_checklist', activeLanguage),
        text: `Your recovery checklist. ` + (carePlan.checklist || []).join('. ')
      }
    ];
    return items;
  }, [carePlan, activeLanguage]);

  // Audio Guide Controller
  const startAudioGuide = () => {
    if (!('speechSynthesis' in window) || sectionsToRead.length === 0) return;

    window.speechSynthesis.cancel();
    setIsAudioPlaying(true);
    setIsAudioPaused(false);
    readSection(0);
  };

  const readSection = (index: number) => {
    if (index >= sectionsToRead.length) {
      setIsAudioPlaying(false);
      setIsAudioPaused(false);
      setCurrentSectionIndex(-1);
      return;
    }

    setCurrentSectionIndex(index);
    const sec = sectionsToRead[index];
    const utterance = new SpeechSynthesisUtterance(sec.text);
    utterance.rate = audioSpeed;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(activeLanguage) || v.lang.includes('IN'));
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      readSection(index + 1);
    };

    utterance.onerror = () => {
      setIsAudioPlaying(false);
      setCurrentSectionIndex(-1);
    };

    window.speechSynthesis.speak(utterance);
  };

  const pauseAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsAudioPaused(true);
    }
  };

  const resumeAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.resume();
      setIsAudioPaused(false);
    }
  };

  const stopAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsAudioPlaying(false);
    setIsAudioPaused(false);
    setCurrentSectionIndex(-1);
  };

  // Add to Calendar (.ics) — Fixed click handler avoiding router redirect (Issue H)
  const handleAddToCalendar = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!carePlan || carePlan.follow_ups.length === 0) {
      alert("No appointment date is documented in this discharge summary.");
      return;
    }

    const fu = carePlan.follow_ups[0];
    const dateStr = fu.date ? fu.date.replace(/[^0-9]/g, '') : '20261020';
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CalmCare//Patient Recovery Calendar//EN',
      'BEGIN:VEVENT',
      `SUMMARY:Hospital Follow-up - ${fu.doctor || 'Attending Physician'}`,
      `DESCRIPTION:CalmCare Discharge Follow-up Appointment. Bring discharge summary and medication box. Location: ${fu.department || 'Outpatient Clinic'}.`,
      `LOCATION:${fu.department || 'Hospital OPD'}, ${fu.location || 'Hospital'}`,
      `DTSTART:${dateStr}T100000Z`,
      `DTEND:${dateStr}T110000Z`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CalmCare_Appointment_${dateStr}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    setCalendarSaved(true);
    setTimeout(() => setCalendarSaved(false), 4000);
  };

  // Download Fridge Sheet (PDF) — Trigger direct blob download (Issue G)
  const handleDownloadFridgeSheet = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!carePlan) return;
    setDownloadingFridge(true);

    try {
      const response = await fetch(`/api/printable/fridge-sheet/${carePlan.id}?lang=${activeLanguage}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('calmcare_token') || ''}`
        }
      });

      if (!response.ok) {
        // Fallback to navigating to fridge sheet page for browser print
        if (onNavigate) onNavigate('fridgesheet');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CalmCare_Recovery_Guide_${carePlan.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Direct PDF download error, redirecting to printable view:", err);
      if (onNavigate) onNavigate('fridgesheet');
    } finally {
      setDownloadingFridge(false);
    }
  };

  const openExplainModal = (id: string, name: string) => {
    setSelectedExplainItem({ id, name });
    setExplainModalOpen(true);
  };

  const openSourceModal = (title: string, quote: string, page: number = 1) => {
    setSourceData({ title, quote, page });
    setSourceModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mb-4 animate-bounce">
          <Heart className="w-8 h-8 fill-teal-600/20" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Preparing Your Recovery Guide...</h2>
        <p className="text-sm text-slate-500 mt-1">Verifying medical fidelity and simplifying terminology...</p>
      </div>
    );
  }

  if (error || !carePlan) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800">No Recovery Guide Found</h2>
          <p className="text-slate-600 mt-2 max-w-md mx-auto">{error || "Please upload a discharge summary to generate your personalized recovery guide."}</p>
          <button
            onClick={() => onNavigate && onNavigate('upload')}
            className="mt-6 px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors shadow-sm"
          >
            Upload Discharge Summary
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Top Banner / Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs mb-8 overflow-hidden relative z-0">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t('verified_stamp', activeLanguage)}
              </span>
              <span className="text-xs text-slate-600 font-bold">
                {t('grade_level_label', activeLanguage)}: {carePlan.readability_level_label}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">
              {t('guide_title', activeLanguage)}
            </h1>
            <p className="text-xs sm:text-sm text-slate-700 max-w-2xl mt-1 font-medium leading-relaxed">
              {t('guide_subtitle', activeLanguage)}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleDownloadFridgeSheet}
              disabled={downloadingFridge}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs active:scale-95"
              title="Download 1-page PDF printable for your refrigerator"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              {downloadingFridge ? "Downloading..." : t('guide_download_fridge', activeLanguage)}
            </button>

            <button
              onClick={handleAddToCalendar}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors shadow-2xs active:scale-95 ${
                calendarSaved
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
              }`}
              title="Export appointment to your phone or computer calendar"
            >
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              {calendarSaved ? t('guide_calendar_success', activeLanguage) : t('guide_add_calendar', activeLanguage)}
            </button>

            <button
              onClick={() => onNavigate && onNavigate('ask')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-sm active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {t('nav_ask_summary', activeLanguage)}
            </button>
          </div>
        </div>

        {/* AI Spoken Guide Audio Bar in Website Healthcare Green */}
        <div className="bg-gradient-to-r from-[#03362e] via-[#044339] to-[#022822] text-white px-5 sm:px-8 py-3.5 border-t border-emerald-900/50">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-emerald-200 shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">
                  CalmCare Spoken Guide
                </span>
                <span className="text-xs text-white font-semibold">
                  {isAudioPlaying
                    ? `Reading: ${sectionsToRead[currentSectionIndex]?.title || 'Recovery Guide'}`
                    : "Listen to your complete recovery instructions in a calm voice"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Speed selector */}
              <div className="flex items-center gap-1 bg-black/20 border border-white/10 px-2.5 py-1 rounded-xl text-xs font-semibold">
                <span className="text-emerald-300 text-[10px]">{t('guide_speed', activeLanguage)}:</span>
                {[0.75, 1.0, 1.25].map(rate => (
                  <button
                    key={rate}
                    onClick={() => setAudioSpeed(rate)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-colors ${
                      audioSpeed === rate ? 'bg-emerald-500 text-white' : 'text-emerald-200 hover:text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {!isAudioPlaying ? (
                <button
                  onClick={startAudioGuide}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-emerald-400 text-emerald-950 hover:bg-emerald-300 active:scale-95 transition-all shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t('guide_listen_btn', activeLanguage)}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  {isAudioPaused ? (
                    <button
                      onClick={resumeAudio}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-400 text-emerald-950 hover:bg-emerald-300 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {t('guide_resume_btn', activeLanguage)}
                    </button>
                  ) : (
                    <button
                      onClick={pauseAudio}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400 text-amber-950 hover:bg-amber-300 transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      {t('guide_pause_btn', activeLanguage)}
                    </button>
                  )}
                  <button
                    onClick={stopAudio}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    {t('guide_stop_btn', activeLanguage)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: The 9 Required Sections */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        
        {/* Section 1: Why you were in the hospital */}
        <section
          id="sec-why_admitted"
          className={`bg-white rounded-2xl p-6 border shadow-2xs transition-all ${
            currentSectionIndex === 0 ? 'border-teal-500 ring-2 ring-teal-500/30' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t('sec_why_admitted', activeLanguage)}
                </h2>
                <span className="text-xs text-slate-500">Reason for admission in plain words</span>
              </div>
            </div>
            <button
              onClick={() => openExplainModal('sec-1', t('sec_why_admitted', activeLanguage))}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {t('guide_explain_again', activeLanguage)}
            </button>
          </div>

          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80">
            <p className="text-base text-slate-800 leading-relaxed font-medium">
              {carePlan.admission_reason || carePlan.patient_summary || "You were admitted for specialized inpatient evaluation and management as documented by your care team."}
            </p>
            {carePlan.admission_reason && (
              <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Directly sourced from admission records</span>
                <button
                  onClick={() => openSourceModal("Reason for Admission", carePlan.admission_reason || "")}
                  className="text-teal-700 hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  View Original Text
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Section 2: What the hospital found */}
        <section
          id="sec-findings"
          className={`bg-white rounded-2xl p-6 border shadow-2xs transition-all ${
            currentSectionIndex === 1 ? 'border-teal-500 ring-2 ring-teal-500/30' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t('sec_findings', activeLanguage)}
                </h2>
                <span className="text-xs text-slate-500">Documented diagnosis and important test findings</span>
              </div>
            </div>
            <button
              onClick={() => openExplainModal('sec-2', t('sec_findings', activeLanguage))}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {t('guide_explain_again', activeLanguage)}
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/70">
              <div className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-1">
                Primary Diagnosis:
              </div>
              <p className="text-base font-semibold text-slate-900">
                {carePlan.plain_diagnosis}
              </p>
            </div>

            {carePlan.hospital_course && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900 block mb-1">Hospital Course & Test Findings:</span>
                {carePlan.hospital_course}
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Your hospital treatments & procedures */}
        <section
          id="sec-treatments"
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t('sec_treatments', activeLanguage)}
                </h2>
                <span className="text-xs text-slate-500">Procedures and interventions completed during your stay</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              {carePlan.hospital_course
                ? carePlan.hospital_course
                : `Treatments and medical monitoring were performed for ${carePlan.plain_diagnosis}. Please adhere to the post-treatment discharge medication and care plan outlined below.`}
            </p>
          </div>
        </section>

        {/* Section 4 & 5: Your medicines & How to take them */}
        <section
          id="sec-medicines"
          className={`bg-white rounded-2xl p-6 border shadow-2xs transition-all ${
            currentSectionIndex === 2 ? 'border-teal-500 ring-2 ring-teal-500/30' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                4 & 5
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t('sec_medicines', activeLanguage)}
                </h2>
                <span className="text-xs text-slate-500">
                  {t('sec_how_to_take', activeLanguage)} — Exact prescribed doses, units, and frequencies preserved faithfully
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('timetable')}
              className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
            >
              View Full Timetable <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {carePlan.medicines.map((med, idx) => (
              <div
                key={med.id || idx}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-base">{med.name}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      {med.dose} {med.unit}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                      {med.frequency}
                    </span>
                    {med.is_critical_flag && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                        Review Needed: {med.flag_reason || 'Check with pharmacist'}
                      </span>
                    )}
                  </div>

                  {/* Timing and Duration */}
                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                    {med.timing && (
                      <span className="font-medium text-slate-800">
                        🕒 <strong>When:</strong> {med.timing}
                      </span>
                    )}
                    {med.duration && (
                      <span className="text-slate-500">
                        ⏳ <strong>Duration:</strong> {med.duration}
                      </span>
                    )}
                  </div>

                  {/* Plain Purpose — Highlighted from Drug Reference */}
                  <div className="mt-1 pt-1.5 border-t border-slate-100 flex items-start gap-1.5 text-xs">
                    <Pill className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                    <span className="text-slate-700">
                      <strong>What it does: </strong>
                      {med.plain_purpose ? (
                        <span>
                          {med.plain_purpose}{" "}
                          <span className="text-[10px] text-teal-700 font-medium px-1.5 py-0.2 bg-teal-50 rounded border border-teal-200">
                            Approved Reference
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">
                          Purpose not explicitly documented in discharge text; confirm with pharmacist.
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Actions per medicine */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openExplainModal(med.id, med.name)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3 text-slate-500" />
                    {t('guide_explain_again', activeLanguage)}
                  </button>
                  <button
                    onClick={() => openSourceModal(med.name, med.source_passage, med.page_number)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    title="View source citation from discharge summary"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6: Your recovery instructions (Diet, Activity, Restrictions) */}
        <section
          id="sec-home_care"
          className={`bg-white rounded-2xl p-6 border shadow-2xs transition-all ${
            currentSectionIndex === 3 ? 'border-teal-500 ring-2 ring-teal-500/30' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                6
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t('sec_home_care', activeLanguage)}
                </h2>
                <span className="text-xs text-slate-500">Diet, physical activity, wound care, and restrictions</span>
              </div>
            </div>
            <button
              onClick={() => openExplainModal('sec-6', t('sec_home_care', activeLanguage))}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {t('guide_explain_again', activeLanguage)}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {carePlan.instructions.map((inst, idx) => (
              <div
                key={inst.id || idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-teal-600 shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    {inst.category.replace('_', ' ')}
                  </span>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">
                    {inst.plain_language_explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 7: Warning signs */}
        <section
          id="sec-warnings"
          className={`bg-white rounded-2xl p-6 border shadow-2xs transition-all ${
            currentSectionIndex === 4 ? 'border-red-500 ring-2 ring-red-500/30' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                7
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t('sec_warnings', activeLanguage)}
                </h2>
                <span className="text-xs text-slate-500">Documented red flags and required emergency actions</span>
              </div>
            </div>
            <a
              href="tel:108"
              className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              Emergency 108 / 1066
            </a>
          </div>

          <div className="space-y-3">
            {carePlan.warning_signs.map((warn, idx) => (
              <div
                key={warn.id || idx}
                className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                  warn.urgency_level === 'immediate_emergency'
                    ? 'bg-red-50/50 border-red-200'
                    : 'bg-amber-50/50 border-amber-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      warn.urgency_level === 'immediate_emergency' ? 'text-red-600' : 'text-amber-600'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{warn.sign}</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          warn.urgency_level === 'immediate_emergency'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {warn.urgency_level === 'immediate_emergency' ? 'Immediate Emergency' : 'Call Doctor'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      <strong>Plain meaning:</strong> {warn.plain_meaning}
                    </p>
                    <p className="text-xs font-semibold text-slate-800 mt-1">
                      👉 <strong>Action Required:</strong> {warn.action_required}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => openExplainModal(warn.id, warn.sign)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
                >
                  {t('guide_explain_again', activeLanguage)}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Section 8: Your next appointment */}
        <section
          id="sec-appointment"
          className={`bg-white rounded-2xl p-6 border shadow-2xs transition-all ${
            currentSectionIndex === 5 ? 'border-teal-500 ring-2 ring-teal-500/30' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                8
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t('sec_appointment', activeLanguage)}
                </h2>
                <span className="text-xs text-slate-500">Date, department, doctor, and location</span>
              </div>
            </div>
            <button
              onClick={handleAddToCalendar}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              {calendarSaved ? t('guide_calendar_success', activeLanguage) : t('guide_add_calendar', activeLanguage)}
            </button>
          </div>

          {carePlan.follow_ups.length > 0 ? (
            <div className="p-5 rounded-xl bg-indigo-50/40 border border-indigo-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">Date</span>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">
                    {carePlan.follow_ups[0].date || "As scheduled"}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">Time</span>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {carePlan.follow_ups[0].time || "Morning clinic"}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">Doctor</span>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {carePlan.follow_ups[0].doctor || "Attending Physician"}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">Department</span>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {carePlan.follow_ups[0].department || "Outpatient Clinic"}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-indigo-200/60 text-xs text-indigo-950 flex items-center justify-between">
                <span>Please bring your discharge summary and current medicine strips to this appointment.</span>
                <button
                  onClick={() => openSourceModal("Follow-up appointment", carePlan.follow_ups[0].source_passage)}
                  className="font-semibold underline hover:text-indigo-800"
                >
                  Source Proof
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
              No explicit follow-up appointment date was specified in this summary. Please call your hospital's reception to schedule a review visit.
            </div>
          )}
        </section>

        {/* Section 9: What to do next (Checklist) */}
        <section
          id="sec-checklist"
          className={`bg-white rounded-2xl p-6 border shadow-2xs transition-all ${
            currentSectionIndex === 6 ? 'border-teal-500 ring-2 ring-teal-500/30' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                9
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t('sec_checklist', activeLanguage)}
                </h2>
                <span className="text-xs text-slate-500">Ordered, easy-to-follow steps for your home recovery</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {(carePlan.checklist || [
              `Organize your ${carePlan.medicines.length} discharge medications in a cool, dry place and follow prescribed timings strictly.`,
              `Follow documented diet and physical activity restrictions at home.`,
              `Keep emergency contact numbers (108 / 1066) accessible near your phone.`,
              `Attend your follow-up appointment on ${carePlan.follow_ups[0]?.date || 'the scheduled date'}.`
            ]).map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-sm font-semibold text-slate-800 leading-snug">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Navigation / Help Banner */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Have questions about your instructions?</h3>
            <p className="text-xs sm:text-sm text-teal-100 mt-1 max-w-xl">
              Use our verified document chatbot to ask anything about your diagnosis, medicines, or recovery.
            </p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('ask')}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white text-teal-900 hover:bg-teal-50 transition-colors shrink-0 shadow-sm flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-teal-700" />
            {t('chat_title', activeLanguage)}
          </button>
        </div>

      </main>

      {/* Reusable Explain Again Modal (Feature F) */}
      <ExplainAgainModal
        isOpen={explainModalOpen}
        onClose={() => setExplainModalOpen(false)}
        planId={carePlan.id}
        itemId={selectedExplainItem.id}
        itemName={selectedExplainItem.name}
        currentLanguage={activeLanguage}
      />

      {/* Reusable Source Proof Modal */}
      <SourceProofModal
        isOpen={sourceModalOpen}
        onClose={() => setSourceModalOpen(false)}
        title={sourceData.title}
        sourcePassage={sourceData.quote}
        pageNumber={sourceData.page || 1}
      />
    </div>
  );
};
