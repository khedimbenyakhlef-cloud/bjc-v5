---
title: إسلام AI
emoji: 🕌
colorFrom: yellow
colorTo: green
sdk: docker
pinned: true
license: apache-2.0
---

<div align="center">

# 🕌 إسلام AI — المساعد الإسلامي العالمي

**بواسطة KHEDIM BENYAKHLEF dit BENY-JOE — مصمّادة، معسكر، الجزائر**

مساعد إسلامي أكاديمي شامل لتعلم التجويد، الحديث، العقيدة، الفقه المذهبي، المواريث، السيرة النبوية، وإعراب القرآن الكريم.

</div>

## 📱 تثبيت التطبيق على الهاتف

افتح الرابط في **Chrome** (Android) أو **Safari** (iPhone) وستظهر لك نافذة تثبيت التطبيق تلقائياً.

## 🚀 التشغيل المحلي

```bash
npm install
# أنشئ ملف .env.local
echo "GEMINI_API_KEY=your_key" >> .env.local
echo "GROQ_API_KEY=your_key" >> .env.local
npm run dev
```

## ⚙️ المتغيرات البيئية المطلوبة

| المتغير | الوصف |
|---------|-------|
| `GEMINI_API_KEY` | مفتاح Google Gemini API |
| `GROQ_API_KEY` | مفتاح Groq API (Whisper + LLM rotation) |

## 🛠️ التقنيات المستخدمة

- React 19 + TypeScript + Vite + Tailwind CSS
- Express.js backend
- Google Gemini AI + Groq AI (multi-model rotation)
- Web Speech API + Groq Whisper (STT)
- PWA (Progressive Web App) — قابل للتثبيت على الهاتف
- HuggingFace Spaces (Docker, port 7860)

---
*والله أعلم — وصلى الله على نبينا محمد وعلى آله وصحبه أجمعين*
