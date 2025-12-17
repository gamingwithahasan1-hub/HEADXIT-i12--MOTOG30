export enum Subject {
  MATH = 'MATH',
  PHYSICS = 'PHYSICS',
  CHEMISTRY = 'CHEMISTRY',
  ENGLISH = 'ENGLISH',
  GENERAL = 'GENERAL'
}

export interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface Message {
  role: 'user' | 'model';
  parts: MessagePart[];
  timestamp: number;
  isError?: boolean;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export type ThinkingLevel = 'none' | 'moderate' | 'deep';