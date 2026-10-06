export interface Word {
  id: string;
  word: string;
  pos: string; // Part of speech, e.g., 'n.', 'v.', 'adj.'
  level?: string; // 'A1', 'A2', 'B1', 'B2'
  meaning?: string; // Thai translation from Oxford 3000
  pronunciation?: string; // Thai pronunciation from Oxford 3000
  ipa?: string; // IPA phonetics
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
  thaiPronunciation?: string; // Thai phonetic reading of English word
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
