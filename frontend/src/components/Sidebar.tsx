import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  UploadCloud,
  Sparkles,
  ShieldCheck,
  Calendar,
  MessageSquare,
  Bell,
  Users,
  CheckCircle2,
  Printer,
  Stethoscope,
  GitCompare,
  Settings,
  LogOut,
  X,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { t } from '../utils/i18n';

interface SidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onRequestLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onNavigate,
  isOpen,
  onClose,
  onRequestLogout,
}) => {
  const { user, language } = useAuth();
  const activeLanguage = language || 'en';
  const [toolsOpen, setToolsOpen] = useState(true);

  const mainNavItems = [
    {
      id: 'dashboard',
      label: t('nav_dashboard', activeLanguage),
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'upload',
      label: t('nav_upload', activeLanguage),
      icon: UploadCloud,
      badge: 'Scan / PDF'
    },
    {
      id: 'recovery-guide',
      label: t('nav_recovery_guide', activeLanguage),
      icon: Sparkles,
      badge: 'Simple'
    },
    {
      id: 'careplan',
      label: t('nav_care_plan', activeLanguage),
      icon: ShieldCheck,
      badge: 'Verified'
    },
    {
      id: 'timetable',
      label: t('nav_timetable', activeLanguage),
      icon: Calendar,
      badge: '7-Day'
    },
    {
      id: 'ask',
      label: t('nav_ask_summary', activeLanguage),
      icon: MessageSquare,
      badge: 'Voice AI'
    },
    {
      id: 'reminders',
      label: t('nav_reminders', activeLanguage),
      icon: Bell,
      badge: null
    },
    {
      id: 'caregivers',
      label: t('nav_caregivers', activeLanguage),
      icon: Users,
      badge: null
    },
  ];

  const secondaryNavItems = [
    {
      id: 'teachback',
      label: t('nav_teach_back', activeLanguage),
      icon: CheckCircle2,
    },
    {
      id: 'fridgesheet',
      label: 'Fridge Sheet Print',
      icon: Printer,
    },
    {
      id: 'clinical',
      label: t('nav_eval_dashboard', activeLanguage),
      icon: Stethoscope,
    },
    {
      id: 'diff',
      label: 'Version Comparison',
      icon: GitCompare,
    },
  ];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container Styled in Website Healthcare Green */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-gradient-to-b from-[#03362e] via-[#044339] to-[#022822] text-white border-r border-[#022c22] shadow-xl flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-18 px-4 flex items-center justify-between border-b border-emerald-800/40 bg-black/10">
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none py-2"
            onClick={() => handleItemClick('dashboard')}
          >
            <div className="bg-white/95 px-3 py-1.5 rounded-xl shadow-xs border border-white/20 flex items-center justify-center">
              <img
                src="/calmcare-logo.png"
                alt="CalmCare Logo"
                className="h-6 sm:h-7 w-auto object-contain"
              />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/30">
              Verified Care
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Main Navigation */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300/80">
              Core Care Plan
            </div>
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                      isActive
                        ? 'bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-950/40 border border-emerald-400/40 scale-[1.01]'
                        : 'text-emerald-100/80 hover:text-white hover:bg-white/10 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? 'text-white' : 'text-emerald-300'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-900/60 text-emerald-200 border border-emerald-700/40'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* More Tools Collapsible Section */}
          <div>
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="w-full flex items-center justify-between px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 hover:text-emerald-200"
            >
              <span>More Clinical Tools</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  toolsOpen ? 'transform rotate-180' : ''
                }`}
              />
            </button>

            {toolsOpen && (
              <nav className="space-y-1 pt-1">
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                        isActive
                          ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-950/40 border border-emerald-400/40'
                          : 'text-emerald-100/80 hover:text-white hover:bg-white/10 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? 'text-white' : 'text-emerald-300'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-emerald-300/60" />
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          {/* System & Settings */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300/80">
              Preferences
            </div>
            <button
              onClick={() => handleItemClick('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'settings'
                  ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-950/40 border border-emerald-400/40'
                  : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Settings className="w-4 h-4 text-emerald-300" />
              <span>Settings & Privacy</span>
            </button>
          </div>
        </div>

        {/* User Profile & Logout Bottom Bar */}
        <div className="p-3 border-t border-emerald-800/40 bg-black/15">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/10 border border-white/15 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {user?.name ? user.name[0].toUpperCase() : 'P'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {user?.name || 'Patient'}
                </p>
                <p className="text-[10px] text-emerald-200/70 truncate capitalize">
                  {user?.role || 'patient'}
                </p>
              </div>
            </div>

            <button
              onClick={onRequestLogout}
              title="Sign Out"
              className="p-1.5 text-emerald-200 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
