
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import VideoCard from './components/VideoCard';
import { GeminiVideoService } from './geminiService';
import { db } from './supabaseService';
import { GeneratedVideo, GenerationSettings, SubscriptionTier, UserProfile, AspectRatio, Resolution, VisualStyle, VoiceOption, LanguageOption, ChatMessage } from './types';
import { 
  Plus, Sparkles, Image as ImageIcon, Video as VideoIcon, 
  Settings2, Loader2, AlertCircle, CheckCircle2, 
  Wand2, X, Music, User, Play, PlayCircle, Layers,
  CloudSun, Moon, Zap, Waves, Wind, Sun, Upload, Trash,
  ArrowRight, Smile, Move, Timer, ShieldCheck, Eye, CreditCard,
  RotateCcw, RotateCw, Camera, Activity, Sliders, ChevronDown, Check,
  Volume2, Mic, Bot, Frame, ImagePlus, Globe, Star, Zap as ZapIcon,
  ShieldAlert, BarChart3, TrendingUp, PiggyBank, MessageSquare, Send,
  HelpCircle, ExternalLink, Key, Rocket, Globe2, Shield, Share2, FileText, Lock,
  LogIn, LogOut, Cloud
} from 'lucide-react';

const STYLES: VisualStyle[] = [
  { id: 'cinematic', name: 'Cinematic', prompt: 'hyper-realistic, 8k, movie lighting, masterpiece', image: '🎥' },
  { id: '3danimation', name: '3D Studio', prompt: 'high-end 3D animation, raytraced, octanerender style', image: '🐹' },
  { id: 'cyberpunk', name: 'Cyberpunk', prompt: 'neon-drenched, futuristic city, rainy night, high contrast', image: '🏙️' },
  { id: 'anime', name: 'Hand-Drawn', prompt: 'studio ghibli aesthetic, detailed anime, lush backgrounds', image: '🎐' },
  { id: 'retro', name: 'Retro VHS', prompt: '80s aesthetic, vhs glitches, nostalgic synthwave', image: '📼' },
  { id: 'watercolor', name: 'Watercolor', prompt: 'ethereal watercolor painting, flowing pigments', image: '🎨' },
];

const TEXTS = {
  EN: {
    title: 'Production Studio',
    promptPlaceholder: 'Describe your scene in cinematic detail...',
    actionBtn: 'Generate Video',
    negativePrompt: 'Negative Prompt',
    motionLabel: 'Motion Intensity',
    setupTitle: 'Unlock Lumina AI Pro',
    setupSubtitle: 'Link your Gemini API key to start creating.',
    credits: 'Credits',
    getPro: 'Upgrade to Pro',
    roadmapTitle: 'Publishing Roadmap',
    roadmapDesc: 'Steps to take your AI app from prototype to global business.',
    privacyTitle: 'Privacy Policy',
    termsTitle: 'Terms of Service',
    footerRights: 'All rights reserved.',
    loginTitle: 'Sign in to Lumina',
    loginDesc: 'Sync your projects to Supabase Cloud.'
  },
  HI: {
    title: 'प्रोडक्शन स्टूडियो',
    promptPlaceholder: 'अपने सीन का विस्तार से वर्णन करें...',
    actionBtn: 'वीडियो बनाएं',
    negativePrompt: 'नेगेटिव प्रॉम्प्ट',
    motionLabel: 'मोशन की तीव्रता',
    setupTitle: 'लुमिना AI अनलॉक करें',
    setupSubtitle: 'क्रिएट करने के लिए अपनी Gemini API की लिंक करें।',
    credits: 'क्रेडिट्स',
    getPro: 'प्रो प्लान लें',
    roadmapTitle: 'पब्लिशिंग रोडमैप',
    roadmapDesc: 'अपने AI ऐप को प्रोटोटाइप से ग्लोबल बिजनेस बनाने के स्टेप्स।',
    privacyTitle: 'गोपनीयता नीति',
    termsTitle: 'सेवा की शर्तें',
    footerRights: 'सर्वाधिकार सुरक्षित।',
    loginTitle: 'लुमिना में साइन इन करें',
    loginDesc: 'अपने प्रोजेक्ट्स को Supabase क्लाउड पर सिंक करें।'
  }
};

const ROADMAP_STEPS = [
  { id: 1, title: 'Deploy to Vercel', icon: Rocket, desc: 'Connect GitHub and make your site live on the web.', status: 'Pending' },
  { id: 2, title: 'Custom Domain', icon: Globe2, desc: 'Link a professional domain like .com or .ai.', status: 'Pending' },
  { id: 3, title: 'Setup Supabase', icon: Cloud, desc: 'Already Integrated! Just add your project keys.', status: 'DONE' },
  { id: 4, title: 'Setup Payments', icon: CreditCard, desc: 'Integrate Razorpay or Stripe for real revenue.', status: 'Pending' },
  { id: 5, title: 'Legal & Privacy', icon: Shield, desc: 'Add AI generated content disclaimer and policies.', status: 'DONE' },
];

const LEGAL_CONTENT = {
  EN: {
    privacy: [
      { h: "Information We Collect", p: "We do not store your personal video prompts on our servers unless you choose to save them to your account. Your Gemini API key is stored locally in your browser context." },
      { h: "Database Integration", p: "We use Supabase for secure data hosting. All sensitive metadata is encrypted." }
    ],
    terms: [
      { h: "Content Ownership", p: "You retain ownership of the prompts and the final videos generated, subject to Google Gemini's terms." }
    ]
  },
  HI: {
    privacy: [
      { h: "जानकारी जो हम एकत्र करते हैं", p: "हम आपके वीडियो प्रॉम्प्ट को अपने सर्वर पर तब तक स्टोर नहीं करते जब तक आप उन्हें अपने खाते में सहेजने का विकल्प नहीं चुनते।" }
    ],
    terms: [
      { h: "सामग्री का स्वामित्व", p: "आप प्रॉम्प्ट और जेनरेट किए गए अंतिम वीडियो के स्वामित्व को बरकरार रखते हैं।" }
    ]
  }
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('generate');
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    credits: 100,
    tier: SubscriptionTier.PRO,
    isApiKeySelected: false,
    pinnedReferences: [],
    appLanguage: 'HI'
  });
  
  const t = TEXTS[profile.appLanguage];
  const l = LEGAL_CONTENT[profile.appLanguage];
  const [library, setLibrary] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Generator State
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [motionIntensity, setMotionIntensity] = useState(5);
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(STYLES[0]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');

  useEffect(() => {
    // Initial Auth and Key checks
    GeminiVideoService.checkApiKey().then(hasKey => {
      setProfile(prev => ({ ...prev, isApiKeySelected: hasKey }));
    });
    
    db.getUser().then(u => {
      setUser(u);
      loadLibrary(u?.id);
    });

    window.scrollTo(0, 0);
  }, [currentView]);

  const loadLibrary = async (userId?: string) => {
    try {
      const videos = await db.fetchVideos(userId || 'anonymous');
      setLibrary(videos);
    } catch (err) {
      console.error("Failed to load library", err);
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
    setLibrary(JSON.parse(localStorage.getItem('lumina_library') || '[]'));
  };

  const handleKeySelection = async () => {
    await GeminiVideoService.openKeySelection();
    setProfile(prev => ({ ...prev, isApiKeySelected: true }));
  };

  const startGeneration = async () => {
    if (!profile.isApiKeySelected) {
      handleKeySelection();
      return;
    }
    if (!prompt) {
      setError("Please describe your scene.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatus("Processing parameters...");

    try {
      const settings: GenerationSettings = {
        prompt,
        negativePrompt,
        motionStrength: motionIntensity,
        aspectRatio,
        resolution: '720p',
        style: selectedStyle.prompt,
      };

      const { videoUrl, audioUrl, apiVideoData } = await GeminiVideoService.generateVideo(settings, setStatus);
      
      const newVideo: GeneratedVideo = {
        id: Math.random().toString(36).substr(2, 9),
        prompt,
        url: videoUrl,
        audioUrl,
        createdAt: Date.now(),
        aspectRatio,
        resolution: '720p',
        style: selectedStyle.name,
        apiVideoData
      };

      await db.saveVideo(newVideo, user?.id || 'anonymous');
      setLibrary(prev => [newVideo, ...prev]);
      setProfile(prev => ({ ...prev, credits: prev.credits - 10 }));
      if (user) await db.updateCredits(user.id, profile.credits - 10);
      
      setCurrentView('library');
    } catch (err: any) {
      setError(err.message || "Synthesis error.");
    } finally {
      setIsGenerating(false);
      setStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-[#080c16] text-white relative font-sans flex flex-col">
      <Navbar 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        credits={profile.credits} 
        t={t}
        user={user}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
      />

      {/* Floating Controls */}
      <div className="fixed top-24 right-6 z-[60] flex flex-col gap-2">
        <button 
          onClick={() => setProfile(p => ({ ...p, appLanguage: p.appLanguage === 'EN' ? 'HI' : 'EN' }))}
          className="bg-slate-800/80 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-slate-700 transition-all shadow-xl"
        >
          <Globe size={14} className="text-indigo-400" />
          {profile.appLanguage === 'EN' ? 'HINDI' : 'ENGLISH'}
        </button>
        <button 
          onClick={() => setCurrentView('roadmap')}
          className="bg-indigo-600/80 backdrop-blur-md border border-indigo-500 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-xl"
        >
          <Rocket size={14} />
          Launchpad
        </button>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-6 py-12 w-full">
        {currentView === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-xl">
                 <h3 className="text-2xl font-bold mb-6 flex items-center gap-3"><VideoIcon className="text-indigo-400" /> {t.title}</h3>
                 <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t.promptPlaceholder}
                    className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-6 text-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                 />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-500">{t.negativePrompt}</label>
                       <input type="text" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm outline-none" placeholder="Exclude keywords..." />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-500">{t.motionLabel}: {motionIntensity}</label>
                       <input type="range" min="1" max="10" value={motionIntensity} onChange={(e) => setMotionIntensity(parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    </div>
                 </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8">
                 <h4 className="text-xs font-black uppercase text-slate-500 mb-6">Visual Style</h4>
                 <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {STYLES.map(s => (
                      <button key={s.id} onClick={() => setSelectedStyle(s)} className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${selectedStyle.id === s.id ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}>
                         <span className="text-2xl">{s.image}</span>
                         <span className="text-[8px] font-black uppercase">{s.name}</span>
                      </button>
                    ))}
                 </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
               <div className="bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-xl h-fit">
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-4 block">Finalize Output</label>
                  <div className="space-y-6">
                     <div className="flex gap-2">
                        {['16:9', '9:16', '1:1'].map(ratio => (
                          <button key={ratio} onClick={() => setAspectRatio(ratio as AspectRatio)} className={`flex-grow py-3 rounded-xl border text-xs font-bold transition-all ${aspectRatio === ratio ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-950 border-slate-800'}`}>
                            {ratio}
                          </button>
                        ))}
                     </div>
                     <button onClick={startGeneration} disabled={isGenerating} className="w-full py-6 bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 rounded-3xl font-black text-xl shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                        {isGenerating ? <Loader2 className="animate-spin" /> : <ZapIcon className="fill-current" />}
                        {isGenerating ? 'Synthesizing...' : t.actionBtn}
                     </button>
                     {isGenerating && (
                       <div className="text-center space-y-2">
                          <p className="text-[10px] font-black uppercase text-indigo-400 animate-pulse">{status}</p>
                          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-indigo-500 w-1/2 animate-shimmer"></div>
                          </div>
                       </div>
                     )}
                  </div>
               </div>
            </div>
          </div>
        )}

        {currentView === 'roadmap' && (
          <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom duration-500">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black mb-4">{t.roadmapTitle}</h2>
              <p className="text-slate-400 text-lg">{t.roadmapDesc}</p>
            </div>
            <div className="space-y-6">
              {ROADMAP_STEPS.map((step) => (
                <div key={step.id} className="bg-slate-900/60 border border-slate-800 p-8 rounded-[2.5rem] flex items-center gap-8 group hover:border-indigo-500/50 transition-all">
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all ${step.status === 'DONE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-600/10 text-indigo-400'}`}>
                    <step.icon size={32} />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-black text-indigo-500">STEP 0{step.id}</span>
                      <h3 className="text-xl font-bold">{step.title}</h3>
                    </div>
                    <p className="text-slate-400">{step.desc}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-xs font-bold ${step.status === 'DONE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                    {step.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(currentView === 'privacy' || currentView === 'terms') && (
           <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom duration-500 py-10">
              <div className="bg-slate-900/60 border border-slate-800 p-12 rounded-[3rem] backdrop-blur-xl">
                 <div className="flex items-center gap-4 mb-10">
                    <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400">
                       {currentView === 'privacy' ? <Lock size={28} /> : <FileText size={28} />}
                    </div>
                    <h2 className="text-4xl font-black">{currentView === 'privacy' ? t.privacyTitle : t.termsTitle}</h2>
                 </div>
                 
                 <div className="space-y-12">
                    {(currentView === 'privacy' ? l.privacy : l.terms).map((section: any, idx: number) => (
                       <div key={idx} className="space-y-4">
                          <h3 className="text-xl font-bold text-indigo-400">{section.h}</h3>
                          <p className="text-slate-400 leading-relaxed text-lg">{section.p}</p>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {currentView === 'library' && (
           <div className="animate-in slide-in-from-bottom duration-700">
             <div className="flex items-center justify-between mb-12">
               <h2 className="text-4xl font-black">Project <span className="gradient-text italic">Vault</span></h2>
               {user ? (
                 <div className="flex items-center gap-2 bg-indigo-600/10 px-4 py-2 rounded-full border border-indigo-500/20">
                   <Cloud size={16} className="text-indigo-400" />
                   <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Cloud Synced</span>
                 </div>
               ) : (
                 <button onClick={() => setShowLogin(true)} className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2">
                   <Upload size={14} /> Link Account to Sync
                 </button>
               )}
             </div>
             {library.length === 0 ? (
               <div className="text-center py-40 border-2 border-dashed border-slate-800 rounded-[3rem]">
                  <VideoIcon size={60} className="mx-auto text-slate-800 mb-6" />
                  <p className="text-slate-500 font-medium">No projects in your vault yet.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {library.map(video => (
                    <VideoCard 
                      key={video.id} 
                      video={video} 
                      onDelete={(id) => setLibrary(library.filter(v => v.id !== id))}
                      onExtend={() => {}} 
                      onPinReference={() => {}} 
                    />
                  ))}
               </div>
             )}
           </div>
        )}
      </main>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[3rem] p-10 relative overflow-hidden animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowLogin(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X size={24} /></button>
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-indigo-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-400">
                <ShieldCheck size={40} />
              </div>
              <h3 className="text-3xl font-black mb-2">{t.loginTitle}</h3>
              <p className="text-slate-400 text-sm">{t.loginDesc}</p>
            </div>
            
            <button onClick={handleLogin} className="w-full py-5 bg-white text-black rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all">
              <LogIn size={20} /> CONTINUE WITH GOOGLE
            </button>
            
            <p className="mt-8 text-[10px] text-slate-600 text-center uppercase tracking-widest">
              By continuing, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-800 bg-[#080c16] py-12 px-6 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Play className="text-white w-4 h-4 fill-current" />
            </div>
            <span className="font-black tracking-tighter">LUMINA AI VIDEO PRO</span>
          </div>
          
          <div className="flex items-center gap-8 text-xs font-bold text-slate-500">
            <button onClick={() => setCurrentView('privacy')} className="hover:text-indigo-400 transition-colors uppercase tracking-widest">{t.privacyTitle}</button>
            <button onClick={() => setCurrentView('terms')} className="hover:text-indigo-400 transition-colors uppercase tracking-widest">{t.termsTitle}</button>
            <button onClick={() => setCurrentView('roadmap')} className="hover:text-indigo-400 transition-colors uppercase tracking-widest">Roadmap</button>
          </div>
          
          <div className="text-[10px] text-slate-600 font-medium uppercase tracking-widest">
            © {new Date().getFullYear()} Lumina. {t.footerRights}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
