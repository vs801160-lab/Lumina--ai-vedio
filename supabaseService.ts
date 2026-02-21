
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GeneratedVideo, Transaction, SubscriptionTier } from './types.ts';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

class SupabaseService {
  private client: SupabaseClient | null = null;
  private isConfigured: boolean = false;

  constructor() {
    const isPlaceholder = SUPABASE_URL.includes('your-project-id');
    if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('https://') && !isPlaceholder) {
      try {
        this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.isConfigured = true;
      } catch (e) {
        console.error("Supabase initialization failed", e);
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
      console.warn("Supabase not configured, using mock user.");
      alert("Supabase is not configured. Using Demo Mode. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment variables.");
      const mockUser = { id: 'demo-user', email: 'demo@lumina.ai', user_metadata: { full_name: 'Demo Creator' } };
      this.safeSetItem('lumina_user', JSON.stringify(mockUser));
      window.location.reload();
      return { user: mockUser, error: null };
    }
    
    // Ensure the redirect URL is clean
    const redirectTo = window.location.origin;
    
    try {
      const { data, error } = await this.client!.auth.signInWithOAuth({ 
        provider: 'google',
        options: { 
          redirectTo: redirectTo,
          skipBrowserRedirect: true
        }
      });

      if (error) {
        console.error("Supabase OAuth Error:", error);
        alert(`Sign in failed: ${error.message} (Status: ${error.status})`);
        throw error;
      }

      if (data?.url) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const authWindow = window.open(data.url, 'supabase_auth', `width=${width},height=${height},left=${left},top=${top}`);
        
        if (!authWindow) {
          alert("Popup blocked! Please allow popups for this site.");
        }
      } else {
        throw new Error("No redirect URL received from Supabase.");
      }

      return { data, error: null };
    } catch (error: any) {
      console.error("OAuth Error:", error);
      // If it's a 400, it's likely a config issue on Supabase side
      if (error.status === 400) {
        alert("Supabase returned 400 Bad Request. Check if Google Provider is enabled in Supabase Dashboard and Redirect URLs are configured.");
      }
      return { data: null, error };
    }
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
      const lastLogin = this.safeGetItem('lumina_last_login');
      const today = new Date().toDateString();
      
      if (lastLogin !== today) {
        const current = parseInt(this.safeGetItem('lumina_credits') || '50');
        const updated = current + 5; // Daily 5 credits bonus
        this.safeSetItem('lumina_credits', updated.toString());
        this.safeSetItem('lumina_last_login', today);
        return updated;
      }
      return parseInt(this.safeGetItem('lumina_credits') || '50');
    }
    try {
      // For real DB, we could implement a similar logic with a 'last_login' column
      const { data, error } = await this.client!.from('profiles').select('credits').eq('id', userId).single();
      if (error) throw error;
      return data?.credits ?? 0;
    } catch (e) {
      console.error("Failed to fetch credits", e);
      return 0;
    }
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

    try {
      await this.client!.rpc('increment_credits', { user_id: userId, amount: amount });
      await this.client!.from('transactions').insert([{
        userId, type: amount > 0 ? 'purchase' : 'usage',
        amount: Math.abs(amount), creditsBefore: current,
        creditsAfter: updated, description, status: 'completed'
      }]);
    } catch (e) {
      console.error("Failed to update credits in DB", e);
    }
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
      try {
        const { data } = await this.client!.from('videos').select('*').eq('user_id', userId).order('createdAt', { ascending: false });
        return data || [];
      } catch (e) {
        console.error("Failed to fetch videos", e);
        return [];
      }
    }
    try {
      return JSON.parse(this.safeGetItem('lumina_library') || '[]');
    } catch {
      return [];
    }
  }

  async fetchPublicVideos() {
    if (this.isConfigured) {
      try {
        const { data } = await this.client!.from('videos').select('*').eq('is_public', true).limit(20);
        return data || [];
      } catch (e) {
        console.error("Public videos fetch failed", e);
        return [];
      }
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
