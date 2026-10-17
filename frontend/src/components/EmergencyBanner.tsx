import React from 'react';
import { AlertTriangle, PhoneCall } from 'lucide-react';

interface EmergencyBannerProps {
  warningCount?: number;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ warningCount = 0 }) => {
  return (
    <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r-xl shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-100 text-rose-700 mt-0.5 sm:mt-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-900">
              Medical Safety Notice & Emergency Instructions
            </h4>
            <p className="text-xs text-rose-700 mt-0.5 max-w-2xl">
              CalmCare preserves instructions from your discharge summary. If you experience severe chest pain, shortness of breath, heavy bleeding, or confusion, seek immediate medical attention.
            </p>
          </div>
        </div>

        <a
          href="tel:108"
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm whitespace-nowrap active:scale-95 transition-all"
        >
          <PhoneCall className="w-4 h-4" />
          Emergency: Call 108
        </a>
      </div>
    </div>
  );
};
