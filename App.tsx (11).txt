
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.tsx';
import VideoCard from './components/VideoCard.tsx';
import { GeminiVideoService } from './geminiService.ts';
import { db } from './supabaseService.ts';
import { GeneratedVideo, SubscriptionTier, CreditPackage, VisualStyle } from './types.ts';
import { 
  AlertCircle, Loader2, Languages, Zap, Wand2, CheckCircle2, ShieldCheck, Sparkles, CreditCard
} from 'lucide-react';

const STYLES: VisualStyle[] = [
  { id: 'cinematic', name: 'Cinematic', prompt: 'masterpiece, 8k, cinematic lighting, ultra-realistic', image: '🎬' },
  { id: 'anime', name: 'Anime', prompt: 'modern anime style, vibrant colors, studio ghibli lighting', image: '🌸' },
  { id: '3d', name: '3D Render', prompt: 'octane render, 3d animation, toy-core aesthetic', image: '🎮' },
  { id: 'cyber', name: 'Cyberpunk', prompt: 'neon city, rainy night, synthwave aesthetic', image: '🌃' },
];

const PACKAGES: CreditPackage[] = [
  { id: 'pkg1', name: 'Starter', credits: 50, price: 499, currency: 'INR', features: ['5 Premium Videos', '720p Access'] },
  { id: 'pkg2', name: 'Creator Pro', credits: 300, price: 1999, currency: 'INR', features: ['30 Premium Videos', 'Priority Queue'], recommended: true },
  { id: 'pkg3', name: 'Studio Max', credits: 1000, price: 4999, currency: 'INR', features: ['100+ Masterpieces', '1080p Ultra HD'] },
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
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    const init = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) setHasApiKey(await aistudio.hasSelectedApiKey());
      else setHasApiKey(!!process.env.API_KEY && process.env.API_KEY !== 'your_gemini_api_key_here');
      
      const u = await db.getUser();
      if (u) {
        setUser(u);
        refreshUserData(u.id);
      }
    };
    init();
    db.fetchPublicVideos().then(setShowcase);
  }, []);

  const refreshUserData = async (uid: string) => {
    const c = await db.getCredits(uid);
    setCredits(c);
    setTier(await db.getTier(uid));
    const vids = await db.fetchVideos(uid);
    setLibrary(vids);
  };

  const t = TRANSLATIONS[lang];

  const handlePayment = (pkg: CreditPackage) => {
    if (!user) { setError(t.login_req); return; }

    const razorpayKey = process.env.RAZORPAY_KEY_ID?.trim();
    
    if (!razorpayKey || razorpayKey === 'undefined' || !razorpayKey.startsWith('rzp_')) {
      setError("Razorpay Key ID missing or invalid! Dashboard se 'Key ID' copy karein (rzp_test... se shuru hoti hai).");
      return;
    }

    const options = {
      key: razorpayKey,
      amount: pkg.price * 100,
      currency: pkg.currency,
      name: "Lumina AI Studio",
      description: `${pkg.credits} AI Credits`,
      handler: async (response: any) => {
        try {
          await db.updateCredits(user.id, pkg.credits, `Purchase: ${response.razorpay_payment_id}`);
          await refreshUserData(user.id);
          setSuccessMsg(t.success_pay);
          setTimeout(() => setSuccessMsg(null), 5000);
        } catch (e) {
          setError("Credit update failed. Please contact support.");
        }
      },
      prefill: {
        name: user.user_metadata?.full_name || "",
        email: user.email || ""
      },
      theme: { color: "#6366f1" }
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => setError(`Payment Failed: ${resp.error.description}`));
      rzp.open();
    } catch (e) {
      setError("Razorpay failed to load. Please refresh.");
    }
  };

  const handleGenerate = async () => {
    if (!user) { setError(t.login_req); return; }
    if (credits < 10) { setError(t.low_credits); setCurrentView('pricing'); return; }
    
    setIsGenerating(true);
    setError(null);
    try {
      const { videoUrl, apiVideoData } = await GeminiVideoService.generateVideo({
        prompt, aspectRatio: '16:9', resolution: '720p', style: selectedStyle.prompt
      }, setStatus);

      const newVideo: GeneratedVideo = {
        id: Math.random().toString(36).substr(2, 9),
        prompt, url: videoUrl, createdAt: Date.now(),
        aspectRatio: '16:9', resolution: '720p',
        apiVideoData, style: selectedStyle.name
      };

      await db.saveVideo(newVideo, user.id);
      await db.updateCredits(user.id, -10);
      await refreshUserData(user.id);
      setCurrentView('library');
      setPrompt('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080f] text-white flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden">
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
            <button onClick={() => (window as any).aistudio?.openSelectKey().then(() => setHasApiKey(true))} className="w-full py-4 bg-indigo-600 rounded-2xl font-black uppercase tracking-widest transition-all">Select Project Key</button>
          </div>
        </div>
      )}

      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 w-full">
        {currentView === 'generate' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
              <button onClick={() => setLang(lang === 'EN' ? 'HI' : 'EN')} className="px-4 py-2 bg-slate-900 rounded-full border border-slate-800 text-[10px] font-black uppercase text-indigo-400 hover:bg-indigo-500/10 transition-all">
                <Languages size={14} className="inline mr-2" /> {t.lang_toggle}
              </button>
              <h1 className="text-5xl md:text-9xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 uppercase leading-none">{t.hero}</h1>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-6 md:p-12 shadow-2xl backdrop-blur-3xl relative">
              <div className="relative mb-8">
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t.placeholder} className="w-full h-48 bg-slate-950/80 border border-slate-800 rounded-[2.5rem] p-8 text-lg outline-none focus:border-indigo-500 transition-all resize-none placeholder:text-slate-800" />
                <button onClick={async () => { setIsRefining(true); setPrompt(await GeminiVideoService.refinePrompt(prompt)); setIsRefining(false); }} className="absolute bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all shadow-xl disabled:opacity-50">
                  {isRefining ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                </button>
              </div>

              <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 mb-10">
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setSelectedStyle(s)} className={`px-4 py-4 rounded-2xl border transition-all flex items-center gap-3 ${selectedStyle.id === s.id ? 'bg-indigo-600 border-indigo-400 shadow-xl' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'}`}>
                    <span className="text-xl">{s.image}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest">{s.name}</span>
                  </button>
                ))}
              </div>

              <button onClick={handleGenerate} disabled={isGenerating || !prompt} className="w-full py-7 bg-indigo-600 hover:bg-indigo-500 rounded-[2rem] font-black text-lg md:text-2xl shadow-2xl transition-all flex items-center justify-center gap-4 group">
                {isGenerating ? <><Loader2 className="animate-spin" /> {status}</> : <><Zap className="group-hover:fill-current" /> {t.generate_btn}</>}
              </button>
            </div>
          </div>
        )}

        {currentView === 'library' && (
          <div className="space-y-10">
            <h2 className="text-4xl font-black uppercase tracking-tighter">{t.vault}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {library.map(v => <VideoCard key={v.id} video={v} onDelete={(id) => { setLibrary(library.filter(x => x.id !== id)); db.deleteVideo(id); }} onExtend={() => {}} onPinReference={() => {}} onTogglePublic={(id, val) => db.updateVideoPrivacy(id, val)} />)}
              {library.length === 0 && <div className="col-span-full py-32 border-2 border-dashed border-slate-800 rounded-[3rem] text-center text-slate-600 font-black uppercase">No videos yet</div>}
            </div>
          </div>
        )}

        {currentView === 'explore' && (
          <div className="space-y-10">
            <h2 className="text-4xl font-black uppercase tracking-tighter">{t.explore}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {showcase.map(v => <VideoCard key={v.id} video={v} onDelete={() => {}} onExtend={() => {}} onPinReference={() => {}} isExplore />)}
            </div>
          </div>
        )}

        {currentView === 'pricing' && (
          <div className="space-y-16">
            <h2 className="text-6xl font-black text-center uppercase tracking-tighter">{t.pricing}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {PACKAGES.map(pkg => (
                <div key={pkg.id} className={`p-1 rounded-[3.5rem] ${pkg.recommended ? 'bg-indigo-500' : 'bg-slate-800'}`}>
                  <div className="bg-[#0b0e1a] rounded-[3.4rem] p-10 flex flex-col h-full text-center">
                    <h3 className="text-xl font-black uppercase text-indigo-400 mb-6">{pkg.name}</h3>
                    <div className="text-5xl font-black mb-4">₹{pkg.price}</div>
                    <ul className="text-left space-y-4 mb-10 flex-grow">
                      {pkg.features.map(f => <li key={f} className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2"><CheckCircle2 size={14} className="text-indigo-500" /> {f}</li>)}
                    </ul>
                    <button onClick={() => handlePayment(pkg)} className="w-full py-5 bg-indigo-600 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                      <CreditCard size={18} /> Buy Credits
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
