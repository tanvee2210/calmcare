import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Layers, CheckCircle2, AlertCircle, HelpCircle, FileSearch } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_option_index: number;
  instruction_explanation: string;
  source_citation: string;
}

export const TeachBackPage: React.FC = () => {
  const { activePlan } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [evaluations, setEvaluations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activePlan) {
      loadQuestions();
    }
  }, [activePlan]);

  const loadQuestions = async () => {
    if (!activePlan) return;
    setLoading(true);
    try {
      const qs = await api.get<Question[]>(`/api/assistant/teach-back/${activePlan.id}`);
      setQuestions(qs);
    } catch (e) {
      console.warn("Failed to load teach-back questions:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = async (qId: string, optIdx: number) => {
    setSelectedAnswers(prev => ({ ...prev, [qId]: optIdx }));
    try {
      const evalRes = await api.post<any>('/api/assistant/teach-back/submit', {
        question_id: qId,
        selected_option_index: optIdx,
      });
      setEvaluations(prev => ({ ...prev, [qId]: evalRes }));
    } catch (e) {
      console.warn("Eval failed:", e);
    }
  };

  if (!activePlan) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900">No Active Care Plan</h2>
        <p className="text-xs text-slate-500 mt-2">Upload a discharge summary to practice your understanding check.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Layers className="w-7 h-7 text-teal-600" />
          Teach-Back Understanding Check
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Feature 14 • An optional, calm check to make sure the key instructions are clear. Never a test or judgement.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Preparing patient-friendly questions...
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const hasAnswered = selectedAnswers[q.id] !== undefined;
            const evalResult = evaluations[q.id];

            return (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider block mb-1">
                  Step {idx + 1} of {questions.length}
                </span>
                <h3 className="text-base font-bold text-slate-900 mb-4">
                  {q.question}
                </h3>

                <div className="space-y-2.5">
                  {q.options.map((opt, oIdx) => {
                    const isSelected = selectedAnswers[q.id] === oIdx;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleSelectOption(q.id, oIdx)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-teal-50 border-teal-500 text-teal-950 font-bold shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && <span className="text-teal-600 font-bold">✓ Selected</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Patient Reassurance & Source Sentence */}
                {evalResult && (
                  <div className={`mt-4 p-4 rounded-xl border text-xs animate-in fade-in ${
                    evalResult.is_correct
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-teal-50 border-teal-200 text-teal-950'
                  }`}>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">{evalResult.patient_reassurance}</p>
                        <p className="mt-1 opacity-90">{q.instruction_explanation}</p>
                        <div className="mt-2 pt-2 border-t border-teal-200/60 font-mono text-[11px] flex items-center gap-1.5">
                          <FileSearch className="w-3.5 h-3.5 text-teal-700" />
                          <span>Exact Document Note: "{q.source_citation}"</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
