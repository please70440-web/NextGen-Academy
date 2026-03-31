import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'motion/react';
import { GraduationCap, Microscope, Atom, Dna } from 'lucide-react';

interface LoginProps {
  onLogin: (user: any) => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  return (
    <div className="fixed inset-0 bg-academy-blue flex items-center justify-center p-4 z-50 overflow-hidden">
      {/* Background Decorations */}
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
        <p className="text-slate-500 mb-8 text-lg">Your AI-powered journey into Science & Biology starts here.</p>

        <div className="space-y-4">
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={credentialResponse => {
                onLogin(credentialResponse);
              }}
              onError={() => {
                console.log('Login Failed');
              }}
              theme="filled_blue"
              shape="pill"
              use_fedcm={false}
            />
          </div>
          
          <p className="text-xs text-slate-400 mt-6">
            By signing in, you agree to our playful learning terms. 🧬
          </p>
        </div>

        <div className="mt-12 flex justify-center gap-4 opacity-50">
          <Microscope size={24} className="text-academy-primary" />
          <Atom size={24} className="text-academy-secondary" />
          <Dna size={24} className="text-academy-primary" />
        </div>
      </motion.div>
    </div>
  );
};
