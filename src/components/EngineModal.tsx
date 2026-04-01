import { motion } from 'motion/react';
import { Sparkles, Zap, X, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface EngineModalProps {
  onSelect: (engine: 'local' | 'pro', apiKey?: string) => void;
  onClose: () => void;
}

export const EngineModal = ({ onSelect, onClose }: EngineModalProps) => {
  const [apiKey, setApiKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const handleProSelect = () => {
    if (apiKey) {
      onSelect('pro', apiKey);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-[2.5rem] p-8 max-w-3xl w-full relative overflow-hidden"
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
          {/* Option 1: Free Local Models */}
          <button 
            onClick={() => onSelect('local')}
            className="group p-6 rounded-3xl border-2 border-academy-blue bg-academy-blue/20 hover:bg-academy-blue/40 transition-all text-left relative"
          >
            <div className="bg-white p-3 rounded-2xl w-fit mb-4 shadow-sm group-hover:scale-110 transition-transform">
              <Sparkles className="text-academy-primary" size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Free Local Models</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <p><span className="font-bold">Text:</span> Llama 3, Mistral, Gemma, Qwen, Phi-3</p>
              <p><span className="font-bold">Voice:</span> Whisper, XTTS, Bark, ChatTTS</p>
              <p><span className="font-bold">Viz:</span> Stable Diffusion, FLUX.1</p>
            </div>
            <div className="mt-6 bg-academy-primary text-white text-center py-2 rounded-xl font-bold">Start Free</div>
          </button>

          {/* Option 2: Pro External Models */}
          <div className="p-6 rounded-3xl border-2 border-academy-green bg-academy-green/20 text-left relative">
            <div className="bg-white p-3 rounded-2xl w-fit mb-4 shadow-sm">
              <Zap className="text-academy-secondary" size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Pro External Models</h3>
            <p className="text-xs text-slate-600 mb-4">Get Unlimited: Choose Provider → Upgrade There → Paste Your API Key Here</p>
            
            <div className="space-y-2 mb-4">
              <button 
                onClick={() => window.open('https://huggingface.co/settings/tokens')}
                className="w-full flex items-center justify-between bg-white px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 border border-slate-100"
              >
                Hugging Face <ExternalLink size={14} />
              </button>
              <button 
                onClick={() => window.open('https://replicate.com/account/api-tokens')}
                className="w-full flex items-center justify-between bg-white px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 border border-slate-100"
              >
                Replicate <ExternalLink size={14} />
              </button>
            </div>

            <input 
              type="password"
              placeholder="Enter Your API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 outline-none focus:ring-2 focus:ring-academy-secondary mb-2"
            />
            <button 
              onClick={handleProSelect}
              disabled={!apiKey}
              className="w-full bg-academy-secondary text-white py-2 rounded-xl font-bold text-sm disabled:opacity-50"
            >
              Connect Pro
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Your learning stays secure on your device. Sync to Google only on request.
        </p>
      </motion.div>
    </div>
  );
};
