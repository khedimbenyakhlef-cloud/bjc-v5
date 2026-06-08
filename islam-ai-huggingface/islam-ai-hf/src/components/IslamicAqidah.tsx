import React, { useState } from "react";
import { Shield, Sparkles, BookOpen, Compass, Info, CheckCircle, HelpCircle } from "lucide-react";
import { aqidahData } from "../data/islamai_v2_data";
import { IslamicResponseUtility } from "./IslamicResponseUtility";

interface IslamicAqidahProps {
  onSendMessage: (text: string) => void;
}

export const IslamicAqidah: React.FC<IslamicAqidahProps> = ({ onSendMessage }) => {
  const [activeTab, setActiveTab] = useState<"pillars" | "names" | "tawheed" | "sects" | "doubts">("pillars");
  const [selectedPillarIndex, setSelectedPillarIndex] = useState(0);
  const [selectedNameIndex, setSelectedNameIndex] = useState(0);
  const [selectedDoubtIndex, setSelectedDoubtIndex] = useState(0);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto" id="unit-aqidah-creed">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-[#C5A059] font-bold tracking-widest uppercase">[وحدة ٩ — علم العقيدة الإسلامية السنية]</span>
        <h2 className="text-3xl font-serif text-[#C5A059]">رسائل التوحيد واستقامة الفكر الإسلامي النقي</h2>
        <p className="text-xs opacity-75">تبحّر في أصول العقيدة وأركان الإيمان الستة، وتدبر أسماء الله الحسنى، واطلع على ترسيخ الفكر الوسطي ودحض الشبهات الشائعة.</p>
      </div>

      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-2.5 p-2 bg-[#0F1411] border border-[#C5A059]/15 rounded-xl" id="aqidah-sub-nav">
        {[
          { id: "pillars", label: "أركان الإيمان الستة" },
          { id: "names", label: "أسماء الله الحسنى" },
          { id: "tawheed", label: "أقسام التوحيد والقدر" },
          { id: "sects", label: "الفرق والوسطية الإسلامية" },
          { id: "doubts", label: "فند الشبهات العصرية" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === tab.id
                ? "bg-[#C5A059] text-[#0A0D0B] font-black"
                : "text-[#E0D8D0]/80 hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="aqidah-main-deck">
        
        {/* Unit Active display screen */}
        <div className="lg:col-span-12">
          
          {/* ActiveTab: PILLARS */}
          {activeTab === "pillars" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 bg-[#0F1411] border border-[#C5A059]/15 rounded-xl p-5 flex flex-col gap-3">
                <p className="text-xs text-[#C5A059] font-bold mb-1 uppercase">الأركان الستة للدين وقراءة أصولها:</p>
                {aqidahData.pillarsOfIman.map((pillar, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPillarIndex(i)}
                    className={`w-full text-right p-3.5 rounded-lg border text-xs transition-all ${
                      selectedPillarIndex === i
                        ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059] font-bold"
                        : "bg-[#121814] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <span>{pillar.title}</span>
                  </button>
                ))}
              </div>

              <div className="md:col-span-2 p-6 md:p-8 rounded-xl bg-[#121814] border border-[#C5A059]/15 flex flex-col justify-between gap-6 shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#C5A059]" />
                    <h3 className="text-xl font-serif text-[#C5A059] font-bold">
                      {aqidahData.pillarsOfIman[selectedPillarIndex]?.title}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-[#E0D8D0] font-light font-serif">
                    {aqidahData.pillarsOfIman[selectedPillarIndex]?.content}
                  </p>
                </div>

                <div className="p-4 bg-[#0F1411] rounded border border-white/5 text-xs text-[#E0D8D0]/70 flex items-start gap-2.5 leading-relaxed">
                  <Info className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                  <p>
                    <strong>تثبيت توعوي:</strong> الإيمان هو التصديق الجازم بالقلب والإقرار باللسان والعمل بالأركان، ويزيد بطاعة الرحمن وينقص بمواقعة العصيان.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ActiveTab: NAMES */}
          {activeTab === "names" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 bg-[#0F1411] border border-[#C5A059]/15 rounded-xl p-5 flex flex-col gap-3">
                <p className="text-xs text-[#C5A059] font-bold mb-1">تدبر الأسماء التسعة والتسعين المفتاحية:</p>
                <div className="grid grid-cols-2 gap-2">
                  {aqidahData.allahNames.map((name, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedNameIndex(i)}
                      className={`text-center p-3 rounded-lg border text-xs transition-all ${
                        selectedNameIndex === i
                          ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059] font-bold"
                          : "bg-[#121814] border-white/5 hover:border-white/10"
                      }`}
                    >
                      <span className="font-serif block font-bold">{name.name}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => onSendMessage("اذكر لي كل أسماء الله الـ 99 مع معانيها وتدبراتها")}
                  className="w-full mt-2 py-2 bg-[#C5A059]/10 hover:bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/20 text-xs font-bold rounded-lg cursor-pointer"
                >
                  استعراض جميع الأسماء الحسنى تالياً
                </button>
              </div>

              <div className="md:col-span-2 p-6 md:p-8 rounded-xl bg-[#121814] border border-[#C5A059]/15 flex flex-col justify-between gap-6 shadow-xl text-center">
                <div className="space-y-4">
                  <span className="text-[10px] text-[#C5A059] font-extrabold uppercase tracking-widest">[ ولله الأسماءُ الحسنى فادعوهُ بها ]</span>
                  <p className="text-5xl font-serif font-black text-[#D4AF37] leading-none py-4">{aqidahData.allahNames[selectedNameIndex]?.name}</p>
                  <p className="text-base leading-relaxed text-[#E0D8D0] max-w-lg mx-auto font-light font-serif">
                    معنى وتأويل الاسم الشريف: "{aqidahData.allahNames[selectedNameIndex]?.meaning}"
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-3">
                  <span className="text-[10px] text-left text-[#E0D8D0]/40 font-mono">[البخاري: إن لله تسعة وتسعين اسماً...]</span>
                  <button
                    onClick={() => {
                      onSendMessage(`كيف نتعبد لله تعالى ونطرق بابه العظيم باسمه الشريف: ${aqidahData.allahNames[selectedNameIndex]?.name}؟`);
                    }}
                    className="px-4 py-1.5 bg-[#C5A059] text-[#0A0D0B] font-bold text-xs rounded hover:opacity-90 cursor-pointer"
                  >
                    تدبر التعبد بالاسم
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ActiveTab: TAWHEED */}
          {activeTab === "tawheed" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monotheism اقسام التوحيد */}
              <div className="p-5 bg-[#0F1411] border border-[#C5A059]/15 rounded-xl flex flex-col gap-4">
                <h3 className="text-base font-serif text-[#C5A059] font-bold">أقسام التوحيد الثلاثة:</h3>
                <div className="space-y-3">
                  {aqidahData.tawheedCategories.map((cat, i) => (
                    <div key={i} className="p-3.5 bg-[#121814] border border-white/5 rounded">
                      <h4 className="text-xs font-bold text-[#C5A059] mb-1">{cat.title}</h4>
                      <p className="text-xs leading-relaxed text-[#E0D8D0]/90 font-light">{cat.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Destiny مراحل ومستويات القدر */}
              <div className="p-5 bg-gradient-to-b from-[#151B17] to-[#0A0D0B] border border-[#C5A059]/15 rounded-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-serif text-[#C5A059] font-bold mb-4">مراتب القدر الأربعة عند أهل السنة والجماعة:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aqidahData.qadarStages.map((stage, i) => (
                      <div key={i} className="p-3 bg-[#111613] rounded border border-white/5">
                        <h4 className="text-xs font-extrabold text-[#D4AF37] mb-1">{stage.title}</h4>
                        <p className="text-[10.5px] leading-relaxed text-[#E0D8D0]/80 font-light">{stage.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded text-[10px] italic text-[#E0D8D0]/60 text-right leading-relaxed mt-4">
                  " تؤمن بالقدر خيره وشره حلوه ومره كله من الله تعالى. " [مسند أحمد وصحيح مسلم]
                </div>
              </div>
            </div>
          )}

          {/* ActiveTab: SECTS */}
          {activeTab === "sects" && (
            <div className="p-6 md:p-8 rounded-xl bg-[#0F1411] border border-[#C5A059]/15 flex flex-col gap-5 shadow-inner">
              <h3 className="text-lg font-serif text-[#C5A059] font-bold pb-2 border-b border-white/5 flex items-center gap-1">
                <BookOpen className="w-5 h-5 text-[#C5A059]" />
                الفرق الفكرية والوسطية الشرعية للأمة الإسلامية
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {aqidahData.sectsInfo.map((sect, i) => (
                  <div key={i} className="p-5 rounded-lg border border-white/5 bg-[#121814]/80 flex flex-col gap-3">
                    <span className="w-2 h-4 bg-[#C5A059]"></span>
                    <h4 className="text-sm font-bold text-[#C5A059]">{sect.name}</h4>
                    <p className="text-xs leading-relaxed text-[#E0D8D0]/80 font-light">{sect.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-[#151B17] border border-[#C5A059]/15 mt-2 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs leading-relaxed text-[#E0D8D0]/80 max-w-2xl font-light">
                  <strong>منهج الاستقامة والمحاذاة:</strong> إن مذهب أهل الحق هو مذهب السلف الصالح وجمهور الفقهاء والأصوليين، ويمثل الوسطية التامة بجمعهم للنقل ومساندتهم للعقل دون إفراط أو تفريط.
                </p>
                <button
                  onClick={() => onSendMessage("اشرح لي نشأة الفرق الإسلامية ومقارناتها بالتفصيل")}
                  className="px-4 py-2 border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059]/10 text-xs font-bold rounded-lg cursor-pointer shrink-0 transition-colors"
                >
                  طلب مقارنة تاريخية ممتدة
                </button>
              </div>
            </div>
          )}

          {/* ActiveTab: DOUBTS */}
          {activeTab === "doubts" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 bg-[#0F1411] border border-[#C5A059]/15 rounded-xl p-5 flex flex-col gap-3">
                <p className="text-xs text-[#C5A059] font-bold mb-1">الشبهات والمزاعم المنتشرة دحضها وفحصها:</p>
                {aqidahData.doubtsRefutations.map((doubt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedDoubtIndex(i)}
                    className={`w-full text-right p-3.5 rounded-lg border text-xs leading-normal transition-all ${
                      selectedDoubtIndex === i
                        ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059] font-bold"
                        : "bg-[#121814] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <span className="line-clamp-2">{doubt.doubt}</span>
                  </button>
                ))}
              </div>

              <div className="md:col-span-2 p-6 md:p-8 rounded-xl bg-[#121814] border border-[#C5A059]/15 flex flex-col gap-5 shadow-xl">
                <div className="pb-3 border-b border-white/5 flex items-start gap-2.5">
                  <HelpCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-red-400 block font-bold uppercase">الشك أو الشبهة المعاصرة المثارة:</span>
                    <h4 className="text-sm font-bold text-[#E0D8D0] leading-normal">{aqidahData.doubtsRefutations[selectedDoubtIndex]?.doubt}</h4>
                  </div>
                </div>

                <div className="p-5 rounded-lg bg-[#0F1411] border border-emerald-900/20">
                  <span className="text-[10px] text-emerald-400 block font-bold mb-2 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    الرد العلمي والمنهجي المدقق الصارم:
                  </span>
                  <p className="text-xs leading-relaxed text-[#E0D8D0] font-light font-serif whitespace-pre-wrap text-justify">
                    {aqidahData.doubtsRefutations[selectedDoubtIndex]?.refutation}
                  </p>
                </div>

                <button
                  onClick={() => onSendMessage(`فصّل لي الرد الشرعي والعقلي لدحض: ${aqidahData.doubtsRefutations[selectedDoubtIndex]?.doubt}`)}
                  className="w-full py-2 bg-[#C5A059]/10 hover:bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/20 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                >
                  مباحثات الشبهة وطرح مزيد من الأدلة
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Translations & Vocal recitation of any Creed page */}
      <IslamicResponseUtility
        sourceLabel="أصول العقيدة الإيمانية والتوحيد"
        text={(() => {
          switch (activeTab) {
            case "pillars":
              return `الركن الإيماني: ${aqidahData.pillarsOfIman[selectedPillarIndex]?.title || ""}\n\nالشرح والبيان: ${aqidahData.pillarsOfIman[selectedPillarIndex]?.content || ""}`;
            case "names":
              return `اسم الله الحسنى الشريف: ${aqidahData.allahNames[selectedNameIndex]?.name || ""}\n\nالأثر التعبدي والمعنى: ${aqidahData.allahNames[selectedNameIndex]?.meaning || ""}`;
            case "tawheed":
              return `أقسام توحيد رب العالمين وعقيدة القدر:\n\n${aqidahData.tawheedCategories.map(c => `• ${c.title}: ${c.content}`).join("\n\n")}`;
            case "sects":
              return `مدونات الفكر الإسلامي والوسطية الشرعية للأمة:\n\n${aqidahData.sectsInfo.map(s => `• ${s.name}: ${s.desc}`).join("\n\n")}`;
            case "doubts":
              return `الشبهة المعاصرة المطروحة: ${aqidahData.doubtsRefutations[selectedDoubtIndex]?.doubt || ""}\n\nالرد المدروس ودحض الشكوك: ${aqidahData.doubtsRefutations[selectedDoubtIndex]?.refutation || ""}`;
            default:
              return "";
          }
        })()}
      />

    </div>
  );
};
