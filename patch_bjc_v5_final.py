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

ok = 0
total = 0

# ══════════════════════════════════════════════════════════════════
# PATCH 1 — server.js : ajouter routes job async generate
# ══════════════════════════════════════════════════════════════════
total += 1
ANCHOR_S1 = """// ─── GENERATE PROJECT FROM PROMPT ───────────────────────────────────────────
app.post("/api/apps/generate", authenticateJWT, async (req, res) => {
  try {
    await aiController.generateProject(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});"""

REPLACE_S1 = """// ─── GENERATE PROJECT FROM PROMPT (sync legacy) ─────────────────────────────
app.post("/api/apps/generate", authenticateJWT, async (req, res) => {
  try {
    await aiController.generateProject(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GENERATE PROJECT ASYNC JOB ──────────────────────────────────────────────
app.post("/api/apps/generate-async", authenticateJWT, async (req, res) => {
  try {
    await aiController.startGenerateProjectJob(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/apps/generate-job/:jobId", authenticateJWT, (req, res) => {
  aiController.getGenerationJobStatus(req, res);
});"""

if patch("backend/server.js", ANCHOR_S1, REPLACE_S1, "server.js -- routes job async generate"):
    ok += 1

# ══════════════════════════════════════════════════════════════════
# PATCH 2 — deploymentQueue.js : reduire warmup 60s -> 12s
# ══════════════════════════════════════════════════════════════════
total += 1
if patch("backend/deploymentQueue.js",
    "await sleep(60000);",
    "await sleep(12000);",
    "deploymentQueue.js -- warmup reduit 60s->12s"):
    ok += 1

# ══════════════════════════════════════════════════════════════════
# PATCH 3 — deploymentQueue.js : reduire sleep entre healthchecks 10s->5s
# ══════════════════════════════════════════════════════════════════
total += 1
if patch("backend/deploymentQueue.js",
    "await sleep(10000);",
    "await sleep(5000);",
    "deploymentQueue.js -- sleep entre healthchecks 10s->5s"):
    ok += 1

# ══════════════════════════════════════════════════════════════════
# PATCH 4 — dashboard.html : remplacer modal generate par version
#           avec upload projet de base + ecran visualisation temps reel
# ══════════════════════════════════════════════════════════════════
total += 1

OLD_MODAL = """  <div id="modal-generate-ai" class="hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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

      addStep('OK', (genData.files ? genData.files.length : 0) + " fichier(s) genere(s)", 'text-emerald-400');
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

NEW_MODAL = """  <!-- ═══════════════════════════════════════════════════════
       MODAL GENERER APP IA — VERSION TEMPS REEL AVANCEE
       ═══════════════════════════════════════════════════════ -->
  <div id="modal-generate-ai" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-[#0d0d0d] border border-purple-500/30 rounded-2xl w-full max-w-2xl shadow-2xl" style="max-height:90vh;overflow-y:auto">

      <!-- Header -->
      <div class="flex items-center justify-between p-5 border-b border-slate-800/60">
        <div>
          <h2 class="text-white font-bold text-base tracking-tight">&#x1F680; Generer une App depuis un Prompt</h2>
          <p class="text-slate-500 text-xs mt-0.5">L'IA genere le code complet, cree le projet et le deploie automatiquement</p>
        </div>
        <button onclick="closeGenerateAIModal()" class="text-slate-500 hover:text-white text-xl leading-none">&times;</button>
      </div>

      <!-- FORM (visible au depart) -->
      <div id="gen-ai-form" class="p-5 space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Nom du projet</label>
            <input id="gen-ai-name" type="text" placeholder="mon-app-ia"
              class="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Runtime</label>
            <select id="gen-ai-runtime" class="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
              <option value="nodejs">Node.js / Express</option>
            </select>
          </div>
        </div>

        <div>
          <label class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Description de l'application</label>
          <textarea id="gen-ai-prompt" rows="4"
            placeholder="Ex: Un gestionnaire de taches avec liste, ajout, suppression, dark mode, stockage memoire..."
            class="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"></textarea>
        </div>

        <!-- Upload projet de base -->
        <div class="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-slate-300 text-xs font-semibold uppercase tracking-wider">&#x1F4C2; Projet de base (optionnel)</span>
            <span class="text-slate-500 text-xs">L'IA etudie ton code existant et l'ameliore</span>
          </div>
          <div id="gen-base-drop" class="border-2 border-dashed border-slate-700 rounded-lg p-4 text-center cursor-pointer hover:border-purple-500/60 transition"
               onclick="document.getElementById('gen-base-input').click()">
            <p class="text-slate-500 text-xs">Glisse des fichiers ici ou <span class="text-purple-400">clique pour selectionner</span></p>
            <p class="text-slate-600 text-xs mt-0.5">.js .json .html .css .py .txt (max 5 fichiers)</p>
          </div>
          <input id="gen-base-input" type="file" multiple accept=".js,.json,.html,.css,.py,.txt,.ts,.md" class="hidden" onchange="handleBaseFilesSelect(event)" />
          <div id="gen-base-file-list" class="space-y-1 hidden"></div>
        </div>

        <button onclick="launchGenerateJobDash()" id="btn-generate-ai-launch"
          class="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition text-sm flex items-center justify-center gap-2">
          &#x2728; Generer &amp; Deployer
        </button>
      </div>

      <!-- ECRAN VISUALISATION TEMPS REEL (cache au depart) -->
      <div id="gen-ai-visualization" class="hidden p-5 space-y-4">

        <!-- Barre de progression principale -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span id="gen-viz-stage-label" class="text-purple-300 text-xs font-bold uppercase tracking-wider">Initialisation...</span>
            <span id="gen-viz-pct" class="text-white text-xs font-mono font-bold">0%</span>
          </div>
          <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div id="gen-viz-bar" class="h-2 rounded-full transition-all duration-700"
                 style="width:0%;background:linear-gradient(90deg,#7c3aed,#a78bfa)"></div>
          </div>
          <p id="gen-viz-message" class="text-slate-400 text-xs font-mono mt-1.5">En attente...</p>
        </div>

        <!-- Etapes visuelles -->
        <div id="gen-viz-steps" class="space-y-1.5 text-xs font-mono max-h-48 overflow-y-auto pr-1" style="scrollbar-width:thin"></div>

        <!-- Bloc fichiers generes (apparait progressivement) -->
        <div id="gen-viz-files-block" class="hidden bg-slate-900/50 border border-slate-700/50 rounded-xl p-3">
          <p class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">&#x1F4C4; Fichiers generes</p>
          <div id="gen-viz-files" class="flex flex-wrap gap-1.5"></div>
        </div>

        <!-- Indicateurs d'etape (pipeline visuel) -->
        <div class="flex items-center gap-1 text-xs font-mono overflow-x-auto py-1">
          <div id="pip-analyse"    class="gen-pip px-2 py-1 rounded bg-slate-800 text-slate-500 whitespace-nowrap">Analyse</div>
          <div class="text-slate-700">&#x2192;</div>
          <div id="pip-base"       class="gen-pip px-2 py-1 rounded bg-slate-800 text-slate-500 whitespace-nowrap">Projet base</div>
          <div class="text-slate-700">&#x2192;</div>
          <div id="pip-ia"         class="gen-pip px-2 py-1 rounded bg-slate-800 text-slate-500 whitespace-nowrap">IA generation</div>
          <div class="text-slate-700">&#x2192;</div>
          <div id="pip-parsing"    class="gen-pip px-2 py-1 rounded bg-slate-800 text-slate-500 whitespace-nowrap">Parsing</div>
          <div class="text-slate-700">&#x2192;</div>
          <div id="pip-writing"    class="gen-pip px-2 py-1 rounded bg-slate-800 text-slate-500 whitespace-nowrap">Ecriture</div>
          <div class="text-slate-700">&#x2192;</div>
          <div id="pip-deploy"     class="gen-pip px-2 py-1 rounded bg-slate-800 text-slate-500 whitespace-nowrap">Deploiement</div>
        </div>

        <!-- Bouton annuler / retour -->
        <button onclick="closeGenerateAIModal()" id="btn-gen-close"
          class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition">
          Fermer
        </button>
      </div>

    </div>
  </div>

  <style>
  .gen-pip.active  { background:#4c1d95; color:#c4b5fd; }
  .gen-pip.done    { background:#064e3b; color:#6ee7b7; }
  .gen-pip.error   { background:#7f1d1d; color:#fca5a5; }
  </style>

  <script>
  /* ── VARIABLES GLOBALES MODAL ── */
  var _genBaseFiles = {};
  var _genJobPollInterval = null;
  var _genLastMessage = "";

  function openGenerateAIModal() {
    document.getElementById('modal-generate-ai').classList.remove('hidden');
    document.getElementById('gen-ai-form').classList.remove('hidden');
    document.getElementById('gen-ai-visualization').classList.add('hidden');
  }

  function closeGenerateAIModal() {
    document.getElementById('modal-generate-ai').classList.add('hidden');
    if (_genJobPollInterval) { clearInterval(_genJobPollInterval); _genJobPollInterval = null; }
  }

  /* ── GESTION FICHIERS DE BASE ── */
  function handleBaseFilesSelect(evt) {
    var files = Array.from(evt.target.files).slice(0, 5);
    _genBaseFiles = {};
    var list = document.getElementById('gen-base-file-list');
    list.innerHTML = '';
    if (files.length === 0) { list.classList.add('hidden'); return; }
    list.classList.remove('hidden');
    var readers = files.map(function(f) {
      return new Promise(function(resolve) {
        var r = new FileReader();
        r.onload = function(e) {
          _genBaseFiles[f.name] = e.target.result;
          list.innerHTML += '<div class="flex items-center gap-2 text-xs text-slate-400"><span class="text-emerald-400">&#x2713;</span><span>' + f.name + ' (' + Math.round(f.size/1024) + ' ko)</span></div>';
          resolve();
        };
        r.readAsText(f);
      });
    });
    Promise.all(readers);
  }

  /* ── DRAG & DROP ── */
  (function() {
    var drop = document.getElementById('gen-base-drop');
    if (!drop) return;
    drop.addEventListener('dragover', function(e) { e.preventDefault(); drop.classList.add('border-purple-500'); });
    drop.addEventListener('dragleave', function() { drop.classList.remove('border-purple-500'); });
    drop.addEventListener('drop', function(e) {
      e.preventDefault();
      drop.classList.remove('border-purple-500');
      var dt = { target: { files: e.dataTransfer.files } };
      handleBaseFilesSelect(dt);
    });
  })();

  /* ── PIPELINE VISUEL ── */
  var STAGE_MAP = {
    'queued':        'pip-analyse',
    'analyse':       'pip-analyse',
    'base_project':  'pip-base',
    'ia_generation': 'pip-ia',
    'parsing':       'pip-parsing',
    'writing_files': 'pip-writing',
    'deploying':     'pip-deploy',
    'done':          'pip-deploy'
  };
  var STAGE_ORDER = ['pip-analyse','pip-base','pip-ia','pip-parsing','pip-writing','pip-deploy'];
  var STAGE_LABELS = {
    'queued':        'En attente...',
    'analyse':       'Analyse du prompt',
    'base_project':  'Etude du projet de base',
    'ia_generation': 'Generation IA en cours...',
    'parsing':       'Analyse de la reponse',
    'writing_files': 'Ecriture des fichiers',
    'deploying':     'Deploiement en cours',
    'done':          'Projet genere avec succes !'
  };

  function updatePipeline(stage, isError) {
    var active = STAGE_MAP[stage] || 'pip-analyse';
    var activeIdx = STAGE_ORDER.indexOf(active);
    STAGE_ORDER.forEach(function(id, i) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('active','done','error');
      if (isError && i === activeIdx) { el.classList.add('error'); }
      else if (i < activeIdx) { el.classList.add('done'); }
      else if (i === activeIdx) { el.classList.add('active'); }
    });
  }

  function addVizStep(icon, msg, color) {
    color = color || 'text-slate-400';
    var steps = document.getElementById('gen-viz-steps');
    if (!steps) return;
    var d = document.createElement('div');
    d.className = color + ' flex gap-2';
    d.innerHTML = '<span>' + icon + '</span><span>' + msg + '</span>';
    steps.appendChild(d);
    steps.scrollTop = steps.scrollHeight;
  }

  function updateVizBar(pct, msg, stage) {
    var bar = document.getElementById('gen-viz-bar');
    var pctEl = document.getElementById('gen-viz-pct');
    var msgEl = document.getElementById('gen-viz-message');
    var labelEl = document.getElementById('gen-viz-stage-label');
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (msgEl && msg && msg !== _genLastMessage) { msgEl.textContent = msg; _genLastMessage = msg; }
    if (labelEl && stage) labelEl.textContent = STAGE_LABELS[stage] || stage;
  }

  /* ── LANCER LA GENERATION ASYNC ── */
  async function launchGenerateJobDash() {
    var btn = document.getElementById('btn-generate-ai-launch');
    var name = (document.getElementById('gen-ai-name').value || '').trim() || 'mon-app-ia';
    var prompt = (document.getElementById('gen-ai-prompt').value || '').trim();
    if (!prompt) { alert("Decris ton application d'abord !"); return; }

    btn.disabled = true;
    btn.textContent = 'Lancement...';

    var TOKEN = localStorage.getItem('token') || localStorage.getItem('bjc_token');
    var API_HOST = window.location.origin;

    try {
      /* Basculer vers ecran visualisation */
      document.getElementById('gen-ai-form').classList.add('hidden');
      document.getElementById('gen-ai-visualization').classList.remove('hidden');
      document.getElementById('gen-viz-steps').innerHTML = '';
      document.getElementById('gen-viz-files').innerHTML = '';
      document.getElementById('gen-viz-files-block').classList.add('hidden');
      _genLastMessage = '';
      updateVizBar(5, 'Envoi du job a l IA...', 'queued');
      updatePipeline('queued', false);

      /* Demarrer le job async */
      var startRes = await fetch(API_HOST + '/api/apps/generate-async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
        body: JSON.stringify({ prompt: prompt, projectName: name, runtime: 'nodejs', baseProjectFiles: _genBaseFiles })
      });
      if (!startRes.ok) throw new Error('Erreur demarrage job: ' + startRes.status);
      var startData = await startRes.json();
      var jobId = startData.jobId;

      addVizStep('&#x1F680;', 'Job lance — ID: ' + jobId.slice(-8), 'text-purple-400');

      var lastStage = '';
      var lastPct = 0;
      var deployTriggered = false;
      var appCreatedId = null;

      /* Polling du statut */
      _genJobPollInterval = setInterval(async function() {
        try {
          var pollRes = await fetch(API_HOST + '/api/apps/generate-job/' + jobId, {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
          });
          if (!pollRes.ok) return;
          var job = await pollRes.json();

          /* Mise a jour barre */
          if (job.progress !== lastPct) {
            lastPct = job.progress;
            updateVizBar(job.progress, job.message, job.stage);
          } else if (job.message !== _genLastMessage) {
            updateVizBar(job.progress, job.message, job.stage);
          }

          /* Mise a jour pipeline */
          var isErr = job.status === 'error';
          updatePipeline(job.stage, isErr);

          /* Nouveau stage -> nouvelle etape */
          if (job.stage !== lastStage) {
            lastStage = job.stage;
            var icons = { 'analyse':'&#x1F50D;', 'base_project':'&#x1F4C2;', 'ia_generation':'&#x1F916;', 'parsing':'&#x1F9E9;', 'writing_files':'&#x1F4BE;', 'deploying':'&#x1F680;', 'done':'&#x2705;' };
            var colors = { 'ia_generation':'text-purple-400', 'writing_files':'text-orange-400', 'deploying':'text-blue-400', 'done':'text-emerald-400', 'error':'text-rose-400' };
            addVizStep(icons[job.stage] || '&#x25B6;', STAGE_LABELS[job.stage] || job.stage, colors[job.stage] || 'text-slate-400');
          }

          /* Ecriture fichier -> afficher badge */
          if (job.stage === 'writing_files' && job.message && job.message.startsWith('Fichier ecrit:')) {
            var fname = job.message.replace('Fichier ecrit: ', '');
            var filesBlock = document.getElementById('gen-viz-files-block');
            var filesEl = document.getElementById('gen-viz-files');
            if (filesEl) {
              filesBlock.classList.remove('hidden');
              var badge = document.createElement('span');
              badge.className = 'px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded font-mono border border-slate-700';
              badge.textContent = fname;
              filesEl.appendChild(badge);
            }
          }

          /* ── JOB TERMINE ── */
          if (job.status === 'done' && !deployTriggered) {
            deployTriggered = true;
            clearInterval(_genJobPollInterval);
            _genJobPollInterval = null;
            var res = job.result || {};

            updateVizBar(100, 'Projet genere ! Deploiement en cours...', 'deploying');
            updatePipeline('deploying', false);
            addVizStep('&#x1F4E6;', 'Fichiers: ' + (res.files || []).join(', '), 'text-slate-400');
            addVizStep('&#x2699;&#xFE0F;', 'Creation de l app dans BJC...', 'text-orange-400');

            /* Creer l app */
            try {
              var createRes = await fetch(API_HOST + '/api/apps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
                body: JSON.stringify({ name: name, slug: res.slug, runtime: 'nodejs', start_command: res.startCommand || 'node server.js', description: res.description || '' })
              });
              if (createRes.ok) { addVizStep('&#x2705;', 'App creee dans BJC !', 'text-emerald-400'); }
              else { addVizStep('&#x26A0;&#xFE0F;', 'App existante — tentative de demarrage...', 'text-orange-400'); }
            } catch(e) {}

            /* Trouver l ID de l app */
            try {
              var appsRes = await fetch(API_HOST + '/api/apps?search=' + encodeURIComponent(name), { headers: { 'Authorization': 'Bearer ' + TOKEN } });
              var appsData = await appsRes.json();
              var found = (appsData.apps || []).find(function(a) { return a.slug === res.slug || a.name === name; });
              if (found) {
                appCreatedId = found.id;
                await fetch(API_HOST + '/api/apps/' + found.id + '/start', { method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN } });
                addVizStep('&#x1F680;', 'App demarree ! Slug: ' + res.slug, 'text-emerald-400');
                addVizStep('&#x1F310;', 'URL: ' + API_HOST + '/site/' + res.slug, 'text-purple-400');
              }
            } catch(e) {}

            updateVizBar(100, 'Projet deploye avec succes !', 'done');
            updatePipeline('done', false);

            document.getElementById('btn-gen-close').textContent = 'Fermer et voir le dashboard';
            document.getElementById('btn-gen-close').onclick = function() {
              closeGenerateAIModal();
              if (typeof loadApps === 'function') loadApps();
            };
          }

          /* ── ERREUR ── */
          if (job.status === 'error') {
            clearInterval(_genJobPollInterval);
            _genJobPollInterval = null;
            addVizStep('&#x274C;', 'Erreur: ' + (job.error || job.message), 'text-rose-400');
            updateVizBar(job.progress, 'Echec: ' + (job.message || job.error), job.stage);
            updatePipeline(job.stage, true);
            document.getElementById('btn-gen-close').textContent = 'Retour';
            document.getElementById('btn-gen-close').onclick = function() {
              document.getElementById('gen-ai-visualization').classList.add('hidden');
              document.getElementById('gen-ai-form').classList.remove('hidden');
              var b = document.getElementById('btn-generate-ai-launch');
              b.disabled = false; b.textContent = 'Generer et Deployer';
            };
          }

        } catch(err) { /* poll error, on continue */ }
      }, 1500);

    } catch(err) {
      addVizStep('&#x274C;', 'Erreur lancement: ' + err.message, 'text-rose-400');
      btn.disabled = false;
      btn.textContent = 'Generer et Deployer';
      document.getElementById('gen-ai-visualization').classList.add('hidden');
      document.getElementById('gen-ai-form').classList.remove('hidden');
    }
  }
  </script>
</body>
</html>"""

if patch("frontend/dashboard.html", OLD_MODAL, NEW_MODAL, "dashboard.html -- modal generate temps reel + upload base"):
    ok += 1

# ══════════════════════════════════════════════════════════════════
# RESULTATS
# ══════════════════════════════════════════════════════════════════
print("")
print("=" * 55)
print("RESULTAT : " + str(ok) + "/" + str(total) + " patches OK")
if ok == total:
    print("Tout bon ! Lancer maintenant:")
    print("  node -c backend/server.js && node -c backend/aiController.js")
    print("  git add -A && git commit -m 'feat: generate async job + visualisation temps reel + upload base + timing fixe' && git push origin main")
