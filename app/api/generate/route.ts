import { NextResponse } from "next/server";

// Helper fetch with auto-retry for 429 and 503 errors
async function fetchWithRetry(url: string, payload: any, maxRetries = 2): Promise<Response> {
  let lastStatus = 0;
  let lastErrorText = "";
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "aistudio-build",
      },
      body: JSON.stringify(payload),
    });
    lastStatus = res.status;
    if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
      console.warn(`Gemini ${res.status} error, auto-retrying attempt ${attempt + 1}...`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * Math.pow(2, attempt)));
      continue;
    }
    if (!res.ok) {
      lastErrorText = await res.text();
      throw new Error(lastStatus === 429 ? "Gemini API rate limit exceeded" : `Gemini API error (${lastStatus}): ${lastErrorText}`);
    }
    return res;
  }
  throw new Error(lastStatus === 429 ? "Gemini API rate limit exceeded" : `Gemini service temporarily busy (${lastStatus})`);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 400 });
    }

    // 1. Support translate action (used as fallback helper)
    if (body.action === "translate") {
      const { word } = body;
      const prompt = `Translate the English word or phrase "${word}" to Thai.
CRITICAL:
- "translation": Natural Thai meaning.
- "thaiPronunciation": Phonetic reading of the ENGLISH word "${word}" in Thai characters (e.g. 'ออพ-เพอร์-ทู-นิ-ที'). NEVER return pronunciation of Thai meaning!
- "pos": Part of speech (n. / v. / adj. / adv. / prep. / conj. / pron.)

Return JSON: { "translation": string, "thaiPronunciation": string, "pos": string }`;

      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
            responseSchema: {
              type: "OBJECT",
              properties: {
                translation: { type: "STRING" },
                thaiPronunciation: { type: "STRING" },
                pos: { type: "STRING" }
              },
              required: ["translation", "thaiPronunciation", "pos"]
            }
          },
        }
      );

      const data = await response.json();
      const textContent = data.candidates[0].content.parts[0].text;
      const parsedData = JSON.parse(textContent);
      return NextResponse.json(parsedData);
    }

    // 2. Vocabulary flashcard generation: Connected natural mini-story (5 sentences)
    const { word, pos, lengthMode } = body;
    const isLonger = lengthMode === "longer";
    const lengthInstruction = isLonger
      ? "Natural everyday English (around 6 to 9 natural words per sentence, A1-A2 level). Flexible structures with natural modifiers."
      : "Short simple everyday English (strictly 4-6 simple words per sentence, A1-A2 level). Flexible structures.";

    const prompt = `Write a smooth 5-sentence connected mini-story featuring "${word}" (${pos}).
ONE continuous story (Scene -> Situation -> Action with "${word}" -> Resolution).
${lengthInstruction}
Natural spoken Thai translation.

Return JSON:
- articleTitle: 2-3 words English title
- wordTranslation: natural Thai meaning of "${word}"
- thaiPronunciation: pronunciation of ENGLISH word "${word}" in Thai
- sentences: array of 5 sentence objects in storyline order:
  * structure: structure label (e.g. 'S + V + O', 'S + V + C', 'S + V + Adv', 'S + V', etc.)
  * sentence: natural English sentence (${isLonger ? "around 6-9 words" : "strictly 4-6 simple words"})
  * translation: natural, smooth Thai translation in story context
  * thaiPronunciation: natural phonetic pronunciation of the ENGLISH sentence using Thai characters with space between words (e.g. 'วี เม็ท ทูเดย์ แอท เดอะ โลเคิล คาเฟ่'). CRITICAL: Must be the sound of the English words, NEVER read the Thai translation!
  * grammar: breakdown with Thai translation for EACH component in format 'Element(Word: แปล) + ...' (e.g. 'S (We: เรา) + V (met: เจอกัน) + Adv (at the cafe: ที่ร้านกาแฟ)')
- trick: 1 short sentence Thai tip or usage note (max 10 words)`;

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
          responseSchema: {
            type: "OBJECT",
            properties: {
              articleTitle: { type: "STRING" },
              wordTranslation: { type: "STRING" },
              thaiPronunciation: { type: "STRING" },
              sentences: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    structure: { type: "STRING" },
                    sentence: { type: "STRING" },
                    translation: { type: "STRING" },
                    thaiPronunciation: { type: "STRING" },
                    grammar: { type: "STRING" }
                  },
                  required: ["structure", "sentence", "translation", "thaiPronunciation", "grammar"]
                }
              },
              trick: { type: "STRING" }
            },
            required: ["wordTranslation", "thaiPronunciation", "sentences", "trick"]
          }
        },
      }
    );

    const data = await response.json();
    if (!data.candidates || !data.candidates[0]) {
      throw new Error("No candidates returned from Gemini API");
    }
    const textContent = data.candidates[0].content.parts[0].text;
    let parsedData: any;
    try {
      parsedData = JSON.parse(textContent);
    } catch (parseErr: any) {
      const cleanText = textContent.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedData = JSON.parse(cleanText);
    }

    // Auto-generate fullArticleThai by joining translations to save ~100 tokens from AI response
    if (!parsedData.fullArticleThai && Array.isArray(parsedData.sentences)) {
      parsedData.fullArticleThai = parsedData.sentences.map((s: any) => s.translation).join(" ");
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate content" }, { status: 500 });
  }
}
