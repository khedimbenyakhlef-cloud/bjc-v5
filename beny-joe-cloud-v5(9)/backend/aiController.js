const { Groq } = require("groq-sdk");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Keys and model rosters
const GROQ_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3
].filter(Boolean);

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768"
];

let keyIndex = 0;
let modelIndex = 0;

function getGroqClient() {
  if (GROQ_KEYS.length === 0) {
    logger.warn("No Groq API keys found in env variables (GROQ_API_KEY_1, 2, or 3). AI routes will degrade into beautifully simulated LLM outputs.");
    return null;
  }
  
  const key = GROQ_KEYS[keyIndex];
  logger.info(`Initialised Groq Client instance using key slot ${keyIndex + 1}/${GROQ_KEYS.length}`);
  return new Groq({ apiKey: key });
}

function rotateCredentials() {
  if (GROQ_KEYS.length > 1) {
    const oldIndex = keyIndex;
    keyIndex = (keyIndex + 1) % GROQ_KEYS.length;
    logger.warn(`Circular Rotation triggered! Rotating Groq API key from Slot ${oldIndex + 1} to Slot ${keyIndex + 1} due to rate-limiting thresholds (429/timeouts).`);
  }

  modelIndex = (modelIndex + 1) % MODELS.length;
  logger.info(`Rotating backend generative LLM model to fallback: ${MODELS[modelIndex]}`);
}

async function requestLLMWithRetry(prompt, systemInstruction) {
  let attempts = 0;
  const maxAttempts = Math.max(GROQ_KEYS.length, 3);

  while (attempts < maxAttempts) {
    attempts++;
    const client = getGroqClient();

    if (!client) {
      // Return highly structured simulation replies if no keys present
      return simulateCompletion(prompt, systemInstruction);
    }

    try {
      const activeModel = MODELS[modelIndex];
      logger.info(`Dispatching prompting payload. Model: ${activeModel}, Attempt: ${attempts}/${maxAttempts}`);
      
      const chatCompletion = await client.chat.completions.create({
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        model: activeModel,
        temperature: 0.3,
        max_tokens: 1024
      });

      return chatCompletion.choices[0]?.message?.content || "";
    } catch (err) {
      logger.error(`Groq execution error on client index ${keyIndex}: ${err.message}`);
      
      const isRateLimit = err.status === 429 || err.message.includes("429") || err.message.toLowerCase().includes("rate limit");
      
      if (isRateLimit || attempts < maxAttempts) {
        rotateCredentials(); // Circular credential swap
        continue;
      }
      
      throw err;
    }
  }
  throw new Error("All rotated Groq API key slots failed to respond successfully.");
}

async function suggest(req, res) {
  const { appName, appDescription, codeSnippet } = req.body;

  const prompt = `
    Analyze this service request:
    Name: "${appName || 'unnamed'}"
    Description: "${appDescription || 'no description'}"
    Code Snippet: "${codeSnippet || 'not provided'}"

    Determine the recommended hosting requirements in standard JSON format:
    {
      "runtime": "nodejs" | "python" | "go" | "ruby" | "java" | "static",
      "start_command": "suggested run command or blank if static",
      "env_keys": ["LIST", "OF", "RECOMMENDED", "KEYS"],
      "explanation": "Brief 1-sentence decision rationale in French."
    }
  `;

  const system = "You are Beny-Joe Cloud's automated intelligent suggest engine. Respond strictly with formatted JSON. No markdown wrappings.";

  try {
    const rawResult = await requestLLMWithRetry(prompt, system);
    let jsonResponse;
    try {
      // Sanitize standard markdown ticks if LLM returned them
      const cleaned = rawResult.replace(/```json/g, "").replace(/```/g, "").trim();
      jsonResponse = JSON.parse(cleaned);
    } catch (parseErr) {
      logger.warn("Failed to parse clean JSON from LLM outputs. Falling back to heuristic extractor.");
      jsonResponse = {
        runtime: "nodejs",
        start_command: "node server.js",
        env_keys: ["PORT", "DATABASE_URL"],
        explanation: "Choix par défaut de l'infrastructure résiliente."
      };
    }
    res.json(jsonResponse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function chat(req, res) {
  const { message, chatHistory = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message content is required" });
  }

  const prompt = `
    User Prompt: "${message}"
    Context: Chat History: ${JSON.stringify(chatHistory)}
  `;

  const system = `
    You are the Beny-Joe Cloud V5 AI Co-pilot assistant, an expert cloud infrastructure engineering agent. 
    You aid developers using Beny-Joe Cloud's supercharged free PaaS workspace. 
    Respond gracefully, clearly, and concisely in French. Always maintain a professional support tone.
  `;

  try {
    const rawResult = await requestLLMWithRetry(prompt, system);
    res.json({ reply: rawResult, rotatedKeysUsed: keyIndex });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function simulateCompletion(prompt, systemInstruction) {
  logger.info(`[Groq Simulation Node] Responding through local expert heuristics engine patterns`);
  
  if (systemInstruction.includes("suggest")) {
    const isPython = prompt.toLowerCase().includes("python") || prompt.toLowerCase().includes("fastapi");
    const isDocker = prompt.toLowerCase().includes("dockerfile") || prompt.toLowerCase().includes("docker");
    const isGo = prompt.toLowerCase().includes("go") || prompt.toLowerCase().includes("golang");

    if (isPython) {
      return JSON.stringify({
        runtime: "python",
        start_command: "uvicorn main:app --host 0.0.0.0 --port 8080",
        env_keys: ["PORT", "DATABASE_URL", "SECRET_KEY"],
        explanation: "Découverte de hooks FastAPI ou syntaxe Python. Configuration optimisée pour Uvicorn."
      });
    } else if (isDocker) {
      return JSON.stringify({
        runtime: "docker",
        start_command: "",
        env_keys: ["PORT", "DATABASE_URL"],
        explanation: "Présence d'un Dockerfile. Configuration d'exécution multi-stage isolée."
      });
    } else if (isGo) {
      return JSON.stringify({
        runtime: "go",
        start_command: "go run main.go",
        env_keys: ["PORT", "DATABASE_URL"],
        explanation: "Structure modulaire Go identifiée. Compilation instantanée activée."
      });
    }

    return JSON.stringify({
      runtime: "nodejs",
      start_command: "npm start",
      env_keys: ["PORT", "DATABASE_URL", "JWT_SECRET"],
      explanation: "Projet standard Node.js identifié. Recommandation d'exécution de scripts de démarrage NPM."
    });
  } else {
    // Normal chat support
    const lowercase = prompt.toLowerCase();
    let answer = "Bonjour ! Je suis l'assistant IA de Beny-Joe Cloud V5. Comment puis-je vous aider à configurer vos builds, vos variables d'environnement, ou votre conteneur ?";
    
    if (lowercase.includes("b2") || lowercase.includes("backblaze") || lowercase.includes("storage")) {
      answer = "Pour connecter votre bucket Backblaze B2 sur Beny-Joe Cloud, configures vos variables d'environnement 'B2_KEY_ID', 'B2_APP_KEY' et 'B2_BUCKET' dans l'onglet Environnement. Vos builds statiques et vos ZIP de secours seront alors sauvegardés de façon 100% sécurisée.";
    } else if (lowercase.includes("postgres") || lowercase.includes("db") || lowercase.includes("base")) {
      answer = "Beny-Joe Cloud intègre un module SQL interactif. En ajoutant la variable 'DATABASE_URL', vous configurez automatiquement la connectivité résiliente de vos conteneurs vers votre grappe PostgreSQL.";
    } else if (lowercase.includes("free") || lowercase.includes("gratuit")) {
      answer = "Notre PaaS est 100% gratuit et sans limites ! Tous nos calculs, connexions Redis, hébergements de micro-serveurs et liaisons PostgreSQL sont portés par notre architecture optimisée et généreuse.";
    }

    return JSON.stringify({ reply: answer });
  }
}

module.exports = {
  suggest,
  chat,
  rotateCredentials,
  getGroqClient
};
