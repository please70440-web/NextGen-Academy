import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Send, Download, Trash2, Bot, CloudUpload } from 'lucide-react';
import { Mermaid } from './Mermaid';
import { SettingsGear } from './SettingsGear';
import { generateTutorResponse, parseResponse } from '../services/gemini';
import { saveSessionToLocal, exportToDrive, Session, ChatMessage } from '../services/storage';
import { LiveTutorSession } from '../services/live';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface TutorRoomProps {
  user: any;
  token: string;
}

export const TutorRoom = ({ user, token }: TutorRoomProps) => {
  const [isOnCall, setIsOnCall] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [vizCode, setVizCode] = useState<string>('');
  const [vizType, setVizType] = useState<'mermaid' | 'svg'>();
  const [grade, setGrade] = useState(10);
  const [topic, setTopic] = useState('Biology');
  const [isExporting, setIsExporting] = useState(false);
  const [modelMode, setModelMode] = useState<'local' | 'pro'>(() => {
    return (localStorage.getItem('academy_modelMode') as 'local' | 'pro') || 'local';
  });
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const liveSessionRef = useRef<LiveTutorSession | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      liveSessionRef.current?.disconnect();
    };
  }, []);

  const handleModeChange = (mode: 'local' | 'pro') => {
    setModelMode(mode);
    localStorage.setItem('academy_modelMode', mode);
    // In a real app, we might trigger model loading here
    if (mode === 'local') {
      console.log("Switching to Local Browser Models...");
    }
  };

  const handleKeySave = (provider: string, key: string) => {
    localStorage.setItem('academy_provider', provider);
    localStorage.setItem('academy_apiKey', key);
  };

  const toggleCall = async () => {
    if (isOnCall) {
      liveSessionRef.current?.disconnect();
      liveSessionRef.current = null;
      setIsOnCall(false);
    } else {
      try {
        // Check if we have an API key before starting
        const isPro = modelMode === 'pro';
        const proKey = localStorage.getItem('academy_apiKey');
        const apiKey = (isPro && proKey) ? proKey : process.env.GEMINI_API_KEY;

        if (!apiKey) {
          alert("No API Key found. Please go to Settings (gear icon) and add your API key to use voice features.");
          return;
        }

        liveSessionRef.current = new LiveTutorSession();
        setIsOnCall(true);
        await liveSessionRef.current.connect({
          onMessage: (text) => {
            const { cleanText } = parseResponse(text);
            setMessages(prev => [...prev, { role: 'model', text: cleanText }]);
          },
          onInterrupted: () => {
            console.log("Dr. Lem was interrupted");
          },
          onError: (err) => {
            console.error("Live error:", err);
            setIsOnCall(false);
            alert("Live Session Error: " + (err.message || "Unknown error"));
          }
        });
      } catch (error: any) {
        console.error("Failed to start call:", error);
        setIsOnCall(false);
        alert(error.message || "Could not start the call. Please check your API Key setup.");
      }
    }
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const rawResponse = await generateTutorResponse(text, history, grade.toString(), topic);
      const { cleanText, vizCode: newVizCode, vizType: newVizType } = parseResponse(rawResponse || '');

      const modelMsg: ChatMessage = { role: 'model', text: cleanText };
      setMessages(prev => [...prev, modelMsg]);
      
      if (newVizCode) {
        setVizCode(newVizCode);
        setVizType(newVizType);
      }

      // Auto-save to local IndexedDB
      const session: Session = {
        id: uuidv4(),
        topic,
        grade,
        timestamp: Date.now(),
        chat: [...messages, userMsg, modelMsg],
        viz: {
          type: newVizType || 'mermaid',
          code: newVizCode || ''
        }
      };
      await saveSessionToLocal(user.sub, session);

    } catch (error) {
      console.error('Tutor error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleDriveExport = async () => {
    setIsExporting(true);
    try {
      await exportToDrive(token, user.sub);
      alert('Exported to My Google Drive successfully! 🧬');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    const data = {
      user: user.email,
      grade,
      topic,
      history: messages,
      viz: { type: vizType, code: vizCode }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nextgen-academy-${topic.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-academy-blue flex flex-col md:flex-row overflow-hidden">
      {/* Settings Gear - Persistent */}
      <SettingsGear 
        mode={modelMode} 
        onModeChange={handleModeChange} 
        onKeySave={handleKeySave} 
      />

      {/* 70% Central Visual Board */}
      <div className="flex-1 h-[50vh] md:h-full bg-white relative overflow-hidden">
        <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
          <div className="bg-academy-primary/10 text-academy-primary px-4 py-1 rounded-full text-sm font-bold border border-academy-primary/20">
            {grade}
          </div>
          <div className="bg-academy-secondary/10 text-academy-secondary px-4 py-1 rounded-full text-sm font-bold border border-academy-secondary/20">
            {topic}
          </div>
        </div>

        <div className="w-full h-full flex items-center justify-center">
          {vizType === 'mermaid' && <Mermaid chart={vizCode} />}
          {vizType === 'svg' && (
            <div 
              className="w-full h-full flex items-center justify-center p-8"
              dangerouslySetInnerHTML={{ __html: vizCode }} 
            />
          )}
          {!vizCode && (
            <div className="text-center p-12">
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-32 h-32 bg-academy-blue rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Bot size={64} className="text-academy-primary" />
              </motion.div>
              <h2 className="text-2xl font-bold text-slate-800">Ready to learn?</h2>
              <p className="text-slate-500">Ask Dr. Lem a question to start the visualization.</p>
            </div>
          )}
        </div>

        {/* Voice Controls - Top Right Desktop / Top Mobile */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 flex flex-col gap-3 z-20">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleCall}
            className={cn(
              "w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all",
              isOnCall ? "bg-red-500 text-white" : "bg-academy-secondary text-white animate-pulse"
            )}
          >
            {isOnCall ? <PhoneOff size={28} /> : <Phone size={28} />}
          </motion.button>
          
          <AnimatePresence>
            {isOnCall && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white/90 backdrop-blur p-4 rounded-3xl shadow-xl border border-white flex items-center gap-4"
              >
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <motion.div
                      key={i}
                      animate={{ height: [10, 30, 10] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                      className="w-1 bg-academy-primary rounded-full"
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-slate-700">Dr. Lem is listening...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom-Right Chat Panel */}
      <div className="w-full md:w-[400px] h-[50vh] md:h-full bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 flex flex-col relative">
        {/* Chat Header */}
        <div className="p-4 border-bottom border-slate-200 bg-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-academy-primary rounded-xl flex items-center justify-center text-white">
              <Bot size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 leading-none">Dr. Lem</h3>
              <span className="text-[10px] text-academy-secondary font-bold uppercase tracking-wider">Online</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleDriveExport}
              disabled={isExporting}
              className="p-2 hover:bg-slate-100 rounded-xl text-academy-primary transition-colors disabled:opacity-50"
              title="Export to My Google Drive"
            >
              <CloudUpload size={20} />
            </button>
            <button 
              onClick={() => setMessages([])}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
              title="Clear Session"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        <div className="px-4 py-2 bg-academy-blue/10 text-[10px] text-slate-500 text-center">
          Your learning stays secure on your device. Sync to Google only on request.
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400 italic">
                "Hi! I'm Dr. Lem. Let's dive into biology—tell me your grade and topic!"
              </p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col max-w-[85%]",
                msg.role === 'user' ? "ml-auto items-end" : "items-start"
              )}
            >
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                msg.role === 'user' 
                  ? "bg-academy-primary text-white rounded-tr-none" 
                  : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
              )}>
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-2 text-slate-400 p-2">
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask Dr. Lem anything..."
              className="flex-1 bg-slate-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-academy-primary transition-all outline-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="bg-academy-primary text-white p-3 rounded-2xl hover:bg-academy-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              <Send size={20} />
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['Photosynthesis', 'Mitosis', 'DNA Structure', 'Human Heart'].map(suggestion => (
              <button
                key={suggestion}
                onClick={() => handleSend(suggestion)}
                className="whitespace-nowrap text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-academy-blue hover:text-academy-primary transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
