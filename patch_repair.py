import re

def patch_anchor(path, anchor, replacement, label):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    count = content.count(anchor)
    if count == 0:
        print(f"[ECHEC] {label}: ancre introuvable dans {path}")
        return False
    if count > 1:
        print(f"[ECHEC] {label}: ancre trouvée {count} fois dans {path}, abandon")
        return False
    content = content.replace(anchor, replacement)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[OK] {label}")
    return True

# ───────────────────────────────────────────────────────────
# PATCH 1 : aiController.js — ajout des requires
# ───────────────────────────────────────────────────────────
anchor1 = r"""const { Groq } = require("groq-sdk");
const winston = require("winston");"""

replacement1 = r"""const { Groq } = require("groq-sdk");
const winston = require("winston");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);
const processManager = require("./processManager");"""

patch_anchor("backend/aiController.js", anchor1, replacement1, "aiController.js - requires")

# ───────────────────────────────────────────────────────────
# PATCH 2 : aiController.js — remplacement de applyRepair (regex, tolère espaces)
# ───────────────────────────────────────────────────────────
with open("backend/aiController.js", "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(r"async function applyRepair\(req, res\) \{.*?\n\}\n\nmodule\.exports = \{", re.DOTALL)

new_apply_repair = r"""async function applyRepair(req, res) {
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

module.exports = {"""

new_content, n = pattern.subn(new_apply_repair, content)
if n == 1:
    with open("backend/aiController.js", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("[OK] aiController.js - fonction applyRepair remplacée")
else:
    print(f"[ECHEC] aiController.js - applyRepair non trouvée ou trouvée {n} fois, abandon")

# ───────────────────────────────────────────────────────────
# PATCH 3 : server.js — ajout de la route /health
# ───────────────────────────────────────────────────────────
anchor3 = r"""    await processManager.restartProcess(slug);
    res.json({ status: "running" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});"""

replacement3 = r"""    await processManager.restartProcess(slug);
    res.json({ status: "running" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/apps/:id/health", authenticateJWT, async (req, res) => {
  const appId = req.params.id;
  try {
    let slug = "";
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const appRes = await client.query(`SELECT slug FROM apps WHERE id = $1`, [appId]);
        slug = appRes.rows[0]?.slug;
      } finally {
        client.release();
      }
    } else {
      slug = `mock-app-${appId}`;
    }

    const meta = processManager.processes.get(slug);
    const healthy = await processManager.healthCheck(slug);
    res.json({ healthy, status: meta?.status || "unknown", restartCount: meta?.restartCount ?? 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});"""

patch_anchor("backend/server.js", anchor3, replacement3, "server.js - route /health ajoutée")

# ───────────────────────────────────────────────────────────
# PATCH 4 : app.html — ajout du slug dans le body apply-repair
# ───────────────────────────────────────────────────────────
anchor4 = r"""          body: JSON.stringify({
            appId,
            patches: repairPatchData.patches
          })"""

replacement4 = r"""          body: JSON.stringify({
            appId,
            slug: activeAppObj?.slug || "unknown",
            patches: repairPatchData.patches
          })"""

patch_anchor("frontend/app.html", anchor4, replacement4, "app.html - slug ajouté au body")

# ───────────────────────────────────────────────────────────
# PATCH 5 : app.html — vrai test de santé après redeploy
# ───────────────────────────────────────────────────────────
anchor5 = r"""        addStep("🔄", "Patches appliqués. Lancement du redéploiement...", "text-purple-400");

        // Redéployer
        await controlApp("restart");

        addStep("✅", "Projet réparé et redémarré avec succès !", "text-emerald-400");

        setTimeout(() => {
          document.getElementById("repair-panel").classList.add("hidden");
          switchTab("deployments");
          loadDeploymentsHistory();
        }, 3000);"""

replacement5 = r"""        addStep("🔄", "Patches appliqués. Lancement du redéploiement...", "text-purple-400");

        // Redéployer
        await controlApp("restart");

        addStep("🧪", "Vérification que l'app répond bien après réparation...", "text-purple-400");

        let healthy = false;
        for (let i = 0; i < 5; i++) {
          await new Promise(r => setTimeout(r, 2000));
          try {
            const healthRes = await fetch(`${API_HOST}/api/apps/${appId}/health`, {
              headers: { "Authorization": `Bearer ${TOKEN}` }
            });
            const healthData = await healthRes.json();
            if (healthData.healthy) { healthy = true; break; }
          } catch (_) {}
        }

        if (healthy) {
          addStep("✅", "Test réussi : l'application répond correctement après réparation.", "text-emerald-400");
        } else {
          addStep("⚠️", "L'app a redémarré mais ne répond pas encore au test de santé — vérifiez les logs.", "text-rose-400");
        }

        setTimeout(() => {
          document.getElementById("repair-panel").classList.add("hidden");
          switchTab("deployments");
          loadDeploymentsHistory();
        }, healthy ? 3000 : 6000);"""

patch_anchor("frontend/app.html", anchor5, replacement5, "app.html - test de santé réel ajouté")

print("\nTermine. Verifie les messages [OK]/[ECHEC] ci-dessus avant de continuer.")
