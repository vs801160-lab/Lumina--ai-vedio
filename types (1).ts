export type AspectRatio = '16:9' | '9:16' | '1:1';
export type Resolution = '720p' | '1080p';

export interface GeneratedVideo {
  id: string;
  prompt: string;
  url: string;
  audioUrl?: string;
  createdAt: number;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  style?: string;
  apiVideoData?: any;
}

export interface GenerationSettings {
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  style?: string;
  narrationScript?: string;
  voiceId?: string;
  previousVideo?: any;
}

export enum SubscriptionTier {
  FREE = 'Free',
  PRO = 'Pro',
  ELITE = 'Elite'
}

export interface UserProfile {
  credits: number;
  tier: SubscriptionTier;
  isApiKeySelected: boolean;
  appLanguage: 'EN' | 'HI';
}

export interface VisualStyle {
  id: string;
  name: string;
  prompt: string;
  image: string;
}

export interface PlanFeature {
  name: string;
  included: boolean;
}