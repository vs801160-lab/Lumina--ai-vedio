
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GeneratedVideo, UserProfile } from './types';

// Fetching from environment variables injected by Vite/Vercel
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

class SupabaseService {
  private client: SupabaseClient | null = null;
  private isConfigured: boolean = false;

  constructor() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'https://your-project.supabase.co') {
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      this.isConfigured = true;
    }
  }

  async signInWithGoogle() {
    if (!this.isConfigured) {
      console.warn("Supabase not configured. Simulating demo login.");
      const mockUser = { id: 'demo-user-123', email: 'demo@lumina.ai', full_name: 'Lumina Explorer' };
      localStorage.setItem('lumina_user', JSON.stringify(mockUser));
      return { user: mockUser, error: null };
    }
    // Using any to bypass potential typing issues with SupabaseAuthClient in this environment
    return (this.client!.auth as any).signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  }

  async signOut() {
    localStorage.removeItem('lumina_user');
    // Using any to bypass potential typing issues with SupabaseAuthClient
    if (this.isConfigured) return (this.client!.auth as any).signOut();
  }

  async getUser() {
    const localUser = localStorage.getItem('lumina_user');
    if (localUser) return JSON.parse(localUser);
    
    if (this.isConfigured) {
      // Using any to bypass potential typing issues with SupabaseAuthClient
      const { data: { user } } = await (this.client!.auth as any).getUser();
      return user;
    }
    return null;
  }

  async saveVideo(video: GeneratedVideo, userId: string) {
    if (!this.isConfigured) {
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
    if (!this.isConfigured) {
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
    if (!this.isConfigured) return;
    await this.client!
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', userId);
  }
}

export const db = new SupabaseService();
