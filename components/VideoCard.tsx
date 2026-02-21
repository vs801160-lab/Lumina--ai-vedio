
import React, { useRef, useState } from 'react';
import { GeneratedVideo } from '../types';
import { Download, Trash2, Calendar, Play, Pause, Music, Timer, UserCheck, Maximize2, Share2, Eye, EyeOff } from 'lucide-react';

interface VideoCardProps {
  video: GeneratedVideo;
  onDelete: (id: string) => void;
  onExtend: (video: GeneratedVideo) => void;
  onPinReference: (imageUrl: string) => void;
  onTogglePublic?: (id: string, val: boolean) => void;
  isExplore?: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onDelete, onExtend, onPinReference, onTogglePublic, isExplore }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPublic, setIsPublic] = useState((video as any).isPublic || false);
  const dateStr = new Date(video.createdAt).toLocaleDateString();

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        audioRef.current?.pause();
      } else {
        videoRef.current.play();
        if (audioRef.current) audioRef.current.currentTime = videoRef.current.currentTime;
        audioRef.current?.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleToggle = () => {
    const newVal = !isPublic;
    setIsPublic(newVal);
    onTogglePublic?.(video.id, newVal);
  };

  return (
    <div className="bg-slate-900/60 rounded-[2.5rem] overflow-hidden border border-slate-800 hover:border-indigo-500/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.1)] transition-all group flex flex-col">
      <div className="aspect-video bg-black relative overflow-hidden">
        <video 
          ref={videoRef} 
          src={video.url} 
          className={`w-full h-full object-cover transition-all duration-700 ease-out ${isPlaying ? 'opacity-100 scale-100 brightness-100' : 'opacity-90 scale-105 brightness-75'}`} 
          onEnded={() => setIsPlaying(false)} 
          poster={video.url + "#t=0.5"} 
        />
        {video.audioUrl && <audio ref={audioRef} src={video.audioUrl} />}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 bg-black/40 backdrop-blur-[1px] ${isPlaying ? 'opacity-0' : 'opacity-100 group-hover:opacity-100'}`}>
          <button onClick={togglePlay} className="w-16 h-16 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center transition-all scale-90 hover:scale-100 backdrop-blur-md shadow-2xl">
            {isPlaying ? <Pause className="text-white fill-current" /> : <Play className="text-white fill-current ml-1" />}
          </button>
        </div>
        {!isExplore && (
          <button onClick={handleToggle} className={`absolute top-4 left-4 p-2.5 rounded-xl border transition-all ${isPublic ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-950/60 border-slate-800 text-slate-500'}`}>
            {isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        )}
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => { const l = document.createElement('a'); l.href = video.url; l.download = `vid-${video.id}.mp4`; l.click(); }} className="p-2.5 bg-slate-900/80 backdrop-blur-md rounded-xl hover:bg-indigo-600 transition-colors border border-white/10"><Download size={14} /></button>
        </div>
      </div>
      <div className="p-7 flex-grow flex flex-col">
        <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">{video.aspectRatio} Render</h4>
        <p className="text-sm text-slate-300 line-clamp-2 mb-4 font-medium leading-relaxed italic opacity-80">"{video.prompt}"</p>
        
        {video.directorsNote && (
          <div className="mb-8 p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50 relative group/note">
            <div className="absolute -top-2 -left-2 px-2 py-0.5 bg-indigo-600 rounded-md text-[8px] font-black uppercase tracking-tighter">Director's Note</div>
            <p className="text-[11px] text-slate-400 leading-relaxed italic">
              {video.directorsNote}
            </p>
          </div>
        )}

        <div className="mt-auto pt-6 border-t border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter"><Calendar size={12} />{dateStr}</div>
          {!isExplore && (
            <div className="flex items-center gap-1">
              <button onClick={() => onPinReference(video.url)} title="Pin Character" className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"><UserCheck size={18} /></button>
              <button onClick={() => onExtend(video)} title="Extend" className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all"><Timer size={18} /></button>
              <button onClick={() => onDelete(video.id)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={18} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
