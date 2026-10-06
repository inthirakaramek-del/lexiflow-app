import { NextResponse } from "next/server";

// Helper fetch with auto-retry for 429 rate limits
async function fetchWithRetry(url: string, payload: any, maxRetries = 1): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "aistudio-build",
      },
      body: JSON.stringify(payload),
    });
    if (res.status === 429 && attempt < maxRetries) {
      console.warn("Gemini 429 rate limit hit, auto-retrying after 1500ms backoff...");
      await new Promise((resolve) => setTimeout(resolve, 1500));
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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

    // 2. Main vocabulary flashcard generation with streamlined prompt (~550 chars)
    const { word, pos } = body;
    const prompt = `Write a cohesive 5-sentence mini-story featuring "${word}" (${pos}).
The 5 sentences must naturally include each of these 5 English structures in any creative order:
- S + V
- S + V + O
- S + V + C
- S + V + IO + DO
- S + V + O + C

Return JSON with:
- articleTitle: Catchy English title (2-4 words)
- wordTranslation: Natural Thai translation of "${word}"
- thaiPronunciation: Phonetic reading of the ENGLISH word "${word}" in Thai characters
- fullArticleThai: Fluent Thai translation of the entire 5-sentence story as a single paragraph
- sentences: Array of 5 sentence objects in order, each with:
  * structure: structure name
  * sentence: English sentence
  * translation: Thai translation of sentence
  * thaiPronunciation: Thai phonetic reading of sentence word-by-word
  * grammar: Breakdown format 'S (Word: แปล) + V (Word: แปล) + ...'
- trick: Practical usage tip in Thai`;

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
              fullArticleThai: { type: "STRING" },
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
    try {
      const parsedData = JSON.parse(textContent);
      return NextResponse.json(parsedData);
    } catch (parseErr: any) {
      const cleanText = textContent.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedData = JSON.parse(cleanText);
      return NextResponse.json(parsedData);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate content" }, { status: 500 });
  }
}
