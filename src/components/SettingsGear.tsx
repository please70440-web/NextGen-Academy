import { Settings, X, Zap, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ApiKeyManager } from './ApiKeyManager';

interface SettingsGearProps {
  mode: 'local' | 'pro';
  onModeChange: (mode: 'local' | 'pro') => void;
  onKeySave: (provider: string, key: string) => void;
}

export const SettingsGear = ({ mode, onModeChange, onKeySave }: SettingsGearProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-6 right-24 z-[70]">
      <motion.button
        whileHover={{ rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 bg-white/80 backdrop-blur rounded-xl shadow-lg flex items-center justify-center text-slate-600 hover:text-academy-primary transition-colors border border-white"
      >
        <Settings size={20} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute top-12 right-0 w-80 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-6 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800">Learning Engine</h3>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex p-1 bg-slate-100 rounded-2xl">
                  <button
                    onClick={() => onModeChange('local')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                      mode === 'local' ? 'bg-white text-academy-primary shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    <Sparkles size={14} /> Free Local
                  </button>
                  <button
                    onClick={() => onModeChange('pro')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                      mode === 'pro' ? 'bg-white text-academy-secondary shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    <Zap size={14} /> Pro APIs
                  </button>
                </div>

                {mode === 'pro' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="overflow-hidden"
                  >
                    <ApiKeyManager 
                      onSave={onKeySave}
                      currentProvider={localStorage.getItem('academy_provider') || undefined}
                      currentKey={localStorage.getItem('academy_apiKey') || undefined}
                    />
                  </motion.div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 text-center italic">
                    {mode === 'local' 
                      ? "Running models directly in your browser. No keys, no limits."
                      : "Using high-performance external APIs. Managed by your keys."}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
