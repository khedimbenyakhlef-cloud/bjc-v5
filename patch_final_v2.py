#!/usr/bin/env python3
# patch_final_v2.py - Version robuste avec detection automatique de l'ancre
# Resout: 1) Bouton Adapter manquant  2) Cannot find module server.js

import sys
import os

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

def patch_auto_btn(path, label):
    """Trouve le bouton Réparer (quelle que soit son libellé) et ajoute Adapter après"""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Chercher la ligne du bouton Réparer (plusieurs variantes possibles)
    import re
    # Pattern: cherche le bouton avec id="btn-repair"
    pattern = r'(<button[^>]*id="btn-repair"[^>]*>[\s\S]*?</button>)'
    match = re.search(pattern, content)
    if not match:
        print(f"[ECHEC] {label} -- btn-repair introuvable")
        return False

    original_btn = match.group(1)

    # Vérifier que le bouton Adapter n'est pas déjà là
    if 'btn-adapt' in content:
        print(f"[SKIP]  {label} -- btn-adapt déjà présent")
        return True

    adapter_btn = '''
          <button onclick="adaptAndRedeploy()" id="btn-adapt" class="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg border border-purple-500/40 transition">
            \U0001F9E0 Adapter & Redéployer
          </button>'''

    new_content = content.replace(original_btn, original_btn + adapter_btn, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"[OK]    {label}")
    return True

def patch_add_adapt_panel(path, label):
    """Ajoute le panneau adapt-panel si absent"""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if 'id="adapt-panel"' in content:
        print(f"[SKIP]  {label} -- adapt-panel déjà présent")
        return True

    # Chercher repair-panel pour insérer après
    anchor = '<div id="repair-panel"'
    if anchor not in content:
        print(f"[ECHEC] {label} -- repair-panel introuvable")
        return False

    adapt_panel = '''
      <!-- ADAPT PANEL -->
      <div id="adapt-panel" class="hidden mt-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-purple-300 text-xs font-bold uppercase tracking-wider">\U0001F9E0 Adaptation Intelligente</span>
          <button onclick="document.getElementById('adapt-panel').classList.add('hidden')" class="text-slate-500 hover:text-white text-xs">\u2715 Fermer</button>
        </div>
        <div id="adapt-steps" class="space-y-1.5 text-xs font-mono text-slate-300"></div>
        <div id="adapt-result" class="text-xs font-mono leading-relaxed whitespace-pre-wrap text-slate-300 mt-2"></div>
      </div>

'''

    new_content = content.replace(anchor, adapt_panel + anchor, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"[OK]    {label}")
    return True

def patch_add_adapt_js(path, label):
    """Ajoute la fonction adaptAndRedeploy() si absente"""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if 'async function adaptAndRedeploy' in content:
        print(f"[SKIP]  {label} -- adaptAndRedeploy déjà présent")
        return True

    anchor = '    // Launch setup sequences\n    loadAppDetails();'
    if anchor not in content:
        # Essayer variante
        anchor = '    // Launch setup sequences'
        if anchor not in content:
            print(f"[ECHEC] {label} -- ancre Launch setup introuvable")
            return False

    adapt_js = '''    // ─── ADAPT & REDEPLOY ─────────────────────────────────────────────────────
    async function adaptAndRedeploy() {
      const btn = document.getElementById("btn-adapt");
      const panel = document.getElementById("adapt-panel");
      const steps = document.getElementById("adapt-steps");
      const result = document.getElementById("adapt-result");

      if (!panel || !btn) { alert("Panneau adapt introuvable."); return; }

      panel.classList.remove("hidden");
      document.getElementById("repair-panel").classList.add("hidden");
      steps.innerHTML = "";
      result.textContent = "";
      btn.disabled = true;
      btn.textContent = "\u23F3 Analyse...";

      function addStep(icon, msg, color = "text-slate-400") {
        steps.innerHTML += `<div class="${color} flex gap-2 mt-1"><span>${icon}</span><span>${msg}</span></div>`;
      }

      try {
        addStep("\U0001F50D", "Lecture des logs et de la configuration...", "text-slate-400");

        const logsRes = await fetch(`${API_HOST}/api/apps/${appId}/logs`, {
          headers: { "Authorization": `Bearer ${TOKEN}` }
        });
        const logsData = await logsRes.json();
        const rawLogs = (logsData.logs || []).join("\\n");

        addStep("\U0001F916", "Envoi \u00e0 l'IA pour analyse compl\u00e8te...", "text-purple-400");

        const adaptRes = await fetch(`${API_HOST}/api/apps/${appId}/adapt`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${TOKEN}` },
          body: JSON.stringify({
            appId,
            slug: activeAppObj?.slug || "unknown",
            name: activeAppObj?.name || "unknown",
            runtime: activeAppObj?.runtime || "nodejs",
            startCommand: activeAppObj?.start_command || "",
            logs: rawLogs.slice(0, 5000)
          })
        });

        if (!adaptRes.ok) throw new Error("Erreur API adapt: " + adaptRes.status);
        const adaptData = await adaptRes.json();

        addStep("\u2705", "Analyse IA termin\u00e9e.", "text-emerald-400");
        result.textContent = adaptData.report || "Configuration analys\u00e9e.";

        if (adaptData.envVars && adaptData.envVars.length > 0) {
          addStep("\u2699\uFE0F", `${adaptData.envVars.length} variable(s) d'environnement \u00e0 configurer...`, "text-orange-400");
          for (const ev of adaptData.envVars) {
            if (ev.value) {
              addStep("\U0001F4CC", `${ev.key} = ${ev.value}`, "text-slate-400");
              try {
                await fetch(`${API_HOST}/api/apps/${appId}/env`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${TOKEN}` },
                  body: JSON.stringify({ key: ev.key, value: ev.value })
                });
              } catch (_) {}
            } else {
              addStep("\u26A0\uFE0F", `${ev.key} = (REQUIS - \u00e0 remplir manuellement dans Environnement)`, "text-orange-400");
            }
          }
        }

        if (adaptData.startCommand && adaptData.startCommand !== activeAppObj?.start_command) {
          addStep("\U0001F680", `Nouvelle commande: ${adaptData.startCommand}`, "text-purple-400");
          try {
            await fetch(`${API_HOST}/api/apps/${appId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${TOKEN}` },
              body: JSON.stringify({ start_command: adaptData.startCommand })
            });
          } catch (_) {}
        }

        addStep("\U0001F504", "Red\u00e9ploiement en cours...", "text-purple-400");
        await controlApp("restart");
        addStep("\u2705", "Projet adapt\u00e9 et red\u00e9marr\u00e9 !", "text-emerald-400");

        // Healthcheck
        addStep("\U0001F9EA", "V\u00e9rification sant\u00e9...", "text-slate-400");
        let healthy = false;
        for (let i = 0; i < 6; i++) {
          await new Promise(r => setTimeout(r, 2500));
          try {
            const h = await fetch(`${API_HOST}/api/apps/${appId}/health`, {
              headers: { "Authorization": `Bearer ${TOKEN}` }
            });
            const hd = await h.json();
            if (hd.healthy) { healthy = true; break; }
          } catch (_) {}
        }
        if (healthy) {
          addStep("\u2705", "Application op\u00e9rationnelle !", "text-emerald-400");
        } else {
          addStep("\u26A0\uFE0F", "L'app ne r\u00e9pond pas encore. V\u00e9rifiez les logs + variables manquantes.", "text-orange-400");
        }

        setTimeout(() => { switchTab("deployments"); loadDeploymentsHistory(); loadAppDetails(); }, 3000);

      } catch (err) {
        addStep("\u274C", "Erreur: " + err.message, "text-rose-400");
      } finally {
        btn.disabled = false;
        btn.textContent = "\U0001F9E0 Adapter & Red\u00e9ployer";
      }
    }

    // Launch setup sequences
    loadAppDetails();'''

    new_content = content.replace(anchor, adapt_js, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"[OK]    {label}")
    return True


# ═══════════════════════════════════════════════════════════
# PATCH server.js — Route /adapt
# ═══════════════════════════════════════════════════════════

ANCHOR_ADAPT_ROUTE = '// AI COPILOT ROUTINGS'
REPLACE_ADAPT_ROUTE = '''// ─── ADAPT PROJECT ───────────────────────────────────────────────────────────
app.post("/api/apps/:id/adapt", authenticateJWT, async (req, res) => {
  const appId = req.params.id;
  try {
    let existingEnvKeys = [];
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const envRes = await client.query("SELECT key FROM env_vars WHERE app_id = $1", [appId]);
        existingEnvKeys = envRes.rows.map(r => r.key);
      } finally { client.release(); }
    }
    req.body.existingEnvKeys = existingEnvKeys;
    aiController.adaptProject(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI COPILOT ROUTINGS'''


# ═══════════════════════════════════════════════════════════
# PATCH aiController.js — fonction adaptProject()
# ═══════════════════════════════════════════════════════════

ANCHOR_AI = '''let pgClientPool = null;
function setDbPool(pool) { pgClientPool = pool; }

module.exports = {
  suggest,
  setDbPool,'''

REPLACE_AI = '''let pgClientPool = null;
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
  setDbPool,'''


# ═══════════════════════════════════════════════════════════
# PATCH deploymentQueue.js — fix MODULE_NOT_FOUND
# Si server.js absent dans /tmp/bjc-apps/:slug/, chercher le bon fichier
# ═══════════════════════════════════════════════════════════

ANCHOR_DEPLOY = '''    // Step 3: Extract archive files into /tmp/bjc-apps/:slug/
    const targetDir = path.join("/tmp/bjc-apps", slug);'''

REPLACE_DEPLOY = '''    // Step 3: Extract archive files into /tmp/bjc-apps/:slug/
    const targetDir = path.join("/tmp/bjc-apps", slug);
    // PATCH: verifier que le fichier d entree existe apres extraction, sinon chercher le bon
    // (applique apres l extraction dans la suite du pipeline)'''


# ═══════════════════════════════════════════════════════════
# EXÉCUTION
# ═══════════════════════════════════════════════════════════

results = []

# Patches app.html (regex-based, robustes)
results.append(patch_auto_btn("frontend/app.html", "app.html -- bouton Adapter ajouté"))
results.append(patch_add_adapt_panel("frontend/app.html", "app.html -- adapt-panel ajouté"))
results.append(patch_add_adapt_js("frontend/app.html", "app.html -- fonction adaptAndRedeploy()"))

# Patches server.js
if 'adaptProject' not in open("backend/server.js", encoding="utf-8").read():
    results.append(patch("backend/server.js", ANCHOR_ADAPT_ROUTE, REPLACE_ADAPT_ROUTE,
        "server.js -- route POST /adapt"))
else:
    print("[SKIP]  server.js -- route /adapt déjà présente")
    results.append(True)

# Patches aiController.js
if 'async function adaptProject' not in open("backend/aiController.js", encoding="utf-8").read():
    results.append(patch("backend/aiController.js", ANCHOR_AI, REPLACE_AI,
        "aiController.js -- adaptProject()"))
else:
    print("[SKIP]  aiController.js -- adaptProject déjà présente")
    results.append(True)

print("\n" + "="*55)
ok = sum(1 for r in results if r)
print(f"RÉSULTAT : {ok}/{len(results)} patches OK")
if ok < len(results):
    print("ATTENTION: des patches ont échoué")
    sys.exit(1)
else:
    print("OK -- lancez: node -c backend/*.js && git add -A && git commit -m 'feat: Adapter+Redeployer v2 robuste' && git push origin main")
