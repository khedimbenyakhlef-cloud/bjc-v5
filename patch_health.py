with open("frontend/app.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Verifications de securite avant de toucher au fichier
assert 'controlApp("restart")' in lines[977], f"Ligne 978 inattendue: {lines[977]!r}"
assert "3000);" in lines[985], f"Ligne 986 inattendue: {lines[985]!r}"

new_block = '''        addStep("\U0001F9EA", "Verification que l'app repond bien apres reparation...", "text-purple-400");

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
          addStep("\u2705", "Test reussi : l'application repond correctement apres reparation.", "text-emerald-400");
        } else {
          addStep("\u26A0\uFE0F", "L'app a redemarre mais ne repond pas encore au test de sante - verifiez les logs.", "text-rose-400");
        }

        setTimeout(() => {
          document.getElementById("repair-panel").classList.add("hidden");
          switchTab("deployments");
          loadDeploymentsHistory();
        }, healthy ? 3000 : 6000);
'''

# Remplace les lignes 980 a 986 (indices 979 a 985) par le nouveau bloc
lines[979:986] = [new_block]

with open("frontend/app.html", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("[OK] app.html - test de sante reel ajoute (remplacement par numero de ligne)")
