import React, { useState } from "react";
import { BookOpen, Compass, Award, Search, HelpCircle, Sparkles, AlertCircle } from "lucide-react";
import { hadithSciencesLessons, ahadithDatabase, HadithDetailed } from "../data/islamai_v2_data";
import { IslamicResponseUtility } from "./IslamicResponseUtility";

interface HadithSciencesProps {
  onSendMessage: (text: string) => void;
}

export const HadithSciences: React.FC<HadithSciencesProps> = ({ onSendMessage }) => {
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
  const [selectedHadithIndex, setSelectedHadithIndex] = useState(0);
  const [hadithSearch, setHadithSearch] = useState("");
  const [quizQuestionIdx, setQuizQuestionIdx] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Predefined interactive hadith terminology quiz
  const termQuizQuestions = [
    {
      id: "q1",
      question: "ما هو الشرط الذي يميز الحديث الصحيح عن الحديث الحسن في علم مصطلح الحديث؟",
      options: [
        "العدالة التامة للرواة",
        "تمام الضبط والاتصال التام (الحسن خفيف الضبط)",
        "عدم وجود شذوذ أو علة قادحة",
        "علو السند وعدد الرجال المارّين به"
      ],
      correctAnswerIndex: 1,
      explanation: "الحديث الحسن يتفق مع الصحيح في اتصال السند وعدالة الرواة وخلوه من الشذوذ والعلة، ولكنه يختلف عنه في كون رواته أخف ضبطاً (أي حفظهم وذاكرتهم ليست في الدرجة القصوى كرجال الصحيح)."
    },
    {
      id: "q2",
      question: "ما تعريف 'السند' في دراسات وعلوم الحديث النبوي الشريف؟",
      options: [
        "نص الحديث المأثور المنقول عن صحابي",
        "المحدث العظيم الباحث في الرجال",
        "سلسلة الرجال والرواة الموصلة للمتن",
        "الباب الذي أخرج فيه الإمام البخاري موضوع المسألة"
      ],
      correctAnswerIndex: 2,
      explanation: "السند هو الطريق الموصلة إلى المتن، وهو سلسلة الرجال الذين رووا الحديث كابراً عن كابر حتى يبلغوا المتن."
    },
    {
      id: "q3",
      question: "ما هو العلم المختص بنقد الرواة والرجال إثباتاً وتضعيفاً؟",
      options: [
        "علم الوقف والابتداء",
        "علم الجرح والتعديل",
        "علم غريب الحديث",
        "علم الناسخ والمنسوخ"
      ],
      correctAnswerIndex: 1,
      explanation: "علم الجرح والتعديل يبحث في قبول رواية الراوي أو ردها بنفي أو إثبات صفات الضبط والعدالة والأمانة والحفظ."
    }
  ];

  const filteredAhadith = ahadithDatabase.filter((hadith) =>
    hadith.text.includes(hadithSearch) ||
    hadith.explanation.includes(hadithSearch) ||
    hadith.source.includes(hadithSearch)
  );

  const activeHadith = filteredAhadith[selectedHadithIndex] || ahadithDatabase[0];

  const handleSelectQuizOption = (optIdx: number) => {
    if (quizSubmitted) return;
    setSelectedQuizOption(optIdx);
  };

  const handleHadithQuizSubmit = () => {
    if (selectedQuizOption === null || quizSubmitted) return;
    setQuizSubmitted(true);
    if (selectedQuizOption === termQuizQuestions[quizQuestionIdx].correctAnswerIndex) {
      setQuizScore(prev => prev + 10);
    }
  };

  const handleHadithQuizNext = () => {
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
    if (quizQuestionIdx < termQuizQuestions.length - 1) {
      setQuizQuestionIdx(prev => prev + 1);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleResetHadithQuiz = () => {
    setQuizScore(0);
    setQuizQuestionIdx(0);
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
    setQuizCompleted(false);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto" id="unit-hadith-sciences">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-[#C5A059] font-bold tracking-widest uppercase">[وحدة ٨ — علم الحديث الشريف والمصطلح دقيق الصواب]</span>
        <h2 className="text-3xl font-serif text-[#C5A059]">تخريج الحديث ودرس الأسانيد النبوية المتواترة</h2>
        <p className="text-xs opacity-75">تبحّر في علم الدراية والرواية، واكتشف أحوال الرجال والجرح والتعديل وسرد أصول المتون من الجوامع المصنفة.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Terminology Lessons Desk (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-[#0F1411] border border-[#C5A059]/15 rounded-xl p-5 flex flex-col gap-3">
            <h3 className="text-sm font-serif text-[#C5A059] font-bold pb-2 border-b border-white/5 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#C5A059]" />
              مدونات دراية مصطلح الحديث
            </h3>
            <div className="space-y-2">
              {hadithSciencesLessons.map((les, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedLessonIndex(idx)}
                  className={`w-full text-right p-3 rounded border transition-all text-xs ${
                    selectedLessonIndex === idx
                      ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059]"
                      : "bg-[#121814] border-white/5 text-[#E0D8D0]/80 hover:border-white/10"
                  }`}
                >
                  <p className="font-bold">{les.title}</p>
                </button>
              ))}
            </div>

            <div className="p-3 bg-[#0A0D0B] rounded border border-white/5 text-[11px] leading-relaxed font-light">
              <p className="text-[#C5A059] font-bold mb-1">بيان الدرس المختار:</p>
              <p className="opacity-80 whitespace-pre-wrap">{hadithSciencesLessons[selectedLessonIndex]?.content}</p>
            </div>
          </div>

          {/* Interactive Terminology Evaluator */}
          <div className="bg-[#0F1411] border border-[#C5A059]/15 rounded-xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-serif text-[#C5A059] font-bold pb-2 border-b border-white/5 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#C5A059]" />
              تقييم علوم الحديث الفوري
            </h3>

            {!quizCompleted ? (
              <div className="space-y-3">
                <span className="text-[10px] text-[#C5A059] font-bold block">السؤال {quizQuestionIdx + 1} من {termQuizQuestions.length}</span>
                <p className="text-xs font-bold leading-normal text-[#E0D8D0]">{termQuizQuestions[quizQuestionIdx].question}</p>

                <div className="space-y-2 pt-1">
                  {termQuizQuestions[quizQuestionIdx].options.map((opt, i) => {
                    let style = "bg-[#121814] border-white/5 text-[#E0D8D0]";
                    if (selectedQuizOption === i) {
                      style = "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059]";
                    }
                    if (quizSubmitted) {
                      if (i === termQuizQuestions[quizQuestionIdx].correctAnswerIndex) {
                        style = "bg-emerald-500/10 border-emerald-500 text-emerald-300 font-bold";
                      } else if (selectedQuizOption === i) {
                        style = "bg-red-500/10 border-red-500 text-red-300";
                      } else {
                        style = "bg-[#121814]/30 border-white/5 text-[#E0D8D0]/40";
                      }
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectQuizOption(i)}
                        className={`w-full text-right p-2.5 rounded border text-[11px] transition-all ${style}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {quizSubmitted && (
                  <p className="text-[10px] text-[#E0D8D0]/70 p-2.5 bg-[#0A0D0B] rounded border border-white/5 leading-relaxed font-light mt-2">
                    {termQuizQuestions[quizQuestionIdx].explanation}
                  </p>
                )}

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[11px] font-mono text-[#C5A059]">{quizScore} نقطة</span>
                  {!quizSubmitted ? (
                    <button
                      onClick={handleHadithQuizSubmit}
                      disabled={selectedQuizOption === null}
                      className="px-3 py-1 bg-[#C5A059] text-[#0A0D0B] font-bold text-[10px] rounded hover:opacity-90 disabled:opacity-30 cursor-pointer"
                    >
                      تأكيد
                    </button>
                  ) : (
                    <button
                      onClick={handleHadithQuizNext}
                      className="px-3 py-1 bg-white/10 text-white font-bold text-[10px] rounded hover:bg-white/15 cursor-pointer"
                    >
                      التالي
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs text-emerald-400 font-bold">🎉 تهانينا! أكملت اختبار مصطلحات الحديث</p>
                <p className="text-sm">النتيجة الكلية: <span className="text-[#C5A059] font-black">{quizScore} نقطة</span></p>
                <button
                  onClick={handleResetHadithQuiz}
                  className="px-4 py-1.5 bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] text-[10px] rounded font-bold hover:bg-[#C5A059]/20 cursor-pointer"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Big Hadith Explorer View (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* Quick Search bar */}
          <div className="p-4 bg-[#0F1411] border border-[#C5A059]/15 rounded-xl flex items-center gap-3">
            <Search className="w-4 h-4 text-[#C5A059]" />
            <input
              type="text"
              value={hadithSearch}
              onChange={(e) => {
                setHadithSearch(e.target.value);
                setSelectedHadithIndex(0);
              }}
              placeholder="ابحث عن حديث أو درجة (صحفي، نية، نصيحة، رد)..."
              className="flex-1 bg-transparent text-xs text-[#E0D8D0] placeholder-white/30 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {filteredAhadith.map((hadith, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedHadithIndex(idx)}
                className={`text-right p-3 rounded-lg border transition-all ${
                  selectedHadithIndex === idx
                    ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059]"
                    : "bg-[#121814] border-white/5 text-[#E0D8D0]/80 h-24 hover:border-[#C5A059]/30 flex flex-col justify-between"
                }`}
              >
                <p className="text-xs font-serif font-bold line-clamp-2">" {hadith.text} "</p>
                <p className="text-[9px] opacity-40 truncate text-left w-full mt-2">{hadith.source.split("،")[0]}</p>
              </button>
            ))}
          </div>

          {/* Active hadith details */}
          {activeHadith && (
            <div className="p-6 md:p-8 rounded-xl bg-[#121814] border border-[#C5A059]/20 flex flex-col gap-5 shadow-2xl">
              
              {/* Header block */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div>
                  <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                    درجة الحديث: {activeHadith.grade}
                  </span>
                  <span className="text-[10px] text-[#E0D8D0]/50 mr-2">المخّرج: {activeHadith.source}</span>
                </div>
                <span className="text-[10px] text-[#C5A059] font-mono leading-none font-bold">سند متصل صحيح</span>
              </div>

              {/* Text in displayed calligraphy spacing */}
              <div className="bg-[#0A0D0B] p-5 rounded-lg border border-[#C5A059]/10 text-center">
                <p className="text-xl md:text-2xl leading-loose font-serif font-bold text-[#D4AF37] tracking-normal select-all">
                  " {activeHadith.text} "
                </p>
              </div>

              {/* Classification details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-normal">
                
                <div className="p-4 rounded bg-[#0F1411] border border-white/5">
                  <span className="text-[10px] text-[#C5A059] font-bold block mb-1">إسناد الحديث وسلسلة الرواية:</span>
                  <p className="opacity-85 font-light leading-relaxed">{activeHadith.isnad}</p>
                </div>

                <div className="p-4 rounded bg-[#0F1411] border border-white/5">
                  <span className="text-[10px] text-[#C5A059] font-bold block mb-1">الشرح الفقهي واللوجستي للمتن:</span>
                  <p className="opacity-85 font-light leading-relaxed">{activeHadith.explanation}</p>
                </div>

              </div>

              {/* Optional values */}
              {activeHadith.cause && (
                <div className="p-4 rounded-lg bg-[#151B17] border border-[#C5A059]/15">
                  <span className="text-[10px] text-[#C5A059] font-bold block mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    سبب ورود الحديث والمحاسبة التاريخية:
                  </span>
                  <p className="text-xs leading-relaxed opacity-85 font-light">{activeHadith.cause}</p>
                </div>
              )}

              {/* Interaction button block */}
              <div className="flex justify-between items-center pt-3 border-t border-white/5 text-right">
                <span className="text-[10.5px] italic text-[#D4AF37]/80">
                  ملاحظة المصلحين: يعتمد التخريج على مرويات الشافعية والحدث الصادق لجمهور أهل السنة والحديث.
                </span>

                <button
                  onClick={() => {
                    onSendMessage(`خّرج لي هذا الحديث بالتفصيل وافحص إسناده: ${activeHadith.text}`);
                  }}
                  className="px-4 py-2 text-xs font-bold border border-[#C5A059] text-[#C5A059] rounded hover:bg-[#C5A059]/10 transition-colors cursor-pointer"
                >
                  تخريج تفصيلي ممتد في الشات
                </button>
              </div>

              {/* Translation & Voice recitation panel */}
              <IslamicResponseUtility
                sourceLabel="الحديث الشريف وعلم الدراية"
                text={`درجة الحديث: ${activeHadith.grade}\nالحديث: "${activeHadith.text}"\nمّخرج الحديث: ${activeHadith.source}\nالإسناد والسلسلة: ${activeHadith.isnad}\nالشرح والبيان العلمي: ${activeHadith.explanation}${activeHadith.cause ? `\n\nسبب الورود والمناسبة: ${activeHadith.cause}` : ""}`}
              />

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
