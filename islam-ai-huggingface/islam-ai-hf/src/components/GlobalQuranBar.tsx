/**
 * GlobalQuranBar — Barre de récitation Coran complète disponible dans tous les onglets
 * Auteur : KHEDIM BENYAKHLEF dit BENY-JOE
 */

import React, { useState, useRef } from "react";
import { Volume2, VolumeX, ChevronDown, ChevronUp, Music2, Languages, Loader2, CheckCircle } from "lucide-react";

// Les 114 sourates
const SURAHS = [
  {n:1,ar:"الفاتحة",v:7},{n:2,ar:"البقرة",v:286},{n:3,ar:"آل عمران",v:200},
  {n:4,ar:"النساء",v:176},{n:5,ar:"المائدة",v:120},{n:6,ar:"الأنعام",v:165},
  {n:7,ar:"الأعراف",v:206},{n:8,ar:"الأنفال",v:75},{n:9,ar:"التوبة",v:129},
  {n:10,ar:"يونس",v:109},{n:11,ar:"هود",v:123},{n:12,ar:"يوسف",v:111},
  {n:13,ar:"الرعد",v:43},{n:14,ar:"إبراهيم",v:52},{n:15,ar:"الحجر",v:99},
  {n:16,ar:"النحل",v:128},{n:17,ar:"الإسراء",v:111},{n:18,ar:"الكهف",v:110},
  {n:19,ar:"مريم",v:98},{n:20,ar:"طه",v:135},{n:21,ar:"الأنبياء",v:112},
  {n:22,ar:"الحج",v:78},{n:23,ar:"المؤمنون",v:118},{n:24,ar:"النور",v:64},
  {n:25,ar:"الفرقان",v:77},{n:26,ar:"الشعراء",v:227},{n:27,ar:"النمل",v:93},
  {n:28,ar:"القصص",v:88},{n:29,ar:"العنكبوت",v:69},{n:30,ar:"الروم",v:60},
  {n:31,ar:"لقمان",v:34},{n:32,ar:"السجدة",v:30},{n:33,ar:"الأحزاب",v:73},
  {n:34,ar:"سبأ",v:54},{n:35,ar:"فاطر",v:45},{n:36,ar:"يس",v:83},
  {n:37,ar:"الصافات",v:182},{n:38,ar:"ص",v:88},{n:39,ar:"الزمر",v:75},
  {n:40,ar:"غافر",v:85},{n:41,ar:"فصلت",v:54},{n:42,ar:"الشورى",v:53},
  {n:43,ar:"الزخرف",v:89},{n:44,ar:"الدخان",v:59},{n:45,ar:"الجاثية",v:37},
  {n:46,ar:"الأحقاف",v:35},{n:47,ar:"محمد",v:38},{n:48,ar:"الفتح",v:29},
  {n:49,ar:"الحجرات",v:18},{n:50,ar:"ق",v:45},{n:51,ar:"الذاريات",v:60},
  {n:52,ar:"الطور",v:49},{n:53,ar:"النجم",v:62},{n:54,ar:"القمر",v:55},
  {n:55,ar:"الرحمن",v:78},{n:56,ar:"الواقعة",v:96},{n:57,ar:"الحديد",v:29},
  {n:58,ar:"المجادلة",v:22},{n:59,ar:"الحشر",v:24},{n:60,ar:"الممتحنة",v:13},
  {n:61,ar:"الصف",v:14},{n:62,ar:"الجمعة",v:11},{n:63,ar:"المنافقون",v:11},
  {n:64,ar:"التغابن",v:18},{n:65,ar:"الطلاق",v:12},{n:66,ar:"التحريم",v:12},
  {n:67,ar:"الملك",v:30},{n:68,ar:"القلم",v:52},{n:69,ar:"الحاقة",v:52},
  {n:70,ar:"المعارج",v:44},{n:71,ar:"نوح",v:28},{n:72,ar:"الجن",v:28},
  {n:73,ar:"المزمل",v:20},{n:74,ar:"المدثر",v:56},{n:75,ar:"القيامة",v:40},
  {n:76,ar:"الإنسان",v:31},{n:77,ar:"المرسلات",v:50},{n:78,ar:"النبأ",v:40},
  {n:79,ar:"النازعات",v:46},{n:80,ar:"عبس",v:42},{n:81,ar:"التكوير",v:29},
  {n:82,ar:"الانفطار",v:19},{n:83,ar:"المطففين",v:36},{n:84,ar:"الانشقاق",v:25},
  {n:85,ar:"البروج",v:22},{n:86,ar:"الطارق",v:17},{n:87,ar:"الأعلى",v:19},
  {n:88,ar:"الغاشية",v:26},{n:89,ar:"الفجر",v:30},{n:90,ar:"البلد",v:20},
  {n:91,ar:"الشمس",v:15},{n:92,ar:"الليل",v:21},{n:93,ar:"الضحى",v:11},
  {n:94,ar:"الشرح",v:8},{n:95,ar:"التين",v:8},{n:96,ar:"العلق",v:19},
  {n:97,ar:"القدر",v:5},{n:98,ar:"البينة",v:8},{n:99,ar:"الزلزلة",v:8},
  {n:100,ar:"العاديات",v:11},{n:101,ar:"القارعة",v:11},{n:102,ar:"التكاثر",v:8},
  {n:103,ar:"العصر",v:3},{n:104,ar:"الهمزة",v:9},{n:105,ar:"الفيل",v:5},
  {n:106,ar:"قريش",v:4},{n:107,ar:"الماعون",v:7},{n:108,ar:"الكوثر",v:3},
  {n:109,ar:"الكافرون",v:6},{n:110,ar:"النصر",v:3},{n:111,ar:"المسد",v:5},
  {n:112,ar:"الإخلاص",v:4},{n:113,ar:"الفلق",v:5},{n:114,ar:"الناس",v:6},
];

const RECITERS = [
  { id: "ar.alafasy",       name: "مشاري العفاسي",      base: "https://server8.mp3quran.net/afs" },
  { id: "ar.husary",        name: "محمود خليل الحصري",   base: "https://server13.mp3quran.net/lhusr" },
  { id: "ar.hudhaify",      name: "علي الحذيفي",         base: "https://server9.mp3quran.net/hudhaify" },
  { id: "ar.minshawi",      name: "محمد صديق المنشاوي",  base: "https://server11.mp3quran.net/minsh" },
  { id: "ar.saoodshuraym",  name: "سعود الشريم",          base: "https://server7.mp3quran.net/shur" },
];

const TRANSLATION_LANGS = [
  { code: "fr", label: "🇫🇷 Français",  apiCode: "fr.hamidullah" },
  { code: "en", label: "🇬🇧 English",   apiCode: "en.sahih" },
  { code: "es", label: "🇪🇸 Español",   apiCode: "es.asad" },
  { code: "tr", label: "🇹🇷 Türkçe",   apiCode: "tr.diyanet" },
  { code: "ur", label: "🇵🇰 اردو",      apiCode: "ur.jalandhry" },
  { code: "de", label: "🇩🇪 Deutsch",   apiCode: "de.bubenheim" },
  { code: "id", label: "🇮🇩 Indonesia", apiCode: "id.indonesian" },
];

export const GlobalQuranBar: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [selectedReciter, setSelectedReciter] = useState("ar.alafasy");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Translation section
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationLang, setTranslationLang] = useState("fr");
  const [translationText, setTranslationText] = useState("");
  const [transLoading, setTransLoading] = useState(false);
  const [transError, setTransError] = useState("");
  const [transVerseNum, setTransVerseNum] = useState(1);

  const surah = SURAHS.find(s => s.n === selectedSurah)!;
  const reciter = RECITERS.find(r => r.id === selectedReciter)!;
  const audioSrc = `${reciter.base}/${String(selectedSurah).padStart(3, "0")}.mp3`;

  const handlePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSurahChange = (n: number) => {
    setSelectedSurah(n);
    setIsPlaying(false);
    setTranslationText("");
    setTransVerseNum(1);
  };

  const fetchTranslation = async () => {
    setTransLoading(true);
    setTransError("");
    setTranslationText("");
    const langObj = TRANSLATION_LANGS.find(l => l.code === translationLang)!;
    try {
      const res = await fetch(
        `https://api.alquran.cloud/v1/ayah/${selectedSurah}:${transVerseNum}/${langObj.apiCode}`
      );
      const data = await res.json();
      if (data.status === "OK") {
        setTranslationText(data.data.text);
        setShowTranslation(true);
      } else {
        setTransError("تعذر جلب الترجمة. حاول مرة أخرى.");
      }
    } catch {
      setTransError("خطأ في الاتصال بخادم الترجمة.");
    } finally {
      setTransLoading(false);
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#070A08] border-t border-[#C5A059]/30 shadow-2xl shadow-black/60"
      dir="rtl"
      id="global-quran-bar"
    >
      {/* ===== BARRE PRINCIPALE ===== */}
      <div className="flex items-center justify-between px-4 py-2 gap-3">
        
        {/* Logo + Label */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 bg-[#C5A059]/10 rounded-full border border-[#C5A059]/20">
            <Music2 className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold text-[#C5A059] leading-none">تلاوة القرآن الكريم</p>
            <p className="text-[9px] text-white/40 leading-none mt-0.5">بث مباشر — MP3Quran HD</p>
          </div>
        </div>

        {/* Selector sourate */}
        <select
          value={selectedSurah}
          onChange={e => handleSurahChange(Number(e.target.value))}
          className="bg-[#111612] border border-[#C5A059]/20 text-[#E0D8D0] text-xs px-2 py-1 rounded-md outline-none focus:border-[#C5A059]/50 flex-1 max-w-[140px] cursor-pointer"
        >
          {SURAHS.map(s => (
            <option key={s.n} value={s.n} className="bg-[#0A0D0B]">
              {s.n}. سورة {s.ar} ({s.v} آية)
            </option>
          ))}
        </select>

        {/* Selector récitateur */}
        <select
          value={selectedReciter}
          onChange={e => { setSelectedReciter(e.target.value); setIsPlaying(false); }}
          className="bg-[#111612] border border-[#C5A059]/20 text-[#E0D8D0] text-xs px-2 py-1 rounded-md outline-none focus:border-[#C5A059]/50 flex-1 max-w-[150px] cursor-pointer hidden sm:block"
        >
          {RECITERS.map(r => (
            <option key={r.id} value={r.id} className="bg-[#0A0D0B]">{r.name}</option>
          ))}
        </select>

        {/* Bouton Play/Pause */}
        <button
          onClick={handlePlay}
          className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
            isPlaying
              ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse"
              : "bg-[#C5A059]/15 text-[#C5A059] border-[#C5A059]/30 hover:bg-[#C5A059]/25"
          }`}
        >
          {isPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isPlaying ? "إيقاف" : "استمع"}</span>
        </button>

        {/* Toggle Traduction & Expand */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-md bg-[#1C251F] border border-white/10 text-white/60 hover:text-[#C5A059] transition-colors cursor-pointer"
            title="توسيع / طي شريط القرآن"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Audio element caché */}
        <audio
          ref={audioRef}
          src={audioSrc}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          className="hidden"
        />
      </div>

      {/* ===== SECTION ÉTENDUE : player + traduction ===== */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-white/5 pt-3 animate-in">

          {/* Player audio natif HTML5 */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] text-[#C5A059]/80 font-bold">
              🎧 سورة {surah.ar} — {reciter.name}
              <span className="text-white/30 mr-2 text-[9px]">{surah.v} آية</span>
            </p>
            <audio
              src={audioSrc}
              controls
              className="w-full h-8 rounded bg-[#101411] border border-white/5"
              style={{ filter: "sepia(60%) saturate(150%) hue-rotate(-15deg)" }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
          </div>

          {/* Section traduction */}
          <div className="flex flex-col gap-3 p-3 bg-[#0F1411] rounded-xl border border-[#C5A059]/10">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-[#C5A059]" />
              <span className="text-xs font-bold text-[#C5A059]">ترجمة الآية حسب اختيارك</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* رقم الآية */}
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] text-white/50">الآية:</label>
                <input
                  type="number"
                  min={1}
                  max={surah.v}
                  value={transVerseNum}
                  onChange={e => setTransVerseNum(Math.min(surah.v, Math.max(1, Number(e.target.value))))}
                  className="bg-[#121814] border border-white/10 rounded px-2 py-1 text-xs text-[#E0D8D0] outline-none focus:border-[#C5A059] w-16"
                />
              </div>

              {/* Choix de langue */}
              <select
                value={translationLang}
                onChange={e => { setTranslationLang(e.target.value); setTranslationText(""); }}
                className="bg-[#121814] border border-white/10 rounded px-2 py-1 text-xs text-[#E0D8D0] outline-none focus:border-[#C5A059] cursor-pointer"
              >
                {TRANSLATION_LANGS.map(l => (
                  <option key={l.code} value={l.code} className="bg-[#0A0D0B]">{l.label}</option>
                ))}
              </select>

              {/* Bouton traduire */}
              <button
                onClick={fetchTranslation}
                disabled={transLoading}
                className="px-3 py-1.5 bg-[#C5A059] hover:bg-[#C5A059]/90 text-[#0A0D0B] text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-60 transition-all"
              >
                {transLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                <span>ترجم الآية</span>
              </button>
            </div>

            {/* Résultat traduction */}
            {transError && (
              <p className="text-xs text-red-400 bg-red-900/10 border border-red-900/20 rounded p-2">{transError}</p>
            )}
            {showTranslation && translationText && (
              <div className="p-3 bg-[#121814] border border-[#C5A059]/20 rounded-lg text-right">
                <p className="text-[10px] text-[#C5A059]/70 mb-1 font-bold">
                  {TRANSLATION_LANGS.find(l => l.code === translationLang)?.label} — سورة {surah.ar} الآية {transVerseNum}:
                </p>
                <p className="text-xs text-[#E0D8D0] leading-relaxed">{translationText}</p>
              </div>
            )}
          </div>

          {/* Mobile reciter selector */}
          <div className="sm:hidden">
            <label className="text-[10px] text-white/50 block mb-1">القارئ:</label>
            <select
              value={selectedReciter}
              onChange={e => { setSelectedReciter(e.target.value); setIsPlaying(false); }}
              className="bg-[#111612] border border-[#C5A059]/20 text-[#E0D8D0] text-xs px-2 py-1 rounded-md outline-none w-full cursor-pointer"
            >
              {RECITERS.map(r => (
                <option key={r.id} value={r.id} className="bg-[#0A0D0B]">{r.name}</option>
              ))}
            </select>
          </div>

        </div>
      )}
    </div>
  );
};

// ===== Composant bouton installation PWA intégré dans l'app =====
export const PWAInstallButton: React.FC = () => {
  const [show, setShow] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [showIOSGuide, setShowIOSGuide] = React.useState(false);
  const deferredPromptRef = React.useRef<any>(null);

  React.useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone;
    setIsIOS(ios);

    if (standalone || localStorage.getItem('pwa-installed')) {
      setShow(false);
      return;
    }

    if (ios) {
      setShow(true);
    } else {
      const handler = (e: any) => {
        e.preventDefault();
        deferredPromptRef.current = e;
        setShow(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  if (!show) return null;

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(v => !v);
      return;
    }
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;
      deferredPromptRef.current = null;
      if (outcome === 'accepted') {
        setShow(false);
        localStorage.setItem('pwa-installed', '1');
      }
    }
  };

  return (
    <div className="fixed top-3 left-3 z-50 flex flex-col items-start gap-2" dir="rtl">
      <button
        onClick={handleInstall}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#C5A059] text-[#0A0D0B] text-xs font-bold shadow-lg shadow-black/40 hover:bg-[#C5A059]/90 transition-all cursor-pointer border border-[#C5A059]/50 animate-pulse"
        title="ثبّت التطبيق على هاتفك"
      >
        <span className="text-base">📲</span>
        <span>{isIOS ? 'أضف لشاشتك الرئيسية' : 'ثبّت التطبيق'}</span>
      </button>

      {showIOSGuide && (
        <div className="bg-[#111814] border border-[#C5A059]/40 rounded-xl p-3 text-[11px] text-[#E0D8D0]/90 leading-relaxed max-w-[220px] shadow-xl shadow-black/50">
          <p className="font-bold text-[#C5A059] mb-2">📱 طريقة التثبيت على iPhone/iPad:</p>
          <p>١ — اضغط زر <strong className="text-[#C5A059]">المشاركة ⬆️</strong> في أسفل Safari</p>
          <p>٢ — اختر <strong className="text-[#C5A059]">"إضافة للشاشة الرئيسية 🏠"</strong></p>
          <p>٣ — اضغط <strong className="text-[#C5A059]">إضافة ✅</strong></p>
          <button
            onClick={() => setShowIOSGuide(false)}
            className="mt-2 text-[10px] text-white/40 hover:text-white/70 cursor-pointer"
          >
            ✕ إغلاق
          </button>
        </div>
      )}
    </div>
  );
};
