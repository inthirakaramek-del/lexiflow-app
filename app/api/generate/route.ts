import { NextResponse } from "next/server";

// Fallback cascade of models so if one model experiences 503 (High Demand), others seamlessly take over
const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
];

async function generateWithGemini(apiKey: string, contents: any, generationConfig: any): Promise<any> {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const configToUse = { ...generationConfig };
    if (!model.includes("3.1")) {
      delete configToUse.thinkingConfig;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "aistudio-build",
        },
        body: JSON.stringify({ contents, generationConfig: configToUse }),
      });

      if (res.status === 429 || res.status === 503) {
        console.warn(`Model ${model} busy (${res.status}), failing over to next model...`);
        lastError = new Error(`Gemini API (${res.status}): ${model} is experiencing temporary high demand`);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`Model ${model} error (${res.status}): ${errText}`);
        lastError = new Error(`Gemini API error (${res.status}): ${errText}`);
        continue;
      }

      const data = await res.json();
      if (data.candidates && data.candidates[0]) {
        return data;
      }
    } catch (e: any) {
      console.warn(`Model ${model} fetch exception:`, e.message);
      lastError = e;
    }
  }

  throw lastError || new Error("All Gemini models are temporarily busy");
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

      const data = await generateWithGemini(
        apiKey,
        [{ parts: [{ text: prompt }] }],
        {
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
        }
      );

      const textContent = data.candidates[0].content.parts[0].text;
      const parsedData = JSON.parse(textContent);
      return NextResponse.json(parsedData);
    }

    // 2. Vocabulary flashcard generation: Connected natural mini-story (5 sentences)
    const { word, pos, lengthMode, style } = body;
    const isLonger = lengthMode === "longer";
    const lengthInstruction = isLonger
      ? "Natural everyday English (around 6 to 9 natural words per sentence, A1-A2 level). Flexible structures with natural modifiers."
      : "Short simple everyday English (strictly 4-6 simple words per sentence, A1-A2 level). Flexible structures.";

    // 4-Way Balanced Story Patterns (25% each across the 3,000+ words)
    let assignedStyle = style;
    if (!assignedStyle || !["dialogue", "decision", "search", "narrative"].includes(assignedStyle)) {
      let hash = 0;
      for (let i = 0; i < (word || "").length; i++) {
        hash = (hash << 5) - hash + (word || "").charCodeAt(i);
        hash |= 0;
      }
      const styles = ["dialogue", "decision", "search", "narrative"];
      assignedStyle = styles[Math.abs(hash) % 4];
    }

    let styleInstruction = "";
    if (assignedStyle === "dialogue") {
      styleInstruction = `MANDATORY STORY PATTERN (Style 1 of 4: Social Dialogue):
Create an everyday real-life exchange between two people (e.g. asking for help, borrowing, requesting, thanking, replying).
5 seamless, connected sentences from start to finish featuring "${word}" (e.g. setting situation -> request/question -> agreement/answer -> gratitude -> friendly sign-off).`;
    } else if (assignedStyle === "decision") {
      styleInstruction = `MANDATORY STORY PATTERN (Style 2 of 4: Decision & Problem Solving):
Create a realistic real-life situation where someone faces a daily dilemma or deadline, must make a decision regarding "${word}", weighs a sensible option, takes action, and reaches a satisfying resolution.`;
    } else if (assignedStyle === "search") {
      styleInstruction = `MANDATORY STORY PATTERN (Style 3 of 4: Wondering & Search Discovery):
Someone is doing a daily activity, experiences a natural reflective question or doubt in mind (e.g. 'Where did I put it?', 'Did I forget that?'), checks/searches, discovers the answer featuring "${word}", and proceeds with relief.`;
    } else {
      styleInstruction = `MANDATORY STORY PATTERN (Style 4 of 4: Pure Narrative & Sequential Flow):
5 continuous narrative sentences unfolding a realistic scene from start to finish in chronological order (Scene setting -> Developing situation -> Action featuring "${word}" -> Resolution). Pure storytelling without forced dialogue or questions.`;
    }

    const prompt = `Write a smooth, natural 5-sentence connected story featuring the target word "${word}" (${pos}).
ONE continuous cohesive storyline from start to finish (single point of view, logical cause-and-effect timeline).
${lengthInstruction}
Natural spoken Thai translation.

${styleInstruction}

EXCLAMATIONS: Keep exclamations rare (most stories should contain ZERO exclamations). Use only when truly indispensable.

TENSE & STRUCTURE VARIETY:
- Naturally vary tenses and patterns across the 5 sentences, drawing from the full spectrum of English tenses (Present, Past, Future, Continuous, Perfect) and Modals (can, must, should, would).
- Strictly English-only structure labels indicating Tense and pattern, e.g.:
  'Past: S + V', 'Past (Q): Wh + did + S + V?', 'Past Cont: S + was + V-ing', 'Present: S + V', 'Pres Cont: S + is + V-ing', 'Pres Perf: S + have + V3', 'Future: S + will + V', 'Modal: S + should + V'. NO Thai in structure label!
- Pure clean text only: NEVER include meta labels, brackets, speaker markers like "[A:]", or commentary in sentences or translations.

Return JSON:
- articleTitle: 2-3 words English title
- wordTranslation: natural Thai meaning of "${word}"
- sentences: array of 5 sentence objects in storyline order:
  * structure: English structure & tense label (e.g. 'Past: S + V', 'Pres Perf: S + have + V3', etc.)
  * sentence: natural English sentence (${isLonger ? "around 6-9 words" : "strictly 4-6 simple words"})
  * translation: natural, smooth Thai translation in story context (clean text, NO explanatory parentheses)`;

    const data = await generateWithGemini(
      apiKey,
      [{ parts: [{ text: prompt }] }],
      {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: {
          type: "OBJECT",
          properties: {
            articleTitle: { type: "STRING" },
            wordTranslation: { type: "STRING" },
            sentences: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  structure: { type: "STRING" },
                  sentence: { type: "STRING" },
                  translation: { type: "STRING" }
                },
                required: ["structure", "sentence", "translation"]
              }
            }
          },
          required: ["wordTranslation", "sentences"]
        }
      }
    );

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
