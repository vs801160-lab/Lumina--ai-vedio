
import React from 'react';
import { Play, Video, LayoutDashboard, User, LogOut, Plus, Zap, CreditCard, Crown, Globe } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  credits: number;
  tier: string;
  t: any;
  user: any;
  onLoginClick: () => void;
  onLogout: () => void;
  onBuyCredits: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, credits, tier, t, user, onLoginClick, onLogout, onBuyCredits }) => {
  const navItems = [
    { id: 'generate', label: 'Studio', icon: Video },
    { id: 'explore', label: 'Explore', icon: Globe },
    { id: 'library', label: 'Vault', icon: LayoutDashboard },
    { id: 'pricing', label: 'Pricing', icon: CreditCard },
  ];

  // Get user name or email prefix
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";

  return (
    <nav className="sticky top-0 z-[70] bg-[#080c16]/80 backdrop-blur-xl border-b border-slate-800/50 px-4 md:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('generate')}>
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-2xl shadow-indigo-600/40 group-hover:scale-110 transition-transform">
          <Play className="text-white w-5 h-5 fill-current" />
        </div>
        <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase hidden sm:block">Lumina <span className="text-indigo-500">Video</span></h1>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => onNavigate(item.id)} className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all font-bold text-[10px] uppercase tracking-widest ${currentView === item.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-slate-500 hover:text-white hover:bg-slate-800/50'}`}>
              <item.icon size={14} />{item.label}
            </button>
          ))}
        </div>

        <div onClick={onBuyCredits} className="cursor-pointer bg-slate-900 border border-slate-800 px-3 md:px-4 py-1.5 rounded-2xl flex items-center gap-2 md:gap-3 hover:border-indigo-500/50 transition-all">
          <div className="flex flex-col"><span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-tight">Credits</span><span className="text-xs font-black text-indigo-400 leading-none">{credits}</span></div>
          <div className="bg-indigo-600 p-1 rounded-lg text-white"><Plus size={10} /></div>
        </div>
        
        {user ? (
          <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-black text-white uppercase tracking-tight">{userName}</span>
              <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">{tier}</span>
            </div>
            <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-indigo-400 border border-slate-700">
               <User size={14} />
            </div>
            <button onClick={onLogout} className="p-2 text-slate-500 hover:text-red-400 transition-colors"><LogOut size={16} /></button>
          </div>
        ) : (
          <button onClick={onLoginClick} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all shadow-xl shadow-indigo-600/20 active:scale-95">SIGN IN</button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
