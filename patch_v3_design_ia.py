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

results = []

# ============================================================
# 1) dashboard.html -- bouton "Générer une App (IA)"
# ============================================================
ANCHOR_BTN = """        Nouveau Service
      </button>
    </div>"""

REPLACE_BTN = """        Nouveau Service
      </button>
      <button onclick="openGenerateAIModal()" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl border border-purple-500/30 transition flex items-center gap-2 shadow-lg shadow-purple-950/20">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"></path>
        </svg>
        Generer une App (IA)
      </button>
    </div>"""

results.append(patch("frontend/dashboard.html", ANCHOR_BTN, REPLACE_BTN, "dashboard.html -- bouton Generer IA"))

# ============================================================
# 2) dashboard.html -- modal + script (avant </body></html>)
# ============================================================
ANCHOR_END = """    // Run loader loops
    loadApps();
    setInterval(loadApps, 10000); // Poll status index updates every 10 seconds
  </script>
</body>
</html>"""

REPLACE_END = """    // Run loader loops
    loadApps();
    setInterval(loadApps, 10000); // Poll status index updates every 10 seconds
  </script>

  <!-- MODAL GENERER APP DEPUIS PROMPT (DASHBOARD) -->
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

results.append(patch("frontend/dashboard.html", ANCHOR_END, REPLACE_END, "dashboard.html -- modal Generer IA"))

# ============================================================
# 3) app.html -- textarea criteres dans adapt-panel
# ============================================================
ANCHOR_ADAPT_HTML = """          <button onclick="document.getElementById('adapt-panel').classList.add('hidden')" class="text-slate-500 hover:text-white text-xs">\u2715 Fermer</button>
        </div>
        <div id="adapt-steps" class="space-y-1.5 text-xs font-mono text-slate-300"></div>"""

REPLACE_ADAPT_HTML = """          <button onclick="document.getElementById('adapt-panel').classList.add('hidden')" class="text-slate-500 hover:text-white text-xs">\u2715 Fermer</button>
        </div>
        <div>
          <label class="text-[10px] text-purple-300/80 uppercase tracking-wider font-mono">Criteres / instructions pour l'IA (optionnel)</label>
          <textarea id="adapt-custom-instructions" rows="3" placeholder="Ex: utilise Python Flask au lieu de Node, le slug doit etre en minuscules sans espace, ajoute un fichier requirements.txt, ecoute sur process.env.PORT..." class="mt-1 w-full bg-slate-900/60 border border-purple-500/20 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-purple-500/60 resize-none"></textarea>
        </div>
        <div id="adapt-steps" class="space-y-1.5 text-xs font-mono text-slate-300"></div>"""

results.append(patch("frontend/app.html", ANCHOR_ADAPT_HTML, REPLACE_ADAPT_HTML, "app.html -- textarea criteres adapt"))

# ============================================================
# 4) app.html -- envoyer customInstructions dans adaptAndRedeploy()
# ============================================================
ANCHOR_ADAPT_JS = """          body: JSON.stringify({
            appId,
            slug: activeAppObj?.slug || "unknown",
            name: activeAppObj?.name || "unknown",
            runtime: activeAppObj?.runtime || "nodejs",
            startCommand: activeAppObj?.start_command || "",
            logs: rawLogs.slice(0, 5000)
          })"""

REPLACE_ADAPT_JS = """          body: JSON.stringify({
            appId,
            slug: activeAppObj?.slug || "unknown",
            name: activeAppObj?.name || "unknown",
            runtime: activeAppObj?.runtime || "nodejs",
            startCommand: activeAppObj?.start_command || "",
            logs: rawLogs.slice(0, 5000),
            customInstructions: document.getElementById("adapt-custom-instructions")?.value?.trim() || ""
          })"""

results.append(patch("frontend/app.html", ANCHOR_ADAPT_JS, REPLACE_ADAPT_JS, "app.html -- envoi customInstructions"))

# ============================================================
# 5) app.html -- fix bug TOKEN ('bjc_token' -> fallback 'token')
# ============================================================
ANCHOR_TOKEN_BUG = """    const TOKEN = localStorage.getItem('bjc_token');"""
REPLACE_TOKEN_BUG = """    const TOKEN = localStorage.getItem('token') || localStorage.getItem('bjc_token');"""

results.append(patch("frontend/app.html", ANCHOR_TOKEN_BUG, REPLACE_TOKEN_BUG, "app.html -- fix bug token bjc_token"))

# ============================================================
# 6) aiController.js -- adaptProject() recoit customInstructions
# ============================================================
ANCHOR_DESTRUCT = """  const { slug, name, runtime, startCommand, logs, existingEnvKeys = [] } = req.body;"""
REPLACE_DESTRUCT = """  const { slug, name, runtime, startCommand, logs, existingEnvKeys = [], customInstructions = "" } = req.body;"""

results.append(patch("backend/aiController.js", ANCHOR_DESTRUCT, REPLACE_DESTRUCT, "aiController.js -- destructuring customInstructions"))

ANCHOR_SYSINSTR = """  const systemInstruction = `Tu es un expert DevOps PaaS. Analyse une app et genere sa configuration complete pour qu elle fonctionne. Reponds UNIQUEMENT en JSON valide, sans markdown.`;"""
REPLACE_SYSINSTR = """  const systemInstruction = `Tu es un expert DevOps PaaS. Analyse une app et genere sa configuration complete pour qu elle fonctionne. Si l'utilisateur fournit des instructions specifiques, elles sont PRIORITAIRES sur ton propre jugement et tu DOIS les respecter dans ta reponse (runtime, startCommand, envVars). Reponds UNIQUEMENT en JSON valide, sans markdown.`;"""

results.append(patch("backend/aiController.js", ANCHOR_SYSINSTR, REPLACE_SYSINSTR, "aiController.js -- systemInstruction priorite instructions"))

ANCHOR_PROMPT = """Variables deja configurees: ${existingEnvKeys.join(", ") || "aucune"}
LOGS: ${logs || "aucun log"}"""
REPLACE_PROMPT = """Variables deja configurees: ${existingEnvKeys.join(", ") || "aucune"}
${customInstructions ? "INSTRUCTIONS SPECIFIQUES DE L'UTILISATEUR (PRIORITAIRES, A RESPECTER STRICTEMENT):\\n" + customInstructions + "\\n" : ""}
LOGS: ${logs || "aucun log"}"""

results.append(patch("backend/aiController.js", ANCHOR_PROMPT, REPLACE_PROMPT, "aiController.js -- injection customInstructions dans prompt"))

print("")
print("=" * 55)
ok_count = sum(1 for r in results if r)
print("RESULTAT : " + str(ok_count) + "/" + str(len(results)) + " patches OK")
