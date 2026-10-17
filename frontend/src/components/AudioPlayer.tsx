import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AudioPlayerProps {
  textToRead: string;
  sectionTitle?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ textToRead, sectionTitle = "Care Plan" }) => {
  const { language } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<number>(0.85); // Paced calm reading speed
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSupported(false);
    }
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlay = () => {
    if (!supported) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = speed;
    utterance.pitch = 1.0;

    // Map language
    const langMap: Record<string, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      te: 'te-IN',
      ta: 'ta-IN',
      mr: 'mr-IN',
      bn: 'bn-IN',
      kn: 'kn-IN',
    };
    utterance.lang = langMap[language] || 'en-IN';

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleReplay = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsPaused(false);
    handlePlay();
  };

  const toggleSpeed = () => {
    const speeds = [0.75, 0.85, 1.0];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setSpeed(newSpeed);
    if (isPlaying) {
      handleReplay();
    }
  };

  if (!supported) {
    return (
      <div className="text-xs text-slate-500 flex items-center gap-1.5 p-2 bg-slate-100 rounded-lg">
        <VolumeX className="w-4 h-4 text-slate-400" />
        Audio narration is not supported in this browser. Please read the verified text.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200 shadow-sm no-print">
      <div className="flex items-center gap-2 mr-2">
        <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-sm">
          <Volume2 className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-bold text-teal-900 block leading-none">
            Calm Voice Guidance
          </span>
          <span className="text-[10px] text-teal-700 font-medium">
            {sectionTitle} • Patient-paced
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            {isPaused ? 'Resume' : 'Listen'}
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <Pause className="w-3.5 h-3.5 fill-white" />
            Pause
          </button>
        )}

        <button
          onClick={handleReplay}
          title="Replay this section"
          className="p-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium shadow-sm transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={toggleSpeed}
          title="Adjust speech pace"
          className="flex items-center gap-1 px-2 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium shadow-sm transition-all"
        >
          <FastForward className="w-3.5 h-3.5 text-teal-600" />
          <span>{speed}x</span>
        </button>
      </div>
    </div>
  );
};
