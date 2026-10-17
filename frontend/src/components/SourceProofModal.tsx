import React from 'react';
import { X, ExternalLink, FileSearch, CheckCircle2 } from 'lucide-react';

interface SourceProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sourcePassage: string;
  pageNumber?: number;
  extractedValue?: string;
  confidence?: number;
}

export const SourceProofModal: React.FC<SourceProofModalProps> = ({
  isOpen,
  onClose,
  title,
  sourcePassage,
  pageNumber = 1,
  extractedValue,
  confidence = 1.0,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
              <FileSearch className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Source Proof & Citation</h3>
              <p className="text-xs text-slate-500">Feature 29 • Traceability</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 space-y-3">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Instruction Field
            </span>
            <p className="text-sm font-bold text-slate-800 mt-0.5">{title}</p>
            {extractedValue && (
              <p className="text-xs text-teal-700 bg-teal-50 px-2 py-1 rounded inline-block font-mono mt-1">
                Extracted: {extractedValue}
              </p>
            )}
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Exact Source Passage in Discharge Summary (Page {pageNumber})
            </span>
            <div className="mt-1 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs font-mono text-amber-900 leading-relaxed break-words">
              "{sourcePassage}"
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Preserved without AI hallucination
            </span>
            <span>Confidence: {Math.round(confidence * 100)}%</span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 shadow-sm"
          >
            Close Citation
          </button>
        </div>
      </div>
    </div>
  );
};
