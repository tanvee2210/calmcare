import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { CarePlan, MedicineItem } from '../types';
import { AudioPlayer } from '../components/AudioPlayer';
import { EmergencyBanner } from '../components/EmergencyBanner';
import { SourceProofModal } from '../components/SourceProofModal';
import { ExplainAgainModal } from '../components/ExplainAgainModal';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Printer,
  Calendar,
  Languages,
  RotateCcw,
  Sparkles,
  FileSearch,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Activity,
  Heart
} from 'lucide-react';

interface CarePlanOverviewPageProps {
  onNavigate: (tab: string) => void;
}

export const CarePlanOverviewPage: React.FC<CarePlanOverviewPageProps> = ({ onNavigate }) => {
  const { activePlan, setActivePlan, language, setLanguage } = useAuth();
  const [selectedProof, setSelectedProof] = useState<{
    isOpen: boolean;
    title: string;
    sourcePassage: string;
    extractedValue?: string;
  }>({ isOpen: false, title: '', sourcePassage: '' });

  const [explainModalOpen, setExplainModalOpen] = useState(false);
  const [selectedExplainItem, setSelectedExplainItem] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [calendarSuccess, setCalendarSuccess] = useState(false);
  const [translating, setTranslating] = useState(false);

  // Synchronize language when changed via TopHeader or Settings
  useEffect(() => {
    if (activePlan && activePlan.language !== language && !translating) {
      handleTranslate(language);
    }
  }, [language, activePlan?.id]);

  if (!activePlan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900">No Care Plan Available</h2>
        <p className="text-xs text-slate-500 mt-2 mb-4">Please upload a hospital discharge summary first.</p>
        <button
          onClick={() => onNavigate('upload')}
          className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700"
        >
          Go to Upload
        </button>
      </div>
    );
  }

  // Handle Language Switching via Backend Translation API
  const handleTranslate = async (targetLang: string) => {
    if (targetLang === activePlan.language) return;
    setTranslating(true);
    try {
      const res = await api.post<any>('/api/careplan/translate', {
        care_plan_id: activePlan.id,
        target_language: targetLang,
      });
      setLanguage(targetLang);
      setActivePlan(res.care_plan);
    } catch (err: any) {
      alert("Translation notice: " + (err.message || "Failed to translate plan"));
    } finally {
      setTranslating(false);
    }
  };

  // Feature 26: Explain Again
  const handleOpenExplainModal = (itemId: string, itemName: string) => {
    setSelectedExplainItem({ id: itemId, name: itemName });
    setExplainModalOpen(true);
  };

  const handleExportCalendar = async (e: React.MouseEvent, fu: any) => {
    e.preventDefault();
    if (!activePlan) return;
    try {
      const response = await fetch(`/api/printable/calendar-export/${activePlan.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('calmcare_token') || ''}`
        }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CalmCare_Appointment_${activePlan.id.slice(0, 8)}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setCalendarSuccess(true);
        setTimeout(() => setCalendarSuccess(false), 4000);
      } else {
        triggerClientIcsDownload(fu);
      }
    } catch (err) {
      triggerClientIcsDownload(fu);
    }
  };

  const triggerClientIcsDownload = (fu: any) => {
    const dateStr = fu?.date ? fu.date.replace(/[^0-9]/g, '') : '20261020';
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CalmCare//Patient Recovery Calendar//EN',
      'BEGIN:VEVENT',
      `SUMMARY:Hospital Follow-up - ${fu?.doctor || 'Attending Physician'}`,
      `DESCRIPTION:CalmCare Discharge Follow-up Appointment. Location: ${fu?.department || 'Outpatient Clinic'}.`,
      `LOCATION:${fu?.department || 'Hospital OPD'}, ${fu?.location || 'Hospital'}`,
      `DTSTART:${dateStr}T100000Z`,
      `DTEND:${dateStr}T110000Z`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CalmCare_Appointment_${dateStr}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    setCalendarSuccess(true);
    setTimeout(() => setCalendarSuccess(false), 4000);
  };

  // Compile full text for spoken audio narration
  const fullNarrationText = `Care Plan for ${activePlan.plain_diagnosis}. ` +
    activePlan.medicines.map(m => `${m.name}, take ${m.dose} ${m.unit}, ${m.frequency}. ${m.timing || ''}.`).join(' ') +
    ` Warning signs: ` + activePlan.warning_signs.map(w => w.sign).join(', ');

  const isVerified = activePlan.verification_status === 'verified_against_source';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Emergency Guidance Notice */}
      <EmergencyBanner />

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                isVerified
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {isVerified ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {isVerified ? 'VERIFIED AGAINST SOURCE' : 'REVIEW REQUIRED • UNVERIFIED'}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                Reading Level: {activePlan.readability_level_label}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
              {activePlan.plain_diagnosis}
            </h1>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-teal-600 shrink-0" />
            <select
              value={activePlan.language}
              disabled={translating}
              onChange={e => handleTranslate(e.target.value)}
              className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-800"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
            </select>

            <button
              onClick={() => onNavigate('recovery-guide')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <Heart className="w-3.5 h-3.5" /> Recovery Guide
            </button>

            <button
              onClick={() => onNavigate('fridgesheet')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
            >
              <Printer className="w-3.5 h-3.5" /> Fridge Sheet
            </button>
          </div>
        </div>

        {/* Calm Spoken Audio Narration */}
        <div className="mt-4">
          <AudioPlayer textToRead={fullNarrationText} sectionTitle="Complete Plan Narration" />
        </div>
      </div>


      {/* Section 1: Medicines & Exact Doses */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              1. Prescribed Medicines & Exact Directions
            </h2>
            <p className="text-xs text-slate-500">
              Every dose and frequency matches your discharge summary without alteration.
            </p>
          </div>
          <button
            onClick={() => onNavigate('timetable')}
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            View Visual Schedule →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="pb-2.5">Medicine</th>
                <th className="pb-2.5">Exact Dose</th>
                <th className="pb-2.5">Frequency</th>
                <th className="pb-2.5">Timing & Food</th>
                <th className="pb-2.5">Duration</th>
                <th className="pb-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activePlan.medicines.map((med, idx) => (
                <tr key={med.id || idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 font-bold text-slate-900">
                    {med.name}
                    {med.is_critical_flag && (
                      <span className="block text-[10px] text-amber-700 font-semibold">
                        ⚠️ Review required
                      </span>
                    )}
                  </td>
                  <td className="py-3 font-mono font-bold text-teal-700">
                    {med.dose} {med.unit}
                  </td>
                  <td className="py-3 font-medium text-slate-700">
                    {med.frequency}
                  </td>
                  <td className="py-3 text-slate-600">
                    {med.timing || 'Take with water'}
                  </td>
                  <td className="py-3 font-medium text-slate-700">
                    {med.duration || 'As directed'}
                  </td>
                  <td className="py-3 text-right space-x-1 whitespace-nowrap">
                    <button
                      onClick={() =>
                        setSelectedProof({
                          isOpen: true,
                          title: med.name,
                          sourcePassage: med.source_passage,
                          extractedValue: `${med.dose} ${med.unit} (${med.frequency})`,
                        })
                      }
                      title="View source sentence in original document"
                      className="px-2 py-1 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 rounded text-[11px] font-semibold transition-colors"
                    >
                      Source Proof
                    </button>
                    <button
                      onClick={() => handleOpenExplainModal(med.id, med.name)}
                      title="Explain this medicine in simpler terms"
                      className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded text-[11px] font-semibold transition-colors"
                    >
                      Explain Again
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Warning Signs - Seek Immediate Help */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-base font-bold text-rose-900 pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          2. Documented Warning Signs - When to Seek Urgent Care
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activePlan.warning_signs.map(warn => (
            <div
              key={warn.id}
              className={`p-3.5 rounded-xl border ${
                warn.urgency_level === 'immediate_emergency'
                  ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                  : 'bg-amber-50/60 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">{warn.sign}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80">
                  {warn.urgency_level === 'immediate_emergency' ? 'EMERGENCY' : 'CONTACT DOCTOR'}
                </span>
              </div>
              <p className="text-xs opacity-90">{warn.plain_meaning}</p>
              <p className="text-[11px] font-bold mt-2 pt-2 border-t border-slate-200/50">
                Action: {warn.action_required}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Next Follow-Up Appointments */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-teal-600" />
          3. Next Appointments & Follow-up
        </h2>

        {activePlan.follow_ups.length > 0 ? (
          <div className="space-y-3">
            {activePlan.follow_ups.map(fu => (
              <div key={fu.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-sm font-bold text-slate-900 block">
                    {fu.date ? `Appointment on ${fu.date}` : 'Follow-up date to be confirmed'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Department: {fu.department || 'Hospital OPD'} • Doctor: {fu.doctor || 'Attending Physician'}
                  </span>
                </div>
                <button
                  onClick={(e) => handleExportCalendar(e, fu)}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm whitespace-nowrap text-center transition-colors"
                >
                  {calendarSuccess ? "Added to Calendar!" : "Add to Calendar (.ics)"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No specific appointment date noted in summary. Please call your clinic.</p>
        )}
      </section>

      {/* Section 4: Diet, Activity & Wound Care */}
      {activePlan.instructions.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            4. Diet, Activity & Self-Care Instructions
          </h2>

          <div className="space-y-2.5">
            {activePlan.instructions.map(inst => (
              <div key={inst.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 uppercase mt-0.5">
                  {inst.category}
                </span>
                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  {inst.source_instruction}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 5: Questions for Doctor */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 mb-3 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-teal-600" />
          5. Recommended Questions to Confirm With Your Doctor
        </h2>
        <ul className="space-y-2 text-xs text-slate-700">
          {activePlan.questions_for_doctor.map((q, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-teal-600 font-bold">•</span>
              <span>{q}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Source Proof Modal */}
      <SourceProofModal
        isOpen={selectedProof.isOpen}
        onClose={() => setSelectedProof({ ...selectedProof, isOpen: false })}
        title={selectedProof.title}
        sourcePassage={selectedProof.sourcePassage}
        extractedValue={selectedProof.extractedValue}
      />

      {/* Explain Again Modal */}
      <ExplainAgainModal
        isOpen={explainModalOpen}
        onClose={() => setExplainModalOpen(false)}
        planId={activePlan.id}
        itemId={selectedExplainItem.id}
        itemName={selectedExplainItem.name}
        currentLanguage={language}
      />
    </div>
  );
};
