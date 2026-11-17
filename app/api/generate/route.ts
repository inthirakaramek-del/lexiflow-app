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

    const prompt = `Write a smooth, natural 5-sentence connected story featuring the target word "${word}" (${pos}).
ONE continuous cohesive storyline from start to finish (single point of view, logical cause-and-effect timeline).
${lengthInstruction}
Natural spoken Thai translation.

NATURAL STORY FLOW & FLEXIBILITY:
- Let the 5-sentence story unfold naturally based on what fits "${word}" best. Elements like scene setting, an inner reflective question/doubt, brief dialogue, or action may blend smoothly together if it enhances realism.
- Never force any rigid formula:
  * For descriptive or activity words: pure flowing narrative (Scene -> Action with "${word}" -> Resolution).
  * For search/doubt/realization words: narrative with an organic inner-thought question (e.g. "Where is it now?", "Did I forget it?").
  * For interaction/request words: brief natural dialogue exchange (e.g. Speaker A asks -> Speaker B responds with "${word}").
- EXCLAMATIONS: Do NOT overuse exclamations (e.g. "Oh no!", "Look!"). Most stories should contain ZERO exclamations. Use only when truly indispensable.

TENSE & STRUCTURE VARIETY:
- Naturally vary tenses and patterns across the 5 sentences, drawing from the full spectrum of English tenses (Present, Past, Future, Continuous, Perfect) and Modals (can, must, should, would).
- Strictly English-only structure labels indicating Tense and pattern, e.g.:
  'Past: S + V', 'Past (Q): Wh + did + S + V?', 'Past Cont: S + was + V-ing', 'Present: S + V', 'Pres Cont: S + is + V-ing', 'Pres Perf: S + have + V3', 'Future: S + will + V', 'Modal: S + should + V'. NO Thai in structure label!
- Pure clean text only: NEVER include meta labels, brackets, or commentary like "(คำถาม...)" in sentences or translations.

Return JSON:
- articleTitle: 2-3 words English title
- wordTranslation: natural Thai meaning of "${word}"
- thaiPronunciation: pronunciation of ENGLISH word "${word}" in Thai
- sentences: array of 5 sentence objects in storyline order:
  * structure: English structure & tense label (e.g. 'Past: S + V', 'Pres Perf: S + have + V3', etc.)
  * sentence: natural English sentence (${isLonger ? "around 6-9 words" : "strictly 4-6 simple words"})
  * translation: natural, smooth Thai translation in story context (clean text, NO explanatory parentheses)
  * thaiPronunciation: natural phonetic pronunciation of the ENGLISH sentence using Thai characters with space between words (e.g. 'วี เม็ท ทูเดย์ แอท เดอะ โลเคิล คาเฟ่'). CRITICAL: Must be the sound of the English words, NEVER read the Thai translation!
- trick: 1 practical short Thai tip (max 12 words) highlighting the most useful learning takeaway from the story (e.g. grammar point, preposition pairing, phrasal verb, tense rule, or nuance of "${word}"). Choose whatever is most valuable and natural to teach from these sentences.`;

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
                    thaiPronunciation: { type: "STRING" }
                  },
                  required: ["structure", "sentence", "translation", "thaiPronunciation"]
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
