import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { CaregiverShare } from '../types';
import { Users, UserPlus, ShieldAlert, CheckCircle2, XCircle, Lock } from 'lucide-react';

export const CaregiverAccessPage: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { user, setActivePlan } = useAuth();
  const [caregivers, setCaregivers] = useState<CaregiverShare[]>([]);
  const [sharedPatients, setSharedPatients] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [permissionType, setPermissionType] = useState<string>('view_and_remind');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    loadCaregivers();
    loadSharedPatients();
  }, []);

  const loadCaregivers = async () => {
    try {
      const data = await api.get<CaregiverShare[]>('/api/caregivers/list');
      setCaregivers(data);
    } catch (e) {
      console.warn("Could not load caregivers:", e);
    }
  };

  const loadSharedPatients = async () => {
    try {
      const data = await api.get<any[]>('/api/caregivers/shared-with-me');
      setSharedPatients(data);
    } catch (e) {
      console.warn("Could not load shared patients:", e);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotice(null);

    const perms = permissionType === 'view_and_remind'
      ? ['view_plan', 'manage_reminders']
      : ['view_plan', 'read_only'];

    try {
      await api.post('/api/caregivers/invite', {
        caregiver_email: email,
        caregiver_name: name,
        permissions: perms,
      });
      setNotice(`Granted authorized access to ${name} (${email}).`);
      setEmail('');
      setName('');
      loadCaregivers();
    } catch (err: any) {
      alert("Error inviting caregiver: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPatientPlan = async (patientId: string) => {
    try {
      const res = await api.get<any>(`/api/caregivers/patient-plan/${patientId}`);
      if (res.care_plan) {
        setActivePlan(res.care_plan);
        if (onNavigate) {
          onNavigate('recovery-guide');
        }
      }
    } catch (err: any) {
      alert("Failed to load patient's care plan: " + err.message);
    }
  };

  const handleRevoke = async (shareId: string) => {
    try {
      await api.put(`/api/caregivers/${shareId}/status`, {
        status: 'revoked',
      });
      setNotice("Caregiver access has been successfully revoked.");
      loadCaregivers();
    } catch (err: any) {
      alert("Error revoking access: " + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Users className="w-7 h-7 text-teal-600" />
          Caregiver Access & Consent Management
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Feature 11 • Patient-controlled sharing. Invite family members to view your care plan and revoke access anytime.
        </p>
      </div>

      {notice && (
        <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Invite Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
        <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-teal-600" />
          Authorize a Trusted Family Member or Caregiver
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Caregivers can view your verified care instructions and help monitor appointments. They cannot alter prescriptions.
        </p>

        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Family Member Name"
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
          />
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Caregiver Email Address"
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
          />
          <select
            value={permissionType}
            onChange={e => setPermissionType(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-700"
          >
            <option value="view_and_remind">Full Caregiver (View & Reminders)</option>
            <option value="view_only">Read-Only (View Care Plan Only)</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            {loading ? 'Authorizing...' : 'Grant Access'}
          </button>
        </form>
      </div>

      {/* Shared Patients (When logged in as caregiver) */}
      {sharedPatients.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-teal-200 shadow-sm mb-8">
          <h3 className="text-sm font-bold text-teal-900 mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-teal-600" />
            Patients Who Granted Access to You
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            You have verified consent to monitor the care plans of the following patients.
          </p>

          <div className="space-y-3">
            {sharedPatients.map(sp => (
              <div
                key={sp.share_id}
                className="p-4 rounded-xl border border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-teal-50/50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{sp.patient_name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      ACTIVE ACCESS
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 block mt-0.5">{sp.patient_email}</span>
                  <span className="text-[10px] text-teal-700 font-medium">
                    Permissions: {sp.permissions.join(', ')}
                  </span>
                </div>

                <button
                  onClick={() => handleViewPatientPlan(sp.patient_id)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  View Patient Recovery Guide
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Authorized Caregivers List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4">
          Currently Authorized Caregivers
        </h3>

        {caregivers.length > 0 ? (
          <div className="space-y-3">
            {caregivers.map(c => (
              <div key={c.id} className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{c.caregiver_name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {c.status.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 block mt-0.5">{c.caregiver_email}</span>
                  <span className="text-[10px] text-teal-700 font-medium">
                    Permissions: {c.permissions.join(', ')}
                  </span>
                </div>

                {c.status === 'active' && (
                  <button
                    onClick={() => handleRevoke(c.id)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 active:scale-95"
                  >
                    Revoke Access
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic text-center py-6">
            No family members or caregivers currently linked. You retain sole access.
          </p>
        )}
      </div>

    </div>
  );
};
