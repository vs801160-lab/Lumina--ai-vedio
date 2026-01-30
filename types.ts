
export type AspectRatio = '16:9' | '9:16' | '1:1';
export type Resolution = '720p' | '1080p';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'Male' | 'Female' | 'Neutral';
}

export interface LanguageOption {
  id: string;
  name: string;
  native: string;
  code: string;
}

export interface GeneratedVideo {
  id: string;
  prompt: string;
  url: string;
  audioUrl?: string;
  createdAt: number;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  style?: string;
  ambiance?: string;
  apiVideoData?: any;
}

export interface GenerationSettings {
  prompt: string;
  negativePrompt?: string;
  motionStrength?: number;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  style?: string;
  characterCues?: string;
  ambiance?: string;
  narrationScript?: string;
  voiceId?: string;
  languageId?: string;
  autoGenerateScript?: boolean;
  startImage?: string;
  endImage?: string;
  referenceImages?: string[];
  previousVideo?: any;
}

export enum SubscriptionTier {
  FREE = 'Free',
  PRO = 'Pro',
  ENTERPRISE = 'Enterprise'
}

export interface UserProfile {
  credits: number;
  tier: SubscriptionTier;
  isApiKeySelected: boolean;
  pinnedReferences: string[];
  appLanguage: 'EN' | 'HI';
}

export interface VisualStyle {
  id: string;
  name: string;
  prompt: string;
  image: string;
}
