import React, { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Languages, Sparkles, Loader2, HelpCircle, AlertCircle, Check } from "lucide-react";

interface IslamicResponseUtilityProps {
  text: string;
  className?: string;
  sourceLabel?: string; // e.g. "فتوى فقهية"
}

const SUPPORTED_LANGUAGES = [
  { code: "French", name: "الفرنسية (Français)" },
  { code: "English", name: "الإنجليزية (English)" },
  { code: "Turkish", name: "التركية (Türkçe)" },
  { code: "Persian", name: "الفارسية (فارسي)" },
  { code: "Urdu", name: "الأردية (اردو)" },
  { code: "Spanish", name: "الإسبانية (Español)" }
];

export const IslamicResponseUtility: React.FC<IslamicResponseUtilityProps> = ({
  text,
  className = "",
  sourceLabel = "الإجابة العلمية"
}) => {
  const [targetLang, setTargetLang] = useState("French");
  const [translatedText, setTranslatedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTranslate, setShowTranslate] = useState(false);
  
  // Speech states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop reading if component unmounts
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleTranslate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang })
      });
      if (!response.ok) {
        throw new Error("حدث خطأ في الاتصال بخادم الترجمة الإلكتروني.");
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setTranslatedText(data.translatedText);
      setShowTranslate(true);
    } catch (err: any) {
      console.error(err);
      setError("تعذر التمكين الفوري للترجمة. يرجى مراجعة إعدادات المفاتيح.");
    } finally {
      setLoading(false);
    }
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleSpeak = () => {
    if (!window.speechSynthesis) {
      alert("عذراً، متصفحك الحالي لا يدعم تفاعل القراءة الصوتية (Speech Synthesis).");
      return;
    }

    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    // Determine the text to read (translated text if showing translation, otherwise original Arabic)
    const textToRead = showTranslate && translatedText ? translatedText : text;

    // Standard cleanup of markdown symbols to read cleanly
    const cleanedText = textToRead
      .replace(/[\#\*\_`\>]/g, " ")
      .trim();

    // Create Utterance
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utteranceRef.current = utterance;

    // Auto voice language detection
    if (showTranslate && translatedText) {
      switch (targetLang) {
        case "French": utterance.lang = "fr-FR"; break;
        case "English": utterance.lang = "en-US"; break;
        case "Turkish": utterance.lang = "tr-TR"; break;
        case "Persian": utterance.lang = "fa-IR"; break;
        case "Urdu": utterance.lang = "ur-PK"; break;
        case "Spanish": utterance.lang = "es-ES"; break;
        default: utterance.lang = "en-US";
      }
    } else {
      utterance.lang = "ar-SA"; // default Arabic
    }

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (e) => {
      console.error("SpeechSynthesis error:", e);
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={`mt-3 pt-3 border-t border-white/5 flex flex-col gap-3 text-right bg-[#101511] p-3 rounded-lg border border-[#C5A059]/10 ${className}`} id="islamic-utility-widget">
      
      {/* Utility Action control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Play control */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSpeak}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-bold transition-all text-[11px] cursor-pointer ${
              isSpeaking
                ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                : "bg-[#1C251F] hover:bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/25"
            }`}
            title="انقر للاستماع إلى القارئ الآلي"
            id="btn-speak-utility"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>إيقاف القراءة الصوتية</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>قراءة صوتية (تلاوة آلية {showTranslate && translatedText ? "مترجمة" : "بالعربية"})</span>
              </>
            )}
          </button>
        </div>

        {/* Translation selects */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] opacity-65 text-[#C5A059] flex items-center gap-1">
            <Languages className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>ترجمة فورية للمحتوى:</span>
          </span>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="bg-[#0A0D0B] border border-[#C5A059]/30 rounded px-2 py-1 text-[11px] text-[#C5A059] font-bold outline-none cursor-pointer"
            id="select-target-lang"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-[#0A0D0B] text-[#E0D8D0]">
                {lang.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleTranslate}
            disabled={loading}
            className="px-2.5 py-1 bg-[#C5A059] hover:bg-[#C5A059]/90 text-[#0A0D0B] rounded text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-[#C5A059]/10"
            id="btn-translate-action"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin text-[#0A0D0B]" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            <span>ترجم الآن</span>
          </button>

          {showTranslate && (
            <button
              onClick={() => setShowTranslate(!showTranslate)}
              className="px-2 py-1 border border-white/10 hover:border-[#C5A059]/30 text-[#E0D8D0]/80 rounded text-[10px] transition-all"
            >
              {showTranslate ? "إخفاء لوحة الترجمة" : "إظهار لوحة الترجمة"}
            </button>
          )}
        </div>
      </div>

      {/* Translated text Panel container */}
      {showTranslate && translatedText && (
        <div className="bg-[#0B0F0C] border border-emerald-500/25 p-4 rounded-lg mt-1 text-right relative animate-fade-in" id="translation-result-box">
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-2.5 text-[10px] text-emerald-400 font-bold">
            <div className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>تمت الترجمة بنظام التوثيق الأكاديمي لـ إسلام AI</span>
            </div>
            <span>Target: {SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || targetLang}</span>
          </div>
          <div className="text-xs text-[#E0D8D0]/90 font-sans leading-relaxed whitespace-pre-wrap select-all text-left font-light break-words" dir="ltr">
            {translatedText}
          </div>
        </div>
      )}

      {error && (
        <div className="text-[10px] text-rose-400 font-semibold p-2 bg-rose-950/20 rounded border border-rose-500/20 flex items-center gap-1.5 mt-1">
          <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
