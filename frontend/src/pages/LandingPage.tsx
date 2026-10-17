import React from 'react';
import {
  ShieldCheck,
  Languages,
  Volume2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  FileText,
  Activity,
  Heart,
  Printer,
  Sparkles,
  CheckCircle2,
  Star
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
  onSelectSyntheticCase: (caseId: string) => void;
}

const SAMPLE_CASES = [
  { id: 'case-cardiac-001', name: 'Cardiac Post-PTCA', patient: 'Ramesh Kumar (58M)', tag: 'Cardiac' },
  { id: 'case-diabetes-002', name: 'Type 2 Diabetes & Insulin', patient: 'Lakshmi N. (52F)', tag: 'Endocrinology' },
  { id: 'case-postop-003', name: 'Laparoscopic Appendectomy', patient: 'Priya Ananth (29F)', tag: 'Surgery' },
  { id: 'case-respiratory-004', name: 'COPD Inhaler Care', patient: 'Mohammad Irfan (64M)', tag: 'Pulmonology' },
  { id: 'case-maternity-005', name: 'C-Section Post-Partum', patient: 'Sunita Devi (27F)', tag: 'Maternity' },
  { id: 'case-edge-conflict-006', name: '⚠️ Conflicting Dose Test (5mg vs 50mg)', patient: 'Kishore Gopal', tag: 'Safety Conflict' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLogin,
  onRegister,
  onSelectSyntheticCase,
}) => {
  const handleLoginClick = onLogin || onGetStarted;
  const handleRegisterClick = onRegister || onGetStarted;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#022822] via-[#043e35] to-[#011a14] text-white relative overflow-hidden font-sans">
      
      {/* Animated Moving Ambient Background Orbs */}
      <div className="absolute top-12 left-10 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute top-48 right-10 w-[28rem] h-[28rem] rounded-full bg-amber-400/15 blur-3xl pointer-events-none animate-float-reverse" />
      <div className="absolute bottom-40 left-1/3 w-80 h-80 rounded-full bg-teal-400/20 blur-3xl pointer-events-none animate-pulse" />

      {/* Floating Gold Sparkle Particles */}
      <div className="absolute top-28 left-[15%] w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_#fbbf24] animate-float-slow opacity-80" />
      <div className="absolute top-64 right-[18%] w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_15px_#facc15] animate-float-reverse opacity-75" />
      <div className="absolute top-[45%] left-[8%] w-2 h-2 rounded-full bg-amber-200 shadow-[0_0_10px_#fde68a] animate-float-slow opacity-60" />
      <div className="absolute top-[55%] right-[10%] w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_#fbbf24] animate-float-reverse opacity-80" />
      <div className="absolute bottom-48 left-[22%] w-3 h-3 rounded-full bg-yellow-300 shadow-[0_0_14px_#fde047] animate-float-slow opacity-70" />

      {/* Top Header */}
      <header className="border-b border-emerald-800/40 bg-[#022c22]/90 backdrop-blur-md sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/95 px-3 py-1.5 rounded-xl shadow-md border border-white/20 flex items-center justify-center">
              <img
                src="/calmcare-logo.png"
                alt="CalmCare Logo"
                className="h-7 sm:h-8 w-auto object-contain"
              />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 hidden sm:inline">
              Verified Care
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleLoginClick}
              className="px-4 py-2 text-xs font-bold text-emerald-100 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-emerald-700/40 hover:border-emerald-400/60"
            >
              Login
            </button>
            <button
              onClick={handleRegisterClick}
              className="px-4 py-2 text-xs font-black text-slate-950 bg-amber-300 hover:bg-amber-200 rounded-xl shadow-md transition-all active:scale-95"
            >
              Register
            </button>
            <button
              onClick={onGetStarted}
              className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-16 lg:pb-24 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-400/30 text-emerald-200 text-xs font-bold mb-6 shadow-sm backdrop-blur-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Medical Instruction Fidelity Over Conversational Fluency</span>
          </div>

          {/* Website Name Displayed Prominently in Center */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="bg-white/95 px-6 py-2.5 rounded-2xl shadow-xl border border-white/30 mb-3 inline-flex items-center justify-center">
              <img
                src="/calmcare-logo.png"
                alt="CalmCare"
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-md">
              <span className="gold-shimmer-text">CalmCare</span>
            </h1>
            <p className="text-xs uppercase tracking-widest text-emerald-300 font-bold mt-1">
              Verified Multilingual Patient Care Platform
            </p>
          </div>

          {/* Elegant Secondary Headline */}
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-emerald-50 max-w-3xl mx-auto leading-snug">
            Turn Complicated Discharge Summaries Into Faithful, Understandable Care Plans
          </h2>

          {/* Subtitle with High Contrast */}
          <p className="mt-4 text-sm sm:text-base text-emerald-100/90 max-w-2xl mx-auto leading-relaxed font-normal">
            CalmCare explains doctor prescriptions in plain Class-8 language and Indian regional languages with calm spoken audio—while strictly preserving exact doses, units, and follow-up dates without hallucination.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <button
              onClick={handleRegisterClick}
              className="px-6 py-3.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-sm shadow-xl shadow-amber-950/40 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span>Register for Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleLoginClick}
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/25 rounded-xl text-sm font-bold shadow-md backdrop-blur-md active:scale-95 transition-all"
            >
              Login to Portal
            </button>
            <a
              href="#demo-cases"
              className="px-5 py-3.5 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-200 hover:text-white border border-emerald-700/50 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Explore 6 Clinical Demos</span>
            </a>
          </div>

          {/* Core Trust Badges in Glass Cards */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30 shadow-lg shadow-black/20 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
              <span className="text-xs font-bold text-white">100% Exact Dose Preservation</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30 shadow-lg shadow-black/20 flex items-center gap-3">
              <Languages className="w-5 h-5 text-amber-300 shrink-0" />
              <span className="text-xs font-bold text-white">6 Indian Languages</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30 shadow-lg shadow-black/20 flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-emerald-300 shrink-0" />
              <span className="text-xs font-bold text-white">Calm Spoken Guidance</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/30 shadow-lg shadow-black/20 flex items-center gap-3">
              <Printer className="w-5 h-5 text-amber-300 shrink-0" />
              <span className="text-xs font-bold text-white">Printable Fridge Sheet</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Synthetic Case Selector */}
      <section id="demo-cases" className="py-20 bg-[#03362e]/90 border-y border-emerald-800/50 backdrop-blur-md relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-black text-amber-300 tracking-wider uppercase flex items-center justify-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              Instant Live Demonstration
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">
              Select a Synthetic Hospital Discharge Case
            </h2>
            <p className="text-sm text-emerald-100/80 mt-2 font-medium">
              Test how CalmCare extracts, validates, and explains discharge instructions across 5 clinical conditions plus intentional contradiction tests.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SAMPLE_CASES.map(c => {
              const isConflict = c.tag === 'Safety Conflict';
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectSyntheticCase(c.id)}
                  className="group p-5 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/15 hover:border-amber-400/60 shadow-lg transition-all cursor-pointer relative overflow-hidden backdrop-blur-md"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isConflict
                        ? 'bg-rose-500/20 text-rose-200 border-rose-400/40'
                        : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                    }`}>
                      {c.tag}
                    </span>
                    <span className="text-xs text-amber-300 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Try Case →
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-amber-200 transition-colors">
                    {c.name}
                  </h3>
                  <p className="text-xs text-emerald-200/70 mt-1 font-medium">Patient: {c.patient}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* The 5 Non-Negotiable Medical Safety Rules */}
      <section className="py-20 bg-[#022822] relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Our 5 Non-Negotiable Medical Safety Rules
            </h2>
            <p className="text-sm text-emerald-200/80 mt-2 font-medium">
              Every algorithm, parser, and translation in CalmCare adheres strictly to patient safety boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="p-6 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-md shadow-md">
              <h4 className="text-sm font-bold text-white flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs flex items-center justify-center font-black">
                  1
                </span>
                Never Guess Medicine Timing
              </h4>
              <p className="text-xs text-emerald-100/80 mt-2 leading-relaxed font-medium">
                "Twice daily" does not establish clock times. CalmCare displays documented frequencies and asks for confirmed preferences before scheduling reminders.
              </p>
            </div>

            <div className="p-6 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-md shadow-md">
              <h4 className="text-sm font-bold text-white flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs flex items-center justify-center font-black">
                  2
                </span>
                Hard Stop on Altered Doses
              </h4>
              <p className="text-xs text-emerald-100/80 mt-2 leading-relaxed font-medium">
                If an AI model or translation alters a numerical dose (e.g. 5 mg to 50 mg), the plan is immediately blocked from verified status with an audit alert.
              </p>
            </div>

            <div className="p-6 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-md shadow-md">
              <h4 className="text-sm font-bold text-white flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs flex items-center justify-center font-black">
                  3
                </span>
                Source Traceability
              </h4>
              <p className="text-xs text-emerald-100/80 mt-2 leading-relaxed font-medium">
                Every critical instruction links directly to its source sentence and page number so patients and reviewers can compare it against original text.
              </p>
            </div>

            <div className="p-6 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-md shadow-md">
              <h4 className="text-sm font-bold text-white flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs flex items-center justify-center font-black">
                  4
                </span>
                Grounded Q&A Without Fabrication
              </h4>
              <p className="text-xs text-emerald-100/80 mt-2 leading-relaxed font-medium">
                Ask My Discharge Summary answers only what is documented. If instructions are missing (e.g. missed dose instructions), it honestly directs to the doctor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-[#011410] text-emerald-300/70 text-xs text-center border-t border-emerald-900/60 relative z-10">
        <div className="max-w-4xl mx-auto px-4">
          <p className="font-bold text-white">© 2026 CalmCare Healthcare Companion • H2 Problem Statement Solution</p>
          <p className="mt-1 text-emerald-300/60 font-medium">
            CalmCare is an assistive educational tool grounded in hospital discharge summaries. It does not replace treating physicians, clinical pharmacists, or emergency services (108).
          </p>
        </div>
      </footer>
    </div>
  );
};
