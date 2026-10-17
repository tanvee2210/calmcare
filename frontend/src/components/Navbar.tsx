import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Heart, Globe, Eye, LogOut, User as UserIcon, Menu, X,
  FileText, Calendar, ShieldCheck, MessageSquare, Printer,
  Bell, Users, Layers, ChevronDown, Stethoscope, Settings
} from 'lucide-react';
import { AccessibilityModal } from './AccessibilityModal';
import { t, SUPPORTED_LANGUAGES } from '../utils/i18n';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, logout, language, setLanguage } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [a11yModalOpen, setA11yModalOpen] = useState(false);

  const activeLanguage = language || 'en';

  const navLinks = [
    { id: 'dashboard', label: t('nav_dashboard', activeLanguage), icon: Heart },
    { id: 'recovery-guide', label: t('nav_recovery_guide', activeLanguage), icon: Heart },
    { id: 'upload', label: t('nav_upload', activeLanguage), icon: FileText },
    { id: 'careplan', label: t('nav_care_plan', activeLanguage), icon: ShieldCheck },
    { id: 'timetable', label: t('nav_timetable', activeLanguage), icon: Calendar },
    { id: 'ask', label: t('nav_ask_summary', activeLanguage), icon: MessageSquare },
    { id: 'teachback', label: t('nav_teach_back', activeLanguage), icon: Layers },
    { id: 'fridgesheet', label: "Fridge Sheet", icon: Printer },
    { id: 'reminders', label: t('nav_reminders', activeLanguage), icon: Bell },
    { id: 'caregivers', label: t('nav_caregivers', activeLanguage), icon: Users },
    { id: 'clinical', label: t('nav_eval_dashboard', activeLanguage), icon: Stethoscope },
  ];

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    setCurrentTab('login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* CalmCare Brand Logo */}
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none"
              onClick={() => setCurrentTab('dashboard')}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 shrink-0">
                <Heart className="w-5 h-5 fill-white" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                  CalmCare
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-teal-50 text-teal-800 border border-teal-200 hidden sm:inline">
                    Verified Care
                  </span>
                </span>
                <p className="text-[10px] text-slate-500 hidden md:block">
                  Plain-Language Multilingual Recovery
                </p>
              </div>
            </div>

            {/* Desktop Navigation Links (First 5 primary links) */}
            {user && (
              <nav className="hidden lg:flex items-center space-x-1">
                {navLinks.slice(0, 5).map(link => {
                  const Icon = link.icon;
                  const isActive = currentTab === link.id;
                  return (
                    <button
                      key={link.id}
                      onClick={() => setCurrentTab(link.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        isActive
                          ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-teal-600" />
                      {link.label}
                    </button>
                  );
                })}

                {/* More Tools Dropdown */}
                <div className="relative group">
                  <button className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1">
                    <span>More Tools</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 hidden group-hover:block animate-in fade-in z-50">
                    {navLinks.slice(5).map(link => {
                      const Icon = link.icon;
                      return (
                        <button
                          key={link.id}
                          onClick={() => setCurrentTab(link.id)}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-left ${
                            currentTab === link.id ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4 text-teal-600" />
                          {link.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </nav>
            )}

            {/* Right Toolbar Controls */}
            <div className="flex items-center gap-2">
              
              {/* Accessibility Button (Issue L — Renamed from cryptic A11y, opens modal) */}
              <button
                onClick={() => setA11yModalOpen(true)}
                title="Open Accessibility Settings (Text Size, Contrast, Spacing)"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-xs font-bold text-slate-700 shadow-2xs"
              >
                <Eye className="w-4 h-4 text-teal-600" />
                <span className="hidden sm:inline">{t('nav_accessibility', activeLanguage)}</span>
              </button>

              {/* Language Selector Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs"
                >
                  <Globe className="w-3.5 h-3.5 text-teal-600" />
                  <span>{SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeName || 'English'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {langDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Select Language
                    </div>
                    {SUPPORTED_LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLanguage(l.code);
                          localStorage.setItem('calmcare_lang', l.code);
                          setLangDropdownOpen(false);
                          window.dispatchEvent(new Event('storage'));
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                          language === l.code ? 'font-bold text-teal-700 bg-teal-50' : 'text-slate-700'
                        }`}
                      >
                        <span>{l.nativeName} ({l.name})</span>
                        {language === l.code && <span className="text-teal-600 font-bold">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* User Profile & Working Logout Dropdown (Issue K) */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-slate-700 hidden sm:inline">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-900 block truncate">{user.name}</span>
                        <span className="text-[11px] text-slate-500 block truncate">{user.email}</span>
                        <span className="text-[10px] font-semibold text-teal-700 uppercase mt-0.5 block">
                          Role: {user.role}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setCurrentTab('settings');
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-500" />
                        Settings & Privacy
                      </button>

                      <div className="border-t border-slate-100 my-1"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        {t('nav_logout', activeLanguage)}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentTab('login')}
                    className="text-xs font-bold px-3 py-1.5 text-slate-700 hover:text-teal-700"
                  >
                    {t('nav_login', activeLanguage)}
                  </button>
                  <button
                    onClick={() => setCurrentTab('register')}
                    className="text-xs font-bold px-3 py-1.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 shadow-sm"
                  >
                    {t('nav_register', activeLanguage)}
                  </button>
                </div>
              )}

              {/* Mobile Menu Hamburger Button */}
              {user && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Toggle Navigation Menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}

            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer (Issue M: Touch friendly, no horizontal overflow) */}
        {mobileMenuOpen && user && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-5 space-y-1 max-h-[80vh] overflow-y-auto animate-in fade-in">
            {navLinks.map(link => {
              const Icon = link.icon;
              const isActive = currentTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    setCurrentTab(link.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4 text-teal-600" />
                  {link.label}
                </button>
              );
            })}

            <div className="pt-3 border-t border-slate-100 space-y-1">
              <button
                onClick={() => {
                  setA11yModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Eye className="w-4 h-4 text-teal-600" />
                {t('nav_accessibility', activeLanguage)}
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                {t('nav_logout', activeLanguage)}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Accessibility Settings Modal (Issue L) */}
      <AccessibilityModal
        isOpen={a11yModalOpen}
        onClose={() => setA11yModalOpen(false)}
        currentLanguage={activeLanguage}
      />
    </>
  );
};
