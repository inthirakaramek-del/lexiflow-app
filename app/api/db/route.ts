import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

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
  } catch (e) {}

  try {
    await fs.access(DB_FILE);
  } catch (e) {
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
  }
}

// Read from Supabase or fallback to local
async function readData() {
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
        if (rows && rows.length > 0) {
          const dbData = rows[0].data;
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
  await ensureLocalDb();
  const fileContent = await fs.readFile(DB_FILE, "utf-8");
  return JSON.parse(fileContent);
}

async function writeToSupabase(data: any) {
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

      return NextResponse.json({
        ...data,
        _dbInfo: {
          connected: source === "supabase",
          source: source,
          needTableCreation: source === "local" && !!SUPABASE_URL
        }
      });
    } catch (error: any) {
      console.error("Failed to load database:", error);
      return NextResponse.json({ error: "Failed to load database" }, { status: 500 });
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return await enqueue(async () => {
      const { data: currentData, source } = await readData();

      const updatedData = {
        progress: body.progress !== undefined ? body.progress : (currentData.progress || { masteredIds: [], starredIds: [], notes: {} }),
        cardCache: body.cardCachePatch !== undefined 
          ? { ...(currentData.cardCache || {}), ...body.cardCachePatch } 
          : (body.cardCache !== undefined ? body.cardCache : (currentData.cardCache || {})),
        generalNotes: body.generalNotes !== undefined ? body.generalNotes : (currentData.generalNotes || []),
        reviewWords: body.reviewWords !== undefined ? body.reviewWords : (currentData.reviewWords || []),
      };

      let supabaseSuccess = false;
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseSuccess = await writeToSupabase(updatedData);
      }

      // Always write to local file as backup or if Supabase write fails
      await ensureLocalDb();
      await fs.writeFile(DB_FILE, JSON.stringify(updatedData, null, 2), "utf-8");

      return NextResponse.json({
        success: true,
        data: updatedData,
        _dbInfo: {
          connected: supabaseSuccess,
          source: supabaseSuccess ? "supabase" : "local"
        }
      });
    });
  } catch (error: any) {
    console.error("Failed to save database:", error);
    return NextResponse.json({ error: "Failed to save to database" }, { status: 500 });
  }
}
