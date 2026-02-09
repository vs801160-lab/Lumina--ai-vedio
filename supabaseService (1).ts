
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GeneratedVideo } from './types';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

class SupabaseService {
  private client: SupabaseClient | null = null;
  private isConfigured: boolean = false;

  constructor() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-project')) {
      try {
        this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.isConfigured = true;
      } catch (e) {
        console.error("Supabase init error", e);
      }
    }
  }

  private safeGetItem(key: string) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private safeSetItem(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch { }
  }

  async signInWithGoogle() {
    if (!this.isConfigured) {
      const mockUser = { 
        id: 'demo-' + Math.random().toString(36).substr(2, 5), 
        email: 'mobile-user@lumina.ai', 
        user_metadata: { full_name: 'Lumina Creator', avatar_url: '' } 
      };
      this.safeSetItem('lumina_user', JSON.stringify(mockUser));
      return { user: mockUser, error: null };
    }
    
    return this.client!.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  }

  async signOut() {
    try { localStorage.removeItem('lumina_user'); } catch {}
    if (this.isConfigured) return this.client!.auth.signOut();
  }

  async getUser() {
    const localUser = this.safeGetItem('lumina_user');
    if (localUser) return JSON.parse(localUser);
    
    if (this.isConfigured) {
      try {
        const { data: { user } } = await this.client!.auth.getUser();
        if (user) this.safeSetItem('lumina_user', JSON.stringify(user));
        return user;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  async saveVideo(video: GeneratedVideo, userId: string) {
    const existing = JSON.parse(this.safeGetItem('lumina_library') || '[]');
    this.safeSetItem('lumina_library', JSON.stringify([video, ...existing]));

    if (this.isConfigured && userId !== 'anonymous' && !userId.startsWith('demo-')) {
      try {
        await this.client!.from('videos').insert([{ ...video, user_id: userId }]);
      } catch (e) {
        console.warn("DB Save failed.");
      }
    }
    return video;
  }

  async fetchVideos(userId: string) {
    const localVideos = JSON.parse(this.safeGetItem('lumina_library') || '[]');
    if (this.isConfigured && userId !== 'anonymous' && !userId.startsWith('demo-')) {
      try {
        const { data } = await this.client!
          .from('videos')
          .select('*')
          .eq('user_id', userId)
          .order('createdAt', { ascending: false });
        if (data && data.length > 0) return data;
      } catch (e) {
        return localVideos;
      }
    }
    return localVideos;
  }
}

export const db = new SupabaseService();
