import { NextResponse } from "next/server";

// Helper fetch with auto-retry for 429 and 503 errors
async function fetchWithRetry(url: string, payload: any, maxRetries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "aistudio-build",
      },
      body: JSON.stringify(payload),
    });
    if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
      console.warn(`Gemini ${res.status} error, auto-retrying attempt ${attempt + 1}...`);
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    return res;
  }
  throw new Error("Gemini API rate limit exceeded");
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${errorText}`);
      }

      const data = await response.json();
      const textContent = data.candidates[0].content.parts[0].text;
      const parsedData = JSON.parse(textContent);
      return NextResponse.json(parsedData);
    }

    // 2. Ultra-lean vocabulary flashcard generation (4-6 simple words, minimum tokens)
    const { word, pos } = body;
    const prompt = `Write 5 short connected sentences featuring "${word}" (${pos}) telling 1 simple everyday story.
The 5 sentences must follow: S+V, S+V+O, S+V+C, S+V+IO+DO, S+V+O+C in order.

RULES TO MINIMIZE TOKENS:
1. STRICT LENGTH: exactly 4 to 6 simple words per sentence.
2. BASIC VOCABULARY ONLY: Use simple everyday A1-A2 words. NEVER use formal, corporate, or complex words (no "immediately", "initiated", "campaign", etc.).
3. Keep Thai translation and pronunciation very short and concise.

Return JSON:
- articleTitle: 2-3 words English title
- wordTranslation: natural Thai meaning of "${word}"
- thaiPronunciation: pronunciation of ENGLISH word "${word}" in Thai
- sentences: array of 5 sentence objects in storyline order with:
  * structure: structure name ('S + V', 'S + V + O', 'S + V + C', 'S + V + IO + DO', 'S + V + O + C')
  * sentence: English sentence (4-6 simple words)
  * translation: short natural Thai translation
  * thaiPronunciation: short Thai reading of each word
  * grammar: format 'S (Word: แปล) + V (Word: แปล) + ...'
- trick: 1 short sentence Thai tip (max 10 words)`;

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

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${errorText}` }, { status: 500 });
    }

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
