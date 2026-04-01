import { useGoogleLogin } from '@react-oauth/google';
import { motion } from 'motion/react';
import { GraduationCap, Microscope, Atom, Dna } from 'lucide-react';

interface LoginProps {
  onLogin: (user: any, token: string) => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // In a real app, we'd exchange auth code for tokens or fetch profile
      // For this implementation, we'll simulate the profile fetch
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const profile = await res.json();
      
      localStorage.setItem('googleToken', tokenResponse.access_token);
      localStorage.setItem('userId', profile.sub);
      onLogin(profile, tokenResponse.access_token);
    },
    scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
  });

  return (
    <div className="fixed inset-0 bg-academy-blue flex items-center justify-center p-4 z-50 overflow-hidden">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-20 -left-20 text-academy-primary/10"
      >
        <Atom size={300} />
      </motion.div>
      <motion.div 
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute bottom-10 right-10 text-academy-secondary/10"
      >
        <Dna size={200} />
      </motion.div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2rem] shadow-2xl p-8 md:p-12 max-w-md w-full text-center relative z-10 border-4 border-white"
      >
        <div className="bg-academy-primary w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
          <GraduationCap className="text-white" size={40} />
        </div>
        
        <h1 className="text-4xl font-bold text-slate-800 mb-2 tracking-tight">NextGen Academy</h1>
        <p className="text-slate-500 mb-8 text-lg">Welcome to NextGen Academy! Login with Google to start learning with Dr. Lem.</p>

        <button
          onClick={() => login()}
          className="w-full bg-[#4285F4] text-white font-bold py-4 px-6 rounded-full flex items-center justify-center gap-3 hover:bg-[#357ae8] transition-colors shadow-lg"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        <p className="text-xs text-slate-400 mt-6">
          Your learning stays secure on your device. 🧬
        </p>
      </motion.div>
    </div>
  );
};
