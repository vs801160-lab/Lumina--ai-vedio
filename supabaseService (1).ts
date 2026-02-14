
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GeneratedVideo, Transaction, SubscriptionTier } from './types';

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
        id: 'demo-user', 
        email: 'creator@lumina.ai', 
        user_metadata: { full_name: 'Lumina Creator' } 
      };
      this.safeSetItem('lumina_user', JSON.stringify(mockUser));
      return { user: mockUser, error: null };
    }
    return (this.client!.auth as any).signInWithOAuth({ 
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  }

  async signOut() {
    try { localStorage.removeItem('lumina_user'); } catch {}
    if (this.isConfigured) return (this.client!.auth as any).signOut();
  }

  async getUser() {
    const localUser = this.safeGetItem('lumina_user');
    if (localUser) return JSON.parse(localUser);
    if (this.isConfigured) {
      const { data: { user } } = await (this.client!.auth as any).getUser();
      return user;
    }
    return null;
  }

  async getCredits(userId: string): Promise<number> {
    if (!this.isConfigured || userId === 'demo-user') {
      const saved = this.safeGetItem('lumina_credits');
      return saved ? parseInt(saved) : 50;
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
    
    // Log transaction
    const transaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      type: amount > 0 ? 'purchase' : 'usage',
      amount: Math.abs(amount),
      creditsBefore: current,
      creditsAfter: updated,
      description,
      status: 'completed',
      createdAt: Date.now()
    };
    await this.recordTransaction(transaction);

    if (!this.isConfigured || userId === 'demo-user') {
      this.safeSetItem('lumina_credits', updated.toString());
      return updated;
    }
    const { data } = await this.client!.rpc('increment_credits', { user_id: userId, amount: amount });
    return data || updated;
  }

  async recordTransaction(transaction: Transaction) {
    const existing = JSON.parse(this.safeGetItem('lumina_transactions') || '[]');
    this.safeSetItem('lumina_transactions', JSON.stringify([transaction, ...existing]));
    
    if (this.isConfigured) {
      await this.client!.from('transactions').insert([transaction]);
    }
  }

  async fetchTransactions(userId: string): Promise<Transaction[]> {
    const local = JSON.parse(this.safeGetItem('lumina_transactions') || '[]');
    if (this.isConfigured && userId !== 'demo-user') {
      const { data } = await this.client!.from('transactions').select('*').eq('userId', userId).order('createdAt', { ascending: false });
      return data || local;
    }
    return local;
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
    const localVideos = JSON.parse(this.safeGetItem('lumina_library') || '[]');
    if (this.isConfigured && userId !== 'demo-user') {
      const { data } = await this.client!.from('videos').select('*').eq('user_id', userId).order('createdAt', { ascending: false });
      return data || localVideos;
    }
    return localVideos;
  }
}

export const db = new SupabaseService();
