
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import VideoCard from './components/VideoCard';
import LegalPages from './components/LegalPages';
import { GeminiVideoService } from './geminiService';
import { db } from './supabaseService';
import { GeneratedVideo, SubscriptionTier, CreditPackage, VisualStyle, AspectRatio } from './types';
import { 
  AlertCircle, Loader2, Languages, Zap, Wand2, CheckCircle2, ShieldCheck, Sparkles, CreditCard, Trash2, Music, Maximize2, Share2
} from 'lucide-react';

const STYLES: VisualStyle[] = [
  { id: 'cinematic', name: 'Cinematic', prompt: 'masterpiece, 8k, cinematic lighting, ultra-realistic', image: 'https://picsum.photos/seed/cinema/800/1000' },
  { id: 'anime', name: 'Anime', prompt: 'modern anime style, vibrant colors, studio ghibli lighting', image: 'https://picsum.photos/seed/anime/800/1000' },
  { id: '3d', name: '3D Render', prompt: 'octane render, 3d animation, toy-core aesthetic', image: 'https://picsum.photos/seed/3d/800/1000' },
  { id: 'cyber', name: 'Cyberpunk', prompt: 'neon city, rainy night, synthwave aesthetic', image: 'https://picsum.photos/seed/cyber/800/1000' },
];

const PACKAGES: CreditPackage[] = [
  { id: 'pkg0', name: 'Trial Pack', credits: 10, price: 99, currency: 'INR', features: ['1 Masterpiece Video', '720p Access'] },
  { id: 'pkg1', name: 'Starter', credits: 60, price: 499, currency: 'INR', features: ['6 Premium Videos', '720p Access'] },
  { id: 'pkg2', name: 'Creator Pro', credits: 300, price: 1999, currency: 'INR', features: ['30 Premium Videos', 'Priority Queue'], recommended: true },
];

const TRANSLATIONS = {
  EN: {
    hero: "LUMINA STUDIO",
    sub: "Professional Veo AI Rendering",
    placeholder: "A cinematic shot of a dragon flying over a neon city...",
    generate_btn: "GENERATE MASTERPIECE",
    refining: "Refining...",
    lang_toggle: "हिंदी",
    vault: "Your Vault",
    explore: "Global Showcase",
    pricing: "Get Credits",
    rendering: "AI is rendering...",
    success_pay: "Credits Added Successfully!",
    login_req: "Please sign in to continue",
    low_credits: "Insufficient credits. Please top up."
  },
  HI: {
    hero: "लुमिना स्टूडियो",
    sub: "प्रोफेशनल AI वीडियो रेंडरिंग",
    placeholder: "एक जादुई शहर के ऊपर उड़ते हुए ड्रैगन का सिनेमाई शॉट...",
    generate_btn: "वीडियो बनाएँ",
    refining: "सुधार रहे हैं...",
    lang_toggle: "English",
    vault: "आपकी लाइब्रेरी",
    explore: "शोकेस",
    pricing: "क्रेडिट खरीदें",
    rendering: "बन रहा है...",
    success_pay: "क्रेडिट सफलतापूर्वक जुड़ गए!",
    login_req: "आगे बढ़ने के लिए साइन इन करें",
    low_credits: "क्रेडिट कम हैं। कृपया रिचार्ज करें।"
  }
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('generate');
  const [user, setUser] = useState<any>(null);
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');
  const [credits, setCredits] = useState(0);
  const [tier, setTier] = useState<SubscriptionTier>(SubscriptionTier.FREE);
  const [library, setLibrary] = useState<GeneratedVideo[]>([]);
  const [showcase, setShowcase] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(STYLES[0]);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('16:9');
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [storyboard, setStoryboard] = useState<any[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // Handle OAuth callback in popup
    if (window.opener && (window.location.hash.includes('access_token') || window.location.search.includes('code='))) {
      window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, window.location.origin);
      window.close();
      return;
    }

    // Listen for success message from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        db.getUser().then(u => {
          if (u) {
            setUser(u);
            refreshUserData(u.id);
          }
        });
      }
    };
    window.addEventListener('message', handleMessage);

    const init = async () => {
      console.log("Current Origin for OAuth:", window.location.origin);
      try {
        const aistudio = (window as any).aistudio;
        if (aistudio) {
          const hasKey = await aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } else {
          // Use direct access so Vite can replace it
          const key = import.meta.env.API_KEY;
          setHasApiKey(!!key && key !== 'your_gemini_api_key_here');
        }
        
        const u = await db.getUser();
        if (u) {
          setUser(u);
          await refreshUserData(u.id);
        }
      } catch (e) {
        console.error("Initialization failed", e);
        setError("Failed to initialize app. Please refresh.");
      }
    };
    init();
    db.fetchPublicVideos().then(setShowcase).catch(e => console.error("Showcase fetch failed", e));

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const refreshUserData = async (uid: string) => {
    const c = await db.getCredits(uid);
    const oldCredits = credits;
    setCredits(c);
    if (c > oldCredits && oldCredits !== 0) {
      setSuccessMsg("Daily Login Bonus: +5 Credits Added!");
      setTimeout(() => setSuccessMsg(null), 4000);
    }
    setTier(await db.getTier(uid));
    const vids = await db.fetchVideos(uid);
    setLibrary(vids);
  };

  const t = TRANSLATIONS[lang];

  const handlePayment = (pkg: CreditPackage) => {
    if (!user) { setError(t.login_req); return; }
    
    const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!rzpKey || rzpKey === 'rzp_test_your_key_id' || rzpKey === '') {
      setError("Razorpay Key is not configured. Please set VITE_RAZORPAY_KEY_ID in environment variables.");
      return;
    }

    const options = {
      key: rzpKey,
      amount: pkg.price * 100,
      currency: pkg.currency,
      name: "Lumina Studio",
      description: `Purchase ${pkg.credits} Credits`,
      handler: async (response: any) => {
        if (response.razorpay_payment_id) {
          await db.updateCredits(user.id, pkg.credits, `Purchased ${pkg.name} package`);
          setCredits(prev => prev + pkg.credits);
          setSuccessMsg(t.success_pay);
          setTimeout(() => setSuccessMsg(null), 3000);
        }
      },
      prefill: {
        email: user.email,
        name: user.user_metadata?.full_name || ""
      },
      theme: { color: "#4f46e5" }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handleGenerate = async (customPrompt?: string, sceneId?: string) => {
    if (!user) { setError(t.login_req); return; }
    if (credits < 10) { setError(t.low_credits); return; }

    const targetPrompt = customPrompt || prompt;
    if (sceneId) {
      setStoryboard(prev => prev.map(s => s.id === sceneId ? { ...s, status: 'generating' } : s));
    } else {
      setIsGenerating(true);
    }
    
    setStatus("Preparing...");
    
    try {
      const { videoUrl, apiVideoData } = await GeminiVideoService.generateVideo({
        prompt: targetPrompt,
        aspectRatio: selectedAspectRatio,
        resolution: '720p',
        style: selectedStyle.prompt,
        referenceImages: referenceImage ? [referenceImage] : []
      }, (s) => setStatus(s));

      // Generate Audio for the scene
      let audioUrl = '';
      let directorsNote = '';
      
      if (sceneId) {
        setStoryboard(prev => prev.map(s => s.id === sceneId ? { ...s, audioStatus: 'generating' } : s));
        try {
          const [audio, note] = await Promise.all([
            GeminiVideoService.generateAudio(targetPrompt),
            GeminiVideoService.generateDirectorsNote(targetPrompt)
          ]);
          audioUrl = audio;
          directorsNote = note;
        } catch (e) {
          console.error("Audio/Note generation failed, continuing with video only");
        }
      } else {
        try {
          directorsNote = await GeminiVideoService.generateDirectorsNote(targetPrompt);
        } catch (e) {}
      }

      const newVideo: GeneratedVideo = {
        id: Math.random().toString(36).substr(2, 9),
        prompt: targetPrompt,
        url: videoUrl,
        audioUrl: audioUrl,
        directorsNote: directorsNote,
        createdAt: Date.now(),
        aspectRatio: selectedAspectRatio,
        resolution: '720p',
        style: selectedStyle.name,
        apiVideoData
      };

      await db.saveVideo(newVideo, user.id);
      await db.updateCredits(user.id, -10, "Generated Video");
      
      setLibrary([newVideo, ...library]);
      setCredits(prev => prev - 10);
      
      if (sceneId) {
        setStoryboard(prev => prev.map(s => s.id === sceneId ? { ...s, status: 'completed', videoUrl, audioUrl, audioStatus: audioUrl ? 'completed' : 'pending' } : s));
      } else {
        setPrompt('');
        setCurrentView('library');
      }
    } catch (e: any) {
      setError(e.message);
      if (sceneId) {
        setStoryboard(prev => prev.map(s => s.id === sceneId ? { ...s, status: 'pending' } : s));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlanStoryboard = async () => {
    if (!prompt) return;
    setIsPlanning(true);
    try {
      const scenes = await GeminiVideoService.planStoryboard(prompt);
      setStoryboard(scenes.map((s, i) => ({ ...s, id: `scene-${i}`, status: 'pending' })));
    } catch (e) {
      setError("Failed to plan storyboard");
    } finally {
      setIsPlanning(false);
    }
  };

  const handleWhatsAppShare = async () => {
    const text = `Check out this amazing AI Video I made with Lumina Studio! Try it here: ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    
    // Reward user for sharing
    if (user) {
      const lastShare = localStorage.getItem('lumina_last_share');
      const today = new Date().toDateString();
      if (lastShare !== today) {
        await db.updateCredits(user.id, 2, "WhatsApp Share Bonus");
        setCredits(prev => prev + 2);
        localStorage.setItem('lumina_last_share', today);
        setSuccessMsg("Shared! +2 Credits Added to your Vault.");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#06080f] text-white flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
      {/* Cinematic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[30%] right-[20%] w-[20%] h-[20%] bg-purple-600/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar currentView={currentView} onNavigate={setCurrentView} credits={credits} tier={tier} user={user} t={t} onLoginClick={() => db.signInWithGoogle()} onLogout={() => db.signOut()} onBuyCredits={() => setCurrentView('pricing')} />

      {error && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-red-500 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 animate-bounce">
          <AlertCircle size={20} />
          <span className="font-bold text-xs uppercase tracking-widest">{error}</span>
          <button onClick={() => setError(null)} className="ml-4 font-black">×</button>
        </div>
      )}

      {successMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Sparkles size={20} />
          <span className="font-black uppercase tracking-widest text-xs">{successMsg}</span>
        </div>
      )}

      {hasApiKey === false && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 backdrop-blur-3xl">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-10 rounded-[3rem] text-center space-y-6 shadow-2xl">
            <ShieldCheck size={48} className="mx-auto text-indigo-500" />
            <h2 className="text-3xl font-black uppercase tracking-tighter">API Key Required</h2>
            <p className="text-slate-400 text-sm">Veo Video generation requires a paid Google Cloud project API key. Please select one to continue.</p>
            <button 
              onClick={async () => {
                try {
                  await (window as any).aistudio?.openSelectKey();
                  // Assume success to mitigate race condition
                  setHasApiKey(true);
                } catch (e) {
                  console.error("Key selection failed", e);
                }
              }} 
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20"
            >
              Select Project Key
            </button>
            <div className="pt-4 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">Or use demo mode without video generation</p>
              <button onClick={() => setHasApiKey(true)} className="text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">
                Continue to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 w-full">
        {currentView === 'generate' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setLang(lang === 'EN' ? 'HI' : 'EN')} className="px-4 py-2 bg-slate-900 rounded-full border border-slate-800 text-[10px] font-black uppercase text-indigo-400 hover:bg-indigo-500/10 transition-all">
                  <Languages size={14} className="inline mr-2" /> {t.lang_toggle}
                </button>
                <button onClick={() => { setIsStoryMode(!isStoryMode); setStoryboard([]); }} className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase transition-all flex items-center gap-2 ${isStoryMode ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-indigo-400'}`}>
                  <CreditCard size={14} /> {isStoryMode ? 'Storyboard Mode Active' : 'Switch to Story Mode'}
                </button>
              </div>
              <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
                <h1 className="text-5xl md:text-9xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 uppercase leading-none">{t.hero}</h1>
                <div className="px-3 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded-full flex items-center gap-2 self-start mb-2 animate-pulse">
                  <Sparkles size={12} className="text-indigo-400" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-indigo-300">Director's Suite Active</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-6 md:p-12 shadow-2xl backdrop-blur-3xl relative">
              <div className="relative mb-8">
                <textarea 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)} 
                  placeholder={isStoryMode ? "Write your script here... (e.g. A cyberpunk detective enters a bar, orders a drink, and sees a mysterious woman)" : t.placeholder} 
                  className="w-full h-48 bg-slate-950/80 border border-slate-800 rounded-[2.5rem] p-8 text-lg outline-none focus:border-indigo-500 transition-all resize-none placeholder:text-slate-800" 
                />
                {!isStoryMode && (
                  <button onClick={async () => { setIsRefining(true); setPrompt(await GeminiVideoService.refinePrompt(prompt)); setIsRefining(false); }} className="absolute bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all shadow-xl disabled:opacity-50">
                    {isRefining ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                  </button>
                )}
              </div>

              {isStoryMode && storyboard.length === 0 && (
                <button onClick={handlePlanStoryboard} disabled={isPlanning || !prompt} className="w-full mb-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3">
                  {isPlanning ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />} Plan Cinematic Storyboard
                </button>
              )}

              {isStoryMode && storyboard.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  {storyboard.map((scene, idx) => (
                    <div key={scene.id} className="bg-slate-950/60 border border-slate-800 rounded-3xl p-6 space-y-4 relative overflow-hidden group">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Scene 0{idx + 1}</span>
                        <span className="text-[8px] px-2 py-1 bg-slate-900 rounded-lg text-slate-500 font-bold uppercase">{scene.shotType}</span>
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-tight">{scene.title}</h4>
                      <p className="text-[10px] text-slate-500 line-clamp-3 italic leading-relaxed">"{scene.prompt}"</p>
                      
                      {scene.videoUrl ? (
                        <div className="space-y-3">
                          <div className="aspect-video rounded-xl overflow-hidden border border-emerald-500/30">
                            <video src={scene.videoUrl} className="w-full h-full object-cover" controls />
                          </div>
                          {scene.audioUrl && (
                            <div className="flex items-center gap-2 p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                              <Music size={14} className="text-indigo-500" />
                              <span className="text-[8px] font-black uppercase text-indigo-400">Dolby AI Audio Generated</span>
                              <audio src={scene.audioUrl} className="hidden" />
                            </div>
                          )}
                          {scene.directorsNote && (
                            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/50 italic text-[10px] text-slate-400 leading-relaxed">
                              <span className="text-indigo-400 font-black uppercase mr-2 not-italic">Director's Note:</span>
                              {scene.directorsNote}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleGenerate(scene.prompt, scene.id)} 
                          disabled={scene.status === 'generating'}
                          className={`w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${scene.status === 'generating' ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}`}
                        >
                          {scene.status === 'generating' ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />} 
                          {scene.status === 'generating' ? 'Rendering...' : 'Generate Scene'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Cinematic Mood Board</h3>
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Select Visual Style</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {STYLES.map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => setSelectedStyle(s)} 
                      className={`group relative aspect-[4/5] rounded-[2rem] overflow-hidden border-2 transition-all duration-500 ${selectedStyle.id === s.id ? 'border-indigo-500 scale-[0.98] shadow-[0_0_30px_rgba(99,102,241,0.3)]' : 'border-slate-800/50 hover:border-slate-600'}`}
                    >
                      <img src={s.image} alt={s.name} className={`w-full h-full object-cover transition-transform duration-700 ${selectedStyle.id === s.id ? 'scale-110' : 'group-hover:scale-110'}`} referrerPolicy="no-referrer" />
                      <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity duration-500 ${selectedStyle.id === s.id ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />
                      <div className="absolute bottom-6 left-6 right-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white mb-1">{s.name}</p>
                        <div className={`h-1 bg-indigo-500 rounded-full transition-all duration-500 ${selectedStyle.id === s.id ? 'w-full' : 'w-0 group-hover:w-1/2'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-10 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Screen Size (Aspect Ratio)</h3>
                <div className="flex gap-4">
                  {(['16:9', '9:16'] as AspectRatio[]).map(ratio => (
                    <button 
                      key={ratio} 
                      onClick={() => setSelectedAspectRatio(ratio)}
                      className={`flex-1 py-4 rounded-2xl border font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${selectedAspectRatio === ratio ? 'bg-indigo-600 border-indigo-400 shadow-xl' : 'bg-slate-950/40 border-slate-800 text-slate-500'}`}
                    >
                      <Maximize2 size={16} className={ratio === '9:16' ? 'rotate-90' : ''} />
                      {ratio === '16:9' ? 'Landscape (16:9)' : 'Portrait (9:16)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Character Consistency (Optional)</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {!referenceImage ? (
                    <label className="h-32 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-all bg-slate-950/20 group">
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      <div className="p-3 bg-slate-900 rounded-2xl mb-2 group-hover:scale-110 transition-transform">
                        <Sparkles size={20} className="text-indigo-500" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">Upload Character Reference</span>
                    </label>
                  ) : (
                    <div className="relative h-32 rounded-3xl overflow-hidden border border-indigo-500/50 shadow-2xl shadow-indigo-500/20 group">
                      <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <button 
                          onClick={() => setReferenceImage(null)} 
                          className="p-3 bg-red-500/20 border border-red-500/50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all transform translate-y-2 group-hover:translate-y-0"
                          title="Remove Reference"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="absolute top-3 left-3 px-2 py-1 bg-indigo-600 rounded-lg text-[8px] font-black uppercase tracking-widest">Active Reference</div>
                    </div>
                  )}
                  
                  <div className="h-32 bg-slate-950/20 border border-slate-800 rounded-3xl p-6 flex flex-col justify-center">
                    <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed tracking-wide">
                      {referenceImage 
                        ? "AI will maintain the character's features, clothing, and style from this image in the generated video."
                        : "Upload an image of a character to maintain visual consistency across different prompts and scenes."}
                    </p>
                  </div>
                </div>
              </div>

              {!isStoryMode && (
                <button onClick={() => handleGenerate()} disabled={isGenerating || !prompt} className="w-full py-7 bg-indigo-600 hover:bg-indigo-500 rounded-[2rem] font-black text-lg md:text-2xl shadow-2xl transition-all flex items-center justify-center gap-4 group">
                  {isGenerating ? <><Loader2 className="animate-spin" /> {status}</> : <><Zap className="group-hover:fill-current" /> {t.generate_btn}</>}
                </button>
              )}
            </div>
          </div>
        )}

        {currentView === 'library' && (
          <div className="space-y-10">
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-black uppercase tracking-tighter">{t.vault}</h2>
              <button 
                onClick={handleWhatsAppShare}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl shadow-emerald-500/20 transition-all"
              >
                <Share2 size={14} /> Share & Get +2 Credits
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {library.map(v => <VideoCard key={v.id} video={v} onDelete={(id) => { setLibrary(library.filter(x => x.id !== id)); db.deleteVideo(id); }} onExtend={() => {}} onPinReference={(url) => { setReferenceImage(url); setCurrentView('generate'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onTogglePublic={(id, val) => db.updateVideoPrivacy(id, val)} />)}
              {library.length === 0 && <div className="col-span-full py-32 border-2 border-dashed border-slate-800 rounded-[3rem] text-center text-slate-600 font-black uppercase">No videos yet</div>}
            </div>
          </div>
        )}

        {currentView === 'explore' && (
          <div className="space-y-10">
            <h2 className="text-4xl font-black uppercase tracking-tighter">{t.explore}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {showcase.map(v => <VideoCard key={v.id} video={v} isExplore onDelete={() => {}} onExtend={() => {}} onPinReference={() => {}} />)}
            </div>
          </div>
        )}

        {currentView === 'pricing' && (
          <div className="space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-6xl font-black uppercase tracking-tighter">{t.pricing}</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Choose a plan to fuel your creativity</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {PACKAGES.map(pkg => (
                <div key={pkg.id} className={`p-10 rounded-[3rem] border flex flex-col ${pkg.recommended ? 'bg-indigo-600/10 border-indigo-500 shadow-2xl shadow-indigo-500/10' : 'bg-slate-900/40 border-slate-800'}`}>
                  <h3 className="text-2xl font-black uppercase tracking-tight mb-2">{pkg.name}</h3>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl font-black">₹{pkg.price}</span>
                    <span className="text-slate-500 text-xs font-bold uppercase">/ {pkg.credits} Credits</span>
                  </div>
                  <ul className="space-y-4 mb-10 flex-grow">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-slate-300">
                        <CheckCircle2 size={16} className="text-indigo-500" /> {f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => handlePayment(pkg)} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${pkg.recommended ? 'bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-500/20' : 'bg-slate-800 hover:bg-slate-700'}`}>
                    Select Plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(currentView === 'privacy' || currentView === 'terms' || currentView === 'refund') && (
          <LegalPages 
            type={currentView as any} 
            onBack={() => setCurrentView('generate')} 
          />
        )}
      </main>

      <footer className="py-12 border-t border-slate-800/50 text-center space-y-6">
        <div className="flex items-center justify-center gap-8">
          <button onClick={() => setCurrentView('privacy')} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors">Privacy Policy</button>
          <button onClick={() => setCurrentView('terms')} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors">Terms of Service</button>
          <button onClick={() => setCurrentView('refund')} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors">Refund Policy</button>
        </div>
        <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">© 2024 Lumina Studio • Powered by Veo AI</p>
      </footer>
      </div>
    </div>
  );
};

export default App;
