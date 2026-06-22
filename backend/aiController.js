const { Groq } = require("groq-sdk");
const winston = require("winston");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);
const processManager = require("./processManager");
const AdmZip = require("adm-zip");
const EnvVar = require("./EnvVar");

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

// ─── ANALYZE LOGS ────────────────────────────────────────────────────────────
async function analyzeLogs(req, res) {
  const { logs, appName, runtime } = req.body;
  
  if (!logs) {
    return res.status(400).json({ error: "Logs manquants." });
  }

  const systemInstruction = `Tu es un expert DevOps et développeur senior spécialisé en Node.js, Python et Docker.
Ton rôle est d'analyser les logs d'une application déployée sur un PaaS et de:
1. Identifier TOUTES les erreurs et leur cause racine
2. Compter le nombre d'erreurs par type
3. Proposer des solutions concrètes et précises
4. Indiquer si l'app fonctionne correctement ou non
Réponds en français, de façon structurée et concise.`;

  const prompt = `Analyse ces logs de l'application "${appName}" (runtime: ${runtime}):

${logs}

Fournis:
- Nombre d'erreurs détectées
- Liste des problèmes identifiés avec leur cause
- Solutions recommandées pour chaque problème
- Verdict final: l'app fonctionne-t-elle correctement ?`;

  try {
    const analysis = await requestLLMWithRetry(prompt, systemInstruction);
    
    // Parse si JSON, sinon retourner texte brut
    let finalAnalysis;
    try {
      const parsed = JSON.parse(analysis);
      finalAnalysis = parsed.reply || parsed.analysis || analysis;
    } catch {
      finalAnalysis = analysis;
    }
    
    return res.json({ analysis: finalAnalysis });
  } catch (err) {
    logger.error("analyzeLogs error: " + err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ─── REPAIR PROJECT ──────────────────────────────────────────────────────────
async function repairProject(req, res) {
  const { slug, name, runtime, logs, errorTypes = [] } = req.body;

  const systemInstruction = `Tu es un expert DevOps et architecte backend spécialisé en Node.js, Python et Docker deployés sur PaaS.
Ton rôle est d'analyser les logs d'une application et de générer des patches JSON précis pour corriger les problèmes.
Tu dois TOUJOURS répondre avec un JSON valide, sans markdown, sans backticks.`;

  const prompt = `Analyse cette application PaaS et génère les patches nécessaires.

App: "${name}" (slug: ${slug}, runtime: ${runtime})
Erreurs détectées: ${errorTypes.join(", ") || "voir logs"}

LOGS:
${logs}

Réponds UNIQUEMENT avec ce JSON (sans markdown):
{
  "hasPatches": true ou false,
  "report": "diagnostic en 3-5 lignes expliquant les problèmes et solutions",
  "patches": [
    {
      "type": "env_var",
      "description": "Ajouter variable manquante",
      "key": "NOM_VARIABLE",
      "value": "valeur_suggérée"
    },
    {
      "type": "server_config", 
      "description": "Description du patch",
      "file": "server.js",
      "find": "texte exact à remplacer",
      "replace": "nouveau texte"
    }
  ]
}

Types de patches possibles: env_var, server_config, package_json, restart_only
Si aucun patch nécessaire, retourne hasPatches: false et patches: []`;

  try {
    const raw = await requestLLMWithRetry(prompt, systemInstruction);
    
    // Nettoyer et parser le JSON
    let cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    // Extraire le premier objet JSON valide
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Réponse IA non parseable");
    
    const parsed = JSON.parse(jsonMatch[0]);
    return res.json(parsed);
  } catch (err) {
    logger.error("repairProject error: " + err.message);
    // Fallback : rapport générique
    return res.json({
      hasPatches: false,
      report: `Analyse automatique:
- Runtime détecté: ${runtime}
- Erreurs dans logs: ${errorTypes.join(", ") || "aucune"}

Recommandation: Vérifiez les variables d'environnement (GROQ_API_KEY) et que le fichier server.js est bien présent à la racine du projet.`,
      patches: []
    });
  }
}

// ─── APPLY REPAIR ─────────────────────────────────────────────────────────────
async function applyRepair(req, res) {
  const { appId, slug: slugFromBody, patches = [] } = req.body;

  if (!patches.length) {
    return res.json({ success: true, applied: 0, skipped: 0, message: "Aucun patch à appliquer." });
  }

  const slug = slugFromBody || `mock-app-${appId}`;
  const meta = processManager.processes.get(slug);
  const appDir = (meta && meta.appDir) || path.join("/tmp/bjc-apps", slug);

  const applied = [];
  const skipped = [];
  const errors = [];

  for (const patch of patches) {
    try {
      if (patch.type === "restart_only") {
        applied.push(patch.description || "Redémarrage planifié");
        continue;
      }

      if (patch.type === "env_var") {
        if (!patch.key) {
          skipped.push(patch.description || "env_var sans clé");
          continue;
        }
        if (meta) {
          meta.envVars = meta.envVars || {};
          meta.envVars[patch.key] = patch.value !== undefined ? patch.value : "";
          applied.push(`ENV: ${patch.key} = ${patch.value !== undefined ? patch.value : ""}`);
        } else {
          skipped.push(`ENV: ${patch.key} (process inactif, redémarrez l'app d'abord)`);
        }
        continue;
      }

      if (patch.type === "server_config" || patch.type === "package_json") {
        const fileName = patch.file || (patch.type === "package_json" ? "package.json" : null);
        if (!fileName) {
          skipped.push(patch.description || `${patch.type} sans fichier cible`);
          continue;
        }

        const safeAppDir = path.resolve(appDir);
        const targetPath = path.resolve(safeAppDir, fileName);

        if (!targetPath.startsWith(safeAppDir)) {
          skipped.push(`Chemin de fichier invalide: ${fileName}`);
          continue;
        }

        if (!fs.existsSync(targetPath)) {
          skipped.push(`Fichier introuvable: ${fileName}`);
          continue;
        }

        let content = fs.readFileSync(targetPath, "utf8");
        let fileChanged = false;

        if (patch.find && content.includes(patch.find)) {
          content = content.replace(patch.find, patch.replace !== undefined ? patch.replace : "");
          fs.writeFileSync(targetPath, content, "utf8");
          applied.push(patch.description || `Patch appliqué sur ${fileName}`);
          fileChanged = true;
        } else if (patch.dependency && patch.type === "package_json") {
          const pkg = JSON.parse(content);
          pkg.dependencies = pkg.dependencies || {};
          pkg.dependencies[patch.dependency] = patch.version || "latest";
          fs.writeFileSync(targetPath, JSON.stringify(pkg, null, 2), "utf8");
          applied.push(`Dépendance ajoutée: ${patch.dependency}@${patch.version || "latest"}`);
          fileChanged = true;
        } else {
          skipped.push(`Texte à remplacer non trouvé dans ${fileName} (${patch.description || ""})`);
        }

        if (fileChanged && patch.type === "package_json") {
          try {
            await execAsync("npm install --no-audit --no-fund", { cwd: appDir, timeout: 120000 });
            applied.push(`npm install relancé dans ${appDir}`);
          } catch (npmErr) {
            errors.push(`npm install a échoué: ${npmErr.message}`);
          }
        }
        continue;
      }

      skipped.push(patch.description || `Type de patch inconnu: ${patch.type}`);
    } catch (patchErr) {
      logger.error(`[repair] Erreur sur patch ${patch.type}: ${patchErr.message}`);
      errors.push(`${patch.description || patch.type}: ${patchErr.message}`);
    }
  }

  logger.info(`[repair] Applied ${applied.length}, skipped ${skipped.length}, errors ${errors.length} for slug ${slug}`);

  return res.json({
    success: errors.length === 0,
    applied: applied.length,
    skipped: skipped.length,
    message: `${applied.length} patch(es) réellement appliqué(s).` +
      (skipped.length ? ` ${skipped.length} ignoré(s).` : "") +
      (errors.length ? ` ${errors.length} erreur(s).` : ""),
    appliedList: applied,
    skippedList: skipped,
    errorList: errors
  });
}

let pgClientPool = null;
function setDbPool(pool) { pgClientPool = pool; }

// ─── GENERATE PROJECT FROM PROMPT ────────────────────────────────────────────
async function generateProject(req, res) {
  const { prompt, projectName, runtime = "nodejs" } = req.body;

  if (!prompt) return res.status(400).json({ error: "Prompt requis" });

  const systemInstruction = `Tu es un expert développeur full-stack. Tu génères des applications web complètes et fonctionnelles en Node.js/Express.
Tu réponds UNIQUEMENT avec du JSON valide contenant les fichiers du projet. Pas de markdown, pas d'explication.`;

  const userPrompt = `Génère une application web complète nommée "${projectName || "mon-app"}" qui fait: ${prompt}

Réponds UNIQUEMENT avec ce JSON (sans markdown):
{
  "files": {
    "server.js": "// code complet du serveur Express\nconst express = require('express');\n...",
    "package.json": "{\"name\": \"${projectName || "mon-app"}\", \"version\": \"1.0.0\", \"main\": \"server.js\", \"scripts\": {\"start\": \"node server.js\"}, \"dependencies\": {\"express\": \"^4.18.0\"}}",
    "public/index.html": "<!DOCTYPE html>..."
  },
  "startCommand": "node server.js",
  "description": "description courte du projet généré"
}

RÈGLES:
- server.js DOIT écouter sur process.env.PORT || 3000
- Inclure toujours package.json et server.js
- Code COMPLET et FONCTIONNEL, pas de placeholder
- Interface HTML dans public/index.html avec CSS inline moderne`;

  try {
    const raw = await requestLLMWithRetry(userPrompt, systemInstruction);
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON non parseable");

    const parsed = JSON.parse(jsonMatch[0]);

    // Écrire les fichiers dans /tmp/bjc-apps/:slug/
    const slug = (projectName || "gen-app").toLowerCase().replace(/[^a-z0-9]/g, "-");
    const targetDir = require("path").join("/tmp/bjc-apps", slug);
    require("fs").mkdirSync(targetDir, { recursive: true });

    for (const [filePath, content] of Object.entries(parsed.files || {})) {
      const fullPath = require("path").join(targetDir, filePath);
      require("fs").mkdirSync(require("path").dirname(fullPath), { recursive: true });
      require("fs").writeFileSync(fullPath, content, "utf-8");
    }

    logger.info(`[generate] Project '${slug}' generated with ${Object.keys(parsed.files || {}).length} files`);

    return res.json({
      success: true,
      slug,
      files: Object.keys(parsed.files || {}),
      startCommand: parsed.startCommand || "node server.js",
      description: parsed.description || "",
      targetDir
    });

  } catch (err) {
    logger.error("generateProject error: " + err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ─── ADAPT PROJECT ────────────────────────────────────────────────────────────
const generationJobs = new Map();

function createGenerationJob() {
  const jobId = "gen_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  generationJobs.set(jobId, {
    status: "pending",
    progress: 0,
    stage: "queued",
    message: "En attente...",
    result: null,
    error: null,
    createdAt: Date.now()
  });
  setTimeout(function() { generationJobs.delete(jobId); }, 30 * 60 * 1000);
  return jobId;
}

function updateGenerationJob(jobId, patch) {
  const job = generationJobs.get(jobId);
  if (!job) return;
  Object.assign(job, patch);
}

async function generateWithExtendedBudget(prompt, systemInstruction, opts) {
  opts = opts || {};
  const maxTokens = opts.maxTokens || 4096;
  const timeoutMs = opts.timeoutMs || 120000;
  let attempts = 0;
  const maxAttempts = Math.max(GROQ_KEYS.length, 2);

  while (attempts < maxAttempts) {
    attempts++;
    const client = getGroqClient();
    if (!client) return simulateCompletion(prompt, systemInstruction);
    try {
      const activeModel = MODELS[modelIndex];
      const chatCompletion = await client.chat.completions.create(
        {
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ],
          model: activeModel,
          temperature: 0.3,
          max_tokens: maxTokens
        },
        { timeout: timeoutMs }
      );
      return chatCompletion.choices[0]?.message?.content || "";
    } catch (err) {
      logger.error("[generateWithExtendedBudget] error: " + err.message);
      rotateCredentials();
      if (attempts >= maxAttempts) throw err;
    }
  }
  throw new Error("Echec apres plusieurs tentatives.");
}

// ─── DETECTION DU RUNTIME A PARTIR DU PROJET DE BASE (fichiers ou zip) ──────
function detectRuntimeFromFiles(names, filesMap) {
  const lower = names.map(function(n) { return n.toLowerCase(); });
  if (lower.indexOf("requirements.txt") !== -1 || lower.some(function(n) { return n.endsWith(".py"); })) {
    return "python";
  }
  if (lower.indexOf("package.json") !== -1) {
    const pkg = String((filesMap || {})["package.json"] || "");
    return pkg.indexOf("\"express\"") !== -1 ? "express" : "nodejs";
  }
  if (lower.indexOf("index.html") !== -1 && !lower.some(function(n) { return n.endsWith(".js"); })) {
    return "static";
  }
  return "nodejs";
}

const BASE_PROJECT_TEXT_EXTENSIONS = [".js", ".json", ".html", ".htm", ".css", ".py", ".txt", ".ts", ".tsx", ".jsx", ".md", ".yml", ".yaml", ".env"];

// ─── EXTRACTION D'UNE ARCHIVE ZIP DE PROJET DE BASE (fournie en base64) ─────
function extractBaseProjectZip(base64Data) {
  const cleaned = String(base64Data || "").replace(/^data:.*?;base64,/, "");
  const buffer = Buffer.from(cleaned, "base64");
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const files = {};
  let budget = 60000;
  let skippedBinary = 0;

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.replace(/^\/+/, "");
    const parts = name.split("/");
    if (parts.some(function(p) { return p === "node_modules" || p === ".git" || p === "__pycache__" || p === "venv"; })) continue;
    const dot = name.lastIndexOf(".");
    const ext = dot === -1 ? "" : name.slice(dot).toLowerCase();
    if (BASE_PROJECT_TEXT_EXTENSIONS.indexOf(ext) === -1) { skippedBinary++; continue; }
    if (budget <= 0) continue;
    let content;
    try { content = entry.getData().toString("utf-8"); } catch (e) { continue; }
    content = content.slice(0, Math.max(0, budget));
    budget -= content.length;
    files[name] = content;
  }

  return { files: files, skippedBinary: skippedBinary, totalEntries: entries.length };
}

async function startGenerateProjectJob(req, res) {
  const jobId = createGenerationJob();
  res.json({ jobId: jobId });
  const userId = req.user ? req.user.id : null;
  const jobBody = Object.assign({}, req.body, { userId: userId });
  runGenerateProjectJob(jobId, jobBody).catch(function(err) {
    updateGenerationJob(jobId, { status: "error", error: err.message, message: "Erreur: " + err.message });
  });
}

async function runGenerateProjectJob(jobId, body) {
  const prompt = body.prompt;
  const projectName = body.projectName;
  const userId = body.userId || null;
  let baseProjectFiles = body.baseProjectFiles || {};

  updateGenerationJob(jobId, { status: "running", stage: "analyse", progress: 8, message: "Analyse du prompt..." });

  // ── Si une archive ZIP de projet de base a ete fournie, on l'extrait d'abord ──
  if (body.baseProjectZip) {
    updateGenerationJob(jobId, { stage: "base_project", progress: 14, message: "Extraction de l'archive ZIP fournie..." });
    try {
      const extracted = extractBaseProjectZip(body.baseProjectZip);
      baseProjectFiles = Object.assign({}, extracted.files, baseProjectFiles);
      updateGenerationJob(jobId, { progress: 18, message: extracted.totalEntries + " fichier(s) dans le ZIP, " + Object.keys(extracted.files).length + " retenu(s) pour analyse (" + extracted.skippedBinary + " binaire(s) ignore(s))." });
    } catch (err) {
      logger.error("[generate-job] extraction zip echouee: " + err.message);
      updateGenerationJob(jobId, { progress: 18, message: "Archive ZIP illisible, generation a partir du prompt seul." });
    }
  }

  const baseFileNames = Object.keys(baseProjectFiles);
  const detectedRuntime = baseFileNames.length > 0 ? detectRuntimeFromFiles(baseFileNames, baseProjectFiles) : (body.runtime || "nodejs");

  let baseSummary = "";
  if (baseFileNames.length > 0) {
    updateGenerationJob(jobId, { stage: "base_project", progress: 22, message: baseFileNames.length + " fichier(s) de base en cours d'etude (runtime detecte : " + detectedRuntime + ")..." });
    baseSummary = "\n\nPROJET DE BASE FOURNI PAR L'UTILISATEUR (a etudier et a etendre, NE PAS repartir de zero):\n";
    let budget = 6000;
    for (const fname of baseFileNames) {
      const content = String(baseProjectFiles[fname] || "");
      const slice = content.slice(0, Math.max(0, budget));
      baseSummary += "\n--- FICHIER: " + fname + " ---\n" + slice + "\n";
      budget -= slice.length;
      if (budget <= 0) break;
    }
  } else {
    updateGenerationJob(jobId, { stage: "base_project", progress: 22, message: "Aucun projet de base fourni, generation a partir de zero (runtime: " + detectedRuntime + ")." });
  }

  const runtimeGuidance = detectedRuntime === "python"
    ? "Tu generes une application Python complete (FastAPI ou Flask). Le fichier principal doit s'appeler app.py et ecouter sur 0.0.0.0 via la variable d'environnement PORT. Inclue toujours requirements.txt."
    : detectedRuntime === "static"
      ? "Tu generes un site statique HTML/CSS/JS pur, sans serveur backend necessaire. Le fichier principal est index.html."
      : "Tu generes une application Node.js/Express complete. server.js DOIT ecouter sur process.env.PORT || 3000. Inclue toujours package.json et server.js.";

  const exampleFiles = detectedRuntime === "python"
    ? "{ \"app.py\": \"...\", \"requirements.txt\": \"...\" }"
    : detectedRuntime === "static"
      ? "{ \"index.html\": \"...\", \"style.css\": \"...\", \"script.js\": \"...\" }"
      : "{ \"server.js\": \"...\", \"package.json\": \"...\", \"public/index.html\": \"...\" }";

  const defaultStartCmd = detectedRuntime === "python" ? "python3 app.py" : detectedRuntime === "static" ? "npx serve ." : "node server.js";

  const systemInstruction = "Tu es un expert developpeur full-stack. " + runtimeGuidance + " " +
    (baseFileNames.length > 0 ? "Un projet de base est fourni: tu DOIS partir de ce code existant et l'etendre/corriger selon la demande, pas repartir de zero. " : "") +
    "Tu reponds UNIQUEMENT avec du JSON valide contenant les fichiers du projet. Pas de markdown, pas d'explication.";

  const userPrompt = "Genere une application complete nommee \"" + (projectName || "mon-app") + "\" qui fait: " + prompt + baseSummary + "\n\n" +
    "Reponds UNIQUEMENT avec ce JSON (sans markdown):\n" +
    "{\n" +
    "  \"files\": " + exampleFiles + ",\n" +
    "  \"startCommand\": \"" + defaultStartCmd + "\",\n" +
    "  \"description\": \"description courte du projet genere\"\n" +
    "}\n\n" +
    "REGLES:\n" +
    "- Code COMPLET et FONCTIONNEL, pas de placeholder\n" +
    "- " + runtimeGuidance;

  updateGenerationJob(jobId, { stage: "ia_generation", progress: 35, message: "Generation du code par l'IA en cours (jusqu'a 2 minutes)..." });

  let raw;
  try {
    raw = await generateWithExtendedBudget(userPrompt, systemInstruction, { maxTokens: 4096, timeoutMs: 120000 });
  } catch (err) {
    updateGenerationJob(jobId, { status: "error", stage: "ia_generation", message: "Erreur IA: " + err.message, error: err.message });
    return;
  }

  updateGenerationJob(jobId, { stage: "parsing", progress: 65, message: "Analyse de la reponse IA..." });

  const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    updateGenerationJob(jobId, { status: "error", stage: "parsing", message: "Reponse IA non parseable.", error: "JSON non parseable" });
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    updateGenerationJob(jobId, { status: "error", stage: "parsing", message: "JSON invalide: " + err.message, error: err.message });
    return;
  }

  updateGenerationJob(jobId, { stage: "writing_files", progress: 78, message: "Ecriture des fichiers sur disque..." });

  const slug = (projectName || "gen-app").toLowerCase().replace(/[^a-z0-9]/g, "-");
  const targetDir = path.join("/tmp/bjc-apps", slug);
  fs.mkdirSync(targetDir, { recursive: true });

  const fileList = Object.keys(parsed.files || {});
  let written = 0;
  for (const [filePath, content] of Object.entries(parsed.files || {})) {
    const fullPath = path.join(targetDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
    written++;
    updateGenerationJob(jobId, { progress: 78 + Math.round((written / Math.max(fileList.length, 1)) * 10), message: "Fichier ecrit: " + filePath });
  }

  logger.info("[generate-job] Project '" + slug + "' generated with " + fileList.length + " files (job " + jobId + ")");

  const startCommand = parsed.startCommand || defaultStartCmd;
  const description = parsed.description || "";

  // ── PHASE 2 : PAS DE DEPLOY AUTOMATIQUE
  // Le code est genere et ecrit sur disque. L'utilisateur inspecte les fichiers
  // via les boutons Code/Viz du dashboard, puis clique "Deployer maintenant".
  // La creation de l'app en DB + le demarrage du process sont faits par /api/apps/:appId/deploy.

  // On insere quand meme l'app en DB en statut "generated" pour avoir un appId
  // que le bouton Deploy pourra utiliser.
  let appId = null;
  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const queryRes = await client.query(
          "INSERT INTO apps (name, slug, user_id, app_type, runtime, start_command, build_command, status) " +
          "VALUES ($1, $2, $3, $4, $5, $6, $7, 'generated') RETURNING *",
          [projectName || slug, slug, userId, detectedRuntime === "static" ? "static" : "dynamic", detectedRuntime, startCommand, null]
        );
        appId = queryRes.rows[0] && queryRes.rows[0].id;
      } finally {
        client.release();
      }
    } else {
      appId = "app-" + Date.now();
    }
  } catch (err) {
    logger.warn("[generate-job] insertion app en DB echouee (non bloquant): " + err.message);
    appId = "tmp-" + slug;
  }

  updateGenerationJob(jobId, {
    status: "done",
    stage: "done",
    progress: 100,
    message: "Code genere avec succes — en attente de ta validation pour deployer.",
    result: {
      success: true,
      slug: slug,
      appId: appId,
      files: fileList,
      startCommand: startCommand,
      description: description,
      runtime: detectedRuntime,
      targetDir: targetDir,
      deployed: false,
      readyToDeploy: true
    }
  });
}

function getGenerationJobStatus(req, res) {
  const job = generationJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job introuvable ou expire." });
  res.json(job);
}

async function adaptProject(req, res) {
  const { slug, name, runtime, startCommand, logs, existingEnvKeys = [], customInstructions = "" } = req.body;

  const systemInstruction = `Tu es un expert DevOps PaaS. Analyse une app et genere sa configuration complete pour qu elle fonctionne. Si l'utilisateur fournit des instructions specifiques, elles sont PRIORITAIRES sur ton propre jugement et tu DOIS les respecter dans ta reponse (runtime, startCommand, envVars). Reponds UNIQUEMENT en JSON valide, sans markdown.`;

  const prompt = `App: "${name}" (slug: ${slug}, runtime: ${runtime})
Commande actuelle: "${startCommand || "non definie"}"
Variables deja configurees: ${existingEnvKeys.join(", ") || "aucune"}
${customInstructions ? "INSTRUCTIONS SPECIFIQUES DE L'UTILISATEUR (PRIORITAIRES, A RESPECTER STRICTEMENT):\n" + customInstructions + "\n" : ""}
LOGS: ${logs || "aucun log"}

Reponds UNIQUEMENT avec ce JSON:
{
  "report": "Analyse en 4 lignes: problemes detectes et ce que tu corriges",
  "runtime": "nodejs",
  "startCommand": "node server.js",
  "envVars": [
    { "key": "PORT", "value": "3000", "required": true },
    { "key": "API_KEY", "value": "", "required": true }
  ]
}
REGLES: si logs montrent Cannot find module X -> startCommand doit pointer vers le bon fichier. Si EADDRINUSE -> utiliser process.env.PORT. value vide = a remplir manuellement.`;

  try {
    const raw = await requestLLMWithRetry(prompt, systemInstruction);
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON non parseable");
    const parsed = JSON.parse(jsonMatch[0]);
    logger.info(`[adapt] ${name}: ${parsed.envVars?.length || 0} vars, cmd=${parsed.startCommand}`);
    return res.json(parsed);
  } catch (err) {
    logger.error("adaptProject error: " + err.message);
    const fallbackCmd = runtime === "python" ? "python app.py" : runtime === "static" ? "npx serve dist" : "node server.js";
    return res.json({
      report: `Configuration par defaut pour ${name} (runtime: ${runtime}). Verifiez les variables d environnement dans l onglet Environnement.`,
      runtime,
      startCommand: fallbackCmd,
      envVars: [
        { key: "PORT", value: "3000", required: true },
        { key: "NODE_ENV", value: "production", required: true }
      ]
    });
  }
}

module.exports = {
  suggest,
  adaptProject,
  generateProject,
  setDbPool,
  chat,
  analyzeLogs,
  repairProject,
  applyRepair,
  rotateCredentials,
  getGroqClient
};


module.exports.startGenerateProjectJob = startGenerateProjectJob;
module.exports.getGenerationJobStatus = getGenerationJobStatus;
