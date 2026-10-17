import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentUploadPage } from './pages/DocumentUploadPage';
import { ExtractionReviewPage } from './pages/ExtractionReviewPage';
import { CarePlanOverviewPage } from './pages/CarePlanOverviewPage';
import { RecoveryGuidePage } from './pages/RecoveryGuidePage';
import { MedicineTimetablePage } from './pages/MedicineTimetablePage';
import { AskSummaryPage } from './pages/AskSummaryPage';
import { TeachBackPage } from './pages/TeachBackPage';
import { FridgeSheetPage } from './pages/FridgeSheetPage';
import { RemindersPage } from './pages/RemindersPage';
import { CaregiverAccessPage } from './pages/CaregiverAccessPage';
import { ClinicalFidelityPage } from './pages/ClinicalFidelityPage';
import { SettingsPrivacyPage } from './pages/SettingsPrivacyPage';
import { VersionComparePage } from './pages/VersionComparePage';

const AppContent: React.FC = () => {
  const { user, loading, language, logout } = useAuth();
  const [history, setHistory] = useState<string[]>(['landing']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [demoCaseId, setDemoCaseId] = useState<string | null>(null);

  const currentTab = history[historyIndex] || 'landing';

  // Navigate pushing onto history stack
  const navigateTo = (tab: string) => {
    if (tab === currentTab) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(tab);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-xs font-semibold animate-pulse">
        Initializing CalmCare Recovery Portal...
      </div>
    );
  }

  // Handle Synthetic Demo Click from Landing Page
  const handleSyntheticDemo = (caseId: string) => {
    setDemoCaseId(caseId);
    if (!user) {
      navigateTo('register');
    } else {
      navigateTo('upload');
    }
  };

  const handleUploadSuccess = () => {
    navigateTo('review');
  };

  // If unauthenticated and on public route
  const isPublicRoute = !user && ['landing', 'login', 'register'].includes(currentTab);

  if (!user || isPublicRoute) {
    switch (currentTab) {
      case 'login':
        return (
          <LoginPage
            onSwitchToRegister={() => navigateTo('register')}
            onLoginSuccess={() => navigateTo(demoCaseId ? 'upload' : 'dashboard')}
            onBackToHome={() => navigateTo('landing')}
          />
        );
      case 'register':
        return (
          <RegisterPage
            onSwitchToLogin={() => navigateTo('login')}
            onRegisterSuccess={() => navigateTo(demoCaseId ? 'upload' : 'dashboard')}
            onBackToHome={() => navigateTo('landing')}
          />
        );
      case 'landing':
      default:
        return (
          <LandingPage
            onGetStarted={() => navigateTo(user ? 'dashboard' : 'register')}
            onLogin={() => navigateTo('login')}
            onRegister={() => navigateTo('register')}
            onSelectSyntheticCase={handleSyntheticDemo}
          />
        );
    }
  }

  // Render Authenticated Shell with Left Sidebar & Top Header
  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={navigateTo} />;
      case 'upload':
        return (
          <DocumentUploadPage
            onUploadSuccess={handleUploadSuccess}
            initialCaseId={demoCaseId}
          />
        );
      case 'review':
        return <ExtractionReviewPage onNavigate={navigateTo} />;
      case 'careplan':
        return <CarePlanOverviewPage key={language} onNavigate={navigateTo} />;
      case 'recovery-guide':
        return <RecoveryGuidePage key={language} onNavigate={navigateTo} />;
      case 'timetable':
        return <MedicineTimetablePage />;
      case 'ask':
        return <AskSummaryPage />;
      case 'teachback':
        return <TeachBackPage />;
      case 'fridgesheet':
        return <FridgeSheetPage />;
      case 'reminders':
        return <RemindersPage />;
      case 'caregivers':
        return <CaregiverAccessPage />;
      case 'clinical':
      case 'fidelity':
        return <ClinicalFidelityPage />;
      case 'diff':
        return <VersionComparePage />;
      case 'settings':
        return <SettingsPrivacyPage />;
      default:
        return <DashboardPage onNavigate={navigateTo} />;
    }
  };

  const handleConfirmLogout = async () => {
    setLogoutModalOpen(false);
    await logout();
    navigateTo('landing');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onNavigate={navigateTo}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onRequestLogout={() => setLogoutModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <TopHeader
          currentTab={currentTab}
          onNavigate={navigateTo}
          onToggleSidebar={() => setSidebarOpen(true)}
          canGoBack={historyIndex > 0}
          canGoForward={historyIndex < history.length - 1}
          onGoBack={goBack}
          onGoForward={goForward}
          onRequestLogout={() => setLogoutModalOpen(true)}
        />

        <main className="flex-1 pb-16 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
