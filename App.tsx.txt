
import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar.tsx';
import VideoCard from './components/VideoCard.tsx';
import { GeminiVideoService } from './geminiService.ts';
import { db } from './supabaseService.ts';
import { GeneratedVideo, SubscriptionTier, Resolution, AspectRatio, VisualStyle, CreditPackage, Transaction } from './types.ts';
import { 
  AlertCircle, Loader2, Plus, Languages, Image as ImageIcon, Zap, ShieldAlert, Info, ExternalLink
} from 'lucide-react';

const STYLES: VisualStyle[] = [
  { id: 'cinematic', name: 'Cinematic', prompt: 'masterpiece, 8k, cinematic lighting', image: '🎬' },
  { id: '3d', name: '3D Render', prompt: 'unreal engine 5, octane render, stylized 3d', image: '🎮' },
  { id: 'anime', name: 'Anime', prompt: 'high quality anime style, studio ghibli aesthetic', image: '🌸' },
  { id: 'noir', name: 'Noir', prompt: 'black and white, moody, dramatic shadows', image: '🕶️' },
];

const PACKAGES: CreditPackage[] = [
  { id: 'starter', name: 'Starter', credits: 50, price: 9, currency: 'USD', features: ['5 Cinematic Videos', '720p Access'] },
  { id: 'pro', name: 'Creator Pro', credits: 300, price: 29, currency: 'USD', features: ['30 High-Res Videos', 'Priority Queue'], recommended: true },
  { id: 'elite', name: 'Studio Elite', credits: 1000, price: 79, currency: 'USD', features: ['100+ Masterpieces', '1080p Ultra HD'] },
];

const TRANSLATIONS = {
  EN: { hero: "CINEMA AI PRO", sub: "Describe your scene in detail", btn: "START RENDER", lang: "HINDI" },
  HI: { hero: "सिनेमा AI प्रो", sub: "अपने दृश्य का विस्तार से वर्णन करें", btn: "वीडियो बनाएँ", lang: "ENGLISH" }
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('generate');
  const [vaultTab, setVaultTab] = useState<'videos' | 'history'>('videos');
  const [user, setUser] = useState<any>(null);
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');
  const [credits, setCredits] = useState(0);
  const [tier, setTier] = useState<SubscriptionTier>(SubscriptionTier.FREE);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [library, setLibrary] = useState<GeneratedVideo[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(STYLES[0]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pinnedReferences, setPinnedReferences] = useState<string[]>([]);
  const [extendingVideo, setExtendingVideo] = useState<GeneratedVideo | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [isKeyLeaked, setIsKeyLeaked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const init = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        const has = await aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      } else {
        const env = typeof process !== 'undefined' ? process.env : (window as any).process?.env || {};
        setHasApiKey(!!env.API_KEY);
      }

      const u = await db.getUser();
      setUser(u);
      if (u) updateUserData(u.id);
    };
    init();
  }, []);

  const updateUserData = async (userId: string) => {
    try {
      const c = await db.getCredits(userId);
      setCredits(c);
      setTier(await db.getTier(userId));
      setTransactions(await db.fetchTransactions(userId));
      setLibrary(await db.fetchVideos(userId));
    } catch (e) {
      console.error("User data error", e);
    }
  };

  const handlePurchase = async (pkg: CreditPackage) => {
    if (user) {
      await db.updateCredits(user.id, pkg.credits, `Purchase: ${pkg.name}`);
      updateUserData(user.id);
      alert("Credits Added!");
      setCurrentView('library');
    } else {
      alert("Please sign in to buy credits.");
    }
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      await aistudio.openSelectKey();
    }
    setHasApiKey(true);
    setIsKeyLeaked(false);
    setError(null);
  };

  const startGeneration = async () => {
    const targetUserId = user?.id || 'demo-user';
    if (credits < 10) { 
      setCurrentView('pricing'); 
      return; 
    }
    
    setIsGenerating(true);
    setError(null);
    try {
      const { videoUrl, apiVideoData } = await GeminiVideoService.generateVideo({
        prompt, 
        aspectRatio, 
        resolution: '720p',
        style: selectedStyle.prompt,
        image: selectedImage || undefined,
        previousVideo: extendingVideo?.apiVideoData,
        referenceImages: pinnedReferences
      }, setStatus);

      const newVideo: GeneratedVideo = { 
        id: Math.random().toString(36).substring(2, 11), 
        prompt: prompt || "Untitled Render", 
        url: videoUrl, 
        createdAt: Date.now(), 
        aspectRatio, 
        resolution: '720p', 
        apiVideoData, 
        style: selectedStyle.name 
      };
      
      await db.saveVideo(newVideo, targetUserId);
      await db.updateCredits(targetUserId, -10, `Render: ${newVideo.id}`);
      updateUserData(targetUserId);
      setCurrentView('library');
      setPrompt(''); 
      setSelectedImage(null); 
      setExtendingVideo(null);
    } catch (err: any) {
      const errMsg = err?.message || "Render failed.";
      if (errMsg.includes("KEY_RESET_REQUIRED") || errMsg.toLowerCase().includes("leaked")) {
        setHasApiKey(false);
        setIsKeyLeaked(true);
        setError("API Key Error. Connect a fresh key from a PAID project.");
      } else if (errMsg.includes("BILLING")) {
        setError("BILLING REQUIRED: Cloud project must be PAID to download videos.");
      } else {
        setError(errMsg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080f] text-white flex flex-col font-sans">
      <Navbar currentView={currentView} onNavigate={setCurrentView} credits={credits} tier={tier} user={user} t={t} onLoginClick={async () => {
        const res = await db.signInWithGoogle();
        if (res.user) { setUser(res.user); updateUserData(res.user.id); }
      }} onLogout={() => { db.signOut(); setUser(null); setCredits(0); }} onBuyCredits={() => setCurrentView('pricing')} />

      {hasApiKey === false && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-10">
            <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl ${isKeyLeaked ? 'bg-red-600 shadow-red-600/40' : 'bg-indigo-600 shadow-indigo-600/40'}`}>
              {isKeyLeaked ? <ShieldAlert className="text-white w-12 h-12" /> : <Zap className="text-white w-12 h-12 fill-current" />}
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black uppercase tracking-tighter">
                {isKeyLeaked ? 'Security Alert' : 'Credentials Required'}
              </h2>
              <p className="text-slate-400 font-medium leading-relaxed">
                Connect a key from a Google Cloud project with billing enabled.
              </p>
            </div>
            <button onClick={handleSelectKey} className={`w-full py-6 rounded-3xl font-black uppercase tracking-widest transition-all ${isKeyLeaked ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
              Connect New API Key
            </button>
          </div>
        </div>
      )}

      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 w-full">
        {currentView === 'generate' && (
          <div className="space-y-10">
            <header className="text-center space-y-4">
              <button onClick={() => setLang(lang === 'EN' ? 'HI' : 'EN')} className="mx-auto flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:bg-indigo-500/10 transition-all">
                <Languages size={14} /> {t.lang} Mode
              </button>
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">{t.hero}</h1>
            </header>

            <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-10 shadow-2xl backdrop-blur-3xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="md:col-span-2 space-y-4">
                   <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t.sub} className="w-full h-44 bg-slate-950/80 border border-slate-800 rounded-3xl p-6 text-lg outline-none focus:border-indigo-500 transition-all resize-none" />
                </div>
                <div className="space-y-4">
                  <div onClick={() => fileInputRef.current?.click()} className={`h-44 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${selectedImage ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}>
                    {selectedImage ? <img src={selectedImage} className="h-full w-full object-cover rounded-2xl" alt="base" /> : <><ImageIcon className="text-slate-600" /><span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Base Image</span></>}
                    <input type="file" hidden ref={fileInputRef} onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const r = new FileReader();
                        r.onload = (ev) => setSelectedImage(ev.target?.result as string);
                        r.readAsDataURL(file);
                      }
                    }} />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] mb-8 flex flex-col gap-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 text-red-400">
                    <AlertCircle size={24} />
                    <span className="text-lg font-black uppercase tracking-tighter">System Error</span>
                  </div>
                  <p className="text-slate-300 font-medium leading-relaxed italic">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setSelectedStyle(s)} className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${selectedStyle.id === s.id ? 'bg-indigo-600 border-indigo-400 shadow-lg' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'}`}>
                    <span className="text-2xl">{s.image}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest">{s.name}</span>
                  </button>
                ))}
              </div>

              <button onClick={startGeneration} disabled={isGenerating} className="w-full py-8 bg-indigo-600 hover:bg-indigo-500 rounded-[2rem] font-black text-2xl shadow-2xl transition-all flex items-center justify-center gap-4 relative overflow-hidden group">
                {isGenerating ? status || 'Synthesizing...' : t.btn}
                {isGenerating && <Loader2 className="animate-spin" />}
                {!isGenerating && <span className="absolute right-8 text-[10px] bg-black/20 px-4 py-1.5 rounded-full uppercase tracking-widest group-hover:bg-black/30 transition-all">10 CREDITS</span>}
              </button>
            </div>
          </div>
        )}

        {currentView === 'pricing' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10">
            {PACKAGES.map(pkg => (
              <div key={pkg.id} className={`p-1 rounded-[3.5rem] transition-all hover:scale-[1.02] ${pkg.recommended ? 'bg-gradient-to-b from-indigo-500 to-purple-500 shadow-2xl' : 'bg-slate-800/50'}`}>
                <div className="bg-[#0b0e1a] rounded-[3.4rem] p-12 h-full flex flex-col space-y-10 text-center">
                  <h3 className="text-xl font-black uppercase tracking-widest text-indigo-400">{pkg.name}</h3>
                  <div className="text-6xl font-black">${pkg.price}</div>
                  <button onClick={() => handlePurchase(pkg)} className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest transition-all ${pkg.recommended ? 'bg-indigo-600 shadow-xl shadow-indigo-600/20' : 'bg-slate-800 hover:bg-slate-700'}`}>Buy Credits</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentView === 'library' && (
          <div className="space-y-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <h2 className="text-4xl font-black uppercase tracking-tighter">Vault</h2>
              <button onClick={() => setCurrentView('generate')} className="bg-white text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all">
                <Plus size={16} /> New Render
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {library.map(v => <VideoCard key={v.id} video={v} onDelete={(id) => setLibrary(library.filter(x => x.id !== id))} onExtend={(v) => { setExtendingVideo(v); setCurrentView('generate'); }} onPinReference={(url) => { if(pinnedReferences.length < 3) setPinnedReferences([...pinnedReferences, url]); setCurrentView('generate'); }} />)}
              {library.length === 0 && <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-800 rounded-[3rem] text-slate-600 uppercase font-black">No creations yet</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
