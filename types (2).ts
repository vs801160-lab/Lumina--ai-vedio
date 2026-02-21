
export type AspectRatio = '16:9' | '9:16';
export type Resolution = '720p' | '1080p';

export interface VisualStyle {
  id: string;
  name: string;
  prompt: string;
  image: string;
}

export interface StoryboardScene {
  id: string;
  title: string;
  prompt: string;
  shotType: string;
  status: 'pending' | 'generating' | 'completed';
  videoUrl?: string;
  audioUrl?: string;
  audioStatus?: 'pending' | 'generating' | 'completed';
}

export interface GenerationSettings {
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  style?: string;
  image?: string;
  previousVideo?: any;
  referenceImages?: string[];
}

export interface GeneratedVideo {
  id: string;
  prompt: string;
  url: string;
  createdAt: number;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  style?: string;
  apiVideoData?: any;
  audioUrl?: string;
  directorsNote?: string;
  type?: 'video' | 'image';
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  features: string[];
  recommended?: boolean;
}

export enum SubscriptionTier {
  FREE = 'Free',
  PRO = 'Pro',
  ELITE = 'Elite'
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'purchase' | 'usage';
  amount: number; 
  creditsBefore: number;
  creditsAfter: number;
  description: string;
  status: 'completed' | 'failed';
  createdAt: number;
}
