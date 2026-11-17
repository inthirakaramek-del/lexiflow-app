import { NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// In-memory cache for audio chunks to avoid redundant network calls
const audioMemoryCache = new Map<string, Buffer>();
const MAX_CACHE_SIZE = 300;

function cleanSSML(input: string): string {
  if (!input) return "";
  // Convert any break tags or XML to standard clean text for natural flow
  let text = input.replace(/<break\s+[^>]*\/?>(?:<\/break>)?/gi, " ");
  text = text.replace(/<[^>]+>/g, " ");
  // Collapse excessive spaces and dots
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawText = body.text || "";
    const voice = body.voice || "en-US-AvaNeural";
    const rate = body.rate || "-2%";
    const pitch = body.pitch || "+0Hz";

    const cleanText = cleanSSML(rawText);
    if (!cleanText) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Check memory cache
    const cacheKey = `${voice}:${rate}:${pitch}:${cleanText}`;
    if (audioMemoryCache.has(cacheKey)) {
      const cachedBuffer = audioMemoryCache.get(cacheKey)!;
      return new Response(new Uint8Array(cachedBuffer), {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": cachedBuffer.length.toString(),
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const stream = tts.toStream(cleanText, { rate, pitch });
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Edge TTS request timed out"));
      }, 12000);

      stream.audioStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.audioStream.on("end", () => {
        clearTimeout(timer);
        resolve();
      });

      stream.audioStream.on("error", (err: any) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    const fullBuffer = Buffer.concat(chunks);

    // Save to memory cache
    if (audioMemoryCache.size >= MAX_CACHE_SIZE) {
      const firstKey = audioMemoryCache.keys().next().value;
      if (firstKey) audioMemoryCache.delete(firstKey);
    }
    audioMemoryCache.set(cacheKey, fullBuffer);

    return new Response(new Uint8Array(fullBuffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": fullBuffer.length.toString(),
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch (error: any) {
    console.error("TTS API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate speech audio" },
      { status: 500 }
    );
  }
}
