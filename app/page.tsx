"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { VOCAB } from "./vocab";
import { Word, UserProgress, ReviewWord, GeneralNote } from "./types";
import { CardData, generateFallbackCard } from "./utils/fallbackGenerator";
import CardNoteEditor, { hasCardNoteContent, getNotePlainText } from "./components/CardNoteEditor";

// 10 Natural AI Neural Voices (100% Free via Edge Neural TTS)
export const AVAILABLE_VOICES = [
  // US Female (4 voices)
  { id: "en-US-AvaNeural", name: "Ava", desc: "อบอุ่น เป็นธรรมชาติ", gender: "female", region: "US", flag: "🇺🇸" },
  { id: "en-US-JennyNeural", name: "Jenny", desc: "สดใส มีชีวิตชีวา", gender: "female", region: "US", flag: "🇺🇸" },
  { id: "en-US-EmmaNeural", name: "Emma", desc: "หวาน นุ่ม เล่าเรื่องเพลิน", gender: "female", region: "US", flag: "🇺🇸" },
  { id: "en-US-AriaNeural", name: "Aria", desc: "คมชัด ฉะฉาน มาตรฐาน", gender: "female", region: "US", flag: "🇺🇸" },
  // US Male (4 voices)
  { id: "en-US-GuyNeural", name: "Guy", desc: "สบายๆ สไตล์เพื่อนคุย", gender: "male", region: "US", flag: "🇺🇸" },
  { id: "en-US-AndrewNeural", name: "Andrew", desc: "อบอุ่น นุ่มนวล สดใส", gender: "male", region: "US", flag: "🇺🇸" },
  { id: "en-US-ChristopherNeural", name: "Christopher", desc: "ทุ้มนุ่ม สุภาพ น่าฟัง", gender: "male", region: "US", flag: "🇺🇸" },
  { id: "en-US-BrianNeural", name: "Brian", desc: "สุภาพ ชัดถ้อยชัดคำ", gender: "male", region: "US", flag: "🇺🇸" },
  // UK British (2 voices)
  { id: "en-GB-SoniaNeural", name: "Sonia", desc: "บริติช ชัดเจน หรูหรา", gender: "female", region: "UK", flag: "🇬🇧" },
  { id: "en-GB-RyanNeural", name: "Ryan", desc: "บริติช ทุ้มนุ่มลึก", gender: "male", region: "UK", flag: "🇬🇧" },
] as const;

export default function Home() {
  // Tab state: 'dashboard' | 'flashcards' | 'quiz' | 'explorer' | 'review' | 'notes' | 'customWords'
  const [activeTab, setActiveTab] = useState<"dashboard" | "flashcards" | "quiz" | "explorer" | "review" | "notes" | "customWords">("dashboard");

  // Global Progress State
  const [progress, setProgress] = useState<UserProgress>({
    masteredIds: [],
    starredIds: [],
    notes: {},
  });

  // Database cache of generated sentence data
  const [cardCache, setCardCache] = useState<Record<string, CardData>>({});

  // Review list and notebook notes
  const [reviewWords, setReviewWords] = useState<ReviewWord[]>([]);
  const [generalNotes, setGeneralNotes] = useState<GeneralNote[]>([]);

  // Active card data for flashcards
  const [activeCardData, setActiveCardData] = useState<CardData | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Story sentence length preference: 'normal' (4-6 words) | 'longer' (6-9 words)
  const [storyLengthMode, setStoryLengthMode] = useState<"normal" | "longer">("normal");

  // Edge TTS Audio State and in-memory Cache
  const ttsAudioCache = useRef<Map<string, string>>(new Map());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [ttsSpeakingText, setTtsSpeakingText] = useState<string | null>(null);
  const [ttsVoice, setTtsVoice] = useState<string>("en-US-AvaNeural");
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const voiceDropdownRef = useRef<HTMLDivElement | null>(null);
  const [audioLearningMode, setAudioLearningMode] = useState<"shadowing" | "flow" | "slow">("flow");

  // States for restoring session and search in card section
  const [lastWordIdToRestore, setLastWordIdToRestore] = useState<string | null>(null);
  const [hasLoadedSession, setHasLoadedSession] = useState(false);
  const isRestoringRef = useRef(true);
  const [flashcardSearchQuery, setFlashcardSearchQuery] = useState("");
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  // Quiz pool type: 'unmastered' | 'mastered'
  const [quizPoolType, setQuizPoolType] = useState<"unmastered" | "mastered">("unmastered");

  // Word translation states
  const [wordToTranslate, setWordToTranslate] = useState("");
  const [editingReviewWordId, setEditingReviewWordId] = useState<string | null>(null);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationResult, setTranslationResult] = useState<any>(null);

  // Custom word inputs
  const [customWordInput, setCustomWordInput] = useState("");
  const [customWordPos, setCustomWordPos] = useState("n.");
  const [customWordTranslation, setCustomWordTranslation] = useState("");
  const [customWordPronunciation, setCustomWordPronunciation] = useState("");
  const isGeneratingRef = useRef(false);

  // Notebook editor states
  const [noteEditId, setNoteEditId] = useState<string | null>(null);
  const [noteTitleInput, setNoteTitleInput] = useState("");
  const [noteContentInput, setNoteContentInput] = useState("");
  const [noteSearchQuery, setNoteSearchQuery] = useState("");

  // Review filters
  const [reviewFilter, setReviewFilter] = useState<"all" | "base" | "custom">("all");
  const [reviewSearchQuery, setReviewSearchQuery] = useState("");
  const [showReviewPronunciation, setShowReviewPronunciation] = useState(true);
  const [showReviewTranslation, setShowReviewTranslation] = useState(true);
  const [revealedReviewIds, setRevealedReviewIds] = useState<string[]>([]);
  const [customSearchQuery, setCustomSearchQuery] = useState("");

  // Cloud Sync state: 'idle' | 'syncing' | 'synced' | 'error'
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const localLastWordUpdatedAtRef = useRef<number>(0);
  const lastSyncedWordIdRef = useRef<string | null>(null);
  const lastSyncedDeckRef = useRef<string | null>(null);

  // Helper to validate cached card format
  const isCardValidAndNew = (card: CardData | undefined) => {
    if (!card || !Array.isArray(card.sentences) || card.sentences.length === 0) return false;
    if (card.isFallback) return false;
    if (card.wordTranslation && card.wordTranslation.includes("คำแปลของ")) return false;
    return true;
  };

  // Bidirectional cloud sync with Supabase (stats, sentences, AND current card position!)
  const syncWithCloud = useCallback(async (isManual: boolean = false) => {
    try {
      if (isManual) setSyncStatus("syncing");
      const res = await fetch("/api/db?t=" + Date.now(), {
        headers: { "Cache-Control": "no-cache" }
      });
      if (!res.ok) throw new Error("Failed to load backend database");
      const data = await res.json();

      const dbProgress = data.progress || { masteredIds: [], starredIds: [], notes: {} };
      const dbCache = data.cardCache || {};
      const dbReviewWords = data.reviewWords || [];
      const dbGeneralNotes = data.generalNotes || [];

      // 1. Progress: Union of mastered and starred IDs (ensures device progress combines seamlessly)
      setProgress((prev) => {
        const mergedMastered = Array.from(new Set([...(prev.masteredIds || []), ...(dbProgress.masteredIds || [])]));
        const mergedStarred = Array.from(new Set([...(prev.starredIds || []), ...(dbProgress.starredIds || [])]));
        const mergedNotes = { ...(dbProgress.notes || {}), ...(prev.notes || {}) };
        const merged: UserProgress = {
          masteredIds: mergedMastered,
          starredIds: mergedStarred,
          notes: mergedNotes,
          lastWordId: dbProgress.lastWordId || prev.lastWordId,
          lastWordUpdatedAt: Math.max(dbProgress.lastWordUpdatedAt || 0, prev.lastWordUpdatedAt || 0),
          deckType: dbProgress.deckType || prev.deckType
        };
        try {
          localStorage.setItem("lexiflow_progress", JSON.stringify(merged));
        } catch (_) {}
        return merged;
      });

      // 2. Card Cache: Merge cards (cloud cards take priority so phone, iPad & PC share identical generated sentences)
      setCardCache((prev) => {
        const merged: Record<string, CardData> = {};
        for (const k in prev) {
          if (isCardValidAndNew(prev[k])) {
            merged[k] = prev[k];
          }
        }
        for (const k in dbCache) {
          if (isCardValidAndNew(dbCache[k])) {
            merged[k] = dbCache[k];
          }
        }
        try {
          localStorage.setItem("lexiflow_card_cache", JSON.stringify(merged));
        } catch (_) {}
        return merged;
      });

      // 3. Review Words: Union by word lowercase
      setReviewWords((prev) => {
        const reviewMap = new Map<string, ReviewWord>();
        dbReviewWords.forEach((rw: ReviewWord) => reviewMap.set(rw.word.toLowerCase(), rw));
        prev.forEach((rw: ReviewWord) => reviewMap.set(rw.word.toLowerCase(), rw));
        const merged = Array.from(reviewMap.values()).sort(
          (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        );
        try {
          localStorage.setItem("lexiflow_review_words", JSON.stringify(merged));
        } catch (_) {}
        return merged;
      });

      // 4. General Notes: Union by ID
      setGeneralNotes((prev) => {
        const notesMap = new Map<string, GeneralNote>();
        dbGeneralNotes.forEach((n: GeneralNote) => notesMap.set(n.id, n));
        prev.forEach((n: GeneralNote) => notesMap.set(n.id, n));
        const merged = Array.from(notesMap.values()).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        try {
          localStorage.setItem("lexiflow_general_notes", JSON.stringify(merged));
        } catch (_) {}
        return merged;
      });

      // 5. Sync current card position & deck across PC, Phone, and iPad
      if (dbProgress.lastWordId) {
        const cloudTs = dbProgress.lastWordUpdatedAt || 0;
        const localTs = localLastWordUpdatedAtRef.current || 0;
        const localSavedId = typeof window !== "undefined" ? localStorage.getItem("lexiflow_last_word_id") : null;

        // Follow cloud position if cloud is newer OR if this device hasn't navigated yet
        if (cloudTs > localTs || !localSavedId) {
          localLastWordUpdatedAtRef.current = cloudTs || Date.now();
          lastSyncedWordIdRef.current = dbProgress.lastWordId;
          if (dbProgress.deckType) {
            lastSyncedDeckRef.current = dbProgress.deckType;
          }
          try {
            localStorage.setItem("lexiflow_last_word_id", dbProgress.lastWordId);
            localStorage.setItem("lexiflow_last_word_updated_at", String(localLastWordUpdatedAtRef.current));
            if (dbProgress.deckType) {
              localStorage.setItem("lexiflow_deck_type", dbProgress.deckType);
            }
          } catch (_) {}

          isRestoringRef.current = true;
          if (dbProgress.deckType) {
            setFlashcardDeckType(dbProgress.deckType as any);
          }
          setLastWordIdToRestore(dbProgress.lastWordId);
        }
      }

      setSyncStatus("synced");
      setLastSyncTime(new Date());
    } catch (e) {
      console.warn("Failed to sync with cloud DB", e);
      setSyncStatus("error");
    } finally {
      setHasLoadedSession(true);
    }
  }, []);

  // Auto-sync when switching between apps/tabs (phone unlock, switching browser tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncWithCloud(false);
      }
    };
    const handleFocus = () => {
      syncWithCloud(false);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncWithCloud]);

  // Initial load: restore local settings, load localStorage cache, then sync from cloud
  useEffect(() => {
    // 1. Restore deck settings and session
    try {
      const savedDeckType = localStorage.getItem("lexiflow_deck_type");
      if (savedDeckType) {
        setFlashcardDeckType(savedDeckType as any);
        lastSyncedDeckRef.current = savedDeckType;
      }
      const savedLastWordUpdatedAt = Number(localStorage.getItem("lexiflow_last_word_updated_at") || "0");
      if (savedLastWordUpdatedAt > 0) {
        localLastWordUpdatedAtRef.current = savedLastWordUpdatedAt;
      }
      const savedLastWordId = localStorage.getItem("lexiflow_last_word_id");
      if (savedLastWordId) {
        lastSyncedWordIdRef.current = savedLastWordId;
        setLastWordIdToRestore(savedLastWordId);
      } else {
        isRestoringRef.current = false;
      }
    } catch (e) {
      console.error("Failed to restore initial session settings", e);
      isRestoringRef.current = false;
    }

    // 2. Load from localStorage first to prevent UI delay and ensure no data is lost
    try {
      const savedProgress = localStorage.getItem("lexiflow_progress");
      const savedCache = localStorage.getItem("lexiflow_card_cache");
      const savedReview = localStorage.getItem("lexiflow_review_words");
      const savedNotes = localStorage.getItem("lexiflow_general_notes");
      const savedStoryLength = localStorage.getItem("lexiflow_story_length_mode") as "normal" | "longer" | null;

      if (savedStoryLength === "longer" || savedStoryLength === "normal") {
        setStoryLengthMode(savedStoryLength);
      }

      const savedVoice = localStorage.getItem("lexiflow_tts_voice");
      if (savedVoice && AVAILABLE_VOICES.some((v) => v.id === savedVoice)) {
        setTtsVoice(savedVoice);
      }

      const savedAudioMode = localStorage.getItem("lexiflow_audio_mode") as "shadowing" | "flow" | "slow" | null;
      if (savedAudioMode === "shadowing" || savedAudioMode === "flow" || savedAudioMode === "slow") {
        setAudioLearningMode(savedAudioMode);
      }

      if (savedProgress) {
        setProgress(JSON.parse(savedProgress));
      }
      if (savedCache) {
        try {
          setCardCache(JSON.parse(savedCache));
        } catch (e) {
          console.error("Failed to parse cached cards", e);
        }
      }
      if (savedReview) {
        setReviewWords(JSON.parse(savedReview));
      }
      if (savedNotes) {
        setGeneralNotes(JSON.parse(savedNotes));
      }
    } catch (e) {
      console.error("Failed to load initial localStorage state", e);
    }

    // 3. Perform seamless cloud sync
    syncWithCloud(false);
  }, [syncWithCloud]);

  // Close voice dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(e.target as Node)) {
        setIsVoiceDropdownOpen(false);
      }
    };
    if (isVoiceDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVoiceDropdownOpen]);

  // Save card cache using partial patches (never overwrite cloud DB with temporary fallback cards)
  const addCardToCache = (wordId: string, cardData: CardData) => {
    setCardCache((prevCache) => {
      const updatedCache = { ...prevCache, [wordId]: cardData };
      if (!cardData.isFallback) {
        try {
          localStorage.setItem("lexiflow_card_cache", JSON.stringify(updatedCache));
        } catch (_) {}
        fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardCachePatch: { [wordId]: cardData } })
        }).catch((e) => {
          console.error("Failed to save card cache to server DB", e);
        });
      }
      return updatedCache;
    });
  };

  const updateProgress = (updater: (prev: UserProgress) => UserProgress) => {
    setProgress((prevProgress) => {
      const updatedProgress = updater(prevProgress);
      localStorage.setItem("lexiflow_progress", JSON.stringify(updatedProgress));
      fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: updatedProgress, replaceProgress: true })
      }).catch((e) => {
        console.error("Failed to save progress to server DB", e);
      });
      return updatedProgress;
    });
  };

  const updateReviewWordsInDb = (updatedList: ReviewWord[]) => {
    localStorage.setItem("lexiflow_review_words", JSON.stringify(updatedList));
    fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewWords: updatedList, replaceReviewWords: true })
    }).catch((e) => {
      console.error("Failed to save review words to server DB", e);
    });
  };

  const updateGeneralNotesInDb = (updatedList: GeneralNote[]) => {
    localStorage.setItem("lexiflow_general_notes", JSON.stringify(updatedList));
    fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generalNotes: updatedList, replaceGeneralNotes: true })
    }).catch((e) => {
      console.error("Failed to save general notes to server DB", e);
    });
  };

  const addWordToReviewList = (
    wordText: string,
    wordPos: string,
    wordTranslation: string,
    sourceWordId?: string,
    isCustom = false,
    thaiPronunciation?: string
  ) => {
    const cleanWord = wordText.trim();
    const cleanTrans = wordTranslation.trim();
    if (!cleanWord) return;

    const existsIndex = reviewWords.findIndex((rw) => rw.word.toLowerCase() === cleanWord.toLowerCase());
    let updatedList: ReviewWord[];

    if (existsIndex >= 0) {
      updatedList = reviewWords.map((rw, idx) =>
        idx === existsIndex
          ? {
              ...rw,
              pos: wordPos || rw.pos,
              translation: cleanTrans || rw.translation,
              thaiPronunciation: thaiPronunciation !== undefined ? thaiPronunciation.trim() : rw.thaiPronunciation
            }
          : rw
      );
    } else {
      const newReviewWord: ReviewWord = {
        id: `rw-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        word: cleanWord,
        pos: wordPos || "n.",
        translation: cleanTrans || "คำแปลของคำนี้",
        thaiPronunciation: thaiPronunciation ? thaiPronunciation.trim() : "",
        addedAt: new Date().toISOString(),
        isCustom,
        sourceWordId
      };
      updatedList = [newReviewWord, ...reviewWords];
    }

    setReviewWords(updatedList);
    updateReviewWordsInDb(updatedList);
  };

  const openEditReviewWord = (rw: ReviewWord) => {
    setEditingReviewWordId(rw.id);
    setWordToTranslate(rw.word);
    setCustomWordInput(rw.word);
    setCustomWordPos(rw.pos || "n.");
    setCustomWordPronunciation(rw.thaiPronunciation || "");
    setCustomWordTranslation(rw.translation || "");
    setTranslationLoading(false);
    setShowTranslateModal(true);
  };

  const retranslateWithAI = (wordOverride?: string) => {
    const targetWord = wordOverride || customWordInput.trim() || wordToTranslate.trim();
    if (!targetWord) return;
    setTranslationLoading(true);
    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "translate", word: targetWord })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.pos) setCustomWordPos(data.pos);
        if (data.translation) setCustomWordTranslation(data.translation);
        if (data.thaiPronunciation) setCustomWordPronunciation(data.thaiPronunciation);
      })
      .catch((e) => {
        console.error("Translation API failed", e);
      })
      .finally(() => {
        setTranslationLoading(false);
      });
  };

  const openTranslationModal = (wordText: string, prefilledPron = "", prefilledTrans = "", prefilledPos = "n.") => {
    const cleanWord = wordText.trim();
    const existing = reviewWords.find(rw => rw.word.toLowerCase() === cleanWord.toLowerCase());
    if (existing) {
      openEditReviewWord(existing);
      return;
    }

    setEditingReviewWordId(null);
    setWordToTranslate(cleanWord);
    setCustomWordInput(cleanWord);
    setCustomWordPos(prefilledPos || "n.");
    setCustomWordPronunciation(prefilledPron || "");
    setCustomWordTranslation(prefilledTrans || "");
    setShowTranslateModal(true);

    // If already pre-filled from sentence/dictionary, NO API CALL! (0 tokens, instant!)
    if (prefilledTrans || prefilledPron) {
      setTranslationLoading(false);
      return;
    }

    // Only if not found locally, call API as fallback
    setTranslationLoading(true);
    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "translate", word: cleanWord })
    })
      .then((res) => res.json())
      .then((data) => {
        setCustomWordPos(data.pos || "n.");
        setCustomWordTranslation(data.translation || "");
        setCustomWordPronunciation(data.thaiPronunciation || "");
      })
      .catch((e) => {
        console.error("Translation API failed", e);
      })
      .finally(() => {
        setTranslationLoading(false);
      });
  };

  // Helper toggle functions
  const toggleMastered = (id: string) => {
    updateProgress((prev) => {
      const isMastered = prev.masteredIds.includes(id);
      const newMastered = isMastered
        ? prev.masteredIds.filter((mid) => mid !== id)
        : [...prev.masteredIds, id];
      return { ...prev, masteredIds: newMastered };
    });
  };

  const toggleStarred = (id: string) => {
    updateProgress((prev) => {
      const isStarred = prev.starredIds.includes(id);
      const newStarred = isStarred
        ? prev.starredIds.filter((sid) => sid !== id)
        : [...prev.starredIds, id];
      return { ...prev, starredIds: newStarred };
    });
  };

  const saveNote = (id: string, note: string) => {
    updateProgress((prev) => {
      const newNotes = { ...prev.notes, [id]: note };
      return { ...prev, notes: newNotes };
    });
  };

  // Get total unique parts of speech
  const posList = useMemo(() => {
    const set = new Set<string>();
    VOCAB.forEach((w) => set.add(w.pos));
    return Array.from(set).sort();
  }, []);

  // ----------------------------------------------------
  // SEARCH & EXPLORER STATE
  // ----------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [explorerPosFilter, setExplorerPosFilter] = useState("all");
  const [explorerStatusFilter, setExplorerStatusFilter] = useState<"all" | "learning" | "mastered" | "starred">("all");
  const [explorerPage, setExplorerPage] = useState(1);
  const itemsPerPage = 60;

  const filteredWords = useMemo(() => {
    return VOCAB.filter((w) => {
      const matchesSearch = w.word.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPos = explorerPosFilter === "all" || w.pos === explorerPosFilter;
      
      let matchesStatus = true;
      if (explorerStatusFilter === "mastered") {
        matchesStatus = progress.masteredIds.includes(w.id);
      } else if (explorerStatusFilter === "starred") {
        matchesStatus = progress.starredIds.includes(w.id);
      } else if (explorerStatusFilter === "learning") {
        matchesStatus = !progress.masteredIds.includes(w.id);
      }

      return matchesSearch && matchesPos && matchesStatus;
    });
  }, [searchQuery, explorerPosFilter, explorerStatusFilter, progress]);

  // Reset page when filters change
  useEffect(() => {
    setExplorerPage(1);
  }, [searchQuery, explorerPosFilter, explorerStatusFilter]);

  const pagedWords = useMemo(() => {
    const end = explorerPage * itemsPerPage;
    return filteredWords.slice(0, end);
  }, [filteredWords, explorerPage]);

  const filteredReviewWords = useMemo(() => {
    return reviewWords.filter((rw) => {
      if (rw.isCustom) return false;
      return rw.word.toLowerCase().includes(reviewSearchQuery.toLowerCase()) || 
        rw.translation.toLowerCase().includes(reviewSearchQuery.toLowerCase());
    });
  }, [reviewWords, reviewSearchQuery]);

  const filteredCustomWords = useMemo(() => {
    return reviewWords.filter((rw) => {
      if (!rw.isCustom) return false;
      return rw.word.toLowerCase().includes(customSearchQuery.toLowerCase()) || 
        rw.translation.toLowerCase().includes(customSearchQuery.toLowerCase());
    });
  }, [reviewWords, customSearchQuery]);

  const filteredGeneralNotes = useMemo(() => {
    return generalNotes.filter((note) => {
      return note.title.toLowerCase().includes(noteSearchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(noteSearchQuery.toLowerCase());
    });
  }, [generalNotes, noteSearchQuery]);

  // ----------------------------------------------------
  // FLASHCARDS STATE
  // ----------------------------------------------------
  const [flashcardDeckType, setFlashcardDeckType] = useState<"all" | "learning" | "starred" | "A1" | "A2" | "B1" | "B2">("all");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showStoryTranslation, setShowStoryTranslation] = useState(false);
  const [showCardNote, setShowCardNote] = useState(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isTouchDragging = useRef(false);
  const [cardTransition, setCardTransition] = useState<"none" | "swipe-left" | "swipe-right">("none");
  const [showPronunciationFront, setShowPronunciationFront] = useState(true);
  const [showBackTranslation, setShowBackTranslation] = useState(true);
  const [showBackPronunciation, setShowBackPronunciation] = useState(true);

  const flashcardWords = useMemo(() => {
    let list = VOCAB;
    if (flashcardDeckType === "starred") {
      list = VOCAB.filter((w) => progress.starredIds.includes(w.id));
    } else if (flashcardDeckType === "learning") {
      list = VOCAB.filter((w) => !progress.masteredIds.includes(w.id));
    } else if (["A1", "A2", "B1", "B2"].includes(flashcardDeckType)) {
      list = VOCAB.filter((w) => w.level === flashcardDeckType);
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashcardDeckType, activeTab]);

  // Fast autocomplete search suggestions that allow jumping directly to word and continuing
  const searchResults = useMemo(() => {
    const q = flashcardSearchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: { word: Word; index: number }[] = [];
    for (let i = 0; i < flashcardWords.length; i++) {
      const w = flashcardWords[i];
      if (w.word.toLowerCase().includes(q) || (w.meaning && w.meaning.toLowerCase().includes(q))) {
        results.push({ word: w, index: i });
        if (results.length >= 8) break;
      }
    }
    return results;
  }, [flashcardSearchQuery, flashcardWords]);

  const jumpToSearchWord = (targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < flashcardWords.length) {
      setCurrentCardIndex(targetIndex);
      setShowStoryTranslation(false);
      setFlashcardSearchQuery("");
      setIsSearchDropdownOpen(false);
    }
  };

  const currentWordObj = flashcardWords[currentCardIndex] || null;

  // Always close card note by default whenever switching to a different word
  useEffect(() => {
    setShowCardNote(false);
  }, [currentWordObj?.id]);

  // Save current word ID & deck to localStorage AND sync to Supabase cloud across devices
  useEffect(() => {
    if (!currentWordObj || !hasLoadedSession || lastWordIdToRestore || isRestoringRef.current) {
      return;
    }

    const wordChanged = currentWordObj.id !== lastSyncedWordIdRef.current;
    const deckChanged = flashcardDeckType !== lastSyncedDeckRef.current;
    if (!wordChanged && !deckChanged) {
      return;
    }

    const now = Date.now();
    lastSyncedWordIdRef.current = currentWordObj.id;
    lastSyncedDeckRef.current = flashcardDeckType;
    localLastWordUpdatedAtRef.current = now;

    try {
      localStorage.setItem("lexiflow_last_word_id", currentWordObj.id);
      localStorage.setItem("lexiflow_last_word_updated_at", String(now));
      localStorage.setItem("lexiflow_deck_type", flashcardDeckType);
    } catch (_) {}

    const syncPosTimer = setTimeout(() => {
      fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionUpdate: {
            lastWordId: currentWordObj.id,
            lastWordUpdatedAt: now,
            deckType: flashcardDeckType
          }
        })
      }).catch((e) => console.warn("Failed to sync card position to cloud", e));
    }, 400);

    return () => clearTimeout(syncPosTimer);
  }, [currentWordObj, flashcardDeckType, hasLoadedSession, lastWordIdToRestore]);

  // Restore the index of the last viewed word once the deck is ready
  useEffect(() => {
    if (lastWordIdToRestore && hasLoadedSession) {
      if (flashcardWords.length > 0) {
        const idx = flashcardWords.findIndex((w) => w.id === lastWordIdToRestore);
        if (idx !== -1) {
          setCurrentCardIndex(idx);
        }
        setLastWordIdToRestore(null);
        isRestoringRef.current = false;
      } else {
        // Stop trying to restore if the loaded list is empty
        setLastWordIdToRestore(null);
        isRestoringRef.current = false;
      }
    }
  }, [flashcardWords, lastWordIdToRestore, hasLoadedSession]);

  // Reset card index if deck changes (only when not restoring)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Only reset index when not in the process of restoring the session
    if (!isRestoringRef.current) {
      setCurrentCardIndex(0);
      setShowStoryTranslation(false);
      setActiveCardData(null);
    }
  }, [flashcardDeckType]);

  // Fetch or generate sentence structures when current card changes
  useEffect(() => {
    // Wait for cloud session & position restoration before loading/generating any card
    if (!hasLoadedSession || lastWordIdToRestore) {
      return;
    }

    if (!currentWordObj) {
      setActiveCardData(null);
      setActiveCardId(null);
      setApiError(null);
      setLoadingAI(false);
      return;
    }

    // Check database cache first — ถ้ามีใน cache ใช้เลย ไม่ต้องรัน AI ใหม่ (และอัปเดตทันทีหากคลาวด์ส่งประโยคใหม่มา)
    const cached = cardCache[currentWordObj.id];
    const isFallbackCard = cached && (cached.isFallback || (cached.wordTranslation && cached.wordTranslation.includes("คำแปลของ")));
    if (cached && Array.isArray(cached.sentences) && cached.sentences.length > 0 && !isFallbackCard) {
      if (activeCardId !== currentWordObj.id || activeCardData !== cached) {
        setActiveCardData(cached);
        setActiveCardId(currentWordObj.id);
      }
      setApiError(null);
      setLoadingAI(false);
      return;
    }

    if (activeCardId === currentWordObj.id && activeCardData) {
      setLoadingAI(false);
      return;
    }

    // Prevent duplicate parallel requests for the same word
    if (isGeneratingRef.current) return;

    // Not in local cache: check cloud DB first before calling AI, with 500ms debounce
    setLoadingAI(true);
    setApiError(null);
    setActiveCardData(null);
    setActiveCardId(null);

    const targetWord = currentWordObj;
    const debounceTimer = setTimeout(async () => {
      isGeneratingRef.current = true;
      try {
        // Step 1: Check latest Supabase cloud DB first (in case Phone/iPad/PC just generated it!)
        try {
          const dbRes = await fetch("/api/db?t=" + Date.now(), {
            headers: { "Cache-Control": "no-cache" }
          });
          if (dbRes.ok) {
            const dbData = await dbRes.json();
            const cloudCard = dbData?.cardCache?.[targetWord.id];
            if (isCardValidAndNew(cloudCard)) {
              setCardCache((prev) => {
                const merged = { ...prev, ...(dbData.cardCache || {}), [targetWord.id]: cloudCard };
                try {
                  localStorage.setItem("lexiflow_card_cache", JSON.stringify(merged));
                } catch (_) {}
                return merged;
              });
              setActiveCardData(cloudCard);
              setActiveCardId(targetWord.id);
              setApiError(null);
              return;
            }
          }
        } catch (dbCheckErr) {
          console.warn("Pre-generation cloud cache check skipped:", dbCheckErr);
        }

        // Step 2: Truly not in cloud DB yet -> call AI to generate and save to cloud DB
        const wordIdx = VOCAB.findIndex((v) => v.id === targetWord.id);
        const storyStyles = ["dialogue", "decision", "search", "narrative"] as const;
        const assignedStyle = storyStyles[(wordIdx >= 0 ? wordIdx : 0) % 4];

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            word: targetWord.word,
            pos: targetWord.pos,
            meaning: targetWord.meaning,
            pronunciation: targetWord.pronunciation,
            lengthMode: storyLengthMode,
            style: assignedStyle
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        addCardToCache(targetWord.id, data as CardData);
        setActiveCardData(data as CardData);
        setActiveCardId(targetWord.id);
      } catch (err: any) {
        console.warn("API generate failed, loading client-side fallback sentences.", err);
        setApiError(err.message || "Unknown API Error");
        const fallback = generateFallbackCard(targetWord);
        addCardToCache(targetWord.id, fallback);
        setActiveCardData(fallback);
        setActiveCardId(targetWord.id);
      } finally {
        isGeneratingRef.current = false;
        setLoadingAI(false);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [currentWordObj, cardCache, activeCardId, activeCardData, hasLoadedSession, lastWordIdToRestore, storyLengthMode]);

  const toggleStoryLengthMode = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextMode = storyLengthMode === "normal" ? "longer" : "normal";
    setStoryLengthMode(nextMode);
    localStorage.setItem("lexiflow_story_length_mode", nextMode);
    return nextMode;
  };

  const resetMasteredStats = async () => {
    if (confirm("ต้องการล้างประวัติและสถิติการจำการ์ดทั้งหมด (Reset Card Mastery) ใช่หรือไม่?\n\nสถิติการจำจะเริ่มนับใหม่จาก 0 โดยคลังคำศัพท์ทบทวน (Review Words) และโน้ตของคุณจะไม่ถูกลบ")) {
      const updatedProgress = { ...progress, masteredIds: [] };
      setProgress(updatedProgress);
      localStorage.setItem("lexiflow_progress", JSON.stringify(updatedProgress));
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isMasteryReset: true, progress: updatedProgress })
        });
        alert("ล้างสถิติการจำการ์ดเรียบร้อยแล้ว เริ่มต้นนับใหม่จากปัจจุบัน!");
      } catch (e: any) {
        console.error(e);
        alert("เกิดข้อผิดพลาดในการบันทึก: " + e.message);
      }
    }
  };

  const resetAndRegenerateCard = (overrideLengthMode?: "normal" | "longer") => {
    if (!currentWordObj) return;

    const modeToUse = overrideLengthMode || storyLengthMode;
    setShowStoryTranslation(false);
    setLoadingAI(true);
    setApiError(null);
    setActiveCardData(null);
    setActiveCardId(null);

    const wordIdx = VOCAB.findIndex((v) => v.id === currentWordObj.id);
    const storyStyles = ["dialogue", "decision", "search", "narrative"] as const;
    const nextStyleIdx = ((wordIdx >= 0 ? wordIdx : 0) + Math.floor(Math.random() * 3 + 1)) % 4;
    const styleToUse = storyStyles[nextStyleIdx];

    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: currentWordObj.word,
        pos: currentWordObj.pos,
        meaning: currentWordObj.meaning,
        pronunciation: currentWordObj.pronunciation,
        lengthMode: modeToUse,
        style: styleToUse
      })
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data as CardData;
      })
      .then((data) => {
        addCardToCache(currentWordObj.id, data);
        setActiveCardData(data);
        setActiveCardId(currentWordObj.id);
      })
      .catch((err) => {
        console.error("API reset & regeneration failed", err);
        setApiError(err.message || "Failed to regenerate card");
      })
      .finally(() => {
        setLoadingAI(false);
      });
  };

  // Speak pronunciation using Edge TTS with instant client-side memory cache
  const speakWord = async (rawText: string, customVoice?: string, customRate?: string) => {
    if (!rawText || !rawText.trim()) return;
    const textToSpeak = rawText.trim();
    const voiceToUse = customVoice || ttsVoice || "en-US-AvaNeural";
    const rateToUse = customRate || (audioLearningMode === "slow" ? "-20%" : audioLearningMode === "shadowing" ? "-8%" : "-2%");

    // Stop currently playing audio or browser synthesis
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setTtsSpeakingText(textToSpeak);

    try {
      const cacheKey = `${voiceToUse}:${rateToUse}:${textToSpeak}`;
      let audioUrl = ttsAudioCache.current.get(cacheKey);

      if (!audioUrl) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: textToSpeak,
            voice: voiceToUse,
            rate: rateToUse
          })
        });

        if (!res.ok) {
          throw new Error(`TTS API returned status ${res.status}`);
        }

        const blob = await res.blob();
        audioUrl = URL.createObjectURL(blob);
        ttsAudioCache.current.set(cacheKey, audioUrl);
      }

      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setTtsSpeakingText((curr) => (curr === textToSpeak ? null : curr));
        currentAudioRef.current = null;
      };
      audio.onerror = () => {
        setTtsSpeakingText((curr) => (curr === textToSpeak ? null : curr));
        currentAudioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.warn("Edge TTS request failed, fallback to Web Speech synthesis", err);
      // Graceful fallback to client Web Speech API so audio never breaks
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const cleanForBrowser = textToSpeak.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
        const utterance = new SpeechSynthesisUtterance(cleanForBrowser);
        utterance.lang = "en-US";
        utterance.rate = audioLearningMode === "slow" ? 0.75 : 0.88;
        utterance.onend = () => setTtsSpeakingText(null);
        utterance.onerror = () => setTtsSpeakingText(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setTtsSpeakingText(null);
      }
    }
  };

  const speakFullArticle = (card: CardData | null) => {
    if (!card || !card.sentences || card.sentences.length === 0) return;
    const isSlow = audioLearningMode === "slow";
    const isShadowing = audioLearningMode === "shadowing";
    const rate = isSlow ? "-20%" : isShadowing ? "-8%" : "-2%";

    const fullText = card.sentences
      .map((s) => s.sentence.trim())
      .filter(Boolean)
      .join(isShadowing ? "... " : " ");
    speakWord(fullText, undefined, rate);
  };

  // Instant 0-token extraction of word pronunciation and translation from current sentence/card
  const getWordDataFromSentence = (cleanWord: string, sentenceObj?: any) => {
    let pronunciation = "";
    let translation = "";
    let pos = "n.";
    const lower = cleanWord.toLowerCase();

    // 1. Check if word is main word of current card
    if (currentWordObj && currentWordObj.word.toLowerCase() === lower) {
      pronunciation = activeCardData?.thaiPronunciation || currentWordObj.pronunciation || "";
      translation = activeCardData?.wordTranslation || currentWordObj.meaning || "";
      pos = currentWordObj.pos || "n.";
    }

    // 2. Extract pronunciation from sentence's word-by-word thaiPronunciation
    if (!pronunciation && sentenceObj && sentenceObj.sentence && sentenceObj.thaiPronunciation) {
      const rawWords = sentenceObj.sentence.replace(/[.,/#!$%^&*;:{}=\-_'~\x60()"]/g, " ").trim().split(/\s+/);
      const phons = sentenceObj.thaiPronunciation.trim().split(/\s+/);
      const wordIdx = rawWords.findIndex((w: string) => w.toLowerCase() === lower);
      if (wordIdx !== -1 && phons[wordIdx]) {
        pronunciation = phons[wordIdx].replace(/[.,/#!$%^&*;:{}=\-_'~\x60()"]/g, "").trim();
      }
    }

    // 3. Extract translation from sentence's grammar breakdown
    if (!translation && sentenceObj && sentenceObj.grammar) {
      const match = sentenceObj.grammar.match(new RegExp(`(?:\\b${lower}\\b|${lower})\\s*:\\s*([^)+,]+)`, "i"));
      if (match && match[1]) {
        translation = match[1].trim();
      }
    }

    // 4. Check Oxford 3000 dictionary (VOCAB)
    const vocabMatch = VOCAB.find((w) => w.word.toLowerCase() === lower);
    if (vocabMatch) {
      if (!translation) translation = vocabMatch.meaning || "";
      if (!pronunciation) pronunciation = vocabMatch.pronunciation || "";
      pos = vocabMatch.pos || pos;
    }

    return { pronunciation, translation, pos };
  };

  // Fast lookup for words already saved in review deck
  const reviewWordsSet = useMemo(() => {
    return new Set(reviewWords.map((rw) => rw.word.toLowerCase().trim()));
  }, [reviewWords]);

  const renderInteractiveSentence = (sentence: string, sentenceObj?: any) => {
    const tokens = sentence.split(/(\s+)/);
    return tokens.map((token, i) => {
      const cleanWord = token.replace(/[.,/#!$%^&*;:{}=\-_'~`()]/g, "").trim();
      if (!cleanWord) return <span key={i}>{token}</span>;

      const isSavedInReview = reviewWordsSet.has(cleanWord.toLowerCase());

      return (
        <span
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            const extracted = getWordDataFromSentence(cleanWord, sentenceObj);
            openTranslationModal(cleanWord, extracted.pronunciation, extracted.translation, extracted.pos);
          }}
          className={`inline-block transition cursor-pointer rounded px-1.5 py-0.5 ${
            isSavedInReview
              ? "border-2 border-amber-400 bg-amber-50/90 text-amber-950 font-bold shadow-2xs hover:bg-amber-100"
              : "hover:bg-sky-100 hover:text-sky-700 font-semibold"
          }`}
          title={isSavedInReview ? `"${cleanWord}" บันทึกเข้าคลังทบทวนแล้ว (คลิกเพื่อดู/แก้ไข)` : `คลิกเพื่อแปลหรือเพิ่ม "${cleanWord}" เข้าคลังทบทวน`}
        >
          {token}
        </span>
      );
    });
  };

  // Keyboard controls for flashcards
  useEffect(() => {
    if (activeTab !== "flashcards") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetEl = e.target as HTMLElement | null;
      if (
        targetEl instanceof HTMLInputElement ||
        targetEl instanceof HTMLTextAreaElement ||
        targetEl?.isContentEditable ||
        targetEl?.closest?.("[contenteditable='true']")
      ) {
        return; // Ignore inside input fields and rich note editors
      }
      if (e.key === " ") {
        e.preventDefault();
        setShowStoryTranslation((prev) => !prev);
      } else if (e.key === "ArrowRight") {
        handleCardNext("swipe-right");
      } else if (e.key === "ArrowLeft") {
        handleCardPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, flashcardWords, currentCardIndex]);

  const handleCardNext = (direction: "swipe-left" | "swipe-right") => {
    if (flashcardWords.length === 0) return;
    setCardTransition(direction);
    setTimeout(() => {
      setShowStoryTranslation(false);
      setCurrentCardIndex((prev) => (prev + 1) % flashcardWords.length);
      setCardTransition("none");
    }, 250);
  };

  const handleCardPrev = () => {
    if (flashcardWords.length === 0) return;
    setCardTransition("swipe-left");
    setTimeout(() => {
      setShowStoryTranslation(false);
      setCurrentCardIndex((prev) => (prev - 1 + flashcardWords.length) % flashcardWords.length);
      setCardTransition("none");
    }, 250);
  };

  // ----------------------------------------------------
  // QUIZ STATE & LOGIC
  // ----------------------------------------------------
  const [quizMode, setQuizMode] = useState<"pos" | "spelling" | "missing" | "story">("pos");
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotalQuestions, setQuizTotalQuestions] = useState(0);
  const [currentQuizWord, setCurrentQuizWord] = useState<Word | null>(null);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [spellingInput, setSpellingInput] = useState("");
  const [quizFeedback, setQuizFeedback] = useState<"none" | "correct" | "incorrect">("none");
  const [missingLettersHint, setMissingLettersHint] = useState("");

  // Story Builder Puzzle State (0 Tokens - Client Side)
  const [storyTargetTokens, setStoryTargetTokens] = useState<string[]>([]);
  const [storyThaiTranslation, setStoryThaiTranslation] = useState<string>("");
  const [storyArticleTitle, setStoryArticleTitle] = useState<string>("");
  const [storyWordChips, setStoryWordChips] = useState<{ id: string; word: string }[]>([]);
  const [selectedStoryChips, setSelectedStoryChips] = useState<{ id: string; word: string }[]>([]);
  const [storyFeedback, setStoryFeedback] = useState<"none" | "correct" | "incorrect">("none");
  const [draggedChipIndex, setDraggedChipIndex] = useState<number | null>(null);
  const [dragOverChipIndex, setDragOverChipIndex] = useState<number | null>(null);

  const startNewStoryPuzzle = () => {
    setStoryFeedback("none");
    setSelectedStoryChips([]);
    setDraggedChipIndex(null);
    setDragOverChipIndex(null);

    // Pick from cached cards with sentences
    const validCardKeys = Object.keys(cardCache).filter(
      (k) => cardCache[k] && Array.isArray(cardCache[k].sentences) && cardCache[k].sentences.length > 0
    );

    let cardToPlay: CardData;
    let wordTitle = "arrive";

    if (validCardKeys.length > 0) {
      const randomKey = validCardKeys[Math.floor(Math.random() * validCardKeys.length)];
      cardToPlay = cardCache[randomKey];
      const matchWord = VOCAB.find((w) => w.id === randomKey);
      if (matchWord) wordTitle = matchWord.word;
    } else {
      const sampleWord = VOCAB[0] || { id: "w-sample", word: "arrive", pos: "v.", meaning: "มาถึง" };
      cardToPlay = generateFallbackCard(sampleWord);
      wordTitle = sampleWord.word;
    }

    const fullEnglish = cardToPlay.sentences.map((s) => s.sentence.trim()).join(" ");
    const tokens = fullEnglish.split(/\s+/).filter(Boolean);
    const fullThai = cardToPlay.fullArticleThai || cardToPlay.sentences.map((s) => s.translation).join(" ");

    setStoryArticleTitle(cardToPlay.articleTitle || `Story with "${wordTitle}"`);
    setStoryThaiTranslation(fullThai);
    setStoryTargetTokens(tokens);

    // Create scrambled chips with unique ids
    const chips = tokens.map((w, idx) => ({
      id: `chip-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      word: w,
    })).sort(() => 0.5 - Math.random());

    setStoryWordChips(chips);
  };

  const handlePickStoryChip = (chip: { id: string; word: string }) => {
    setStoryWordChips((prev) => prev.filter((c) => c.id !== chip.id));
    setSelectedStoryChips((prev) => [...prev, chip]);
    setStoryFeedback("none");
  };

  const handleRemoveStoryChip = (chip: { id: string; word: string }) => {
    setSelectedStoryChips((prev) => prev.filter((c) => c.id !== chip.id));
    setStoryWordChips((prev) => [...prev, chip]);
    setStoryFeedback("none");
  };

  const handleResetStoryChips = () => {
    setStoryWordChips((prev) => [...prev, ...selectedStoryChips].sort(() => 0.5 - Math.random()));
    setSelectedStoryChips([]);
    setStoryFeedback("none");
  };

  const handleDragStartChip = (index: number) => {
    setDraggedChipIndex(index);
  };

  const handleDragOverChip = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverChipIndex(index);
  };

  const handleDropChip = (index: number) => {
    if (draggedChipIndex === null || draggedChipIndex === index) return;
    const updated = [...selectedStoryChips];
    const [moved] = updated.splice(draggedChipIndex, 1);
    updated.splice(index, 0, moved);
    setSelectedStoryChips(updated);
    setDraggedChipIndex(null);
    setDragOverChipIndex(null);
    setStoryFeedback("none");
  };

  const handleCheckStoryAnswer = () => {
    if (selectedStoryChips.length === 0) return;
    const userWords = selectedStoryChips.map((c) => c.word.trim());
    const targetWords = storyTargetTokens.map((w) => w.trim());
    const cleanUser = userWords.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
    const cleanTarget = targetWords.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
    const isCorrect =
      cleanUser === cleanTarget ||
      cleanUser.replace(/[.,/#!$%^&*;:{}=\-_'~`()]/g, "") ===
        cleanTarget.replace(/[.,/#!$%^&*;:{}=\-_'~`()]/g, "");

    if (isCorrect) {
      setStoryFeedback("correct");
      setQuizScore((prev) => prev + 1);
      setQuizTotalQuestions((prev) => prev + 1);
      speakWord(storyTargetTokens.join(" "));
    } else {
      setStoryFeedback("incorrect");
    }
  };

  const startQuiz = (mode: "pos" | "spelling" | "missing" | "story") => {
    setQuizMode(mode);
    setQuizScore(0);
    setQuizTotalQuestions(0);
    setQuizStarted(true);
    if (mode === "story") {
      setTimeout(() => startNewStoryPuzzle(), 50);
    } else {
      setTimeout(() => startNewQuizQuestion(), 50);
    }
  };

  const startNewQuizQuestion = () => {
    setSelectedAnswer(null);
    setSpellingInput("");
    setQuizFeedback("none");

    if (VOCAB.length === 0) return;

    let pool: Word[] = [];
    if (quizPoolType === "mastered") {
      pool = VOCAB.filter((w) => progress.masteredIds.includes(w.id));
    } else {
      pool = VOCAB.filter((w) => !progress.masteredIds.includes(w.id));
    }

    // Safety fallback if the chosen pool is empty
    if (pool.length === 0) {
      pool = VOCAB;
    }

    const randomWord = pool[Math.floor(Math.random() * pool.length)];
    setCurrentQuizWord(randomWord);

    if (quizMode === "pos") {
      const correct = randomWord.pos;
      const filteredPos = posList.filter((p) => p !== correct);
      const shuffledWrong = filteredPos.sort(() => 0.5 - Math.random()).slice(0, 3);
      const opts = [...shuffledWrong, correct].sort(() => 0.5 - Math.random());
      setQuizOptions(opts);
    } else if (quizMode === "missing") {
      const wordStr = randomWord.word;
      let hint = "";
      for (let i = 0; i < wordStr.length; i++) {
        if (i > 0 && i < wordStr.length - 1 && Math.random() > 0.5 && wordStr[i] !== " " && wordStr[i] !== "-") {
          hint += "_";
        } else {
          hint += wordStr[i];
        }
      }
      if (!hint.includes("_") && wordStr.length > 2) {
        const midIndex = Math.floor(wordStr.length / 2);
        hint = hint.substring(0, midIndex) + "_" + hint.substring(midIndex + 1);
      }
      setMissingLettersHint(hint);
    }
  };


  const checkAnswer = (answer: string) => {
    if (!currentQuizWord || selectedAnswer !== null || quizFeedback !== "none") return;

    const isCorrect = answer.trim().toLowerCase() === currentQuizWord.word.trim().toLowerCase();
    setSelectedAnswer(answer);
    
    if (isCorrect) {
      setQuizFeedback("correct");
      setQuizScore((prev) => prev + 1);
    } else {
      setQuizFeedback("incorrect");
    }
    setQuizTotalQuestions((prev) => prev + 1);
  };

  const checkPosAnswer = (answerPos: string) => {
    if (!currentQuizWord || selectedAnswer !== null || quizFeedback !== "none") return;

    const isCorrect = answerPos === currentQuizWord.pos;
    setSelectedAnswer(answerPos);

    if (isCorrect) {
      setQuizFeedback("correct");
      setQuizScore((prev) => prev + 1);
    } else {
      setQuizFeedback("incorrect");
    }
    setQuizTotalQuestions((prev) => prev + 1);
  };

  const scrambledWord = useMemo(() => {
    if (!currentQuizWord) return "";
    const letters = currentQuizWord.word.replace(/\s+/g, "").split("");
    return letters.sort(() => 0.5 - Math.random()).join(" ");
  }, [currentQuizWord]);

  const getPosBadgeColor = (pos: string) => {
    switch (pos) {
      case "n.":
        return "bg-sky-100 text-sky-600 border border-sky-200/50";
      case "v.":
        return "bg-emerald-100 text-emerald-600 border border-emerald-200/50";
      case "adj.":
        return "bg-purple-100 text-purple-600 border border-purple-200/50";
      case "adv.":
        return "bg-amber-100 text-amber-600 border border-amber-200/50";
      case "prep.":
        return "bg-rose-100 text-rose-600 border border-rose-200/50";
      case "conj.":
        return "bg-cyan-100 text-cyan-600 border border-cyan-200/50";
      case "pron.":
        return "bg-pink-100 text-pink-600 border border-pink-200/50";
      default:
        return "bg-slate-100 text-slate-500 border border-slate-200/50";
    }
  };

  const masteredPercentage = useMemo(() => {
    return Math.round((progress.masteredIds.length / VOCAB.length) * 100) || 0;
  }, [progress.masteredIds]);

  return (
    <div className="flex flex-1 min-h-screen bg-gradient-to-tr from-[#F0ECEA] via-[#EAE3DE] to-[#E2D9D3] text-slate-700 font-sans selection:bg-[#F5F1EE] selection:text-[#A28C89]">
      {/* Dynamic CSS animations */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        @keyframes glowPop {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(250, 143, 166, 0.4); }
          50% { transform: scale(1.02); box-shadow: 0 0 20px 10px rgba(250, 143, 166, 0.2); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(250, 143, 166, 0); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        .animate-correct {
          animation: glowPop 0.4s ease-in-out;
        }
        .card-perspective {
          perspective: 1500px;
        }
        .card-inner {
          transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform-style: preserve-3d;
        }
        .card-flipped {
          transform: rotateY(180deg);
        }
        .card-face {
          backface-visibility: hidden;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
          overscroll-behavior-y: contain;
        }
        .card-face::-webkit-scrollbar {
          width: 5px;
        }
        .card-face::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }
        .card-back {
          transform: rotateY(180deg);
        }
        .swipe-left {
          transform: translateX(-200px) rotate(-15deg);
          opacity: 0;
          transition: all 0.3s ease-in;
        }
        .swipe-right {
          transform: translateX(200px) rotate(15deg);
          opacity: 0;
          transition: all 0.3s ease-in;
        }
      `}</style>

      {/* Side Bar Navigation */}
      <aside className="w-80 bg-white/80 backdrop-blur-xl border-r border-[#E5E0DC] p-6 flex flex-col justify-between hidden md:flex">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3 pl-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#B8A3A0] to-[#D4C9C8] flex items-center justify-center shadow-md shadow-stone-200/40">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">LexiFlow</h1>
              <p className="text-xs text-slate-500 font-medium">Structure & Grammar</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group ${
                activeTab === "dashboard"
                  ? "bg-[#F5F1EE] text-[#A28C89] border border-[#E5DDD8] shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
              </svg>
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab("flashcards")}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group ${
                activeTab === "flashcards"
                  ? "bg-[#F5F1EE] text-[#A28C89] border border-[#E5DDD8] shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Grammar Cards
            </button>

            <button
              onClick={() => setActiveTab("review")}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group ${
                activeTab === "review"
                  ? "bg-[#F5F1EE] text-[#A28C89] border border-[#E5DDD8] shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Review Deck ({reviewWords.filter(rw => !rw.isCustom).length})
            </button>

            <button
              onClick={() => setActiveTab("customWords")}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group ${
                activeTab === "customWords"
                  ? "bg-[#F5F1EE] text-[#A28C89] border border-[#E5DDD8] shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Custom Words ({reviewWords.filter(rw => rw.isCustom).length})
            </button>

            <button
              onClick={() => setActiveTab("quiz")}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group ${
                activeTab === "quiz"
                  ? "bg-[#F5F1EE] text-[#A28C89] border border-[#E5DDD8] shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Quiz Arena
            </button>

            <button
              onClick={() => setActiveTab("explorer")}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group ${
                activeTab === "explorer"
                  ? "bg-[#F5F1EE] text-[#A28C89] border border-[#E5DDD8] shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
              </svg>
              Word Explorer
            </button>

            <button
              onClick={() => setActiveTab("notes")}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group ${
                activeTab === "notes"
                  ? "bg-[#F5F1EE] text-[#A28C89] border border-[#E5DDD8] shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Knowledge Notes ({generalNotes.length})
            </button>
          </nav>
        </div>

        <div className="bg-slate-50/80 border border-[#E5E0DC] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
            <span>Overall Mastery</span>
            <span className="text-[#A28C89]">{masteredPercentage}%</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#B8A3A0] to-[#D4C9C8] h-full rounded-full transition-all duration-500"
              style={{ width: `${masteredPercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 text-center font-semibold">
            {progress.masteredIds.length} of {VOCAB.length} words mastered
          </p>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-transparent p-3 sm:p-6 md:p-8">
        {/* Mobile Header / Nav */}
        <header className="flex md:hidden items-center justify-between bg-white/90 border border-[#E5E0DC] rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#B8A3A0] to-[#D4C9C8] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-slate-800">LexiFlow</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => syncWithCloud(true)}
              disabled={syncStatus === "syncing"}
              className="p-2 rounded-xl border border-[#E5DDD8] bg-white text-slate-600 hover:text-[#A28C89] transition shadow-xs flex items-center justify-center active:scale-95"
              title="ซิงค์ข้อมูลกับคลาวด์ (กดเพื่ออัปเดตสถิติและประโยคล่าสุด)"
            >
              <svg className={`w-4 h-4 ${syncStatus === "syncing" ? "animate-spin text-amber-500" : syncStatus === "error" ? "text-rose-400" : "text-emerald-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none"
            >
              <option value="dashboard">Dashboard</option>
              <option value="flashcards">Grammar Cards</option>
              <option value="review">Review Deck</option>
              <option value="customWords">Custom Words</option>
              <option value="quiz">Quiz Arena</option>
              <option value="explorer">Word Explorer</option>
              <option value="notes">Knowledge Notes</option>
            </select>
          </div>
        </header>

        {/* ------------------------------------------------------------------------
            TAB 1: STATS DASHBOARD
        ------------------------------------------------------------------------ */}
        {activeTab === "dashboard" && (
          <section className="flex flex-col gap-8 max-w-5xl mx-auto w-full">
            <div className="relative overflow-hidden bg-gradient-to-r from-[#ffeef2]/60 to-[#E2D9D3]/60 border border-[#E5DDD8] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md shadow-pink-100/20">
              <div className="absolute right-0 top-0 w-80 h-80 bg-pink-300/10 rounded-full blur-3xl -z-10" />
              <div className="flex flex-col gap-2 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                  Welcome to LexiFlow
                </h2>
                <p className="text-sm md:text-base text-slate-600 max-w-lg leading-relaxed font-medium">
                  Learn grammar dynamically. Every card is backed by a persistent database cache generating 5 distinct sentence structures and memory tricks.
                </p>
              </div>
              <div className="flex flex-col items-center justify-center bg-white/90 border border-[#E5E0DC] rounded-2xl px-6 py-4 text-center shadow-sm">
                <span className="text-4xl font-extrabold text-[#A28C89]">{masteredPercentage}%</span>
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">Mastery Progress</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Mastery Progress Card */}
              <div className="bg-white/90 border border-[#E5E0DC] rounded-3xl p-6 md:col-span-2 flex flex-col justify-between gap-6 shadow-sm">
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold text-slate-800">สถิติการท่องคำศัพท์รวม (Overall Vocabulary Stats)</h3>
                  <p className="text-xs text-slate-500 font-medium">ความคืบหน้าการจำคำศัพท์สะสมของคุณจากคลังคำศัพท์ทั้งหมด</p>
                </div>
                
                <div className="flex flex-col items-center justify-center py-6 bg-slate-50/50 rounded-2xl border border-slate-100/80">
                  <div className="text-5xl font-black text-[#A28C89] tracking-tight">
                    {progress.masteredIds.length} <span className="text-xl font-bold text-slate-400">/ {VOCAB.length} คำ</span>
                  </div>
                  <div className="text-sm font-extrabold text-slate-500 mt-2">
                    คุณจำได้แล้วคิดเป็น <span className="text-emerald-600 text-base">{masteredPercentage}%</span> ของคำศัพท์ทั้งหมด
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="bg-gradient-to-r from-[#B8A3A0] to-[#D4C9C8] h-full rounded-full transition-all duration-500"
                      style={{ width: `${masteredPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* General App Info & Shortcuts */}
              <div className="bg-white/90 border border-[#E5E0DC] rounded-3xl p-6 flex flex-col gap-5 justify-between shadow-sm">
                <div className="flex flex-col gap-4">
                  <h3 className="text-lg font-bold text-slate-800">ข้อมูลและคลังทบทวน</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Starred Items</span>
                      <span className="text-lg font-black text-amber-500">{progress.starredIds.length} คำ</span>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Review Deck</span>
                      <span className="text-lg font-black text-[#A28C89]">{reviewWords.length} คำ</span>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-center col-span-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Knowledge Notes</span>
                      <span className="text-lg font-black text-sky-600">{generalNotes.length} โน๊ต</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-150">
                    <button
                      onClick={() => {
                        setFlashcardDeckType("learning");
                        setActiveTab("flashcards");
                      }}
                      className="w-full flex items-center justify-between bg-[#fffcfd] hover:bg-pink-50/30 border border-[#E5DDD8] text-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition"
                    >
                      <span>ฝึกคำศัพท์ที่ยังจำไม่ได้</span>
                      <span className="bg-white border border-[#E5DDD8] text-[#A28C89] px-2 py-0.5 rounded-md font-bold">
                        {VOCAB.length - progress.masteredIds.length} คำ
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("review");
                      }}
                      className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition"
                    >
                      <span>เปิดคลังคำศัพท์ทวนเพิ่มเติม</span>
                      <span className="bg-white border border-slate-200 text-slate-650 px-2 py-0.5 rounded-md font-bold">
                        {reviewWords.length} คำ
                      </span>
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-slate-100">
                  <div className="w-full flex items-center justify-between px-1">
                    <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${syncStatus === "syncing" ? "bg-amber-400 animate-ping" : syncStatus === "error" ? "bg-rose-400" : "bg-emerald-500"}`}></span>
                      {syncStatus === "syncing" ? "กำลังซิงค์ข้อมูลกับคลาวด์..." : syncStatus === "error" ? "การเชื่อมต่อขัดข้อง" : "ข้อมูลเชื่อมต่อกับคลาวด์แล้ว"}
                    </span>
                    <button
                      onClick={() => syncWithCloud(true)}
                      disabled={syncStatus === "syncing"}
                      className="text-[11px] text-[#A28C89] hover:text-[#8E7774] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 border border-[#E5DDD8] transition shadow-xs active:scale-95"
                      title="กดเพื่ออัปเดตสถิติและประโยคคำศัพท์ล่าสุดจากอุปกรณ์อื่นทันที"
                    >
                      <svg className={`w-3.5 h-3.5 ${syncStatus === "syncing" ? "animate-spin text-amber-500" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {syncStatus === "syncing" ? "กำลังดึง..." : "กดซิงค์ข้อมูล"}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-slate-50">
                    <button
                      onClick={async () => {
                        if (confirm("⚠️ คุณต้องการล้างฐานข้อมูล (Reset Database) ทั้งหมดใช่หรือไม่? ประวัติการเรียนทั้งหมดและคำศัพท์แคชจะถูกรีเซ็ตใหม่")) {
                          const defaultData = {
                            progress: { masteredIds: [], starredIds: [], notes: {} },
                            cardCache: {},
                            generalNotes: [],
                            reviewWords: []
                          };
                          try {
                            // 1. Clear database on server/Supabase
                            const res = await fetch("/api/db", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                isFullReset: true,
                                progress: defaultData.progress,
                                cardCache: defaultData.cardCache,
                                generalNotes: defaultData.generalNotes,
                                reviewWords: defaultData.reviewWords
                              })
                            });
                          if (!res.ok) throw new Error("Failed to clear backend database");
                          
                          // 2. Clear browser localStorage
                          localStorage.removeItem("lexiflow_progress");
                          localStorage.removeItem("lexiflow_card_cache");
                          localStorage.removeItem("lexiflow_review_words");
                          localStorage.removeItem("lexiflow_general_notes");
                          localStorage.removeItem("lexiflow_last_word_id");
                          
                          // 3. Reset states immediately
                          setProgress(defaultData.progress);
                          setCardCache(defaultData.cardCache);
                          setReviewWords(defaultData.reviewWords);
                          setGeneralNotes(defaultData.generalNotes);
                          setActiveCardData(null);
                          setActiveCardId(null);
                          
                          alert("ล้างฐานข้อมูลสำเร็จเรียบร้อยแล้ว!");
                          window.location.reload();
                        } catch (err: any) {
                          console.error(err);
                          alert("เกิดข้อผิดพลาดในการล้างฐานข้อมูล: " + err.message);
                        }
                      }
                    }}
                    className="text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-650 hover:bg-red-500 hover:text-white transition flex items-center gap-1 shadow-sm"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    ล้างประวัติ & รีเซ็ตฐานข้อมูลทั้งหมด
                  </button>
                  <button
                    onClick={resetMasteredStats}
                    className="text-[10px] font-extrabold uppercase px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white transition flex items-center gap-1 shadow-sm"
                    title="ล้างเฉพาะสถิติการจำการ์ด (Mastery) โดยไม่ลบคลังคำศัพท์ทวนและโน้ต"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    ล้างเฉพาะสถิติการจำการ์ด (เริ่มนับใหม่)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* ------------------------------------------------------------------------
            TAB 2: GRAMMAR FLASHCARDS
        ------------------------------------------------------------------------ */}
        {activeTab === "flashcards" && (
          <section className="flex flex-col items-center gap-6 max-w-5xl mx-auto w-full">
            <div className="w-full bg-white/90 border border-[#E5E0DC] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm font-bold text-slate-500">Deck:</span>
                <select
                  value={flashcardDeckType}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    setFlashcardDeckType(newType);
                    localStorage.setItem("lexiflow_deck_type", newType);
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none"
                >
                  <option value="all">Full Dictionary ({VOCAB.length} words)</option>
                  <option value="learning">Study List ({VOCAB.length - progress.masteredIds.length} left)</option>
                  <option value="starred">Starred List ({progress.starredIds.length} items)</option>
                </select>
              </div>

              {/* Search Box in Card Section: Jump to Word and continue deck seamlessly */}
              <div className="relative flex-1 max-w-xs w-full sm:w-auto">
                <input
                  type="text"
                  value={flashcardSearchQuery}
                  onChange={(e) => {
                    setFlashcardSearchQuery(e.target.value);
                    setIsSearchDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (flashcardSearchQuery.trim()) setIsSearchDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchResults.length > 0) {
                      e.preventDefault();
                      jumpToSearchWord(searchResults[0].index);
                    } else if (e.key === "Escape") {
                      setIsSearchDropdownOpen(false);
                    }
                  }}
                  placeholder="พิมพ์ค้นหาคำ แล้วกด Enter เพื่อกระโดด..."
                  className="w-full bg-slate-50 border border-slate-200 hover:border-[#E5DDD8] focus:border-[#B8A3A0] rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-700 focus:outline-none placeholder:text-slate-400 transition"
                />
                <svg className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {flashcardSearchQuery && (
                  <button
                    onClick={() => {
                      setFlashcardSearchQuery("");
                      setIsSearchDropdownOpen(false);
                    }}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                {/* Floating Autocomplete Dropdown */}
                {isSearchDropdownOpen && flashcardSearchQuery.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E5DDD8] rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.length > 0 ? (
                      searchResults.map(({ word, index }) => (
                        <div
                          key={word.id}
                          onClick={() => jumpToSearchWord(index)}
                          className="px-3 py-2 hover:bg-amber-50/70 cursor-pointer transition flex items-center justify-between text-left group"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-800 group-hover:text-[#A28C89] transition">
                              {word.word}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1.5 font-medium">
                              {word.meaning}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            #{index + 1}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-[11px] text-slate-400 text-center">
                        ไม่พบคำศัพท์ในสำรับนี้
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={toggleStoryLengthMode}
                  className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition flex items-center gap-1.5 shadow-2xs ${
                    storyLengthMode === "longer"
                      ? "bg-sky-50 border-sky-300 text-sky-700 font-extrabold"
                      : "bg-white border-slate-200 text-slate-500 hover:text-slate-700"
                  }`}
                  title="ความยาวประโยค: คลิกเพื่อสลับ 'ปกติ (4-6 คำ)' หรือ 'ยาวขึ้น (6-9 คำ)' - ระบบจะจำค่านี้ไว้ตลอด"
                >
                  <span className="text-xs">{storyLengthMode === "longer" ? "📖" : "📏"}</span>
                  <span>{storyLengthMode === "longer" ? "ยาวขึ้น (6-9 คำ)" : "ปกติ (4-6 คำ)"}</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentCardIndex(0);
                    setShowStoryTranslation(false);
                  }}
                  disabled={currentCardIndex === 0 || flashcardWords.length === 0}
                  className="text-xs font-bold text-[#A28C89] disabled:text-slate-400 bg-[#F5F1EE] disabled:bg-slate-50 hover:bg-[#A28C89] hover:text-white border border-[#E5DDD8] disabled:border-slate-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow-sm disabled:shadow-none"
                  title="Reset to first card"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                  First Word
                </button>
                <div className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200/60 px-3 py-1.5 rounded-lg">
                  {flashcardWords.length === 0 ? "0 of 0" : `${currentCardIndex + 1} of ${flashcardWords.length}`}
                </div>
              </div>
            </div>

            {flashcardWords.length === 0 ? (
              <div className="bg-white/90 border border-[#E5E0DC] rounded-3xl p-12 text-center max-w-md w-full flex flex-col gap-4 items-center shadow-md">
                <h3 className="text-lg font-bold text-slate-800">This deck is empty</h3>
                <button onClick={() => setFlashcardDeckType("all")} className="bg-[#A28C89] hover:bg-[#B8A3A0] px-4 py-2 rounded-xl text-xs font-bold transition text-white shadow-sm">
                  Load All Words
                </button>
              </div>
            ) : (
                <div className="w-full flex flex-col gap-6 items-center">
                  {/* API Warning/Error Alert Banner */}
                  {apiError && (
                    <div className="w-full max-w-3xl bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-100 text-amber-600 shrink-0">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="flex flex-col gap-0.5 text-left">
                          <span className="font-bold uppercase tracking-wider text-amber-700">
                            {apiError.includes("429") || apiError.toLowerCase().includes("quota")
                              ? "⚠️ AI กำลังพักประมวลผลชั่วคราวเนื่องจากเรียกใช้งานถี่เกินไป (Rate Limit)"
                              : "Gemini API Warning"}
                          </span>
                          <p className="text-slate-600 font-medium">
                            {apiError.includes("429") || apiError.toLowerCase().includes("quota")
                              ? "กรุณารอประมาณ 1 นาทีโดยหลีกเลี่ยงการกดรีเฟรชหน้าจอรัวๆ (เพื่อไม่ให้นับเวลาเริ่มต้นใหม่) ระหว่างนี้คุณสามารถอ่านประโยคตัวอย่างจำลองภาษาไทยที่เราเตรียมไว้เพื่อเรียนรู้ต่อได้ทันทีครับ"
                              : `เกิดข้อผิดพลาดในการดึงข้อมูลจาก AI: ${apiError} (ระบบได้นำประโยคตัวอย่างจำลองขึ้นมาแสดงชั่วคราว)`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Single Clean Flashcard (No 3D Flip) */}
                  <div
                    className={`w-full max-w-3xl min-h-[500px] bg-white/95 rounded-3xl p-4 sm:p-6 md:p-8 flex flex-col justify-between shadow-lg shadow-stone-200/30 border border-[#E5E0DC] transition ${
                      cardTransition === "swipe-left"
                        ? "swipe-left"
                        : cardTransition === "swipe-right"
                        ? "swipe-right"
                        : ""
                    }`}
                  >
                        <div className="w-full flex justify-between items-center border-b border-slate-100 pb-2 sm:pb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              {currentWordObj.level && (
                                <span className="text-[8.5px] sm:text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {currentWordObj.level}
                                </span>
                              )}
                              <span className={`text-[8.5px] sm:text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full ${getPosBadgeColor(currentWordObj.pos)}`}>
                                {currentWordObj.pos}
                              </span>
                            </div>
                            {reviewWords.some(rw => rw.word.toLowerCase() === currentWordObj.word.toLowerCase()) ? (
                              <div className="flex items-center gap-1">
                                <span className="bg-rose-50 border border-rose-200 text-[#A28C89] text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                                  <svg className="w-3 h-3 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  ในคลังทวน
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rw = reviewWords.find(item => item.word.toLowerCase() === currentWordObj.word.toLowerCase());
                                    if (rw) openEditReviewWord(rw);
                                  }}
                                  className="bg-white hover:bg-rose-50 border border-slate-200 hover:border-[#E5DDD8] text-[#A28C89] text-[10px] font-bold px-1.5 py-0.5 rounded-lg transition flex items-center gap-1"
                                  title="แก้ไขคำแปลของคำนี้ในคลัง"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  แก้คำแปล
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addWordToReviewList(
                                    currentWordObj.word,
                                    currentWordObj.pos,
                                    activeCardData?.wordTranslation || currentWordObj.meaning || "คำแปลของการ์ดหลัก",
                                    currentWordObj.id,
                                    false,
                                    activeCardData?.thaiPronunciation || currentWordObj.pronunciation || ""
                                  );
                                  if (progress.masteredIds.includes(currentWordObj.id)) {
                                    toggleMastered(currentWordObj.id);
                                  }
                                  if (activeCardData) {
                                    addCardToCache(currentWordObj.id, activeCardData);
                                  }
                                }}
                                className="transition flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border bg-slate-50 border-slate-200 text-slate-500 hover:bg-rose-50 hover:border-[#EBE3DE] hover:text-[#A28C89]"
                                title="Add to Review List (ยังจำไม่ได้)"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                ทวนคำนี้ (จำไม่ได้)
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = toggleStoryLengthMode();
                                if (confirm(`สลับเป็น ${next === "longer" ? "โหมดยาวขึ้น (6-9 คำ)" : "โหมดปกติ (4-6 คำ)"} เรียบร้อยแล้ว (ระบบจะจำค่าไว้ใช้ตลอด)\n\nต้องการรีเซ็ตเพื่อสร้างบทความคำว่า "${currentWordObj.word}" ใหม่ด้วยโหมดนี้ทันทีเลยไหม?`)) {
                                  resetAndRegenerateCard(next);
                                }
                              }}
                              className={`inline-flex items-center gap-1 border px-2 py-1 rounded-lg text-[10px] font-bold transition shadow-2xs ${
                                storyLengthMode === "longer"
                                  ? "bg-sky-50 border-sky-300 text-sky-700 font-extrabold"
                                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-700"
                              }`}
                              title="ความยาวประโยค: คลิกเพื่อสลับ 'ปกติ (4-6 คำ)' หรือ 'ยาวขึ้น (6-9 คำ)' (ระบบจะจำค่าไว้ให้อัตโนมัติ)"
                            >
                              <span>{storyLengthMode === "longer" ? "📖 ยาวขึ้น" : "📏 ปกติ"}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`ต้องการรีเซ็ตและสร้างบทความคำว่า "${currentWordObj.word}" ใหม่ด้วย AI ใช่หรือไม่? (ข้อมูลเก่าจะถูกลบและแทนที่ด้วยอันใหม่)`)) {
                                  resetAndRegenerateCard();
                                }
                              }}
                              className="inline-flex items-center gap-1 bg-white hover:bg-rose-50 text-slate-500 hover:text-[#A28C89] border border-slate-200 hover:border-rose-200 px-2 py-1 rounded-lg text-[10px] font-bold transition shadow-2xs"
                              title="รีเซ็ตและสร้างบทความคำนี้ใหม่ด้วย AI"
                            >
                              <svg className="w-3.5 h-3.5 text-slate-400 hover:text-[#A28C89]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span>รีเซ็ตการ์ด</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStarred(currentWordObj.id);
                              }}
                              className="text-slate-400 hover:text-amber-500 transition"
                            >
                              <svg
                                className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${
                                  progress.starredIds.includes(currentWordObj.id)
                                    ? "fill-amber-400 text-amber-500"
                                    : "text-slate-300 hover:text-slate-500"
                                  }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Title Word */}
                        <div className="my-2 sm:my-3 text-center">
                          <h3 className="text-2xl xs:text-3xl md:text-4xl font-black tracking-tight text-slate-800 inline-flex items-center gap-2.5 sm:gap-3 justify-center">
                            {currentWordObj.word}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                speakWord(currentWordObj.word);
                              }}
                              className="bg-slate-100 hover:bg-slate-200 p-1.5 sm:p-2 rounded-full text-slate-500 hover:text-slate-800 transition"
                              title="ออกเสียงคำศัพท์"
                            >
                              <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                            </button>
                          </h3>
                          <div className="flex flex-col items-center gap-1 mt-1">
                            <p className="text-xs sm:text-sm text-[#A28C89] font-bold tracking-wide">
                              [{currentWordObj.pronunciation || activeCardData?.thaiPronunciation}] · {currentWordObj.meaning || activeCardData?.wordTranslation}
                            </p>
                            {currentWordObj.ipa && (
                              <p className="text-[11px] text-slate-400 font-mono tracking-wide">
                                /{currentWordObj.ipa}/
                              </p>
                            )}
                          </div>
                        </div>

                        {/* UNIFIED 1-ARTICLE PASSAGE (บทความสั้นเชื่อมโยงคำศัพท์) */}
                        <div className="flex-1 flex flex-col justify-center my-1 sm:my-2">
                          {loadingAI ? (
                            <div className="flex flex-col items-center gap-3 py-8">
                              <div className="w-7 h-7 border-3 border-[#B8A3A0] border-t-transparent rounded-full animate-spin" />
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                                กำลังสร้างบทความเชื่อมโยงคำศัพท์ด้วย AI...
                              </span>
                            </div>
                          ) : activeCardData ? (
                            <div
                              className="bg-[#f8faff] border border-slate-100 rounded-2xl p-4 sm:p-5 max-w-2xl mx-auto w-full text-left shadow-xs space-y-3.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Article Header Controls */}
                              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                <span className="text-[10px] sm:text-xs font-bold bg-[#e6f4ff] text-[#0958d9] border border-[#d2e9ff] px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                                  <span>📖</span>
                                  <span>{activeCardData.articleTitle || "บทความสั้นเชื่อมโยงคำศัพท์"}</span>
                                </span>

                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  {/* Audio Mode Switcher: 🗣️ พูดตาม / ⚡ พูดยาว / 🐢 ช้า */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const nextMode =
                                        audioLearningMode === "flow" ? "shadowing" : audioLearningMode === "shadowing" ? "slow" : "flow";
                                      setAudioLearningMode(nextMode);
                                      localStorage.setItem("lexiflow_audio_mode", nextMode);
                                    }}
                                    className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-2 py-1 rounded-lg text-[10px] font-bold transition shadow-2xs cursor-pointer"
                                    title="คลิกเพื่อสลับโหมดเสียง: ⚡ พูดยาว (ธรรมชาติ) / 🗣️ พูดตาม (เว้นจังหวะ) / 🐢 ช้า (ชัดเจน)"
                                  >
                                    {audioLearningMode === "flow" && <span>⚡ พูดยาว</span>}
                                    {audioLearningMode === "shadowing" && <span>🗣️ พูดตาม</span>}
                                    {audioLearningMode === "slow" && <span>🐢 ช้า</span>}
                                  </button>

                                  {/* Voice Selector Popover: 10 Natural AI Voices */}
                                  <div className="relative" ref={voiceDropdownRef}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsVoiceDropdownOpen((prev) => !prev);
                                      }}
                                      className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-2 py-1 rounded-lg text-[10px] font-bold transition shadow-2xs cursor-pointer"
                                      title="คลิกเพื่อเลือกเสียง AI (Ava, Jenny, Guy, Andrew, Sonia ฯลฯ)"
                                    >
                                      <span className="text-[11px]">🎙️</span>
                                      <span>{AVAILABLE_VOICES.find((v) => v.id === ttsVoice)?.name || "Ava"}</span>
                                      <svg
                                        className={`w-2.5 h-2.5 text-slate-400 transition-transform duration-200 ${
                                          isVoiceDropdownOpen ? "rotate-180" : ""
                                        }`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>

                                    {isVoiceDropdownOpen && (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 top-full mt-1.5 w-60 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150"
                                      >
                                        <div className="px-2 py-1 border-b border-slate-100 flex items-center justify-between">
                                          <span className="font-bold text-[11px] text-slate-600">เลือกเสียง AI (Neural)</span>
                                          <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">ฟรี 100%</span>
                                        </div>

                                        {/* 1. US Female */}
                                        <div>
                                          <div className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <span>👩</span> เสียงผู้หญิง (US)
                                          </div>
                                          <div className="space-y-0.5">
                                            {AVAILABLE_VOICES.filter((v) => v.region === "US" && v.gender === "female").map((v) => {
                                              const isSelected = ttsVoice === v.id;
                                              return (
                                                <button
                                                  key={v.id}
                                                  type="button"
                                                  onClick={() => {
                                                    setTtsVoice(v.id);
                                                    localStorage.setItem("lexiflow_tts_voice", v.id);
                                                    setIsVoiceDropdownOpen(false);
                                                  }}
                                                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer ${
                                                    isSelected ? "bg-amber-50 text-amber-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-1.5 truncate">
                                                    <span className="text-[12px]">{v.flag}</span>
                                                    <span className="font-bold text-[11px]">{v.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-normal truncate">({v.desc})</span>
                                                  </div>
                                                  {isSelected && (
                                                    <svg className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                  )}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        {/* 2. US Male */}
                                        <div>
                                          <div className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <span>👨</span> เสียงผู้ชาย (US)
                                          </div>
                                          <div className="space-y-0.5">
                                            {AVAILABLE_VOICES.filter((v) => v.region === "US" && v.gender === "male").map((v) => {
                                              const isSelected = ttsVoice === v.id;
                                              return (
                                                <button
                                                  key={v.id}
                                                  type="button"
                                                  onClick={() => {
                                                    setTtsVoice(v.id);
                                                    localStorage.setItem("lexiflow_tts_voice", v.id);
                                                    setIsVoiceDropdownOpen(false);
                                                  }}
                                                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer ${
                                                    isSelected ? "bg-amber-50 text-amber-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-1.5 truncate">
                                                    <span className="text-[12px]">{v.flag}</span>
                                                    <span className="font-bold text-[11px]">{v.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-normal truncate">({v.desc})</span>
                                                  </div>
                                                  {isSelected && (
                                                    <svg className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                  )}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        {/* 3. UK British */}
                                        <div>
                                          <div className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <span>🇬🇧</span> สำเนียงบริติช (UK)
                                          </div>
                                          <div className="space-y-0.5">
                                            {AVAILABLE_VOICES.filter((v) => v.region === "UK").map((v) => {
                                              const isSelected = ttsVoice === v.id;
                                              return (
                                                <button
                                                  key={v.id}
                                                  type="button"
                                                  onClick={() => {
                                                    setTtsVoice(v.id);
                                                    localStorage.setItem("lexiflow_tts_voice", v.id);
                                                    setIsVoiceDropdownOpen(false);
                                                  }}
                                                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer ${
                                                    isSelected ? "bg-amber-50 text-amber-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-1.5 truncate">
                                                    <span className="text-[12px]">{v.flag}</span>
                                                    <span className="font-bold text-[11px]">{v.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-normal truncate">({v.desc})</span>
                                                  </div>
                                                  {isSelected && (
                                                    <svg className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                  )}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Audio Button: Listen to Full Article */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      speakFullArticle(activeCardData);
                                    }}
                                    className={`inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition shadow-2xs cursor-pointer ${
                                      ttsSpeakingText ? "text-sky-600 bg-sky-50 border-sky-200 animate-pulse" : "hover:bg-sky-50 text-slate-700 hover:text-sky-600"
                                    }`}
                                    title="ฟังเสียงบทความทั้งเรื่อง (การอ่านออกเสียงที่เป็นธรรมชาติ)"
                                  >
                                    <svg className="w-3.5 h-3.5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    </svg>
                                    <span>{ttsSpeakingText ? "กำลังอ่าน..." : "ฟังบทความ"}</span>
                                  </button>
                                </div>
                              </div>

                              {/* 1. Continuous English Story Passage (ไม่แบ่ง 1 2 3 4 5) */}
                              <div className="text-[13.5px] xs:text-sm sm:text-[15px] font-medium text-slate-800 leading-relaxed space-y-1">
                                {activeCardData.sentences.map((s, idx) => (
                                  <span key={idx} className="group inline">
                                    <span className="inline hover:bg-sky-100/70 rounded px-0.5 transition cursor-pointer">
                                      {renderInteractiveSentence(s.sentence, s)}
                                    </span>{" "}
                                  </span>
                                ))}
                              </div>

                              {/* 2. โครงสร้าง & Tense (อังกฤษล้วน วางใต้ประโยคเลย) */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400">โครงสร้าง & Tense:</span>
                                {activeCardData.sentences.map((s, idx) => (
                                  <span key={idx} className="text-[8.5px] sm:text-[9.5px] font-extrabold bg-[#e6f4ff] text-[#0958d9] border border-[#d2e9ff] px-2 py-0.5 rounded-md font-mono shadow-2xs">
                                    {s.structure}
                                  </span>
                                ))}
                              </div>

                              {/* 3. ปุ่มกดเปิด/ปิดคำแปลบทความ + ปุ่มเปิด/ปิดโน๊ตส่วนตัว (เริ่มต้นปิดทุกครั้ง) */}
                              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowStoryTranslation(!showStoryTranslation);
                                  }}
                                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border shadow-xs cursor-pointer ${
                                    showStoryTranslation
                                      ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                                      : "bg-gradient-to-r from-sky-50 to-indigo-50 hover:from-sky-100 hover:to-indigo-100 border-sky-200 text-sky-800"
                                  }`}
                                >
                                  <span>{showStoryTranslation ? "🙈 ซ่อนคำแปลบทความ (Spacebar)" : "👁️ แสดงคำแปลบทความทั้งเรื่อง (Spacebar)"}</span>
                                </button>

                                {(() => {
                                  const hasNote = hasCardNoteContent(progress.notes[currentWordObj.id]);
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowCardNote((prev) => !prev);
                                      }}
                                      className={`sm:w-auto py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border shadow-xs cursor-pointer ${
                                        showCardNote
                                          ? "bg-[#F5F1EE] border-[#A28C89] text-[#8E7774]"
                                          : hasNote
                                          ? "bg-amber-50/80 hover:bg-amber-100/80 border-amber-200 text-amber-800"
                                          : "bg-white hover:bg-[#FAF7F5] border-[#E5DDD8] text-slate-600"
                                      }`}
                                      title="เปิด/ปิดโน๊ตส่วนตัว คำอธิบาย และตารางของคำนี้"
                                    >
                                      <span>{showCardNote ? "🙈 ซ่อนโน๊ต" : hasNote ? "📝 แสดงโน๊ตที่จดไว้" : "📝 เพิ่มโน๊ต"}</span>
                                      {hasNote && !showCardNote && (
                                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                      )}
                                    </button>
                                  );
                                })()}
                              </div>

                              {/* 4. กล่องคำแปลไทยเมื่อกดเปิด (ยาวต่อเนื่อง ไม่แบ่ง 1 2 3 4 5) */}
                              {showStoryTranslation && (
                                <div className="bg-white/95 rounded-xl p-3 sm:p-4 border border-slate-200 space-y-2.5 mt-2 animate-fadeIn">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                      <span>📜</span>
                                      <span>คำแปลบทความทั้งเรื่อง:</span>
                                    </span>
                                  </div>
                                  <p className="text-[12.5px] sm:text-[13.5px] text-slate-700 font-medium leading-relaxed bg-[#f8faff] rounded-lg p-2.5 border border-slate-100">
                                    {activeCardData.fullArticleThai || activeCardData.sentences.map((s) => s.translation).join(" ")}
                                  </p>
                                </div>
                              )}

                              {/* 5. กล่องโน๊ตส่วนตัว (Rich Text เปลี่ยนสีได้ + เพิ่มตารางเองได้ — เริ่มต้นปิดทุกครั้ง) */}
                              {showCardNote && (
                                <CardNoteEditor
                                  wordId={currentWordObj.id}
                                  rawValue={progress.notes[currentWordObj.id] || ""}
                                  onSave={saveNote}
                                />
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 text-center">ไม่สามารถโหลดข้อมูลบทความได้</p>
                          )}
                        </div>

                        {/* Card Bottom Shortcuts Hint */}
                        <div className="flex justify-center mt-3 pt-2 border-t border-slate-100">
                          <span className="text-[9.5px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center leading-snug">
                            💡 กด Spacebar เพื่อแสดง/ซ่อนคำแปล • ⬅️ ➡️ ปุ่มลูกศรเพื่อเปลี่ยนการ์ด
                          </span>
                        </div>
                      </div>

                  {/* Interactive Controls & Swipe Buttons */}
                  <div className="w-full max-w-xl flex items-center justify-between gap-4">
                    <button
                      onClick={() => handleCardPrev()}
                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 py-3 rounded-2xl text-xs font-extrabold text-slate-600 transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>

                    <button
                      onClick={() => {
                        const isMastered = progress.masteredIds.includes(currentWordObj.id);
                        if (!isMastered) {
                          toggleMastered(currentWordObj.id);
                          if (activeCardData) {
                            addCardToCache(currentWordObj.id, activeCardData);
                          }
                        } else {
                          handleCardNext("swipe-right");
                        }
                      }}
                      className={`flex-1 py-3 rounded-2xl text-xs font-extrabold text-white transition flex items-center justify-center gap-2 shadow-md ${
                        progress.masteredIds.includes(currentWordObj.id)
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-100/50"
                          : "bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-100/50"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        {progress.masteredIds.includes(currentWordObj.id) ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        )}
                      </svg>
                      {progress.masteredIds.includes(currentWordObj.id) ? "Next Card" : "Mastered"}
                    </button>

                    <button
                      onClick={() => handleCardNext("swipe-left")}
                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 py-3 rounded-2xl text-xs font-extrabold text-slate-600 transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      Skip
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 text-center font-bold uppercase tracking-widest hidden md:block">
                    Press <span className="text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">Space</span> to show/hide translation •{" "}
                    <span className="text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">← / →</span> to navigate
                  </p>
                </div>
              )
            }
          </section>
        )}

        {/* ------------------------------------------------------------------------
            TAB 3: QUIZ ARENA
        ------------------------------------------------------------------------ */}
        {activeTab === "quiz" && (
          <section className="flex flex-col items-center gap-6 max-w-3xl mx-auto w-full">
            {!quizStarted ? (
              <div className="w-full flex flex-col gap-6">
                <div className="bg-white/90 border border-[#E5E0DC] rounded-3xl p-6 md:p-8 text-center flex flex-col gap-4 shadow-sm">
                  <h2 className="text-2xl font-black text-slate-800">Quiz Arena</h2>
                  <p className="text-sm text-slate-500 max-w-md mx-auto font-medium">
                    Challenge yourself to reinforce your vocabulary memory. Select a mode to start playing.
                  </p>

                  <div className="flex flex-col items-center gap-2.5 mt-2 border-t border-slate-100 pt-4">
                    <span className="text-xs font-bold text-slate-600">เลือกคลังคำศัพท์ที่ต้องการเล่น:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setQuizPoolType("unmastered")}
                        className={`px-4 py-2.5 rounded-xl text-xs font-extrabold border transition ${
                          quizPoolType === "unmastered"
                            ? "bg-[#F5F1EE] border-[#E5DDD8] text-[#A28C89]"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        ศัพท์ที่ยังจำไม่ได้ ({VOCAB.length - progress.masteredIds.length} คำ)
                      </button>
                      <button
                        onClick={() => setQuizPoolType("mastered")}
                        className={`px-4 py-2.5 rounded-xl text-xs font-extrabold border transition ${
                          quizPoolType === "mastered"
                            ? "bg-[#F5F1EE] border-[#E5DDD8] text-[#A28C89]"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        ศัพท์ที่จำได้แล้ว ({progress.masteredIds.length} คำ)
                      </button>
                    </div>
                  </div>
                </div>

                {quizPoolType === "mastered" && progress.masteredIds.length === 0 ? (
                  <div className="bg-white/90 border border-[#E5E0DC] rounded-3xl p-8 text-center flex flex-col items-center gap-4 shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="flex flex-col gap-1 max-w-md">
                      <h3 className="text-base font-bold text-slate-800">ไม่มีคำศัพท์ที่จำได้แล้ว</h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        คุณยังไม่ได้กดเลือก 'จำได้แล้ว' ให้กับคำศัพท์ใดๆ เลย กรุณาเปลี่ยนตัวเลือกเป็น 'ศัพท์ที่ยังจำไม่ได้' หรือไปทำเครื่องหมายติ้กจำได้แล้วในเมนู Word Explorer ก่อนเริ่มเล่นครับ!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-white/90 border border-[#E5E0DC] rounded-3xl p-5 flex flex-col justify-between gap-5 shadow-sm hover:border-[#E5DDD8] transition">
                      <div className="flex flex-col gap-2.5">
                        <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <h3 className="text-base font-bold text-slate-800">Part of Speech</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          ทายหน้าที่ของคำศัพท์ (Noun, Verb, Adjective, หรืออื่นๆ)
                        </p>
                      </div>
                      <button onClick={() => startQuiz("pos")} className="w-full bg-[#A28C89] hover:bg-[#B8A3A0] text-white font-extrabold text-xs py-2.5 rounded-xl transition shadow-md">
                        Start Mode
                      </button>
                    </div>

                    <div className="bg-white/90 border border-[#E5E0DC] rounded-3xl p-5 flex flex-col justify-between gap-5 shadow-sm hover:border-emerald-200 transition">
                      <div className="flex flex-col gap-2.5">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                        <h3 className="text-base font-bold text-slate-800">Letter Scramble</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          สลับตัวอักษรที่ปนกันให้สะกดคำศัพท์ได้ถูกต้อง
                        </p>
                      </div>
                      <button onClick={() => startQuiz("spelling")} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs py-2.5 rounded-xl transition shadow-md">
                        Start Mode
                      </button>
                    </div>

                    <div className="bg-white/90 border border-[#E5E0DC] rounded-3xl p-5 flex flex-col justify-between gap-5 shadow-sm hover:border-[#E5DDD8] transition">
                      <div className="flex flex-col gap-2.5">
                        <div className="w-11 h-11 rounded-2xl bg-pink-50 text-pink-600 border border-pink-100 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                        </div>
                        <h3 className="text-base font-bold text-slate-800">Missing Letters</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          เติมตัวอักษรในช่องว่าง (เช่น a_a_d_n) ให้สมบูรณ์
                        </p>
                      </div>
                      <button onClick={() => startQuiz("missing")} className="w-full bg-[#A28C89] hover:bg-[#8D7774] text-white font-extrabold text-xs py-2.5 rounded-xl transition shadow-md">
                        Start Mode
                      </button>
                    </div>

                    {/* NEW 4th MODE: Story Builder Puzzle */}
                    <div className="bg-white/90 border-2 border-indigo-200/80 rounded-3xl p-5 flex flex-col justify-between gap-5 shadow-sm hover:border-indigo-400 hover:shadow-indigo-100/50 transition">
                      <div className="flex flex-col gap-2.5">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold text-slate-800">Story Puzzle</h3>
                          <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">New</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          อ่านคำแปลภาษาไทยทั้งเรื่อง แล้วเลือกคำอังกฤษมาเรียงต่อกันเป็นบทความ ลากสลับตำแหน่งได้อิสระ!
                        </p>
                      </div>
                      <button onClick={() => startQuiz("story")} className="w-full bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-extrabold text-xs py-2.5 rounded-xl transition shadow-md">
                        Start Mode
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              (quizMode === "story" || currentQuizWord) && (
                <div className={`w-full flex flex-col gap-6 ${quizMode === "story" ? "max-w-3xl" : "max-w-xl"}`}>
                  <div className="flex justify-between items-center bg-white/90 border border-[#E5E0DC] px-6 py-3.5 rounded-2xl text-xs font-bold shadow-sm">
                    <button onClick={() => setQuizStarted(false)} className="text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                      Leave Quiz
                    </button>
                    <span className="text-[#A28C89] font-extrabold uppercase">
                      {quizMode === "pos"
                        ? "Part of Speech Quiz"
                        : quizMode === "spelling"
                        ? "Spelling Scramble"
                        : quizMode === "missing"
                        ? "Missing Letters"
                        : "Story Builder Puzzle"}
                    </span>
                    <span className="text-slate-600">
                      Score: <strong className="text-emerald-600">{quizScore}</strong>/{quizTotalQuestions}
                    </span>
                  </div>

                  {quizMode === "story" ? (
                    <div className="w-full flex flex-col gap-4">
                      {/* Story Thai Translation Box (The Target Prompt) */}
                      <div className="bg-white border border-[#E5E0DC] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <span className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                            <span>📜</span>
                            <span>{storyArticleTitle || "โจทย์บทความภาษาไทย"}</span>
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                            คำที่เลือกแล้ว: <strong className="text-sky-700">{selectedStoryChips.length}</strong> / {storyTargetTokens.length} คำ
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-slate-500 mb-1.5">
                            อ่านคำแปลภาษาไทยด้านล่าง แล้วเลือกคำศัพท์ภาษาอังกฤษมาต่อเรียงเป็นบทความที่ถูกต้อง:
                          </p>
                          <p className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed bg-[#f8faff] p-4 rounded-2xl border border-sky-100">
                            {storyThaiTranslation}
                          </p>
                        </div>
                      </div>

                      {/* Story Builder Playground (Assembled Chips) */}
                      <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 min-h-[160px] flex flex-col justify-between gap-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-slate-700">✍️ บทความภาษาอังกฤษที่คุณเรียง:</span>
                          </div>
                          {selectedStoryChips.length > 0 && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  if (selectedStoryChips.length === 0) return;
                                  const last = selectedStoryChips[selectedStoryChips.length - 1];
                                  handleRemoveStoryChip(last);
                                }}
                                className="text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition"
                                title="ลบคำล่าสุดออก"
                              >
                                ⌫ ลบคำล่าสุด
                              </button>
                              <button
                                onClick={handleResetStoryChips}
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-lg transition"
                                title="ล้างทั้งหมด"
                              >
                                ↺ ล้างกระดาน
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Hint for dragging/clicking */}
                        <div className="text-[10.5px] text-slate-400 font-medium">
                          💡 คลิกคำศัพท์เพื่อนำออก | คลิกค้างแล้วลากเพื่อสลับตำแหน่งไปวางตรงไหนก็ได้
                        </div>

                        {/* Selected Chips Box */}
                        <div className="flex flex-wrap items-center gap-2 min-h-[70px] p-3 bg-slate-50/70 rounded-2xl border border-slate-200">
                          {selectedStoryChips.length === 0 ? (
                            <p className="text-xs text-slate-400 font-medium italic w-full text-center py-4">
                              เริ่มต้นจากกระดานว่าง — คลิกเลือกคำศัพท์จากคลังคำด้านล่างเพื่อเริ่มเรียงบทความ
                            </p>
                          ) : (
                            selectedStoryChips.map((chip, idx) => (
                              <div
                                key={chip.id}
                                draggable
                                onDragStart={() => handleDragStartChip(idx)}
                                onDragOver={(e) => handleDragOverChip(e, idx)}
                                onDrop={() => handleDropChip(idx)}
                                onClick={() => handleRemoveStoryChip(chip)}
                                className={`cursor-grab active:cursor-grabbing select-none px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition shadow-2xs flex items-center gap-1.5 group ${
                                  dragOverChipIndex === idx
                                    ? "border-sky-500 bg-sky-100 ring-2 ring-sky-300 scale-105"
                                    : "bg-white border-slate-200 text-slate-800 hover:border-rose-300 hover:bg-rose-50"
                                }`}
                                title="คลิกเพื่อนำคำนี้ออก หรือลากเพื่อสลับตำแหน่ง"
                              >
                                <span className="text-[11px] text-slate-400 group-hover:text-rose-400">⠿</span>
                                <span>{chip.word}</span>
                                <span className="text-[10px] text-slate-300 group-hover:text-rose-600 font-extrabold ml-0.5">✕</span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Feedback Banner */}
                        {storyFeedback === "correct" && (
                          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-xs animate-correct">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">🎉</span>
                              <div>
                                <p className="text-xs font-black text-emerald-800 uppercase tracking-wider">ยอดเยี่ยมมาก! เรียงบทความได้ถูกต้อง 100%</p>
                                <p className="text-xs text-emerald-700 font-medium">คุณเข้าใจโครงสร้างและคำศัพท์บทความนี้ได้อย่างสมบูรณ์แบบ</p>
                              </div>
                            </div>
                            <button
                              onClick={startNewStoryPuzzle}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-sm whitespace-nowrap"
                            >
                              เล่นบทความถัดไป ➔
                            </button>
                          </div>
                        )}

                        {storyFeedback === "incorrect" && (
                          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-medium shadow-xs animate-shake">
                            <span className="text-xl">❌</span>
                            <div className="flex-1">
                              <p className="font-bold text-rose-900">ยังไม่ถูกต้องทั้งหมด หรือยังเรียงไม่ตรงตามลำดับ</p>
                              <p className="text-[11px] text-rose-700">ลองลากสลับตำแหน่งคำ หรือคลิกคำที่ไม่ถูกต้องเพื่อนำออกแล้วตรวจใหม่อีกครั้งครับ</p>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons: Check Answer */}
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={handleCheckStoryAnswer}
                            disabled={selectedStoryChips.length === 0}
                            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white font-black text-sm py-3 px-6 rounded-2xl transition shadow-md flex items-center justify-center gap-2"
                          >
                            <span>✅ ตรวจคำตอบ</span>
                          </button>
                          {storyFeedback === "correct" && (
                            <button
                              onClick={() => speakWord(storyTargetTokens.join(" "))}
                              className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-bold text-xs py-3 px-4 rounded-2xl transition flex items-center gap-1.5"
                              title="ฟังเสียงบทความที่ถูกต้อง"
                            >
                              <span>🔊 ฟังเสียงบทความ</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Word Bank Chips Area */}
                      <div className="bg-white/90 border border-[#E5E0DC] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                            <span>📦</span>
                            <span>คลังคำศัพท์ที่ให้เลือก ({storyWordChips.length} คำ):</span>
                          </span>
                          <span className="text-[10px] text-slate-400">คลิกที่คำศัพท์เพื่อนำไปใส่ในบทความ</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 min-h-[60px] p-2 bg-slate-50/50 rounded-2xl border border-slate-100">
                          {storyWordChips.length === 0 ? (
                            <p className="text-xs text-slate-400 font-medium italic w-full text-center py-2">
                              เลือกคำศัพท์ไปหมดแล้ว! กดปุ่ม "ตรวจคำตอบ" ด้านบนได้เลย
                            </p>
                          ) : (
                            storyWordChips.map((chip) => (
                              <button
                                key={chip.id}
                                onClick={() => handlePickStoryChip(chip)}
                                className="bg-white hover:bg-sky-50 active:scale-95 border border-slate-200 hover:border-sky-300 text-slate-700 hover:text-sky-800 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-2xs"
                              >
                                {chip.word}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    currentQuizWord && (
                      <>
                        <div className={`bg-white border border-[#E5E0DC] rounded-3xl p-8 flex flex-col items-center gap-4 text-center shadow-md ${
                          quizFeedback === "correct" ? "animate-correct" : quizFeedback === "incorrect" ? "animate-shake" : ""
                        }`}>
                          {quizMode === "pos" ? (
                            <>
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">What part of speech is</span>
                              <h2 className="text-3xl font-black text-slate-800 tracking-tight">{currentQuizWord.word}</h2>
                            </>
                          ) : quizMode === "spelling" ? (
                            <>
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                Spell this word (Part of Speech: <strong className="text-[#A28C89]">{currentQuizWord.pos}</strong>)
                              </span>
                              <h2 className="text-xl font-bold tracking-widest text-emerald-600 font-mono select-none">{scrambledWord}</h2>
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                Fill in the blanks (Part of Speech: <strong className="text-[#A28C89]">{currentQuizWord.pos}</strong>)
                              </span>
                              <h2 className="text-3xl font-extrabold tracking-widest text-slate-800 font-mono">{missingLettersHint}</h2>
                            </>
                          )}
                          <button onClick={() => speakWord(currentQuizWord.word)} className="bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 p-2.5 rounded-full transition mt-2 border border-slate-200">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                          </button>
                        </div>

                        {quizMode === "pos" ? (
                          <div className="grid grid-cols-2 gap-4">
                            {quizOptions.map((opt) => {
                              const isChosen = selectedAnswer === opt;
                              const isCorrectOpt = opt === currentQuizWord.pos;
                              
                              let btnStyle = "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-350 shadow-sm";
                              if (selectedAnswer !== null) {
                                if (isCorrectOpt) {
                                  btnStyle = "bg-emerald-500/20 border-emerald-500/50 text-emerald-600";
                                } else if (isChosen) {
                                  btnStyle = "bg-rose-500/20 border-rose-500/50 text-rose-500";
                                } else {
                                  btnStyle = "bg-slate-50/50 border-slate-100 text-slate-400 opacity-60";
                                }
                              }

                              return (
                                <button
                                  key={opt}
                                  disabled={selectedAnswer !== null}
                                  onClick={() => checkPosAnswer(opt)}
                                  className={`py-4 px-6 rounded-2xl border text-sm font-extrabold tracking-wide uppercase transition ${btnStyle}`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={spellingInput}
                                disabled={selectedAnswer !== null}
                                onChange={(e) => setSpellingInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") checkAnswer(spellingInput);
                                }}
                                placeholder={quizMode === "spelling" ? "Type spelled word..." : "Type complete word..."}
                                className="flex-1 bg-slate-50 border border-slate-200 focus:border-[#B8A3A0] focus:bg-white rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none placeholder:text-slate-400 font-semibold shadow-inner"
                              />
                              <button
                                disabled={selectedAnswer !== null || !spellingInput.trim()}
                                onClick={() => checkAnswer(spellingInput)}
                                className="bg-[#A28C89] hover:bg-[#B8A3A0] disabled:opacity-50 text-white font-extrabold text-xs px-6 rounded-2xl transition shadow-md"
                              >
                                Submit
                              </button>
                            </div>

                            {selectedAnswer !== null && (
                              <div className="bg-[#fcfdfa] border border-[#E5DDD8] p-4 rounded-2xl flex flex-col gap-1.5 text-center shadow-sm">
                                <span className={`text-xs font-extrabold uppercase ${quizFeedback === 'correct' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  {quizFeedback === "correct" ? "Correct!" : "Incorrect"}
                                </span>
                                <span className="text-sm text-slate-600 font-semibold">
                                  Answer: <strong className="text-slate-800 font-black">{currentQuizWord.word}</strong>
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {selectedAnswer !== null && (
                          <button
                            onClick={() => startNewQuizQuestion()}
                            className="w-full bg-gradient-to-r from-[#A28C89] to-[#C3B3B1] hover:from-[#B8A3A0] hover:to-[#D4C9C8] text-white font-extrabold text-sm py-4 rounded-2xl transition shadow-md duration-200"
                          >
                            Next Question
                          </button>
                        )}
                      </>
                    )
                  )}
                </div>
              )
            )}
          </section>
        )}

        {/* ------------------------------------------------------------------------
            TAB 4: WORD EXPLORER
        ------------------------------------------------------------------------ */}
        {activeTab === "explorer" && (
          <section className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/90 border border-[#E5E0DC] rounded-3xl p-5 shadow-sm">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1">Search Word</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search over 1500 words..."
                    className="w-full bg-slate-50 border border-slate-200 hover:border-[#E5DDD8] focus:border-[#B8A3A0] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 focus:outline-none placeholder:text-slate-400 transition"
                  />
                  <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1">Part of Speech</label>
                <select
                  value={explorerPosFilter}
                  onChange={(e) => setExplorerPosFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 hover:border-[#E5DDD8] text-slate-700 text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#B8A3A0] transition"
                >
                  <option value="all">All POS</option>
                  {posList.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1">Mastery Status</label>
                <select
                  value={explorerStatusFilter}
                  onChange={(e) => setExplorerStatusFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 hover:border-[#E5DDD8] text-slate-700 text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#B8A3A0] transition"
                >
                  <option value="all">All Statuses</option>
                  <option value="learning">Need to Study</option>
                  <option value="mastered">Mastered</option>
                  <option value="starred">Starred</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 pl-2">
              <span>Found <strong className="text-slate-600">{filteredWords.length}</strong> words match</span>
              <span>Showing {pagedWords.length} items</span>
            </div>

            {pagedWords.length === 0 ? (
              <div className="bg-white/90 border border-[#E5E0DC] rounded-3xl p-12 text-center flex flex-col gap-3 items-center shadow-sm">
                <h3 className="text-sm font-bold text-slate-700">No words found matching the criteria</h3>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {pagedWords.map((wordObj) => {
                    const isStarred = progress.starredIds.includes(wordObj.id);
                    const isMastered = progress.masteredIds.includes(wordObj.id);

                    return (
                      <div
                        key={wordObj.id}
                        className={`bg-white border rounded-2xl p-4.5 flex flex-col justify-between gap-4 transition group shadow-sm ${
                          isMastered ? "border-emerald-250 bg-emerald-50/20" : "border-[#E5E0DC] hover:border-[#E5DDD8]"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${getPosBadgeColor(wordObj.pos)}`}>
                            {wordObj.pos}
                          </span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleStarred(wordObj.id)} className="text-slate-400 hover:text-amber-500 transition">
                              <svg className={`w-5 h-5 ${isStarred ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                            <button onClick={() => speakWord(wordObj.word)} className="text-slate-400 hover:text-slate-700 transition">
                              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isMastered}
                            onChange={() => toggleMastered(wordObj.id)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-350 focus:ring-emerald-500 focus:ring-2 cursor-pointer transition shrink-0"
                          />
                          <h4 className="text-base font-extrabold text-slate-800 group-hover:text-[#A28C89] transition">{wordObj.word}</h4>
                        </div>

                        {hasCardNoteContent(progress.notes[wordObj.id]) && (
                          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 mt-1 italic line-clamp-2">
                            📝 {getNotePlainText(progress.notes[wordObj.id])}
                          </p>
                        )}

                        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-1">
                          <span className="text-[10px] text-slate-450 font-semibold">
                            Status: <strong className={isMastered ? "text-emerald-600" : "text-slate-400"}>{isMastered ? "จำได้แล้ว" : "ยังจำไม่ได้"}</strong>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                const isWordInReview = reviewWords.some(rw => rw.word.toLowerCase() === wordObj.word.toLowerCase());
                                if (isWordInReview) {
                                  const updated = reviewWords.filter(item => item.word.toLowerCase() !== wordObj.word.toLowerCase());
                                  setReviewWords(updated);
                                  updateReviewWordsInDb(updated);
                                } else {
                                  addWordToReviewList(
                                    wordObj.word,
                                    wordObj.pos,
                                    wordObj.meaning || "คำแปลของคำนี้",
                                    wordObj.id,
                                    false,
                                    wordObj.pronunciation || ""
                                  );
                                }
                              }}
                              className={`text-[10px] font-extrabold uppercase px-2.5 py-1.5 rounded-lg border transition ${
                                reviewWords.some(rw => rw.word.toLowerCase() === wordObj.word.toLowerCase())
                                  ? "bg-rose-50 border-rose-200 text-[#A28C89] hover:bg-rose-100"
                                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                              }`}
                            >
                              {reviewWords.some(rw => rw.word.toLowerCase() === wordObj.word.toLowerCase()) ? "ต้องทวน" : "ใส่คลังทวน"}
                            </button>
                            {reviewWords.some(rw => rw.word.toLowerCase() === wordObj.word.toLowerCase()) && (
                              <button
                                onClick={() => {
                                  const rw = reviewWords.find(item => item.word.toLowerCase() === wordObj.word.toLowerCase());
                                  if (rw) openEditReviewWord(rw);
                                }}
                                className="p-1.5 text-slate-400 hover:text-[#A28C89] bg-white border border-slate-200 hover:border-[#E5DDD8] rounded-lg transition"
                                title="แก้ไขคำแปลในคลัง"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredWords.length > pagedWords.length && (
                  <button
                    onClick={() => setExplorerPage((prev) => prev + 1)}
                    className="w-full max-w-xs mx-auto bg-white hover:bg-slate-55 border border-slate-200 text-slate-600 py-3.5 rounded-2xl text-xs font-extrabold uppercase tracking-wide transition flex items-center justify-center gap-2 mt-4 shadow-sm"
                  >
                    Load More Words
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* ------------------------------------------------------------------------
            TAB 5: REVIEW DECK (คลังทบทวน)
        ------------------------------------------------------------------------ */}
        {activeTab === "review" && (
          <section className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            <div className="bg-white border border-[#E5E0DC] rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">คลังทบทวนศัพท์หลัก (Review Deck - 3,440 คำ)</h2>
              <p className="text-xs text-slate-500 font-medium">คำศัพท์หลักจากพจนานุกรมที่คุณใส่เข้ามาเพิ่มเติมเพื่อฝึกฝนและทบทวนเพิ่มเติม</p>
            </div>

            <div className="bg-white/90 border border-[#E5E0DC] rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5 flex-1 w-full">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1">ค้นหาคำศัพท์ทวน</label>
                <div className="relative">
                  <input
                    type="text"
                    value={reviewSearchQuery}
                    onChange={(e) => setReviewSearchQuery(e.target.value)}
                    placeholder="ค้นหาคำศัพท์ในคลังทบทวน..."
                    className="w-full bg-slate-55 border border-slate-200 hover:border-[#E5DDD8] focus:border-[#B8A3A0] rounded-xl pl-10 pr-4 py-2 text-sm text-slate-700 focus:outline-none transition"
                  />
                  <svg className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Toggles for Pronunciation & Translation */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-1 md:pt-4">
                <button
                  onClick={() => setShowReviewPronunciation(!showReviewPronunciation)}
                  className={`text-xs font-bold px-3 py-2 rounded-xl border transition shadow-2xs flex items-center gap-1.5 ${
                    showReviewPronunciation
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      : "bg-white text-slate-400 border-slate-200 hover:text-slate-700"
                  }`}
                  title="เปิด/ปิด คำอ่านในคลังทบทวน"
                >
                  <span>🗣️ คำอ่าน: {showReviewPronunciation ? "เปิด" : "ปิด"}</span>
                </button>
                <button
                  onClick={() => setShowReviewTranslation(!showReviewTranslation)}
                  className={`text-xs font-bold px-3 py-2 rounded-xl border transition shadow-2xs flex items-center gap-1.5 ${
                    showReviewTranslation
                      ? "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                      : "bg-white text-slate-400 border-slate-200 hover:text-slate-700"
                  }`}
                  title="เปิด/ปิด คำแปลในคลังทบทวน (คลิกเพื่อฝึกจำ)"
                >
                  <span>👁️ คำแปล: {showReviewTranslation ? "เปิด" : "ปิด"}</span>
                </button>
              </div>
            </div>

            {/* List of Review Words */}
            {filteredReviewWords.length === 0 ? (
              <div className="bg-white/90 border border-[#E5E0DC] rounded-3xl p-12 text-center flex flex-col gap-3 items-center shadow-sm">
                <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <h3 className="text-sm font-bold text-slate-700">ไม่มีคำศัพท์ในรายการนี้</h3>
                <p className="text-xs text-slate-400">เมื่อคุณเล่นการ์ดและใส่คำศัพท์หลักเข้ามาทวน รายการคำศัพท์จะปรากฏที่นี่</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredReviewWords.map((rw) => (
                  <div
                    key={rw.id}
                    className="bg-white border border-[#E5E0DC] hover:border-[#E5DDD8] rounded-2xl p-4.5 flex flex-col justify-between gap-4 transition group shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${getPosBadgeColor(rw.pos)}`}>
                        {rw.pos}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => speakWord(rw.word)}
                          className="text-slate-400 hover:text-slate-700 transition"
                          title="ออกเสียง"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEditReviewWord(rw)}
                          className="text-slate-400 hover:text-[#A28C89] p-1 rounded-lg hover:bg-slate-50 transition"
                          title="แก้ไขคำแปล / คำอ่าน"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`คุณต้องการลบคำว่า "${rw.word}" ออกจากคลังทบทวน?`)) {
                              const updated = reviewWords.filter(item => item.id !== rw.id);
                              setReviewWords(updated);
                              updateReviewWordsInDb(updated);
                            }
                          }}
                          className="text-slate-450 hover:text-rose-500 transition"
                          title="ลบคำศัพท์"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5 flex-wrap">
                        <span>{rw.word}</span>
                        {showReviewPronunciation && rw.thaiPronunciation && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-sans">
                            [{rw.thaiPronunciation}]
                          </span>
                        )}
                      </h4>
                      {showReviewTranslation || revealedReviewIds.includes(rw.id) ? (
                        <p
                          onClick={() => openEditReviewWord(rw)}
                          className="text-xs font-bold text-[#A28C89] mt-1 cursor-pointer hover:underline flex items-center gap-1 group/trans"
                          title="คลิกเพื่อแก้ไขคำแปล"
                        >
                          <span>แปล: {rw.translation}</span>
                          <svg className="w-3 h-3 opacity-0 group-hover/trans:opacity-100 transition text-[#A28C89]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </p>
                      ) : (
                        <p
                          onClick={() => setRevealedReviewIds(prev => [...prev, rw.id])}
                          className="text-xs font-semibold text-slate-400 mt-1 cursor-pointer italic hover:text-[#A28C89] transition select-none"
                          title="คลิกเพื่อดูคำแปลคำนี้"
                        >
                          👁️ แตะเพื่อดูคำแปล
                        </p>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-2.5 mt-1 flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">
                        เพิ่มเมื่อ: {new Date(rw.addedAt).toLocaleDateString("th-TH")}
                      </span>
                      <button
                        onClick={() => {
                          if (rw.sourceWordId) {
                            toggleMastered(rw.sourceWordId);
                          }
                          const updated = reviewWords.filter(item => item.id !== rw.id);
                          setReviewWords(updated);
                          updateReviewWordsInDb(updated);
                        }}
                        className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg hover:bg-emerald-500 hover:text-white transition"
                      >
                        จำได้แล้ว
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "customWords" && (
          <section className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            <div className="bg-white border border-[#E5E0DC] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">คำศัพท์เพิ่มเติมที่เพิ่มเอง (Custom Vocabulary)</h2>
                <p className="text-xs text-slate-500 font-medium">คำศัพท์เสริมอื่นๆ ที่คุณเพิ่มขึ้นมาด้วยตัวเอง หรือกดคำใหม่จากในประโยคตัวอย่างเพื่อแปล</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const word = prompt("ใส่คำศัพท์ภาษาอังกฤษที่ต้องการเพิ่ม:");
                    if (word) {
                      openTranslationModal(word.trim());
                    }
                  }}
                  className="bg-[#A28C89] hover:bg-[#B8A3A0] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm font-sans"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  เพิ่มคำศัพท์ทวนเอง
                </button>
              </div>
            </div>

            <div className="bg-white/90 border border-[#E5E0DC] rounded-3xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1">ค้นหาคำศัพท์เพิ่มเอง</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customSearchQuery}
                      onChange={(e) => setCustomSearchQuery(e.target.value)}
                      placeholder="ค้นหาคำศัพท์ที่คุณเพิ่มเอง..."
                      className="w-full bg-slate-55 border border-slate-200 hover:border-[#E5DDD8] focus:border-[#B8A3A0] rounded-xl pl-10 pr-4 py-2 text-sm text-slate-700 focus:outline-none transition"
                    />
                    <svg className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Toggles for Pronunciation & Translation */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-1 md:pt-4">
                  <button
                    onClick={() => setShowReviewPronunciation(!showReviewPronunciation)}
                    className={`text-xs font-bold px-3 py-2 rounded-xl border transition shadow-2xs flex items-center gap-1.5 whitespace-nowrap ${
                      showReviewPronunciation
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                        : "bg-white text-slate-400 border-slate-200 hover:text-slate-700"
                    }`}
                    title="เปิด/ปิด คำอ่านในคลังเพิ่มเอง"
                  >
                    <span>🗣️ คำอ่าน: {showReviewPronunciation ? "เปิด" : "ปิด"}</span>
                  </button>
                  <button
                    onClick={() => setShowReviewTranslation(!showReviewTranslation)}
                    className={`text-xs font-bold px-3 py-2 rounded-xl border transition shadow-2xs flex items-center gap-1.5 whitespace-nowrap ${
                      showReviewTranslation
                        ? "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                        : "bg-white text-slate-400 border-slate-200 hover:text-slate-700"
                    }`}
                    title="เปิด/ปิด คำแปลในคลังเพิ่มเอง (คลิกเพื่อฝึกจำ)"
                  >
                    <span>👁️ คำแปล: {showReviewTranslation ? "เปิด" : "ปิด"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* List of Custom Words */}
            {filteredCustomWords.length === 0 ? (
              <div className="bg-white/90 border border-[#E5E0DC] rounded-3xl p-12 text-center flex flex-col gap-3 items-center shadow-sm">
                <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <h3 className="text-sm font-bold text-slate-700">ไม่มีคำศัพท์ในรายการนี้</h3>
                <p className="text-xs text-slate-400">เมื่อคุณกดเพิ่มคำศัพท์เอง หรือกดวิเคราะห์คำเสริมจากหน้าประโยคตัวอย่าง คำศัพท์จะโผล่ที่นี่</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredCustomWords.map((rw) => (
                  <div
                    key={rw.id}
                    className="bg-white border border-[#E5E0DC] hover:border-[#E5DDD8] rounded-2xl p-4.5 flex flex-col justify-between gap-4 transition group shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${getPosBadgeColor(rw.pos)}`}>
                        {rw.pos}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => speakWord(rw.word)}
                          className="text-slate-400 hover:text-slate-700 transition"
                          title="ออกเสียง"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEditReviewWord(rw)}
                          className="text-slate-400 hover:text-[#A28C89] p-1 rounded-lg hover:bg-slate-50 transition"
                          title="แก้ไขคำแปล / คำอ่าน"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`คุณต้องการลบคำว่า "${rw.word}" ออกจากคลังเพิ่มเอง?`)) {
                              const updated = reviewWords.filter(item => item.id !== rw.id);
                              setReviewWords(updated);
                              updateReviewWordsInDb(updated);
                            }
                          }}
                          className="text-slate-455 hover:text-rose-500 transition"
                          title="ลบคำศัพท์"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5 flex-wrap">
                        <span>{rw.word}</span>
                        {showReviewPronunciation && rw.thaiPronunciation && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-sans">
                            [{rw.thaiPronunciation}]
                          </span>
                        )}
                      </h4>
                      {showReviewTranslation || revealedReviewIds.includes(rw.id) ? (
                        <p
                          onClick={() => openEditReviewWord(rw)}
                          className="text-xs font-bold text-[#A28C89] mt-1 cursor-pointer hover:underline flex items-center gap-1 group/trans"
                          title="คลิกเพื่อแก้ไขคำแปล"
                        >
                          <span>แปล: {rw.translation}</span>
                          <svg className="w-3 h-3 opacity-0 group-hover/trans:opacity-100 transition text-[#A28C89]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </p>
                      ) : (
                        <p
                          onClick={() => setRevealedReviewIds(prev => [...prev, rw.id])}
                          className="text-xs font-semibold text-slate-400 mt-1 cursor-pointer italic hover:text-[#A28C89] transition select-none"
                          title="คลิกเพื่อดูคำแปล"
                        >
                          👁️ คลิกเพื่อดูคำแปล...
                        </p>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-2.5 mt-1 flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">
                        เพิ่มเมื่อ: {new Date(rw.addedAt).toLocaleDateString("th-TH")}
                      </span>
                      <button
                        onClick={() => {
                          const updated = reviewWords.filter(item => item.id !== rw.id);
                          setReviewWords(updated);
                          updateReviewWordsInDb(updated);
                        }}
                        className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg hover:bg-emerald-500 hover:text-white transition"
                      >
                        จำได้แล้ว
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ------------------------------------------------------------------------
            TAB 6: STUDY NOTES / KNOWLEDGE BASE (โน๊ตความรู้)
        ------------------------------------------------------------------------ */}
        {activeTab === "notes" && (
          <section className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            <div className="bg-white border border-[#E5E0DC] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">โน๊ตความรู้เพิ่มเติม (Knowledge Notes)</h2>
                <p className="text-xs text-slate-500 font-medium">บันทึกทริคการจำ ไวยากรณ์ หรือความรู้อื่นๆ ที่คุณพบนอกบทเรียน</p>
              </div>
              <button
                onClick={() => {
                  setNoteEditId("new");
                  setNoteTitleInput("");
                  setNoteContentInput("");
                }}
                className="bg-[#A28C89] hover:bg-[#B8A3A0] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm font-sans"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                เขียนโน๊ตใหม่
              </button>
            </div>

            {noteEditId !== null ? (
              // Notebook Editor View
              <div className="bg-white border border-[#E5E0DC] rounded-3xl p-6 shadow-md flex flex-col gap-4">
                <h3 className="text-base font-bold text-slate-800">
                  {noteEditId === "new" ? "เขียนโน๊ตความรู้ชิ้นใหม่" : "แก้ไขโน๊ตความรู้"}
                </h3>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">หัวข้อ (Title)</label>
                  <input
                    type="text"
                    value={noteTitleInput}
                    onChange={(e) => setNoteTitleInput(e.target.value)}
                    placeholder="เช่น หลักการจำการใช้ S+V+IO+DO, ทริคจำคำศัพท์..."
                    className="bg-slate-50 border border-slate-200 focus:border-[#B8A3A0] focus:bg-white rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">เนื้อหาโน๊ต (Content)</label>
                  <textarea
                    value={noteContentInput}
                    onChange={(e) => setNoteContentInput(e.target.value)}
                    placeholder="พิมพ์รายละเอียดเนื้อหา ทริค หรือเกร็ดความรู้ของคุณลงที่นี่..."
                    rows={10}
                    className="bg-slate-50 border border-slate-200 focus:border-[#B8A3A0] focus:bg-white rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none resize-none font-sans"
                  />
                </div>
                <div className="flex gap-3 justify-end mt-2">
                  <button
                    onClick={() => setNoteEditId(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => {
                      if (!noteTitleInput.trim() || !noteContentInput.trim()) return;
                      let updatedList: GeneralNote[] = [];
                      if (noteEditId === "new") {
                        const newNote: GeneralNote = {
                          id: `note-${Date.now()}`,
                          title: noteTitleInput.trim(),
                          content: noteContentInput.trim(),
                          updatedAt: new Date().toISOString()
                        };
                        updatedList = [newNote, ...generalNotes];
                      } else {
                        updatedList = generalNotes.map(note =>
                          note.id === noteEditId
                            ? { ...note, title: noteTitleInput.trim(), content: noteContentInput.trim(), updatedAt: new Date().toISOString() }
                            : note
                        );
                      }
                      setGeneralNotes(updatedList);
                      updateGeneralNotesInDb(updatedList);
                      setNoteEditId(null);
                    }}
                    disabled={!noteTitleInput.trim() || !noteContentInput.trim()}
                    className="bg-[#A28C89] hover:bg-[#B8A3A0] disabled:opacity-50 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-md"
                  >
                    บันทึกโน๊ต
                  </button>
                </div>
              </div>
            ) : (
              // Notebook Lists View
              <div className="flex flex-col gap-4">
                <div className="relative max-w-md w-full">
                  <input
                    type="text"
                    value={noteSearchQuery}
                    onChange={(e) => setNoteSearchQuery(e.target.value)}
                    placeholder="ค้นหาโน๊ต..."
                    className="w-full bg-white border border-[#E5E0DC] hover:border-[#E5DDD8] focus:border-[#B8A3A0] rounded-xl pl-10 pr-4 py-2 text-sm text-slate-700 focus:outline-none shadow-sm"
                  />
                  <svg className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {filteredGeneralNotes.length === 0 ? (
                  <div className="bg-white/90 border border-[#E5E0DC] rounded-3xl p-12 text-center flex flex-col gap-3 items-center shadow-sm">
                    <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <h3 className="text-sm font-bold text-slate-700">ไม่มีบันทึกความรู้</h3>
                    <p className="text-xs text-slate-400">เริ่มบันทึกทริคและเกร็ดความรู้ของคุณได้ทันทีโดยคลิก "เขียนโน๊ตใหม่"</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredGeneralNotes.map((note) => (
                      <div key={note.id} className="bg-white border border-[#E5E0DC] rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex justify-between items-start gap-4">
                            <h3 className="text-base font-extrabold text-slate-800 line-clamp-1">{note.title}</h3>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {new Date(note.updatedAt).toLocaleDateString("th-TH")}
                            </span>
                          </div>
                          <p className="text-xs text-slate-655 leading-relaxed font-semibold mt-3 whitespace-pre-wrap line-clamp-6 font-sans">
                            {note.content}
                          </p>
                        </div>
                        
                        <div className="border-t border-slate-100 pt-3 flex justify-end gap-3 mt-1">
                          <button
                            onClick={() => {
                              setNoteEditId(note.id);
                              setNoteTitleInput(note.title);
                              setNoteContentInput(note.content);
                            }}
                            className="text-xs font-bold text-[#A28C89] hover:text-[#B8A3A0] transition"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`คุณต้องการลบโน๊ต "${note.title}"?`)) {
                                const updated = generalNotes.filter(item => item.id !== note.id);
                                setGeneralNotes(updated);
                                updateGeneralNotesInDb(updated);
                              }
                            }}
                            className="text-xs font-bold text-rose-500 hover:text-rose-600 transition"
                          >
                            ลบ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

      </main>

      {/* WORD TRANSLATION AND ANALYSIS MODAL */}
      {showTranslateModal && (() => {
        const isEditingWord = Boolean(
          editingReviewWordId ||
          reviewWords.some(rw => rw.word.toLowerCase() === customWordInput.trim().toLowerCase())
        );

        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans animate-fade-in">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 text-left">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    {isEditingWord ? (
                      <>
                        <span className="text-rose-500">✏️</span> แก้ไขคำแปลในคลัง
                      </>
                    ) : (
                      <>
                        <span>➕</span> บันทึกคำศัพท์เข้าคลังทบทวน
                      </>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {isEditingWord
                      ? "แก้ไขคำแปลหรือคำอ่านให้ถูกต้องตามที่คุณต้องการ"
                      : "คำศัพท์นี้จะถูกบันทึกไว้ในคลังทบทวนของคุณ"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowTranslateModal(false);
                    setEditingReviewWordId(null);
                  }}
                  className="text-slate-450 hover:text-slate-600 transition p-1 rounded-lg"
                  title="ปิด"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {translationLoading ? (
                <div className="py-8 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-[#B8A3A0] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-500 font-extrabold uppercase tracking-wider">กำลังแปลคำศัพท์ด้วย AI...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider pl-1">
                      คำศัพท์ภาษาอังกฤษ (English Word)
                    </label>
                    <input
                      type="text"
                      value={customWordInput}
                      onChange={(e) => setCustomWordInput(e.target.value)}
                      className="bg-slate-50 border border-slate-200 focus:border-[#B8A3A0] focus:bg-white rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider pl-1">ประเภทคำ (POS)</label>
                      <select
                        value={customWordPos}
                        onChange={(e) => setCustomWordPos(e.target.value)}
                        className="bg-slate-50 border border-slate-200 hover:border-[#E5DDD8] text-slate-700 text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#B8A3A0] transition"
                      >
                        <option value="n.">Noun (n.)</option>
                        <option value="v.">Verb (v.)</option>
                        <option value="adj.">Adjective (adj.)</option>
                        <option value="adv.">Adverb (adv.)</option>
                        <option value="prep.">Preposition (prep.)</option>
                        <option value="conj.">Conjunction (conj.)</option>
                        <option value="pron.">Pronoun (pron.)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider pl-1">คำอ่านไทย (Phonetic)</label>
                      <input
                        type="text"
                        value={customWordPronunciation}
                        onChange={(e) => setCustomWordPronunciation(e.target.value)}
                        placeholder="เช่น ออพ-เพอร์-ทู-นิ-ที"
                        className="bg-slate-50 border border-slate-200 focus:border-[#B8A3A0] focus:bg-white rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center pl-1">
                      <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                        คำแปลภาษาไทย (Translation)
                      </label>
                      <button
                        type="button"
                        onClick={() => retranslateWithAI()}
                        disabled={translationLoading || !customWordInput.trim()}
                        className="text-[10px] font-bold text-[#A28C89] hover:text-[#8D7774] flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                        title="ให้ AI ช่วยแปลคำนี้ใหม่อีกครั้ง"
                      >
                        🔄 แปลใหม่ด้วย AI
                      </button>
                    </div>
                    <input
                      type="text"
                      value={customWordTranslation}
                      onChange={(e) => setCustomWordTranslation(e.target.value)}
                      placeholder="เช่น โอกาส, การช่วยเหลือ"
                      className="bg-slate-50 border-2 border-slate-200 focus:border-[#A28C89] focus:bg-white rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none font-semibold transition"
                      autoFocus
                    />
                    <span className="text-[10px] text-slate-400 pl-1 font-medium">
                      💡 สามารถพิมพ์แก้ไขคำแปลได้โดยตรง หากคำแปลเดิมไม่ถูกต้อง
                    </span>
                  </div>

                  {isEditingWord && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-bold animate-fade-in">
                      <span className="text-base">📌</span>
                      <div className="flex flex-col">
                        <span>คำนี้อยู่ในคลังทบทวนของคุณแล้ว</span>
                        <span className="text-[11px] font-normal text-amber-700">การกดบันทึกจะอัปเดตคำแปลในคลังและเซิร์ฟเวอร์ทันที</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTranslateModal(false);
                        setEditingReviewWordId(null);
                      }}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm py-3.5 rounded-2xl transition"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (customWordInput.trim() && customWordTranslation.trim()) {
                          addWordToReviewList(
                            customWordInput.trim(),
                            customWordPos,
                            customWordTranslation.trim(),
                            currentWordObj?.id,
                            true,
                            customWordPronunciation.trim()
                          );
                          setShowTranslateModal(false);
                          setEditingReviewWordId(null);
                        }
                      }}
                      disabled={!customWordInput.trim() || !customWordTranslation.trim()}
                      className="flex-2 bg-gradient-to-r from-[#A28C89] to-[#C3B3B1] hover:from-[#B8A3A0] hover:to-[#D4C9C8] disabled:opacity-50 text-white font-extrabold text-sm py-3.5 rounded-2xl transition shadow-md duration-200 flex items-center justify-center gap-2"
                    >
                      {isEditingWord ? "💾 บันทึกคำแปลที่แก้ไข" : "➕ บันทึกเข้าคลังทบทวน"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}