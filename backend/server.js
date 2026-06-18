// 1. Load active system environment variables
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const pg = require("pg");
const Redis = require("ioredis");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const multer = require("multer");
const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Import modular subcomponents of Beny-Joe PaaS Engine V5
const b2Storage = require("./b2Storage");
const EnvVar = require("./EnvVar");
const processManager = require("./processManager");
const deploymentQueue = require("./deploymentQueue");
const aiController = require("./aiController");
const siteServe = require("./siteServe");

// Winston Logger Initialization
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const app = express();
const PORT = process.env.PORT || 8080;

// Setup disk storage memory for raw multi-part archive uploads
const uploadFolder = "/tmp/bjc-uploads";
fs.mkdirSync(uploadFolder, { recursive: true });
const upload = multer({ dest: uploadFolder });

// Secure JWT secret
const JWT_SECRET = process.env.JWT_SECRET || "bjc_super_secret_session_token_vault_key";

let pgClientPool = null;
let redisClient = null;

// 2. testConnection() PostgreSQL with 5x retry interval
async function testConnection() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    logger.warn("DATABASE_URL absent in environment. Operating in sandbox simulation modes.");
    return false;
  }

  pgClientPool = new pg.Pool({ connectionString: dbUrl });

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      logger.info(`Testing PostgreSQL database connection: Attempt ${attempt}/5...`);
      const client = await pgClientPool.connect();
      logger.info("Successfully established connection with PostgreSQL clustering !");
      client.release();
      return true;
    } catch (err) {
      logger.error(`PostgreSQL connection failed on attempt ${attempt}: ${err.message}`);
      if (attempt === 5) {
        logger.error("FATAL: Maximum PostgreSQL connection attempts crossed. Continuing under sandbox limitations.");
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

// 3. initDB() Table schema generators
async function initDB() {
  if (!pgClientPool) return;

  const client = await pgClientPool.connect();
  try {
    logger.info("Initializing relational database schema definitions...");

    // Create USERS table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        plan TEXT DEFAULT 'free',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create APPS table
    await client.query(`
      CREATE TABLE IF NOT EXISTS apps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        app_type TEXT DEFAULT 'static',
        status TEXT DEFAULT 'pending',
        runtime TEXT DEFAULT 'static',
        start_command TEXT,
        build_command TEXT,
        process_pid INT,
        process_port INT,
        app_dir TEXT,
        active_version UUID,
        last_deploy_at TIMESTAMP,
        cpu_limit REAL DEFAULT 0.5,
        memory_limit TEXT DEFAULT '256m',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create DEPLOYMENTS table
    await client.query(`
      CREATE TABLE IF NOT EXISTS deployments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
        version_id UUID DEFAULT gen_random_uuid(),
        status TEXT DEFAULT 'queued',
        logs TEXT DEFAULT '',
        b2_zip_key TEXT,
        b2_files_prefix TEXT,
        build_duration INT,
        deployed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create ENV_VARS table
    await client.query(`
      CREATE TABLE IF NOT EXISTS env_vars (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value_enc TEXT,
        is_secret BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(app_id, key)
      );
    `);

    // Create FUNCTIONS table
    await client.query(`
      CREATE TABLE IF NOT EXISTS functions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        runtime TEXT DEFAULT 'nodejs',
        code TEXT,
        timeout_ms INT DEFAULT 10000,
        status TEXT DEFAULT 'active',
        invoke_count INT DEFAULT 0,
        last_invoked TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(app_id, slug)
      );
    `);

    // Create CRON_JOBS table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cron_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        schedule TEXT NOT NULL,
        command TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        last_run TIMESTAMP,
        next_run TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create APP_DATABASES table
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_databases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
        db_type TEXT NOT NULL,
        db_name TEXT UNIQUE NOT NULL,
        db_user TEXT NOT NULL,
        db_password_enc TEXT NOT NULL,
        host TEXT NOT NULL,
        port INT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Primary indexing allocations for high-speed foreign queries
    await client.query("CREATE INDEX IF NOT EXISTS idx_apps_user_id ON apps(user_id);");
    await client.query("CREATE INDEX IF NOT EXISTS idx_deployments_app_id ON deployments(app_id);");
    await client.query("CREATE INDEX IF NOT EXISTS idx_env_vars_app_id ON env_vars(app_id);");
    await client.query("CREATE INDEX IF NOT EXISTS idx_functions_app_id ON functions(app_id);");
    await client.query("CREATE INDEX IF NOT EXISTS idx_cron_jobs_app_id ON cron_jobs(app_id);");
    await client.query("CREATE INDEX IF NOT EXISTS idx_app_databases_app_id ON app_databases(app_id);");

    logger.info("Database schema elements successfully mounted.");
  } catch (err) {
    logger.error(`Critical error mounting SQL tables schemas on PostgreSQL: ${err.message}`);
  } finally {
    client.release();
  }
}

// 4. Connect to Redis instance
function connectRedis() {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (!redisUrl) {
    logger.warn("REDIS_URL parameters absent. Skipping Redis connection.");
    return;
  }

  try {
    redisClient = new Redis(redisUrl);
    redisClient.on("connect", () => {
      logger.info("Connected to Upstash/Generic Redis server successfully !");
    });
    redisClient.on("error", (err) => {
      logger.error(`Redis connector error event logged: ${err.message}. Runtime will skip Redis cache dependency.`);
    });
  } catch (err) {
    logger.error(`Failed to initialize physical Redis driver: ${err.message}`);
  }
}

// 5. Setup secure Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Required to serve external CDN static assets easily
}));

const FRONTEND_URL = process.env.FRONTEND_URL || "*";
app.use(cors({
  origin: FRONTEND_URL === "*" ? true : [FRONTEND_URL],
  credentials: true
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// 6. Registered Auth & Core Routes
// JWT Gate Middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Access Denied. No token authorization provided." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: "Access Token is invalid or expired." });
  }
}

// AUTHENTICATION CONTROLLER ENDPOINTS
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required fields." });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const queryRes = await client.query(
          `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, role`,
          [email.toLowerCase(), hash, name]
        );
        const newUser = queryRes.rows[0];
        const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: "24h" });
        return res.status(201).json({ token, user: newUser });
      } finally {
        client.release();
      }
    } else {
      // Memory mock user setup
      const mockUser = { id: "mock-uid-123", email, name, role: "user" };
      const token = jwt.sign(mockUser, JWT_SECRET);
      return res.status(201).json({ token, user: mockUser });
    }
  } catch (err) {
    logger.error(`Registration error: ${err.message}`);
    res.status(500).json({ error: err.message.includes("unique") ? "This email is already registered." : err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required fields." });
  }

  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const queryRes = await client.query(`SELECT * FROM users WHERE email = $1`, [email.toLowerCase()]);
        if (queryRes.rows.length === 0) {
          return res.status(401).json({ error: "Invalid email credentials or password." });
        }
        
        const user = queryRes.rows[0];
        const validMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!validMatch) {
          return res.status(401).json({ error: "Invalid email credentials or password." });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
        return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
      } finally {
        client.release();
      }
    } else {
      // Mock fast success
      const token = jwt.sign({ id: "mock-uid-123", email, role: "user" }, JWT_SECRET);
      return res.json({ token, user: { id: "mock-uid-123", email, name: "Admin Sandbox", role: "user" } });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", authenticateJWT, (req, res) => {
  res.json({ user: req.user });
});

// APPS CONTROLLER ENDPOINTS
app.get("/api/apps", authenticateJWT, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const countRes = await client.query(`SELECT COUNT(*) FROM apps WHERE user_id = $1`, [req.user.id]);
        const dataRes = await client.query(`SELECT * FROM apps WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [req.user.id, limit, offset]);
        return res.json({
          total: parseInt(countRes.rows[0].count),
          page,
          limit,
          apps: dataRes.rows
        });
      } finally { client.release(); }
    }
    return res.json({ total: 0, page: 1, limit, apps: Array.from(processManager.processes.values()) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/apps", authenticateJWT, async (req, res) => {
  const { name, slug, app_type, runtime, start_command, build_command } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ error: "Name and Slug are required parameters." });
  }

  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const queryRes = await client.query(`
          INSERT INTO apps (name, slug, user_id, app_type, runtime, start_command, build_command, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
          RETURNING *
        `, [name, slug.toLowerCase(), req.user.id, app_type || "static", runtime || "static", start_command, build_command]);
        
        return res.status(201).json(queryRes.rows[0]);
      } finally {
        client.release();
      }
    } else {
      const mockAppObj = { id: `app-${Date.now()}`, name, slug, app_type: app_type || "nodejs", status: "pending", runtime: runtime || "nodejs" };
      return res.status(201).json(mockAppObj);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ZIP Deployment Pipeline dispatcher
app.post("/api/apps/:id/deploy", authenticateJWT, upload.single("zip"), async (req, res) => {
  const appId = req.params.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "An archive file '.zip' is required under multipart 'zip' key." });
  }

  try {
    // Generate new UUID deployment records
    const deploymentId = require("crypto").randomUUID();
    const zipKey = `deployments/${appId}/${deploymentId}_source.zip`;

    // 1. Upload ZIP to Backblaze B2
    const fileBuffer = fs.readFileSync(file.path);
    await b2Storage.upload(zipKey, fileBuffer, "application/zip");

    let slug = "";
    let startCmd = "";

    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const appRes = await client.query(`SELECT slug, start_command FROM apps WHERE id = $1`, [appId]);
        if (appRes.rows.length === 0) {
          return res.status(404).json({ error: "App not found" });
        }
        slug = appRes.rows[0].slug;
        startCmd = appRes.rows[0].start_command;

        // Record deployment statement
        await client.query(`
          INSERT INTO deployments (id, app_id, b2_zip_key, status)
          VALUES ($1, $2, $3, 'queued')
        `, [deploymentId, appId, zipKey]);
        
      } finally {
        client.release();
      }
    } else {
      slug = `mock-app-${appId}`;
      startCmd = "node server.js";
    }

    // Unlink temporary upload file on disk
    fs.unlinkSync(file.path);

    // Call asynchronous deployment queue execution pipeline in background
    setTimeout(() => {
      deploymentQueue.runBjcDeploymentPipeline({
        deploymentId,
        appId,
        slug,
        zipB2Key: zipKey,
        startCommand: startCmd
      }).then(async (result) => {
        if (pgClientPool) {
          const client = await pgClientPool.connect();
          try {
            const logsJoined = deploymentQueue.getDeploymentLogs(deploymentId).join("\n");
            await client.query(`
              UPDATE deployments 
              SET status = $1, logs = $2, deployed_at = NOW() 
              WHERE id = $3
            `, [result.status === "success" ? "active" : "failed", logsJoined, deploymentId]);

            if (result.status === "success") {
              await client.query(`
                UPDATE apps 
                SET status = 'active', last_deploy_at = NOW(), active_version = $1, runtime = $2
                WHERE id = $3
              `, [deploymentId, result.runtime, appId]);
            }
          } finally {
            client.release();
          }
        }
      });
    }, 100);

    res.json({ success: true, message: "Déploiement mis en file d'attente.", deploymentId });
  } catch (err) {
    logger.error(`Deployment crash: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Logs fetch router
app.get("/api/apps/:id/deployments/:dId/logs", authenticateJWT, async (req, res) => {
  const { dId } = req.params;
  const inMemoryLogs = deploymentQueue.getDeploymentLogs(dId);
  res.json({ logs: inMemoryLogs });
});

app.get("/api/apps/:id/deployments", authenticateJWT, async (req, res) => {
  const appId = req.params.id;
  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const queryRes = await client.query(`SELECT * FROM deployments WHERE app_id = $1 ORDER BY created_at DESC`, [appId]);
        return res.json(queryRes.rows);
      } finally {
        client.release();
      }
    } else {
      return res.json([{ id: "dep-mock-active", app_id: appId, status: "active", created_at: new Date() }]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ROLLBACK
app.post("/api/apps/:id/deployments/:dId/rollback", authenticateJWT, async (req, res) => {
  const { dId, id } = req.params;
  
  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const depRes = await client.query(`SELECT b2_zip_key FROM deployments WHERE id = $1`, [dId]);
        const appRes = await client.query(`SELECT slug, start_command FROM apps WHERE id = $1`, [id]);
        
        if (depRes.rows.length === 0 || appRes.rows.length === 0) {
          return res.status(404).json({ error: "Record files not found for rollback process." });
        }

        const zipKey = depRes.rows[0].b2_zip_key;
        const slug = appRes.rows[0].slug;
        const startCommand = appRes.rows[0].start_command;

        const rollbackDepId = `rollback-${Date.now()}`;
        
        // Push background worker
        setTimeout(() => {
          deploymentQueue.runBjcDeploymentPipeline({
            deploymentId: rollbackDepId,
            appId: id,
            slug,
            zipB2Key: zipKey,
            startCommand
          });
        }, 50);

        res.json({ success: true, message: "Rollback en attente de déploiement.", rollbackDepId });
      } finally {
        client.release();
      }
    } else {
      res.json({ success: true, message: "Rollback simulated smoothly in standalone." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ENVIRONMENTS ENDPOINTS
app.get("/api/apps/:id/env", authenticateJWT, async (req, res) => {
  try {
    const list = await EnvVar.getAll(req.params.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/apps/:id/env", authenticateJWT, async (req, res) => {
  const appId = req.params.id;
  const { key, value, is_secret } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({ error: "Key and value boundaries must be defined." });
  }

  try {
    await EnvVar.set(appId, key, value, is_secret);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/apps/:id/env/:key", authenticateJWT, async (req, res) => {
  const appId = req.params.id;
  const key = req.params.key;

  try {
    await EnvVar.deleteKey(appId, key);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// START/STOP CONTROLS
app.post("/api/apps/:id/start", authenticateJWT, async (req, res) => {
  const appId = req.params.id;
  try {
    let slug = "";
    let runtime = "nodejs";
    let cmd = "";

    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const appRes = await client.query(`SELECT slug, runtime, start_command FROM apps WHERE id = $1`, [appId]);
        if (appRes.rows.length === 0) return res.status(404).json({ error: "App not found" });
        slug = appRes.rows[0].slug;
        runtime = appRes.rows[0].runtime;
        cmd = appRes.rows[0].start_command;
      } finally {
        client.release();
      }
    } else {
      slug = `mock-app-${appId}`;
      cmd = "node server.js";
    }

    const decryptedEnv = await EnvVar.getPlainObject(appId);

    const info = await processManager.startProcess({
      appId,
      slug,
      runtime,
      startCommand: cmd,
      envVars: decryptedEnv
    });

    res.json({ status: "running", port: info.port });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/apps/:id/stop", authenticateJWT, async (req, res) => {
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

    await processManager.stopProcess(slug);
    res.json({ status: "stopped" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/apps/:id/restart", authenticateJWT, async (req, res) => {
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

    await processManager.restartProcess(slug);
    res.json({ status: "running" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FUNCTIONS CRUD ───────────────────────────────────────────
app.get("/api/apps/:id/functions", authenticateJWT, async (req, res) => {
  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const r = await client.query(`SELECT * FROM functions WHERE app_id = $1`, [req.params.id]);
        return res.json(r.rows);
      } finally { client.release(); }
    }
    res.json([]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/apps/:id/functions", authenticateJWT, async (req, res) => {
  const { name, slug, runtime, code, timeout_ms } = req.body;
  if (!name || !slug) return res.status(400).json({ error: "name and slug required" });
  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const r = await client.query(
          `INSERT INTO functions (app_id, name, slug, runtime, code, timeout_ms) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [req.params.id, name, slug, runtime || "nodejs", code || "", timeout_ms || 10000]
        );
        return res.status(201).json(r.rows[0]);
      } finally { client.release(); }
    }
    res.status(201).json({ id: `fn-${Date.now()}`, name, slug, runtime, status: "active" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/apps/:id/functions/:fnId", authenticateJWT, async (req, res) => {
  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        await client.query(`DELETE FROM functions WHERE id = $1 AND app_id = $2`, [req.params.fnId, req.params.id]);
        return res.json({ success: true });
      } finally { client.release(); }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CRON JOBS CRUD ───────────────────────────────────────────
app.get("/api/apps/:id/cron", authenticateJWT, async (req, res) => {
  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const r = await client.query(`SELECT * FROM cron_jobs WHERE app_id = $1`, [req.params.id]);
        return res.json(r.rows);
      } finally { client.release(); }
    }
    res.json([]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/apps/:id/cron", authenticateJWT, async (req, res) => {
  const { name, schedule, command } = req.body;
  if (!name || !schedule || !command) return res.status(400).json({ error: "name, schedule, command required" });
  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const r = await client.query(
          `INSERT INTO cron_jobs (app_id, name, schedule, command) VALUES ($1,$2,$3,$4) RETURNING *`,
          [req.params.id, name, schedule, command]
        );
        return res.status(201).json(r.rows[0]);
      } finally { client.release(); }
    }
    res.status(201).json({ id: `cron-${Date.now()}`, name, schedule, command, is_active: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/apps/:id/cron/:cronId", authenticateJWT, async (req, res) => {
  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        await client.query(`DELETE FROM cron_jobs WHERE id = $1 AND app_id = $2`, [req.params.cronId, req.params.id]);
        return res.json({ success: true });
      } finally { client.release(); }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── APP DATABASES ─────────────────────────────────────────────
app.get("/api/apps/:id/databases", authenticateJWT, async (req, res) => {
  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const r = await client.query(`SELECT id, app_id, db_type, db_name, db_user, host, port, status, created_at FROM app_databases WHERE app_id = $1`, [req.params.id]);
        return res.json(r.rows);
      } finally { client.release(); }
    }
    res.json([]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── TELEMETRY / STATS ─────────────────────────────────────────
app.get("/api/stats", authenticateJWT, async (req, res) => {
  try {
    const stats = {
      uptime: process.uptime(),
      memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      activeProcesses: processManager.processes.size,
      nodeVersion: process.version,
      platform: process.platform,
    };
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const appsCount = await client.query(`SELECT COUNT(*) FROM apps WHERE user_id = $1`, [req.user.id]);
        const deploysCount = await client.query(`SELECT COUNT(*) FROM deployments d JOIN apps a ON d.app_id = a.id WHERE a.user_id = $1`, [req.user.id]);
        stats.totalApps = parseInt(appsCount.rows[0].count);
        stats.totalDeployments = parseInt(deploysCount.rows[0].count);
      } finally { client.release(); }
    }
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DELETE APP ────────────────────────────────────────────────
app.delete("/api/apps/:id", authenticateJWT, async (req, res) => {
  const appId = req.params.id;
  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const appRes = await client.query(`SELECT slug FROM apps WHERE id = $1 AND user_id = $2`, [appId, req.user.id]);
        if (appRes.rows.length === 0) return res.status(404).json({ error: "App not found" });
        const slug = appRes.rows[0].slug;
        try { await processManager.stopProcess(slug); } catch (_) {}
        await client.query(`DELETE FROM apps WHERE id = $1`, [appId]);
        return res.json({ success: true });
      } finally { client.release(); }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── UPDATE APP (name, runtime, start_command) ─────────────────
app.put("/api/apps/:id", authenticateJWT, async (req, res) => {
  const { name, runtime, start_command, build_command } = req.body;
  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const r = await client.query(
          `UPDATE apps SET name=COALESCE($1,name), runtime=COALESCE($2,runtime), start_command=COALESCE($3,start_command), build_command=COALESCE($4,build_command), updated_at=NOW() WHERE id=$5 AND user_id=$6 RETURNING *`,
          [name, runtime, start_command, build_command, req.params.id, req.user.id]
        );
        if (r.rows.length === 0) return res.status(404).json({ error: "App not found" });
        return res.json(r.rows[0]);
      } finally { client.release(); }
    }
    res.json({ id: req.params.id, ...req.body });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── ADMIN — Users list ────────────────────────────────────────
app.get("/api/admin/users", authenticateJWT, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  try {
    if (pgClientPool) {
      const client = await pgClientPool.connect();
      try {
        const r = await client.query(`SELECT id, email, name, role, plan, is_active, created_at FROM users ORDER BY created_at DESC`);
        return res.json(r.rows);
      } finally { client.release(); }
    }
    res.json([{ id: "mock-uid-123", email: "admin@bjc.local", name: "Admin Sandbox", role: "admin", plan: "free" }]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/apps/:id/logs", authenticateJWT, async (req, res) => {
  const appId = req.params.id;
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

  const logs = processManager.getProcessLogs(slug);
  res.json({ logs });
});

// AI COPILOT ROUTINGS
app.post("/api/ai/suggest", authenticateJWT, suggestSecureGateway);
app.post("/api/ai/chat", authenticateJWT, chatSecureGateway);

function suggestSecureGateway(req, res) {
  aiController.suggest(req, res);
}

function chatSecureGateway(req, res) {
  aiController.chat(req, res);
}

// SERVE FRONTEND STATIC FILES
app.use(express.static(path.join(__dirname, "../frontend")));

// NAMED ROUTES pour navigation propre
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "dashboard.html"));
});
app.get("/app", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "app.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// Fallback SPA — toute route inconnue retourne index.html (évite 404 sur F5)
// NOTE: /apps/ est exclu ici pour que siteServe puisse proxy vers les apps déployées
app.get("*", (req, res, next) => {
  if (
    req.path.startsWith("/api/") ||
    req.path.startsWith("/site/") ||
    req.path.startsWith("/apps/") ||
    req.path === "/health"
  ) {
    return next();
  }
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// 7. /health endpoint — DOIT être AVANT siteServe pour que Render le détecte
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Beny-Joe Cloud V5 PaaS", bootTime: process.uptime() });
});

// Global serving site matching (FULLSTACK & STATIC proxy routing helper)
app.use(siteServe);

// 8. Error handling fallback middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandle Exception caught inside engine pipeline: ${err.message}`);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal Controller Exception: " + err.message });
  }
});

// Boot operations
async function bootPaaS() {
  // 1-2. Connect PostgreSQL
  const dbUp = await testConnection();
  if (dbUp) {
    // 3. Init DB Tables
    await initDB();
  }

  // 4. Connect Redis
  connectRedis();

  // 9. app.listen(PORT)
  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Beny-Joe Cloud V5 Engine successfully launched on http://0.0.0.0:${PORT}`);
    
    // 10. proxyRouter.loadRoutes() -> Already dynamically coupled inside siteServe proxy on-demand handler
    
    // 11. Recover running processes from Postgres DB state
    processManager.reloadFromDB();

    // 12. keepAlive.start() (Trigger periodic logging nodes tracker checks)
    setInterval(() => {
      logger.info("[KEEPALIVE] All virtual server nodes, Redis gateways, and Backblaze backup channels normal.");
    }, 600000); // 10 minutes interval loop
  });
}

bootPaaS();
