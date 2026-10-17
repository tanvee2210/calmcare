import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { CarePlan, MedicineItem } from '../types';
import { FileSearch, CheckCircle2, AlertTriangle, Edit3, ShieldCheck, ArrowRight } from 'lucide-react';

interface ExtractionReviewPageProps {
  onNavigate: (tab: string) => void;
}

export const ExtractionReviewPage: React.FC<ExtractionReviewPageProps> = ({ onNavigate }) => {
  const { activePlan, setActivePlan } = useAuth();
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [editDose, setEditDose] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editFreq, setEditFreq] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!activePlan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900">No Document to Review</h2>
        <button
          onClick={() => onNavigate('upload')}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
        >
          Go to Upload
        </button>
      </div>
    );
  }

  const startEdit = (med: MedicineItem) => {
    setEditingMedId(med.id);
    setEditDose(med.dose);
    setEditUnit(med.unit);
    setEditFreq(med.frequency);
    setEditReason('Manual verification of OCR character');
  };

  const handleSaveCorrection = async (medId: string) => {
    setSaving(true);
    try {
      const res = await api.put<any>(`/api/careplan/${activePlan.id}/correct-field`, {
        field_type: 'medicine',
        field_id: medId,
        corrected_data: {
          dose: editDose,
          unit: editUnit,
          frequency: editFreq,
        },
        correction_reason: editReason,
      });

      setActivePlan(res.care_plan);
      setEditingMedId(null);
      setNotice("Field corrected and re-verified successfully!");
      setTimeout(() => setNotice(null), 4000);
    } catch (e: any) {
      alert("Error saving correction: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSearch className="w-6 h-6 text-teal-600" />
            Step 4: Extraction Review & Source Comparison
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Compare extracted clinical facts against the original source sentences. Correct any unclear numbers before finalizing your plan.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => onNavigate('careplan')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            Care Plan
          </button>
          <button
            onClick={() => onNavigate('recovery-guide')}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/20 flex items-center gap-1.5 transition-colors"
          >
            Understand Summary Guide <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Review Cards */}
      <div className="space-y-4">
        {activePlan.medicines.map(med => (
          <div
            key={med.id}
            className={`p-5 rounded-2xl border transition-all ${
              med.is_critical_flag
                ? 'bg-amber-50/70 border-amber-300'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{med.name}</h3>
                <span className="text-xs text-slate-500 font-medium">
                  Prescription: {med.dose} {med.unit} • {med.frequency} • {med.duration || 'As directed'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  med.review_status === 'confirmed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : med.is_critical_flag
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {med.review_status.toUpperCase()}
                </span>
                
                {editingMedId !== med.id && (
                  <button
                    onClick={() => startEdit(med)}
                    className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg text-xs"
                    title="Edit or correct field"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Source Sentence Box */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-mono text-slate-700 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Original Sentence from Summary:
              </span>
              "{med.source_passage}"
            </div>

            {/* Inline Editor */}
            {editingMedId === med.id && (
              <div className="p-4 bg-teal-50 rounded-xl border border-teal-200 space-y-3 mt-3">
                <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                  Correct Extracted Medicine Values
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Dose Number</label>
                    <input
                      type="text"
                      value={editDose}
                      onChange={e => setEditDose(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Unit</label>
                    <input
                      type="text"
                      value={editUnit}
                      onChange={e => setEditUnit(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Frequency</label>
                    <input
                      type="text"
                      value={editFreq}
                      onChange={e => setEditFreq(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Reason for correction</label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={e => setEditReason(e.target.value)}
                    placeholder="e.g. Correcting decimal point from scan"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setEditingMedId(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveCorrection(med.id)}
                    disabled={saving}
                    className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    {saving ? 'Re-verifying...' : 'Save & Re-Verify'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};
