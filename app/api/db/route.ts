import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Ensure Next.js and Vercel NEVER cache database API routes
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://kfxjglkekkhzeaydnvfr.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmeGpnbGtla2toemVheWRudmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNDg3MDgsImV4cCI6MjEwMDgyNDcwOH0.230h8JNmrj4RAjgGpFHdhj5LZZni5dOZ9IEpU8m0iMQ";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
};

// Sequential execution queue to prevent concurrent read/write race conditions
async function enqueue<T>(op: () => Promise<T>): Promise<T> {
  if (!(global as any)._dbQueue) {
    (global as any)._dbQueue = Promise.resolve();
  }
  const prev = (global as any)._dbQueue;
  let resolve: any;
  const next = new Promise((r) => { resolve = r; });
  (global as any)._dbQueue = next;
  await prev;
  try {
    return await op();
  } finally {
    resolve();
  }
}

// Ensure local db exists as fallback
async function ensureLocalDb() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) { }

  try {
    await fs.access(DB_FILE);
  } catch (e) {
    try {
      const defaultData = {
        progress: {
          masteredIds: [],
          starredIds: [],
          notes: {}
        },
        cardCache: {},
        generalNotes: [],
        reviewWords: []
      };
      await fs.writeFile(DB_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
    } catch (writeErr) {
      // Ignore write errors (e.g. read-only filesystem on Vercel)
    }
  }
}

// Read from Supabase or fallback to local
async function readData(): Promise<{ data: any; source: "supabase" | "local" }> {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/lexiflow_store?id=eq.default`, {
        method: "GET",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        },
        cache: "no-store"
      });

      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0 && rows[0].data) {
          const dbData = rows[0].data;
          // Ensure standard structure
          if (!dbData.progress) dbData.progress = { masteredIds: [], starredIds: [], notes: {} };
          if (!dbData.cardCache) dbData.cardCache = {};
          if (!dbData.generalNotes) dbData.generalNotes = [];
          if (!dbData.reviewWords) dbData.reviewWords = [];
          return { data: dbData, source: "supabase" };
        } else {
          // Table exists, but no row with id='default' yet. Initialize it.
          const defaultData = await readLocalData();
          await writeToSupabase(defaultData);
          return { data: defaultData, source: "supabase" };
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn("Supabase fetch failed, code:", errJson.code, "message:", errJson.message);
      }
    } catch (e) {
      console.warn("Failed to connect to Supabase REST endpoint:", e);
    }
  }

  // Fallback to local file
  const localData = await readLocalData();
  return { data: localData, source: "local" };
}

async function readLocalData() {
  try {
    await ensureLocalDb();
    const fileContent = await fs.readFile(DB_FILE, "utf-8");
    const parsed = JSON.parse(fileContent);
    if (!parsed.progress) parsed.progress = { masteredIds: [], starredIds: [], notes: {} };
    if (!parsed.cardCache) parsed.cardCache = {};
    if (!parsed.generalNotes) parsed.generalNotes = [];
    if (!parsed.reviewWords) parsed.reviewWords = [];
    return parsed;
  } catch (e) {
    return {
      progress: {
        masteredIds: [],
        starredIds: [],
        notes: {}
      },
      cardCache: {},
      generalNotes: [],
      reviewWords: []
    };
  }
}

async function writeToSupabase(data: any): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/lexiflow_store`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        id: "default",
        data: data,
        updated_at: new Date().toISOString()
      })
    });
    return res.ok;
  } catch (e) {
    console.error("Error writing to Supabase:", e);
    return false;
  }
}

export async function GET() {
  return enqueue(async () => {
    try {
      const { data, source } = await readData();

      // Backwards compatibility additions
      if (!data.generalNotes) data.generalNotes = [];
      if (!data.reviewWords) data.reviewWords = [];
      if (!data.cardCache) data.cardCache = {};
      if (!data.progress) data.progress = { masteredIds: [], starredIds: [], notes: {} };

      return NextResponse.json(
        {
          ...data,
          _dbInfo: {
            connected: source === "supabase",
            source: source,
            serverTimestamp: Date.now()
          }
        },
        { headers: NO_CACHE_HEADERS }
      );
    } catch (error: any) {
      console.error("Failed to load database:", error);
      return NextResponse.json({ error: "Failed to load database" }, { status: 500, headers: NO_CACHE_HEADERS });
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return await enqueue(async () => {
      const { data: currentData } = await readData();

      const isFullReset = body.isFullReset === true;
      const isMasteryReset = body.isMasteryReset === true;

      // 1. Progress Merge Logic
      let updatedProgress: any;
      if (isFullReset) {
        updatedProgress = { masteredIds: [], starredIds: [], notes: {} };
      } else if (isMasteryReset) {
        updatedProgress = {
          ...(currentData.progress || {}),
          masteredIds: []
        };
      } else if (body.progress !== undefined) {
        const prevPosTs = currentData.progress?.lastWordUpdatedAt || 0;
        const incPosTs = body.progress.lastWordUpdatedAt || 0;
        const useIncomingPos = incPosTs >= prevPosTs && Boolean(body.progress.lastWordId);

        const mergedPosFields = {
          lastWordId: useIncomingPos ? body.progress.lastWordId : (currentData.progress?.lastWordId || body.progress.lastWordId),
          lastWordUpdatedAt: useIncomingPos ? incPosTs : prevPosTs,
          deckType: useIncomingPos ? (body.progress.deckType || currentData.progress?.deckType) : (currentData.progress?.deckType || body.progress.deckType),
        };

        if (body.replaceProgress === true) {
          updatedProgress = {
            masteredIds: Array.isArray(body.progress.masteredIds) ? body.progress.masteredIds : [],
            starredIds: Array.isArray(body.progress.starredIds) ? body.progress.starredIds : [],
            notes: body.progress.notes || {},
            ...mergedPosFields,
          };
        } else {
          // SMART UNION: Keep mastered IDs from BOTH devices so phone & PC never wipe each other!
          const prevMastered = currentData.progress?.masteredIds || [];
          const incomingMastered = body.progress.masteredIds || [];
          const mergedMastered = Array.from(new Set([...prevMastered, ...incomingMastered]));

          const prevStarred = currentData.progress?.starredIds || [];
          const incomingStarred = body.progress.starredIds || [];
          const mergedStarred = Array.from(new Set([...prevStarred, ...incomingStarred]));

          const mergedNotes = {
            ...(currentData.progress?.notes || {}),
            ...(body.progress.notes || {})
          };

          updatedProgress = {
            masteredIds: mergedMastered,
            starredIds: mergedStarred,
            notes: mergedNotes,
            ...mergedPosFields,
          };
        }
      } else {
        updatedProgress = currentData.progress || { masteredIds: [], starredIds: [], notes: {} };
      }

      // Lightweight cross-device position sync (current word & deck)
      if (!isFullReset && body.positionUpdate && typeof body.positionUpdate === "object") {
        const incomingTs = body.positionUpdate.lastWordUpdatedAt || Date.now();
        const prevTs = updatedProgress.lastWordUpdatedAt || 0;
        if (incomingTs >= prevTs) {
          updatedProgress = {
            ...updatedProgress,
            lastWordId: body.positionUpdate.lastWordId || updatedProgress.lastWordId,
            lastWordUpdatedAt: incomingTs,
            deckType: body.positionUpdate.deckType || updatedProgress.deckType,
          };
        }
      }

      // 2. Card Cache Merge Logic (never store temporary fallback cards in cloud DB)
      const filterValidCards = (cardsObj: Record<string, any>) => {
        const clean: Record<string, any> = {};
        for (const [k, v] of Object.entries(cardsObj || {})) {
          if (v && !v.isFallback && Array.isArray(v.sentences) && v.sentences.length > 0) {
            clean[k] = v;
          }
        }
        return clean;
      };

      let updatedCardCache: any;
      if (isFullReset) {
        updatedCardCache = {};
      } else if (body.cardCachePatch !== undefined) {
        // Incremental card addition from AI generator
        updatedCardCache = { ...(currentData.cardCache || {}), ...filterValidCards(body.cardCachePatch) };
      } else if (body.cardCache !== undefined) {
        // Deep merge full cache so sentences created on computer are preserved when phone syncs!
        updatedCardCache = { ...(currentData.cardCache || {}), ...filterValidCards(body.cardCache) };
      } else {
        updatedCardCache = currentData.cardCache || {};
      }

      // 3. Review Words Merge Logic (unique by word lowercase)
      let updatedReviewWords: any;
      if (isFullReset) {
        updatedReviewWords = [];
      } else if (body.reviewWords !== undefined) {
        if (body.replaceReviewWords === true) {
          updatedReviewWords = body.reviewWords || [];
        } else {
          const reviewMap = new Map<string, any>();
          (currentData.reviewWords || []).forEach((rw: any) => reviewMap.set(rw.word.toLowerCase(), rw));
          (body.reviewWords || []).forEach((rw: any) => reviewMap.set(rw.word.toLowerCase(), rw));
          updatedReviewWords = Array.from(reviewMap.values()).sort(
            (a: any, b: any) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
          );
        }
      } else {
        updatedReviewWords = currentData.reviewWords || [];
      }

      // 4. General Notes Merge Logic (unique by ID)
      let updatedGeneralNotes: any;
      if (isFullReset) {
        updatedGeneralNotes = [];
      } else if (body.generalNotes !== undefined) {
        if (body.replaceGeneralNotes === true) {
          updatedGeneralNotes = body.generalNotes || [];
        } else {
          const notesMap = new Map<string, any>();
          (currentData.generalNotes || []).forEach((n: any) => notesMap.set(n.id, n));
          (body.generalNotes || []).forEach((n: any) => notesMap.set(n.id, n));
          updatedGeneralNotes = Array.from(notesMap.values()).sort(
            (a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        }
      } else {
        updatedGeneralNotes = currentData.generalNotes || [];
      }

      const updatedData = {
        progress: updatedProgress,
        cardCache: updatedCardCache,
        generalNotes: updatedGeneralNotes,
        reviewWords: updatedReviewWords
      };

      let supabaseSuccess = false;
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseSuccess = await writeToSupabase(updatedData);
      }

      // Always write to local file as backup or if Supabase write fails
      try {
        await ensureLocalDb();
        await fs.writeFile(DB_FILE, JSON.stringify(updatedData, null, 2), "utf-8");
      } catch (err) {
        // normal on read-only serverless hosts
      }

      return NextResponse.json(
        {
          success: true,
          data: updatedData,
          _dbInfo: {
            connected: supabaseSuccess,
            source: supabaseSuccess ? "supabase" : "local",
            serverTimestamp: Date.now()
          }
        },
        { headers: NO_CACHE_HEADERS }
      );
    });
  } catch (error: any) {
    console.error("Failed to save database:", error);
    return NextResponse.json({ error: "Failed to save to database" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
