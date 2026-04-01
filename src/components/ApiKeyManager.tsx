import { ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface ApiKeyManagerProps {
  onSave: (provider: string, key: string) => void;
  currentProvider?: string;
  currentKey?: string;
}

export const ApiKeyManager = ({ onSave, currentProvider, currentKey }: ApiKeyManagerProps) => {
  const [key, setKey] = useState(currentKey || '');
  const [provider, setProvider] = useState(currentProvider || 'huggingface');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const providers = [
    { id: 'huggingface', name: 'Hugging Face', url: 'https://huggingface.co/settings/tokens' },
    { id: 'replicate', name: 'Replicate', url: 'https://replicate.com/account/api-tokens' },
    { id: 'fal', name: 'Fal.ai', url: 'https://fal.ai/dashboard/usage' },
    { id: 'novita', name: 'Novita.ai', url: 'https://novita.ai/console/api-keys' },
  ];

  const handleTestAndSave = async () => {
    setStatus('testing');
    try {
      // Mock test call - in real app, call a lightweight endpoint of the provider
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (key.length < 10) throw new Error("Invalid Key");
      
      onSave(provider, key);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
      <div className="grid grid-cols-2 gap-2">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setProvider(p.id);
              window.open(p.url, '_blank');
            }}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold transition-all border ${
              provider === p.id 
                ? 'bg-academy-primary text-white border-academy-primary' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-academy-primary'
            }`}
          >
            {p.name} <ExternalLink size={12} />
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Paste Your API Key
        </label>
        <div className="relative">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter key for unlimited use..."
            className="w-full px-4 py-2 rounded-xl text-xs border border-slate-200 outline-none focus:ring-2 focus:ring-academy-primary pr-10"
          />
          {status === 'success' && <CheckCircle2 className="absolute right-3 top-2.5 text-green-500" size={16} />}
          {status === 'error' && <AlertCircle className="absolute right-3 top-2.5 text-red-500" size={16} />}
        </div>
      </div>

      <button
        onClick={handleTestAndSave}
        disabled={!key || status === 'testing'}
        className="w-full bg-slate-800 text-white py-2 rounded-xl text-xs font-bold hover:bg-slate-900 transition-all disabled:opacity-50"
      >
        {status === 'testing' ? 'Testing Connection...' : 'Test & Save Key'}
      </button>

      <p className="text-[9px] text-slate-400 text-center leading-tight">
        Your key controls everything. Upgrade at provider site for unlimited access.
      </p>
    </div>
  );
};
