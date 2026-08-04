import { Word } from "../types";

export interface CardData {
  wordTranslation: string;
  thaiPronunciation?: string;
  sentences: {
    structure: string;
    sentence: string;
    translation: string;
    thaiPronunciation?: string;
    grammar: string;
  }[];
  trick: string;
  isFallback?: boolean;
}

const WORD_MAP: Record<string, string> = {
  "the": "เดอะ",
  "manager": "แมนเนเจอร์",
  "team": "ทีม",
  "our": "เอาเวอร์",
  "teacher": "ทีชเชอร์",
  "scientist": "ไซเอนทิสท์",
  "children": "ชิลเดรน",
  "a": "อะ",
  "nurse": "เนิร์ส",
  "students": "สทิวเดนท์ส",
  "workers": "เวิร์กเกอร์ส",
  "she": "ชี",
  "they": "เด",
  "we": "วี",
  "he": "ฮี",
  "dog": "ด็อก",
  "arrived": "อะไรฟด์",
  "safely": "เซฟลี",
  "new": "นิว",
  "policy": "โพลีซี",
  "project": "โปรเจกต์",
  "challenge": "แชลเลนจ์",
  "this": "ดิส",
  "opportunity": "ออพพอร์ทูนิตี",
  "message": "เมสเสจ",
  "old": "โอลด์",
  "house": "เฮ้าส์",
  "idea": "ไอเดีย",
  "design": "ดีไซน์",
  "their": "แดร์",
  "work": "เวิร์ก",
  "item": "ไอเทม",
  "beautiful": "บิวตี้ฟูล",
  "clean": "คลีน",
  "quick": "ควิก",
  "priority": "ไพรออริที",
  "top": "ท็อป",
  "reward": "รีวอร์ด",
  "happy": "แฮปปี้",
  "difficult": "ดิฟฟิคัลท์",
  "clear": "เคลียร์",
  "important": "อิมพอร์แทนท์",
  "exciting": "อิกไซทิง",
  "strange": "สเตรนจ์",
  "necessary": "เนเซสเซอรี",
  "perfect": "เพอร์เฟกต์",
  "tired": "ไทเอิร์ด",
  "successful": "ซัคเซสฟูล",
  "special": "สเปเชียล",
  "some": "ซัม",
  "gifts": "กิฟท์ส",
  "yesterday": "เยสเทอร์เดย์",
  "tomorrow": "ทูมอร์โรว์",
  "will": "วิล",
  "is": "อีส",
  "are": "อาร์",
  "was": "วอส",
  "were": "เวียร์",
  "to": "ทู",
  "gave": "เกฟ",
  "give": "กิฟ",
  "bought": "บอท",
  "found": "เฟานด์",
  "made": "เมด",
  "feels": "ฟีลส์",
  "plans": "แพลนส์",
  "plan": "แพลน",
  "book": "บุ๊ก",
  "student": "สทิวเดนท์",
  "staff": "สตาฟ",
  "acted": "แอคทิด",
  "understood": "อันเดอร์สทูด",
  "presentation": "พรีเซนเทชัน",
  "answer": "แอนเซอร์",
  "consider": "คอนซิเดอร์",
  "task": "ทาสก์",
  "completed": "คอมพลีทิด",
  "partners": "พาร์ทเนอร์ส",
  "apple": "แอปเปิล",
  "an": "แอน",
  "cried": "ไครด์",
  "child": "ชายล์ด",
  "ate": "เอท",
  "cake": "เค้ก",
  "water": "วอเตอร์",
  "became": "บีเคม",
  "cold": "โคลด์",
  "money": "มันนี่",
  "completely": "คอมพลีทลี",
  "few": "ฟิว",
  "little": "ลิทเทิล",
  "couple": "คัพเพิล",
  "lot": "ล็อต",
  "bit": "บิท",
  "a few": "อะ ฟิว",
  "a little": "อะ ลิทเทิล",
  "a couple": "อะ คัพเพิล",
  "a lot": "อะ ล็อต",
  "a bit": "อะ บิท",
};

const THAI_SUBJECTS: Record<string, string> = {
  "The manager": "ผู้จัดการ",
  "The team": "ทีมงาน",
  "Our teacher": "คุณครูของเรา",
  "The scientist": "นักวิทยาศาสตร์",
  "The children": "เด็กๆ",
  "A nurse": "นางพยาบาล",
  "The students": "นักเรียน",
  "The workers": "คนงาน",
  "She": "เธอ",
  "They": "พวกเขา",
  "We": "พวกเรา",
  "He": "เขา",
  "The dog": "สุนัข"
};

const THAI_OBJECTS: Record<string, string> = {
  "the new policy": "นโยบายใหม่",
  "the project": "โครงการ",
  "the challenge": "ความท้าทาย",
  "this opportunity": "โอกาสนี้",
  "the message": "ข้อความ",
  "the old house": "บ้านหลังเก่า",
  "a new idea": "ความคิดใหม่",
  "the design": "การออกแบบ",
  "their work": "งานของพวกเขา"
};

const THAI_ADJECTIVES: Record<string, string> = {
  "happy": "มีความสุข",
  "difficult": "ยาก",
  "clear": "ชัดเจน",
  "important": "สำคัญ",
  "exciting": "น่าตื่นเต้น",
  "strange": "แปลก",
  "necessary": "จำเป็น",
  "perfect": "สมบูรณ์แบบ",
  "tired": "เหนื่อย",
  "successful": "ประสบความสำเร็จ"
};

function getThaiSubject(subj: string): string {
  return THAI_SUBJECTS[subj] || subj;
}

function getThaiObject(obj: string): string {
  return THAI_OBJECTS[obj] || obj;
}

function getThaiAdjective(adj: string): string {
  return THAI_ADJECTIVES[adj] || adj;
}

export function transliterateWord(word: string): string {
  // Try matching the whole phrase first (handles "a few", etc.)
  const phraseClean = word.toLowerCase().trim();
  if (WORD_MAP[phraseClean]) return WORD_MAP[phraseClean];

  // Split into individual words
  const words = phraseClean.split(/\s+/);
  return words.map(w => {
    const clean = w.replace(/[^a-z]/g, "");
    if (WORD_MAP[clean]) return WORD_MAP[clean];

    let result = "";
    const map: Record<string, string> = {
      a: "แ", b: "บ", c: "ค", d: "ด", e: "เอ", f: "ฟ", g: "ก", h: "ฮ",
      i: "อิ", j: "จ", k: "ค", l: "ล", m: "ม", n: "น", o: "อ", p: "พ",
      q: "คิว", r: "ร", s: "ส", t: "ท", u: "อุ", v: "ว", w: "ว", x: "กส์",
      y: "ย", z: "ซ"
    };

    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      result += map[char] || "";
    }
    return result || w;
  }).join(" ");
}

export function englishToThaiPhonetic(sentence: string): string {
  const clean = sentence.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  const words = clean.split(/\s+/);
  return words.map(w => {
    if (w.toLowerCase().endsWith("ed") && w.length > 2) {
      const base = w.slice(0, -2);
      return transliterateWord(base) + "ด์";
    }
    return transliterateWord(w);
  }).join(" ");
}

const SUBJECTS = [
  "The manager", "The team", "Our teacher", "The scientist", "The children",
  "A nurse", "The students", "The workers", "She", "They", "We", "He", "The dog"
];

const OBJECTS = [
  "the new policy", "the project", "the challenge", "this opportunity", 
  "the message", "the old house", "a new idea", "the design", "their work"
];

const ADJECTIVES = [
  "happy", "difficult", "clear", "important", "exciting", "strange", 
  "necessary", "perfect", "tired", "successful"
];

function getRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateFallbackCard(wordObj: Word): CardData {
  const { word, pos } = wordObj;
  const w = word.split(",")[0].replace(/-$/, "").trim();

  const subj = getRandom(SUBJECTS);
  const obj = getRandom(OBJECTS);
  const adj = getRandom(ADJECTIVES);

  const mockTranslation = `คำแปลของคำว่า "${w}"`;
  const mockPronunciation = transliterateWord(w);

  let cardData: CardData;

  if (pos === "v.") {
    cardData = {
      wordTranslation: mockTranslation,
      thaiPronunciation: mockPronunciation,
      isFallback: true,
      sentences: [
        {
          structure: "S + V",
          sentence: `${subj} ${w}ed yesterday.`,
          translation: `${getThaiSubject(subj)} ได้ทำงาน (${w}) เมื่อวานนี้`,
          grammar: `S (${subj}: ประธาน) + V (${w}ed: ดำเนินงาน (${w}))`
        },
        {
          structure: "S + V + O",
          sentence: `They will ${w} ${obj}.`,
          translation: `พวกเขาจะทำการ (${w}) สำหรับ${getThaiObject(obj)}`,
          grammar: `S (They: พวกเขา) + V (will ${w}: จะทำ (${w})) + O (${obj}: ${getThaiObject(obj)})`
        },
        {
          structure: "S + V + C",
          sentence: `To ${w} is ${adj}.`,
          translation: `การเรียนรู้ (${w}) นั้นเป็นเรื่องที่${getThaiAdjective(adj)}`,
          grammar: `S (To ${w}: การศึกษา (${w})) + V (is: เป็น/คือ) + C (${adj}: ${getThaiAdjective(adj)})`
        },
        {
          structure: "S + V + IO + DO",
          sentence: `He gave the ${w}ed team a reward.`,
          translation: `เขาได้มอบรางวัลให้แก่ทีมที่เกี่ยวข้อง (${w})`,
          grammar: `S (He: เขา) + V (gave: มอบให้) + IO (the ${w}ed team: ทีมที่เกี่ยวกับ (${w})) + DO (a reward: รางวัล)`
        },
        {
          structure: "S + V + O + C",
          sentence: `We found the plan completely ${w}ed.`,
          translation: `พวกเราพบว่าแผนงานเกี่ยวกับ (${w}) นั้นเสร็จสมบูรณ์เรียบร้อย`,
          grammar: `S (We: พวกเรา) + V (found: พบว่า) + O (the plan: แผนการ) + C (completely ${w}ed: เสร็จสิ้นเกี่ยวเนื่องกับ (${w}))`
        }
      ],
      trick: `เมื่อเห็นคำกริยา "${w}" ให้จินตนาการถึงการกระทำและนำไปฝึกแต่งประโยคสั้นๆ เพื่อให้จำได้ง่ายขึ้น`
    };
  } else if (pos === "n.") {
    cardData = {
      wordTranslation: mockTranslation,
      thaiPronunciation: mockPronunciation,
      isFallback: true,
      sentences: [
        {
          structure: "S + V",
          sentence: `The ${w} arrived safely.`,
          translation: `ข้อมูล (${w}) ได้ถูกอัปเดตอย่างปลอดภัยแล้ว`,
          grammar: `S (The ${w}: ${w}) + V (arrived: มาถึง)`
        },
        {
          structure: "S + V + O",
          sentence: `${subj} bought a new ${w}.`,
          translation: `${getThaiSubject(subj)} ได้เตรียมการพัฒนา (${w}) อันใหม่มา`,
          grammar: `S (${subj}: ประธาน) + V (bought: จัดหา) + O (a new ${w}: ${w} อันใหม่)`
        },
        {
          structure: "S + V + C",
          sentence: `This item is a beautiful ${w}.`,
          translation: `หัวข้อตัวอย่างนี้เป็นเรื่องเกี่ยวกับ (${w}) ที่สวยงาม`,
          grammar: `S (This item: รายการตัวอย่างนี้) + V (is: คือ/เป็น) + C (a beautiful ${w}: ${w} ที่สวยงาม)`
        },
        {
          structure: "S + V + IO + DO",
          sentence: `She gave the ${w} a quick clean.`,
          translation: `เธอจัดทำระบบการเรียนรู้ (${w}) อย่างรวดเร็ว`,
          grammar: `S (She: เธอ) + V (gave: จัดให้) + IO (the ${w}: ${w}) + DO (a quick clean: ทำความสะอาดรวดเร็ว)`
        },
        {
          structure: "S + V + O + C",
          sentence: `They made this ${w} their top priority.`,
          translation: `พวกเขาทำให้หัวข้อ (${w}) นี้เป็นสิ่งที่สำคัญที่สุด`,
          grammar: `S (They: พวกเขา) + V (made: กำหนดให้) + O (this ${w}: ${w} นี้) + C (their top priority: งานสำคัญที่สุดของพวกเขา)`
        }
      ],
      trick: `คำนาม "${w}" สามารถจดจำโดยการผูกเข้ากับภาพสิ่งของหรือวาดภาพลงในโน้ตสมอง`
    };
  } else if (pos === "adj.") {
    cardData = {
      wordTranslation: mockTranslation,
      thaiPronunciation: mockPronunciation,
      isFallback: true,
      sentences: [
        {
          structure: "S + V",
          sentence: `${subj} feels ${w}.`,
          translation: `${getThaiSubject(subj)} รู้สึกมีลักษณะแบบ (${w})`,
          grammar: `S (${subj}: ประธาน) + V (feels: รู้สึก) + C (${w}: ${w})`
        },
        {
          structure: "S + V + O",
          sentence: `She bought some ${w} gifts.`,
          translation: `เธอซื้อของขวัญที่มีความพิเศษ (${w}) มาหลายชิ้น`,
          grammar: `S (She: เธอ) + V (bought: ซื้อ) + O (some ${w} gifts: ของขวัญที่${w})`
        },
        {
          structure: "S + V + C",
          sentence: `The current project is ${w}.`,
          translation: `โครงการในปัจจุบันนี้อยู่ในเกณฑ์ (${w})`,
          grammar: `S (The current project: โครงการปัจจุบัน) + V (is: เป็น/คือ) + C (${w}: ${w})`
        },
        {
          structure: "S + V + IO + DO",
          sentence: `He bought the ${w} student a book.`,
          translation: `เขาซื้อหนังสือการศึกษา (${w}) ให้กับนักเรียนคนนั้น`,
          grammar: `S (He: เขา) + V (bought: ซื้อ) + IO (the ${w} student: นักเรียนที่${w}) + DO (a book: หนังสือ)`
        },
        {
          structure: "S + V + O + C",
          sentence: `The manager made the staff ${w}.`,
          translation: `ผู้จัดการทำให้พนักงานรู้สึก (${w})`,
          grammar: `S (The manager: ผู้จัดการ) + V (made: ทำให้) + O (the staff: พนักงาน) + C (${w}: ${w})`
        }
      ],
      trick: `จดจำคำคุณศัพท์ "${w}" โดยจินตนาการถึงความรู้สึกหรือลักษณะภายนอกที่เด่นชัด`
    };
  } else if (pos === "det." || pos === "pron." || pos === "prep." || pos === "art.") {
    cardData = {
      wordTranslation: mockTranslation,
      thaiPronunciation: mockPronunciation,
      isFallback: true,
      sentences: [
        {
          structure: "S + V",
          sentence: `${w} options remain.`,
          translation: `ตัวเลือกจำนวนหนึ่ง (${w}) ยังคงเหลืออยู่`,
          grammar: `S (${w} options: ตัวเลือก ${w}) + V (remain: ยังเหลืออยู่)`
        },
        {
          structure: "S + V + O",
          sentence: `We selected ${w} items.`,
          translation: `พวกเราได้เลือกรายการ (${w})`,
          grammar: `S (We: พวกเรา) + V (selected: เลือก) + O (${w} items: รายการ ${w})`
        },
        {
          structure: "S + V + C",
          sentence: `The issues were only ${w}.`,
          translation: `ปัญหาเหล่านั้นมีเพียงแค่ (${w})`,
          grammar: `S (The issues: ปัญหาเหล่านั้น) + V (were: มี/เป็น) + C (only ${w}: เพียงแค่ ${w})`
        },
        {
          structure: "S + V + IO + DO",
          sentence: `She gave the students ${w} examples.`,
          translation: `เธอได้ให้ตัวอย่างแก่หมู่นักเรียน (${w})`,
          grammar: `S (She: เธอ) + V (gave: ให้) + IO (the students: นักเรียน) + DO (${w} examples: ตัวอย่าง ${w})`
        },
        {
          structure: "S + V + O + C",
          sentence: `We found ${w} details interesting.`,
          translation: `พวกเราพบว่ารายละเอียดสองสามอย่าง (${w}) นั้นน่าสนใจ`,
          grammar: `S (We: พวกเรา) + V (found: พบว่า) + O (${w} details: รายละเอียด ${w}) + C (interesting: น่าสนใจ)`
        }
      ],
      trick: `คำประเภทไวยากรณ์ "${w}" สามารถใช้ประกอบเข้ากับคำนามหรือกริยาเพื่อขยายความหมายให้สมบูรณ์ขึ้น`
    };
  } else {
    cardData = {
      wordTranslation: mockTranslation,
      thaiPronunciation: mockPronunciation,
      isFallback: true,
      sentences: [
        {
          structure: "S + V",
          sentence: `${subj} acted ${w}.`,
          translation: `${getThaiSubject(subj)} ได้ปฏิบัติอย่างมีระดับ (${w})`,
          grammar: `S (${subj}: ประธาน) + V (acted: ปฏิบัติ/แสดงออก) + M (${w}: อย่าง${w})`
        },
        {
          structure: "S + V + O",
          sentence: `We understood ${obj} ${w}.`,
          translation: `พวกเราเข้าใจ${getThaiObject(obj)}ในรูปแบบ (${w})`,
          grammar: `S (We: พวกเรา) + V (understood: เข้าใจ) + O (${obj}: ${getThaiObject(obj)}) + M (${w}: อย่าง${w})`
        },
        {
          structure: "S + V + C",
          sentence: `The presentation was ${w} ${adj}.`,
          translation: `การนำเสนอผลงานนั้นมีความ${getThaiAdjective(adj)}ในระดับ (${w})`,
          grammar: `S (The presentation: การนำเสนอ) + V (was: เป็น/คือ) + C (${adj}: ${getThaiAdjective(adj)}) + M (${w}: อย่าง${w})`
        },
        {
          structure: "S + V + IO + DO",
          sentence: `She gave them ${w.toLowerCase().startsWith("a ") ? "" : "a "}${w} clear answer.`,
          translation: `เธอตอบคำถามให้พวกเขากระจ่างชัดเจนแบบ (${w})`,
          grammar: `S (She: เธอ) + V (gave: ให้) + IO (them: พวกเขา) + DO (${w.toLowerCase().startsWith("a ") ? "" : "a "}${w} clear answer: คำตอบที่ขยายความ (${w}))`
        },
        {
          structure: "S + V + O + C",
          sentence: `We consider the task ${w} completed.`,
          translation: `พวกเราถือว่าภารกิจนั้นสมบูรณ์แบบเรียบร้อย (${w})`,
          grammar: `S (We: พวกเรา) + V (consider: ถือว่า) + O (the task: ภารกิจ) + C (completed: เสร็จสิ้น) + M (${w}: อย่าง${w})`
        }
      ],
      trick: `คำว่า "${w}" เป็นคำขยาย ให้ลองจับคู่เข้ากับกริยาหรือคุณศัพท์ที่เห็นบ่อยๆ`
    };
  }

  cardData.sentences = cardData.sentences.map(s => ({
    ...s,
    thaiPronunciation: englishToThaiPhonetic(s.sentence)
  }));

  return cardData;
}
