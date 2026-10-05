import { Word } from "../types";

export interface CardData {
  articleTitle?: string;
  fullArticleThai?: string;
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

  const mockTranslation = `คำแปลของ "${w}"`;
  const mockPronunciation = transliterateWord(w);

  let articleTitle = `A Story with "${w}"`;
  let fullArticleThai = "";
  let sentences: CardData["sentences"] = [];
  let trick = "";

  if (pos === "v.") {
    articleTitle = `The New Challenge: ${w}`;
    sentences = [
      {
        structure: "S + V",
        sentence: "Our team arrived early.",
        translation: "ทีมงานของเราได้เดินทางมาถึงแต่เช้า",
        thaiPronunciation: englishToThaiPhonetic("Our team arrived early."),
        grammar: "S (Our team: ทีมงานของเรา) + V (arrived early: เดินทางมาถึงแต่เช้า)"
      },
      {
        structure: "S + V + O",
        sentence: `We will ${w} the project today.`,
        translation: `พวกเราจะดำเนินงาน (${w}) โครงการนี้ในวันนี้`,
        thaiPronunciation: englishToThaiPhonetic(`We will ${w} the project today.`),
        grammar: `S (We: พวกเรา) + V (will ${w}: จะทำ (${w})) + O (the project: โครงการ) + M (today: วันนี้)`
      },
      {
        structure: "S + V + C",
        sentence: "The plan feels exciting.",
        translation: "แผนการนี้รู้สึกน่าตื่นเต้นมาก",
        thaiPronunciation: englishToThaiPhonetic("The plan feels exciting."),
        grammar: "S (The plan: แผนการ) + V (feels: รู้สึก) + C (exciting: น่าตื่นเต้น)"
      },
      {
        structure: "S + V + IO + DO",
        sentence: "The mentor gave us great advice.",
        translation: "อาจารย์ที่ปรึกษาได้ให้คำแนะนำที่ดีเยี่ยมแก่พวกเรา",
        thaiPronunciation: englishToThaiPhonetic("The mentor gave us great advice."),
        grammar: "S (The mentor: อาจารย์ที่ปรึกษา) + V (gave: ให้) + IO (us: แก่พวกเรา) + DO (great advice: คำแนะนำที่ดีเยี่ยม)"
      },
      {
        structure: "S + V + O + C",
        sentence: "Everyone found the entire experience useful.",
        translation: "ทุกคนพบว่าประสบการณ์ทั้งหมดมีประโยชน์อย่างยิ่ง",
        thaiPronunciation: englishToThaiPhonetic("Everyone found the entire experience useful."),
        grammar: "S (Everyone: ทุกคน) + V (found: พบว่า) + O (the entire experience: ประสบการณ์ทั้งหมด) + C (useful: มีประโยชน์)"
      }
    ];
    fullArticleThai = "ทีมงานของเราได้เดินทางมาถึงแต่เช้า พวกเราจะดำเนินงานโครงการนี้ในวันนี้ แผนการนี้รู้สึกน่าตื่นเต้นมาก อาจารย์ที่ปรึกษาได้ให้คำแนะนำที่ดีเยี่ยมแก่พวกเรา และทุกคนพบว่าประสบการณ์ทั้งหมดมีประโยชน์อย่างยิ่ง";
    trick = `คำกริยา "${w}" ให้นึกถึงการกระทำและนำไปฝึกเชื่อมโยงเป็นเรื่องราวสั้นๆ จะช่วยให้จดจำได้แม่นยำยิ่งขึ้น`;
  } else if (pos === "n.") {
    articleTitle = `Discovering the ${w}`;
    sentences = [
      {
        structure: "S + V",
        sentence: `A new ${w} arrived.`,
        translation: `${w} อันใหม่ได้มาถึงแล้ว`,
        thaiPronunciation: englishToThaiPhonetic(`A new ${w} arrived.`),
        grammar: `S (A new ${w}: ${w} อันใหม่) + V (arrived: มาถึงแล้ว)`
      },
      {
        structure: "S + V + O",
        sentence: `Our students tested the ${w}.`,
        translation: `นักเรียนของเราได้ทำการทดสอบ ${w}`,
        thaiPronunciation: englishToThaiPhonetic(`Our students tested the ${w}.`),
        grammar: `S (Our students: นักเรียนของเรา) + V (tested: ทดสอบ) + O (the ${w}: ${w})`
      },
      {
        structure: "S + V + C",
        sentence: "The design was very impressive.",
        translation: "การออกแบบนั้นน่าประทับใจเป็นอย่างยิ่ง",
        thaiPronunciation: englishToThaiPhonetic("The design was very impressive."),
        grammar: "S (The design: การออกแบบ) + V (was: เป็น/คือ) + C (very impressive: น่าประทับใจมาก)"
      },
      {
        structure: "S + V + IO + DO",
        sentence: "The teacher showed them a special feature.",
        translation: "คุณครูได้แสดงฟีเจอร์พิเศษให้พวกเขาได้เห็น",
        thaiPronunciation: englishToThaiPhonetic("The teacher showed them a special feature."),
        grammar: "S (The teacher: คุณครู) + V (showed: แสดงให้เห็น) + IO (them: พวกเขา) + DO (a special feature: คุณลักษณะพิเศษ)"
      },
      {
        structure: "S + V + O + C",
        sentence: `Everyone declared the ${w} a great success.`,
        translation: `ทุกคนประกาศว่า ${w} ชิ้นนี้ประสบความสำเร็จอย่างงดงาม`,
        thaiPronunciation: englishToThaiPhonetic(`Everyone declared the ${w} a great success.`),
        grammar: `S (Everyone: ทุกคน) + V (declared: ประกาศว่า) + O (the ${w}: ${w}) + C (a great success: ความสำเร็จอย่างงดงาม)`
      }
    ];
    fullArticleThai = `${w} อันใหม่ได้มาถึงแล้ว นักเรียนของเราได้ทำการทดสอบ ${w} การออกแบบนั้นน่าประทับใจเป็นอย่างยิ่ง คุณครูได้แสดงฟีเจอร์พิเศษให้พวกเขาได้เห็น และทุกคนประกาศว่า ${w} ชิ้นนี้ประสบความสำเร็จอย่างงดงาม`;
    trick = `คำนาม "${w}" ให้จินตนาการถึงภาพวัตถุหรือบริบทการใช้งานจริงในชีวิตประจำวันเพื่อความจำที่ยาวนาน`;
  } else {
    // adj., det., adv., prep., etc. (e.g. "a couple", "a few", "a bit")
    articleTitle = `A Pleasant Gathering: ${w}`;
    sentences = [
      {
        structure: "S + V",
        sentence: `${w.charAt(0).toUpperCase() + w.slice(1)} of guests arrived.`,
        translation: `แขกสองสามคนได้เดินทางมาถึง`,
        thaiPronunciation: englishToThaiPhonetic(`${w} of guests arrived.`),
        grammar: `S (${w} of guests: แขกกลุ่มหนึ่ง) + V (arrived: เดินทางมาถึง)`
      },
      {
        structure: "S + V + O",
        sentence: `They brought ${w} small gifts.`,
        translation: `พวกเขาได้นำของขวัญเล็กๆ น้อยๆ มาด้วย`,
        thaiPronunciation: englishToThaiPhonetic(`They brought ${w} small gifts.`),
        grammar: `S (They: พวกเขา) + V (brought: นำมา) + O (${w} small gifts: ของขวัญเล็กน้อย)`
      },
      {
        structure: "S + V + C",
        sentence: "The atmosphere became very warm.",
        translation: "บรรยากาศเริ่มอบอุ่นขึ้นเป็นอย่างมาก",
        thaiPronunciation: englishToThaiPhonetic("The atmosphere became very warm."),
        grammar: "S (The atmosphere: บรรยากาศ) + V (became: กลายเป็น) + C (very warm: อบอุ่นมาก)"
      },
      {
        structure: "S + V + IO + DO",
        sentence: "The host served everyone hot tea.",
        translation: "เจ้าบ้านได้เสิร์ฟชาร้อนให้แก่ทุกคน",
        thaiPronunciation: englishToThaiPhonetic("The host served everyone hot tea."),
        grammar: "S (The host: เจ้าบ้าน) + V (served: เสิร์ฟ) + IO (everyone: แก่ทุกคน) + DO (hot tea: ชาร้อน)"
      },
      {
        structure: "S + V + O + C",
        sentence: "All guests called the gathering wonderful.",
        translation: "แขกทุกคนกล่าวว่าการพบปะครั้งนี้ยอดเยี่ยมมาก",
        thaiPronunciation: englishToThaiPhonetic("All guests called the gathering wonderful."),
        grammar: "S (All guests: แขกทุกคน) + V (called: กล่าวว่า) + O (the gathering: การพบปะ) + C (wonderful: ยอดเยี่ยม)"
      }
    ];
    fullArticleThai = "แขกสองสามคนได้เดินทางมาถึง พวกเขาได้นำของขวัญเล็กๆ น้อยๆ มาด้วย บรรยากาศเริ่มอบอุ่นขึ้นเป็นอย่างมาก เจ้าบ้านได้เสิร์ฟชาร้อนให้แก่ทุกคน และแขกทุกคนกล่าวว่าการพบปะครั้งนี้ยอดเยี่ยมมาก";
    trick = `คำว่า "${w}" เมื่อนำมาใช้ผสมผสานในเรื่องราวบทความสั้น จะช่วยให้เห็นภาพการใช้งานในโครงสร้างประโยคได้อย่างเป็นธรรมชาติ`;
  }

  return {
    wordTranslation: mockTranslation,
    thaiPronunciation: mockPronunciation,
    articleTitle,
    fullArticleThai,
    sentences,
    trick,
    isFallback: true
  };
}
