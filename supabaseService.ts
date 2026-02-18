
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GeneratedVideo, Transaction, SubscriptionTier } from './types.ts';

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
      const mockUser = { id: 'demo-user', email: 'demo@lumina.ai', user_metadata: { full_name: 'Demo Creator' } };
      this.safeSetItem('lumina_user', JSON.stringify(mockUser));
      window.location.reload();
      return { user: mockUser, error: null };
    }
    
    const { data, error } = await this.client!.auth.signInWithOAuth({ 
      provider: 'google',
      options: { 
        redirectTo: window.location.origin,
      }
    });
    return { data, error };
  }

  async signOut() {
    try { localStorage.removeItem('lumina_user'); } catch {}
    if (this.isConfigured) await this.client!.auth.signOut();
    window.location.reload();
  }

  async getUser() {
    if (!this.isConfigured) {
      const local = this.safeGetItem('lumina_user');
      return local ? JSON.parse(local) : null;
    }
    const { data: { user } } = await this.client!.auth.getUser();
    return user;
  }

  async getCredits(userId: string): Promise<number> {
    if (!this.isConfigured || userId === 'demo-user') {
      return parseInt(this.safeGetItem('lumina_credits') || '50');
    }
    const { data } = await this.client!.from('profiles').select('credits').eq('id', userId).single();
    return data?.credits ?? 0;
  }

  async getTier(userId: string): Promise<SubscriptionTier> {
    const credits = await this.getCredits(userId);
    if (credits > 500) return SubscriptionTier.ELITE;
    if (credits > 100) return SubscriptionTier.PRO;
    return SubscriptionTier.FREE;
  }

  async updateCredits(userId: string, amount: number, description: string = "Usage") {
    const current = await this.getCredits(userId);
    const updated = current + amount;

    if (!this.isConfigured || userId === 'demo-user') {
      this.safeSetItem('lumina_credits', updated.toString());
      return updated;
    }

    await this.client!.rpc('increment_credits', { user_id: userId, amount: amount });
    await this.client!.from('transactions').insert([{
      userId, type: amount > 0 ? 'purchase' : 'usage',
      amount: Math.abs(amount), creditsBefore: current,
      creditsAfter: updated, description, status: 'completed'
    }]);
    return updated;
  }

  async saveVideo(video: GeneratedVideo, userId: string) {
    const existing = JSON.parse(this.safeGetItem('lumina_library') || '[]');
    this.safeSetItem('lumina_library', JSON.stringify([video, ...existing]));
    
    if (this.isConfigured && userId !== 'demo-user') {
      await this.client!.from('videos').insert([{ ...video, user_id: userId }]);
    }
    return video;
  }

  async fetchVideos(userId: string) {
    if (this.isConfigured && userId !== 'demo-user') {
      const { data } = await this.client!.from('videos').select('*').eq('user_id', userId).order('createdAt', { ascending: false });
      return data || [];
    }
    return JSON.parse(this.safeGetItem('lumina_library') || '[]');
  }

  async fetchPublicVideos() {
    if (this.isConfigured) {
      const { data } = await this.client!.from('videos').select('*').eq('is_public', true).limit(20);
      return data || [];
    }
    return [];
  }

  async updateVideoPrivacy(videoId: string, isPublic: boolean) {
    if (this.isConfigured) await this.client!.from('videos').update({ is_public: isPublic }).eq('id', videoId);
  }

  async deleteVideo(videoId: string) {
    if (this.isConfigured) await this.client!.from('videos').delete().eq('id', videoId);
  }
}

export const db = new SupabaseService();
