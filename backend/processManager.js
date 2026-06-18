const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Port Management (Allocating active routes between 4001 and 4999)
const allocatedPorts = new Set();
let currentSearchPort = 4001;

function allocatePort() {
  while (currentSearchPort < 5000) {
    const port = currentSearchPort++;
    if (currentSearchPort >= 5000) currentSearchPort = 4001; // Cycle loop
    if (!allocatedPorts.has(port)) {
      allocatedPorts.add(port);
      return port;
    }
  }
  throw new Error("No free execution ports left inside the 4001-4999 range!");
}

function releasePort(port) {
  allocatedPorts.delete(port);
}

// Memory Processes Map
const processes = new Map();

function detectEntryFile(appDir, runtime) {
  if (!fs.existsSync(appDir)) return null;
  const files = fs.readdirSync(appDir);

  if (runtime === "nodejs" || runtime === "express") {
    const candidates = ["server.js", "app.js", "index.js", "main.js"];
    for (const c of candidates) {
      if (files.includes(c)) return c;
    }
  } else if (runtime === "python") {
    const candidates = ["app.py", "main.py", "server.py"];
    for (const c of candidates) {
      if (files.includes(c)) return c;
    }
  }
  return null;
}

async function startProcess({ appId, slug, runtime, startCommand, envVars = {}, appDir }) {
  if (processes.has(slug)) {
    logger.warn(`Process for app '${slug}' already exists in active map directory. Forcing restart.`);
    await stopProcess(slug);
  }

  const assignedPort = allocatePort();
  const dirPath = appDir || path.join("/tmp/bjc-apps", slug);
  fs.mkdirSync(dirPath, { recursive: true });

  const processMeta = {
    appId,
    slug,
    runtime,
    startCommand,
    envVars,
    appDir: dirPath,
    port: assignedPort,
    pid: null,
    process: null,
    logs: [],
    startedAt: new Date(),
    restartCount: 0,
    status: "starting"
  };

  processes.set(slug, processMeta);

  return executeSpawn(slug);
}

function executeSpawn(slug) {
  const meta = processes.get(slug);
  if (!meta) throw new Error(`Process metadata missing for slug: ${slug}`);

  // Auto-detect entry paths or fallback commands
  let cmd = "node";
  let args = [];

  const entry = detectEntryFile(meta.appDir, meta.runtime);

  if (meta.startCommand) {
    const parts = meta.startCommand.trim().split(/\s+/);
    cmd = parts[0];
    args = parts.slice(1);
  } else {
    // Standard heuristics fallback
    if (meta.runtime === "nodejs" || meta.runtime === "express" || meta.runtime === "node") {
      cmd = "node";
      args = [entry || "server.js"];
    } else if (meta.runtime === "python") {
      cmd = "python3";
      args = [entry || "main.py"];
    } else if (meta.runtime === "php") {
      cmd = "php";
      args = ["-S", `0.0.0.0:${meta.port}`];
    } else {
      // Default to light runner script
      cmd = "node";
      args = ["-e", `
        const express = require('express');
        const app = express();
        app.get('*', (req, res) => res.json({ status: "alive", runtime: "${meta.runtime}", app: "${meta.slug}" }));
        app.listen(${meta.port});
      `];
    }
  }

  // Inject PORT into environment parameter
  const env = {
    ...process.env,
    PORT: meta.port.toString(),
    ...meta.envVars
  };

  logger.info(`Spawning application '${meta.slug}': ${cmd} ${args.join(" ")} on port ${meta.port}`);
  
  const child = spawn(cmd, args, {
    cwd: meta.appDir,
    env: env
  });

  meta.process = child;
  meta.pid = child.pid;
  meta.status = "running";

  const addLog = (line) => {
    meta.logs.push(`[${new Date().toISOString()}] ${line}`);
    if (meta.logs.length > 500) meta.logs.shift(); // 500 line Ring Buffer limit
  };

  addLog(`[SYSTEM] Spawned service process (PID: ${child.pid}) bound to localhost:${meta.port}`);

  child.stdout?.on("data", (data) => {
    const text = data.toString().trim();
    addLog(text);
    logger.info(`[${meta.slug} stdout] ${text}`);
  });

  child.stderr?.on("data", (data) => {
    const text = data.toString().trim();
    addLog(text);
    logger.error(`[${meta.slug} stderr] ${text}`);
  });

  child.on("close", (code) => {
    addLog(`[SYSTEM] Application core process exited with exit code ${code}`);
    meta.pid = null;
    meta.process = null;

    if (meta.status === "running") {
      // Unplanned crash / termination exit
      meta.status = "error";
      if (meta.restartCount < 3) {
        meta.restartCount++;
        addLog(`[SYSTEM] Crash detected. Initiating auto-restart attempt ${meta.restartCount}/3 in 5 seconds...`);
        logger.warn(`App '${meta.slug}' crashed. Auto-restart #${meta.restartCount} queued in 5s...`);
        setTimeout(() => {
          if (processes.has(meta.slug) && meta.status === "error") {
            meta.startedAt = new Date();
            Promise.resolve(executeSpawn(meta.slug)).catch(err => {
              addLog(`[SYSTEM] Auto-restart initialization failed: ${err.message}`);
            });
          }
        }, 5000);
      } else {
        addLog(`[SYSTEM] CRITICAL: Max automatic restart thresholds exceeded (3/3). Process suspended.`);
        logger.error(`App '${meta.slug}' crossed the max auto-restart limit. Manual action is required.`);
      }
    }
  });

  return { port: meta.port, pid: child.pid };
}

async function stopProcess(slug) {
  const meta = processes.get(slug);
  if (!meta) return false;

  logger.info(`Stopping process for application slug: ${slug}`);
  meta.status = "stopped"; // Prevent auto-restart loops manually

  if (meta.process) {
    const child = meta.process;
    child.kill("SIGTERM");

    // Wait 5s timeout for natural exit, then force kill
    const forceKillTimeout = setTimeout(() => {
      if (meta.process) {
        logger.warn(`Application slug '${slug}' failed to exit gracefully under SIGTERM. Issuing SIGKILL.`);
        child.kill("SIGKILL");
      }
    }, 5000);

    await new Promise((resolve) => {
      child.on("close", () => {
        clearTimeout(forceKillTimeout);
        resolve();
      });
    });
  }

  releasePort(meta.port);
  processes.delete(slug);
  logger.info(`Process for '${slug}' cleanly terminated and unmapped.`);
  return true;
}

async function restartProcess(slug) {
  const meta = processes.get(slug);
  if (!meta) throw new Error(`Cannot restart non-registered process slug: ${slug}`);

  const appId = meta.appId;
  const runtime = meta.runtime;
  const startCommand = meta.startCommand;
  const envVars = meta.envVars;
  const appDir = meta.appDir;

  await stopProcess(slug);
  return startProcess({ appId, slug, runtime, startCommand, envVars, appDir });
}

function getProcessLogs(slug, lines = 100) {
  const meta = processes.get(slug);
  if (!meta) return [];
  return meta.logs.slice(-lines);
}

async function healthCheck(slug) {
  const meta = processes.get(slug);
  if (!meta || meta.status !== "running") return false;

  try {
    const response = await axios.get(`http://localhost:${meta.port}/`, { timeout: 5000 });
    return response.status >= 200 && response.status < 400;
  } catch (err) {
    logger.warn(`Healthcheck failed for route '${slug}' on port ${meta.port}: ${err.message}`);
    return false;
  }
}

// Reload all processes from DB on system boot
async function reloadFromDB() {
  logger.info("Initializing system process recovery: Fetching active applications from DB...");
  
  if (!process.env.DATABASE_URL) {
    logger.warn("No relational database cluster defined. Recovery skipped during standalone mode.");
    return;
  }

  const { Client } = require("pg");
  const pgClient = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await pgClient.connect();
    
    // Find all fullstack apps that should be actively serving
    const res = await pgClient.query(`
      SELECT id, name, slug, runtime, start_command, app_type 
      FROM apps 
      WHERE status = 'active' OR status = 'running'
    `);

    logger.info(`Found ${res.rows.length} active service nodes registering recovery states.`);
    
    const b2Storage = require("./b2Storage");
    const EnvVar = require("./EnvVar");

    for (const app of res.rows) {
      if (app.app_type === "static") {
        logger.info(`Recovery: Node '${app.slug}' is classified static edge. No host spawn required.`);
        continue;
      }

      const tempDir = path.join("/tmp/bjc-apps", app.slug);
      
      // If code files are missing from temp directory, fetch zip archive from B2 bucket and restore
      if (!fs.existsSync(tempDir) || fs.readdirSync(tempDir).length === 0) {
        logger.info(`Code files absent for '${app.slug}'. Restoring archive template from Backblaze B2...`);
        
        const zipKey = `deployments/${app.id}/active.zip`;
        const buffer = await b2Storage.download(zipKey);
        
        if (buffer) {
          const AdmZip = require("adm-zip");
          fs.mkdirSync(tempDir, { recursive: true });
          const zip = new AdmZip(buffer);
          zip.extractAllTo(tempDir, true);
          logger.info(`Successfully unzipped app archives for recovered node '${app.slug}' in ${tempDir}`);
        } else {
          logger.error(`Deployment zip file key '${zipKey}' not found in B2. Recovery failed.`);
          continue; // Move to next service
        }
      }

      // Fetch decrypted environment configurations
      const decryptedEnv = await EnvVar.getPlainObject(app.id);

      // Boot service process
      await startProcess({
        appId: app.id,
        slug: app.slug,
        runtime: app.runtime,
        startCommand: app.start_command,
        envVars: decryptedEnv,
        appDir: tempDir
      });

      // Hook up with main routing network proxy
      logger.info(`Recovered and bound router node for App: ${app.name}`);
    }
  } catch (err) {
    logger.error(`System restore process crashed: ${err.message}`);
  } finally {
    try {
      await pgClient.end();
    } catch (e) {}
  }
}

module.exports = {
  processes,
  startProcess,
  stopProcess,
  restartProcess,
  getProcessLogs,
  healthCheck,
  reloadFromDB
};
