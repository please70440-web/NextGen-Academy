import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Zap, X } from 'lucide-react';

interface EngineModalProps {
  onSelect: (engine: 'local' | 'pro') => void;
  onClose: () => void;
}

export const EngineModal = ({ onSelect, onClose }: EngineModalProps) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-[2.5rem] p-8 max-w-2xl w-full relative overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X size={24} className="text-slate-400" />
        </button>

        <h2 className="text-3xl font-bold text-slate-800 mb-2">Choose Your AI Engine</h2>
        <p className="text-slate-500 mb-8">Select how Dr. Lem should power your learning experience.</p>

        <div className="grid md:grid-cols-2 gap-6">
          <button 
            onClick={() => onSelect('local')}
            className="group p-6 rounded-3xl border-2 border-academy-blue bg-academy-blue/20 hover:bg-academy-blue/40 transition-all text-left relative"
          >
            <div className="bg-white p-3 rounded-2xl w-fit mb-4 shadow-sm group-hover:scale-110 transition-transform">
              <Sparkles className="text-academy-primary" size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Free Academy Engine</h3>
            <p className="text-sm text-slate-600">
              Standard AI models for general tutoring. Fast, reliable, and perfect for most students.
            </p>
            <div className="mt-4 text-xs font-bold text-academy-primary uppercase tracking-wider">Default Path</div>
          </button>

          <button 
            onClick={() => onSelect('pro')}
            className="group p-6 rounded-3xl border-2 border-academy-green bg-academy-green/20 hover:bg-academy-green/40 transition-all text-left relative"
          >
            <div className="bg-white p-3 rounded-2xl w-fit mb-4 shadow-sm group-hover:scale-110 transition-transform">
              <Zap className="text-academy-secondary" size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Pro External Engine</h3>
            <p className="text-sm text-slate-600">
              Connect to high-performance models via external providers for PhD-level research.
            </p>
            <div className="mt-4 text-xs font-bold text-academy-secondary uppercase tracking-wider">Advanced Path</div>
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          You can change your engine anytime in settings.
        </p>
      </motion.div>
    </div>
  );
};
