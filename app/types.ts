export interface Word {
  id: string;
  word: string;
  pos: string; // Part of speech, e.g., 'n.', 'v.', 'adj.'
}

export interface UserProgress {
  masteredIds: string[];
  starredIds: string[];
  notes: Record<string, string>; // Maps word ID to user notes/custom definitions
}

export interface ReviewWord {
  id: string;
  word: string;
  pos: string;
  translation: string;
  notes?: string;
  addedAt: string; // ISO string
  isCustom: boolean;
  sourceWordId?: string;
}

export interface GeneralNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string; // ISO string
}

