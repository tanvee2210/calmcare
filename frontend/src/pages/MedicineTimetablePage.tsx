import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { SevenDayTimetable } from '../types';
import { Calendar, Clock, Sun, Sunrise, Sunset, Moon, Bell, CheckCircle2 } from 'lucide-react';

export const MedicineTimetablePage: React.FC = () => {
  const { activePlan } = useAuth();
  const [timetable, setTimetable] = useState<SevenDayTimetable | null>(null);
  const [loading, setLoading] = useState(false);
  const [reminderSaved, setReminderSaved] = useState<string | null>(null);

  useEffect(() => {
    if (activePlan) {
      loadTimetable();
    }
  }, [activePlan]);

  const loadTimetable = async () => {
    if (!activePlan) return;
    setLoading(true);
    try {
      const data = await api.get<SevenDayTimetable>(`/api/reminders/timetable/${activePlan.id}`);
      setTimetable(data);
    } catch (e) {
      console.warn("Failed to load timetable:", e);
    } finally {
      setLoading(false);
    }
  };

  const setReminderPreference = async (medName: string, dose: string, slot: string) => {
    try {
      await api.post('/api/reminders/create', {
        medicine_name: medName,
        dose,
        reminder_slot: slot,
        user_preferred_time: slot.includes('Morning') ? '08:30 AM' : slot.includes('Bedtime') ? '10:00 PM' : '01:30 PM',
      });
      setReminderSaved(`Saved reminder preference for ${medName}`);
      setTimeout(() => setReminderSaved(null), 3000);
    } catch (e: any) {
      alert("Error saving reminder preference: " + e.message);
    }
  };

  const getSlotIcon = (name: string) => {
    if (name.includes('Morning')) return <Sunrise className="w-5 h-5 text-amber-500" />;
    if (name.includes('Afternoon')) return <Sun className="w-5 h-5 text-orange-500" />;
    if (name.includes('Evening')) return <Sunset className="w-5 h-5 text-rose-500" />;
    return <Moon className="w-5 h-5 text-indigo-500" />;
  };

  if (!activePlan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900">No Active Care Plan</h2>
        <p className="text-xs text-slate-500 mt-2">Upload a discharge summary to generate your medicine timetable.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Calendar className="w-7 h-7 text-teal-600" />
          7-Day Visual Medicine Timetable
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Feature 10 • Organised into daily routine slots without guessing artificial clock times.
        </p>
      </div>

      {reminderSaved && (
        <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{reminderSaved}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Loading verified timetable...
        </div>
      ) : timetable ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {timetable.slots.map((slot, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
                    {getSlotIcon(slot.slot_name)}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{slot.slot_name}</h3>
                      <p className="text-[11px] text-slate-500">{slot.time_guidance}</p>
                    </div>
                  </div>

                  {slot.medicines.length > 0 ? (
                    <div className="space-y-2.5">
                      {slot.medicines.map((m, mIdx) => (
                        <div key={mIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{m.name}</span>
                            <span className="text-[11px] text-teal-700 font-mono font-medium">
                              Take {m.dose} {m.unit} • {m.timing || m.frequency}
                            </span>
                          </div>

                          <button
                            onClick={() => setReminderPreference(m.name, m.dose, slot.slot_name)}
                            title="Add in-app reminder preference"
                            className="p-1.5 bg-white hover:bg-teal-50 border border-slate-200 text-teal-700 rounded-lg text-xs"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      No medicines scheduled for this slot.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Safety Rule Note on Timetables */}
          <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl text-xs text-teal-900 space-y-1">
            <span className="font-bold block text-teal-950">Safety Boundary for Medicine Schedules:</span>
            {timetable.notes.map((note, i) => (
              <p key={i}>• {note}</p>
            ))}
          </div>
        </div>
      ) : null}

    </div>
  );
};
