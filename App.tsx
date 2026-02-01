import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import VideoCard from './components/VideoCard';
import { GeminiVideoService } from './geminiService';
import { db } from './supabaseService';
import { GeneratedVideo, GenerationSettings, SubscriptionTier, UserProfile, AspectRatio, VisualStyle } from './types';
import { 
  Video as VideoIcon, 
  AlertCircle, Loader2, 
  X, Rocket, Globe2, Shield, CreditCard,
  Zap as ZapIcon, ShieldCheck, Lock, FileText,
  LogIn, Cloud, Star, Check, ArrowRight
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
    loginDesc: 'Sync your projects to Supabase Cloud.',
    pricingTitle: 'Refill Credits',
    pricingDesc: 'Choose a package to fuel your creativity.'
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
    loginDesc: 'अपने प्रोजेक्ट्स को Supabase क्लाउड पर सिंक करें।',
    pricingTitle: 'क्रेडिट टॉप-अप',
    pricingDesc: 'अपनी रचनात्मकता को ईंधन देने के लिए एक पैकेज चुनें।'
  }
};

const ROADMAP_STEPS = [
  { id: 1, title: 'Deploy to Vercel', icon: Rocket, desc: 'Connect GitHub and make your site live on the web.', status: 'DONE' },
  { id: 2, title: 'Custom Domain', icon: Globe2, desc: 'Link a professional domain like .com or .ai.', status: 'Pending' },
  { id: 3, title: 'Setup Supabase', icon: Cloud, desc: 'Already Integrated! Just add your project keys.', status: 'DONE' },
  { id: 4, title: 'Setup Payments', icon: CreditCard, desc: 'Integrate Razorpay or Stripe for real revenue.', status: 'Pending' },
  { id: 5, title: 'Legal & Privacy', icon: Shield, desc: 'Add AI generated content disclaimer and policies.', status: 'DONE' },
];

const PRICING_PLANS = [
  { id: 'starter', name: 'Starter', credits: 50, price: '₹499', features: ['720p Resolution', 'Standard Support'] },
  { id: 'pro', name: 'Pro Studio', credits: 250, price: '₹1,999', features: ['1080p Access', 'Video Extensions', 'Priority Queue'], popular: true },
  { id: 'studio', name: 'Director', credits: 1000, price: '₹6,499', features: ['Custom Style Seeds', 'API Access', 'Enterprise Rights'] },
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

  // Generator State
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [motionIntensity, setMotionIntensity] = useState(5);
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(STYLES[0]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [previousVideo, setPreviousVideo] = useState<any>(null);

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
    alert(`Success! ${credits} credits added to your account.`);
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
        previousVideo: previousVideo || undefined
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
      
      setPreviousVideo(null);
      setCurrentView('library');
    } catch (err: any) {
      if (err.message === 'API_KEY_ERROR') {
        setError("Your API key session expired. Please re-select a paid project key.");
        handleKeySelection();
      } else {
        setError(err.message || "Synthesis error.");
      }
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
        onBuyCredits={() => setShowPricing(true)}
      />

      <div className="fixed top-24 right-6 z-[60] flex flex-col gap-2">
        <button 
          onClick={() => setProfile(p => ({ ...p, appLanguage: p.appLanguage === 'EN' ? 'HI' : 'EN' }))}
          className="bg-slate-800/80 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-slate-700 transition-all shadow-xl"
        >
          <Globe2 size={14} className="text-indigo-400" />
          {profile.appLanguage === 'EN' ? 'HINDI' : 'ENGLISH'}
        </button>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-6 py-12 w-full">
        {currentView === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-xl">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold flex items-center gap-3"><VideoIcon className="text-indigo-400" /> {t.title}</h3>
                    {status && <div className="text-indigo-400 text-xs animate-pulse font-bold">{status}</div>}
                 </div>
                 <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t.promptPlaceholder}
                    className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-6 text-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                 />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-500">{t.negativePrompt}</label>
                       <input type="text" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm outline-none" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-500">{t.motionLabel}: {motionIntensity}</label>
                       <input type="range" min="1" max="10" value={motionIntensity} onChange={(e) => setMotionIntensity(parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                    </div>
                 </div>
                 {error && (
                   <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                      <AlertCircle size={18} /> {error}
                   </div>
                 )}
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
               <div className="bg-slate-900/60 border border-slate-800 rounded-[2.5rem] p-8 backdrop-blur-xl">
                  <div className="space-y-6">
                     <div className="flex gap-2">
                        {['16:9', '9:16', '1:1'].map(ratio => (
                          <button key={ratio} onClick={() => setAspectRatio(ratio as AspectRatio)} className={`flex-grow py-3 rounded-xl border text-xs font-bold transition-all ${aspectRatio === ratio ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-950 border-slate-800'}`}>
                            {ratio}
                          </button>
                        ))}
                     </div>
                     <button onClick={startGeneration} disabled={isGenerating} className="w-full py-6 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 transition-all">
                        {isGenerating ? <Loader2 className="animate-spin" /> : <ZapIcon className="fill-current" />}
                        {isGenerating ? 'Synthesizing...' : t.actionBtn}
                     </button>
                  </div>
               </div>
               
               <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 text-center">
                  <Star className="text-indigo-400 mx-auto mb-4" />
                  <p className="text-xs font-medium text-slate-400 leading-relaxed italic">
                    "AI video generation uses significant GPU compute. Please allow up to 2 minutes for high-fidelity synthesis."
                  </p>
               </div>
            </div>
          </div>
        )}

        {currentView === 'roadmap' && (
          <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom duration-500">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black mb-4 uppercase tracking-tighter">{t.roadmapTitle}</h2>
              <p className="text-slate-400 text-lg">{t.roadmapDesc}</p>
            </div>
            <div className="space-y-6">
              {ROADMAP_STEPS.map((step) => (
                <div key={step.id} className="bg-slate-900/60 border border-slate-800 p-8 rounded-[2.5rem] flex items-center gap-8 group hover:border-indigo-500/50 transition-all">
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${step.status === 'DONE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-600/10 text-indigo-400'}`}>
                    <step.icon size={32} />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-xl font-bold">{step.title}</h3>
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

        {currentView === 'library' && (
           <div className="animate-in slide-in-from-bottom duration-700">
             <div className="flex items-center justify-between mb-12">
               <h2 className="text-4xl font-black uppercase tracking-tighter">Project Vault</h2>
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
                      onExtend={(v) => {
                        setPrompt(v.prompt);
                        setAspectRatio(v.aspectRatio);
                        setPreviousVideo(v.apiVideoData);
                        setCurrentView('generate');
                      }} 
                      onPinReference={() => {}} 
                    />
                  ))}
               </div>
             )}
           </div>
        )}
      </main>

      {/* Pricing Modal */}
      {showPricing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
           <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-[3rem] p-10 relative overflow-hidden animate-in zoom-in-95 duration-300">
              <button onClick={() => setShowPricing(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X size={24} /></button>
              <div className="text-center mb-12">
                 <h3 className="text-4xl font-black mb-2 uppercase tracking-tighter">{t.pricingTitle}</h3>
                 <p className="text-slate-400">{t.pricingDesc}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {PRICING_PLANS.map(plan => (
                   <div key={plan.id} className={`p-8 rounded-[2.5rem] border relative flex flex-col ${plan.popular ? 'bg-indigo-600/10 border-indigo-500' : 'bg-slate-950 border-slate-800'}`}>
                      {plan.popular && <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-black px-4 py-1 rounded-full">MOST POPULAR</span>}
                      <h4 className="text-2xl font-bold mb-1">{plan.name}</h4>
                      <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-4xl font-black">{plan.price}</span>
                        <span className="text-slate-500 text-sm">/ pack</span>
                      </div>
                      <div className="bg-indigo-500/10 text-indigo-400 p-4 rounded-2xl text-center font-black mb-8">
                         {plan.credits} Credits
                      </div>
                      <ul className="space-y-4 mb-10 flex-grow">
                         {plan.features.map(f => (
                           <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                              <Check size={16} className="text-emerald-500" /> {f}
                           </li>
                         ))}
                      </ul>
                      <button 
                        onClick={() => handleBuyCredits(plan.credits)}
                        className={`w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 ${plan.popular ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                      >
                         BUY NOW <ArrowRight size={16} />
                      </button>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        
<div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[3rem] p-10 relative animate-in z-10">
  <button
    onClick={() => setShowLogin(true)}
    className="px-4 py-2 bg-indigo-600 text-white rounded"
  >
    Sign in
  </button>
   </div>
+  );
+}
+
+export default App;
