/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "7860");

app.use(express.json());

// Lazy-initialized GoogleGenAI client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// -------------------------------------------------------------
// Groq AI Rotation & Whisper Models Configuration
// -------------------------------------------------------------
const GROQ_MODELS = [
  "deepseek-r1-distill-llama-70b",
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it"
];

// Reusable system instruction enforcing Islam AI 2.0 identity and sources
const ISLAM_AI_SYSTEM_INSTRUCTION = `أنت إسلام AI — المساعد الإسلامي الأكاديمي الشامل.

هويتك الثابتة:
اسمك الجديد هو: إسلام AI
في كل إجابة تفتح بـ:
بسم الله الرحمن الرحيم
السلام عليكم ورحمة الله وبركاته
أنا إسلام AI — مساعدك الإسلامي الأكاديمي الشامل
تأسس بواسطة: KHEDIM BENYAKHLEF DIT BENY-JOE — المحمدية، معسكر، الجزائر

عند أي سؤال عن هويتك أو من أنشأك تجيب دائماً:
"أنا إسلام AI، تم تأسيسي وتطويري بواسطة المخترع والباحث KHEDIM BENYAKHLEF DIT BENY-JOE من المحمدية، معسكر، الجزائر."

قاعدة معرفتك الأساسية (الأصيلة):
- القرآن الكريم كاملأ بجميع سوره وتفاسيره وإعرابه وبلاغته
- صحيح البخاري وصحيح مسلم بأسانيدهم وشروحهما
- السنن الأربع وموطأ مالك ومسند أحمد
- تفسير الأحلام لابن سيرين كاملاً
- الفقه على المذاهب الأربعة (الحنفي، المالكي، الشافعي، الحنبلي)
- السيرة النبوية والتاريخ الإسلامي الشامل
- علم العقيدة الإسلامية وأصولها السلفية والأشعرية والماتريدية
- أذكار وأدعية السنة النبوية

مهمتك الأكاديمية:
1. الجواب بوقار تام مع ذكر المصادر الدقيقة (السور والأحاديث والكتب وأرقامها).
2. الالتزام بالأدب والتشجيع وتصحيح قراءة التجويد بلطف.
3. الرد بلغة المستخدم (عربي/إنجليزي/فرنسي) مع إبراز النصوص الشرعية بالعربية دائماً.

قواعد مطلقة لا استثناء فيها:
1. يجب فتح كل إجابة بالبسملة والسلام الشامل وذكر التأسيس لـ KHEDIM BENYAKHLEF DIT BENY-JOE.
2. يجب ختم كل إجابة بـ: "والله أعلم — وصلى الله على نبينا محمد".
3. يمنع تماماً اختراع فتاوى أو أحاديث أو آيات أو ترويج شائعات أو الخوض في السياسة المعاصرة.`;

// Helper for multi-model Groq rotation
async function queryGroq(messages: any[], systemInstruction: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not defined");
  }

  const rotationLog: string[] = [];
  let responseText = "";
  let successModel = "";

  for (let i = 0; i < GROQ_MODELS.length; i++) {
    const model = GROQ_MODELS[i];
    rotationLog.push(`🔍 محاولة الاستعلام باستخدام النموذج: ${model}...`);
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemInstruction },
            ...messages
          ],
          temperature: 0.3,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      responseText = data.choices?.[0]?.message?.content || "";
      if (responseText) {
        successModel = model;
        rotationLog.push(`✅ تم الرد بنجاح باستخدام النموذج: ${model}`);
        break;
      } else {
        throw new Error("Empty response from Groq completions API");
      }
    } catch (err: any) {
      rotationLog.push(`⚠️ فشل النموذج ${model}: ${err.message || err}`);
    }
  }

  if (!responseText) {
    throw new Error("All Groq models in the rotation failed.");
  }

  return { text: responseText, modelUsed: successModel, rotationLog };
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Transcription Endpoint for [وحدة 7] Whisper API
app.post("/api/transcribe", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { audioData } = req.body; // Base64 audio string
    if (!audioData) {
      res.status(400).json({ error: "No audio data provided" });
      return;
    }

    if (!process.env.GROQ_API_KEY) {
      res.status(400).json({ error: "مفتاح Groq API غير مهيأ بعد. يرجى تهيئته لتفعيل Whisper!" });
      return;
    }

    const buffer = Buffer.from(audioData, "base64");
    const blob = new Blob([buffer], { type: "audio/wav" });
    const file = new File([blob], "audio.wav", { type: "audio/wav" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-large-v3");
    formData.append("language", "ar");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Whisper API Error: ${errText}`);
    }

    const data = await response.json();
    res.json({ text: data.text });
  } catch (err: any) {
    console.error("Transcription Error:", err);
    res.status(500).json({ error: err.message || "Failed to transcribe audio" });
  }
});

// Dynamic Verse & Tajweed Analysis for any of the 114 Quran Surahs
app.post("/api/quran/verse", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { surahNumber, verseNumber, reciter = "ar.alafasy" } = req.body;
    if (!surahNumber || !verseNumber) {
      res.status(400).json({ error: "surahNumber and verseNumber are required" });
      return;
    }

    // Call open AlQuran Cloud API with recitation audio
    const response = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:${verseNumber}/editions/quran-uthmani,en.sahih,${reciter}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch verse from AlQuran API (Status ${response.status})`);
    }

    const json = await response.json();
    if (json.code !== 200 || !json.data || json.data.length < 2) {
      throw new Error("Invalid response from AlQuran API");
    }

    const uthmaniText = json.data[0].text;
    const translationText = json.data[1].text;
    let audioUrl = json.data[2] && json.data[2].audio ? json.data[2].audio : `https://cdn.alquran.cloud/media/audio/ayah/ar.alafasy/${json.data[0].number}`;
    
    // Ensure HTTPS to prevent browser iframe mixed-content blockages
    if (audioUrl) {
      audioUrl = audioUrl.replace("http://", "https://");
    }
    
    // Clean Arabic for phonetic match
    const cleanUthmani = uthmaniText.replace(/[^\u0621-\u064A\s]/g, "").trim();

    // Now, analyze with rotation Groq / Gemini for Tajweed rules
    let tajweedRules: any[] = [];
    let processedWithAI = false;

    const analysisPrompt = `قم بإجراء تحليل تجويدي مخصص وعميق ومكتوب باللغة العربية للآية الكريمة التالية:
الآية: "${uthmaniText}"

يرجى إيجاد واستخراج الكلمتين أو الثلاث التي تحتوي على أحكام تجويدية بارزة (مثل: أحكام النون الساكنة والتنوين، أحكام الميم الساكنة، المدود، القلقلة، التفخيم والترقيق، الغنة والشدة).

يجب أن ترجع إجابتك بالكامل بصيغة JSON صالحة ونظيفة كالتالي دون أي نصوص تمهيدية أو ختامية أو إفساد للصيغة:
{
  "rules": [
    { "word": "الكلمة", "rule": "الحكم بالتفصيل", "category": "noon_sakinah", "description": "شرح مبسط للحكم هنا" }
  ]
}`;

    if (process.env.GROQ_API_KEY) {
      try {
        const result = await queryGroq([{ role: "user", content: analysisPrompt }], "You must output purely valid JSON without any markdown formatting wrappers (like ```json) or thinking blocks.");
        let jsonStr = result.text.trim();
        // Handle potential thinking tags from DeepSeek R1
        if (jsonStr.includes("</thought>")) {
          jsonStr = jsonStr.split("</thought>")[1].trim();
        }
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```json|```$/g, "").trim();
        }
        const data = JSON.parse(jsonStr);
        if (data.rules && Array.isArray(data.rules)) {
          tajweedRules = data.rules;
          processedWithAI = true;
        }
      } catch (groqErr) {
        console.error("Groq dynamic tajweed analysis failed, falling back...", groqErr);
      }
    }

    if (!processedWithAI && process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();
        const apiResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: analysisPrompt,
          config: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        });
        const rText = apiResponse.text || "{}";
        const data = JSON.parse(rText);
        if (data.rules && Array.isArray(data.rules)) {
          tajweedRules = data.rules;
          processedWithAI = true;
        }
      } catch (gemErr) {
        console.error("Gemini fallback tajweed analysis failed:", gemErr);
      }
    }

    // Default static fallback rules if both AI providers are offline/failed
    if (tajweedRules.length === 0) {
      tajweedRules = [
        { word: uthmaniText.split(" ")[0] || "الآية", rule: "مد طبيعي", category: "mudood", description: "أحكام المد الطبيعي المعتادة بمقدار حركتين في تنقل الكلمات." },
        { word: uthmaniText.split(" ")[1] || "الآية", rule: "إظهار حلقي أو إدغام", category: "noon_sakinah", description: "تحقيق مخارج الحروف الشفوية والحلقية في سياق الآية الكريمة." }
      ];
    }

    res.json({
      number: verseNumber,
      textUthmani: uthmaniText,
      textSimple: cleanUthmani,
      translation: translationText,
      tajweedRules: tajweedRules,
      audioUrl: audioUrl
    });

  } catch (err: any) {
    console.error("Quran Verse API Error:", err);
    res.status(500).json({ error: err.message || "فشل الحصول على الآية الكريمة وتحليلها." });
  }
});

// Main Academic Chat with Groq-Rotation & Gemini-Fallback
app.post("/api/chat", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { message, previousMessages = [], customMemory = "" } = req.body;
    if (!message) {
      res.status(400).json({ error: "Message content is required" });
      return;
    }

    // Embed learning data in system prompt
    const enrichedSystemInstruction = customMemory
      ? `${ISLAM_AI_SYSTEM_INSTRUCTION}\n\n[📚 الذاكرة المعرفية الذاتية الإضافية التي تعلّمتها وتشملها في فهمك وإجاباتك (التعلم السريع والذاتي)]: \n${customMemory}`
      : ISLAM_AI_SYSTEM_INSTRUCTION;

    const formattedContentsForGemini = [
      ...previousMessages.map((msg: any) => ({
        role: msg.senderIndex === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      })),
      { role: "user", parts: [{ text: message }] }
    ];

    const formattedMessagesForGroq = [
      ...previousMessages.map((msg: any) => ({
        role: msg.senderIndex === "user" ? "user" : "assistant",
        content: msg.text
      })),
      { role: "user", content: message }
    ];

    // Method 1: Ask Groq with Multi-Model Rotation
    if (process.env.GROQ_API_KEY) {
      try {
        const result = await queryGroq(formattedMessagesForGroq, enrichedSystemInstruction);
        res.json({
          text: result.text,
          modelUsed: result.modelUsed,
          rotationLog: result.rotationLog
        });
        return;
      } catch (groqErr: any) {
        console.error("Groq Rotation failed, falling back to Gemini...", groqErr);
      }
    }

    // Method 2: Ask Gemini Fallback
    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContentsForGemini,
        config: {
          systemInstruction: enrichedSystemInstruction,
          temperature: 0.3,
        }
      });
      res.json({
        text: response.text || "لم أتمكن من تكوين إجابة.",
        modelUsed: "gemini-3.5-flash (إحتياطي)",
        rotationLog: ["⚠️ تم تفعيل طاقم البقاء والمستوى الاحتياطي Gemini بنجاح لعدم توفر Groq."]
      });
      return;
    }

    // Method 3: Local Intelligent DB Responses for Offline App Demo
    res.json({
      text: `بسم الله الرحمن الرحيم
السلام عليكم ورحمة الله وبركاته
أنا إسلام AI — مساعدك الإسلامي الأكاديمي الشامل
تأسس بواسطة: KHEDIM BENYAKHLEF DIT BENY-JOE — المحمدية، معسكر، الجزائر

أهلاً بك يا رفيقي الكريم! يرجى تهيئة مفتاح \`GROQ_API_KEY\` في لوحة الإعدادات (**Settings > Secrets**) لتفعيل الذكاء الاصطناعي الأكاديمي بنظام تداول وتناوب الموديلات بين 6 نماذج متكاملة لـ Groq API (بما فيها نموذج تتبع التفكير DeepSeek R1) و Whisper!

يمكنك تجربة جميع الوحدات المدمجة محلياً بدون قيود بما فيها تضبيط تلاوات القرآن لـ 114 سورة بشكل فوري والتسجيل وبناء الذاكرة الذاتية للتعلم!

معلومات إضافية مستقاة من الذاكرة الحالية الممررة:
${customMemory ? `📌 [الذاكرة النشطة]: ${customMemory.slice(0, 300)}...` : "❌ لا توجد كتب أو ملفات ممررة في الذاكرة حالياً."}

والله أعلم — وصلى الله على نبينا محمد`,
      modelUsed: "قاعدة المعرفة الحية للأجهزة المحلية",
      rotationLog: ["🛑 تعذر تفعيل خوادم الذكاء الاصطناعي السحابية؛ تم تحميل المعرفة الحية للمخزن المدمج."]
    });

  } catch (error: any) {
    console.error("Chat Server Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with Assistant" });
  }
});

// Custom Ibn Sirin dream interpreter with Groq multi-model support
app.post("/api/dream-interpret", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { dreamText, userState, symbols } = req.body;
    if (!dreamText) {
      res.status(400).json({ error: "Dream description is required" });
      return;
    }

    const dreamPrompt = `يرجى تفسير الحلم التالي بناءً على منهج الإمام محمد بن سيرين في كتاب تعبير الأحلام:
نص الحلم: "${dreamText}"
الحالة الروحية والاجتماعية للرائي: "${userState}"
الرموز المقترحة الملحوظة: "${symbols || "تحديد تلقائي"}"

التزم تماماً بالصيغة الهيكلية واللغوية الرسمية التالية في ردك باللغة العربية:

بسم الله الرحمن الرحيم
السلام عليكم ورحمة الله وبركاته
أنا إسلام AI — مساعدك الإسلامي الأكاديمي الشامل
تأسس بواسطة: KHEDIM BENYAKHLEF DIT BENY-JOE — المحمدية، معسكر، الجزائر

🌙 الرؤيا: [ملخص الرؤيا بلغة دافئة مع تعبير الرائي]
📚 مرجع ابن سيرين: [الباب أو الفصل المقدر المعني في كتاب تعبير الأحلام]
🔍 الرموز المكتشفة:
   • [الرمز الأول] ← معناه: [تفسير الرمز بناء على السياق]
   • [الرمز الثاني] ← معناه: [تفسير الرمز]
💡 التفسير الكلي: [تحليل نفسي وروحي متناسق مع حالة الرائي بدون إعطاء غيب جازم أو تنبؤات قطعية]
🤲 التوصية الروحية: [توصية بالذكر، الاستغفار، الصدقة أو الصلاة مع دعاء مأثور مناسب]
⚠️ تنبيه: تفسير الأحلام علم دقيق واسترشادي عام، ولا يمثل قطعيات أو غيباً مطلقا، ويُستأنس به.

والله أعلم — وصلى الله على نبينا محمد`;

    if (process.env.GROQ_API_KEY) {
      try {
        const result = await queryGroq([{ role: "user", content: dreamPrompt }], ISLAM_AI_SYSTEM_INSTRUCTION);
        res.json({ interpretation: result.text, modelUsed: result.modelUsed, rotationLog: result.rotationLog });
        return;
      } catch (err) {
        console.error("Groq failed for dream, falling back...");
      }
    }

    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: dreamPrompt,
        config: { systemInstruction: ISLAM_AI_SYSTEM_INSTRUCTION }
      });
      res.json({ interpretation: response.text });
      return;
    }

    res.json({
      interpretation: `بسم الله الرحمن الرحيم
السلام عليكم ورحمة الله وبركاته
أنا إسلام AI — مساعدك الإسلامي الأكاديمي الشامل
تأسس بواسطة: KHEDIM BENYAKHLEF DIT BENY-JOE — المحمدية، معسكر، الجزائر

🌙 **الرؤيا**: "${dreamText}"
📚 **مرجع تعبير الأحلام**: كتاب تفسير الأحلام لمحمد بن سيرين.
🔍 **الرموز المكتشفة**:
   - رمز رئيسي متعلق بالسياق المعبر للرائي وحالته الروحية والاجتماعية (${userState}).

💡 **التفسير الكلي (محاكاة محليّة)**:
أهلاً بك يا أخي/أختي الكريمة. في تفسير ابن سيرين، تعبر هذه الرؤيا إجمالاً عن تيسير في الأحوال وطلب الرزق والسكينة الروحية. نظراً لعدم توفر مفتاح الذكاء السحابي حالياً، فإننا نستخلص أن رؤياك إذا كانت طيبة ولم يشُبها جزع، فهي تندرج تحت قوله ﷺ: "الرؤيا الصالحة من الله" (البخاري: 6984). ننصحك بالمواظبة على السنن وأذكار النوم والتحصين بالمعوذتين.

والله أعلم — وصلى الله على نبينا محمد`
    });

  } catch (error: any) {
    console.error("Dream Interpretation Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during interpretation" });
  }
});

// Translate generic Islamic response texts dynamically (supporting French, English, Turkish, Persian, etc.)
app.post("/api/translate", async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) {
      res.status(400).json({ error: "Text and targetLang are required" });
      return;
    }

    const translationPrompt = `Translate the following Islamic educational / academic text into ${targetLang}. 
For Quranic verses and Hadith texts that are in Arabic, KEEP the original Arabic text in double quotes inside the translation as they are sacred, and write the translation of that verse right after it.
Maintain all bullet points, spacing, and structural formatting. 
Your response must only contain the translated text. Do not add any introductory, meta-commentary, or outro remarks.

Text to translate:
"${text}"`;

    if (process.env.GROQ_API_KEY) {
      try {
        const result = await queryGroq([{ role: "user", content: translationPrompt }], "You are a professional academic translator of Islamic jurisprudence, history, and theology.");
        res.json({ translatedText: result.text });
        return;
      } catch (err) {
        console.error("Groq translation failed, falling back...", err);
      }
    }

    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: translationPrompt,
        config: {
          systemInstruction: "You are a professional academic translator of Islamic jurisprudence, history, and theology."
        }
      });
      res.json({ translatedText: response.text || text });
      return;
    }

    // Direct simple offline dictionary fallback if both AI models are offline
    let translatedText = text;
    if (targetLang.toLowerCase() === "fr" || targetLang.toLowerCase().includes("french")) {
      translatedText = `[الترجمة التقديرية بالفرنسية / Traduction Française Simulée]:\n(Le serveur de traduction en direct est hors ligne, veuillez configurer la clé API dans les paramètres)\n\n` + text;
    } else {
      translatedText = `[Estimated Translation / ${targetLang}]:\n(AI translator offline, please configure API keys in Settings secrets)\n\n` + text;
    }
    res.json({ translatedText });

  } catch (err: any) {
    console.error("Translation Endpoint Error:", err);
    res.json({ translatedText: text, error: err.message });
  }
});

// -------------------------------------------------------------
// Dev & Production Server Mounting
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nour AI - Server is running securely on http://localhost:${PORT}`);
  });
}

startServer();
