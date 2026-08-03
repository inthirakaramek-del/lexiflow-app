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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
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
    const prompt = `Generate 5 example sentences for the English word or phrase "${word}" (which is a ${pos}).
Each sentence MUST strictly follow one of the 5 English sentence structures:
1. S + V (Subject + Verb) - e.g. "He runs." (The verb must be intransitive or used intransitively)
2. S + V + O (Subject + Verb + Object) - e.g. "She loves books." (The verb must be transitive and take an object)
3. S + V + C (Subject + Verb + Complement) - e.g. "He is a doctor.", "She feels happy." (Complement describes the subject, usually after linking verbs like is, am, are, feel, become)
4. S + V + IO + DO (Subject + Verb + Indirect Object + Direct Object) - e.g. "She gave him a book.", "My mother bought me a shirt."
5. S + V + O + C (Subject + Verb + Object + Complement) - e.g. "We painted the wall green.", "The news made her sad." (Object complement describes the direct object)

Ensure that:
- Every English sentence is extremely natural, modern, and practical (commonly used in daily life, work, or school). Avoid robotic or awkward phrasing.
- The word "${word}" must be integrated naturally in its correct grammatical form (conjugate verbs or pluralize nouns if needed to fit the structure).
- CRITICAL: The "translation" field for the sentence MUST be written entirely in fluent, natural, grammatically correct Thai. You MUST NOT include or leave any English words (such as "The team", "a little", "the message", etc.) in the "translation" string. All parts of the sentence must be translated into natural Thai. For example, write "ทีมงานปฏิบัติงานเล็กน้อย" instead of "The team ได้ปฏิบัติอย่าง a little".
- The pronunciation (thaiPronunciation) for the word and the sentences must be spelled in Thai phonetics (e.g. 'เดอะ ชิลเดรน แอคทิด อะ บิท' for 'The children acted a bit').
- The grammar breakdown MUST match the actual words in the sentence exactly and show their meaning in Thai, e.g.: 'S (The team: ทีมงาน) + V (acted: ปฏิบัติ) + M (a little: เล็กน้อย)'.

Return the result as a raw JSON object with the following schema:
{
  "wordTranslation": "Thai translation of the vocabulary word itself (e.g. 'ละทิ้ง' for 'abandon')",
  "thaiPronunciation": "Thai phonetic pronunciation / reading of the English word itself (e.g. 'อะแบนดัน' for 'abandon')",
  "sentences": [
    {
      "structure": "S + V",
      "sentence": "Example sentence using the word",
      "translation": "Thai translation of the sentence",
      "thaiPronunciation": "Thai phonetic pronunciation / reading of this English sentence",
      "grammar": "Detailed breakdown matching the specific English words in the sentence to their grammatical parts with Thai translations, formatted exactly like: 'S (SubjectWord: คำแปล) + V (VerbWord: คำแปล) + ...'"
    }
  ],
  "trick": "A clear, practical guide on how to use this word in Thai, explaining its grammatical behavior, common collocations, prepositions it goes with, or specific context rules (e.g., 'คำนี้มักตามด้วยคำว่า...')"
}

Return ONLY valid JSON.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
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

