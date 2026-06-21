import sys

def patch(path, anchor, replacement, label):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    count = content.count(anchor)
    if count == 0:
        print(f"[ECHEC] {label} -- ancre introuvable dans {path}")
        return False
    if count > 1:
        print(f"[ECHEC] {label} -- ancre ambigue ({count} occurrences) dans {path}")
        return False
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.replace(anchor, replacement))
    print(f"[OK]    {label}")
    return True

ANCHOR_HEALTH = '// AI COPILOT ROUTINGS'
REPLACE_HEALTH = '''// --- HEALTH CHECK PAR APP ---
app.get("/api/apps/:id/health", authenticateJWT, async (req, res) => {
  const appId = req.params.id;
  try {
    let slug = "";
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const appRes = await client.query("SELECT slug FROM apps WHERE id = $1", [appId]);
        slug = appRes.rows[0]?.slug;
      } finally { client.release(); }
    } else {
      slug = "mock-app-" + appId;
    }
    if (!slug) return res.json({ healthy: false, reason: "App introuvable" });
    const healthy = await processManager.healthCheck(slug);
    res.json({ healthy, slug });
  } catch (err) {
    res.status(500).json({ healthy: false, reason: err.message });
  }
});

// AI COPILOT ROUTINGS'''

ANCHOR_EXPORTS = '''module.exports = {
  suggest,'''
REPLACE_EXPORTS = '''let pgClientPool = null;
function setDbPool(pool) { pgClientPool = pool; }

module.exports = {
  suggest,
  setDbPool,'''

ANCHOR_POOL = 'const aiController = require("./aiController");'
REPLACE_POOL = '''const aiController = require("./aiController");
setTimeout(() => { aiController.setDbPool && aiController.setDbPool(pgClientPool); }, 3000);'''

results = []
results.append(patch("backend/server.js", ANCHOR_HEALTH, REPLACE_HEALTH, "server.js -- route GET /health"))
results.append(patch("backend/aiController.js", ANCHOR_EXPORTS, REPLACE_EXPORTS, "aiController.js -- setDbPool export"))
results.append(patch("backend/server.js", ANCHOR_POOL, REPLACE_POOL, "server.js -- inject pgClientPool"))

print("\n" + "="*50)
ok = sum(results)
print(f"RESULTAT : {ok}/{len(results)} patches OK")
if ok < len(results):
    sys.exit(1)
else:
    print("Pret pour node -c + git push")
