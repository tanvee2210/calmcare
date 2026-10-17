import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Menu,
  ArrowLeft,
  ArrowRight,
  Globe,
  Eye,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Settings,
  ShieldCheck,
  Check
} from 'lucide-react';
import { AccessibilityModal } from './AccessibilityModal';
import { t, SUPPORTED_LANGUAGES } from '../utils/i18n';

interface TopHeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onToggleSidebar: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onRequestLogout: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTab,
  onNavigate,
  onToggleSidebar,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onRequestLogout,
}) => {
  const { user, language, setLanguage } = useAuth();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [a11yModalOpen, setA11yModalOpen] = useState(false);

  const activeLanguage = language || 'en';

  const getPageTitle = (tab: string): string => {
    switch (tab) {
      case 'dashboard':
        return t('nav_dashboard', activeLanguage);
      case 'upload':
        return t('nav_upload', activeLanguage);
      case 'review':
        return 'Verify Extracted Information';
      case 'careplan':
        return t('nav_care_plan', activeLanguage);
      case 'recovery-guide':
        return t('nav_recovery_guide', activeLanguage);
      case 'timetable':
        return t('nav_timetable', activeLanguage);
      case 'ask':
        return t('nav_ask_summary', activeLanguage);
      case 'teachback':
        return t('nav_teach_back', activeLanguage);
      case 'fridgesheet':
        return 'Fridge Sheet Schedule';
      case 'reminders':
        return t('nav_reminders', activeLanguage);
      case 'caregivers':
        return t('nav_caregivers', activeLanguage);
      case 'clinical':
      case 'fidelity':
        return t('nav_eval_dashboard', activeLanguage);
      case 'diff':
        return 'Discharge Version Comparison';
      case 'settings':
        return 'Settings & Data Privacy';
      default:
        return 'Recovery Dashboard';
    }
  };

  const handleLogoutClick = () => {
    setUserMenuOpen(false);
    onRequestLogout();
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs no-print">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left: Mobile Menu Toggle + History Navigation + Breadcrumb */}
            <div className="flex items-center gap-3">
              <button
                onClick={onToggleSidebar}
                className="p-2 text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 lg:hidden"
                aria-label="Toggle navigation drawer"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* In-App Back and Forward History Navigation */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  onClick={onGoBack}
                  disabled={!canGoBack}
                  title={canGoBack ? "Go back to previous page" : "No previous page"}
                  className={`p-1.5 rounded-lg transition-colors ${
                    canGoBack
                      ? 'text-slate-800 hover:bg-white hover:text-slate-900 hover:shadow-xs active:scale-95'
                      : 'text-slate-300 cursor-not-allowed'
                  }`}
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={onGoForward}
                  disabled={!canGoForward}
                  title={canGoForward ? "Go forward to next page" : "No next page"}
                  className={`p-1.5 rounded-lg transition-colors ${
                    canGoForward
                      ? 'text-slate-800 hover:bg-white hover:text-slate-900 hover:shadow-xs active:scale-95'
                      : 'text-slate-300 cursor-not-allowed'
                  }`}
                  aria-label="Forward"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Current Page Title / Breadcrumb */}
              <div className="hidden sm:block">
                <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  {getPageTitle(currentTab)}
                </h1>
              </div>
            </div>

            {/* Right: Accessibility + Language Selector + User Dropdown */}
            <div className="flex items-center gap-2 relative">
              {/* Accessibility Settings Trigger */}
              <button
                onClick={() => setA11yModalOpen(true)}
                title="Accessibility Settings (Font size, contrast, spacing)"
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-xs font-bold text-slate-800 shadow-2xs active:scale-95"
              >
                <Eye className="w-4 h-4 text-teal-600" />
                <span className="hidden md:inline">{t('nav_accessibility', activeLanguage)}</span>
              </button>

              {/* Language Selector Dropdown (High z-index to never hide behind cards) */}
              <div className="relative">
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 shadow-2xs active:scale-95"
                >
                  <Globe className="w-3.5 h-3.5 text-teal-600" />
                  <span>
                    {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName || 'English'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {langDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[55]"
                      onClick={() => setLangDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-[60] animate-in fade-in zoom-in-95">
                      <div className="px-4 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        Select Language
                      </div>
                      <div className="py-1">
                        {SUPPORTED_LANGUAGES.map((l) => {
                          const isSelected = activeLanguage === l.code;
                          return (
                            <button
                              key={l.code}
                              onClick={() => {
                                setLanguage(l.code);
                                setLangDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-teal-50 text-teal-900 font-extrabold'
                                  : 'text-slate-700 hover:bg-slate-50 font-semibold'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{l.nativeName}</span>
                                <span className="text-[10px] text-slate-400 font-normal">({l.name})</span>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-teal-600" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User Dropdown */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      {user.name ? user.name[0].toUpperCase() : 'P'}
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 mr-1" />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-[55]"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-[60] animate-in fade-in zoom-in-95">
                        <div className="px-4 py-2 border-b border-slate-100">
                          <p className="text-xs font-black text-slate-900 truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium truncate">{user.email}</p>
                        </div>

                        <div className="py-1">
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              onNavigate('settings');
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold text-left"
                          >
                            <Settings className="w-4 h-4 text-slate-400" />
                            Settings & Privacy
                          </button>

                          <button
                            onClick={handleLogoutClick}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 font-bold text-left"
                          >
                            <LogOut className="w-4 h-4 text-rose-500" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Accessibility Modal */}
      <AccessibilityModal
        isOpen={a11yModalOpen}
        onClose={() => setA11yModalOpen(false)}
        currentLanguage={activeLanguage}
      />
    </>
  );
};
