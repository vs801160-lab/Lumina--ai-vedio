
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GeneratedVideo, UserProfile } from './types';

// These would normally be environment variables
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

class SupabaseService {
  private client: SupabaseClient | null = null;
  private isConfigured: boolean = false;

  constructor() {
    // In a real app, we check if keys exist
    if (SUPABASE_URL !== 'https://your-project.supabase.co') {
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      this.isConfigured = true;
    }
  }

  // Mock Authentication for demonstration
  async signInWithGoogle() {
    if (!this.isConfigured) {
      // Simulate login for the demo environment
      console.warn("Supabase not configured. Simulating demo login.");
      const mockUser = { id: 'demo-user-123', email: 'demo@lumina.ai', full_name: 'Lumina Explorer' };
      localStorage.setItem('lumina_user', JSON.stringify(mockUser));
      return { user: mockUser, error: null };
    }
    return this.client!.auth.signInWithOAuth({ provider: 'google' });
  }

  async signOut() {
    localStorage.removeItem('lumina_user');
    if (this.isConfigured) return this.client!.auth.signOut();
  }

  async getUser() {
    const localUser = localStorage.getItem('lumina_user');
    if (localUser) return JSON.parse(localUser);
    return null;
  }

  async saveVideo(video: GeneratedVideo, userId: string) {
    if (!this.isConfigured) {
      // Fallback to localStorage if no DB
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
