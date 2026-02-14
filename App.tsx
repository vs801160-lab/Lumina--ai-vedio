
import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import VideoCard from './components/VideoCard';
import { GeminiVideoService } from './geminiService';
import { db } from './supabaseService';
// Removed UserProfile and added Resolution to imports
import { GeneratedVideo, GenerationSettings, SubscriptionTier, Resolution, AspectRatio, VisualStyle, CreditPackage, Transaction } from './types';
import { 
  AlertCircle, Loader2, Zap, Wand2, CheckCircle2, X, Coins, Image as ImageIcon, Languages, Plus, ZapOff
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
  EN: { hero: "CINEMA AI PRO", sub: "Turn words into cinematic reality", btn: "START SYNTHESIS", lang: "HINDI" },
  HI: { hero: "सिनेमा AI प्रो", sub: "अपने शब्दों को हकीकत में बदलें", btn: "वीडियो बनाएँ", lang: "ENGLISH" }
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
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>(STYLES[0]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pinnedReferences, setPinnedReferences] = useState<string[]>([]);
  const [extendingVideo, setExtendingVideo] = useState<GeneratedVideo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const init = async () => {
      const u = await db.getUser();
      setUser(u);
      if (u) updateUserData(u.id);
    };
    init();
  }, []);

  const updateUserData = async (userId: string) => {
    const c = await db.getCredits(userId);
    setCredits(c);
    setTier(await db.getTier(userId));
    setTransactions(await db.fetchTransactions(userId));
    setLibrary(await db.fetchVideos(userId));
  };

  const handlePurchase = async (pkg: CreditPackage) => {
    if (user) {
      const newC = await db.updateCredits(user.id, pkg.credits, `Purchase: ${pkg.name}`);
      setCredits(newC);
      setTransactions(await db.fetchTransactions(user.id));
      alert("Credits Added!");
      setCurrentView('library');
      setVaultTab('history');
    }
  };

  const startGeneration = async () => {
    if (credits < 10) { setCurrentView('pricing'); return; }
    setIsGenerating(true);
    try {
      const { videoUrl, apiVideoData } = await GeminiVideoService.generateVideo({
        prompt, aspectRatio, resolution: '720p',
        style: selectedStyle.prompt,
        image: selectedImage || undefined,
        previousVideo: extendingVideo?.apiVideoData,
        referenceImages: pinnedReferences
      }, setStatus);

      // Added explicit GeneratedVideo type to ensure resolution '720p' is correctly typed
      const newVideo: GeneratedVideo = { id: Math.random().toString(36).substr(2, 9), prompt, url: videoUrl, createdAt: Date.now(), aspectRatio, resolution: '720p', apiVideoData, style: selectedStyle.name };
      await db.saveVideo(newVideo, user?.id || 'demo-user');
      await db.updateCredits(user?.id || 'demo-user', -10, `Generation: ${newVideo.id}`);
      updateUserData(user?.id || 'demo-user');
      setCurrentView('library');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080f] text-white flex flex-col font-sans">
      <Navbar currentView={currentView} onNavigate={setCurrentView} credits={credits} tier={tier} user={user} t={t} onLoginClick={async () => setUser((await db.signInWithGoogle()).user)} onLogout={() => setUser(null)} onBuyCredits={() => setCurrentView('pricing')} />

      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 w-full">
        {currentView === 'generate' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <header className="text-center space-y-4">
              <button onClick={() => setLang(lang === 'EN' ? 'HI' : 'EN')} className="mx-auto flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t.lang} Mode</button>
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 leading-none">{t.hero}</h1>
            </header>
            <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-10 shadow-2xl backdrop-blur-3xl">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t.sub} className="w-full h-44 bg-slate-950/80 border border-slate-800 rounded-3xl p-6 text-lg outline-none mb-8" />
              <button onClick={startGeneration} disabled={isGenerating} className="w-full py-8 bg-indigo-600 rounded-[2rem] font-black text-2xl shadow-2xl transition-all flex items-center justify-center gap-4 relative">
                {isGenerating ? status || 'Synthesizing...' : t.btn}
                {!isGenerating && <span className="absolute right-8 text-[10px] bg-black/20 px-4 py-1.5 rounded-full uppercase">10 CREDITS</span>}
              </button>
            </div>
          </div>
        )}

        {currentView === 'pricing' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10">
            {PACKAGES.map(pkg => (
              <div key={pkg.id} className={`p-1 rounded-[3rem] ${pkg.recommended ? 'bg-indigo-600' : 'bg-slate-800/50'}`}>
                <div className="bg-[#0b0e1a] rounded-[2.9rem] p-10 h-full flex flex-col space-y-10">
                  <h3 className="text-xl font-black uppercase text-indigo-400">{pkg.name}</h3>
                  <div className="text-6xl font-black">${pkg.price}</div>
                  <button onClick={() => handlePurchase(pkg)} className="w-full py-5 rounded-[1.5rem] bg-indigo-600 font-black uppercase">Buy Credits</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentView === 'library' && (
          <div className="space-y-10">
            <div className="flex gap-2">
              <button onClick={() => setVaultTab('videos')} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase ${vaultTab === 'videos' ? 'bg-indigo-600' : 'bg-slate-900 text-slate-500'}`}>Videos</button>
              <button onClick={() => setVaultTab('history')} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase ${vaultTab === 'history' ? 'bg-indigo-600' : 'bg-slate-900 text-slate-500'}`}>History</button>
            </div>
            {vaultTab === 'videos' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {library.map(v => <VideoCard key={v.id} video={v} onDelete={() => {}} onExtend={() => {}} onPinReference={() => {}} />)}
              </div>
            ) : (
              <div className="bg-slate-900/40 rounded-[2.5rem] overflow-hidden border border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/50 text-[10px] font-black uppercase text-slate-500">
                    <tr><th className="px-10 py-6">Activity</th><th className="px-10 py-6">Type</th><th className="px-10 py-6">Credits</th><th className="px-10 py-6">Date</th></tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id} className="border-t border-slate-800/30">
                        <td className="px-10 py-6">{tx.description}</td>
                        <td className="px-10 py-6 uppercase text-[10px] font-black">{tx.type}</td>
                        <td className="px-10 py-6 font-black">{tx.type === 'purchase' ? '+' : '-'}{tx.amount}</td>
                        <td className="px-10 py-6 text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
