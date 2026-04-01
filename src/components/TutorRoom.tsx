import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, PhoneOff, Send, Download, Trash2, Bot, CloudUpload, 
  Search, MapPin, Brain, Zap, Image as ImageIcon, Video, 
  Upload, X, Sparkles, Maximize2, Loader2, FileVideo, FileImage
} from 'lucide-react';
import { Mermaid } from './Mermaid';
import { SettingsGear } from './SettingsGear';
import { generateTutorResponse, parseResponse, generateImage, generateVideo } from '../services/gemini';
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

  // New AI Feature States
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const [useFast, setUseFast] = useState(false);
  const [attachments, setAttachments] = useState<{ data: string; mimeType: string; name: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState<'image' | 'video' | null>(null);
  const [showTools, setShowTools] = useState(false);
  const [imageConfig, setImageConfig] = useState({ size: '1K' as any, aspectRatio: '1:1' });
  const [videoConfig, setVideoConfig] = useState({ aspectRatio: '16:9' as any });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const liveSessionRef = useRef<LiveTutorSession | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, attachments]);

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
            const { cleanText, vizCode, vizType } = parseResponse(text);
            setMessages(prev => {
              const last = prev[prev.length - 1];
              // If last message is from model and doesn't contain media, update it
              if (last && last.role === 'model' && !last.text.includes('![](') && !last.text.includes('[Watch Video](')) {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { ...last, text: cleanText };
                return newMessages;
              }
              // Otherwise add a new message
              return [...prev, { role: 'model', text: cleanText }];
            });
            
            if (vizCode && vizType) {
              setVizCode(vizCode);
              setVizType(vizType);
            }
          },
          onInterrupted: () => {
            console.log("Dr. Lem was interrupted");
            setMessages(prev => [...prev, { role: 'model', text: "*(Interrupted)*", timestamp: Date.now() }]);
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
    if (!text.trim() && attachments.length === 0) return;

    const userMsg: ChatMessage = { 
      role: 'user', 
      text: text || (attachments.length > 0 ? `Analyzed ${attachments.length} file(s)` : ''),
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const currentAttachments = [...attachments];
    setAttachments([]);
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      // Get location if maps is enabled
      let location;
      if (useMaps) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) => 
            navigator.geolocation.getCurrentPosition(res, rej)
          );
          location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        } catch (e) {
          console.warn("Location access denied");
        }
      }

      const rawResponse = await generateTutorResponse(text, history, grade.toString(), topic, {
        useSearch,
        useMaps,
        useThinking,
        useFast,
        location,
        attachments: currentAttachments
      });
      
      const { cleanText, vizCode: newVizCode, vizType: newVizType } = parseResponse(rawResponse || '');

      const modelMsg: ChatMessage = { role: 'model', text: cleanText, timestamp: Date.now() };
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
      setMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I encountered an error. Please try again.", timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => [...prev, {
          data: reader.result as string,
          mimeType: file.type,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGenerateImage = async () => {
    if (!input.trim()) {
      alert("Please describe the image you want to generate.");
      return;
    }
    setIsGenerating('image');
    try {
      const url = await generateImage(input, {
        size: imageConfig.size,
        aspectRatio: imageConfig.aspectRatio,
        quality: 'studio'
      });
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: `I've generated this image for you: ![](${url})`,
        timestamp: Date.now()
      }]);
      setInput('');
    } catch (error) {
      console.error("Image gen error:", error);
      alert("Failed to generate image.");
    } finally {
      setIsGenerating(null);
    }
  };

  const handleGenerateVideo = async () => {
    if (!input.trim() && attachments.length === 0) {
      alert("Please describe the video or upload an image to animate.");
      return;
    }
    setIsGenerating('video');
    try {
      const url = await generateVideo(input, {
        image: attachments[0]?.mimeType.startsWith('image/') ? attachments[0].data : undefined,
        aspectRatio: videoConfig.aspectRatio
      });
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: `I've generated this video for you: [Watch Video](${url})`,
        timestamp: Date.now()
      }]);
      setAttachments([]);
      setInput('');
    } catch (error) {
      console.error("Video gen error:", error);
      alert("Failed to generate video.");
    } finally {
      setIsGenerating(null);
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
                {msg.text.includes('![](') ? (
                  <div>
                    <p className="mb-2">{msg.text.split('![](')[0]}</p>
                    <img 
                      src={msg.text.match(/!\[\]\((.*?)\)/)?.[1]} 
                      alt="Generated" 
                      className="rounded-lg w-full shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : msg.text.includes('[Watch Video](') ? (
                  <div>
                    <p className="mb-2">{msg.text.split('[Watch Video](')[0]}</p>
                    <video 
                      src={msg.text.match(/\[Watch Video\]\((.*?)\)/)?.[1]} 
                      controls 
                      className="rounded-lg w-full shadow-md"
                    />
                  </div>
                ) : (
                  msg.text
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="p-2 bg-slate-100 border-t border-slate-200 flex gap-2 overflow-x-auto">
            {attachments.map((att, i) => (
              <div key={i} className="relative group flex-shrink-0">
                {att.mimeType.startsWith('image/') ? (
                  <img src={att.data} className="w-16 h-16 object-cover rounded-lg border border-slate-300" />
                ) : (
                  <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center border border-slate-300">
                    <FileVideo size={24} className="text-slate-500" />
                  </div>
                )}
                <button 
                  onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          {/* AI Tools Toolbar */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setUseSearch(!useSearch)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all",
                useSearch ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500"
              )}
            >
              <Search size={12} /> Search
            </button>
            <button
              onClick={() => setUseMaps(!useMaps)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all",
                useMaps ? "bg-green-500 text-white" : "bg-slate-100 text-slate-500"
              )}
            >
              <MapPin size={12} /> Maps
            </button>
            <button
              onClick={() => setUseThinking(!useThinking)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all",
                useThinking ? "bg-purple-500 text-white" : "bg-slate-100 text-slate-500"
              )}
            >
              <Brain size={12} /> Thinking
            </button>
            <button
              onClick={() => setUseFast(!useFast)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all",
                useFast ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"
              )}
            >
              <Zap size={12} /> Fast
            </button>
            <div className="w-[1px] h-4 bg-slate-200 mx-1" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
            >
              <Upload size={12} /> Upload
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              multiple 
              accept="image/*,video/*" 
              className="hidden" 
            />
          </div>

          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isGenerating ? `Generating ${isGenerating}...` : "Ask Dr. Lem anything..."}
              className="flex-1 bg-slate-100 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-academy-primary transition-all outline-none"
              disabled={!!isGenerating}
            />
            
            <div className="flex gap-1">
              <button
                onClick={handleGenerateImage}
                disabled={!!isGenerating || !input.trim()}
                className="p-3 rounded-2xl bg-slate-100 text-slate-500 hover:bg-academy-blue hover:text-academy-primary transition-all disabled:opacity-50"
                title="Generate Image"
              >
                {isGenerating === 'image' ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
              </button>
              <button
                onClick={handleGenerateVideo}
                disabled={!!isGenerating || (!input.trim() && attachments.length === 0)}
                className="p-3 rounded-2xl bg-slate-100 text-slate-500 hover:bg-academy-blue hover:text-academy-primary transition-all disabled:opacity-50"
                title="Generate Video"
              >
                {isGenerating === 'video' ? <Loader2 size={20} className="animate-spin" /> : <Video size={20} />}
              </button>
              <button
                onClick={() => handleSend()}
                disabled={(!input.trim() && attachments.length === 0) || isTyping || !!isGenerating}
                className="bg-academy-primary text-white p-3 rounded-2xl hover:bg-academy-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                <Send size={20} />
              </button>
            </div>
          </div>

          {/* Config Controls */}
          {input.trim() && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 flex gap-4 items-center border-t border-slate-100 pt-3"
            >
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Image Size</span>
                <select 
                  value={imageConfig.size} 
                  onChange={(e) => setImageConfig(prev => ({ ...prev, size: e.target.value }))}
                  className="text-[10px] bg-slate-50 border-none rounded-md px-2 py-1 outline-none"
                >
                  <option value="1K">1K</option>
                  <option value="2K">2K</option>
                  <option value="4K">4K</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Aspect Ratio</span>
                <select 
                  value={imageConfig.aspectRatio} 
                  onChange={(e) => {
                    setImageConfig(prev => ({ ...prev, aspectRatio: e.target.value }));
                    setVideoConfig(prev => ({ ...prev, aspectRatio: e.target.value as any }));
                  }}
                  className="text-[10px] bg-slate-50 border-none rounded-md px-2 py-1 outline-none"
                >
                  <option value="1:1">1:1</option>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="4:3">4:3</option>
                  <option value="3:4">3:4</option>
                  <option value="21:9">21:9</option>
                </select>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
