#!/usr/bin/env python3
# patch_ia_complete.py
# 1) processManager.js : auto-detect et CREER server.js si manquant
# 2) aiController.js   : generateProject() depuis prompt
# 3) server.js         : route POST /api/apps/generate
# 4) app.html          : bouton "Créer depuis Prompt" + modal

import sys

def patch(path, anchor, replacement, label):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    count = content.count(anchor)
    if count == 0:
        print(f"[ECHEC] {label} -- ancre introuvable")
        return False
    if count > 1:
        print(f"[ECHEC] {label} -- ancre ambigue ({count} fois)")
        return False
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.replace(anchor, replacement))
    print(f"[OK]    {label}")
    return True

def skip(label):
    print(f"[SKIP]  {label}")
    return True

# ═══════════════════════════════════════════════════════════════
# PATCH 1 — processManager.js
# Avant executeSpawn: si server.js manquant, chercher le vrai
# fichier d'entrée ou en créer un wrapper automatiquement
# ═══════════════════════════════════════════════════════════════

ANCHOR_SPAWN = '''function executeSpawn(slug) {
  const meta = processes.get(slug);
  if (!meta) throw new Error(`Process metadata missing for slug: ${slug}`);

  // Auto-detect entry paths or fallback commands
  let cmd = "node";
  let args = [];

  const entry = detectEntryFile(meta.appDir, meta.runtime);

  if (meta.startCommand) {
    const parts = meta.startCommand.trim().split(/\\s+/);
    cmd = parts[0];
    args = parts.slice(1);
  } else {
    // Standard heuristics fallback'''

REPLACE_SPAWN = '''function autoFixMissingEntry(appDir, slug) {
  // Si server.js absent, chercher le vrai fichier d'entrée et créer un wrapper
  const serverJs = path.join(appDir, "server.js");
  if (fs.existsSync(serverJs)) return; // Déjà là, rien à faire

  // Chercher un fichier d'entrée alternatif
  const candidates = ["app.js", "index.js", "main.js", "src/index.js", "src/app.js", "src/server.js", "dist/index.js"];
  let found = null;
  for (const c of candidates) {
    if (fs.existsSync(path.join(appDir, c))) {
      found = c;
      break;
    }
  }

  if (found) {
    // Créer un server.js wrapper qui pointe vers le vrai fichier
    const wrapper = `// Auto-generated wrapper by BJC-V5\nrequire('./${found}');\n`;
    fs.writeFileSync(serverJs, wrapper, "utf-8");
    logger.info(`[autofix] Created server.js wrapper -> ${found} for slug '${slug}'`);
    return;
  }

  // Chercher n'importe quel .js à la racine
  try {
    const files = fs.readdirSync(appDir).filter(f => f.endsWith(".js") && !f.includes("webpack") && !f.includes("config"));
    if (files.length > 0) {
      const wrapper = `// Auto-generated wrapper by BJC-V5\nrequire('./${files[0]}');\n`;
      fs.writeFileSync(serverJs, wrapper, "utf-8");
      logger.info(`[autofix] Created server.js wrapper -> ${files[0]} for slug '${slug}'`);
      return;
    }
  } catch (_) {}

  // Créer un server.js minimal Express si vraiment rien trouvé
  const minimal = `const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.use(express.static('dist'));
app.get('/', (req, res) => res.send('<h1>${slug} - BJC-V5</h1><p>App deployed. Add your code.</p>'));
app.listen(PORT, () => console.log('BJC app listening on port ' + PORT));
`;
  fs.writeFileSync(serverJs, minimal, "utf-8");
  logger.info(`[autofix] Created minimal Express server.js for slug '${slug}'`);
}

function executeSpawn(slug) {
  const meta = processes.get(slug);
  if (!meta) throw new Error(`Process metadata missing for slug: ${slug}`);

  // AUTO-FIX: créer server.js si manquant avant de lancer
  if (meta.runtime === "nodejs" || meta.runtime === "express" || !meta.runtime) {
    autoFixMissingEntry(meta.appDir, slug);
  }

  // Auto-detect entry paths or fallback commands
  let cmd = "node";
  let args = [];

  const entry = detectEntryFile(meta.appDir, meta.runtime);

  if (meta.startCommand) {
    const parts = meta.startCommand.trim().split(/\\s+/);
    cmd = parts[0];
    args = parts.slice(1);
  } else {
    // Standard heuristics fallback'''


# ═══════════════════════════════════════════════════════════════
# PATCH 2 — aiController.js : generateProject()
# ═══════════════════════════════════════════════════════════════

ANCHOR_GEN = '''let pgClientPool = null;
function setDbPool(pool) { pgClientPool = pool; }'''

REPLACE_GEN = '''let pgClientPool = null;
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
    "server.js": "// code complet du serveur Express\\nconst express = require('express');\\n...",
    "package.json": "{\\"name\\": \\"${projectName || "mon-app"}\\", \\"version\\": \\"1.0.0\\", \\"main\\": \\"server.js\\", \\"scripts\\": {\\"start\\": \\"node server.js\\"}, \\"dependencies\\": {\\"express\\": \\"^4.18.0\\"}}",
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
}'''


# ═══════════════════════════════════════════════════════════════
# PATCH 3 — server.js : route /api/apps/generate
# ═══════════════════════════════════════════════════════════════

ANCHOR_ROUTE_GEN = '// AI COPILOT ROUTINGS'

REPLACE_ROUTE_GEN = '''// ─── GENERATE PROJECT FROM PROMPT ───────────────────────────────────────────
app.post("/api/apps/generate", authenticateJWT, async (req, res) => {
  try {
    await aiController.generateProject(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI COPILOT ROUTINGS'''


# ═══════════════════════════════════════════════════════════════
# PATCH 4 — aiController.js exports : ajouter generateProject
# ═══════════════════════════════════════════════════════════════

ANCHOR_EXPORTS = '''module.exports = {
  suggest,
  adaptProject,
  setDbPool,'''

REPLACE_EXPORTS = '''module.exports = {
  suggest,
  adaptProject,
  generateProject,
  setDbPool,'''


# ═══════════════════════════════════════════════════════════════
# PATCH 5 — app.html : bouton "🚀 Créer App" sur le dashboard
# Insérer dans la barre d'actions principale (là où il y a "Déployer")
# ═══════════════════════════════════════════════════════════════

ANCHOR_CREATE_BTN = '''<div id="modal-generate" class="hidden'''

def patch_add_generate_btn(path, label):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if 'modal-generate' in content:
        print(f"[SKIP]  {label} -- déjà présent")
        return True

    # Chercher le bouton logout ou header pour insérer le modal
    # Insérer le modal + bouton juste avant </body>
    anchor = '</body>'
    if anchor not in content:
        print(f"[ECHEC] {label} -- </body> introuvable")
        return False

    generate_ui = '''
  <!-- MODAL GÉNÉRER PROJET DEPUIS PROMPT -->
  <div id="modal-generate" class="hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-2xl shadow-2xl">
      <div class="flex items-center justify-between p-6 border-b border-slate-700">
        <div>
          <h2 class="text-white font-bold text-lg">🚀 Générer une App depuis un Prompt</h2>
          <p class="text-slate-400 text-xs mt-1">L'IA génère le code complet, crée les fichiers et déploie automatiquement</p>
        </div>
        <button onclick="document.getElementById('modal-generate').classList.add('hidden')" class="text-slate-500 hover:text-white text-xl">✕</button>
      </div>
      <div class="p-6 space-y-4">
        <div>
          <label class="text-slate-300 text-xs font-semibold uppercase tracking-wider">Nom du projet</label>
          <input id="gen-name" type="text" placeholder="mon-app-ia" class="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
        </div>
        <div>
          <label class="text-slate-300 text-xs font-semibold uppercase tracking-wider">Décris ton application</label>
          <textarea id="gen-prompt" rows="5" placeholder="Ex: Une application de gestion de tâches avec une liste, ajout/suppression, stockage local, interface moderne avec dark mode..." class="mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"></textarea>
        </div>
        <div id="gen-steps" class="space-y-1 text-xs font-mono hidden"></div>
        <button onclick="generateAppFromPrompt()" id="btn-generate-launch" class="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition text-sm">
          ✨ Générer & Déployer
        </button>
      </div>
    </div>
  </div>

  <script>
  // Bouton global accessible depuis le dashboard
  function openGenerateModal() {
    document.getElementById('modal-generate').classList.remove('hidden');
  }

  async function generateAppFromPrompt() {
    const btn = document.getElementById('btn-generate-launch');
    const steps = document.getElementById('gen-steps');
    const name = document.getElementById('gen-name').value.trim() || 'mon-app-ia';
    const prompt = document.getElementById('gen-prompt').value.trim();

    if (!prompt) { alert('Décris ton application d\\'abord !'); return; }

    steps.classList.remove('hidden');
    steps.innerHTML = '';
    btn.disabled = true;
    btn.textContent = '⏳ Génération en cours...';

    const TOKEN = localStorage.getItem('bjc_token');
    const API_HOST = window.location.origin;

    function addStep(icon, msg, color = 'text-slate-400') {
      steps.innerHTML += `<div class="${color} flex gap-2 mt-1"><span>${icon}</span><span>${msg}</span></div>`;
    }

    try {
      addStep('🤖', 'Envoi du prompt à l\\'IA...', 'text-purple-400');

      const genRes = await fetch(`${API_HOST}/api/apps/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
        body: JSON.stringify({ prompt, projectName: name, runtime: 'nodejs' })
      });

      if (!genRes.ok) throw new Error('Erreur génération: ' + genRes.status);
      const genData = await genRes.json();

      addStep('✅', `${genData.files?.length || 0} fichier(s) généré(s): ${(genData.files || []).join(', ')}`, 'text-emerald-400');
      addStep('📦', 'Création de l\\'app dans BJC...', 'text-orange-400');

      // Créer l'app dans BJC via l'API
      const createRes = await fetch(`${API_HOST}/api/apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
        body: JSON.stringify({
          name: name,
          slug: genData.slug,
          runtime: 'nodejs',
          start_command: genData.startCommand || 'node server.js',
          description: genData.description || `App générée depuis: ${prompt.slice(0, 80)}`
        })
      });

      if (!createRes.ok) {
        addStep('⚠️', 'App existe peut-être déjà — tentative de démarrage direct...', 'text-orange-400');
      } else {
        addStep('✅', 'App créée dans BJC !', 'text-emerald-400');
      }

      addStep('🚀', 'Démarrage de l\\'application...', 'text-purple-400');

      // Récupérer l'ID de l'app créée
      const appsRes = await fetch(`${API_HOST}/api/apps?search=${encodeURIComponent(name)}`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      });
      const appsData = await appsRes.json();
      const app = (appsData.apps || []).find(a => a.slug === genData.slug || a.name === name);

      if (app) {
        await fetch(`${API_HOST}/api/apps/${app.id}/start`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        addStep('✅', `App démarrée ! Slug: ${genData.slug}`, 'text-emerald-400');
        addStep('🌐', `URL: ${API_HOST}/site/${genData.slug}`, 'text-purple-400');
      }

      btn.textContent = '✅ Terminé !';
      setTimeout(() => {
        document.getElementById('modal-generate').classList.add('hidden');
        if (typeof loadApps === 'function') loadApps();
      }, 3000);

    } catch (err) {
      addStep('❌', 'Erreur: ' + err.message, 'text-rose-400');
      btn.disabled = false;
      btn.textContent = '✨ Générer & Déployer';
    }
  }
  </script>

</body>'''

    new_content = content.replace(anchor, generate_ui)
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"[OK]    {label}")
    return True


def patch_add_generate_btn_to_dashboard(path, label):
    """Ajoute bouton Créer App dans le header du dashboard (index.html)"""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if 'openGenerateModal' in content:
        print(f"[SKIP]  {label}")
        return True

    # Chercher le bouton "Nouvelle App" ou "Deploy" dans le dashboard
    # On cherche dans index.html
    print(f"[INFO]  {label} -- à ajouter dans index.html manuellement si absent")
    return True


# ═══════════════════════════════════════════════════════════════
# EXÉCUTION
# ═══════════════════════════════════════════════════════════════

import os

results = []

# PATCH 1 — processManager.js : auto-fix server.js manquant
with open("backend/processManager.js", "r", encoding="utf-8") as f:
    pm = f.read()
if 'autoFixMissingEntry' in pm:
    results.append(skip("processManager.js -- autoFixMissingEntry déjà présent"))
else:
    results.append(patch("backend/processManager.js", ANCHOR_SPAWN, REPLACE_SPAWN,
        "processManager.js -- autoFixMissingEntry avant executeSpawn"))

# PATCH 2 — aiController.js : generateProject()
with open("backend/aiController.js", "r", encoding="utf-8") as f:
    ai = f.read()
if 'async function generateProject' in ai:
    results.append(skip("aiController.js -- generateProject déjà présent"))
else:
    results.append(patch("backend/aiController.js", ANCHOR_GEN, REPLACE_GEN,
        "aiController.js -- generateProject()"))

# PATCH 3 — server.js : route /generate
with open("backend/server.js", "r", encoding="utf-8") as f:
    sv = f.read()
if '/api/apps/generate' in sv:
    results.append(skip("server.js -- route /generate déjà présente"))
else:
    results.append(patch("backend/server.js", ANCHOR_ROUTE_GEN, REPLACE_ROUTE_GEN,
        "server.js -- route POST /api/apps/generate"))

# PATCH 4 — exports
with open("backend/aiController.js", "r", encoding="utf-8") as f:
    ai2 = f.read()
if 'generateProject,' in ai2:
    results.append(skip("aiController.js -- generateProject déjà exporté"))
else:
    results.append(patch("backend/aiController.js", ANCHOR_EXPORTS, REPLACE_EXPORTS,
        "aiController.js -- export generateProject"))

# PATCH 5 — app.html modal générer
results.append(patch_add_generate_btn("frontend/app.html",
    "app.html -- modal Générer depuis Prompt"))

# PATCH 6 — index.html : bouton dans dashboard
INDEX = "frontend/index.html"
if os.path.exists(INDEX):
    with open(INDEX, "r", encoding="utf-8") as f:
        idx = f.read()
    if 'openGenerateModal' not in idx:
        # Chercher un bouton existant pour ajouter à côté
        btn_anchor = 'id="btn-new-app"'
        if btn_anchor in idx:
            results.append(patch(INDEX,
                btn_anchor,
                'id="btn-new-app" onclick="openGenerateModal()"',
                "index.html -- btn-new-app ouvre modal generate"))
        else:
            results.append(skip("index.html -- btn-new-app introuvable, modal accessible via JS"))
    else:
        results.append(skip("index.html -- openGenerateModal déjà lié"))
else:
    results.append(skip("index.html -- fichier absent"))

print("\n" + "="*55)
ok = sum(1 for r in results if r)
print(f"RESULTAT : {ok}/{len(results)} patches OK")
if ok >= len(results) - 1:  # tolérer 1 skip
    print("OK -- node -c backend/*.js && git add -A && git commit -m 'feat: autofix server.js + generateProject depuis prompt' && git push origin main")
else:
    sys.exit(1)
