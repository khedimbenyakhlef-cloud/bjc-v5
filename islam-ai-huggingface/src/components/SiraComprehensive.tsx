import React, { useState } from "react";
import { History, Shield, Users, Compass, Award, Sparkles, BookOpen } from "lucide-react";
import { siraComprehensiveData } from "../data/islamai_v2_data";
import { IslamicResponseUtility } from "./IslamicResponseUtility";

interface SiraComprehensiveProps {
  onSendMessage: (text: string) => void;
}

export const SiraComprehensive: React.FC<SiraComprehensiveProps> = ({ onSendMessage }) => {
  const [activeCategory, setActiveCategory] = useState<"caliphs" | "wives" | "promised" | "dynasties">("caliphs");
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto" id="unit-sira-comprehensive">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-[#C5A059] font-bold tracking-widest uppercase">[وحدة ١١ — السيرة العطرة وتاريخ الحضارة الإسلامية الكبرى]</span>
        <h2 className="text-3xl font-serif text-[#C5A059]">موسوعة الخلافة والعهود وغرس الهمم التاريخية</h2>
        <p className="text-xs opacity-75">سافر عبر العصور الإسلامية من عهود الخلفاء الراشدين الأربعة، وسير أمهات المؤمنين، ومناقب المبشرين، وصعود وانحدار الدول الكبرى.</p>
      </div>

      {/* Navigation Sub-Menu */}
      <div className="flex flex-wrap gap-2.5 p-2 bg-[#0F1411] border border-[#C5A059]/15 rounded-xl">
        {[
          { id: "caliphs", label: "الخلفاء الراشدون", icon: Users },
          { id: "wives", label: "أمهات المؤمنين", icon: Shield },
          { id: "promised", label: "العشرة المبشرون", icon: Award },
          { id: "dynasties", label: "الدول والعهود الكبرى", icon: Compass }
        ].map((sub) => {
          const Icon = sub.icon;
          return (
            <button
              key={sub.id}
              onClick={() => {
                setActiveCategory(sub.id as any);
                setSelectedItemIdx(0);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                activeCategory === sub.id
                  ? "bg-[#C5A059] text-[#0A0D0B] font-black"
                  : "text-[#E0D8D0]/80 hover:bg-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{sub.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side Selectors (4 cols) */}
        <div className="lg:col-span-4 bg-[#0F1411] border border-[#C5A059]/15 rounded-xl p-5 flex flex-col gap-4">
          <p className="text-xs text-[#C5A059] font-bold pb-1.5 border-b border-white/5 uppercase">
            {activeCategory === "caliphs" && "قائمة الراشدين رضي الله عنهم:"}
            {activeCategory === "wives" && "أمهات المؤمنين العطرات:"}
            {activeCategory === "promised" && "فرسان العشرة المبشرين:"}
            {activeCategory === "dynasties" && "عهود وكيانات التاريخ الحضاري:"}
          </p>

          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {activeCategory === "caliphs" &&
              siraComprehensiveData.caliphs.map((cal, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedItemIdx(idx)}
                  className={`w-full text-right p-3 rounded text-xs border transition-all ${
                    selectedItemIdx === idx
                      ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059] font-bold"
                      : "bg-[#121814] border-white/5 hover:border-white/10"
                  }`}
                >
                  {cal.name}
                </button>
              ))}

            {activeCategory === "wives" &&
              siraComprehensiveData.mothersOfBelievers.map((wife, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedItemIdx(idx)}
                  className={`w-full text-right p-3 rounded text-xs border transition-all ${
                    selectedItemIdx === idx
                      ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059] font-bold"
                      : "bg-[#121814] border-white/5 hover:border-white/10"
                  }`}
                >
                  {wife.name}
                </button>
              ))}

            {activeCategory === "promised" &&
              siraComprehensiveData.promisedJannah.map((pr, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedItemIdx(idx)}
                  className={`w-full text-right p-3 rounded text-xs border transition-all ${
                    selectedItemIdx === idx
                      ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059] font-bold"
                      : "bg-[#121814] border-white/5 hover:border-white/10"
                  }`}
                >
                  {pr.name}
                </button>
              ))}

            {activeCategory === "dynasties" &&
              siraComprehensiveData.dynasties.map((dyn, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedItemIdx(idx)}
                  className={`w-full text-right p-3 rounded text-xs border transition-all ${
                    selectedItemIdx === idx
                      ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059] font-bold"
                      : "bg-[#121814] border-white/5 hover:border-white/10"
                  }`}
                >
                  {dyn.name}
                </button>
              ))}
          </div>
        </div>

        {/* Right side display workspace (8 cols) */}
        <div className="lg:col-span-8 p-6 md:p-8 rounded-xl bg-[#121814] border border-[#C5A059]/15 flex flex-col justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-0.5 bg-[#C5A059]/20"></div>
          
          <div className="space-y-5">
            {activeCategory === "caliphs" && (
              <div className="space-y-4 text-right">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                  <h3 className="text-xl font-serif text-[#C5A059] font-strong">
                    {siraComprehensiveData.caliphs[selectedItemIdx]?.name}
                  </h3>
                  <span className="text-[10px] bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] px-2 py-1 rounded font-mono">
                    فترة الخلافة: {siraComprehensiveData.caliphs[selectedItemIdx]?.period}
                  </span>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] text-[#C5A059] font-bold block">أبزر الإنجازات والأعمال الروحية والتوسعية:</span>
                  <p className="text-sm leading-relaxed text-[#E0D8D0] font-light font-serif text-justify whitespace-pre-wrap">
                    {siraComprehensiveData.caliphs[selectedItemIdx]?.acts}
                  </p>
                </div>
              </div>
            )}

            {activeCategory === "wives" && (
              <div className="space-y-4 text-right">
                <div className="border-b border-white/5 pb-2.5">
                  <span className="text-[10px] text-[#C5A059] font-bold block">[ أمهات المؤمنين رضي الله عنهن ]</span>
                  <h3 className="text-xl font-serif text-[#C5A059] font-strong mt-0.5">
                    السيدة {siraComprehensiveData.mothersOfBelievers[selectedItemIdx]?.name}
                  </h3>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] text-[#C5A059] font-bold block">السيرة والخصائص والمناقب العطرة:</span>
                  <p className="text-sm leading-relaxed text-[#E0D8D0] font-light font-serif text-justify whitespace-pre-wrap">
                    {siraComprehensiveData.mothersOfBelievers[selectedItemIdx]?.bio}
                  </p>
                </div>
              </div>
            )}

            {activeCategory === "promised" && (
              <div className="space-y-4 text-right">
                <div className="border-b border-white/5 pb-2.5">
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase block w-max">
                    أحد العشرة المبشرين بالجنة رضي الله عنهم
                  </span>
                  <h3 className="text-xl font-serif text-[#C5A059] font-strong mt-2">
                    الصحابي الجليل {siraComprehensiveData.promisedJannah[selectedItemIdx]?.name}
                  </h3>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] text-[#C5A059] font-bold block">الملخص التعريفي والموقف التاريخي البارز له:</span>
                  <p className="text-sm leading-relaxed text-[#E0D8D0] font-light font-serif text-justify whitespace-pre-wrap">
                    {siraComprehensiveData.promisedJannah[selectedItemIdx]?.d}
                  </p>
                </div>
              </div>
            )}

            {activeCategory === "dynasties" && (
              <div className="space-y-4 text-right">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                  <h3 className="text-xl font-serif text-[#C5A059] font-strong">
                    {siraComprehensiveData.dynasties[selectedItemIdx]?.name}
                  </h3>
                  <span className="text-[10px] text-[#C5A059] font-mono leading-none">
                    الفترة: {siraComprehensiveData.dynasties[selectedItemIdx]?.period}
                  </span>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] text-[#C5A059] font-bold block">عن الدولة والحقبة ونطاق الحضارة والازدهار:</span>
                  <p className="text-sm leading-relaxed text-[#E0D8D0] font-light font-serif text-justify whitespace-pre-wrap">
                    {siraComprehensiveData.dynasties[selectedItemIdx]?.desc}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action layout */}
          <div className="pt-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-3">
            <span className="text-[10.5px] italic text-[#C5A059]/75 font-serif">
              مكتبة السيرة الشاملة - مأخوذة من تاريخ ابن كثير ومغازي البخاري.
            </span>

            <button
              onClick={() => {
                const activeName =
                  activeCategory === "caliphs"
                    ? siraComprehensiveData.caliphs[selectedItemIdx]?.name
                    : activeCategory === "wives"
                    ? siraComprehensiveData.mothersOfBelievers[selectedItemIdx]?.name
                    : activeCategory === "promised"
                    ? siraComprehensiveData.promisedJannah[selectedItemIdx]?.name
                    : siraComprehensiveData.dynasties[selectedItemIdx]?.name;
                onSendMessage(`حدثني بالتفصيل الشامل والدورس القيادية عن: ${activeName}`);
              }}
              className="px-4 py-2 text-xs font-bold border border-[#C5A059] text-[#C5A059] rounded hover:bg-[#C5A059]/10 cursor-pointer transition-colors"
            >
              مباحثة وطرح تفاصيل السيرة في الشات
            </button>
          </div>

          {/* Academic translations and voice recitations utility */}
          <IslamicResponseUtility
            sourceLabel="علم السيرة والأعلام والتاريخ"
            text={(() => {
              switch (activeCategory) {
                case "caliphs": {
                  const cal = siraComprehensiveData.caliphs[selectedItemIdx];
                  return cal ? `الخليفة الراشد: ${cal.name}\nفترة الخلافة: ${cal.period}\nأبرز الأعمال والفتوحات: ${cal.acts}` : "";
                }
                case "wives": {
                  const wife = siraComprehensiveData.mothersOfBelievers[selectedItemIdx];
                  return wife ? `أم المؤمنين: السيدة ${wife.name}\nمناقب وسيرة السيدة رضي الله عنها: ${wife.bio}` : "";
                }
                case "promised": {
                  const pr = siraComprehensiveData.promisedJannah[selectedItemIdx];
                  return pr ? `العشرة المبشرون بالجنة: ${pr.name}\nالموقف التاريخي ومكانته: ${pr.d}` : "";
                }
                case "dynasties": {
                  const dyn = siraComprehensiveData.dynasties[selectedItemIdx];
                  return dyn ? `الدول والعهود التاريخية الكبرى: ${dyn.name}\nالفترة والحقبة: ${dyn.period}\nالوصف الحضاري والازدهار العظيم: ${dyn.desc}` : "";
                }
                default:
                  return "";
              }
            })()}
          />

        </div>

      </div>

    </div>
  );
};
