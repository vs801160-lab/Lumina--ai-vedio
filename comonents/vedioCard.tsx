
import React, { useRef, useState } from 'react';
import { GeneratedVideo } from '../types';
import { Download, Trash2, Calendar, Share2, Play, Pause, Music, Timer, UserCheck } from 'lucide-react';

interface VideoCardProps {
  video: GeneratedVideo;
  onDelete: (id: string) => void;
  onExtend: (video: GeneratedVideo) => void;
  onPinReference: (imageUrl: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onDelete, onExtend, onPinReference }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = video.url;
    link.download = `lumina-ai-${video.id}.mp4`;
    link.click();
  };

  const handlePin = () => {
    // In a real app, we'd extract a frame. Here we use a placeholder or the video thumbnail logic.
    // For this demo, we'll notify the user we're pinning the character state.
    onPinReference(video.url);
  };

  return (
    <div className="bg-slate-800/40 rounded-[2rem] overflow-hidden border border-slate-700 hover:border-slate-500 hover:shadow-2xl transition-all group flex flex-col">
      <div className="aspect-video bg-black relative">
        <video 
          ref={videoRef}
          src={video.url} 
          className="w-full h-full object-cover" 
          onEnded={() => setIsPlaying(false)}
          poster={video.url + "#t=0.1"}
        />
        {video.audioUrl && (
          <audio ref={audioRef} src={video.audioUrl} hidden />
        )}
        
        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
          <button 
            onClick={togglePlay}
            className="w-16 h-16 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center transition-all scale-90 hover:scale-100"
          >
            {isPlaying ? <Pause className="text-white fill-current" /> : <Play className="text-white fill-current ml-1" />}
          </button>
        </div>

        {/* Action Badges */}
        <div className="absolute top-4 right-4 flex gap-2">
          {video.audioUrl && (
            <div className="p-2 bg-pink-500 rounded-lg shadow-lg">
              <Music size={14} className="text-white" />
            </div>
          )}
          <button 
            onClick={handleDownload}
            className="p-2 bg-slate-900/80 rounded-lg hover:bg-indigo-600 transition-colors shadow-lg"
          >
            <Download size={14} />
          </button>
        </div>

        <div className="absolute bottom-4 left-4">
          <span className="text-[10px] font-black bg-white/20 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-widest border border-white/10">
            {video.resolution} • {video.style || 'Standard'}
          </span>
        </div>
      </div>

      <div className="p-6 flex-grow flex flex-col">
        <p className="text-sm text-slate-300 line-clamp-2 mb-6 font-medium leading-relaxed italic">
          "{video.prompt}"
        </p>
        
        <div className="mt-auto pt-6 border-t border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar size={12} />
            {dateStr}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePin}
              title="Pin for Consistency"
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
            >
              <UserCheck size={16} />
            </button>
            <button 
              onClick={() => onExtend(video)}
              title="Extend (Pro)"
              className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
            >
              <Timer size={16} />
            </button>
            <button 
              onClick={() => onDelete(video.id)}
              className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
