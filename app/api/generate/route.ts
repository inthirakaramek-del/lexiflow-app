import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 400 });
    }

    // Support translation of custom words clicked from example sentences
    if (body.action === "translate") {
      const { word } = body;
      const prompt = `Translate the English word or phrase "${word}" to Thai.
Return the result as a raw JSON object with the following schema:
{
  "translation": "natural Thai translation",
  "thaiPronunciation": "Thai phonetic reading of the word itself (e.g. 'ออพพอร์ทูนิตี' for 'opportunity')",
  "pos": "part of speech (n. / v. / adj. / adv. / prep. / conj. / pron.)"
}
Return ONLY valid JSON.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "aistudio-build",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
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
          }),
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

    // Normal generation route for words in the dictionary
    const { word, pos } = body;
    const prompt = `You are an expert English teacher creating an engaging learning flashcard for the English vocabulary word or phrase "${word}" (part of speech: ${pos}).

CRITICAL REQUIREMENT:
Instead of 5 isolated sentences, you MUST create ONE COHESIVE SHORT STORY / MINI-ARTICLE (1 บทความสั้นที่เป็นเรื่องราวเดียวกันต่อเนื่อง 5 ประโยค) centered around or featuring "${word}".
All 5 sentences must flow smoothly and naturally together to form a single interesting, real-life storyline or coherent reading passage (บทความเดียวเชื่อมโยงกัน ไม่ใช่ประโยคแยกโดดเดี่ยว).

Within this unified 5-sentence article, each sentence MUST strictly embody one of the 5 fundamental English sentence structures in sequential order:
1. S + V (Subject + Verb) - e.g. An event begins, a character arrives, or something happens. (If "${word}" is not a verb, integrate it naturally into the Subject, e.g., "A couple of friends arrived." or "The opportunity appeared.")
2. S + V + O (Subject + Verb + Object) - Action continues, characters do something.
3. S + V + C (Subject + Verb + Subject Complement) - Describing the situation or character's feeling using linking verbs (is, felt, seemed, became).
4. S + V + IO + DO (Subject + Verb + Indirect Object + Direct Object) - Someone gives, brings, shows, or tells someone something.
5. S + V + O + C (Subject + Verb + Object + Object Complement) - A concluding action or evaluation (e.g. found it useful, called it a success, made everyone happy).

GUIDELINES:
- Flow & Narrative: Together, the 5 sentences must read like a complete mini-story or short article about a realistic situation.
- The target word "${word}" must appear naturally in the story in its correct grammatical form.
- "articleTitle": A catchy 2-5 word English title for this short story/article.
- "fullArticleThai": A fluent, beautiful, and completely natural Thai translation of the ENTIRE 5-sentence story as a single paragraph. (DO NOT leave any untranslated English words in Thai translations!).
- "sentences": Array of exactly 5 sentence objects representing sentences 1 to 5 of the story in order:
  - "structure": Exactly "S + V", "S + V + O", "S + V + C", "S + V + IO + DO", or "S + V + O + C"
  - "sentence": The English sentence from the story
  - "translation": 100% natural, grammatically correct Thai translation of this specific sentence
  - "thaiPronunciation": Thai phonetic reading of this English sentence (e.g. 'เดอะ ชิลเดรน อะไรฟด์ เซฟลี')
  - "grammar": Exact breakdown matching the words in this sentence to their grammatical parts with Thai translations, formatted as: 'S (Word: คำแปล) + V (Word: คำแปล) + ...'
- "wordTranslation": Natural Thai translation of "${word}" itself
- "thaiPronunciation": Thai phonetic reading of "${word}" itself (e.g. 'อะ คัพเพิล' for 'a couple')
- "trick": Practical usage guide and tips in Thai for using "${word}" in daily life.

Return the result as a raw JSON object with the following schema:
{
  "articleTitle": "Short English Title",
  "wordTranslation": "Thai translation of the vocabulary word",
  "thaiPronunciation": "Thai phonetic reading of the vocabulary word",
  "fullArticleThai": "Complete Thai translation of the whole 5-sentence story as a paragraph",
  "sentences": [
    {
      "structure": "S + V",
      "sentence": "English sentence 1",
      "translation": "Thai translation of sentence 1",
      "thaiPronunciation": "Thai phonetic reading of sentence 1",
      "grammar": "S (...) + V (...)"
    }
  ],
  "trick": "Practical usage tip in Thai"
}

Return ONLY valid JSON.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "aistudio-build",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
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
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${errorText}` }, { status: 500 });
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0]) {
      console.error("Gemini API returned no candidates:", JSON.stringify(data));
      throw new Error("No candidates returned from Gemini API");
    }
    const textContent = data.candidates[0].content.parts[0].text;
    try {
      const parsedData = JSON.parse(textContent);
      return NextResponse.json(parsedData);
    } catch (parseErr: any) {
      console.error("Failed to parse JSON from Gemini response. Attempting clean up...", parseErr);
      const cleanText = textContent.replace(/```json/g, "").replace(/```/g, "").trim();
      try {
        const parsedData = JSON.parse(cleanText);
        return NextResponse.json(parsedData);
      } catch (secondErr: any) {
        return NextResponse.json({ error: `JSON Parse Error: ${secondErr.message}. Raw: ${textContent}` }, { status: 500 });
      }
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate content" }, { status: 500 });
  }
}

