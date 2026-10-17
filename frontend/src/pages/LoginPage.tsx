import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onLoginSuccess: () => void;
  onBackToHome?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSwitchToRegister,
  onLoginSuccess,
  onBackToHome,
}) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post<{ access_token: string; user: any }>('/api/auth/login', {
        email,
        password,
      });
      login(res.access_token, res.user);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#022822] via-[#043e35] to-[#011a14] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-white">
      {/* Animated Moving Ambient Background Orbs */}
      <div className="absolute top-12 left-10 w-80 h-80 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute bottom-16 right-10 w-96 h-96 rounded-full bg-amber-400/15 blur-3xl pointer-events-none animate-float-reverse" />

      {/* Floating Gold Sparkle Particles */}
      <div className="absolute top-24 left-[20%] w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_#fbbf24] animate-float-slow opacity-80" />
      <div className="absolute top-[65%] right-[15%] w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_15px_#facc15] animate-float-reverse opacity-75" />

      {/* Navigation: Back to Website Start Page */}
      {onBackToHome && (
        <button
          onClick={onBackToHome}
          className="absolute top-6 left-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all backdrop-blur-md shadow-md active:scale-95 z-20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      )}

      {/* Login Card */}
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl border border-emerald-900/40 relative z-10 text-slate-900">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <img
              src="/calmcare-logo.png"
              alt="CalmCare Logo"
              className="h-11 w-auto object-contain"
            />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome to CalmCare
          </h2>
          <p className="mt-1 text-xs text-slate-600 font-medium">
            Sign in to access your verified multilingual care plans and reminders.
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-md shadow-teal-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Verifying Credentials...' : 'Sign In to CalmCare'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600 font-medium">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="font-bold text-teal-600 hover:text-teal-700 underline"
            >
              Create Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
