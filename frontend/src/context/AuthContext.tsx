import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, CarePlan } from '../types';
import { api, getStoredToken, setStoredToken, clearStoredToken } from '../utils/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  language: string;
  setLanguage: (lang: string) => void;
  accessibilityMode: boolean;
  toggleAccessibility: () => void;
  activePlan: CarePlan | null;
  setActivePlan: (plan: CarePlan | null) => void;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState<string>(() => localStorage.getItem('calmcare_lang') || 'en');
  const [accessibilityMode, setAccessibilityMode] = useState<boolean>(() => localStorage.getItem('calmcare_a11y') === 'true');
  const [activePlan, setActivePlan] = useState<CarePlan | null>(() => {
    const saved = localStorage.getItem('calmcare_active_plan');
    return saved ? JSON.parse(saved) : null;
  });

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('calmcare_lang', lang);
  };

  const toggleAccessibility = () => {
    setAccessibilityMode(prev => {
      const next = !prev;
      localStorage.setItem('calmcare_a11y', String(next));
      if (next) {
        document.body.classList.add('high-contrast', 'font-accessible-large');
      } else {
        document.body.classList.remove('high-contrast', 'font-accessible-large');
      }
      return next;
    });
  };

  const updateActivePlan = (plan: CarePlan | null) => {
    setActivePlan(plan);
    if (plan) {
      localStorage.setItem('calmcare_active_plan', JSON.stringify(plan));
    } else {
      localStorage.removeItem('calmcare_active_plan');
    }
  };

  const refreshUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await api.get<User>('/api/auth/me');
      setUser(u);
      if (u.preferred_language) {
        setLanguageState(u.preferred_language);
      }
    } catch {
      clearStoredToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessibilityMode) {
      document.body.classList.add('high-contrast', 'font-accessible-large');
    }
    refreshUser();
  }, []);

  const login = (token: string, newUser: User) => {
    setStoredToken(token);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      console.warn("Logout request completed with local purge:", e);
    } finally {
      clearStoredToken();
      setUser(null);
      updateActivePlan(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        language,
        setLanguage,
        accessibilityMode,
        toggleAccessibility,
        activePlan,
        setActivePlan: updateActivePlan,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
