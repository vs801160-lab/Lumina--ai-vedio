
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GeneratedVideo } from './types';

const getEnv = (key: string) => {
  try {
    return (process.env as any)[key] || '';
  } catch (e) {
    return '';
  }
};

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY');

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

  async signInWithGoogle() {
    if (!this.isConfigured) {
      const mockUser = { 
        id: 'demo-user-123', 
        email: 'demo@lumina.ai', 
        user_metadata: { full_name: 'Lumina Explorer', avatar_url: '' } 
      };
      localStorage.setItem('lumina_user', JSON.stringify(mockUser));
      return { user: mockUser, error: null };
    }
    
    return (this.client!.auth as any).signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  }

  async signOut() {
    localStorage.removeItem('lumina_user');
    if (this.isConfigured) return (this.client!.auth as any).signOut();
  }

  async getUser() {
    const localUser = localStorage.getItem('lumina_user');
    if (localUser) return JSON.parse(localUser);
    
    if (this.isConfigured) {
      try {
        const { data: { user } } = await (this.client!.auth as any).getUser();
        return user;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  async saveVideo(video: GeneratedVideo, userId: string) {
    if (!this.isConfigured || userId === 'anonymous' || userId === 'demo-user-123') {
      const existing = JSON.parse(localStorage.getItem('lumina_library') || '[]');
      localStorage.setItem('lumina_library', JSON.stringify([video, ...existing]));
      return video;
    }

    const { data, error } = await this.client!
      .from('videos')
      .insert([{ ...video, user_id: userId }])
      .select();
    
    if (error) throw error;
    return data[0];
  }

  async fetchVideos(userId: string) {
    if (!this.isConfigured || userId === 'anonymous' || userId === 'demo-user-123') {
      return JSON.parse(localStorage.getItem('lumina_library') || '[]');
    }

    const { data, error } = await this.client!
      .from('videos')
      .select('*')
      .eq('user_id', userId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data;
  }

  async updateCredits(userId: string, newCredits: number) {
    if (!this.isConfigured || userId === 'anonymous' || userId === 'demo-user-123') return;
    await this.client!
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', userId);
  }
}

export const db = new SupabaseService();
