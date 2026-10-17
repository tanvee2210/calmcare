import React, { useState, useEffect } from 'react';
import { Eye, X, Check, ZoomIn, Contrast, AlignLeft, Sparkles, RotateCcw } from 'lucide-react';
import { t } from '../utils/i18n';

interface AccessibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: string;
}

export interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'xlarge';
  contrast: 'normal' | 'high';
  spacing: 'normal' | 'relaxed' | 'loose';
  reducedMotion: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 'normal',
  contrast: 'normal',
  spacing: 'normal',
  reducedMotion: false,
};

export const AccessibilityModal: React.FC<AccessibilityModalProps> = ({
  isOpen,
  onClose,
  currentLanguage,
}) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const saved = localStorage.getItem('calmcare_a11y_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  const applySettings = (cfg: AccessibilitySettings) => {
    const root = document.documentElement;

    // Font size
    if (cfg.fontSize === 'large') {
      root.style.fontSize = '18px';
    } else if (cfg.fontSize === 'xlarge') {
      root.style.fontSize = '20px';
    } else {
      root.style.fontSize = '16px';
    }

    // High Contrast
    if (cfg.contrast === 'high') {
      root.classList.add('high-contrast');
      document.body.classList.add('contrast-125');
    } else {
      root.classList.remove('high-contrast');
      document.body.classList.remove('contrast-125');
    }

    // Line Spacing
    if (cfg.spacing === 'relaxed') {
      root.style.lineHeight = '1.8';
    } else if (cfg.spacing === 'loose') {
      root.style.lineHeight = '2.1';
    } else {
      root.style.lineHeight = '1.5';
    }

    // Reduced Motion
    if (cfg.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    localStorage.setItem('calmcare_a11y_settings', JSON.stringify(cfg));
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    applySettings(DEFAULT_SETTINGS);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 id="a11y-title" className="text-xl font-bold text-slate-900">
                {t('a11y_title', currentLanguage)}
              </h2>
              <p className="text-xs text-slate-500">
                Customize reading size, contrast, and spacing for comfort
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-5 my-5">
          
          {/* Text Size */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-2">
              <ZoomIn className="w-4 h-4 text-teal-600" />
              {t('a11y_font_size', currentLanguage)}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'normal', label: t('a11y_font_normal', currentLanguage) },
                { id: 'large', label: t('a11y_font_large', currentLanguage) },
                { id: 'xlarge', label: t('a11y_font_xlarge', currentLanguage) },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSettings(s => ({ ...s, fontSize: opt.id as any }))}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                    settings.fontSize === opt.id
                      ? 'border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Display Contrast */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-2">
              <Contrast className="w-4 h-4 text-teal-600" />
              {t('a11y_contrast', currentLanguage)}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSettings(s => ({ ...s, contrast: 'normal' }))}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                  settings.contrast === 'normal'
                    ? 'border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {t('a11y_contrast_normal', currentLanguage)}
              </button>
              <button
                onClick={() => setSettings(s => ({ ...s, contrast: 'high' }))}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                  settings.contrast === 'high'
                    ? 'border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {t('a11y_contrast_high', currentLanguage)}
              </button>
            </div>
          </div>

          {/* Line Spacing */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-2">
              <AlignLeft className="w-4 h-4 text-teal-600" />
              {t('a11y_spacing', currentLanguage)}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'normal', label: t('a11y_spacing_normal', currentLanguage) },
                { id: 'relaxed', label: t('a11y_spacing_relaxed', currentLanguage) },
                { id: 'loose', label: t('a11y_spacing_loose', currentLanguage) },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSettings(s => ({ ...s, spacing: opt.id as any }))}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                    settings.spacing === opt.id
                      ? 'border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reduced Motion Toggle */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">
              {t('a11y_reduced_motion', currentLanguage)}
            </span>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={e => setSettings(s => ({ ...s, reducedMotion: e.target.checked }))}
              className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('a11y_reset', currentLanguage)}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm"
          >
            {t('a11y_close', currentLanguage)}
          </button>
        </div>

      </div>
    </div>
  );
};
