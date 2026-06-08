import React, { useState, useEffect } from "react";
import { Brain, Plus, Trash2, GraduationCap, CheckCircle, Database, HelpCircle, FileText, Sparkles } from "lucide-react";
import { IslamicResponseUtility } from "./IslamicResponseUtility";

export interface MemoryItem {
  id: string;
  title: string;
  category: string;
  content: string;
  timestamp: string;
}

interface MemoryHubProps {
  onRefreshMemory?: () => void;
}

export const MemoryHub: React.FC<MemoryHubProps> = ({ onRefreshMemory }) => {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("عام");
  const [content, setContent] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    const raw = localStorage.getItem("islam_ai_memory_items");
    if (raw) {
      try {
        setItems(JSON.parse(raw));
      } catch (e) {
        console.error("Failed to parse memories", e);
      }
    } else {
      // Seed some starting knowledge items to make it rich on first look
      const seeded: MemoryItem[] = [
        {
          id: "seed-1",
          title: "رسالة تطهير الاعتقاد عن أدران الإلحاد",
          category: "العقيدة",
          content: "يجب على كل مسلم تحقيق التوحيد الخالص لله سبحانه وتعالى في ربوبيته وإلهيته وأسمائه وصفاته، والابتعاد عن البدع والدخائل الفكرية الفاسدة، واعتماد الأدلة النقلية السليمة المدعومة بقرائن العقول الفطرية الصافية.",
          timestamp: new Date().toLocaleDateString("ar-SA")
        },
        {
          id: "seed-2",
          title: "شرح حديث الآحاد ومكانته في التشريع",
          category: "علم الحديث",
          content: "الحديث الآحاد هو ما لم يجمع شروط المتواتر، وهو مقبول ويجب العمل به في الأحكام والاعتقاد إذا صحت نسبته وصح السند ونقله العدل الضابط عن مثله إلى منتهاه من غير شذوذ ولا علة قادحة.",
          timestamp: new Date().toLocaleDateString("ar-SA")
        }
      ];
      setItems(seeded);
      localStorage.setItem("islam_ai_memory_items", JSON.stringify(seeded));
    }
  }, []);

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newItem: MemoryItem = {
      id: Math.random().toString(),
      title: title.trim(),
      category: category,
      content: content.trim(),
      timestamp: new Date().toLocaleDateString("ar-SA")
    };

    const updated = [newItem, ...items];
    setItems(updated);
    localStorage.setItem("islam_ai_memory_items", JSON.stringify(updated));

    // Reset inputs
    setTitle("");
    setContent("");
    setShowForm(false);
    setSuccessMsg("✨ تم تلقين المادة المعرفية بنجاح! تم دمجها في خلايا قرابة الذكاء الصوتي المحاكي الآن.");
    
    if (onRefreshMemory) {
      onRefreshMemory();
    }

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  const handleDeleteMemory = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    localStorage.setItem("islam_ai_memory_items", JSON.stringify(updated));
    if (onRefreshMemory) {
      onRefreshMemory();
    }
  };

  const handleClearAll = () => {
    if (window.confirm("هل أنت متأكد من مسح جميع المعارف المكتسبة وتصفير الذاكرة؟")) {
      setItems([]);
      localStorage.removeItem("islam_ai_memory_items");
      if (onRefreshMemory) {
        onRefreshMemory();
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto animate-fade-in" id="memory-hub-viewport">
      
      {/* Dynamic Header Badge */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-[#C5A059] font-bold tracking-widest uppercase flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-[#C5A059] animate-pulse" />
          [وحدة ١٣ — مركز إثراء الذاكرة والتعلم الذاتي التراكمي]
        </span>
        <h2 className="text-3xl font-serif text-[#C5A059]">تنمية عقل المساعد الشرعي (إسلام AI)</h2>
        <p className="text-xs opacity-75">
          قم بتغذية وتلقين المساعد بكتب وتوجيهات وأسئلة تفصيلية لتتكامل مباشرة ضمن مستندات النظام المعرفية وسياق الأسئلة لتنمية ذكائه وتحصيله.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Quick Stats & Learn Engine Information */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          <div className="bg-[#0F1411] border border-[#C5A059]/15 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Database className="w-4.5 h-4.5 text-[#C5A059]" />
              <h3 className="text-sm font-serif text-[#C5A059] font-bold">بنية الخلايا المعرفية الحالية</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-[#121814] rounded-lg border border-white/5">
                <span className="text-2xl font-mono font-bold text-[#C5A059]">{items.length}</span>
                <span className="text-[10px] block opacity-55 mt-0.5">مواد معرفية نشطة</span>
              </div>
              <div className="p-3 bg-[#121814] rounded-lg border border-white/5">
                <span className="text-2xl font-mono font-bold text-emerald-400">
                  {items.reduce((acc, curr) => acc + curr.content.length, 0)}
                </span>
                <span className="text-[10px] block opacity-55 mt-0.5">حرف ومؤشر معرفي</span>
              </div>
            </div>

            <div className="text-[11px] leading-relaxed opacity-70 bg-[#121814] p-3 rounded-lg border border-white/5 space-y-2">
              <p className="font-bold text-[#C5A059] flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                آلية الملاحظة والتعلم للذكاء الاصطناعي:
              </p>
              <p>
                تم تصميم هذه المحطة الذكية بناءً على تقنية التدعيم المعرفي الذاتي. عند بدء أي محادثة في الوحدة السادسة، يقوم النظام بتحميل وتجهيز جميع المقالات والأحكام المودعة وتمريرها فورياً للذكاء الاصطناعي (Groq أو Gemini).
              </p>
              <p className="text-[10px] text-[#C5A059]">
                ✓ هكذا يصبح قادراً على الاستشهاد بكتبك ونصوصك الجديدة التي تلقنه إياها في هذه الغرفة.
              </p>
            </div>
          </div>

          {/* Interactive tip */}
          <div className="bg-[#121814]/40 border border-white/5 rounded-xl p-4 text-[11px] leading-relaxed">
            <p className="font-bold mb-1 text-white/80">💡 تلميحة المبرمج:</p>
            يمكنك تلقين المساعد فتاوى نادرة، أو تصريحات فقهية معقدة، أو تدوينات فكرية ترغب في جعله قريباً منها وفاهماً لرموزها وسياقها في الأبحاث القادمة.
          </div>

        </div>

        {/* Right column: Main memory list & additions */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-[#C5A059] flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[#C5A059]" />
              دفتر البيانات المعرفية المودعة بالذاكرة المدمجة
            </h3>
            
            <div className="flex gap-2">
              {items.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 border border-red-900/30 text-red-400 hover:bg-red-500/10 text-[11px] font-bold rounded cursor-pointer transition-colors"
                >
                  تصفير الذاكرة
                </button>
              )}
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-3.5 py-1.5 bg-[#C5A059] hover:bg-[#C5A059]/90 text-[#0A0D0B] text-[11px] font-bold rounded flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showForm ? "إغلاق نافذة التلقين" : "تلقين مادة معرفية جديدة"}</span>
              </button>
            </div>
          </div>

          {successMsg && (
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {showForm && (
            <form onSubmit={handleAddMemory} className="p-5 bg-[#0F1411] border border-[#C5A059]/35 rounded-xl flex flex-col gap-4 animate-fade-in">
              <span className="text-xs font-bold text-[#C5A059] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                تلقين فوري وتوسيع للمخزن الذاتي
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-white/50 font-bold">العنوان أو الكتاب المرجعي:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: الواضح في أصول الفقه"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-[#121814] border border-white/10 rounded px-2.5 py-1.5 text-xs text-[#E0D8D0] outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-white/50 font-bold">التصنيف الشرعي:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-[#121814] border border-white/10 rounded px-2.5 py-1.5 text-xs text-[#E0D8D0] outline-none focus:border-[#C5A059]"
                  >
                    <option value="العقيدة">العقيدة والتوحيد</option>
                    <option value="الفقه المذهبي">الفقه والأحكام</option>
                    <option value="علوم الحديث">علوم الحديث والسند</option>
                    <option value="السيرة النبوية">السيرة النبوية والمغازي</option>
                    <option value="اللغة العربية">اللغة العربية والنحو</option>
                    <option value="عام">توجيه شرعي مخصص وعام</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-white/50 font-bold">النص الكامل المعرفي للتعليم (سيتم فهمه بالكامل):</label>
                <textarea
                  required
                  rows={4}
                  placeholder="اكتب أو الصق النص هنا بالتفصيل الموثق..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="bg-[#121814] border border-white/10 rounded px-2.5 py-1.5 text-xs text-[#E0D8D0] outline-none focus:border-[#C5A059] resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#C5A059]/90 text-[#0A0D0B] font-bold text-xs rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all self-end"
              >
                <Plus className="w-4 h-4" />
                <span>حفظ في مصفوفة الذاكرة المعرفية</span>
              </button>
            </form>
          )}

          {/* Active Memories display */}
          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="p-10 border border-dashed border-white/5 rounded-xl text-center text-xs opacity-50 flex flex-col items-center justify-center gap-2">
                <HelpCircle className="w-8 h-8 text-white/20" />
                <p>الذاكرة خالية حالياً من الإمدادات المكتسبة.</p>
                <p className="text-[10px]">استخدم زر "تلقين مادة معرفية جديدة" لإثراء القاعدة.</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-xl bg-[#0F1411] border border-white/5 hover:border-[#C5A059]/15 transition-all text-right flex flex-col gap-2 relative group"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#C5A059]" />
                      <span className="text-xs font-serif font-black text-[#C5A059]">{item.title}</span>
                      <span className="text-[9px] bg-[#C5A059]/10 text-[#C5A059] px-2 py-0.5 rounded border border-[#C5A059]/20 font-bold">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9.5px] opacity-40 font-mono">{item.timestamp}</span>
                      <button
                        onClick={() => handleDeleteMemory(item.id)}
                        className="text-red-400 hover:text-red-300 transition-colors p-1 opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="حذف هذه المعرفة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs opacity-80 leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </p>

                  {/* Dynamic translation, French/English toggle & vocal recitation assistant player */}
                  <IslamicResponseUtility
                    sourceLabel="الذاكرة والمدونات الذاتية"
                    text={`المقالة أو الكتاب الملقَّن: ${item.title}\nالتصنيف الشرعي المعرّف: ${item.category}\nالمضمون الفكري: ${item.content}`}
                  />
                </div>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
