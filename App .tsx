
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import VideoCard from './components/VideoCard';
import { GeminiVideoService } from './geminiService';
import { db } from './supabaseService';
import { GeneratedVideo, GenerationSettings, SubscriptionTier, UserProfile, AspectRatio, VisualStyle } from './types';
import { 
  Video as VideoIcon, 
  AlertCircle, Loader2, 
  Zap as ZapIcon, 
  Key, Layers, Sparkles, Wand2,
  CheckCircle2, CreditCard, Smartphone, ShieldCheck, X
} from 'lucide-react';

const STYLES: VisualStyle[] = [
  { id: 'cinematic', name: 'Cinematic', prompt: 'hyper-realistic cinematic, 8k, IMAX lighting, sharp focus, anamorphic lens', image: '🎥' },
  { id: '3danimation', name: '3D Pixar', prompt: 'disney pixar animation style, adorable characters, vivid colors, sub-surface scattering', image: '🐹' },
  { id: 'cyberpunk', name: 'Cyberpunk', prompt: 'futuristic neon city, blade runner aesthetic, rainy atmosphere, deep shadows', image: '🏙️' },
  { id: 'anime', name: 'Studio Ghibli', prompt: 'hand-drawn anime, hayao miyazaki style, soft painterly backgrounds, nostalgic', image: '🎐' },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('generate');
  const [user, setUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    credits: 10,
    tier: SubscriptionTier.FREE,
    isApiKeySelected: false,
    appLanguage: 'HI'
  });
  
  const [library, setLibrary] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(STYLES[0]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [extendingVideo, setExtendingVideo] = useState<GeneratedVideo | null>(null);

  const isEnvKeySet = !!(process.env.API_KEY && process.env.API_KEY !== '' && process.env.API_KEY !== 'undefined');

  useEffect(() => {
    const init = async () => {
      try {
        const u = await db.getUser();
        if (u) {
          setUser(u);
          const videos = await db.fetchVideos(u.id);
          setLibrary(videos || []);
        } else {
          // Force some initial videos if library is empty for demo
          const localVideos = await db.fetchVideos('anonymous');
          setLibrary(localVideos || []);
        }
        
        const hasKey = await GeminiVideoService.checkApiKey();
        setProfile(prev => ({ ...prev, isApiKeySelected: hasKey }));
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const handleLogin = async () => {
    try {
      const { user: newUser, error: loginError } = await db.signInWithGoogle();
      if (loginError) throw loginError;
      if (newUser) {
        setUser(newUser);
        const videos = await db.fetchVideos(newUser.id);
        setLibrary(videos || []);
        setCurrentView('generate');
      }
    } catch (err) {
      setError("Auth System: Using Guest Mode for now.");
      // Fallback for demo
      const guest = { id: 'guest', email: 'guest@lumina.ai' };
      setUser(guest);
      setCurrentView('generate');
    }
  };

  const startGeneration = async () => {
    if (!profile.isApiKeySelected && !isEnvKeySet) {
      try {
        await GeminiVideoService.openKeySelection();
        setProfile(prev => ({ ...prev, isApiKeySelected: true }));
      } catch (e) {
        setError("Please select a valid API key to continue.");
        return;
      }
    }
    
    if (!prompt.trim() && !extendingVideo) {
      setError("Please describe the scene you want to generate.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const settings: GenerationSettings = {
        prompt: extendingVideo ? (prompt || "Continue the action") : prompt,
        aspectRatio: extendingVideo ? extendingVideo.aspectRatio : aspectRatio,
        resolution: profile.tier === SubscriptionTier.FREE ? '720p' : '1080p',
        style: extendingVideo ? undefined : selectedStyle.prompt,
        previousVideo: extendingVideo?.apiVideoData
      };
      
      const { videoUrl, apiVideoData } = await GeminiVideoService.generateVideo(settings, setStatus);
      const newVideo: GeneratedVideo = {
        id: Math.random().toString(36).substr(2, 9),
        prompt: settings.prompt,
        url: videoUrl,
        createdAt: Date.now(),
        aspectRatio: settings.aspectRatio,
        resolution: settings.resolution,
        apiVideoData
      };
      
      await db.saveVideo(newVideo, user?.id || 'anonymous');
      setLibrary(prev => [newVideo, ...prev]);
      setCurrentView('library');
      setExtendingVideo(null);
      setPrompt('');
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Synthesis failed. Check if your API key has VEO access.");
    } finally {
      setIsGenerating(false);
      setStatus("");
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-[#06080f] flex flex-col items-center justify-center gap-4">
        <Loader2 className="text-indigo-500 animate-spin" size={48} />
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Connecting to Lumina Neural Core...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06080f] text-white flex flex-col">
      <Navbar 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        credits={profile.credits} 
        t={{}}
        user={user}
        onLoginClick={handleLogin}
        onLogout={() => { db.signOut(); setUser(null); }}
        onBuyCredits={() => setCurrentView('pricing')}
      />

      <main className="flex-grow max-w-6xl mx-auto px-6 py-12 w-full">
        {currentView === 'generate' && (
          <div className="space-y-16 animate-in fade-in duration-700">
             <header className="text-center space-y-4 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                <Sparkles size={12} /> Powered by Gemini Veo 3.1
              </div>
              <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
                AI <span className="text-indigo-500">Director</span> Studio
              </h1>
            </header>

            <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-30"></div>
              
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                  <Wand2 className="text-indigo-400" /> Narrative Engine
                </h2>
                {!profile.isApiKeySelected && !isEnvKeySet && (
                   <button 
                    onClick={async () => {
                      await GeminiVideoService.openKeySelection();
                      setProfile(p => ({ ...p, isApiKeySelected: true }));
                    }}
                    className="text-[10px] font-black bg-indigo-600 px-4 py-2 rounded-xl uppercase flex items-center gap-2"
                   >
                     <Key size={14} /> Add API Key
                   </button>
                )}
              </div>

              {extendingVideo && (
                <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <video src={extendingVideo.url} className="w-16 h-16 rounded-lg object-cover" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-indigo-400">Extending Sequence</p>
                      <p className="text-xs italic text-slate-400">"{extendingVideo.prompt}"</p>
                    </div>
                  </div>
                  <button onClick={() => setExtendingVideo(null)} className="text-xs uppercase font-black text-slate-500 hover:text-white">Cancel</button>
                </div>
              )}

              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your cinematic masterpiece..."
                className="w-full h-48 bg-slate-950/50 border border-slate-800 rounded-2xl p-6 text-xl focus:border-indigo-500 outline-none resize-none mb-6 transition-all"
              />

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold mb-6 flex items-center gap-3">
                  <AlertCircle size={18} /> {error}
                </div>
              )}

              <div className="flex flex-wrap gap-4 mb-8">
                {STYLES.map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setSelectedStyle(s)}
                    className={`px-5 py-3 rounded-xl border transition-all flex items-center gap-3 ${selectedStyle.id === s.id ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-950/50 border-slate-800'}`}
                  >
                    <span>{s.image}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{s.name}</span>
                  </button>
                ))}
              </div>

              <button 
                onClick={startGeneration}
                disabled={isGenerating}
                className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black text-xl shadow-xl transition-all flex items-center justify-center gap-4 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : <ZapIcon className="fill-current" />}
                <span>{isGenerating ? status || 'Generating...' : 'Render Video'}</span>
              </button>
            </div>
          </div>
        )}

        {currentView === 'library' && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <h2 className="text-4xl font-black uppercase tracking-tighter">Your Production Vault</h2>
            {library.length === 0 ? (
              <div className="py-40 text-center text-slate-700 border-2 border-dashed border-slate-800 rounded-3xl">
                <VideoIcon size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-black uppercase text-xs">No assets rendered yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {library.map(video => (
                  <VideoCard 
                    key={video.id} 
                    video={video} 
                    onDelete={(id) => setLibrary(prev => prev.filter(v => v.id !== id))} 
                    onExtend={(v) => { setExtendingVideo(v); setCurrentView('generate'); }} 
                    onPinReference={() => {}} 
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === 'pricing' && (
          <div className="py-12 text-center max-w-4xl mx-auto animate-in slide-in-from-bottom-10">
            <h2 className="text-6xl font-black uppercase mb-16">Choose your <span className="text-indigo-500">Plan</span></h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900/60 border border-slate-800 p-12 rounded-[3rem] space-y-8">
                <h3 className="text-2xl font-black uppercase tracking-widest">Creator</h3>
                <div className="text-5xl font-black">₹0 <span className="text-sm text-slate-500">/mo</span></div>
                <ul className="text-left space-y-4 text-xs font-bold text-slate-400">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-indigo-500" /> 10 Credits / month</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-indigo-500" /> 720p Rendering</li>
                </ul>
                <button className="w-full py-4 bg-slate-800 rounded-xl text-[10px] font-black uppercase opacity-50 cursor-not-allowed">Active</button>
              </div>
              <div className="bg-indigo-600 p-12 rounded-[3rem] space-y-8 relative overflow-hidden">
                <div className="absolute top-6 right-8 bg-white/20 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Best Value</div>
                <h3 className="text-2xl font-black uppercase tracking-widest">Director</h3>
                <div className="text-5xl font-black">₹999 <span className="text-sm text-indigo-300">/mo</span></div>
                <ul className="text-left space-y-4 text-xs font-bold text-indigo-100">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} /> Unlimited Credits</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} /> 1080p Ultra HD</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} /> Sequence Extensions</li>
                </ul>
                <button 
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-4 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase hover:scale-105 transition-transform"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Payment Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsCheckoutOpen(false)}></div>
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[3rem] p-10 relative z-10 animate-in zoom-in-95">
             <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X /></button>
             <h4 className="text-2xl font-black uppercase tracking-tight mb-2">Secure Checkout</h4>
             <p className="text-slate-500 text-xs mb-8 uppercase font-bold tracking-widest">Upgrade to Director Plan</p>
             
             <div className="space-y-4 mb-10">
               <div className="p-6 bg-slate-950 border border-indigo-500/30 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-indigo-500/5 transition-colors group">
                 <div className="flex items-center gap-4">
                   <CreditCard className="text-indigo-400" />
                   <span className="text-sm font-bold">Credit / Debit Card</span>
                 </div>
                 <div className="w-4 h-4 rounded-full border-2 border-indigo-500 bg-indigo-500"></div>
               </div>
               <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors">
                 <div className="flex items-center gap-4">
                   <Smartphone className="text-slate-500" />
                   <span className="text-sm font-bold">UPI (GPay, PhonePe)</span>
                 </div>
                 <div className="w-4 h-4 rounded-full border-2 border-slate-800"></div>
               </div>
             </div>

             <div className="flex items-center justify-between mb-8">
               <span className="text-slate-400 font-bold uppercase text-[10px]">Total Amount</span>
               <span className="text-2xl font-black">₹999.00</span>
             </div>

             <button 
                onClick={() => {
                  alert("Payment Processing... (Demo)");
                  setProfile(p => ({...p, tier: SubscriptionTier.PRO}));
                  setIsCheckoutOpen(false);
                }}
                className="w-full py-5 bg-indigo-600 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3"
             >
               <ShieldCheck size={18} /> Pay Securely
             </button>
          </div>
        </div>
      )}

      <footer className="py-8 px-12 border-t border-slate-900/50 flex justify-between items-center text-slate-600 text-[10px] font-black uppercase tracking-widest">
        <span>&copy; 2024 Lumina AI Studios</span>
        <div className="flex gap-8">
          <a href="#" className="hover:text-indigo-400 transition-colors">Privacy</a>
          <a href="#" className="hover:text-indigo-400 transition-colors">Terms</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
