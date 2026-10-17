import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { GitCompare, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

export const VersionComparePage: React.FC = () => {
  const { activePlan } = useAuth();
  const [oldPlanId, setOldPlanId] = useState('');
  const [newPlanId, setNewPlanId] = useState('');
  const [diffResult, setDiffResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    if (!oldPlanId || !newPlanId) return;
    setLoading(true);
    try {
      const data = await api.get<any>(`/api/diff/compare?old_plan_id=${oldPlanId}&new_plan_id=${newPlanId}`);
      setDiffResult(data);
    } catch (e: any) {
      alert("Error comparing versions: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <GitCompare className="w-7 h-7 text-teal-600" />
          Discharge Change Management & Impact Analysis
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Features 27 & 31 • Compare changes across new discharge summaries and see which active reminders require update.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Previous Plan Version ID</label>
            <input
              type="text"
              value={oldPlanId}
              onChange={e => setOldPlanId(e.target.value)}
              placeholder="e.g. plan-case-cardiac-001"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">New Plan Version ID</label>
            <input
              type="text"
              value={newPlanId}
              onChange={e => setNewPlanId(e.target.value)}
              placeholder="e.g. plan-case-edge-conflict-006"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={loading || !oldPlanId || !newPlanId}
          className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? 'Analyzing Impact...' : 'Run Version Diff Analysis'}
        </button>
      </div>

      {diffResult && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Detected Medication Differences
            </h3>

            {diffResult.medicine_changes.length > 0 ? (
              <div className="space-y-2.5">
                {diffResult.medicine_changes.map((ch: any, i: number) => (
                  <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900">{ch.medicine}</span>
                      <span className="text-[11px] text-slate-500 block">
                        Old: {ch.old_value} → New: <strong className="text-teal-700">{ch.new_value}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">
                      {ch.change_type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No medication changes detected.</p>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-300 p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-amber-950 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Active Reminders Affected by Updated Summary
            </h3>
            <ul className="space-y-1.5 text-xs text-amber-900">
              {diffResult.affected_active_reminders.map((ar: string, i: number) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="font-bold">•</span>
                  <span>{ar}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  );
};
