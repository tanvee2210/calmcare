import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Reminder } from '../types';
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
  Heart,
  TrendingUp,
  AlertTriangle,
  Plus
} from 'lucide-react';

export const RemindersPage: React.FC = () => {
  const { user, activePlan } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Check-in state
  const [feeling, setFeeling] = useState<'better' | 'same' | 'worse'>('same');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [completedMeds, setCompletedMeds] = useState(true);
  const [checkinHistory, setCheckinHistory] = useState<any[]>([]);
  const [urgentAlert, setUrgentAlert] = useState<string | null>(null);

  const potentialSymptoms = [
    "Mild fatigue",
    "Slight surgical wound tenderness",
    "Severe chest pain or heaviness (Urgent)",
    "Shortness of breath at rest (Urgent)",
    "Dizziness or blackouts (Urgent)",
    "Fever above 101 F (Urgent)",
    "Nausea after food",
  ];

  useEffect(() => {
    loadReminders();
    loadHistory();
  }, []);

  const loadReminders = async () => {
    try {
      const data = await api.get<Reminder[]>('/api/reminders/list');
      setReminders(data);
    } catch (e) {
      console.warn("Could not load reminders:", e);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await api.get<any>('/api/reminders/check-in/history');
      setCheckinHistory(data.checkins || []);
    } catch (e) {
      console.warn("Could not load history:", e);
    }
  };

  const handleReminderAction = async (reminderId: string, action: string) => {
    try {
      const res = await api.post<any>('/api/reminders/log-action', {
        reminder_id: reminderId,
        action,
      });
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 5000);
    } catch (e: any) {
      alert("Error logging action: " + e.message);
    }
  };

  const toggleSymptom = (sym: string) => {
    setSymptoms(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  const submitCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrgentAlert(null);
    try {
      const res = await api.post<any>('/api/reminders/check-in', {
        feeling_level: feeling,
        symptoms,
        completed_all_meds: completedMeds,
      });

      if (res.urgent_symptom_detected) {
        setUrgentAlert(res.urgent_guidance);
      } else {
        setActionNotice("Daily recovery check-in recorded successfully.");
        setTimeout(() => setActionNotice(null), 4000);
      }

      setSymptoms([]);
      loadHistory();
    } catch (e: any) {
      alert("Error submitting check-in: " + e.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Bell className="w-7 h-7 text-teal-600" />
          Reminders & Daily Recovery Check-in
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Features 18, 21, 22 & 23 • Patient-reported adherence and recovery trends with immediate urgent triage.
        </p>
      </div>

      {actionNotice && (
        <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <span>{actionNotice}</span>
        </div>
      )}

      {urgentAlert && (
        <div className="mb-6 p-5 bg-rose-50 border-2 border-rose-600 rounded-2xl text-rose-950 text-xs shadow-md animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-black text-rose-900 uppercase tracking-wider">
                Emergency Warning Sign Detected!
              </h3>
              <p className="mt-1 font-medium leading-relaxed">{urgentAlert}</p>
              <div className="mt-3">
                <a
                  href="tel:108"
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg font-bold text-xs shadow-sm inline-block"
                >
                  Call Ambulance (108) Now
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Column 1: Reminders & Task Actions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Active Medicine Reminders
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {reminders.length} Active
            </span>
          </div>

          {reminders.length > 0 ? (
            <div className="space-y-3">
              {reminders.map(r => (
                <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">{r.medicine_name}</span>
                    <span className="text-xs text-slate-500">
                      Take {r.dose} • {r.slot} ({r.preferred_time})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      onClick={() => handleReminderAction(r.id, 'taken')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95"
                    >
                      Taken ✓
                    </button>
                    <button
                      onClick={() => handleReminderAction(r.id, 'snoozed')}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Snooze
                    </button>
                    <button
                      onClick={() => handleReminderAction(r.id, 'skipped')}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              No active reminder times saved yet. Go to your 7-Day Timetable to enable reminder preferences.
            </div>
          )}
        </div>

        {/* Column 2: Daily Recovery Check-in */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-4">
            Daily Recovery Check-In
          </h2>

          <form onSubmit={submitCheckin} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                How are you feeling today?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'better', label: 'Better' },
                  { id: 'same', label: 'About the same' },
                  { id: 'worse', label: 'More uncomfortable' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFeeling(opt.id as any)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      feeling === opt.id
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Are you noticing any of these symptoms?
              </label>
              <div className="space-y-1.5">
                {potentialSymptoms.map(sym => {
                  const isChecked = symptoms.includes(sym);
                  const isUrgent = sym.includes('(Urgent)');
                  return (
                    <div
                      key={sym}
                      onClick={() => toggleSymptom(sym)}
                      className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        isChecked
                          ? isUrgent
                            ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold'
                            : 'bg-teal-50 border-teal-300 text-teal-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{sym}</span>
                      {isChecked && <span className="font-bold">✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="meds-taken"
                checked={completedMeds}
                onChange={e => setCompletedMeds(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <label htmlFor="meds-taken" className="text-xs font-medium text-slate-700">
                I have taken all my documented medicines as instructed today.
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              Submit Daily Check-In
            </button>
          </form>
        </div>

      </div>

      {/* Recovery History Log */}
      {checkinHistory.length > 0 && (
        <div className="mt-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            Your Recent Self-Reported Check-In History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Feeling</th>
                  <th className="pb-2">Reported Symptoms</th>
                  <th className="pb-2">Medicines Adherence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {checkinHistory.map((ch, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 text-slate-500">{ch.created_at.slice(0, 10)}</td>
                    <td className="py-2.5 capitalize font-bold text-slate-800">{ch.feeling_level}</td>
                    <td className="py-2.5 text-slate-600">
                      {ch.symptoms.length > 0 ? ch.symptoms.join(', ') : 'None reported'}
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ch.completed_meds ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {ch.completed_meds ? 'Confirmed Taken' : 'Incomplete'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 italic">
            Note: Self-reported check-in history is an organizational aid and does not constitute certified medical recovery.
          </p>
        </div>
      )}

    </div>
  );
};
