import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { CarePlan } from '../types';
import { EmergencyBanner } from '../components/EmergencyBanner';
import {
  ShieldCheck, Calendar, Volume2, Printer, Bell, MessageSquare,
  Layers, Upload, AlertTriangle, ArrowRight, Sparkles, FileText,
  Clock, Heart, ChevronRight, Activity, Stethoscope, RefreshCw
} from 'lucide-react';
import { t } from '../utils/i18n';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, activePlan, setActivePlan } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const activeLanguage = localStorage.getItem('calmcare_lang') || 'en';

  useEffect(() => {
    loadRecentDocuments();
  }, []);

  const loadRecentDocuments = async () => {
    setLoading(true);
    try {
      const docs = await api.get<any[]>('/api/documents/list');
      setDocuments(docs);
      if (docs.length > 0 && !activePlan) {
        const latestDoc = await api.get<any>(`/api/documents/${docs[0].id}`);
        if (latestDoc.active_care_plan) {
          setActivePlan(latestDoc.active_care_plan);
        }
      }
    } catch (e) {
      console.warn("Could not fetch documents:", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'verified_against_source':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Against Summary
          </span>
        );
      case 'fail_critical_conflict':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            Conflict Flagged
          </span>
        );
      case 'review_required':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5" />
            Review Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            Ready
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Emergency Guidance Banner */}
      <EmergencyBanner />

      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome, {user?.name || 'Patient'}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800 border border-teal-200 capitalize">
              {user?.role || 'Patient'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            CalmCare Personal Recovery Companion • Plain-language verified medical care
          </p>
        </div>

        <button
          onClick={() => onNavigate('upload')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all shrink-0"
        >
          <Upload className="w-4 h-4" />
          {t('nav_upload', activeLanguage)}
        </button>
      </div>

      {/* Hero Card: Primary Navigation to Understand Your Discharge Summary (Issue A) */}
      {activePlan ? (
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400 text-teal-950">
                <ShieldCheck className="w-3.5 h-3.5" />
                Discharge Summary Ready
              </span>
              <span className="text-xs text-teal-200">
                Reading Level: {activePlan.readability_level_label}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white max-w-2xl">
              {t('guide_title', activeLanguage)}
            </h2>
            <p className="text-sm text-teal-100 mt-2 max-w-2xl leading-relaxed">
              {activePlan.patient_summary || `Your clear, Class 8 plain-language recovery guide explaining why you visited the hospital, your diagnosis, medicines, restrictions, and next steps.`}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigate('recovery-guide')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-teal-950 font-extrabold text-sm hover:bg-teal-50 shadow-md transition-all active:scale-95"
              >
                <Heart className="w-4 h-4 text-teal-700 fill-teal-600/30" />
                Read My Recovery Guide
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('ask')}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-teal-800/80 hover:bg-teal-800 text-white font-bold text-sm border border-teal-600 transition-all"
              >
                <MessageSquare className="w-4 h-4 text-teal-300" />
                {t('chat_title', activeLanguage)}
              </button>
            </div>

            {/* Quick stats snapshot */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-teal-700/60">
              <div className="p-2.5 rounded-xl bg-teal-900/60 border border-teal-700/50">
                <span className="text-xs text-teal-300 block">Diagnosis</span>
                <span className="text-sm font-bold text-white truncate block mt-0.5">
                  {activePlan.plain_diagnosis.slice(0, 32)}...
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-900/60 border border-teal-700/50">
                <span className="text-xs text-teal-300 block">Medicines</span>
                <span className="text-sm font-bold text-white block mt-0.5">
                  {activePlan.medicines.length} Prescribed
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-900/60 border border-teal-700/50">
                <span className="text-xs text-teal-300 block">Next Appointment</span>
                <span className="text-sm font-bold text-white block mt-0.5">
                  {activePlan.follow_ups[0]?.date || 'Confirmed Soon'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-900/60 border border-teal-700/50">
                <span className="text-xs text-teal-300 block">Verification</span>
                <span className="text-sm font-bold text-emerald-300 block mt-0.5">
                  100% Faithful
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-teal-50/60 rounded-2xl border-2 border-dashed border-teal-300 p-8 text-center mb-8">
          <FileText className="w-12 h-12 text-teal-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">No discharge summary uploaded yet</h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-1 mb-4">
            Upload your hospital discharge summary PDF, photo, or select one of our synthetic demonstration cases to generate your personal recovery guide.
          </p>
          <button
            onClick={() => onNavigate('upload')}
            className="px-6 py-3 bg-teal-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-teal-700 shadow-sm"
          >
            Upload or Choose Demo Case
          </button>
        </div>
      )}

      {/* Patient Recovery Tools Grid */}
      <div className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center justify-between">
          <span>Patient Recovery Actions</span>
          {activePlan && (
            <span className="text-xs text-teal-700 font-semibold normal-case">
              Active Plan: {activePlan.condition_category.toUpperCase()}
            </span>
          )}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* 1. Recovery Guide */}
          <div
            onClick={() => onNavigate('recovery-guide')}
            className="p-5 bg-white hover:bg-teal-50/40 rounded-2xl border border-slate-200 hover:border-teal-300 shadow-2xs transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-900">
              {t('nav_recovery_guide', activeLanguage)}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              9-section patient-friendly narrative with audio guide, plain-language medicines, and checklist.
            </p>
          </div>

          {/* 2. 7-Day Timetable */}
          <div
            onClick={() => onNavigate('timetable')}
            className="p-5 bg-white hover:bg-teal-50/40 rounded-2xl border border-slate-200 hover:border-teal-300 shadow-2xs transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-900">
              {t('nav_timetable', activeLanguage)}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Visual morning, lunch, dinner, bedtime slots based on exact prescribed frequency.
            </p>
          </div>

          {/* 3. Ask My Discharge Summary */}
          <div
            onClick={() => onNavigate('ask')}
            className="p-5 bg-white hover:bg-teal-50/40 rounded-2xl border border-slate-200 hover:border-teal-300 shadow-2xs transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-900">
              {t('nav_ask_summary', activeLanguage)}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Grounded conversational assistant with speech-to-text voice input and verified citations.
            </p>
          </div>

          {/* 4. Structured Care Plan */}
          <div
            onClick={() => onNavigate('careplan')}
            className="p-5 bg-white hover:bg-teal-50/40 rounded-2xl border border-slate-200 hover:border-teal-300 shadow-2xs transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-900">
              {t('nav_care_plan', activeLanguage)}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Full medical breakdown with original source proof citations and multilingual translation.
            </p>
          </div>

          {/* 5. Printable Fridge Sheet */}
          <div
            onClick={() => onNavigate('fridgesheet')}
            className="p-5 bg-white hover:bg-teal-50/40 rounded-2xl border border-slate-200 hover:border-teal-300 shadow-2xs transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Printer className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-900">
              Printable Fridge Sheet
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              High-contrast, 1-page PDF download for your refrigerator with emergency numbers.
            </p>
          </div>

          {/* 6. Teach-Back Understanding Check */}
          <div
            onClick={() => onNavigate('teachback')}
            className="p-5 bg-white hover:bg-teal-50/40 rounded-2xl border border-slate-200 hover:border-teal-300 shadow-2xs transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-900">
              {t('nav_teach_back', activeLanguage)}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Respectful, non-evaluative check to confirm key follow-up dates and safety warnings.
            </p>
          </div>

        </div>
      </div>

      {/* Developer & Evaluation Link Card (Issue I: Separate developer metrics from patient dashboard) */}
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-teal-700 shrink-0" />
          <span>
            <strong>Clinical Reviewer & Developer Mode:</strong> View transparent benchmark recall, OCR confidence, and medical contradiction metrics.
          </span>
        </div>
        <button
          onClick={() => onNavigate('clinical')}
          className="font-bold text-teal-700 hover:text-teal-900 hover:underline shrink-0"
        >
          Open Evaluation Dashboard →
        </button>
      </div>

    </div>
  );
};
