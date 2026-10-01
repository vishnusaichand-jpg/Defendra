
export type Role = 'user' | 'assistant';

export type PlanType = 'FREE' | 'BASIC' | 'PRO';

export interface GroundingChunk {
  web?: { uri: string; title: string };
  maps?: { uri: string; title: string };
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  groundingLinks?: GroundingChunk[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  plan: PlanType;
  createdDate: number;
  isEmailConfirmed: boolean;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface AuthState {
  user: User | null;
  sessionToken: string | null;
}
