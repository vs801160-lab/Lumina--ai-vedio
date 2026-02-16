
import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar.tsx';
import VideoCard from './components/VideoCard.tsx';
import { GeminiVideoService } from './geminiService.ts';
import { db } from './supabaseService.ts';
import { GeneratedVideo, SubscriptionTier, Resolution, AspectRatio, VisualStyle, CreditPackage } from './types.ts';
import { 
  AlertCircle, Loader2, Plus, Languages, Image as ImageIcon, Zap, Wand2, Globe, CheckCircle2, ShieldCheck, Activity
} from 'lucide-react';

const STYLES: VisualStyle[] = [
  { id: 'cinematic', name: 'Cinematic', prompt: 'masterpiece, 8k, cinematic lighting, ultra-realistic', image: '🎬' },
  { id: 'anime', name: 'Anime', prompt: 'modern anime style, vibrant colors, studio ghibli lighting', image: '🌸' },
  { id: '3d', name: '3D Render', prompt: 'octane render, 3d animation, toy-core aesthetic', image: '🎮' },
  { id: 'cyber', name: 'Cyberpunk', prompt: 'neon city, rainy night, synthwave aesthetic', image: '🌃' },
];

const PACKAGES: CreditPackage[] = [
  { id: 'pkg1', name: 'Starter', credits: 50, price: 499, currency: 'INR', features: ['5 Premium Videos', '720p Access'] },
  { id: 'pkg2', name: 'Creator', credits: 250, price: 1999, currency: 'INR', features: ['25 Premium Videos', 'Fast Processing'], recommended: true },
  { id: 'pkg3', name: 'Studio', credits: 1000, price: 4999, currency: 'INR', features: ['Unlimited History', '1080p Access'] },
];

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
    const checkApi = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) setHasApiKey(await aistudio.hasSelectedApiKey());
      else setHasApiKey(!!process.env.API_KEY);
    };
    checkApi();
    
    db.getUser().then(u => {
      if (u) {
        setUser(u);
        refreshData(u.id);
      }
    });
    db.fetchPublicVideos().then(setShowcase);
  }, []);

  const refreshData = async (uid: string) => {
    setCredits(await db.getCredits(uid));
    setTier(await db.getTier(uid));
    setLibrary(await db.fetchVideos(uid));
  };

  const handlePayment = (pkg: CreditPackage) => {
    if (!user) { setError("Please Sign In first"); return; }
    
    const options = {
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
      amount: pkg.price * 100,
      currency: pkg.currency,
      name: "Lumina AI Video",
      description: `Purchase ${pkg.credits} Credits`,
      handler: async (res: any) => {
        await db.updateCredits(user.id, pkg.credits, `Purchased ${pkg.name}`);
        setSuccessMsg("Payment Successful! Credits Added.");
        refreshData(user.id);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    };
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handleGenerate = async () => {
    if (credits < 10) { setCurrentView('pricing'); return; }
    setIsGenerating(true);
    setError(null);
    try {
      const { videoUrl, apiVideoData } = await GeminiVideoService.generateVideo({
        prompt,
        aspectRatio: '16:9',
        resolution: '720p',
        style: selectedStyle.prompt
      }, setStatus);

      const newVideo: GeneratedVideo = {
        id: Math.random().toString(36).substr(2, 9),
        prompt,
        url: videoUrl,
        createdAt: Date.now(),
        aspectRatio: '16:9',
        resolution: '720p',
        apiVideoData
      };

      await db.saveVideo(newVideo, user?.id || 'demo-user');
      await db.updateCredits(user?.id || 'demo-user', -10);
      refreshData(user?.id || 'demo-user');
      setCurrentView('library');
      setPrompt('');
    } catch (e: any) {
      setError(e.message || "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080f] text-white flex flex-col font-sans selection:bg-indigo-500/30">
      <Navbar currentView={currentView} onNavigate={setCurrentView} credits={credits} tier={tier} user={user} t={{}} onLoginClick={() => db.signInWithGoogle().then(r => setUser(r.user))} onLogout={() => { db.signOut(); setUser(null); }} onBuyCredits={() => setCurrentView('pricing')} />

      {hasApiKey === false && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-10 rounded-[3rem] text-center space-y-6 shadow-2xl">
            <ShieldCheck size={48} className="mx-auto text-indigo-500" />
            <h2 className="text-3xl font-black tracking-tighter uppercase">API Key Required</h2>
            <p className="text-slate-400 text-sm">To use Veo models, you must select an API key from a paid GCP project.</p>
            <button onClick={() => (window as any).aistudio?.openSelectKey().then(() => setHasApiKey(true))} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black uppercase tracking-widest transition-all">Select Project Key</button>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="fixed top-24 right-8 z-[80] animate-in slide-in-from-right duration-300">
          <div className="bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <CheckCircle2 size={24} />
            <span className="font-black uppercase tracking-widest text-xs">{successMsg}</span>
          </div>
        </div>
      )}

      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 w-full">
        {currentView === 'generate' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 uppercase">Lumina Studio</h1>
              <p className="text-slate-400 uppercase tracking-[0.2em] font-bold text-xs">Professional Veo AI Rendering</p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-8 md:p-12 shadow-2xl backdrop-blur-3xl relative">
              <div className="relative mb-8">
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A neon city at night with floating cars..." className="w-full h-48 bg-slate-950/80 border border-slate-800 rounded-[2.5rem] p-8 text-lg outline-none focus:border-indigo-500 transition-all resize-none placeholder:text-slate-700" />
                <button onClick={async () => {
                  setIsRefining(true);
                  const res = await GeminiVideoService.refinePrompt(prompt);
                  setPrompt(res);
                  setIsRefining(false);
                }} className="absolute bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all shadow-xl disabled:opacity-50">
                  {isRefining ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                </button>
              </div>

              {error && <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl mb-8 flex items-center gap-4 text-red-400 font-medium"><AlertCircle size={24} />{error}</div>}

              <div className="flex flex-wrap gap-3 mb-12">
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setSelectedStyle(s)} className={`px-6 py-3 rounded-2xl border transition-all flex items-center gap-3 ${selectedStyle.id === s.id ? 'bg-indigo-600 border-indigo-400 shadow-xl' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'}`}>
                    <span className="text-xl">{s.image}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{s.name}</span>
                  </button>
                ))}
              </div>

              <button onClick={handleGenerate} disabled={isGenerating || !prompt} className="w-full py-8 bg-indigo-600 hover:bg-indigo-500 rounded-[2rem] font-black text-2xl shadow-2xl transition-all flex items-center justify-center gap-4 group">
                {isGenerating ? <><Loader2 className="animate-spin" /> {status}</> : <><Zap className="group-hover:fill-current" /> GENERATE MASTERPIECE</>}
              </button>
            </div>
          </div>
        )}

        {currentView === 'library' && (
          <div className="space-y-10">
            <h2 className="text-4xl font-black uppercase tracking-tighter">Your Vault</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {library.map(v => <VideoCard key={v.id} video={v} onDelete={() => {}} onExtend={() => {}} onPinReference={() => {}} />)}
            </div>
          </div>
        )}

        {currentView === 'pricing' && (
          <div className="space-y-12">
            <h2 className="text-5xl font-black text-center uppercase tracking-tighter">Top Up Credits</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {PACKAGES.map(pkg => (
                <div key={pkg.id} className={`p-1 rounded-[3.5rem] ${pkg.recommended ? 'bg-indigo-500' : 'bg-slate-800'}`}>
                  <div className="bg-[#0b0e1a] rounded-[3.4rem] p-10 text-center flex flex-col h-full">
                    <h3 className="text-xl font-black uppercase text-indigo-400 mb-6">{pkg.name}</h3>
                    <div className="text-5xl font-black mb-2">₹{pkg.price}</div>
                    <div className="text-slate-500 uppercase font-bold text-xs mb-8">{pkg.credits} Credits</div>
                    <ul className="text-left space-y-3 mb-10 flex-grow">
                      {pkg.features.map(f => <li key={f} className="text-xs text-slate-400 flex items-center gap-2"><CheckCircle2 size={12} className="text-indigo-500" /> {f}</li>)}
                    </ul>
                    <button onClick={() => handlePayment(pkg)} className="w-full py-5 bg-slate-900 border border-slate-700 rounded-2xl font-black uppercase hover:bg-indigo-600 transition-all">Buy Now</button>
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
