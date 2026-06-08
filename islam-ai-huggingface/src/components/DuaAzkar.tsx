import React, { useState } from "react";
import { Sparkles, Sun, Moon, Shield, Bookmark, Plus, RefreshCw, Volume2 } from "lucide-react";
import { azkarDatabase, AzkarItem } from "../data/islamai_v2_data";
import { IslamicResponseUtility } from "./IslamicResponseUtility";

interface DuaAzkarProps {
  onSendMessage: (text: string) => void;
}

export const DuaAzkar: React.FC<DuaAzkarProps> = ({ onSendMessage }) => {
  const [activeCategory, setActiveCategory] = useState<"morning" | "evening" | "post_prayer" | "quranic" | "all">("morning");
  const [selectedDuaIdx, setSelectedDuaIdx] = useState(0);
  // Track clicking state for each Azkar item dynamically
  const [userCounts, setUserCounts] = useState<{ [key: string]: number }>({});

  const filteredAzkar = azkarDatabase.filter((item) => {
    if (activeCategory === "all") return true;
    return item.category === activeCategory;
  });

  const handleIncrement = (item: AzkarItem) => {
    const current = userCounts[item.id] !== undefined ? userCounts[item.id] : item.count;
    if (current > 0) {
      setUserCounts((prev) => ({
        ...prev,
        [item.id]: current - 1
      }));
    }
  };

  const handleResetCount = (item: AzkarItem) => {
    setUserCounts((prev) => ({
      ...prev,
      [item.id]: item.count
    }));
  };

  const handleResetAllCounts = () => {
    setUserCounts({});
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto" id="unit-azkar-dua">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-[#C5A059] font-bold tracking-widest uppercase">[وحدة ١٠ — الأذكار والأدعية والأوراد النبوية]</span>
        <h2 className="text-3xl font-serif text-[#C5A059]">حصن المسلم التفاعلي والذكر المتواصل وسر الائتلاف</h2>
        <p className="text-xs opacity-75">حافظ على أوراد اليوم والليلة من الأدعية المأثورة وصحيح الأذكار النبوية المتواترة، مع عداد تفاعلي لضبط الحساب والفضائل الجليلة.</p>
      </div>

      {/* Category Toggles and Control Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[#0F1411] border border-[#C5A059]/15 rounded-xl">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "morning", label: "أذكار الصباح", icon: Sun },
            { id: "evening", label: "أذكار المساء", icon: Moon },
            { id: "post_prayer", label: "أذكار دبر الصلاة", icon: Shield },
            { id: "quranic", label: "أدعية قرآنية مأثورة", icon: Bookmark },
            { id: "all", label: "الجميع", icon: Sparkles }
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id as any);
                  setSelectedDuaIdx(0);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                  activeCategory === cat.id
                    ? "bg-[#C5A059] text-[#0A0D0B] font-black"
                    : "bg-[#121814] text-[#E0D8D0]/80 hover:bg-[#C5A059]/10"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleResetAllCounts}
          className="text-xs text-[#C5A059] border border-[#C5A059]/25 hover:bg-[#C5A059]/10 rounded-lg px-4 py-1.5 flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className="w-3 h-3" />
          <span>تصفير العدادات التفاعلية</span>
        </button>
      </div>

      {/* Grid of Azkar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="azkar-cards-deck">
        {filteredAzkar.map((item, idx) => {
          const currentCount = userCounts[item.id] !== undefined ? userCounts[item.id] : item.count;
          const isCompleted = currentCount === 0;
          const isSelected = selectedDuaIdx === idx;

          return (
            <div
              key={item.id}
              onClick={() => setSelectedDuaIdx(idx)}
              className={`p-5 md:p-6 rounded-xl border flex flex-col justify-between transition-all duration-300 relative overflow-hidden cursor-pointer ${
                isSelected
                  ? "bg-[#151D18] border-[#C5A059] ring-1 ring-[#C5A059]/30 shadow-md shadow-[#C5A059]/5"
                  : isCompleted
                  ? "bg-[#121814]/40 border-[#C5A059]/10 opacity-70"
                  : "bg-[#121814] border-[#C5A059]/15 shadow-md hover:border-[#C5A059]/30"
              }`}
            >
              {/* Completed glow indicator */}
              {isCompleted && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500"></div>
              )}

              <div className="space-y-4 text-right">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#C5A059] font-extrabold uppercase">
                    {item.title}
                  </span>
                  {isCompleted && (
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold animate-pulse">
                      تم بحمد الله
                    </span>
                  )}
                </div>

                <p className="text-base md:text-lg leading-relaxed font-serif font-black text-[#D4AF37] select-all py-1.5">
                  {item.text}
                </p>

                {item.virtue && (
                  <p className="text-[11px] leading-relaxed text-[#E0D8D0]/65 italic font-light p-3 bg-[#0A0D0B] rounded border border-white/5">
                    <strong>الفضل الشرعي:</strong> {item.virtue}
                  </p>
                )}
              </div>

              {/* Bottom counters */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
                <span className="text-[9px] text-[#E0D8D0]/40 font-mono">[{item.source}]</span>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleResetCount(item)}
                    title="تصفير عداد المرة"
                    className="w-7 h-7 bg-[#151C17] text-[#C5A059] border border-[#C5A059]/20 rounded flex items-center justify-center font-bold text-xs hover:bg-[#C5A059]/10"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => handleIncrement(item)}
                    disabled={isCompleted}
                    className={`px-4 py-1.5 rounded-full font-mono text-xs font-black transition-all flex items-center gap-1.5 ${
                      isCompleted
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                        : "bg-[#C5A059] text-[#0A0D0B] hover:opacity-95 cursor-pointer shadow-lg active:scale-95"
                    }`}
                  >
                    <span>العداد:</span>
                    <span className="text-sm font-black">{currentCount}</span>
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Virtual Awrad Custom Box */}
      <div className="p-6 rounded-xl bg-[#0F1411] border border-[#C5A059]/15 flex flex-col gap-4">
        <h3 className="text-base font-serif text-[#C5A059] font-bold">توليد برنامج الأوراد والصلوات اليومية عبر المعرفة الحية</h3>
        <p className="text-xs opacity-75">هل ترغب بالدخول في برنامج استشفائي وروحي يومي بالأذكار المحددة؟ اطلب من الإسلام AI وضع جدول مخصص طبقاً لحالتك الروحية ومشاغلك اليومية.</p>
        
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onSendMessage("ضع لي خطة أوراد وأذكار يومية استشفائية مناسبة لشخص مهموم ومضغوط بالعمل")}
            className="flex-1 text-center font-bold p-3 bg-[#121814] hover:bg-[#C5A059]/10 border border-[#C5A059]/15 rounded-lg text-xs transition-all cursor-pointer"
          >
            خطة أوراد لإزالة الهموم والضغوط
          </button>
          <button
            onClick={() => onSendMessage("أريد جدول أذكار المسبحين المعتاد للبركة الممتدة وحفظ البيت والأهل")}
            className="flex-1 text-center font-bold p-3 bg-[#121814] hover:bg-[#C5A059]/10 border border-[#C5A059]/15 rounded-lg text-xs transition-all cursor-pointer"
          >
            برنامج البركة اليومية وحماية الأهل
          </button>
        </div>
      </div>

      {/* Translations & Vocal recitation of selected Supplication */}
      {filteredAzkar[selectedDuaIdx] && (
        <IslamicResponseUtility
          sourceLabel="الأذكار والأدعية الشريفة"
          text={`عنوان الذكر/الدعاء: ${filteredAzkar[selectedDuaIdx].title}\nالذكر: "${filteredAzkar[selectedDuaIdx].text}"\nالفضل والفضيلة الشرعية: ${filteredAzkar[selectedDuaIdx].virtue || "عامة البركة"}\nالمصدر: ${filteredAzkar[selectedDuaIdx].source}`}
        />
      )}

    </div>
  );
};
