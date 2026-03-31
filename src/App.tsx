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

const GOOGLE_CLIENT_ID = "6162363262-ucg8a58gpib4eh7guofclgpnjstf868p.apps.googleusercontent.com"; // Updated with real Client ID

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [showEngineModal, setShowEngineModal] = useState(false);
  const [engine, setEngine] = useState<'local' | 'pro'>('local');

  useEffect(() => {
    const savedUser = localStorage.getItem('academy_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (credentialResponse: any) => {
    // In a real app, we would decode the JWT
    const mockUser = {
      email: 'student@nextgen.edu',
      name: 'NextGen Student',
      token: credentialResponse.credential
    };
    setUser(mockUser);
    localStorage.setItem('academy_user', JSON.stringify(mockUser));
    
    // Show engine modal on first login
    const hasSeenModal = localStorage.getItem('academy_seen_engine_modal');
    if (!hasSeenModal) {
      setShowEngineModal(true);
    }
  };

  const handleSelectEngine = (selectedEngine: 'local' | 'pro') => {
    setEngine(selectedEngine);
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
              <TutorRoom user={user} />
              
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
