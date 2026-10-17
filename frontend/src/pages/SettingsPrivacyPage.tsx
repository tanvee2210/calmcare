import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Shield, Download, Trash2, CheckCircle2, AlertTriangle, Eye, Lock } from 'lucide-react';

export const SettingsPrivacyPage: React.FC = () => {
  const { user, activePlan, accessibilityMode, toggleAccessibility, logout } = useAuth();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExportData = () => {
    if (!activePlan) return;
    const blob = new Blob([JSON.stringify(activePlan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CalmCare_Export_${activePlan.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAllRecords = async () => {
    if (!activePlan) return;
    setDeleting(true);
    try {
      await api.delete(`/api/documents/${activePlan.document_id}`);
      alert("All your health documents and active care plans have been permanently deleted.");
      await logout();
    } catch (err: any) {
      alert("Failed to delete records: " + err.message);
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Shield className="w-7 h-7 text-teal-600" />
          Settings, Privacy & Data Ownership
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Feature 28 • Local patient data sovereignty, zero analytics tracking of medical payloads, and permanent deletion controls.
        </p>
      </div>

      <div className="space-y-6">
        
        {/* Profile & Accessibility Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-teal-600" />
            Display & Accessibility Preferences
          </h2>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-sm font-bold text-slate-900 block">
                High Contrast & Large Font Mode
              </span>
              <span className="text-xs text-slate-500">
                Optimized for low-vision and low-literacy reading comfort.
              </span>
            </div>

            <button
              onClick={toggleAccessibility}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                accessibilityMode
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {accessibilityMode ? 'Enabled (ON)' : 'Disabled (OFF)'}
            </button>
          </div>
        </div>

        {/* Data Export */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Download className="w-4 h-4 text-teal-600" />
            Export Verified Health Data
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Download a portable, structured JSON archive of your active care plan, source citations, and reminders.
          </p>

          <button
            onClick={handleExportData}
            disabled={!activePlan}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export Care Plan JSON
          </button>
        </div>

        {/* Privacy & Account Deletion */}
        <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-sm">
          <h2 className="text-base font-bold text-rose-900 mb-2 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-600" />
            Data Purge & Document Deletion
          </h2>
          <p className="text-xs text-rose-700/90 mb-4">
            Permanently remove your uploaded discharge summary, care plan records, reminders, and caregiver shares from the database.
          </p>

          <button
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={!activePlan}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            Permanently Delete My Records
          </button>
        </div>

      </div>

      {/* Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Confirm Permanent Record Deletion
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure? This action will permanently erase your discharge summary file, verified medications, schedules, and reminders. This action cannot be undone.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllRecords}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                {deleting ? 'Deleting Records...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
