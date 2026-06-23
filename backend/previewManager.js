// backend/previewManager.js
const { spawn } = require('child_process');
const net = require('net');

const MAX_CONCURRENT_PREVIEWS = 2;
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 min
const PORT_RANGE_START = 4000;
const PORT_RANGE_END = 4999;

const activePreviews = new Map(); // projectId -> { proc, port, lastUsed, timeoutHandle }

function findFreePort(start, end) {
  return new Promise((resolve, reject) => {
    function tryPort(p) {
      if (p > end) return reject(new Error('Aucun port libre dans la plage'));
      const tester = net.createServer();
      tester.once('error', () => tryPort(p + 1));
      tester.once('listening', () => {
        tester.close(() => resolve(p));
      });
      tester.listen(p, '127.0.0.1');
    }
    tryPort(start);
  });
}

function killPreview(projectId) {
  const entry = activePreviews.get(projectId);
  if (!entry) return;
  clearTimeout(entry.timeoutHandle);
  try {
    entry.proc.kill('SIGTERM');
  } catch (e) {
    console.warn(`[preview] kill failed for ${projectId}:`, e.message);
  }
  activePreviews.delete(projectId);
  console.log(`[preview] stopped ${projectId} (port ${entry.port})`);
}

function resetInactivityTimer(projectId) {
  const entry = activePreviews.get(projectId);
  if (!entry) return;
  clearTimeout(entry.timeoutHandle);
  entry.lastUsed = Date.now();
  entry.timeoutHandle = setTimeout(() => killPreview(projectId), INACTIVITY_TIMEOUT_MS);
}

function enforceConcurrencyLimit(excludeProjectId) {
  if (activePreviews.size < MAX_CONCURRENT_PREVIEWS) return;

  let oldestId = null;
  let oldestTime = Infinity;
  for (const [id, entry] of activePreviews.entries()) {
    if (id === excludeProjectId) continue;
    if (entry.lastUsed < oldestTime) {
      oldestTime = entry.lastUsed;
      oldestId = id;
    }
  }
  if (oldestId) killPreview(oldestId);
}

/**
 * Lance un preview pour un projet.
 * @param {string} projectId
 * @param {string} projectPath - dossier absolu du projet généré
 * @param {string} startCommand - ex: "node server.js"
 */
async function startPreview(projectId, projectPath, startCommand = 'node server.js') {
  if (activePreviews.has(projectId)) {
    killPreview(projectId);
  }

  enforceConcurrencyLimit(projectId);

  const port = await findFreePort(PORT_RANGE_START, PORT_RANGE_END);
  const [cmd, ...args] = startCommand.split(' ');

  const proc = spawn(cmd, args, {
    cwd: projectPath,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stdout.on('data', (d) => console.log(`[preview:${projectId}] ${d.toString().trim()}`));
  proc.stderr.on('data', (d) => console.error(`[preview:${projectId}] ERR ${d.toString().trim()}`));

  proc.on('exit', (code) => {
    console.log(`[preview:${projectId}] process exited (code ${code})`);
    activePreviews.delete(projectId);
  });

  const entry = { proc, port, lastUsed: Date.now(), timeoutHandle: null };
  activePreviews.set(projectId, entry);
  resetInactivityTimer(projectId);

  // Petit délai pour laisser le serveur démarrer avant que le front tente de proxy
  await new Promise((r) => setTimeout(r, 1500));

  console.log(`[preview] started ${projectId} on port ${port}`);
  return { port };
}

function getPreviewPort(projectId) {
  const entry = activePreviews.get(projectId);
  if (!entry) return null;
  resetInactivityTimer(projectId);
  return entry.port;
}

function stopPreview(projectId) {
  killPreview(projectId);
}

module.exports = { startPreview, stopPreview, getPreviewPort };
