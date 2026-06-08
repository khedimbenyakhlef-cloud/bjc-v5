import React, { useState } from "react";
import { Sparkles, HelpCircle, BookOpen, Compass, Info, FileText } from "lucide-react";
import { arabicGrammarData } from "../data/islamai_v2_data";
import { IslamicResponseUtility } from "./IslamicResponseUtility";

interface ArabicGrammarProps {
  onSendMessage: (text: string) => void;
}

export const ArabicGrammar: React.FC<ArabicGrammarProps> = ({ onSendMessage }) => {
  const [activeTab, setActiveTab] = useState<"parsing" | "rules" | "rhetoric" | "vocab">("parsing");
  const [selectedParseIdx, setSelectedParseIdx] = useState(0);
  const [selectedWordIdx, setSelectedWordIdx] = useState(0);
  const [selectedVocabIdx, setSelectedVocabIdx] = useState(0);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto" id="unit-arabic-grammar">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-[#C5A059] font-bold tracking-widest uppercase">[وحدة ١٢ — علوم اللغة العربية وبلاغة وإعراب التنزيل]</span>
        <h2 className="text-3xl font-serif text-[#C5A059]">إعراب القرآن الكريم وتذوق بلاغة المفردات الفصحى</h2>
        <p className="text-xs opacity-75">احظ بلمسة بيان عربية أصيلة مع الإعراب التفصيلي للآيات الكريمة، وقواعد النحو الضرورية، ومستويات البلاغة الخالدة في لغة الضاد.</p>
      </div>

      {/* Navigation Sub-Menu */}
      <div className="flex flex-wrap gap-2.5 p-2 bg-[#0F1411] border border-[#C5A059]/15 rounded-xl" id="grammar-sub-nav">
        {[
          { id: "parsing", label: "إعراب عينات من سور القرآن" },
          { id: "rules", label: "قواعد النحو والصرف" },
          { id: "rhetoric", label: "علم البلاغة والبيان" },
          { id: "vocab", label: "قاموس غريب وصعب المفردات" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setSelectedWordIdx(0);
            }}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="grammar-main-deck">
        
        {/* Dynamic Inner screens */}
        <div className="lg:col-span-12">
          
          {/* ActiveTab: PARSING */}
          {activeTab === "parsing" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Parsing selector (left) */}
              <div className="md:col-span-1 bg-[#0F1411] border border-[#C5A059]/15 rounded-xl p-5 flex flex-col gap-3">
                <p className="text-xs text-[#C5A059] font-bold pb-2 border-b border-white/5 uppercase">الآية المختارة للإعراب التفصيلي:</p>
                {arabicGrammarData.parsingExamples.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedParseIdx(idx);
                      setSelectedWordIdx(0);
                    }}
                    className={`w-full text-right p-3.5 rounded-lg border text-xs font-serif transition-all ${
                      selectedParseIdx === idx
                        ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059] font-bold"
                        : "bg-[#121814] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <span>{item.verse}</span>
                  </button>
                ))}
              </div>

              {/* Word by Word analysis (rightcols) */}
              <div className="md:col-span-2 p-6 md:p-8 rounded-xl bg-[#121814] border border-[#C5A059]/15 flex flex-col justify-between gap-6 shadow-xl">
                
                <div className="space-y-5 text-right">
                  <div className="pb-3 border-b border-white/5">
                    <span className="text-[10px] text-[#C5A059] font-bold block uppercase">[ الإعراب التفصيلي المتواتر ]</span>
                    <h3 className="text-2xl font-serif text-[#D4AF37] font-black mt-2">
                       {arabicGrammarData.parsingExamples[selectedParseIdx]?.verse} 
                    </h3>
                  </div>

                  {/* Word-By-Word Grid */}
                  <div className="space-y-4">
                    <span className="text-[10px] text-[#C5A059] font-bold block">انقر على الكلمة للاستعراض المفصّل:</span>
                    <div className="flex flex-wrap gap-2.5">
                      {arabicGrammarData.parsingExamples[selectedParseIdx]?.parsing.map((pw, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedWordIdx(i)}
                          className={`px-4 py-2 text-xs font-bold font-serif rounded border transition-all ${
                            selectedWordIdx === i
                              ? "bg-[#C5A059] text-[#0A0D0B] border-[#C5A059] font-black"
                              : "bg-[#1C2520]/60 border-[#C5A059]/15 text-[#E0D8D0]"
                          }`}
                        >
                          {pw.word}
                        </button>
                      ))}
                    </div>

                    {/* Word Analysis Display */}
                    <div className="p-5 rounded-lg bg-[#0A0D0B] border border-[#C5A059]/25">
                      <span className="text-[10px] text-[#C5A059] font-bold block mb-1.5">
                        تحليل وإعراب الكلمة المختارة ({arabicGrammarData.parsingExamples[selectedParseIdx]?.parsing[selectedWordIdx]?.word}):
                      </span>
                      <p className="text-xs leading-relaxed text-[#E0D8D0] font-light leading-loose font-mono text-justify">
                        {arabicGrammarData.parsingExamples[selectedParseIdx]?.parsing[selectedWordIdx]?.analysis}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-3">
                  <span className="text-[10px] italic text-[#C5A059]/75 font-serif">
                    مستخلص معتمد طبقاً لكتاب إعراب القرآن الكلي لمحيي الدين درويش.
                  </span>
                  <button
                    onClick={() => onSendMessage(`أعرب لي تفصيلياً آية الكرسي كاملة بأدق القواعد والروابط النحوية`)}
                    className="px-4 py-1.5 bg-[#C5A059] text-[#0A0D0B] font-bold text-xs rounded hover:opacity-90 cursor-pointer"
                  >
                    طلب إعراب آية مخصصة
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ActiveTab: RULES */}
          {activeTab === "rules" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {arabicGrammarData.grammarRules.map((rule, idx) => (
                <div key={idx} className="p-5 rounded-xl bg-[#0F1411] border border-[#C5A059]/15 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-serif text-[#C5A059] font-bold mb-3 pb-1 border-b border-white/5">{rule.title}</h3>
                    <div className="space-y-2">
                      {rule.points.map((pt, i) => (
                        <p key={i} className="text-xs leading-relaxed text-[#E0D8D0]/90 font-light">• {pt}</p>
                      ))}
                    </div>
                  </div>
                  <div className="text-[9px] text-[#E0D8D0]/30 font-mono mt-4 text-left">قواعد الاستقامة العربية</div>
                </div>
              ))}
            </div>
          )}

          {/* ActiveTab: RHETORIC */}
          {activeTab === "rhetoric" && (
            <div className="p-5 rounded-xl bg-[#0F1411] border border-[#C5A059]/15 flex flex-col gap-4">
              <h3 className="text-base font-serif text-[#C5A059] font-bold pb-1.5 border-b border-white/5 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-[#C5A059]" />
                أقسام البلاغة والجماليات البيانية الخالدة
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {arabicGrammarData.rhetoricLessons.map((rh, i) => (
                  <div key={i} className="p-4 rounded bg-[#121814] border border-white/5 text-right flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-[#C5A059] block font-bold mb-1">{rh.concept}</span>
                      <p className="text-xs leading-relaxed text-[#E0D8D0]/80 font-light">{rh.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ActiveTab: VOCAB */}
          {activeTab === "vocab" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Selector List */}
              <div className="md:col-span-1 bg-[#0F1411] border border-[#C5A059]/15 rounded-xl p-5 flex flex-col gap-3">
                <p className="text-xs text-[#C5A059] font-bold pb-2 border-b border-white/5">اختر مفردة قرآنية لتدبر جذرها اللغوي مع الفهم:</p>
                {arabicGrammarData.vocabularyDictionary.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedVocabIdx(idx)}
                    className={`w-full text-right p-3 rounded border text-xs font-bold transition-all ${
                      selectedVocabIdx === idx
                        ? "bg-[#C5A059]/10 border-[#C5A059] text-[#C5A059] font-bold"
                        : "bg-[#121814] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <span>{item.word}</span>
                  </button>
                ))}
              </div>

              {/* Dict detail cards */}
              <div className="md:col-span-2 p-6 md:p-8 rounded-xl bg-[#121814] border border-[#C5A059]/15 flex flex-col justify-between gap-6 shadow-xl text-right">
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                    <h3 className="text-2xl font-serif text-[#D4AF37] font-black">
                      {arabicGrammarData.vocabularyDictionary[selectedVocabIdx]?.word}
                    </h3>
                    <span className="text-xs bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/25 px-2.5 py-1 rounded font-mono font-bold block shrink-0">
                      الجذر الثلاثي: {arabicGrammarData.vocabularyDictionary[selectedVocabIdx]?.root}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] text-[#C5A059] font-bold block">البيان اللغوي والشرعي للمفردة القرانية الحصيفة:</span>
                    <p className="text-sm leading-relaxed text-[#E0D8D0] font-light font-serif text-justify whitespace-pre-wrap leading-loose p-5 bg-[#0A0D0B] rounded border border-white/5">
                      {arabicGrammarData.vocabularyDictionary[selectedVocabIdx]?.meaning}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 text-left text-[10.5px] italic text-[#C5A059]/75 font-serif">
                   معجم المفردات التابع لكتاب طيف اللغات وغريب المقامات لراغب الأصفهاني.
                </div>

              </div>

            </div>
          )}

        </div>

      </div>

      {/* Translations & Vocal recitation of Grammar / Rhetoric pages */}
      <IslamicResponseUtility
        sourceLabel="علوم اللغة البلاغية وإعراب التنزيل"
        text={(() => {
          switch (activeTab) {
            case "parsing": {
              const item = arabicGrammarData.parsingExamples[selectedParseIdx];
              const activeWord = item?.parsing[selectedWordIdx];
              return item ? `الآية القرآنية الشريفة: ${item.verse}\n\nالكلمة المختارة للإفادة: "${activeWord?.word || ""}"\n\nالإعراب التفصيلي المسند: ${activeWord?.analysis || ""}` : "";
            }
            case "rules": {
              return `قواعد النحو العربي والبيان الخالد لعلوم الضاد:\n\n${arabicGrammarData.grammarRules.map(r => `• ركيزة: ${r.title}\n${r.points.map(pt => `   - ${pt}`).join("\n")}`).join("\n\n")}`;
            }
            case "rhetoric": {
              return `مدارس وعلوم البلاغة وعلم المعاني القرآني:\n\n${arabicGrammarData.rhetoricLessons.map(rh => `• الباب الجمالي: ${rh.concept}\n  الشرح والبيان: ${rh.detail}`).join("\n\n")}`;
            }
            case "vocab": {
              const vocab = arabicGrammarData.vocabularyDictionary[selectedVocabIdx];
              return vocab ? `المفردة من غريب القرآن الكريم: ${vocab.word}\n\nالجذر الثلاثي اللغوي: ${vocab.root}\n\nالبيان والتأويل الشرعي الدقيق: ${vocab.meaning}` : "";
            }
            default:
              return "";
          }
        })()}
      />

    </div>
  );
};
