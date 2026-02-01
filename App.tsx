import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Videocard from'./components/Videocard.tsx';
import { GeminiVideoService } from './geminiService';
import { db } from './supabaseService';
import { GeneratedVideo, GenerationSettings, SubscriptionTier, UserProfile, AspectRatio, VisualStyle } from './types';
import { 
  Video as VideoIcon, 
  AlertCircle, Loader2, 
  X, Rocket, Globe2, Shield, CreditCard,
  Zap as ZapIcon, ShieldCheck, 
  LogIn, Cloud, Star, Check, Sparkles, Wand2, Plus
} from 'lucide-react';

const STYLES: VisualStyle[] = [
  { id: 'cinematic', name: 'Cinematic', prompt: 'hyper-realistic cinematic, 8k, IMAX lighting, sharp focus, anamorphic lens', image: '🎥' },
  { id: '3danimation', name: '3D Pixar', prompt: 'disney pixar animation style, adorable characters, vivid colors, sub-surface scattering', image: '🐹' },
  { id: 'cyberpunk', name: 'Cyberpunk', prompt: 'futuristic neon city, blade runner aesthetic, rainy atmosphere, deep shadows', image: '🏙️' },
  { id: 'anime', name: 'Studio Ghibli', prompt: 'hand-drawn anime, hayao miyazaki style, soft painterly backgrounds, nostalgic', image: '🎐' },
  { id: 'retro', name: '80s VHS', prompt: 'vhs tape aesthetic, heavy glitches, color bleeding, retro vaporwave', image: '📼' },
  { id: 'watercolor', name: 'Watercolor', prompt: 'ethereal watercolor painting, delicate brushstrokes, flowing ink textures', image: '🎨' },
];

const TEXTS = {
  EN: {
    title: 'Director Suite',
    promptPlaceholder: 'Describe your cinematic vision in detail...',
    actionBtn: 'Generate Masterpiece',
    negativePrompt: 'Exclude from Video',
    motionLabel: 'Camera Motion',
    credits: 'Credits',
    roadmapTitle: 'Publishing Roadmap',
    roadmapDesc: 'Scale your AI Video Production from local to global.',
    footerRights: 'All rights reserved.',
    loginTitle: 'Access Studio',
    loginDesc: 'Sign in to sync your vault and premium credits.',
    pricingTitle: 'Refill Credits',
    pricingDesc: 'Professional fuel for your creative engine.',
    vault: 'Vault',
    refining: 'Director is refining your prompt...',
    wait: 'Synthesis usually takes 60-120 seconds.',
    scriptLabel: 'AI Generated Narration'
  },
  HI: {
    title: 'डायरेक्टर स्टूडियो',
    promptPlaceholder: 'अपने वीडियो का विस्तार से वर्णन करें...',
    actionBtn: 'वीडियो जनरेट करें',
    negativePrompt: 'क्या नहीं चाहिए',
    motionLabel: 'मोशन तीव्रता',
    credits: 'क्रेडिट्स',
    roadmapTitle: 'पब्लिशिंग रोडमैप',
    roadmapDesc: 'अपने एआई वीडियो ऐप को बिजनेस बनाने के चरण।',
    footerRights: 'सर्वाधिकार सुरक्षित।',
    loginTitle: 'लॉगिन करें',
    loginDesc: 'अपने प्रोजेक्ट्स और क्रेडिट्स सिंक करने के लिए लॉगिन करें।',
    pricingTitle: 'क्रेडिट टॉप-अप',
    pricingDesc: 'अपनी रचना को पंख देने के लिए प्लान चुनें।',
    vault: 'वॉल्ट',
    refining: 'डायरेक्टर आपके प्रॉम्प्ट को बेहतर बना रहा है...',
    wait: 'वीडियो बनाने में 1-2 मिनट लग सकते हैं।',
    scriptLabel: 'एआई द्वारा तैयार स्क्रिप्ट'
  }
};

const PRICING_PLANS = [
  { id: 'starter', name: 'Starter', credits: 50, price: '₹499', features: ['720p HD Render', 'Standard Speed', '5-Video Vault'] },
  { id: 'pro', name: 'Pro Studio', credits: 250, price: '₹1,999', features: ['1080p Full HD', 'Priority Synthesis', 'Video Extensions', 'Narration Sync'], popular: true },
  { id: 'studio', name: 'Director', credits: 1000, price: '₹5,999', features: ['Multi-Shot Consistency', 'Commercial Rights', '24/7 Support', 'Style Training'] },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('generate');
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    credits: 100,
    tier: SubscriptionTier.PRO,
    isApiKeySelected: false,
    pinnedReferences: [],
    appLanguage: 'HI'
  });
  
  const t = TEXTS[profile.appLanguage];
  const [library, setLibrary] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [motionIntensity, setMotionIntensity] = useState(5);
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(STYLES[0]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [previousVideo, setPreviousVideo] = useState<any>(null);
  const [generatedScript, setGeneratedScript] = useState('');

  useEffect(() => {
    GeminiVideoService.checkApiKey().then(hasKey => {
      setProfile(prev => ({ ...prev, isApiKeySelected: hasKey }));
    });
    
    db.getUser().then(u => {
      setUser(u);
      loadLibrary(u?.id);
    });
  }, [currentView]);

  const loadLibrary = async (userId?: string) => {
    try {
      const videos = await db.fetchVideos(userId || 'anonymous');
      setLibrary(videos);
    } catch (err) {
      console.error("Failed to load library", err);
    }
  };

  const handleRefine = async () => {
    if (!prompt) return;
    setStatus(t.refining);
    const refined = await GeminiVideoService.refinePrompt(prompt);
    setPrompt(refined);
    setStatus("");
    
    if (!generatedScript) {
      const script = await GeminiVideoService.generateScript(refined, profile.appLanguage === 'EN' ? 'English' : 'Hindi');
      setGeneratedScript(script);
    }
  };

  const handleLogin = async () => {
    const { user: authUser } = await db.signInWithGoogle();
    if (authUser) {
      setUser(authUser);
      setShowLogin(false);
      loadLibrary(authUser.id);
    }
  };

  const handleLogout = async () => {
    await db.signOut();
    setUser(null);
    setLibrary([]);
  };

  const handleKeySelection = async () => {
    await GeminiVideoService.openKeySelection();
    setProfile(prev => ({ ...prev, isApiKeySelected: true }));
  };

  const handleBuyCredits = (credits: number) => {
    setProfile(prev => ({ ...prev, credits: prev.credits + credits }));
    setShowPricing(false);
  };

  const startGeneration = async () => {
    if (!profile.isApiKeySelected) {
      handleKeySelection();
      return;
    }
    if (profile.credits < 10) {
      setShowPricing(true);
      return;
    }
    if (!prompt) {
      setError("Director: We need a scene description to start.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatus("Initializing Synthesis...");

    try {
      const settings: GenerationSettings = {
        prompt,
        negativePrompt,
        motionStrength: motionIntensity,
        aspectRatio,
        resolution: profile.tier === SubscriptionTier.FREE ? '720p' : '1080p',
        style: selectedStyle.prompt,
        previousVideo: previousVideo || undefined,
        narrationScript: generatedScript,
        languageId: profile.appLanguage === 'EN' ? 'English' : 'Hindi'
      };

      const { videoUrl, audioUrl, apiVideoData } = await GeminiVideoService.generateVideo(settings, setStatus);
      
      const newVideo: GeneratedVideo = {
        id: Math.random().toString(36).substr(2, 9),
        prompt,
        url: videoUrl,
        audioUrl,
        createdAt: Date.now(),
        aspectRatio,
        resolution: settings.resolution,
        style: selectedStyle.name,
        apiVideoData
      };

      await db.saveVideo(newVideo, user?.id || 'anonymous');
      setLibrary(prev => [newVideo, ...prev]);
      setProfile(prev => ({ ...prev, credits: prev.credits - 10 }));
      
      setPreviousVideo(null);
      setGeneratedScript('');
      setCurrentView('library');
    } catch (err: any) {
      if (err.message === 'API_KEY_ERROR') {
        setError("AI Engine: Identity verification failed. Re-selecting API Key.");
        handleKeySelection();
      } else {
        setError(err.message || "Synthesis Interrupted.");
      }
    } finally {
      setIsGenerating(false);
      setStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-[#06080f] text-white selection:bg-indigo-500/30 flex flex-col">
      <Navbar 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        credits={profile.credits} 
        t={t}
        user={user}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
        onBuyCredits={() => setShowPricing(true)}
      />

      <div className="fixed bottom-10 right-10 z-[60]">
        <button 
          onClick={() => setProfile(p => ({ ...p, appLanguage: p.appLanguage === 'EN' ? 'HI' : 'EN' }))}
          className="bg-indigo-600 border border-indigo-400/50 p-4 rounded-full shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:scale-110 transition-all flex items-center justify-center group"
        >
          <Globe2 size={24} className="text-white group-hover:rotate-12 transition-transform" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 transition-all text-sm font-black uppercase tracking-widest whitespace-nowrap">
            {profile.appLanguage === 'EN' ? 'HINDI' : 'ENGLISH'}
          </span>
        </button>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-6 py-12 w-full">
        {currentView === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-slate-900/40 backdrop-blur-3xl border border-slate-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Wand2 className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">{t.title}</h3>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">AI Powered Cinematography</p>
                    </div>
                  </div>
                  {status && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 px-6 py-2 rounded-full text-indigo-400 text-xs font-black animate-pulse flex items-center gap-3">
                      <Loader2 size={12} className="animate-spin" /> {status}
                    </div>
                  )}
                </div>

                <div className="relative mb-8">
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t.promptPlaceholder}
                    className="w-full h-48 bg-slate-950/80 border border-slate-800 rounded-3xl p-8 text-xl focus:border-indigo-500 outline-none transition-all resize-none shadow-inner font-medium placeholder:text-slate-700"
                  />
                  <button 
                    onClick={handleRefine}
                    className="absolute bottom-6 right-6 p-4 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-2xl transition-all flex items-center gap-2 text-xs font-black border border-indigo-600/20"
                  >
                    <Sparkles size={16} /> REFINE
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                      <X size={12} /> {t.negativePrompt}
                    </label>
                    <input 
                      type="text" 
                      value={negativePrompt} 
                      onChange={(e) => setNegativePrompt(e.target.value)} 
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-sm font-bold focus:border-indigo-500 outline-none" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center justify-between">
                      <span>{t.motionLabel}</span>
                      <span className="text-indigo-400">{motionIntensity}/10</span>
                    </label>
                    <div className="relative pt-2">
                      <input 
                        type="range" min="1" max="10" 
                        value={motionIntensity} 
                        onChange={(e) => setMotionIntensity(parseInt(e.target.value))} 
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                      />
                    </div>
                  </div>
                </div>

                {generatedScript && (
                  <div className="mb-8">
                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-6">
                      <label className="text-[10px] font-black uppercase text-indigo-400 mb-3 block tracking-widest">{t.scriptLabel}</label>
                      <textarea 
                         value={generatedScript}
                         onChange={(e) => setGeneratedScript(e.target.value)}
                         className="w-full bg-transparent text-slate-300 text-sm font-medium leading-relaxed italic outline-none h-24 resize-none"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400 text-sm font-bold">
                    <AlertCircle size={20} /> {error}
                  </div>
                )}
              </div>

              <div className="bg-slate-900/20 border border-slate-800/50 rounded-[2.5rem] p-8">
                <h4 className="text-[10px] font-black uppercase text-slate-500 mb-6 tracking-[0.3em]">Cinematic Style Presets</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {STYLES.map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => setSelectedStyle(s)} 
                      className={`group relative p-6 rounded-3xl border transition-all flex flex-col items-center gap-3 ${selectedStyle.id === s.id ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'}`}
                    >
                      <span className="text-3xl group-hover:scale-125 transition-transform">{s.image}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <div className="bg-slate-900/40 backdrop-blur-3xl border border-slate-800 rounded-[3rem] p-10 shadow-2xl">
                <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-4 block tracking-widest">Aspect Ratio</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['16:9', '9:16', '1:1'].map(ratio => (
                        <button 
                          key={ratio} 
                          onClick={() => setAspectRatio(ratio as AspectRatio)} 
                          className={`py-4 rounded-2xl border text-xs font-black transition-all ${aspectRatio === ratio ? 'bg-indigo-600 border-indigo-400 shadow-lg' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'}`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-slate-950/50 rounded-3xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Resolution</p>
                      <p className="text-sm font-black text-white">{profile.tier === SubscriptionTier.FREE ? '720p HD' : '1080p Full HD'}</p>
                    </div>
                    {profile.tier === SubscriptionTier.PRO ? (
                      <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><Star size={16} /></div>
                    ) : (
                      <button onClick={() => setShowPricing(true)} className="text-[9px] font-black bg-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-500 transition-all uppercase">Upgrade</button>
                    )}
                  </div>

                  <button 
                    onClick={startGeneration} 
                    disabled={isGenerating} 
                    className="group relative w-full py-8 bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-700 rounded-[2rem] font-black text-xl shadow-[0_20px_50px_rgba(99,102,241,0.3)] flex flex-col items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] transition-all overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-3 relative z-10 text-white">
                      {isGenerating ? <Loader2 className="animate-spin" /> : <ZapIcon className="fill-current" />}
                      <span>{isGenerating ? 'Synthesizing...' : t.actionBtn}</span>
                    </div>
                    <span className="text-[9px] uppercase tracking-[0.4em] opacity-60 font-black relative z-10 text-white">Consumes 10 Credits</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'library' && (
          <div className="space-y-12 w-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-5xl font-black uppercase tracking-tighter mb-2">{t.vault}</h2>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Your Private Collection • {library.length} Sequences</p>
              </div>
              <button 
                onClick={() => setCurrentView('generate')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-3xl font-black text-sm transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3"
              >
                <Plus size={18} /> CREATE NEW
              </button>
            </div>

            {library.length === 0 ? (
              <div className="py-60 border-2 border-dashed border-slate-800 rounded-[4rem] flex flex-col items-center justify-center gap-6">
                <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center text-slate-800">
                  <VideoIcon size={48} />
                </div>
                <div className="text-center">
                  <p className="text-slate-500 text-xl font-black uppercase tracking-tighter mb-2">The Vault is Empty</p>
                  <p className="text-slate-600 text-sm font-medium">Start your first production in the Studio.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {library.map(video => (
                  <VideoCard 
                    key={video.id} 
                    video={video} 
                    onDelete={(id) => setLibrary(library.filter(v => v.id !== id))}
                    onExtend={(v) => {
                      setPrompt(v.prompt);
                      setAspectRatio(v.aspectRatio);
                      setPreviousVideo(v.apiVideoData);
                      setCurrentView('generate');
                    }} 
                    onPinReference={(url) => alert("Reference pinned!")} 
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showPricing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-black/80">
          <div className="bg-slate-950 border border-white/10 w-full max-w-6xl rounded-[4rem] p-12 relative overflow-hidden shadow-[0_0_100px_rgba(99,102,241,0.2)]">
            <button onClick={() => setShowPricing(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white transition-colors"><X size={32} /></button>
            <div className="text-center mb-16">
              <h3 className="text-5xl font-black mb-4 uppercase tracking-tighter">{t.pricingTitle}</h3>
              <p className="text-slate-400 text-lg font-medium">{t.pricingDesc}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {PRICING_PLANS.map(plan => (
                <div key={plan.id} className={`p-10 rounded-[3rem] border-2 relative flex flex-col transition-all hover:scale-[1.02] ${plan.popular ? 'bg-indigo-600/5 border-indigo-500/50 shadow-2xl' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}>
                  {plan.popular && <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-black px-6 py-2 rounded-full tracking-[0.2em]">MOST POPULAR</span>}
                  <h4 className="text-2xl font-black mb-1 uppercase tracking-tighter">{plan.name}</h4>
                  <div className="flex items-baseline gap-2 mb-8 mt-2">
                    <span className="text-5xl font-black">{plan.price}</span>
                  </div>
                  <div className="bg-white/5 p-6 rounded-3xl text-center mb-10 border border-white/5">
                    <p className="text-3xl font-black text-indigo-400 mb-1">{plan.credits}</p>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Credits</p>
                  </div>
                  <ul className="space-y-5 mb-12 flex-grow">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-4 text-sm font-bold text-slate-300">
                        <Check size={12} className="text-indigo-400" /> {f}
                      </li>
                    ))}
                  </ul>
                  <button 
                    onClick={() => handleBuyCredits(plan.credits)} 
                    className={`w-full py-5 rounded-2xl font-black text-sm transition-all ${plan.popular ? 'bg-indigo-600 text-white' : 'bg-white text-black'}`}
                  >
                    SELECT PLAN
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-black/80">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[4rem] p-12 relative shadow-2xl">
            <button onClick={() => setShowLogin(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white"><X size={32} /></button>
            <div className="text-center mb-12">
              <div className="w-24 h-24 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 text-indigo-400 border border-indigo-500/20 shadow-inner">
                <ShieldCheck size={48} />
              </div>
              <h3 className="text-4xl font-black mb-3 uppercase tracking-tighter">{t.loginTitle}</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">{t.loginDesc}</p>
            </div>
            <button 
              onClick={handleLogin} 
              className="w-full py-6 bg-white text-black hover:bg-slate-100 rounded-3xl font-black text-sm flex items-center justify-center gap-4 transition-all shadow-xl"
            >
              <LogIn size={20} /> CONTINUE WITH GOOGLE
            </button>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-900 bg-[#06080f] py-20 px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 font-black text-2xl tracking-tighter uppercase">
               LUMINA <span className="text-indigo-500">PRO</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-700 font-black uppercase tracking-widest">© 2024 Lumina Engineering. {t.footerRights}</div>
        </div>
      </footer>
    </div>
  );
};

export default App;
