
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import VideoCard from './components/VideoCard';
import { GeminiVideoService } from './geminiService';
import   supabase  from './supabaseService';
import { GeneratedVideo, GenerationSettings, SubscriptionTier, UserProfile, AspectRatio, VisualStyle } from './types';
import { 
  Video as VideoIcon, 
  AlertCircle, Loader2, 
  Zap as ZapIcon, 
  Check, Key, Info, Download, Activity
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

  const isEnvKeySet = !!(process.env.API_KEY && process.env.API_KEY !== '' && process.env.API_KEY !== 'undefined');

  useEffect(() => {
    const init = async () => {
      try {
        const u = await supabase.getUser();
        if (u) {
          setUser(u);
          const videos = await supabase.fetchVideos(u.id);
          setLibrary(videos || []);
        } else {
          const videos = await supabase.fetchVideos('anonymous');
          setLibrary(videos || []);
        }
        
        const hasKey = await GeminiVideoService.checkApiKey();
        setProfile(prev => ({ ...prev, isApiKeySelected: hasKey }));
      } catch (err) {
        console.error("Init error:", err);
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
        const videos = await supabase.fetchVideos(newUser.id);
        setLibrary(videos || []);
      }
    } catch (err) {
      setError("Login failed. Using local storage.");
    }
  };

  const startGeneration = async () => {
    // Force key selection if not available and no env key
    if (!profile.isApiKeySelected && !isEnvKeySet) {
      await GeminiVideoService.openKeySelection();
      setProfile(prev => ({ ...prev, isApiKeySelected: true }));
      // Assume success after opening dialog as per instructions
      return;
    }
    
    if (!prompt.trim()) {
      setError("Please describe what you want to create.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const settings: GenerationSettings = {
        prompt,
        aspectRatio,
        resolution: profile.tier === SubscriptionTier.FREE ? '720p' : '1080p',
        style: selectedStyle.prompt
      };
      
      const { videoUrl, apiVideoData } = await GeminiVideoService.generateVideo(settings, setStatus);
      const newVideo: GeneratedVideo = {
        id: Math.random().toString(36).substr(2, 9),
        prompt,
        url: videoUrl,
        createdAt: Date.now(),
        aspectRatio,
        resolution: settings.resolution,
        apiVideoData
      };
      
      await supabase.saveVideo(newVideo, user?.id || 'anonymous');
      setLibrary(prev => [newVideo, ...prev]);
      setCurrentView('library');
    } catch (err: any) {
      console.error("Generation error:", err);
      // Specific handling for Veo requested entity not found / invalid key
      if (err.message.includes("Requested entity was not found") || err.message === 'API_KEY_ERROR') {
        setError("Your selected API Key is invalid or has no billing. Please select a paid key.");
        setProfile(prev => ({ ...prev, isApiKeySelected: false }));
        await GeminiVideoService.openKeySelection();
      } else {
        setError(err.message || "Failed to generate video.");
      }
    } finally {
      setIsGenerating(false);
      setStatus("");
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-[#06080f] flex flex-col items-center justify-center gap-4">
        <Loader2 className="text-indigo-500 animate-spin" size={32} />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lumina Neural Engine...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06080f] text-white flex flex-col selection:bg-indigo-500/30">
      <Navbar 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        credits={profile.credits} 
        t={{}}
        user={user}
        onLoginClick={handleLogin}
        onLogout={() => { supabase.signOut(); setUser(null); }}
        onBuyCredits={() => setCurrentView('pricing')}
      />

      <main className="flex-grow max-w-6xl mx-auto px-6 py-12 w-full">
        {currentView === 'generate' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="bg-slate-900/40 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <VideoIcon className="text-indigo-500" size={28} />
                  <h2 className="text-3xl font-black uppercase tracking-tighter">AI Director Studio</h2>
                </div>
                {!profile.isApiKeySelected && !isEnvKeySet && (
                   <button 
                    onClick={async () => {
                      await GeminiVideoService.openKeySelection();
                      setProfile(p => ({ ...p, isApiKeySelected: true }));
                    }}
                    className="flex items-center gap-2 text-[10px] font-black bg-indigo-600 px-4 py-1.5 rounded-full uppercase hover:bg-indigo-500 transition-colors"
                   >
                     <Key size={12} /> Connect Key
                   </button>
                )}
              </div>

              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your cinematic masterpiece..."
                className="w-full h-56 bg-slate-950/80 border border-slate-800 rounded-[2.5rem] p-8 text-xl focus:border-indigo-500 outline-none resize-none mb-8 transition-all placeholder:text-slate-800"
              />

              {error && (
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl text-red-400 text-sm font-bold mb-8 flex items-center gap-4">
                  <AlertCircle size={20} /> {error}
                </div>
              )}

              <button 
                onClick={startGeneration}
                disabled={isGenerating}
                className="w-full py-8 bg-indigo-600 hover:bg-indigo-500 rounded-[2rem] font-black text-2xl shadow-2xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-4 disabled:opacity-50 active:scale-95"
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : <ZapIcon className="fill-current" />}
                <span>{isGenerating ? status || 'Synthesizing...' : 'Generate Video'}</span>
              </button>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {STYLES.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => setSelectedStyle(s)}
                  className={`px-8 py-5 rounded-[2rem] border transition-all flex items-center gap-4 ${selectedStyle.id === s.id ? 'bg-indigo-600 border-indigo-400 scale-105 shadow-xl' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                >
                  <span className="text-3xl">{s.image}</span>
                  <span className="text-xs font-black uppercase tracking-widest">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentView === 'library' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <h2 className="text-4xl font-black uppercase tracking-tighter">My Productions</h2>
            {library.length === 0 ? (
              <div className="py-40 flex flex-col items-center justify-center gap-6 text-slate-800 border-2 border-dashed border-slate-800 rounded-[4rem]">
                <VideoIcon size={64} className="opacity-20" />
                <p className="font-black uppercase tracking-[0.3em] text-[10px]">Vault is empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {library.map(video => (
                  <VideoCard key={video.id} video={video} onDelete={(id) => setLibrary(prev => prev.filter(v => v.id !== id))} onExtend={() => {}} onPinReference={() => {}} />
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === 'pricing' && (
          <div className="max-w-4xl mx-auto py-12 text-center animate-in slide-in-from-bottom duration-500">
            <h2 className="text-6xl font-black uppercase tracking-tighter mb-16">The <span className="text-indigo-500">Studio</span> Pass</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="bg-slate-900 border border-slate-800 p-12 rounded-[4rem] space-y-8">
                <h3 className="text-3xl font-black uppercase tracking-widest">Creator</h3>
                <div className="text-5xl font-black">₹0</div>
                <button className="w-full py-5 bg-slate-800 rounded-3xl font-black uppercase tracking-widest text-xs">Current Plan</button>
              </div>
              <div className="bg-indigo-600 p-12 rounded-[4rem] space-y-8 shadow-2xl shadow-indigo-600/30">
                <h3 className="text-3xl font-black uppercase tracking-widest">Director</h3>
                <div className="text-5xl font-black">₹999</div>
                <button className="w-full py-5 bg-white text-indigo-600 rounded-3xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform">Unlock All</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-8 px-12 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-6 opacity-40 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3">
          <Activity size={12} className="text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-widest">Neural Link: Online</span>
        </div>
        <div className="flex gap-10">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] font-black uppercase tracking-widest hover:text-indigo-400">Billing Info</a>
          <span className="text-[10px] font-black uppercase tracking-widest">Lumina v1.3.0</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
