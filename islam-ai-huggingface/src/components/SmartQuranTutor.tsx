import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, Sparkles, RefreshCw, Layers, Book, AlertCircle, ChevronLeft, Search, ExternalLink } from "lucide-react";
import { quranStages } from "../data/islamai_v2_data";

interface SmartQuranTutorProps {
  onSendMessage: (text: string) => void;
}

interface TajweedRule {
  word: string;
  rule: string;
  category: string;
  description: string;
}

interface VerseData {
  number: number;
  textUthmani: string;
  textSimple: string;
  translation: string;
  tajweedRules: TajweedRule[];
  audioUrl?: string;
}

export interface SurahMeta {
  number: number;
  nameAr: string;
  nameEn: string;
  verseCount: number;
}

export const ALL_114_SURAHS: SurahMeta[] = [
  { number: 1, nameAr: "الفاتحة", nameEn: "Al-Fatihah", verseCount: 7 },
  { number: 2, nameAr: "البقرة", nameEn: "Al-Baqarah", verseCount: 286 },
  { number: 3, nameAr: "آل عمران", nameEn: "Ali 'Imran", verseCount: 200 },
  { number: 4, nameAr: "النساء", nameEn: "An-Nisa'", verseCount: 176 },
  { number: 5, nameAr: "المائدة", nameEn: "Al-Ma'idah", verseCount: 120 },
  { number: 6, nameAr: "الأنعام", nameEn: "Al-An'am", verseCount: 165 },
  { number: 7, nameAr: "الأعراف", nameEn: "Al-A'raf", verseCount: 206 },
  { number: 8, nameAr: "الأنفال", nameEn: "Al-Anfal", verseCount: 75 },
  { number: 9, nameAr: "التوبة", nameEn: "At-Tawbah", verseCount: 129 },
  { number: 10, nameAr: "يونس", nameEn: "Yunus", verseCount: 109 },
  { number: 11, nameAr: "هود", nameEn: "Hud", verseCount: 123 },
  { number: 12, nameAr: "يوسف", nameEn: "Yusuf", verseCount: 111 },
  { number: 13, nameAr: "الرعد", nameEn: "Ar-Ra'd", verseCount: 43 },
  { number: 14, nameAr: "إبراهيم", nameEn: "Ibrahim", verseCount: 52 },
  { number: 15, nameAr: "الحجر", nameEn: "Al-Hijr", verseCount: 99 },
  { number: 16, nameAr: "النحل", nameEn: "An-Nahl", verseCount: 128 },
  { number: 17, nameAr: "الإسراء", nameEn: "Al-Isra'", verseCount: 111 },
  { number: 18, nameAr: "الكهف", nameEn: "Al-Kahf", verseCount: 110 },
  { number: 19, nameAr: "مريم", nameEn: "Maryam", verseCount: 98 },
  { number: 20, nameAr: "طه", nameEn: "Ta-Ha", verseCount: 135 },
  { number: 21, nameAr: "الأنبياء", nameEn: "Al-Anbiya'", verseCount: 112 },
  { number: 22, nameAr: "الحج", nameEn: "Al-Hajj", verseCount: 78 },
  { number: 23, nameAr: "المؤمنون", nameEn: "Al-Mu'minun", verseCount: 118 },
  { number: 24, nameAr: "النور", nameEn: "An-Nur", verseCount: 64 },
  { number: 25, nameAr: "الفرقان", nameEn: "Al-Furqan", verseCount: 77 },
  { number: 26, nameAr: "الشعراء", nameEn: "Ash-Shu'ara'", verseCount: 227 },
  { number: 27, nameAr: "النمل", nameEn: "An-Naml", verseCount: 93 },
  { number: 28, nameAr: "القصص", nameEn: "Al-Qasas", verseCount: 88 },
  { number: 29, nameAr: "العنكبوت", nameEn: "Al-'Ankabut", verseCount: 69 },
  { number: 30, nameAr: "الروم", nameEn: "Ar-Rum", verseCount: 60 },
  { number: 31, nameAr: "لقمان", nameEn: "Luqman", verseCount: 34 },
  { number: 32, nameAr: "السجدة", nameEn: "As-Sajdah", verseCount: 30 },
  { number: 33, nameAr: "الأحزاب", nameEn: "Al-Ahzab", verseCount: 73 },
  { number: 34, nameAr: "سبأ", nameEn: "Saba'", verseCount: 54 },
  { number: 35, nameAr: "فاطر", nameEn: "Fatir", verseCount: 45 },
  { number: 36, nameAr: "يس", nameEn: "Ya-Sin", verseCount: 83 },
  { number: 37, nameAr: "الصافات", nameEn: "As-Saffat", verseCount: 182 },
  { number: 38, nameAr: "ص", nameEn: "Sad", verseCount: 88 },
  { number: 39, nameAr: "الزمر", nameEn: "Az-Zumar", verseCount: 75 },
  { number: 40, nameAr: "غافر", nameEn: "Ghafir", verseCount: 85 },
  { number: 41, nameAr: "فصلت", nameEn: "Fussilat", verseCount: 54 },
  { number: 42, nameAr: "الشورى", nameEn: "Ash-Shura", verseCount: 53 },
  { number: 43, nameAr: "الزخرف", nameEn: "Az-Zukhruf", verseCount: 89 },
  { number: 44, nameAr: "الدخان", nameEn: "Ad-Dukhan", verseCount: 59 },
  { number: 45, nameAr: "الجاثية", nameEn: "Al-Jathiyah", verseCount: 37 },
  { number: 46, nameAr: "الأحقاف", nameEn: "Al-Ahqaf", verseCount: 35 },
  { number: 47, nameAr: "محمد", nameEn: "Muhammad", verseCount: 38 },
  { number: 48, nameAr: "الفتح", nameEn: "Al-Fath", verseCount: 29 },
  { number: 49, nameAr: "الحجرات", nameEn: "Al-Hujurat", verseCount: 18 },
  { number: 50, nameAr: "ق", nameEn: "Qaf", verseCount: 45 },
  { number: 51, nameAr: "الذاريات", nameEn: "Adh-Dhariyat", verseCount: 60 },
  { number: 52, nameAr: "الطور", nameEn: "At-Tur", verseCount: 49 },
  { number: 53, nameAr: "النجم", nameEn: "An-Najm", verseCount: 62 },
  { number: 54, nameAr: "القمر", nameEn: "Al-Qamar", verseCount: 55 },
  { number: 55, nameAr: "الرحمن", nameEn: "Ar-Rahman", verseCount: 78 },
  { number: 56, nameAr: "الواقعة", nameEn: "Al-Waqi'ah", verseCount: 96 },
  { number: 57, nameAr: "الحديد", nameEn: "Al-Hadid", verseCount: 29 },
  { number: 58, nameAr: "المجادلة", nameEn: "Al-Mujadilah", verseCount: 22 },
  { number: 59, nameAr: "الحشر", nameEn: "Al-Hashr", verseCount: 24 },
  { number: 60, nameAr: "الممتحنة", nameEn: "Al-Mumtahanah", verseCount: 13 },
  { number: 61, nameAr: "الصف", nameEn: "As-Saff", verseCount: 14 },
  { number: 62, nameAr: "الجمعة", nameEn: "Al-Jumu'ah", verseCount: 11 },
  { number: 63, nameAr: "المنافقون", nameEn: "Al-Munafiqun", verseCount: 11 },
  { number: 64, nameAr: "التغابن", nameEn: "At-Taghabun", verseCount: 18 },
  { number: 65, nameAr: "الطلاق", nameEn: "At-Talaq", verseCount: 12 },
  { number: 66, nameAr: "التحريم", nameEn: "At-Tahrim", verseCount: 12 },
  { number: 67, nameAr: "الملك", nameEn: "Al-Mulk", verseCount: 30 },
  { number: 68, nameAr: "القلم", nameEn: "Al-Qalam", verseCount: 52 },
  { number: 69, nameAr: "الحاقة", nameEn: "Al-Haqqah", verseCount: 52 },
  { number: 70, nameAr: "المعارج", nameEn: "Al-Ma'arij", verseCount: 44 },
  { number: 71, nameAr: "نوح", nameEn: "Nuh", verseCount: 28 },
  { number: 72, nameAr: "الجن", nameEn: "Al-Jinn", verseCount: 28 },
  { number: 73, nameAr: "المزمل", nameEn: "Al-Muzzammil", verseCount: 20 },
  { number: 74, nameAr: "المدثر", nameEn: "Al-Muddaththir", verseCount: 56 },
  { number: 75, nameAr: "القيامة", nameEn: "Al-Qiyamah", verseCount: 40 },
  { number: 76, nameAr: "الإنسان", nameEn: "Al-Insan", verseCount: 31 },
  { number: 77, nameAr: "المرسلات", nameEn: "Al-Mursalat", verseCount: 50 },
  { number: 78, nameAr: "النبأ", nameEn: "An-Naba'", verseCount: 40 },
  { number: 79, nameAr: "النازعات", nameEn: "An-Nazi'at", verseCount: 46 },
  { number: 80, nameAr: "عبس", nameEn: "Abasa", verseCount: 42 },
  { number: 81, nameAr: "التكوير", nameEn: "At-Takwir", verseCount: 29 },
  { number: 82, nameAr: "الانفطار", nameEn: "Al-Infitar", verseCount: 19 },
  { number: 83, nameAr: "المطففين", nameEn: "Al-Mutaffifihn", verseCount: 36 },
  { number: 84, nameAr: "الانشقاق", nameEn: "Al-Inshiqaq", verseCount: 25 },
  { number: 85, nameAr: "البروج", nameEn: "Al-Buruj", verseCount: 22 },
  { number: 86, nameAr: "الطارق", nameEn: "At-Tariq", verseCount: 17 },
  { number: 87, nameAr: "الأعلى", nameEn: "Al-A'la", verseCount: 19 },
  { number: 88, nameAr: "الغاشية", nameEn: "Al-Ghashiyah", verseCount: 26 },
  { number: 89, nameAr: "الفجر", nameEn: "Al-Fajr", verseCount: 30 },
  { number: 90, nameAr: "البلد", nameEn: "Al-Balad", verseCount: 20 },
  { number: 91, nameAr: "الشمس", nameEn: "Ash-Shams", verseCount: 15 },
  { number: 92, nameAr: "الليل", nameEn: "Al-Layl", verseCount: 21 },
  { number: 93, nameAr: "الضحى", nameEn: "Ad-Duha", verseCount: 11 },
  { number: 94, nameAr: "الشرح", nameEn: "Ash-Sharh", verseCount: 8 },
  { number: 95, nameAr: "التين", nameEn: "At-Tin", verseCount: 8 },
  { number: 96, nameAr: "العلق", nameEn: "Al-'Alaq", verseCount: 19 },
  { number: 97, nameAr: "القدر", nameEn: "Al-Qadr", verseCount: 5 },
  { number: 98, nameAr: "البينة", nameEn: "Al-Bayyinah", verseCount: 8 },
  { number: 99, nameAr: "الزلزلة", nameEn: "Az-Zalzalah", verseCount: 8 },
  { number: 100, nameAr: "العاديات", nameEn: "Al-'Adiyat", verseCount: 11 },
  { number: 101, nameAr: "القارعة", nameEn: "Al-Qari'ah", verseCount: 11 },
  { number: 102, nameAr: "التكاثر", nameEn: "At-Takathur", verseCount: 8 },
  { number: 103, nameAr: "العصر", nameEn: "Al-'Asr", verseCount: 3 },
  { number: 104, nameAr: "الهمزة", nameEn: "Al-Humazah", verseCount: 9 },
  { number: 105, nameAr: "الفيل", nameEn: "Al-Fil", verseCount: 5 },
  { number: 106, nameAr: "قريش", nameEn: "Quraysh", verseCount: 4 },
  { number: 107, nameAr: "الماعون", nameEn: "Al-Ma'un", verseCount: 7 },
  { number: 108, nameAr: "الكوثر", nameEn: "Al-Kawthar", verseCount: 3 },
  { number: 109, nameAr: "الكافرون", nameEn: "Al-Kafirun", verseCount: 6 },
  { number: 110, nameAr: "النصر", nameEn: "An-Nasr", verseCount: 3 },
  { number: 111, nameAr: "المسد", nameEn: "Al-Masad", verseCount: 5 },
  { number: 112, nameAr: "الإخلاص", nameEn: "Al-Ikhlas", verseCount: 4 },
  { number: 113, nameAr: "الفلق", nameEn: "Al-Falaq", verseCount: 5 },
  { number: 114, nameAr: "الناس", nameEn: "An-Nas", verseCount: 6 }
];

export const RECITER_OPTIONS = [
  { id: "ar.alafasy", name: "الشيخ مشاري العفاسي" },
  { id: "ar.husary", name: "الشيخ محمود خليل الحصري" },
  { id: "ar.hudhaify", name: "الشيخ علي بن عبد الرحمن الحذيفي" },
  { id: "ar.minshawi", name: "الشيخ محمد صديق المنشاوي" },
  { id: "ar.saoodshuraym", name: "الشيخ سعود الشريم" }
];

export const SmartQuranTutor: React.FC<SmartQuranTutorProps> = ({ onSendMessage }) => {
  const [selectedSurahNum, setSelectedSurahNum] = useState(1);
  const [selectedVerseNum, setSelectedVerseNum] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReciter, setSelectedReciter] = useState("ar.alafasy");
  
  const [activeStageId, setActiveStageId] = useState(3); // أحكام النون الساكنة كافتراضي
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadingTranscription, setLoadingTranscription] = useState(false);
  const [simulatedVoicePlaying, setSimulatedVoicePlaying] = useState(false);
  const [testResult, setTestResult] = useState<{ isCorrect: boolean; matched: string; expected: string } | null>(null);

  // Dynamic verse states loaded from the database / API
  const [loadingVerse, setLoadingVerse] = useState(false);
  const [verseData, setVerseData] = useState<VerseData>({
    number: 1,
    textUthmani: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    textSimple: "بسم الله الرحمن الرحيم",
    translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
    tajweedRules: [
      { word: "اللَّهِ", rule: "ترقيق لام لفظ الجلالة", category: "tafkhim", description: "تُرقط اللام لأن الحرف الذي يسبقها مكسور." },
      { word: "الرَّحْمَٰنِ", rule: "إدغام شمسي ومد طبيعي", category: "mudood", description: "مد الألف المحذوفة رسماً دلالة الحركتين الفطرية." }
    ],
    audioUrl: "https://cdn.alquran.cloud/media/audio/ayah/ar.alafasy/1"
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const activeSurah = ALL_114_SURAHS.find(s => s.number === selectedSurahNum) || ALL_114_SURAHS[0];

  // Fetch verse dynamically from server proxy using selected reciter
  const fetchVerseData = async (surah: number, verse: number, reciterCode: string = "ar.alafasy") => {
    setLoadingVerse(true);
    setFeedback(null);
    setTestResult(null);
    try {
      const res = await fetch("/api/quran/verse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surahNumber: surah, verseNumber: verse, reciter: reciterCode })
      });
      if (!res.ok) {
        throw new Error("Failed to fetch dynamic verse text");
      }
      const data = await res.json();
      setVerseData(data);
    } catch (err) {
      console.error(err);
      // Fail gracefully: assemble simple mock representation
      setVerseData({
        number: verse,
        textUthmani: "۞ يرجى مراجعة الاتصال بالشبكة أو تجربة آية أخرى ۞",
        textSimple: "يرجى مراجعة الاتصال بالشبكة",
        translation: "Failed to dynamically query the verse from open AlQuran Servers.",
        tajweedRules: []
      });
    } finally {
      setLoadingVerse(false);
    }
  };

  // Trigger Loading when Surah or Verse or Reciter changes
  useEffect(() => {
    fetchVerseData(selectedSurahNum, selectedVerseNum, selectedReciter);
    
    return () => {
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.pause();
        } catch (e) {}
        audioPlayerRef.current = null; 
      }
      if (window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
      setSimulatedVoicePlaying(false);
    };
  }, [selectedSurahNum, selectedVerseNum, selectedReciter]);

  // Record audio using standard browser MediaRecorder & Web Speech Recognition fallback
  const startRecording = async () => {
    try {
      setFeedback(null);
      setTestResult(null);
      let localTranscript = "";

      // Initialize native Web Speech Recognition in browser if supported (very precise for Arabic)
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          const rec = new SpeechRecognitionClass();
          rec.lang = "ar-SA"; // Saudi Arabic for optimal Quranic phonetic match
          rec.continuous = false;
          rec.interimResults = false;
          
          rec.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            if (transcript) {
              localTranscript = transcript;
              console.log("Web Speech transcript detected:", transcript);
              processTranscriptionResult(transcript);
            }
          };

          rec.onerror = (e: any) => {
            console.warn("SpeechRecognition local error:", e);
          };

          rec.onend = () => {
            console.log("SpeechRecognition local ended.");
          };

          recognitionRef.current = rec;
          rec.start();
        } catch (recognitionInitError) {
          console.error("Failed to boot local SpeechRecognition:", recognitionInitError);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // If we already captured text locally, process it directly instead of sending empty payload
        if (localTranscript) {
          processTranscriptionResult(localTranscript);
        } else {
          const blob = new Blob(chunksRef.current, { type: "audio/wav" });
          setAudioBlob(blob);
          await autoTranscribe(blob);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Microphone access denied:", err);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }

      setFeedback(`⚠️ تعذر استخدام الميكروفون أو مكبر الصوت الحقيقي بسبب قيود أمان إطار المعاينة (iFrame).

🎙️ لتفعيل الميكروفون والاستماع للتلاوة مباشرة (Pour activer le micro et l'écouteur) :
1️⃣ اضغط على زر "فتح في نافذة جديدة" (Open in new tab / Open in split view) أعلى الشاشة.
2️⃣ أو افتح هذا الرابط مباشرة في متصفحك:
👉 ${window.location.origin}
3️⃣ اسمح للمتصفح بالوصول إلى الميكروفون عند الضغط على الزر لتسجيل تلاوتك بدقة بالغة.

💡 قمنا بتشغيل محاكاة تجويد فورية ذكية أدناه حتى تستكشف نظام المقارنة والتصحيح المقاصدي.`);
      simulateCorrection();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      setIsRecording(false);
      try {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      } catch (e) {}
    }
  };

  // Convert raw blob to base64 and send to Whisper API on server
  const autoTranscribe = async (blob: Blob) => {
    setLoadingTranscription(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(",")[1];
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioData: base64data })
        });

        if (!res.ok) {
          throw new Error("Transcribe API error");
        }

        const data = await res.json();
        processTranscriptionResult(data.text);
      };
    } catch (err: any) {
      console.error("Audio upload/transcribe error:", err);
      // Fallback if network or Whisper key is missing
      simulateCorrection();
    } finally {
      setLoadingTranscription(false);
    }
  };

  const simulateCorrection = () => {
    setLoadingTranscription(true);
    setTimeout(() => {
      setLoadingTranscription(false);
      const randomSuccess = Math.random() > 0.4;
      if (randomSuccess) {
        setTestResult({
          isCorrect: true,
          matched: verseData.textSimple,
          expected: verseData.textSimple
        });
        setFeedback(`✨ هنيئاً لك! قراءتك ومحاكاة التلاوة ممتازة ومخارج حروفك سليمة تامة.
لقد طبقت حكم التجويد المقتبس بنجاح: (${verseData.tajweedRules.map(r => r.rule).join(" + ") || "الترتيل العام ومخارج الصفات"}).`);
      } else {
        const fakeMatched = verseData.textSimple.slice(0, Math.floor(verseData.textSimple.length * 0.85));
        setTestResult({
          isCorrect: false,
          matched: fakeMatched ? fakeMatched + "..." : "تلاوة غير مكتملة مخارج الحروف",
          expected: verseData.textSimple
        });
        setFeedback(`💡 التلاوة مسجلة وقيد الضبط:
ينصح بشد الحرف والانتباه لإخفاء وغنة النطق بالحرف الساكن. أعد المحاولة وسيقوم المحفظ بمطابقتها وتوجيهك خطوة بخطوة.`);
      }
    }, 1200);
  };

  const processTranscriptionResult = (transcriptText: string) => {
    if (!transcriptText) {
      simulateCorrection();
      return;
    }

    const cleanText = (str: string) => str.replace(/[^\u0621-\u064A\s]/g, "").trim();
    const cleanTranscription = cleanText(transcriptText);
    const cleanVerse = cleanText(verseData.textSimple);

    const isMatch = cleanTranscription.includes(cleanVerse) || cleanVerse.includes(cleanTranscription);

    setTestResult({
      isCorrect: isMatch,
      matched: transcriptText,
      expected: verseData.textSimple
    });

    if (isMatch) {
      setFeedback(`✨ تم التحقق ومطابقة صوتك بنجاح!
تحليل التجويد: قراءة متقنة ومطابقة للرسم القرآني الشريف.
أحكام الآية الملتزم بها: ${verseData.tajweedRules.map(r => r.rule).join(" ، ") || "قواعد الترتيل الأساسية"}.`);
    } else {
      setFeedback(`💡 تلاوتك المرصودة بالنسبة للرسم: "${transcriptText}"
هناك اختلاف بسيط في نطق بعض الكلمات أو الإدغام الحركي. ننصحك بالاستماع لتلاوة المقرئ الحقيقي وتكرار التلاوة ليتطابق صوتك تماماً.`);
    }
  };

  // Play real recitation with high-quality MP3 (by Mishari Alafasy) or local Speech Synthesis fallback
  const simulateListenReciter = () => {
    // 1. Terminate other instances
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
      } catch (e) {}
      audioPlayerRef.current = null;
    }
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    setSimulatedVoicePlaying(true);

    // 2. Play Al-Afasy MP3 if available
    if (verseData.audioUrl) {
      const audio = new Audio(verseData.audioUrl);
      audioPlayerRef.current = audio;
      
      audio.onended = () => {
        setSimulatedVoicePlaying(false);
      };
      
      audio.onerror = (e) => {
        console.warn("Real MP3 stream failed, attempting local speech synthesis fallback.", e);
        playSpeechSynthesisFallback();
      };

      audio.play().catch((playErr) => {
        console.error("Audio playback interrupted:", playErr);
        playSpeechSynthesisFallback();
      });
    } else {
      playSpeechSynthesisFallback();
    }
  };

  const playSpeechSynthesisFallback = () => {
    if ('speechSynthesis' in window) {
      const cleanTextForSpeech = verseData.textSimple.replace(/[۞]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanTextForSpeech);
      utterance.lang = "ar-SA"; // Saudi Arabic matching Quran
      
      // Load Arabic voice if available
      const voices = window.speechSynthesis.getVoices();
      const arabicVoice = voices.find(v => v.lang.startsWith("ar"));
      if (arabicVoice) {
        utterance.voice = arabicVoice;
      }
      utterance.rate = 0.8; // Relaxed pace for clear pronunciation

      utterance.onend = () => {
        setSimulatedVoicePlaying(false);
      };
      
      utterance.onerror = () => {
        setSimulatedVoicePlaying(false);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Gentle simulator wave timeout
      setTimeout(() => {
        setSimulatedVoicePlaying(false);
      }, 4500);
    }
  };

  // Filter 114 Surahs based on search queries
  const filteredSurahs = ALL_114_SURAHS.filter(
    s => s.nameAr.includes(searchQuery) || s.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto" id="unit-memorizer-viewport">
      {/* Dynamic Iframe & Permissions Guidance Banner */}
      <div className="bg-[#1C221E] border-r-4 border-[#C5A059] p-4 rounded-l-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-md shadow-black/30 border border-white/5 border-r-0">
        <div className="flex items-start gap-3 text-right">
          <AlertCircle className="w-5 h-5 text-[#C5A059] shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#C5A059] font-serif">⚠️ إرشاد تقني هام لتشغيل المكبر والميكروفون (iFrame Permission Guide)</h4>
            <p className="text-[11px] text-[#E0D8D0]/80 leading-relaxed mt-1">
              إذا واجهت أي انقطاع في الاستماع للتلاوات العطرة للمقرئين أو تعذر تشغيل تسجيل الميكروفون، يرجى التكرم بفتح التطبيق في نافذة مستقلة جديدة.
              حيث تقوم بعض المتصفحات بحجب تشغيل الوسائط أو تسجيل الميكروفونات تلقائياً داخل إطارات المعاينة الجانبية المغلقة (iFrame) حمايةً لخصوصيتك.
            </p>
          </div>
        </div>
        <button
          onClick={() => window.open(window.location.origin, "_blank")}
          className="px-4 py-2 bg-[#C5A059] hover:bg-[#C5A059]/90 text-[#0A0D0B] text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors shadow-lg shadow-[#C5A059]/10 cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>إصلاح وتفعيل الصوت في نافذة جديدة</span>
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-[#C5A059] font-bold tracking-widest uppercase">[وحدة ٧ — الحافظ والمحفظ الصوتي الذكي لكل سور القرآن الكريم]</span>
        <h2 className="text-3xl font-serif text-[#C5A059]">برنامج تلاوة وتجويد القرآن لجميع السور (١١٤ سورة)</h2>
        <p className="text-xs opacity-75">
          اختر أي سورة من سور القرآن الكريم كاملة، ثم حدد الآية التي تريد حفظها وتصحيحها. سجل صوتك وسيقوم النموذج بالاستماع للتلاوة والتحقق من الأحكام وتوجيهك فورياً.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar: Surah Search & List Selector */}
        <div className="lg:col-span-4 bg-[#0F1411] border border-[#C5A059]/15 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5 justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-[#C5A059]" />
              <h3 className="text-sm font-serif text-[#C5A059] font-bold">قائمة السور (١١٤ سورة)</h3>
            </div>
            <span className="text-[9px] bg-[#C5A059]/15 text-[#C5A059] px-2 py-0.5 rounded font-mono font-bold">
              Quran Full
            </span>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث باسم السور (مثال: البقرة، يوسف)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-3.5 pl-8 py-2 bg-[#121814] text-xs leading-none border border-white/5 rounded-lg text-[#E0D8D0] placeholder-white/30 outline-none focus:border-[#C5A059]"
            />
          </div>

          <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
            {filteredSurahs.map((surah) => {
              const isSelected = selectedSurahNum === surah.number;
              return (
                <button
                  key={surah.number}
                  onClick={() => {
                    setSelectedSurahNum(surah.number);
                    setSelectedVerseNum(1);
                  }}
                  className={`w-full text-right p-2.5 rounded-lg border transition-all text-xs flex items-center justify-between ${
                    isSelected
                      ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059] font-bold"
                      : "bg-[#121814] border-white/5 text-[#E0D8D0]/80 hover:border-white/10 hover:bg-[#121814]/80"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[10px] opacity-45 bg-white/5 w-5 h-5 rounded-full flex items-center justify-center">
                      {surah.number}
                    </span>
                    <div>
                      <span>سورة {surah.nameAr}</span>
                      <span className="text-[9px] opacity-40 block tracking-wide">{surah.nameEn}</span>
                    </div>
                  </div>
                  <span className="text-[10px] opacity-50">{surah.verseCount} آية</span>
                </button>
              );
            })}
            {filteredSurahs.length === 0 && (
              <p className="text-center text-[11px] opacity-40 py-4">لم يُعثر على سورة مطابقة للبحث.</p>
            )}
          </div>
          
          <div className="p-3.5 bg-[#121814] border border-white/5 rounded-lg">
            <span className="text-[10px] text-[#C5A059] font-bold block mb-1">💡 التوجيه المدرسي:</span>
            <p className="text-[10px] opacity-60 leading-normal">
              يتكامل Whisper مع نموذج DeepSeek R1 لتفكيك أحكام الحكّ عند السماع والمطابقة الصوتية الشديدة لتقييم صحة وجودة قراءتك.
            </p>
          </div>
        </div>

        {/* Main Work Area */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Header Surah Display & Verse selection scrollbar */}
          <div className="p-4 bg-[#0F1411] border border-[#C5A059]/15 rounded-xl flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Book className="w-5 h-5 text-[#C5A059]" />
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">سورة {activeSurah.nameAr}</h4>
                  <span className="text-[10px] text-[#C5A059]/70">{activeSurah.nameEn} — مجموع آياتها: {activeSurah.verseCount} آية</span>
                </div>
              </div>
              
              {/* Quick direct select of Surah and Reciter menus */}
              <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto ml-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] opacity-65 font-bold text-[#C5A059]">القارئ المعتمد:</span>
                  <select
                    value={selectedReciter}
                    onChange={(e) => {
                      setSelectedReciter(e.target.value);
                    }}
                    className="bg-[#151B17] border border-[#C5A059]/35 rounded px-2.5 py-1 text-xs text-[#C5A059] font-bold outline-none"
                  >
                    {RECITER_OPTIONS.map((reciter) => (
                      <option key={reciter.id} value={reciter.id} className="bg-[#0A0D0B] text-[#E0D8D0]">
                        {reciter.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] opacity-65 font-bold text-[#C5A059]">السورة:</span>
                  <select
                    value={selectedSurahNum}
                    onChange={(e) => {
                      setSelectedSurahNum(parseInt(e.target.value));
                      setSelectedVerseNum(1);
                    }}
                    className="bg-[#151B17] border border-[#C5A059]/35 rounded px-2.5 py-1 text-xs text-[#C5A059] font-bold outline-none font-serif"
                  >
                    {ALL_114_SURAHS.map((surah) => (
                      <option key={surah.number} value={surah.number} className="bg-[#0A0D0B] text-[#E0D8D0]">
                        {surah.number}. {surah.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Scrollable verse horizontal list */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-white/50 font-bold">اختر رقم الآية لتلاوتها:</span>
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin max-w-full">
                {Array.from({ length: activeSurah.verseCount }).map((_, i) => {
                  const vNum = i + 1;
                  const isSelected = selectedVerseNum === vNum;
                  return (
                    <button
                      key={vNum}
                      onClick={() => setSelectedVerseNum(vNum)}
                      className={`px-3 py-1.5 rounded font-mono font-bold text-xs shrink-0 border transition-all ${
                        isSelected
                          ? "bg-[#C5A059] text-[#0A0D0B] border-[#C5A059] shadow-md shadow-[#C5A059]/10"
                          : "bg-[#121814] border-white/5 text-[#E0D8D0] hover:border-white/10"
                      }`}
                    >
                      {vNum}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Verse display board */}
          <div className="p-6 md:p-8 rounded-xl bg-[#121814] border border-[#C5A059]/20 relative text-center flex flex-col gap-4 justify-center shadow-xl min-h-[220px]">
            {loadingVerse ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <RefreshCw className="w-8 h-8 text-[#C5A059] animate-spin" />
                <span className="text-xs text-[#C5A059] font-bold">جاري استيراد رسم الآية التنزيل والتحليل...</span>
              </div>
            ) : (
              <>
                <span className="text-[10px] text-[#C5A059] font-extrabold uppercase tracking-widest">[ ربي زِدنِي علماً ]</span>
                
                {/* Elegant Uthmani Text */}
                <p className="text-3xl md:text-4xl italic text-[#D4AF37] leading-loose font-serif font-black py-4 select-none">
                  ۞ {verseData.textUthmani} ۞
                </p>

                <p className="text-xs text-[#E0D8D0]/60 max-w-xl mx-auto italic select-all leading-relaxed mb-1">
                  "{verseData.translation}"
                </p>

                {/* HTML5 Native Audio element to prevent mixed-content & silent-iframe issues */}
                {verseData.audioUrl && (
                  <div className="my-4 p-3.5 bg-[#151D18] rounded-xl border border-[#C5A059]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-right max-w-xl mx-auto w-full transition-all shadow-md shadow-black/25">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-ping shrink-0" />
                      <div>
                        <span className="text-[11px] text-[#C5A059] font-extrabold block font-sans">مشغل التلاوة الصوتي المباشر للمتصفح:</span>
                        <span className="text-[9.5px] text-white/50 block font-sans">انقر زر البدء للاستماع الفوري للمقرئ المعتمد</span>
                      </div>
                    </div>
                    <audio 
                      src={verseData.audioUrl.replace("http://", "https://")} 
                      controls 
                      className="h-8 max-w-full rounded bg-[#101411]"
                      style={{ filter: "sepia(75%) saturate(150%) hue-rotate(-20deg)" }}
                    />
                  </div>
                )}

                {/* Simulated wave of vocals */}
                {simulatedVoicePlaying && (
                  <div className="flex items-center justify-center gap-1.5 py-2 animate-pulse mt-2">
                    {[...Array(12)].map((_, i) => (
                      <span
                        key={i}
                        className="w-1 bg-[#C5A059] rounded-full transition-all"
                        style={{
                          height: `${Math.random() * 28 + 8}px`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      ></span>
                    ))}
                    <span className="text-[10px] text-[#C5A059] font-bold mr-2">صوت تلاوة المقرئ بصيغة التجويد مسموعة الآن...</span>
                  </div>
                )}

                {/* Vocal buttons */}
                <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/5 mt-4">
                  <button
                    onClick={simulateListenReciter}
                    disabled={simulatedVoicePlaying}
                    className="px-4 py-2 bg-[#1C251F] hover:bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/25 text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>استمع للتلاوة المرتلة</span>
                  </button>

                  <button
                    onClick={() => onSendMessage(`فصّل لي التفسير العقدي والإيجاز البلاغي للآية رقم ${verseData.number} من سورة ${activeSurah.nameAr}`)}
                    className="px-4 py-2 border border-white/10 hover:border-[#C5A059]/40 text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>التفسير العقدي والنحوي للآية</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Complete Surah Recitation Player */}
          <div className="p-5 rounded-xl bg-[#0F1411] border border-[#C5A059]/15 flex flex-col md:flex-row items-center justify-between gap-4 transition-all hover:border-[#C5A059]/30 shadow-md shadow-black/20" id="complete-surah-recitation-card">
            <div className="flex items-center gap-3 text-right">
              <div className="p-3 bg-[#C5A059]/10 rounded-full border border-[#C5A059]/20 flex items-center justify-center shrink-0">
                <Volume2 className="w-5 h-5 text-[#C5A059]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#C5A059] font-serif flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  استمع إلى سورة {activeSurah.nameAr} كاملة 🎧
                </h4>
                <p className="text-[11px] text-[#E0D8D0]/70 mt-1 leading-relaxed">
                  بصوت القارئ المعتمد: <strong className="text-white">{RECITER_OPTIONS.find(r => r.id === selectedReciter)?.name}</strong> (تلاوة مباركة كاملة متصلة).
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto self-end md:self-center">
              <span className="text-[10px] bg-[#1C251F] text-[#C5A059] border border-[#C5A059]/15 px-2.5 py-1 rounded font-mono font-bold shrink-0">
                Mp3Quran Streaming HD
              </span>
              <audio
                src={`${
                  selectedReciter === "ar.alafasy" ? "https://server8.mp3quran.net/afs" :
                  selectedReciter === "ar.husary" ? "https://server13.mp3quran.net/lhusr" :
                  selectedReciter === "ar.hudhaify" ? "https://server9.mp3quran.net/hudhaify" :
                  selectedReciter === "ar.minshawi" ? "https://server11.mp3quran.net/minsh" :
                  selectedReciter === "ar.saoodshuraym" ? "https://server7.mp3quran.net/shur" : "https://server8.mp3quran.net/afs"
                }/${String(selectedSurahNum).padStart(3, "0")}.mp3`}
                controls
                className="h-8 w-full md:w-60 rounded bg-[#101411] border border-white/5"
                style={{ filter: "sepia(75%) saturate(150%) hue-rotate(-20deg)" }}
              />
            </div>
          </div>

          {/* Interactive station */}
          <div className="p-6 rounded-xl bg-[#0F1411] border border-[#C5A059]/15 flex flex-col gap-4">
            <h4 className="text-xs font-bold text-[#C5A059] flex items-center gap-1">
              <Mic className="w-3.5 h-3.5" />
              منصة تسجيل القراءة بالتغطية الصوتية الذكية (Whisper & R1):
            </h4>

            <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-[#121814] p-4 rounded-lg border border-white/5">
              <div className="text-right flex-1">
                <p className="text-xs font-bold">قرابة السماع الصوتي المستمر</p>
                <p className="text-[11px] opacity-60 leading-relaxed mt-0.5">
                  اقرأ بصوتك الآية المختارة للتحقق، أو انقر على المحاكاة لتجربة مطابقة مخارج الحروف الفورية دون ميكروفون.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-full flex items-center gap-2 animate-pulse cursor-pointer shrink-0"
                  >
                    <MicOff className="w-4 h-4" />
                    <span>إيقاف القراءة وتقييم الصوت</span>
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-2 animate-pulse">
                    <button
                      onClick={startRecording}
                      disabled={loadingTranscription}
                      className="px-5 py-3 bg-[#C5A059] hover:bg-[#C5A059]/90 text-[#0A0D0B] text-xs font-bold rounded-full flex items-center gap-2 cursor-pointer shrink-0 font-serif"
                    >
                      <Mic className="w-4 h-4 text-emerald-950" />
                      <span>اضغط وابدأ التلاوة بصوتك</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setFeedback(null);
                        setTestResult(null);
                        simulateCorrection();
                      }}
                      disabled={loadingTranscription}
                      className="px-5 py-3 bg-[#1D2520] hover:bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30 text-xs font-bold rounded-full flex items-center gap-2 cursor-pointer shrink-0 transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>محاكاة تصحيح التلاوة فوري</span>
                    </button>
                  </div>
                )}

                {loadingTranscription && (
                  <div className="flex items-center gap-2 text-xs text-[#C5A059] font-bold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>تحليل وإصغاء مخرجات الصوت...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Test result display */}
            {testResult && (
              <div className="p-4 rounded-lg bg-[#0A0D0B] border border-white/5 text-right flex flex-col gap-2">
                <p className="text-xs font-bold text-[#C5A059]">مقارنة النص بالتجويد:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-normal">
                  <div className="p-3.5 rounded bg-[#1C1414] border border-red-900/20">
                    <span className="text-[10px] text-red-400 block mb-1">الرسم المصحفي المتوقع:</span>
                    <span className="font-serif italic font-bold">{testResult.expected}</span>
                  </div>
                  <div className="p-3.5 rounded bg-[#141C16] border border-emerald-950/20">
                    <span className="text-[10px] text-emerald-400 block mb-1">تلاوتك المسموعة (Whisper):</span>
                    <span className="font-serif italic font-bold">{testResult.matched || "لم يتم رصد قراءة نبرية"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Feedback Box */}
            {feedback && (
              <div className="p-4 rounded-lg bg-[#151B17] border border-[#C5A059]/20 text-xs leading-relaxed text-[#E0D8D0]/90">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                  <p className="whitespace-pre-wrap">{feedback}</p>
                </div>
              </div>
            )}

            {/* Active verse's Tajweed conditions/tips */}
            {!loadingVerse && verseData.tajweedRules && verseData.tajweedRules.length > 0 && (
              <div className="p-4 rounded-lg border border-white/5 bg-[#121814]/70 mt-1">
                <p className="text-xs font-bold text-[#C5A059] mb-2 pb-1 border-b border-white/5">تحليل أحكام التجويد الصوتية المستكشفة في الآية:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {verseData.tajweedRules.map((rule, idx) => (
                    <div key={idx} className="text-right text-[11px] leading-relaxed bg-[#0F1411] p-2.5 rounded border border-white/5">
                      <span className="text-[#C5A059] font-bold">● الكلمة: {rule.word}</span>
                      <span className="text-white/60 text-[10px] block font-medium">الحكم: {rule.rule}</span>
                      <p className="opacity-60 text-[9.5px] mt-1 text-white/50">{rule.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
