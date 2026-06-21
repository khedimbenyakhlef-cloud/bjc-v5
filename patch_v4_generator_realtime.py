import sys

def patch(path, anchor, replacement, label):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    count = content.count(anchor)
    if count == 0:
        print("[ECHEC] " + label + " -- ancre introuvable dans " + path)
        return False
    if count > 1:
        print("[ECHEC] " + label + " -- ancre ambigue (" + str(count) + " occurrences) dans " + path)
        return False
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.replace(anchor, replacement))
    print("[OK]    " + label)
    return True

results = {}

# ============================================================
# 1) aiController.js -- systeme de job async + progress + base project
# ============================================================
ANCHOR_AI = """async function adaptProject(req, res) {"""

REPLACE_AI = """const generationJobs = new Map();

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

async function startGenerateProjectJob(req, res) {
  const jobId = createGenerationJob();
  res.json({ jobId: jobId });
  runGenerateProjectJob(jobId, req.body).catch(function(err) {
    updateGenerationJob(jobId, { status: "error", error: err.message, message: "Erreur: " + err.message });
  });
}

async function runGenerateProjectJob(jobId, body) {
  const prompt = body.prompt;
  const projectName = body.projectName;
  const runtime = body.runtime || "nodejs";
  const baseProjectFiles = body.baseProjectFiles || {};

  updateGenerationJob(jobId, { status: "running", stage: "analyse", progress: 10, message: "Analyse du prompt..." });

  const baseFileNames = Object.keys(baseProjectFiles);
  let baseSummary = "";
  if (baseFileNames.length > 0) {
    updateGenerationJob(jobId, { stage: "base_project", progress: 20, message: baseFileNames.length + " fichier(s) de base en cours d'etude..." });
    baseSummary = "\\n\\nPROJET DE BASE FOURNI PAR L'UTILISATEUR (a etudier et a etendre, NE PAS repartir de zero):\\n";
    let budget = 6000;
    for (const fname of baseFileNames) {
      const content = String(baseProjectFiles[fname] || "");
      const slice = content.slice(0, Math.max(0, budget));
      baseSummary += "\\n--- FICHIER: " + fname + " ---\\n" + slice + "\\n";
      budget -= slice.length;
      if (budget <= 0) break;
    }
  } else {
    updateGenerationJob(jobId, { stage: "base_project", progress: 20, message: "Aucun projet de base fourni, generation a partir de zero." });
  }

  const systemInstruction = "Tu es un expert developpeur full-stack. Tu generes des applications web completes et fonctionnelles en Node.js/Express. " +
    (baseFileNames.length > 0 ? "Un projet de base est fourni: tu DOIS partir de ce code existant et l'etendre/corriger selon la demande, pas repartir de zero. " : "") +
    "Tu reponds UNIQUEMENT avec du JSON valide contenant les fichiers du projet. Pas de markdown, pas d'explication.";

  const userPrompt = "Genere une application web complete nommee \\"" + (projectName || "mon-app") + "\\" qui fait: " + prompt + baseSummary + "\\n\\n" +
    "Reponds UNIQUEMENT avec ce JSON (sans markdown):\\n" +
    "{\\n" +
    "  \\"files\\": { \\"server.js\\": \\"...\\", \\"package.json\\": \\"...\\", \\"public/index.html\\": \\"...\\" },\\n" +
    "  \\"startCommand\\": \\"node server.js\\",\\n" +
    "  \\"description\\": \\"description courte du projet genere\\"\\n" +
    "}\\n\\n" +
    "REGLES:\\n" +
    "- server.js DOIT ecouter sur process.env.PORT || 3000\\n" +
    "- Inclure toujours package.json et server.js\\n" +
    "- Code COMPLET et FONCTIONNEL, pas de placeholder\\n" +
    "- Interface HTML dans public/index.html avec CSS inline moderne";

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
  const jsonMatch = cleaned.match(/\\{[\\s\\S]*\\}/);
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

  updateGenerationJob(jobId, { stage: "writing_files", progress: 80, message: "Ecriture des fichiers sur disque..." });

  const slug = (projectName || "gen-app").toLowerCase().replace(/[^a-z0-9]/g, "-");
  const targetDir = require("path").join("/tmp/bjc-apps", slug);
  require("fs").mkdirSync(targetDir, { recursive: true });

  const fileList = Object.keys(parsed.files || {});
  let written = 0;
  for (const [filePath, content] of Object.entries(parsed.files || {})) {
    const fullPath = require("path").join(targetDir, filePath);
    require("fs").mkdirSync(require("path").dirname(fullPath), { recursive: true });
    require("fs").writeFileSync(fullPath, content, "utf-8");
    written++;
    updateGenerationJob(jobId, { progress: 80 + Math.round((written / Math.max(fileList.length, 1)) * 15), message: "Fichier ecrit: " + filePath });
  }

  logger.info("[generate-job] Project '" + slug + "' generated with " + fileList.length + " files (job " + jobId + ")");

  updateGenerationJob(jobId, {
    status: "done",
    stage: "done",
    progress: 100,
    message: "Projet genere avec succes !",
    result: {
      success: true,
      slug: slug,
      files: fileList,
      startCommand: parsed.startCommand || "node server.js",
      description: parsed.description || "",
      targetDir: targetDir
    }
  });
}

function getGenerationJobStatus(req, res) {
  const job = generationJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job introuvable ou expire." });
  res.json(job);
}

async function adaptProject(req, res) {"""

results["ai"] = patch("backend/aiController.js", ANCHOR_AI, REPLACE_AI, "aiController.js -- systeme job async generation + base project")

if results["ai"]:
    with open("backend/aiController.js", "a", encoding="utf-8") as f:
        f.write("\n\nmodule.exports.startGenerateProjectJob = startGenerateProjectJob;\nmodule.exports.getGenerationJobStatus = getGenerationJobStatus;\n")
    print("[OK]    aiController.js -- exports ajoutes")

# ============================================================
# 2) server.js -- route generate devient async (job) + route status
# ============================================================
ANCHOR_SRV = """// \u2500\u2500\u2500 GENERATE PROJECT FROM PROMPT \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
app.post("/api/apps/generate", authenticateJWT, async (req, res) => {
  try {
    await aiController.generateProject(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});"""

REPLACE_SRV = """// \u2500\u2500\u2500 GENERATE PROJECT FROM PROMPT (JOB ASYNC) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
app.post("/api/apps/generate", authenticateJWT, async (req, res) => {
  try {
    await aiController.startGenerateProjectJob(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/apps/generate/status/:jobId", authenticateJWT, (req, res) => {
  aiController.getGenerationJobStatus(req, res);
});"""

results["srv"] = patch("backend/server.js", ANCHOR_SRV, REPLACE_SRV, "server.js -- route generate async + route status")

# ============================================================
# 3) dashboard.html -- modal upgradee (base project + visualisation temps reel)
# ============================================================
ANCHOR_DASH = """  <!-- MODAL GENERER APP DEPUIS PROMPT (DASHBOARD) -->
  <div id="modal-generate-ai" class="hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-2xl shadow-2xl">
      <div class="flex items-center justify-between p-6 border-b border-slate-700">
        <div>
          <h2 class="text-white font-bold text-lg">Generer une App depuis un Prompt</h2>
          <p class="text-slate-400 text-xs mt-1">L'IA genere le code complet, cree le projet et le deploie automatiquement</p>
        </div>
        <button onclick="document.getElementById('modal-generate-ai').classList.add('hidden')" class="text-slate-500 hover:text-white text-xl">&times;</button>
      </div>
      <div class="p-6 space-y-4">
        <div>
          <label class="text-slate-300 text-xs font-semibold uppercase tracking-wider">Nom du projet</label>
          <input id="gen-ai-name" type="text" placeholder="mon-app-ia" class="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
        </div>
        <div>
          <label class="text-slate-300 text-xs font-semibold uppercase tracking-wider">Decris ton application</label>
          <textarea id="gen-ai-prompt" rows="5" placeholder="Ex: Une application de gestion de taches avec liste, ajout/suppression, stockage local, interface moderne dark mode..." class="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"></textarea>
        </div>
        <div id="gen-ai-steps" class="space-y-1 text-xs font-mono hidden"></div>
        <button onclick="generateAppFromPromptDash()" id="btn-generate-ai-launch" class="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition text-sm">
          Generer et Deployer
        </button>
      </div>
    </div>
  </div>

  <script>
  function openGenerateAIModal() {
    document.getElementById('modal-generate-ai').classList.remove('hidden');
  }

  async function generateAppFromPromptDash() {
    const btn = document.getElementById('btn-generate-ai-launch');
    const steps = document.getElementById('gen-ai-steps');
    const name = document.getElementById('gen-ai-name').value.trim() || 'mon-app-ia';
    const prompt = document.getElementById('gen-ai-prompt').value.trim();

    if (!prompt) { alert("Decris ton application d'abord !"); return; }

    steps.classList.remove('hidden');
    steps.innerHTML = '';
    btn.disabled = true;
    btn.textContent = 'Generation en cours...';

    const TOKEN = localStorage.getItem('token') || localStorage.getItem('bjc_token');
    const API_HOST = window.location.origin;

    function addStep(icon, msg, color) {
      color = color || 'text-slate-400';
      steps.innerHTML += '<div class="' + color + ' flex gap-2 mt-1"><span>' + icon + '</span><span>' + msg + '</span></div>';
    }

    try {
      addStep('AI', "Envoi du prompt a l'IA...", 'text-purple-400');

      const genRes = await fetch(API_HOST + '/api/apps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
        body: JSON.stringify({ prompt: prompt, projectName: name, runtime: 'nodejs' })
      });

      if (!genRes.ok) throw new Error('Erreur generation: ' + genRes.status);
      const genData = await genRes.json();

      addStep('OK', (genData.files ? genData.files.length : 0) + ' fichier(s) genere(s)', 'text-emerald-400');
      addStep('...', 'Creation de l app dans BJC...', 'text-orange-400');

      const createRes = await fetch(API_HOST + '/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
        body: JSON.stringify({
          name: name,
          slug: genData.slug,
          runtime: 'nodejs',
          start_command: genData.startCommand || 'node server.js',
          description: genData.description || ('App generee depuis: ' + prompt.slice(0, 80))
        })
      });

      if (!createRes.ok) {
        addStep('!', 'App existe peut-etre deja -- tentative de demarrage direct...', 'text-orange-400');
      } else {
        addStep('OK', 'App creee dans BJC !', 'text-emerald-400');
      }

      addStep('...', "Demarrage de l'application...", 'text-purple-400');

      const appsRes = await fetch(API_HOST + '/api/apps?search=' + encodeURIComponent(name), {
        headers: { 'Authorization': 'Bearer ' + TOKEN }
      });
      const appsData = await appsRes.json();
      const list = appsData.apps || [];
      const app = list.find(function(a) { return a.slug === genData.slug || a.name === name; });

      if (app) {
        await fetch(API_HOST + '/api/apps/' + app.id + '/start', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        addStep('OK', 'App demarree ! Slug: ' + genData.slug, 'text-emerald-400');
        addStep('URL', API_HOST + '/site/' + genData.slug, 'text-purple-400');
      }

      btn.textContent = 'Termine !';
      setTimeout(function() {
        document.getElementById('modal-generate-ai').classList.add('hidden');
        if (typeof loadApps === 'function') loadApps();
      }, 3000);

    } catch (err) {
      addStep('X', 'Erreur: ' + err.message, 'text-rose-400');
      btn.disabled = false;
      btn.textContent = 'Generer et Deployer';
    }
  }
  </script>
</body>
</html>"""

REPLACE_DASH = """  <!-- MODAL GENERER APP DEPUIS PROMPT (DASHBOARD) -->
  <div id="modal-generate-ai" class="hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between p-6 border-b border-slate-700">
        <div>
          <h2 class="text-white font-bold text-lg">Generer une App depuis un Prompt</h2>
          <p class="text-slate-400 text-xs mt-1">L'IA etudie un projet de base (optionnel), genere le code complet, cree le projet et le deploie</p>
        </div>
        <button onclick="document.getElementById('modal-generate-ai').classList.add('hidden')" class="text-slate-500 hover:text-white text-xl">&times;</button>
      </div>
      <div class="p-6 space-y-4">
        <div id="gen-ai-form-zone">
          <div>
            <label class="text-slate-300 text-xs font-semibold uppercase tracking-wider">Nom du projet</label>
            <input id="gen-ai-name" type="text" placeholder="mon-app-ia" class="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div class="mt-3">
            <label class="text-slate-300 text-xs font-semibold uppercase tracking-wider">Decris ton application</label>
            <textarea id="gen-ai-prompt" rows="5" placeholder="Ex: Une application de gestion de taches avec liste, ajout/suppression, stockage local, interface moderne dark mode..." class="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"></textarea>
          </div>
          <div class="mt-3">
            <label class="text-slate-300 text-xs font-semibold uppercase tracking-wider">Projet de base a etendre (optionnel)</label>
            <p class="text-[10px] text-slate-500 mt-0.5">Selectionne des fichiers texte (server.js, package.json, index.html...). L'IA les etudie et construit a partir de ca au lieu de partir de zero.</p>
            <input id="gen-ai-base-files" type="file" multiple class="mt-1.5 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500" />
            <div id="gen-ai-base-files-list" class="text-[10px] text-emerald-400 font-mono mt-1"></div>
          </div>
          <button onclick="generateAppFromPromptDash()" id="btn-generate-ai-launch" class="w-full mt-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition text-sm">
            Generer et Deployer
          </button>
        </div>

        <div id="gen-ai-progress-zone" class="hidden">
          <div class="flex items-center justify-between mb-2">
            <span class="text-purple-300 text-xs font-bold uppercase tracking-wider">Generation en cours</span>
            <span id="gen-ai-progress-pct" class="text-white text-xs font-mono">0%</span>
          </div>
          <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div id="gen-ai-progress-bar" class="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-700" style="width:0%"></div>
          </div>
          <div id="gen-ai-stage-list" class="mt-4 space-y-2 text-xs font-mono">
            <div data-stage="10" class="gen-stage flex items-center gap-2 text-slate-500">
              <span class="gen-stage-icon w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px]">o</span>
              <span>Analyse du prompt</span>
            </div>
            <div data-stage="20" class="gen-stage flex items-center gap-2 text-slate-500">
              <span class="gen-stage-icon w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px]">o</span>
              <span>Etude du projet de base fourni</span>
            </div>
            <div data-stage="35" class="gen-stage flex items-center gap-2 text-slate-500">
              <span class="gen-stage-icon w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px]">o</span>
              <span>Generation du code par l'IA (jusqu'a 2 min)</span>
            </div>
            <div data-stage="65" class="gen-stage flex items-center gap-2 text-slate-500">
              <span class="gen-stage-icon w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px]">o</span>
              <span>Analyse de la reponse IA</span>
            </div>
            <div data-stage="80" class="gen-stage flex items-center gap-2 text-slate-500">
              <span class="gen-stage-icon w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px]">o</span>
              <span>Ecriture des fichiers</span>
            </div>
            <div data-stage="100" class="gen-stage flex items-center gap-2 text-slate-500">
              <span class="gen-stage-icon w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px]">o</span>
              <span>Deploiement</span>
            </div>
          </div>
          <div id="gen-ai-current-message" class="mt-3 text-xs text-slate-400 font-mono italic"></div>
          <div id="gen-ai-steps" class="mt-3 space-y-1 text-xs font-mono"></div>
        </div>
      </div>
    </div>
  </div>

  <script>
  function openGenerateAIModal() {
    document.getElementById('gen-ai-form-zone').classList.remove('hidden');
    document.getElementById('gen-ai-progress-zone').classList.add('hidden');
    document.getElementById('modal-generate-ai').classList.remove('hidden');
  }

  function readFileAsText(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() { resolve(reader.result); };
      reader.onerror = function() { reject(reader.error); };
      reader.readAsText(file);
    });
  }

  document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'gen-ai-base-files') {
      var files = Array.prototype.slice.call(e.target.files || []);
      var list = document.getElementById('gen-ai-base-files-list');
      list.textContent = files.length > 0 ? (files.length + ' fichier(s) selectionne(s): ' + files.map(function(f){ return f.name; }).join(', ')) : '';
    }
  });

  function setGenStageProgress(pct) {
    document.getElementById('gen-ai-progress-pct').textContent = Math.max(0, Math.min(100, Math.round(pct))) + '%';
    document.getElementById('gen-ai-progress-bar').style.width = Math.max(0, Math.min(100, pct)) + '%';
    var stages = document.querySelectorAll('.gen-stage');
    stages.forEach(function(el) {
      var threshold = parseInt(el.getAttribute('data-stage'), 10);
      var icon = el.querySelector('.gen-stage-icon');
      if (pct >= threshold) {
        el.classList.remove('text-slate-500');
        el.classList.add('text-emerald-400');
        icon.textContent = 'v';
        icon.classList.remove('border-slate-600');
        icon.classList.add('border-emerald-500', 'bg-emerald-500/10');
      } else if (pct >= threshold - 15) {
        el.classList.remove('text-slate-500');
        el.classList.add('text-purple-300');
        icon.textContent = '.';
      }
    });
  }

  async function generateAppFromPromptDash() {
    const btn = document.getElementById('btn-generate-ai-launch');
    const name = document.getElementById('gen-ai-name').value.trim() || 'mon-app-ia';
    const prompt = document.getElementById('gen-ai-prompt').value.trim();
    const baseFilesInput = document.getElementById('gen-ai-base-files');

    if (!prompt) { alert("Decris ton application d'abord !"); return; }

    btn.disabled = true;
    btn.textContent = 'Demarrage...';

    const TOKEN = localStorage.getItem('token') || localStorage.getItem('bjc_token');
    const API_HOST = window.location.origin;
    const stepsLog = document.getElementById('gen-ai-steps');
    const msgEl = document.getElementById('gen-ai-current-message');
    stepsLog.innerHTML = '';

    function addStep(icon, msg, color) {
      color = color || 'text-slate-400';
      stepsLog.innerHTML += '<div class="' + color + ' flex gap-2 mt-1"><span>' + icon + '</span><span>' + msg + '</span></div>';
    }

    try {
      var baseProjectFiles = {};
      var files = Array.prototype.slice.call((baseFilesInput && baseFilesInput.files) || []);
      if (files.length > 0) {
        for (var i = 0; i < files.length; i++) {
          var content = await readFileAsText(files[i]);
          baseProjectFiles[files[i].name] = content;
        }
      }

      document.getElementById('gen-ai-form-zone').classList.add('hidden');
      document.getElementById('gen-ai-progress-zone').classList.remove('hidden');
      setGenStageProgress(2);
      msgEl.textContent = 'Envoi de la demande...';

      const genRes = await fetch(API_HOST + '/api/apps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
        body: JSON.stringify({ prompt: prompt, projectName: name, runtime: 'nodejs', baseProjectFiles: baseProjectFiles })
      });

      if (!genRes.ok) throw new Error('Erreur lancement generation: ' + genRes.status);
      const jobData = await genRes.json();
      const jobId = jobData.jobId;
      if (!jobId) throw new Error('Aucun jobId recu du serveur.');

      var genData = null;
      var polling = true;
      while (polling) {
        await new Promise(function(r) { setTimeout(r, 1500); });
        const statusRes = await fetch(API_HOST + '/api/apps/generate/status/' + jobId, {
          headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        if (!statusRes.ok) throw new Error('Job introuvable ou expire.');
        const job = await statusRes.json();

        setGenStageProgress(job.progress || 0);
        msgEl.textContent = job.message || '';

        if (job.status === 'error') {
          throw new Error(job.error || 'Erreur de generation.');
        }
        if (job.status === 'done') {
          genData = job.result;
          polling = false;
        }
      }

      addStep('OK', (genData.files ? genData.files.length : 0) + ' fichier(s) genere(s)', 'text-emerald-400');
      addStep('...', 'Creation de l app dans BJC...', 'text-orange-400');

      const createRes = await fetch(API_HOST + '/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
        body: JSON.stringify({
          name: name,
          slug: genData.slug,
          runtime: 'nodejs',
          start_command: genData.startCommand || 'node server.js',
          description: genData.description || ('App generee depuis: ' + prompt.slice(0, 80))
        })
      });

      if (!createRes.ok) {
        addStep('!', 'App existe peut-etre deja -- tentative de demarrage direct...', 'text-orange-400');
      } else {
        addStep('OK', 'App creee dans BJC !', 'text-emerald-400');
      }

      addStep('...', "Demarrage de l'application...", 'text-purple-400');

      const appsRes = await fetch(API_HOST + '/api/apps?search=' + encodeURIComponent(name), {
        headers: { 'Authorization': 'Bearer ' + TOKEN }
      });
      const appsData = await appsRes.json();
      const list = appsData.apps || [];
      const app = list.find(function(a) { return a.slug === genData.slug || a.name === name; });

      if (app) {
        await fetch(API_HOST + '/api/apps/' + app.id + '/start', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        addStep('OK', 'App demarree ! Slug: ' + genData.slug, 'text-emerald-400');
        addStep('URL', API_HOST + '/site/' + genData.slug, 'text-purple-400');
      }

      setGenStageProgress(100);
      msgEl.textContent = 'Termine !';

      setTimeout(function() {
        document.getElementById('modal-generate-ai').classList.add('hidden');
        document.getElementById('gen-ai-form-zone').classList.remove('hidden');
        document.getElementById('gen-ai-progress-zone').classList.add('hidden');
        btn.disabled = false;
        btn.textContent = 'Generer et Deployer';
        if (typeof loadApps === 'function') loadApps();
      }, 3500);

    } catch (err) {
      addStep('X', 'Erreur: ' + err.message, 'text-rose-400');
      msgEl.textContent = 'Erreur: ' + err.message;
      btn.disabled = false;
      btn.textContent = 'Generer et Deployer';
    }
  }
  </script>
</body>
</html>"""

results["dash"] = patch("frontend/dashboard.html", ANCHOR_DASH, REPLACE_DASH, "dashboard.html -- modal upgradee base-project + progress temps reel")

print("")
print("=" * 55)
ok_count = sum(1 for v in results.values() if v)
print("RESULTAT : " + str(ok_count) + "/" + str(len(results)) + " patches OK")
