/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import {
  IslamicUnit,
  TajweedLevel,
  TajweedLesson,
  TajweedQuizQuestion,
  SiraEvent,
  FiqhIssue,
  InheritanceInput,
  InheritanceResult,
  DreamSymbol,
  ChatMessage
} from "./types";
import { tajweedLessons, tajweedQuizQuestions } from "./data/tajweed";
import { sirahEvents } from "./data/sirah";
import { fiqhIssues } from "./data/fiqh";
import { dreamSymbols } from "./data/dreams";
import { solveInheritance } from "./utils/inheritanceSolver";
import {
  BookOpen,
  Award,
  History,
  Scale,
  Calculator,
  Compass,
  MessageSquare,
  Search,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Send,
  Loader2,
  RefreshCw,
  User,
  MapPin,
  ChevronRight,
  Sparkles,
  Info,
  Mic,
  Shield,
  Bookmark,
  Users,
  FileText,
  Brain
} from "lucide-react";

// Import newborn high-end subcomponents for Units 7 to 12 modules
import { SmartQuranTutor } from "./components/SmartQuranTutor";
import { HadithSciences } from "./components/HadithSciences";
import { IslamicAqidah } from "./components/IslamicAqidah";
import { DuaAzkar } from "./components/DuaAzkar";
import { SiraComprehensive } from "./components/SiraComprehensive";
import { ArabicGrammar } from "./components/ArabicGrammar";
import { MemoryHub } from "./components/MemoryHub";
import { GlobalQuranBar } from "./components/GlobalQuranBar";
import { PWAInstallButton } from "./components/GlobalQuranBar";
import { IslamicResponseUtility } from "./components/IslamicResponseUtility";

export default function App() {
  // Navigation & General State
  const [activeUnit, setActiveUnit] = useState<IslamicUnit>(IslamicUnit.CHAT);
  
  // Custom theme subtext date
  const [currentDateAr, setCurrentDateAr] = useState("الاثنين، ٢٤ ربيع الآخر ١٤٤٥ هـ");
  
  // -- Unit 1: Tajweed State
  const [selectedTajweedLevel, setSelectedTajweedLevel] = useState<TajweedLevel>(TajweedLevel.BEGINNER);
  const [selectedLessonId, setSelectedLessonId] = useState<string>("noon-izhar");
  const [quizStarted, setQuizStarted] = useState<boolean>(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);

  // -- Unit 2: Sira State
  const [selectedSiraEventId, setSelectedSiraEventId] = useState<string>("birth");
  const [siraSearch, setSiraSearch] = useState<string>("");

  // -- Unit 3: Fiqh State
  const [selectedFiqhIssueId, setSelectedFiqhIssueId] = useState<string>("wudu-touch-woman");
  const [customFiqhQuestion, setCustomFiqhQuestion] = useState<string>("");
  const [customFiqhResponse, setCustomFiqhResponse] = useState<string | null>(null);
  const [customFiqhLoading, setCustomFiqhLoading] = useState<boolean>(false);

  // -- Unit 4: Inheritance State
  const [estateValue, setEstateValue] = useState<number>(120000);
  const [hasHusband, setHasHusband] = useState<boolean>(false);
  const [hasWife, setHasWife] = useState<boolean>(true);
  const [sonsCount, setSonsCount] = useState<number>(2);
  const [daughtersCount, setDaughtersCount] = useState<number>(1);
  const [hasFather, setHasFather] = useState<boolean>(true);
  const [hasMother, setHasMother] = useState<boolean>(true);
  const [fullBrothersCount, setFullBrothersCount] = useState<number>(0);
  const [fullSistersCount, setFullSistersCount] = useState<number>(0);
  const [inheritanceResult, setInheritanceResult] = useState<InheritanceResult | null>(null);

  // -- Unit 5: Dream State
  const [selectedSymbolId, setSelectedSymbolId] = useState<string>("water-sweet");
  const [customDreamText, setCustomDreamText] = useState<string>("");
  const [dreamUserState, setDreamUserState] = useState<string>("أعزب، ملتزم بالأذكار");
  const [dreamInterpretation, setDreamInterpretation] = useState<string | null>(null);
  const [dreamLoading, setDreamLoading] = useState<boolean>(false);

  // -- Unit 6: Chat State
  const [chatInput, setChatInput] = useState<string>("");
  const [detectedUnit, setDetectedUnit] = useState<IslamicUnit | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      senderIndex: "nour",
      text: `بسم الله الرحمن الرحيم
السلام عليكم ورحمة الله وبركاته

أهلاً بكم في صرح **إسلام AI** — رفيقكم ومستشاركم الإسلامي الأكاديمي الشامل. 
تأسس هذا الصرح المعرفي بواسطة المبرمج الباحث **KHEDIM BENYAKHLEF DIT BENY-JOE** (المحمدية، معسكر، الجزائر).

أنا مهيأ لمساعدتكم في تبيين مسائل الفقه على المذاهب الأربعة، وحساب المواريث والفرائض بدقة شرعية بالغة، وتدريس قواعد التجويد الشاملة لكل السور، واستعراض خط سير السيرة النبوية والتاريخ الإسلامي، وتفسير الرؤى والأحلام لابن سيرين، مدعوماً بـ ١٣ وحدة علمية ذكية متكاملة ونظام لتغذية الذاكرة المعرفية للتعلم الذاتي المستمر تلقائياً.

تفضلوا بطرح ما تبتغون علمه، وسأجيبكم متأصلاً بالهدى والأدلة الشرعية الموثوقة.`,
      timestamp: "21:00"
    }
  ]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Trigger inheritance calculation when inputs change
  useEffect(() => {
    // If hasHusband is true, hasWife must be false (Islamic marriage law on demise)
    if (hasHusband && hasWife) {
      setHasWife(false);
    }
  }, [hasHusband]);

  useEffect(() => {
    if (hasWife && hasHusband) {
      setHasHusband(false);
    }
  }, [hasWife]);

  useEffect(() => {
    const input: InheritanceInput = {
      estateValue,
      hasHusband,
      hasWife,
      sonsCount: Math.max(0, sonsCount),
      daughtersCount: Math.max(0, daughtersCount),
      hasFather,
      hasMother,
      fullBrothersCount: Math.max(0, fullBrothersCount),
      fullSistersCount: Math.max(0, fullSistersCount)
    };
    const result = solveInheritance(input);
    setInheritanceResult(result);
  }, [
    estateValue,
    hasHusband,
    hasWife,
    sonsCount,
    daughtersCount,
    hasFather,
    hasMother,
    fullBrothersCount,
    fullSistersCount
  ]);

  // Handle automatic Unit detection based on chat input keywords
  useEffect(() => {
    const text = chatInput.trim().toLowerCase();
    if (!text) {
      setDetectedUnit(null);
      return;
    }

    if (
      text.includes("تجويد") ||
      text.includes("إظهار") ||
      text.includes("إدغام") ||
      text.includes("قلقلة") ||
      text.includes("المد") ||
      text.includes("غنة") ||
      text.includes("مخارج الحروف")
    ) {
      setDetectedUnit(IslamicUnit.TAJWEED);
    } else if (
      text.includes("سيرة") ||
      text.includes("غزوة") ||
      text.includes("النبي") ||
      text.includes("الصحابة") ||
      text.includes("مكة") ||
      text.includes("الهجرة") ||
      text.includes("البعثة") ||
      text.includes("ولد")
    ) {
      setDetectedUnit(IslamicUnit.SIRA);
    } else if (
      text.includes("فقه") ||
      text.includes("حكم") ||
      text.includes("وضوء") ||
      text.includes("صلاة") ||
      text.includes("زكاة") ||
      text.includes("مذهب") ||
      text.includes("شافعي") ||
      text.includes("مالكي") ||
      text.includes("حنبلي") ||
      text.includes("حنفي") ||
      text.includes("حلال") ||
      text.includes("حرام")
    ) {
      setDetectedUnit(IslamicUnit.FIQH);
    } else if (
      text.includes("ميراث") ||
      text.includes("ورثة") ||
      text.includes("تركة") ||
      text.includes("مات") ||
      text.includes("توفي") ||
      text.includes("الفرائض") ||
      text.includes("عول") ||
      text.includes("حجب")
    ) {
      setDetectedUnit(IslamicUnit.INHERITANCE);
    } else if (
      text.includes("حلم") ||
      text.includes("رأيت") ||
      text.includes("منام") ||
      text.includes("رؤيا") ||
      text.includes("تفسير") ||
      text.includes("ابن سيرين")
    ) {
      setDetectedUnit(IslamicUnit.DREAMS);
    } else {
      setDetectedUnit(null);
    }
  }, [chatInput]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // -- API Call: General Chat
  const handleSendChatMessage = async (textToSend?: string) => {
    const rawText = textToSend || chatInput;
    if (!rawText.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      senderIndex: "user",
      text: rawText,
      timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      unitDetected: detectedUnit || undefined
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput("");
    setChatLoading(true);

    try {
      // Load custom memories from LocalStorage to teach the AI in real-time
      let customMemoryStr = "";
      try {
        const savedMemories = localStorage.getItem("islam_ai_memory_items");
        if (savedMemories) {
          const parsed = JSON.parse(savedMemories);
          if (Array.isArray(parsed)) {
            customMemoryStr = parsed.map((item: any) => `[المادة: ${item.title} / تصنيف: ${item.category}]:\n${item.content}`).join("\n\n");
          }
        }
      } catch (memError) {
        console.error("Failed to load local memories for chat API call", memError);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: rawText,
          previousMessages: messages.slice(-8), // Limit context to last 8 messages
          customMemory: customMemoryStr
        })
      });

      if (!response.ok) {
        throw new Error("حدث خطأ في الاتصال بالخادم الأكاديمي");
      }

      const data = await response.json();
      const nourMsg: ChatMessage = {
        id: Math.random().toString(),
        senderIndex: "nour",
        text: data.text,
        timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, nourMsg]);
    } catch (e: any) {
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        senderIndex: "nour",
        text: `بسم الله الرحمن الرحيم
السلام عليكم ورحمة الله وبركاته

معذرةً يا رفيقي الكريم، واجهت عائقاً فجائياً أثناء تصريف السؤال للـ API.
لكن يسعدني نقاش المسائل وتحضير النصوص الشرعية محلياً بمطالعة الفقه والمواريث والتجويد من القائمة الجانبية المتاحة لك طوال الوقت.

والله أعلم — وصلى الله على نبينا محمد وعلى آله وصحبه أجمعين`,
        timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  // -- API Call: Dream Interpretation
  const handleRequestDreamInterpret = async () => {
    if (!customDreamText.trim()) return;
    setDreamLoading(true);
    setDreamInterpretation(null);

    try {
      const response = await fetch("/api/dream-interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dreamText: customDreamText,
          userState: dreamUserState,
          symbols: dreamSymbols.find(s => s.id === selectedSymbolId)?.symbol
        })
      });

      if (!response.ok) {
        throw new Error();
      }
      const data = await response.json();
      setDreamInterpretation(data.interpretation);
    } catch {
      // Local fallback
      setDreamInterpretation(`بسم الله الرحمن الرحيم
السلام عليكم ورحمة الله وبركاته

🌙 **الرؤيا**: "${customDreamText}"
📚 **المرجع المعتبر**: كتاب تعبير الأحلام للإمام أبي بكر محمد بن سيرين.
🔍 **تحليل المنهج**:
   - حالة الرائي المستفادة: **${dreamUserState}**
   - الرمز القياسي المعزز: **${dreamSymbols.find(s => s.id === selectedSymbolId)?.symbol}**

💡 **التعبير التقديري المحتمل**:
رؤيا الخير تدل بإذن الله على طمأنينة وفتح باب تيسير بعد طول انتظار وكرب. تشير الرموز المرافقة لحلمكم إلى نيل بركة ومنفعة بقدر صلاح السريرة والمواظبة على السنن.

🤲 **التوصية المباركة**:
تجنب الحديث بالرؤيا لغير ناصح أو محب، واحمد الله على بشائرها، وواظب على ذكره في الحل والترحال.

⚠️ **تنبيه**: تعبير الأحلام علم ظني تأويلي للاسترشاد الصالح، ولا ينبغي الجزم بغيبيات المستقبل مطلقاً.

والله أعلم — وصلى الله على نبينا محمد وعلى آله وصحبه أجمعين`);
    } finally {
      setDreamLoading(false);
    }
  };

  // Filtered Sira Events based on user query
  const filteredSiraEvents = sirahEvents.filter(
    (ev) =>
      ev.title.includes(siraSearch) ||
      ev.location.includes(siraSearch) ||
      ev.narrative.includes(siraSearch) ||
      ev.lessons.includes(siraSearch)
  );

  // Filtered Tajweed Lessons based on level
  const filteredTajweedLessons = tajweedLessons.filter((l) => l.level === selectedTajweedLevel);
  const activeTajweedLesson = tajweedLessons.find((l) => l.id === selectedLessonId) || tajweedLessons[0];

  // Specific Fiqh Predefined Issue object
  const activeFiqhIssue = fiqhIssues.find((i) => i.id === selectedFiqhIssueId) || fiqhIssues[0];

  // Specific Dream Symbol object
  const activeDreamSymbol = dreamSymbols.find((s) => s.id === selectedSymbolId) || dreamSymbols[0];

  // Handle Quiz Flow Option Selection
  const handleSelectOption = (idx: number) => {
    if (quizSubmitted) return;
    setSelectedOption(idx);
  };

  const handleNextQuizQuestion = () => {
    setSelectedOption(null);
    setQuizSubmitted(false);
    if (currentQuizIndex < tajweedQuizQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      // Finished
      setQuizStarted(false);
      setCurrentQuizIndex(0);
    }
  };

  const handleSubmitQuizAnswer = () => {
    if (selectedOption === null || quizSubmitted) return;
    setQuizSubmitted(true);
    if (selectedOption === tajweedQuizQuestions[currentQuizIndex].correctAnswerIndex) {
      setQuizScore(prev => prev + 10);
    }
  };

  const handleResetQuiz = () => {
    setQuizScore(0);
    setCurrentQuizIndex(0);
    setSelectedOption(null);
    setQuizSubmitted(false);
    setQuizStarted(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0D0B] text-[#E0D8D0] font-sans antialiased selection:bg-[#C5A059] selection:text-[#0A0D0B]" dir="rtl" id="nour-app-root">
      
      {/* زر تثبيت التطبيق على الهاتف */}
      <PWAInstallButton />
      
      {/* HEADER SECTION WITH SOPHISTICATED DARK AESTHETIC */}
      <header className="flex flex-col md:flex-row items-center justify-between px-6 md:px-10 py-5 border-b border-[#C5A059]/20 bg-[#0F1411]" id="nour-header">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="w-12 h-12 rounded-full border-2 border-[#C5A059] flex items-center justify-center shadow-lg shadow-[#C5A059]/5 shrink-0">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#C5A059] to-[#8E793E] rounded-full opacity-80 flex items-center justify-center">
              <span className="text-[10px] text-[#0A0D0B] font-bold">إسلام</span>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-serif font-black tracking-wide text-[#C5A059]">إسلام AI</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059]/70 font-bold">المساعد الإسلامي الأكاديمي الحصيف</p>
            <p className="text-[8.5px] text-[#C5A059]/65 font-mono mt-0.5 select-all">تأسيس: KHEDIM BENYAKHLEF DIT BENY-JOE</p>
          </div>
        </div>
        
        <div className="text-center md:text-left flex flex-col md:items-end">
          <p className="text-xs md:text-sm font-serif italic text-[#C5A059]/90">"اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ" — سورة العلق: ١</p>
          <div className="flex items-center gap-2 mt-1 justify-center md:justify-end">
            <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse"></span>
            <p className="text-[10px] opacity-60 font-medium">{currentDateAr}</p>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER: SIDEBAR + LOGICAL CORE */}
      <div className="flex flex-col lg:flex-row flex-1" id="nour-main-layout">
        
        {/* RIGHT SIDEBAR (UNIT SELECTOR) */}
        <aside className="w-full lg:w-72 bg-[#0D110E] border-b lg:border-b-0 lg:border-l border-[#C5A059]/15 p-6 shrink-0" id="nour-sidebar">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[10px] uppercase tracking-widest text-[#C5A059] font-extrabold">بوابات العلوم الشرعية</p>
            <span className="text-[9px] bg-[#C5A059]/10 text-[#C5A059] px-2 py-0.5 rounded border border-[#C5A059]/20">الأصيلة</span>
          </div>

          <nav className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1" id="nour-sidebar-nav">
            {[
              { id: IslamicUnit.QURAN_MEMORIZATION, label: "حافظ القرآن الذكي [٧]", order: "٠٧", icon: Mic, badge: "صحيح التلاوة" },
              { id: IslamicUnit.HADITH_SCIENCES, label: "مسند مصطلح الحديث [٨]", order: "٠٨", icon: Award, badge: "علوم الأسانيد" },
              { id: IslamicUnit.AQIDAH, label: "العقيدة والتوحيد [٩]", order: "٠٩", icon: Shield, badge: "استقامة فكرية" },
              { id: IslamicUnit.DUA_AZKAR, label: "الأذكار والأدعية [١٠]", order: "١٠", icon: Bookmark, badge: "حصن المسلم" },
              { id: IslamicUnit.SIRA_COMPREHENSIVE, label: "الخلافة والتاريخ [١١]", order: "١١", icon: Users, badge: "سير تاريخي ممتد" },
              { id: IslamicUnit.ARABIC_GRAMMAR, label: "إعراب التنزيل [١٢]", order: "١٢", icon: FileText, badge: "بلاغة ولغة" },
              { id: IslamicUnit.MEMORY_HUB, label: "الذاكرة والتعلم الذاتي [١٣]", order: "١٣", icon: Brain, badge: "تنمية عقل الآلة" },
              
              { id: IslamicUnit.TAJWEED, label: "معلم التجويد [١]", order: "٠١", icon: BookOpen, badge: "أحكام الترتيل" },
              { id: IslamicUnit.SIRA, label: "السير والمغازي [٢]", order: "٠٢", icon: History, badge: "حياة المصطفى" },
              { id: IslamicUnit.FIQH, label: "الفقه المذهبي [٣]", order: "٠٣", icon: Scale, badge: "المذاهب الأربعة" },
              { id: IslamicUnit.INHERITANCE, label: "حساب المواريث [٤]", order: "٠٤", icon: Calculator, badge: "الفرائض والمواريث" },
              { id: IslamicUnit.DREAMS, label: "تعبيرات ابن سيرين [٥]", order: "٠٥", icon: Compass, badge: "تأويل الرؤى" },
              { id: IslamicUnit.CHAT, label: "المحادثة الحرة [٦]", order: "٠٦", icon: MessageSquare, badge: "إسلام الذكي" }
            ].map((unit) => {
              const IconComponent = unit.icon;
              const isActive = activeUnit === unit.id;
              return (
                <button
                  key={unit.id}
                  id={`btn-unit-${unit.id}`}
                  onClick={() => {
                    setActiveUnit(unit.id);
                    if (unit.id === IslamicUnit.TAJWEED) {
                      setQuizStarted(false);
                    }
                  }}
                  className={`w-full text-right flex items-center justify-between p-3 rounded transition-all duration-300 group relative ${
                    isActive
                      ? "bg-[#C5A059]/10 border border-[#C5A059]/40 text-[#C5A059] shadow-inner"
                      : "border border-white/5 bg-[#121814]/40 text-[#E0D8D0]/85 hover:bg-white/5 hover:border-[#C5A059]/20"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComponent className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? "text-[#C5A059]" : "text-white/40"}`} />
                    <div>
                      <span className="text-xs font-bold block leading-tight">{unit.label}</span>
                      <span className="text-[8px] opacity-40 block">{unit.badge}</span>
                    </div>
                  </div>
                  <span className={`text-[9.5px] font-mono tracking-wider ${isActive ? "text-[#C5A059] font-bold" : "opacity-40"}`}>
                    {unit.order}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-10 p-4 rounded-lg bg-[#151B17] border border-[#C5A059]/10" id="sourcer-disclaimer-box">
            <h4 className="text-xs font-bold text-[#C5A059] mb-1">المصادر المعتمدة:</h4>
            <div className="space-y-1.5 text-[11px] text-[#E0D8D0]/70 leading-relaxed">
              <p>• القرآن الكريم والتراجم المتواترة</p>
              <p>• كتاب المغازي والجوامع للبخاري ومسلم</p>
              <p>• كتاب تفسير الأحلام لابن سيرين</p>
              <p>• كتب الفقه المعتمدة في المذاهب الأربعة</p>
            </div>
          </div>
        </aside>

        {/* LOGICAL ACTIVE SCREENS */}
        <main className="flex-1 p-6 md:p-10 flex flex-col gap-6 bg-[radial-gradient(circle_at_top_right,_#151B17_0%,_#0A0D0B_100%)] overflow-y-auto" id="nour-active-viewport">
          
          {/* =======================================================
               UNIT 6: CHAT INTERFACE (المحادثة الإسلامية الحرة)
             ======================================================= */}
          {activeUnit === IslamicUnit.CHAT && (
            <div className="flex flex-col h-full gap-4 max-w-5xl mx-auto w-full transition-opacity duration-300" id="unit-chat-screen">
              <div className="flex flex-col gap-1.5" id="chat-banner">
                <span className="text-[10px] text-[#C5A059] font-bold tracking-widest uppercase">[وحدة ٦ — المحادثة الأكاديمية الاستشارية]</span>
                <h2 className="text-3xl font-serif text-[#C5A059]">مجلس السائل الفقهي والبحث الشرعي</h2>
                <p className="text-xs opacity-70">اطرح سؤالك بأمانة علمية وصدر رحب، وسيقدم المساعد إجابة مخرجة وموثقة بالأدلة من الكتاب والسنة وسرد المذاهب المعتمدة.</p>
              </div>

              {/* Chat Container */}
              <div className="flex-1 bg-[#101512]/90 rounded-xl border border-[#C5A059]/15 flex flex-col h-[520px] overflow-hidden shadow-2xl relative">
                {/* Simulated decoration */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-[#C5A059] to-[#8E793E] opacity-60"></div>
                
                {/* Message Viewer */}
                <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 flex flex-col" id="chat-messages-container">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] md:max-w-[75%] rounded-lg p-4 leading-relaxed ${
                        msg.senderIndex === "user"
                          ? "bg-[#C5A059]/10 text-[#E0D8D0] self-start border border-[#C5A059]/20"
                          : "bg-[#161D19] border border-white/5 text-[#E0D8D0] self-end"
                      }`}
                    >
                      {/* Logo header for scholar response */}
                      {msg.senderIndex === "nour" && (
                        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-white/5">
                          <span className="w-1.5 h-3 bg-[#C5A059]"></span>
                          <span className="text-[10px] text-[#C5A059] font-extrabold">إسلام AI — فضيلة المستشار المساعد</span>
                        </div>
                      )}

                      <div className="text-sm whitespace-pre-wrap leading-relaxed font-serif text-right font-light">
                        {msg.text}
                      </div>

                      {msg.unitDetected && (
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[9px] bg-[#C5A059]/15 text-[#C5A059] px-2 py-0.5 rounded font-bold font-mono">
                            تم تمييز تصنيف: {msg.unitDetected === IslamicUnit.FIQH ? "الفقه" : msg.unitDetected === IslamicUnit.INHERITANCE ? "المواريث" : msg.unitDetected === IslamicUnit.TAJWEED ? "التجويد" : msg.unitDetected === IslamicUnit.SIRA ? "السيرة" : "الرؤى والمنام"}
                          </span>
                          <button
                            onClick={() => setActiveUnit(msg.unitDetected!)}
                            className="text-[9px] text-[#C5A059]/90 hover:underline flex items-center gap-1 font-bold"
                          >
                            انتقال للقسم التفاعلي <ChevronRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}

                      <div className="text-left mt-1 text-[8px] opacity-40">
                        {msg.timestamp}
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {chatLoading && (
                    <div className="bg-[#161D19] border border-white/5 text-[#E0D8D0] self-end rounded-lg p-4 flex items-center gap-3 w-48">
                      <Loader2 className="w-3.5 h-3.5 text-[#C5A059] animate-spin" />
                      <span className="text-xs opacity-60">يستحضر الأدلة والمجامع...</span>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Starters Container */}
                <div className="p-3 bg-[#0B0E0C] border-t border-white/5 flex flex-wrap gap-2 items-center" id="chat-starters">
                  <span className="text-[10px] text-[#C5A059]/70 font-semibold shrink-0">اقتراحات سريعة للبحث:</span>
                  {[
                    "ما حكم صلاة الجماعة لرجال؟",
                    "كيف يُعامل الإدغام بغير غنة؟",
                    "توفي زوج وله ابنان وأم وبنت",
                    "رأيت في منامي تمر ومفاتيح"
                  ].map((starter, i) => (
                    <button
                      key={i}
                      id={`starter-${i}`}
                      onClick={() => handleSendChatMessage(starter)}
                      className="text-[10px] bg-[#121814] hover:bg-[#C5A059]/10 border border-[#C5A059]/15 rounded px-2.5 py-1 text-right text-[#E0D8D0]/80 transition-all duration-300"
                    >
                      {starter}
                    </button>
                  ))}
                </div>

                {/* Message Input Area */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChatMessage();
                  }}
                  className="p-4 bg-[#0E1210] border-t border-[#C5A059]/15 flex items-center gap-3"
                  id="chat-input-form"
                >
                  <input
                    type="text"
                    id="chat-input-field"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="اكتب سؤالك هنا (مثال: ما حكم قراءة الفاتحة خلف الإمام؟)..."
                    className="flex-1 bg-[#151B17] border border-[#C5A059]/30 rounded px-4 py-3 text-sm focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/50 text-[#E0D8D0]"
                    disabled={chatLoading}
                  />

                  {detectedUnit && (
                    <div className="hidden md:flex items-center gap-1 bg-[#C5A059]/5 border border-[#C5A059]/20 rounded px-2.5 py-2">
                      <Sparkles className="w-3 h-3 text-[#C5A059] animate-pulse" />
                      <span className="text-[9px] text-[#C5A059] font-bold">ذكاء الفهم التلقائي نشط</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    id="btn-send-message"
                    disabled={chatLoading || !chatInput.trim()}
                    className="bg-[#C5A059] text-[#0A0D0B] font-bold hover:bg-[#C5A059]/90 disabled:bg-white/5 disabled:text-[#E0D8D0]/30 transition-all duration-300 px-5 py-3 rounded-lg flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    <span className="text-xs hidden md:inline">استفسر</span>
                  </button>
                </form>
              </div>

              {/* Tips */}
              <div className="p-4 bg-[#121814] rounded-lg border border-white/5 flex items-start gap-3">
                <Info className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#E0D8D0]/80 leading-relaxed">
                  <strong>نصيحة التدبر:</strong> مساعد الذكاء الاصطناعي مهيأ بطبقة حماية شرعية أصيلة. لا يخوض في الطوائف أو التعصب أو النزاعات الحزبية والسياسية المعاصرة، ويتأصل دائماً بالقواعد المعترف بها لجمهور أهل العلم وخاصة المذاهب السنية الأربعة المعتبرة.
                </p>
              </div>
            </div>
          )}

          {/* =======================================================
               UNIT 3: FIQH SCHOLASTIC COMPARATOR (الفقه والأحكام)
             ======================================================= */}
          {activeUnit === IslamicUnit.FIQH && (
            <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto transition-opacity duration-300" id="unit-fiqh-screen">
              <div className="flex flex-col gap-1.5" id="fiqh-banner">
                <span className="text-[10px] text-[#C5A059] font-bold tracking-widest uppercase">[وحدة ٣ — الفقه والأحكام الشرعية]</span>
                <h2 className="text-3xl font-serif text-[#C5A059]">مُقارن ومُعرّف المذاهب السنية الأربعة</h2>
                <p className="text-xs opacity-70">طالع الأحكام الفقهية وتفاصيل الآراء المستنبطة للأئمة الأربعة مجتمعين جنباً لجنب، مع الأدلة النصية من صحيح الإسناد.</p>
              </div>

              {/* Grid selectors & Predefined items */}
              <div className="bg-[#0F1411] border border-[#C5A059]/15 rounded-xl p-5 md:p-6" id="fiqh-predefined-box">
                <p className="text-xs text-[#C5A059]/80 font-bold mb-3">اختر مسألة فقهية للاستعراض التفصيلي والمطالعة:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {fiqhIssues.map((issue) => (
                    <button
                      key={issue.id}
                      id={`btn-fiqh-issue-${issue.id}`}
                      onClick={() => {
                        setSelectedFiqhIssueId(issue.id);
                        setCustomFiqhResponse(null);
                      }}
                      className={`text-right p-3.5 rounded-lg border transition-all duration-300 ${
                        selectedFiqhIssueId === issue.id && !customFiqhResponse
                          ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059]"
                          : "bg-[#121814] border-white/5 text-[#E0D8D0]/85 hover:border-[#C5A059]/30"
                      }`}
                    >
                      <p className="text-xs opacity-50 mb-1">
                        {issue.category === "taharah" ? "كتاب الطهارة" : issue.category === "salah" ? "كتاب الصلاة" : "كتاب الزكاة"}
                      </p>
                      <h4 className="text-sm font-bold truncate">{issue.question}</h4>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic 4 Madhab Grid display */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" id="fiqh-schools-grid">
                {[
                  { key: "hanafi", title: "المذهب الحنفي", imam: "للإمام أبي حنيفة النعمان" },
                  { key: "maliki", title: "المذهب المالكي", imam: "للإمام مالك بن أنس" },
                  { key: "shafi", title: "المذهب الشافعي", imam: "للإمام محمد بن إدريس الشافعي" },
                  { key: "hanbali", title: "المذهب الحنبلي", imam: "للإمام أحمد بن حنبل" }
                ].map((school) => {
                  const data = activeFiqhIssue.hanamOpinions[school.key as keyof typeof activeFiqhIssue.hanamOpinions];
                  return (
                    <div
                      key={school.key}
                      id={`card-school-${school.key}`}
                      className="p-5 rounded-lg border border-[#C5A059]/15 bg-[#121814]/90 flex flex-col justify-between shadow-lg relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 left-0 h-0.5 bg-[#C5A059]/20"></div>
                      <div>
                        <span className="text-[10px] text-[#C5A059] font-extrabold tracking-widest block uppercase">{school.imam}</span>
                        <h3 className="text-lg font-serif text-[#C5A059] mt-0.5 mb-3 font-semibold">{school.title}</h3>
                        
                        <div className="p-3 bg-[#0A0D0B] rounded border border-white/5 mb-3">
                          <p className="text-[11px] text-[#C5A059]/80 font-bold mb-1">الحكم الفقهي:</p>
                          <p className="text-sm leading-relaxed text-[#E0D8D0]/90 font-light">{data.ruling}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/5">
                        <p className="text-[11px] text-[#C5A059]/80 font-bold mb-1">الدليل الشرعي والتعليل:</p>
                        <p className="text-xs leading-relaxed text-[#E0D8D0]/70 italic">{data.evidence}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scriptural Evidence Card & Preferred consensus view */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" id="fiqh-meta-analysis">
                
                {/* Scriptural Evidence Card */}
                <div className="p-6 rounded-lg bg-[#0F1411] border border-[#C5A059]/20 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-[#C5A059]"></div>
                    <span className="text-xs font-bold tracking-wider text-[#C5A059]">الأدلة الشرعية المدققة</span>
                  </div>

                  <div className="space-y-4">
                    {activeFiqhIssue.evidenceTexts.map((ev, i) => (
                      <div key={i} className="pb-3 border-b border-white/5 last:border-b-0">
                        <p className="text-base italic leading-relaxed text-[#D4AF37] text-right font-medium">
                          " {ev.text} "
                        </p>
                        <p className="text-[10px] text-[#E0D8D0]/50 text-left mt-1">{ev.source}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ultimate Scholarly Consensus Summary */}
                <div className="p-6 rounded-lg bg-[#151B17] border border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-[#C5A059]" />
                      <p className="text-xs font-bold text-[#C5A059]">ترجيح ومقصد الحكم الشرعي (مستفاد من إسلام AI)</p>
                    </div>
                    <p className="text-sm leading-relaxed text-[#E0D8D0]/95 font-serif py-1">
                      {activeFiqhIssue.preferredOpinion}
                    </p>
                  </div>
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mt-4 pt-3 border-t border-white/5">
                    <span className="text-[10px] text-[#D4AF37]/70 font-semibold">
                      ⚠️ تنبيه: هذه الخلاصة لتعلم الآراء الفقهية، ويرجع في الفتاوى الطارئة لعالم ثقة.
                    </span>
                    <button
                      onClick={() => {
                        setActiveUnit(IslamicUnit.CHAT);
                        setChatInput(`ابحث لي بتفصيل مفرّع عن: ${activeFiqhIssue.question}`);
                      }}
                      className="px-4 py-1.5 text-[10px] font-bold border border-[#C5A059] text-[#C5A059] rounded hover:bg-[#C5A059]/10 transition-colors shrink-0 cursor-pointer"
                    >
                      مباحثة المسألة في الشات
                    </button>
                  </div>
                </div>
              </div>
              {/* ترجمة وقراءة صوتية للفتوى الفقهية */}
              {customFiqhResponse && (
                <IslamicResponseUtility
                  sourceLabel="فتوى فقهية مقارنة"
                  text={customFiqhResponse}
                />
              )}
              {!customFiqhResponse && (() => {
                const issue = fiqhIssues.find(f => f.id === selectedFiqhIssueId);
                return issue ? (
                  <IslamicResponseUtility
                    sourceLabel="مسألة فقهية"
                    text={`${issue.question}\nالحنفي: ${issue.hanamOpinions.hanafi.ruling} | المالكي: ${issue.hanamOpinions.maliki.ruling} | الشافعي: ${issue.hanamOpinions.shafi.ruling} | الحنبلي: ${issue.hanamOpinions.hanbali.ruling}`}
                  />
                ) : null;
              })()}
            </div>
          )}

          {/* =======================================================
               UNIT 4: INHERITANCE SOLVER (الفرائض والمواريث)
             ======================================================= */}
          {activeUnit === IslamicUnit.INHERITANCE && (
            <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto transition-opacity duration-300" id="unit-inheritance-screen">
              <div className="flex flex-col gap-1.5" id="inheritance-banner">
                <span className="text-[10px] text-[#C5A059] font-bold tracking-widest uppercase">[وحدة ٤ — علم الفرائض والمواريث]</span>
                <h2 className="text-3xl font-serif text-[#C5A059]">الحاسبة الشرعية المتقدمة لتقسيم التركات</h2>
                <p className="text-xs opacity-70">أدخل مستحقين التركة وقيمة التركة النقدية، وستقوم خوارزمية الفرائض بتطبيق نصوص المواريث الموحدة وحالات العول والرد بالتفاوض الشرعي الدقيق.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="inheritance-split-workspace">
                
                {/* Inputs Pane */}
                <div className="lg:col-span-1 p-6 rounded-xl bg-[#0F1411] border border-[#C5A059]/20 flex flex-col gap-5">
                  <h3 className="text-lg font-serif text-[#C5A059] font-bold pb-2 border-b border-white/5">أصحاب الفروض والعائلات</h3>

                  {/* Estate Value */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#E0D8D0]/90 font-bold">قيمة التركة الإجمالية (بالعملة المحلية):</label>
                    <input
                      type="number"
                      value={estateValue}
                      id="input-estate-value"
                      onChange={(e) => setEstateValue(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-[#151B17] border border-[#C5A059]/30 rounded px-3 py-2 text-sm text-[#C5A059] focus:outline-none focus:border-[#C5A059] font-bold font-mono"
                    />
                  </div>

                  {/* Husband / Wife Row */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      id="btn-toggle-husband"
                      onClick={() => setHasHusband(!hasHusband)}
                      className={`p-2.5 rounded text-xs border font-bold transition-all ${
                        hasHusband
                          ? "bg-[#C5A059]/20 border-[#C5A059] text-[#C5A059]"
                          : "bg-[#121814]/40 border-white/5 text-[#E0D8D0]/70"
                      }`}
                    >
                      ماتت عن (زوج)
                    </button>
                    <button
                      id="btn-toggle-wife"
                      onClick={() => setHasWife(!hasWife)}
                      className={`p-2.5 rounded text-xs border font-bold transition-all ${
                        hasWife
                          ? "bg-[#C5A059]/20 border-[#C5A059] text-[#C5A059]"
                          : "bg-[#121814]/40 border-white/5 text-[#E0D8D0]/70"
                      }`}
                    >
                      مات عن (زوجة)
                    </button>
                  </div>

                  {/* Father / Mother States */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      id="btn-toggle-father"
                      onClick={() => setHasFather(!hasFather)}
                      className={`p-2.5 rounded text-xs border font-bold transition-all ${
                        hasFather
                          ? "bg-[#C5A059]/20 border-[#C5A059] text-[#C5A059]"
                          : "bg-[#121814]/40 border-white/5 text-[#E0D8D0]/70"
                      }`}
                    >
                      وجود الأب
                    </button>
                    <button
                      id="btn-toggle-mother"
                      onClick={() => setHasMother(!hasMother)}
                      className={`p-2.5 rounded text-xs border font-bold transition-all ${
                        hasMother
                          ? "bg-[#C5A059]/20 border-[#C5A059] text-[#C5A059]"
                          : "bg-[#121814]/40 border-white/5 text-[#E0D8D0]/70"
                      }`}
                    >
                      وجود الأم
                    </button>
                  </div>

                  {/* Descendants (Sons / Daughters) Counter */}
                  <div className="space-y-4 pt-2 border-t border-white/5 text-right">
                    
                    {/* Sons */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold block text-[#E0D8D0]">عدد الأبناء (الذكور):</span>
                        <span className="text-[9px] opacity-50 block">يرثون بالتعصيب</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSonsCount(Math.max(0, sonsCount - 1))}
                          className="w-8 h-8 rounded bg-[#121814] border border-white/5 text-[#E0D8D0] flex items-center justify-center font-bold font-mono"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-mono text-sm text-[#C5A059] font-bold">{sonsCount}</span>
                        <button
                          onClick={() => setSonsCount(sonsCount + 1)}
                          className="w-8 h-8 rounded bg-[#121814] border border-white/5 text-[#E0D8D0] flex items-center justify-center font-bold font-mono"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Daughters */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold block text-[#E0D8D0]">عدد البنات (الإناث):</span>
                        <span className="text-[9px] opacity-50 block">صاحبات فرض أو تعصيب</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDaughtersCount(Math.max(0, daughtersCount - 1))}
                          className="w-8 h-8 rounded bg-[#121814] border border-white/5 text-[#E0D8D0] flex items-center justify-center font-bold font-mono"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-mono text-sm text-[#C5A059] font-bold">{daughtersCount}</span>
                        <button
                          onClick={() => setDaughtersCount(daughtersCount + 1)}
                          className="w-8 h-8 rounded bg-[#121814] border border-white/5 text-[#E0D8D0] flex items-center justify-center font-bold font-mono"
                        >
                          +
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Collateral (Brothers & Sisters) if Father is dead */}
                  <div className="space-y-4 pt-4 border-t border-white/10 text-right">
                    <p className="text-xs text-[#C5A059]/80 font-bold">الحواشي والإخوة الأشقاء:</p>
                    
                    {/* Full Brothers */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold block text-[#E0D8D0]">عدد الإخوة الأشقاء:</span>
                        <span className="text-[9px] opacity-50 block">يحجبهم الأب أو الابن</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setFullBrothersCount(Math.max(0, fullBrothersCount - 1))}
                          className="w-8 h-8 rounded bg-[#121814] border border-white/5 text-[#E0D8D0] flex items-center justify-center font-bold font-mono"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-mono text-sm text-[#C5A059] font-bold">{fullBrothersCount}</span>
                        <button
                          onClick={() => setFullBrothersCount(fullBrothersCount + 1)}
                          className="w-8 h-8 rounded bg-[#121814] border border-white/5 text-[#E0D8D0] flex items-center justify-center font-bold font-mono"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Full Sisters */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold block text-[#E0D8D0]">عدد الأخوات الشقيقات:</span>
                        <span className="text-[9px] opacity-50 block">صاحبات فرض أو عصبة</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setFullSistersCount(Math.max(0, fullSistersCount - 1))}
                          className="w-8 h-8 rounded bg-[#121814] border border-white/5 text-[#E0D8D0] flex items-center justify-center font-bold font-mono"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-mono text-sm text-[#C5A059] font-bold">{fullSistersCount}</span>
                        <button
                          onClick={() => setFullSistersCount(fullSistersCount + 1)}
                          className="w-8 h-8 rounded bg-[#121814] border border-white/5 text-[#E0D8D0] flex items-center justify-center font-bold font-mono"
                        >
                          +
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Outputs & Calculations result pane */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div className="p-6 rounded-xl bg-[#121814] border border-[#C5A059]/15 shadow-2xl flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                        <div className="flex items-center gap-2">
                          <Calculator className="w-5 h-5 text-[#C5A059]" />
                          <h3 className="text-lg font-serif text-[#C5A059] font-bold">جدول التوزيع وتصفية مستحقات التركة</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {inheritanceResult?.hasCawl && (
                            <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 text-[9px] px-2 py-0.5 rounded font-bold animate-pulse">
                              حدث عول (تزاحم)
                            </span>
                          )}
                          {inheritanceResult?.hasRadd && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded font-bold">
                              حدث رد (فائض)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Share Results Table */}
                      <div className="space-y-3" id="inheritance-table">
                        {inheritanceResult?.shares.length === 0 ? (
                          <p className="text-xs opacity-50 py-10 text-center">لا يوجد ورثة مستحقون حالياً لمطابقتهم. يرجى اختيار الورثة من اليسار.</p>
                        ) : (
                          inheritanceResult?.shares.map((share, idx) => (
                            <div
                              key={idx}
                              className={`p-3 md:p-4 rounded border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                                share.isBlocked
                                  ? "bg-[#0A0D0B]/40 border-white/5 opacity-55"
                                  : "bg-[#151B17] border-[#C5A059]/10"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-8 rounded ${share.isBlocked ? "bg-red-500/40" : "bg-[#C5A059]"}`}></div>
                                <div>
                                  <h4 className="text-sm font-bold text-[#E0D8D0]">{share.relationship}</h4>
                                  <p className="text-[10px] text-[#C5A059]/90 font-light leading-relaxed mt-0.5">{share.basis}</p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-2.5 md:pt-0 border-white/5 text-left font-mono">
                                <div>
                                  <span className="text-[9px] opacity-40 block">الكسر المفروض</span>
                                  <span className="text-xs font-bold text-[#C5A059] block">{share.fractionText}</span>
                                </div>
                                <div className="text-left">
                                  <span className="text-[9px] opacity-40 block">النسبة المئوية</span>
                                  <span className="text-xs font-bold text-[#E0D8D0] block">{share.percentage.toFixed(2)} %</span>
                                </div>
                                <div className="text-left bg-[#0F1411] px-3 py-1 rounded border border-[#C5A059]/20">
                                  <span className="text-[9px] text-[#C5A059]/80 block">المبلغ النصيبي</span>
                                  <span className="text-sm font-bold text-[#C5A059] block">
                                    {share.amount.toLocaleString("ar-SA", { maximumFractionDigits: 1 })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Operational audit log for educational use */}
                    {inheritanceResult && inheritanceResult.explanationSteps.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-white/5 bg-[#0F1411] p-4 rounded-lg">
                        <span className="text-[10px] text-[#C5A059] font-bold block uppercase mb-2">تأصيل خطوات الفرز والحساب الشرعي:</span>
                        <div className="space-y-1.5" id="inheritance-steps-log">
                          {inheritanceResult.explanationSteps.map((step, i) => (
                            <p key={i} className="text-xs text-[#E0D8D0]/80 leading-relaxed font-light">
                              {i + 1}. {step}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Quranic Root Reference */}
              <div className="p-4 bg-[#151B17] border border-[#C5A059]/15 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-xs opacity-75 font-serif leading-relaxed md:max-w-xl text-right">
                  <strong>الركن الشرعي:</strong> تقوم الحاسبة بحل الكسريات طبقاً للتوجيه الإلهي الوارد في سورة النساء الآيات ١١-١٢ لتقسيم المواريث المباشرة، وحكم الشقيق عن الكلالة في الآية ١٧٦ من نفس السورة.
                </p>
                <div className="text-left font-serif shrink-0">
                  <p className="text-[#D4AF37] italic">"يُوصِيكُمُ اللَّهُ فِي أَوْلادِكُمْ لِلذَّكَرِ مِثْلُ حَظِّ الأُنثَيَيْنِ..."</p>
                  <p className="text-[10px] opacity-55 text-left">[سورة النساء، الآية ١١]</p>
                </div>
              </div>
              {/* ترجمة وقراءة صوتية لنتيجة المواريث */}
              {inheritanceResult && (
                <IslamicResponseUtility
                  sourceLabel="حساب الميراث الشرعي"
                  text={`نتيجة توزيع التركة (${estateValue.toLocaleString()} دج):\n${inheritanceResult.shares.map(s => `${s.heir}: ${s.amount.toLocaleString()} دج (${s.fraction})`).join('\n')}\n${inheritanceResult.explanationSteps.join('\n')}`}
                />
              )}
            </div>
          )}

          {/* =======================================================
               UNIT 1: TAJWEED MASTER CLASSES (معلم التجويد)
             ======================================================= */}
          {activeUnit === IslamicUnit.TAJWEED && (
            <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto transition-opacity duration-300" id="unit-tajweed-screen">
              <div className="flex flex-col gap-1.5" id="tajweed-banner">
                <span className="text-[10px] text-[#C5A059] font-bold tracking-widest uppercase">[وحدة ١ — معلم التجويد التفاعلي]</span>
                <h2 className="text-3xl font-serif text-[#C5A059]">المعلم الصوتي وأحكام التلاوة والترتيل</h2>
                <p className="text-xs opacity-70">تعلم مخارج الساكن والمستحق ومستويات النون والميم المدودة، مع تدريب تفاعلي للقياس الصوتي الصحيح واختبار فوري للتقدم.</p>
              </div>

              {/* Mode toggles */}
              <div className="flex flex-wrap gap-3 items-center justify-between bg-[#0F1411] border border-[#C5A059]/15 rounded-xl p-4">
                <div className="flex gap-2">
                  {[
                    { id: TajweedLevel.BEGINNER, label: "المستوى ١ — مبتدئ" },
                    { id: TajweedLevel.INTERMEDIATE, label: "المستوى ٢ — متوسط" },
                    { id: TajweedLevel.ADVANCED, label: "المستوى ٣ — متقدم" }
                  ].map((level) => (
                    <button
                      key={level.id}
                      onClick={() => {
                        setSelectedTajweedLevel(level.id);
                        const firstForLevel = tajweedLessons.find(l => l.level === level.id);
                        if (firstForLevel) {
                          setSelectedLessonId(firstForLevel.id);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                        selectedTajweedLevel === level.id
                          ? "bg-[#C5A059] text-[#0A0D0B]"
                          : "bg-[#121814] text-[#E0D8D0]/80 hover:bg-white/5"
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>

                <button
                  id="btn-quiz-toggle"
                  onClick={() => {
                    if (quizStarted) {
                      setQuizStarted(false);
                    } else {
                      handleResetQuiz();
                    }
                  }}
                  className={`px-4 py-1.5 text-xs font-extrabold rounded flex items-center gap-2 border transition-colors cursor-pointer ${
                    quizStarted
                      ? "bg-red-500/10 border-red-500/30 text-red-400"
                      : "bg-[#C5A059]/10 border-[#C5A059]/30 text-[#C5A059] hover:bg-[#C5A059]/20"
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  {quizStarted ? "إغلاق الاختبار" : "ابدأ التقييم الفوري"}
                </button>
              </div>

              {/* Standard Lessons Mode */}
              {!quizStarted ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="tajweed-lessons-workspace">
                  
                  {/* Left Lessons Directory */}
                  <div className="lg:col-span-1 flex flex-col gap-3">
                    <p className="text-[10px] text-[#C5A059] uppercase tracking-wider font-extrabold block">الدروس المتاحة لهذا المستوى:</p>
                    {filteredTajweedLessons.length === 0 ? (
                      <p className="text-xs opacity-50 py-5">لا توجد دروس حالية مضافة لهذا المستوى.</p>
                    ) : (
                      filteredTajweedLessons.map((les) => (
                        <button
                          key={les.id}
                          id={`btn-tajweed-lesson-${les.id}`}
                          onClick={() => setSelectedLessonId(les.id)}
                          className={`w-full text-right p-4 rounded-lg border transition-all duration-300 ${
                            selectedLessonId === les.id
                              ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059]"
                              : "bg-[#121814]/80 border-white/5 text-[#E0D8D0]/85 hover:border-[#C5A059]/20"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] bg-[#C5A059]/15 text-[#C5A059] px-2 py-0.5 rounded font-extrabold uppercase scale-95 origin-right">
                              {les.category === "noon_sakinah" ? "النون الساكنة" : les.category === "qalqalah" ? "القلقلة" : "المدود"}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold block">{les.rule}</h4>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Right Big Detail Screen */}
                  <div className="lg:col-span-2 p-6 md:p-8 rounded-xl bg-[#0F1411] border border-[#C5A059]/15 flex flex-col gap-6" id="tajweed-lesson-viewer">
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-5 bg-[#C5A059]"></div>
                        <h3 className="text-2xl font-serif text-[#C5A059] font-bold">{activeTajweedLesson.rule}</h3>
                      </div>
                      <span className="text-xs text-[#E0D8D0]/60 italic font-mono">[{activeTajweedLesson.verseReference}]</span>
                    </div>

                    <div className="space-y-4 font-light">
                      {/* Explanation */}
                      <div>
                        <span className="text-xs text-[#C5A059] font-bold block mb-1">الشرح النظري:</span>
                        <p className="text-sm leading-relaxed text-[#E0D8D0]">{activeTajweedLesson.explanation}</p>
                      </div>

                      {/* Conditions */}
                      {activeTajweedLesson.conditions && (
                        <div>
                          <span className="text-xs text-[#C5A059] font-bold block mb-1">الشروط والضوابط:</span>
                          <p className="text-xs leading-relaxed text-[#E0D8D0]/80 italic">{activeTajweedLesson.conditions}</p>
                        </div>
                      )}

                      {/* Vocal Pronunciation description */}
                      <div className="p-4 bg-[#151B17] rounded-lg border border-[#C5A059]/10">
                        <span className="text-xs text-[#C5A059] font-bold block mb-1">🔊 طريقة وميكانيكية النطق:</span>
                        <p className="text-xs leading-relaxed text-[#E0D8D0]/95 font-serif font-medium">{activeTajweedLesson.arabicPronunciation}</p>
                      </div>

                      {/* Main Quranic Example */}
                      <div className="p-5 bg-[#0A0D0B] rounded-lg border border-[#C5A059]/20 text-center flex flex-col gap-2 mt-2">
                        <span className="text-[10px] text-[#C5A059] font-extrabold tracking-widest block uppercase">الآية الشاهدة في التنزيل الحكيم:</span>
                        <p className="text-2xl italic text-[#D4AF37] leading-relaxed py-1 font-serif font-black">
                          " {activeTajweedLesson.verseText} "
                        </p>
                        <span className="text-xs opacity-40 font-mono">[{activeTajweedLesson.verseReference}]</span>
                      </div>

                      {/* Other Examples */}
                      <div>
                        <span className="text-xs text-[#C5A059] font-bold block mb-2">أمثلة قرآنية مرافقة:</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {activeTajweedLesson.otherExamples.map((ex, i) => (
                            <div key={i} className="p-3 bg-[#121814] rounded border border-white/5 text-right flex flex-col justify-between">
                              <p className="text-sm font-semibold text-[#D4AF37] leading-relaxed">" {ex.text} "</p>
                              <p className="text-[9px] opacity-40 text-left mt-1.5 font-mono">[{ex.reference}]</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Practice Exercise */}
                      <div className="pt-4 border-t border-white/5">
                        <span className="text-xs text-[#C5A059] font-bold block mb-1.5">🎯 تمرين تدريبي عملي:</span>
                        <p className="text-xs leading-relaxed text-[#E0D8D0]/90 font-light">{activeTajweedLesson.practiceExercise}</p>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* IN_QUIZ MODE */
                <div className="max-w-3xl mx-auto w-full p-6 md:p-8 rounded-xl bg-[#0F1411] border border-[#C5A059]/20 shadow-2xl flex flex-col gap-6" id="tajweed-quiz-box">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-[#C5A059]" />
                      <span className="text-sm font-bold text-[#C5A059]">التقييم التجويدي الفوري</span>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-xs opacity-50 ml-3">درجتك التراكمية:</span>
                      <span className="text-base text-[#D4AF37] font-black">{quizScore} نقطة</span>
                    </div>
                  </div>

                  {/* Quiz Core Question Card */}
                  <div className="space-y-4">
                    <p className="text-xs text-[#C5A059] font-extrabold">السؤال {currentQuizIndex + 1} من {tajweedQuizQuestions.length}</p>
                    <h3 className="text-lg md:text-xl font-serif text-[#E0D8D0] font-bold leading-relaxed shadow-sm">
                      {tajweedQuizQuestions[currentQuizIndex].text}
                    </h3>

                    {/* Options list */}
                    <div className="space-y-2.5 pt-3">
                      {tajweedQuizQuestions[currentQuizIndex].options.map((option, idx) => {
                        let btnStyle = "bg-[#121814] border-white/5 hover:border-[#C5A059]/30 text-[#E0D8D0]";
                        if (selectedOption === idx) {
                          btnStyle = "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059]";
                        }
                        if (quizSubmitted) {
                          if (idx === tajweedQuizQuestions[currentQuizIndex].correctAnswerIndex) {
                            btnStyle = "bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold";
                          } else if (selectedOption === idx) {
                            btnStyle = "bg-red-500/15 border-red-500 text-red-300";
                          } else {
                            btnStyle = "bg-[#121814]/40 border-white/5 text-[#E0D8D0]/40";
                          }
                        }

                        return (
                          <button
                            key={idx}
                            id={`btn-quiz-option-${idx}`}
                            onClick={() => handleSelectOption(idx)}
                            className={`w-full text-right p-4 rounded-lg border transition-all duration-300 flex items-center justify-between ${btnStyle}`}
                          >
                            <span className="text-sm">{option}</span>
                            <span className="text-[10px] font-mono opacity-40">Option {idx + 1}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Feedback explanations */}
                    {quizSubmitted && (
                      <div className="p-4 rounded bg-[#151B17] border border-[#C5A059]/10 text-right mt-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle className="w-3.5 h-3.5 text-[#C5A059]" />
                          <span className="text-xs text-[#C5A059] font-bold">التبيان والتفسير الشرعي:</span>
                        </div>
                        <p className="text-xs text-[#E0D8D0]/90 leading-relaxed font-light">
                          {tajweedQuizQuestions[currentQuizIndex].explanation}
                        </p>
                      </div>
                    )}

                    {/* Action button bar */}
                    <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-6">
                      <button
                        onClick={handleResetQuiz}
                        className="text-xs text-[#C5A059] hover:underline hover:text-[#C5A059]/80 cursor-pointer"
                      >
                        إعادة الاختبار من البداية
                      </button>

                      {!quizSubmitted ? (
                        <button
                          onClick={handleSubmitQuizAnswer}
                          disabled={selectedOption === null}
                          className="bg-[#C5A059] text-[#0A0D0B] font-bold text-xs hover:bg-[#C5A059]/90 transition-colors px-4 py-2 rounded disabled:opacity-40 cursor-pointer"
                        >
                          تأكيد الإجابة
                        </button>
                      ) : (
                        <button
                          onClick={handleNextQuizQuestion}
                          className="bg-white/10 hover:bg-white/15 text-[#E0D8D0] font-bold text-xs transition-colors px-4 py-2 rounded flex items-center gap-1 cursor-pointer"
                        >
                          <span>السؤال التالي</span>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* ترجمة وقراءة صوتية لدرس التجويد */}
              {selectedLessonId && (() => {
                const lesson = tajweedLessons.find(l => l.id === selectedLessonId);
                return lesson ? (
                  <IslamicResponseUtility
                    sourceLabel="درس التجويد"
                    text={`قاعدة ${lesson.rule}: ${lesson.explanation}\nالتطبيق: ${lesson.practiceExercise}`}
                  />
                ) : null;
              })()}
            </div>
          )}

          {/* =======================================================
               UNIT 2: SIRA CHRONOLOGY (السيرة النبوية والمغازي)
             ======================================================= */}
          {activeUnit === IslamicUnit.SIRA && (
            <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto transition-opacity duration-300" id="unit-sira-screen">
              <div className="flex flex-col gap-1.5" id="sira-banner">
                <span className="text-[10px] text-[#C5A059] font-bold tracking-widest uppercase">[وحدة ٢ — السيرة النبوية الشريفة والبعث]</span>
                <h2 className="text-3xl font-serif text-[#C5A059]">خط الزمن الشامل لأطوار السيرة والفتوحات الكبرى</h2>
                <p className="text-xs opacity-70">طالع الأحداث التاريخية والمحطات الفارقة في سير الحبيب المصطفى ﷺ منذ مولده المبارك وخلفيات التشريع والجهاد المأثور.</p>
              </div>

              {/* Find/Filter Timeline search bar */}
              <div className="p-4 bg-[#0F1411] border border-[#C5A059]/15 rounded-xl flex items-center gap-3">
                <Search className="w-4 h-4 text-[#C5A059] shrink-0" />
                <input
                  type="text"
                  id="sira-search-field"
                  placeholder="ابحث عن واقعة تاريخية أو غزوة أو مدينة معينة في سيرة الرسول..."
                  value={siraSearch}
                  onChange={(e) => setSiraSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm focus:outline-none text-[#E0D8D0] placeholder-white/30"
                />
                {siraSearch && (
                  <button
                    onClick={() => setSiraSearch("")}
                    className="text-xs text-[#C5A059]/80 hover:underline cursor-pointer"
                  >
                    تصفية البحث
                  </button>
                )}
              </div>

              {/* Grid representation */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="sira-layout-grid">
                
                {/* Timeline directory - Left column */}
                <div className="lg:col-span-1 p-5 rounded-xl bg-[#121814] border border-white/5 flex flex-col gap-3 max-h-[580px] overflow-y-auto">
                  <span className="text-[10px] text-[#C5A059] font-bold block uppercase mb-1">المحطات التاريخية المرتبة:</span>
                  {filteredSiraEvents.length === 0 ? (
                    <p className="text-xs opacity-50 py-10 text-center">لا توجد محطات مطابقة للبحث حالياً.</p>
                  ) : (
                    filteredSiraEvents.map((ev) => (
                      <button
                        key={ev.id}
                        id={`btn-sira-event-${ev.id}`}
                        onClick={() => setSelectedSiraEventId(ev.id)}
                        className={`text-right p-4 rounded-lg border transition-all duration-300 flex items-center justify-between gap-3 ${
                          selectedSiraEventId === ev.id
                            ? "bg-[#C5A059]/15 border-[#C5A059] text-[#C5A059] shadow-inner"
                            : "bg-[#0A0D0B]/80 border-white/5 text-[#E0D8D0]/80 hover:border-[#C5A059]/25"
                        }`}
                      >
                        <div className="truncate flex-1">
                          <span className="text-[9px] text-[#C5A059] block font-mono font-bold mb-0.5">{ev.yearHijri} - {ev.yearMiladi}</span>
                          <h4 className="text-sm font-bold truncate">{ev.title}</h4>
                        </div>
                        <span className="text-xs opacity-40 font-mono text-left shrink-0 block">➔</span>
                      </button>
                    ))
                  )}
                </div>

                {/* Big Details View - Right Columns */}
                {(() => {
                  const activeEvent = sirahEvents.find((e) => e.id === selectedSiraEventId) || sirahEvents[0];
                  return (
                    <div className="lg:col-span-2 p-6 md:p-8 rounded-xl bg-[#0F1411] border border-[#C5A059]/15 flex flex-col gap-6" id="sira-details">
                      
                      {/* Meta layout */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <History className="w-5 h-5 text-[#C5A059]" />
                          <h3 className="text-xl font-serif text-[#C5A059] font-bold">{activeEvent.title}</h3>
                        </div>
                        <span className="bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30 text-xs px-2.5 py-1 rounded font-mono font-bold block shrink-0 text-center">
                          {activeEvent.yearHijri} / {activeEvent.yearMiladi}
                        </span>
                      </div>

                      {/* Detail facts */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#121814]/40 p-4 rounded border border-white/5">
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-4 h-4 text-[#C5A059] shrink-0" />
                          <div>
                            <span className="text-[9px] text-[#C5A059] block font-bold leading-none">موقع الحدث:</span>
                            <span className="text-xs text-[#E0D8D0]">{activeEvent.location}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <User className="w-4 h-4 text-[#C5A059] shrink-0" />
                          <div>
                            <span className="text-[9px] text-[#C5A059] block font-bold leading-none">أبرز الشخصيات:</span>
                            <span className="text-xs text-[#E0D8D0] line-clamp-1">{activeEvent.figures.join("، ")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Deep narrative */}
                      <div>
                        <span className="text-xs text-[#C5A059] font-bold block mb-1">الرواية ومستند الحدث التاريخي:</span>
                        <div className="p-4 md:p-5 bg-[#0A0D0B] rounded-lg border border-white/5 max-h-[220px] overflow-y-auto">
                          <p className="text-sm font-serif leading-relaxed text-[#E0D8D0]/90 font-light text-justify">
                            {activeEvent.narrative}
                          </p>
                        </div>
                        <span className="text-[9px] opacity-40 text-left block mt-1.5 font-sans">
                          المصدر: {activeEvent.source}
                        </span>
                      </div>

                      {/* Lessons learned Box */}
                      <div className="p-5 rounded-lg bg-[#151B17] border border-[#C5A059]/20 font-serif">
                        <p className="text-xs text-[#C5A059] font-bold mb-1.5 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          الدرس التربوي والترقية النفسية والاجتماعية المستفادة:
                        </p>
                        <p className="text-sm italic leading-relaxed text-[#D4AF37]/90 font-medium">
                          " {activeEvent.lessons} "
                        </p>
                      </div>

                      {/* Interactive button to test */}
                      <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                        <button
                          onClick={() => {
                            setActiveUnit(IslamicUnit.CHAT);
                            setChatInput(`حدثني بالتفصيل الشافي والمحطات الكاملة عن: ${activeEvent.title}`);
                          }}
                          className="px-4 py-2 text-xs font-bold border border-[#C5A059] text-[#C5A059] rounded hover:bg-[#C5A059]/10 transition-colors cursor-pointer"
                        >
                          تحضير مراجعة كاملة في الشات
                        </button>
                      </div>

                    </div>
                  );
                })()}

              </div>
              {/* ترجمة وقراءة صوتية للحدث المحدد */}
              {(() => {
                const activeEvent = sirahEvents.find(e => e.id === selectedSiraEventId);
                return activeEvent ? (
                  <IslamicResponseUtility
                    sourceLabel="حدث سيرة نبوية"
                    text={`${activeEvent.title} (${activeEvent.yearMiladi})\n${activeEvent.narrative}\nالدروس والعبر: ${activeEvent.lessons}`}
                  />
                ) : null;
              })()}
            </div>
          )}

          {/* =======================================================
               UNIT 5: DREAMS ONEIROMANCY (تفسير الأحلام - ابن سيرين)
             ======================================================= */}
          {activeUnit === IslamicUnit.DREAMS && (
            <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto transition-opacity duration-300" id="unit-dreams-screen">
              <div className="flex flex-col gap-1.5" id="dreams-banner">
                <span className="text-[10px] text-[#C5A059] font-bold tracking-widest uppercase">[وحدة ٥ — علم تعبير الأحلام]</span>
                <h2 className="text-3xl font-serif text-[#C5A059]">مُعبّر الرؤى الاسترشادي المعتمد على ابن سيرين</h2>
                <p className="text-xs opacity-70">استكشف دلالات التمر والماء والمفاتيح عند كبار السلف الصالح، أو أدخل حلمك الشخصي لتعبيره عبر الذكاء الاصطناعي بنمط منضبط تأويلي.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dreams-split-view">
                
                {/* Traditional Symbol dictionary - Left Pane */}
                <div className="lg:col-span-1 p-5 rounded-xl bg-[#0F1411] border border-[#C5A059]/20 flex flex-col gap-4">
                  <h3 className="text-base font-serif text-[#C5A059] font-bold pb-1.5 border-b border-white/5">رموز شهيرة مأثورة في المنام:</h3>
                  
                  <div className="space-y-2">
                    {dreamSymbols.map((item) => (
                      <button
                        key={item.id}
                        id={`btn-dream-symbol-${item.id}`}
                        onClick={() => {
                          setSelectedSymbolId(item.id);
                          setDreamInterpretation(null);
                        }}
                        className={`w-full text-right p-4 rounded-lg border transition-all duration-300 flex items-center justify-between font-bold ${
                          selectedSymbolId === item.id && !dreamInterpretation
                            ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059]"
                            : "bg-[#121814] border-white/5 text-[#E0D8D0]/85 hover:border-[#C5A059]/20"
                        }`}
                      >
                        <span className="text-xs">{item.symbol}</span>
                        <span className="text-[10px] font-mono opacity-30">دليل</span>
                      </button>
                    ))}
                  </div>

                  {/* Predefined selected item details */}
                  {!dreamInterpretation && (
                    <div className="p-4 rounded-lg bg-[#151B17] border border-[#C5A059]/10 mt-3">
                      <span className="text-[10px] text-[#C5A059] font-bold block mb-1">دلالة: {activeDreamSymbol.symbol}</span>
                      <div className="space-y-1.5 text-xs text-[#E0D8D0]/90">
                        {activeDreamSymbol.meanings.map((m, i) => (
                          <p key={i} className="leading-relaxed font-light">• {m}</p>
                        ))}
                      </div>
                      <p className="text-[10.5px] italic text-[#E0D8D0]/75 leading-relaxed font-serif mt-3 pt-2.5 border-t border-white/5">
                        {activeDreamSymbol.contexts}
                      </p>
                    </div>
                  )}
                </div>

                {/* Simulated AI interpreter & Consultation - Right Pane */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div className="p-6 rounded-xl bg-[#121814] border border-[#C5A059]/15 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-serif text-[#C5A059] font-bold pb-2 border-b border-white/5 mb-4 flex items-center gap-2">
                        <Compass className="w-5 h-5 text-[#C5A059]" />
                        محرك التفسير التفاعلي للأحلام والرؤيا الصادقة
                      </h3>

                      {/* Inputs panel */}
                      <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#E0D8D0]/90">صف منامك بالتفصيل (مثل: رأيت أني أصعد سلماً طويلاً وفي يدي تمر):</label>
                          <textarea
                            value={customDreamText}
                            onChange={(e) => setCustomDreamText(e.target.value)}
                            rows={3}
                            id="textarea-dream-description"
                            placeholder="اكتب تفاصيل الرؤيا التي زارتك..."
                            className="bg-[#151B17] border border-[#C5A059]/35 rounded px-4 py-3 text-xs text-[#E0D8D0] placeholder-white/30 focus:outline-none focus:border-[#C5A059] leading-relaxed resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[#E0D8D0]/90">الحالة الاجتماعية والروحية للرائي:</label>
                            <input
                              type="text"
                              value={dreamUserState}
                              id="input-dream-user-state"
                              onChange={(e) => setDreamUserState(e.target.value)}
                              placeholder="مثال: متزوج، مهموم بالعمل، متدين"
                              className="bg-[#151B17] border border-[#C5A059]/35 rounded px-4 py-2.5 text-xs text-[#E0D8D0] focus:outline-none focus:border-[#C5A059]"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-[#E0D8D0]/90">وربط برمز مأثور:</span>
                            <select
                              value={selectedSymbolId}
                              id="select-dream-symbol"
                              onChange={(e) => setSelectedSymbolId(e.target.value)}
                              className="bg-[#151B17] border border-[#C5A059]/35 rounded px-3 py-2.5 text-xs text-[#C5A059] focus:outline-none focus:border-[#C5A059] font-bold"
                            >
                              {dreamSymbols.map((item) => (
                                <option key={item.id} value={item.id} className="bg-[#0D110E] text-[#E0D8D0]">
                                  {item.symbol}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <button
                          onClick={handleRequestDreamInterpret}
                          disabled={dreamLoading || !customDreamText.trim()}
                          className="w-full bg-[#C5A059] text-[#0A0D0B] font-bold text-xs hover:bg-[#C5A059]/90 disabled:opacity-40 transition-colors py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
                        >
                          {dreamLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                              <span>يستأنس بكتاب ابن سيرين ويحلل الرموز...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>تعبير تفصيلي للرؤيا الآن</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Display Interpretation details */}
                      {dreamInterpretation && (
                        <div className="mt-5 p-5 bg-[#0F1411] rounded-lg border border-[#C5A059]/20 relative">
                          <span className="text-[10px] text-[#C5A059] font-bold block mb-1">البيان التعبيري المستخرج:</span>
                          <div className="text-xs text-[#E0D8D0] whitespace-pre-wrap leading-relaxed font-serif font-light text-justify">
                            {dreamInterpretation}
                          </div>
                        </div>
                      )}

                    </div>

                    <div className="pt-4 mt-6 border-t border-white/5 text-[10px] text-[#D4AF37]/80 leading-normal flex items-start gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                      <span>
                        توجيه نبوي: لقوله ﷺ: "إذا رأى أحدكم ما يحب فلا يحدث به إلا من يحب، وإذا رأى ما يكره فليتعوذ بالله من شرها" [البخاري ٧٠٤٥]. تفسير الأحلام استرشادي غيبي تفاؤلي خالص.
                      </span>
                    </div>

                    {dreamInterpretation && (
                      <IslamicResponseUtility
                        sourceLabel="تفسير الرؤيا"
                        text={dreamInterpretation}
                      />
                    )}

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* =======================================================
               UNIT 7: SMART QURAN TUTOR & WHISPER (حافظ القرآن الذكي)
             ======================================================= */}
          {activeUnit === IslamicUnit.QURAN_MEMORIZATION && (
            <SmartQuranTutor onSendMessage={handleSendChatMessage} />
          )}

          {/* =======================================================
               UNIT 8: HADITH SCIENCES (علم الحديث النبوي والمصطلح)
             ======================================================= */}
          {activeUnit === IslamicUnit.HADITH_SCIENCES && (
            <HadithSciences onSendMessage={handleSendChatMessage} />
          )}

          {/* =======================================================
               UNIT 9: AQIDAH & THEOLOGY (علم العقيدة والتوحيد)
             ======================================================= */}
          {activeUnit === IslamicUnit.AQIDAH && (
            <IslamicAqidah onSendMessage={handleSendChatMessage} />
          )}

          {/* =======================================================
               UNIT 10: DUA & AZKAR (الأذكار والأدعية والأوراد)
             ======================================================= */}
          {activeUnit === IslamicUnit.DUA_AZKAR && (
            <DuaAzkar onSendMessage={handleSendChatMessage} />
          )}

          {/* =======================================================
               UNIT 11: HISTORIC SIRA COMPREHENSIVE (تاريخ الخلافة والعهود)
             ======================================================= */}
          {activeUnit === IslamicUnit.SIRA_COMPREHENSIVE && (
            <SiraComprehensive onSendMessage={handleSendChatMessage} />
          )}

          {/* =======================================================
               UNIT 12: ARABIC GRAMMAR & PARSING (اللغة العربية وإعراب القرآن)
             ======================================================= */}
          {activeUnit === IslamicUnit.ARABIC_GRAMMAR && (
            <ArabicGrammar onSendMessage={handleSendChatMessage} />
          )}

          {/* =======================================================
               UNIT 13: MEMORY HUB & SELF LEARNING (الذاكرة والتعلم الذاتي)
             ======================================================= */}
          {activeUnit === IslamicUnit.MEMORY_HUB && (
            <MemoryHub />
          )}

        </main>
      </div>

      {/* FOOTER STAUS BAR */}
      <GlobalQuranBar />
      <footer className="bg-[#080A09] border-t border-[#C5A059]/15 py-4 px-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-3 text-[10.5px] opacity-75 uppercase text-[#E0D8D0]/85 pb-28 md:pb-24" id="nour-footer">
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 font-mono">
          <span>القرآن العظيم</span>
          <span>صحيح البخاري</span>
          <span>صحيح مسلم</span>
          <span>المذاهب الأربعة</span>
          <span>تعبير الأحلام لابن سيرين</span>
        </div>
        <div className="flex items-center gap-2 font-serif">
          <span className="text-[#C5A059] font-semibold text-xs text-center md:text-left block leading-relaxed">
            والله أعلم — وصلى الله على نبينا محمد وعلى آله وصحبه أجمعين
          </span>
        </div>
      </footer>

    </div>
  );
}
