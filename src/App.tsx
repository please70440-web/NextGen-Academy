/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Login } from './components/Login';
import { TutorRoom } from './components/TutorRoom';
import { EngineModal } from './components/EngineModal';
import { motion, AnimatePresence } from 'motion/react';
import { initDB } from './services/storage';

const GOOGLE_CLIENT_ID = "6162363262-ucg8a58gpib4eh7guofclgpnjstf868p.apps.googleusercontent.com";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showEngineModal, setShowEngineModal] = useState(false);
  const [engine, setEngine] = useState<'local' | 'pro'>(() => {
    return (localStorage.getItem('academy_model') as 'local' | 'pro') || 'local';
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('academy_user');
    const savedToken = localStorage.getItem('googleToken');
    if (savedUser && savedToken) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setToken(savedToken);
      initDB(parsedUser.sub);
    }
  }, []);

  const handleLogin = (profile: any, accessToken: string) => {
    setUser(profile);
    setToken(accessToken);
    localStorage.setItem('academy_user', JSON.stringify(profile));
    localStorage.setItem('googleToken', accessToken);
    initDB(profile.sub);
    
    if (!localStorage.getItem('academy_seen_engine_modal')) {
      setShowEngineModal(true);
    }
  };

  const handleSelectEngine = (selectedEngine: 'local' | 'pro', apiKey?: string) => {
    setEngine(selectedEngine);
    localStorage.setItem('academy_model', selectedEngine);
    if (apiKey) {
      localStorage.setItem('academy_apiKey', apiKey);
    }
    setShowEngineModal(false);
    localStorage.setItem('academy_seen_engine_modal', 'true');
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen font-sans">
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Login onLogin={handleLogin} />
            </motion.div>
          ) : (
            <motion.div
              key="room"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-screen"
            >
              <TutorRoom user={user} token={token!} />
              
              {showEngineModal && (
                <EngineModal 
                  onSelect={handleSelectEngine} 
                  onClose={() => setShowEngineModal(false)} 
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GoogleOAuthProvider>
  );
}
