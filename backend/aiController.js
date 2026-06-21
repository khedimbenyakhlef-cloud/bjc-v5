const { Groq } = require("groq-sdk");
const winston = require("winston");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);
const processManager = require("./processManager");

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

// ─── ADAPT PROJECT ────────────────────────────────────────────────────────────
async function adaptProject(req, res) {
  const { slug, name, runtime, startCommand, logs, existingEnvKeys = [] } = req.body;

  const systemInstruction = `Tu es un expert DevOps PaaS. Analyse une app et genere sa configuration complete pour qu elle fonctionne. Reponds UNIQUEMENT en JSON valide, sans markdown.`;

  const prompt = `App: "${name}" (slug: ${slug}, runtime: ${runtime})
Commande actuelle: "${startCommand || "non definie"}"
Variables deja configurees: ${existingEnvKeys.join(", ") || "aucune"}
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
    const cleaned = raw.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON non parseable");
    const parsed = JSON.parse(jsonMatch[0]);
    logger.info(\`[adapt] \${name}: \${parsed.envVars?.length || 0} vars, cmd=\${parsed.startCommand}\`);
    return res.json(parsed);
  } catch (err) {
    logger.error("adaptProject error: " + err.message);
    const fallbackCmd = runtime === "python" ? "python app.py" : runtime === "static" ? "npx serve dist" : "node server.js";
    return res.json({
      report: \`Configuration par defaut pour \${name} (runtime: \${runtime}). Verifiez les variables d environnement dans l onglet Environnement.\`,
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
  setDbPool,
  chat,
  analyzeLogs,
  repairProject,
  applyRepair,
  rotateCredentials,
  getGroqClient
};
