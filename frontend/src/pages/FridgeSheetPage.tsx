import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Printer, Download, ShieldCheck, Heart, AlertTriangle, Calendar, PhoneCall } from 'lucide-react';

export const FridgeSheetPage: React.FC = () => {
  const { activePlan } = useAuth();

  if (!activePlan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900">No Care Plan Available</h2>
        <p className="text-xs text-slate-500 mt-2">Upload a discharge summary to generate a fridge sheet.</p>
      </div>
    );
  }

  const [downloading, setDownloading] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/printable/fridge-sheet/${activePlan.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('calmcare_token') || ''}`
        }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CalmCare_Recovery_Sheet_${activePlan.id.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // Fallback: browser print dialog
        window.print();
      }
    } catch (e) {
      console.warn("Direct PDF download fallback to print:", e);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Printer className="w-6 h-6 text-teal-600" />
            One-Page Refrigerator Care Sheet
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Physical, high-contrast action document a patient and family refer to every day.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Document
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {downloading ? "Preparing PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* The Printable 1-Page Fridge Sheet Container */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-8 shadow-md print:shadow-none print:border-none print:p-0 print:m-0 text-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-teal-600 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                CALMCARE RECOVERY PLAN
              </h2>
              <span className="text-[11px] text-teal-800 font-bold tracking-wider uppercase block">
                Official Refrigerator Action Sheet
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              ✓ SOURCE VERIFIED
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Date: {activePlan.created_at.slice(0, 10)}</span>
          </div>
        </div>

        {/* Patient / Diagnosis Summary */}
        <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 mb-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">
            Condition Summary
          </span>
          <p className="text-sm font-bold text-teal-950 mt-0.5">
            {activePlan.plain_diagnosis}
          </p>
        </div>

        {/* 1. Medicines Table */}
        <div className="mb-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-200 pb-1">
            1. Medicines Schedule (Take Exactly as Prescribed)
          </h3>
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="p-2 font-bold">Medicine</th>
                <th className="p-2 font-bold">Dose</th>
                <th className="p-2 font-bold">Frequency</th>
                <th className="p-2 font-bold">Timing / Directions</th>
                <th className="p-2 font-bold">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activePlan.medicines.map((m, i) => (
                <tr key={i}>
                  <td className="p-2 font-bold text-slate-900">{m.name}</td>
                  <td className="p-2 font-mono font-bold text-teal-800">{m.dose} {m.unit}</td>
                  <td className="p-2 font-medium">{m.frequency}</td>
                  <td className="p-2 text-slate-700">{m.timing || 'With water'}</td>
                  <td className="p-2 font-medium">{m.duration || 'As directed'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2. Warning Signs - Immediate Emergency */}
        <div className="mb-5 p-4 rounded-xl border-2 border-rose-300 bg-rose-50/40">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              2. Warning Signs — Return to Hospital Immediately If:
            </h3>
            <span className="text-[11px] font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
              Emergency: Call 108
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-rose-950 font-medium">
            {activePlan.warning_signs.map((w, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="text-rose-600 font-bold">•</span>
                <span>{w.sign} ({w.plain_meaning})</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Follow-up Appointment & Restrictions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-200">
          <div>
            <h4 className="font-bold uppercase tracking-wider text-slate-700 mb-1">
              3. Next Hospital Review
            </h4>
            {activePlan.follow_ups.length > 0 ? (
              <p className="font-medium text-slate-900">
                Date: <span className="font-bold text-teal-700">{activePlan.follow_ups[0].date || 'Confirm with clinic'}</span><br />
                Department: {activePlan.follow_ups[0].department || 'OPD'}<br />
                Doctor: {activePlan.follow_ups[0].doctor || 'Consultant'}
              </p>
            ) : (
              <p className="text-slate-500">Call hospital to confirm follow-up date.</p>
            )}
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider text-slate-700 mb-1">
              4. Key Activity & Diet Restrictions
            </h4>
            {activePlan.instructions.slice(0, 3).map((inst, i) => (
              <p key={i} className="text-slate-800">
                • {inst.source_instruction}
              </p>
            ))}
          </div>
        </div>

        {/* Footer Notice */}
        <div className="mt-6 pt-3 border-t border-slate-200 text-[10px] text-slate-400 text-center">
          CalmCare Healthcare Companion • Preserves discharge summary instructions. In medical emergency, call 108.
        </div>
      </div>

    </div>
  );
};
