/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum IslamicUnit {
  TAJWEED = "TAJWEED",       // [وحدة 1] معلم التجويد
  SIRA = "SIRA",             // [وحدة 2] السيرة النبوية
  FIQH = "FIQH",             // [وحدة 3] الفقه الإسلامي
  INHERITANCE = "INHERITANCE", // [وحدة 4] المواريث والفرائض
  DREAMS = "DREAMS",         // [وحدة 5] تفسير الأحلام
  CHAT = "CHAT",             // [وحدة 6] المحادثة الحرة
  QURAN_MEMORIZATION = "QURAN_MEMORIZATION", // [وحدة 7] حافظ القرآن الكريم الذكي
  HADITH_SCIENCES = "HADITH_SCIENCES",       // [وحدة 8] علم الحديث والمصطلح
  AQIDAH = "AQIDAH",                         // [وحدة 9] علم العقيدة الإسلامية
  DUA_AZKAR = "DUA_AZKAR",                   // [وحدة 10] الدعاء والذكر والأوراد
  SIRA_COMPREHENSIVE = "SIRA_COMPREHENSIVE", // [وحدة 11] السيرة العطرة الموسعة والتاريخ
  ARABIC_GRAMMAR = "ARABIC_GRAMMAR",          // [وحدة 12] اللغة العربية وإعراب القرآن
  MEMORY_HUB = "MEMORY_HUB"                  // [وحدة 13] مركز إثراء الذاكرة والتعلم الذاتي
}

// Tajweed Tutor Types
export enum TajweedLevel {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED"
}

export interface TajweedLesson {
  id: string;
  rule: string;
  category: "noon_sakinah" | "meem_sakinah" | "mudood" | "qalqalah" | "gunnah" | "tafkhim";
  level: TajweedLevel;
  explanation: string;
  conditions?: string;
  arabicPronunciation: string; // Description of vocal cords
  verseText: string;
  verseReference: string;
  otherExamples: { text: string; reference: string }[];
  practiceExercise: string;
}

export interface TajweedQuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

// Sira Types
export interface SiraEvent {
  id: string;
  yearHijri: string;
  yearMiladi: string;
  title: string;
  location: string;
  figures: string[];
  source: string;
  narrative: string;
  lessons: string;
}

// Fiqh Types
export interface FiqhIssue {
  id: string;
  question: string;
  category: "taharah" | "salah" | "zakah" | "siyam" | "hajj" | "nikah" | "talaq" | "halal_haram" | "transactions";
  hanamOpinions: {
    hanafi: { ruling: string; evidence: string };
    maliki: { ruling: string; evidence: string };
    shafi: { ruling: string; evidence: string };
    hanbali: { ruling: string; evidence: string };
  };
  preferredOpinion: string;
  evidenceTexts: { text: string; source: string }[];
}

// Inheritance Calculator Input / Output
export interface InheritanceInput {
  estateValue: number;
  hasHusband: boolean;
  hasWife: boolean;
  sonsCount: number;
  daughtersCount: number;
  hasFather: boolean;
  hasMother: boolean;
  fullBrothersCount: number;
  fullSistersCount: number;
}

export interface HeirShare {
  relationship: string;
  fractionText: string;
  percentage: number;
  amount: number;
  basis: string;
  isBlocked: boolean;
}

export interface InheritanceResult {
  shares: HeirShare[];
  hasCawl: boolean; // عول
  hasRadd: boolean; // رد
  explanationSteps: string[];
}

// Dream Symbol Type
export interface DreamSymbol {
  id: string;
  symbol: string;
  meanings: string[];
  contexts: string;
}

// Chat Message Type
export interface ChatMessage {
  id: string;
  senderIndex: "user" | "nour";
  text: string;
  timestamp: string;
  unitDetected?: IslamicUnit;
  suggestedPrompts?: string[];
}
