const crypto = require("crypto");
const { Client } = require("pg");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Vault Encryption Configuration
const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest() 
  : crypto.randomBytes(32); // Fallback ephemeral key for standalone executions

function encrypt(text) {
  if (!text) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

function decrypt(stored) {
  if (!stored) return "";
  try {
    const parts = stored.split(":");
    if (parts.length !== 2) return stored; // Standard text representation (retro-compatibility)
    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = Buffer.from(parts[1], "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    logger.error("Environment variable decryption failed physically. Bad key or corrupted block: " + err.message);
    return "[DECRYPTION_ERROR]";
  }
}

// Memory fallback to support standalone instant testing
const memoryStore = new Map();

async function getClient() {
  if (!process.env.DATABASE_URL) return null;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}

async function set(appId, key, value, isSecret = false) {
  const finalValue = isSecret ? encrypt(value) : value;
  const client = await getClient();

  if (!client) {
    const appMap = memoryStore.get(appId) || {};
    appMap[key] = { value: finalValue, isSecret };
    memoryStore.set(appId, appMap);
    logger.info(`[Vault Simulation] Set key '${key}' for appId '${appId}' (isSecret=${isSecret})`);
    return { appId, key, isSecret };
  }

  try {
    await client.query(`
      INSERT INTO env_vars (app_id, key, value_enc, is_secret, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (app_id, key) 
      DO UPDATE SET value_enc = EXCLUDED.value_enc, is_secret = EXCLUDED.is_secret, updated_at = NOW();
    `, [appId, key, finalValue, isSecret]);
    
    logger.info(`Successfully saved environment parameter in database: ${key}`);
    return { appId, key, isSecret };
  } catch (err) {
    logger.error(`Database error setting env_vars: ${err.message}`);
    throw err;
  } finally {
    await client.end();
  }
}

async function getAll(appId) {
  const client = await getClient();

  if (!client) {
    const appMap = memoryStore.get(appId) || {};
    return Object.entries(appMap).map(([key, item]) => ({
      key,
      value: item.isSecret ? "••••••••" : item.value,
      is_secret: item.isSecret
    }));
  }

  try {
    const res = await client.query(`
      SELECT key, value_enc, is_secret FROM env_vars WHERE app_id = $1
    `, [appId]);
    
    return res.rows.map(row => ({
      key: row.key,
      value: row.is_secret ? "••••••••" : row.value_enc,
      is_secret: row.is_secret
    }));
  } catch (err) {
    logger.error(`Database error getting env_vars: ${err.message}`);
    throw err;
  } finally {
    await client.end();
  }
}

async function getPlainObject(appId) {
  const plain = {};
  const client = await getClient();

  if (!client) {
    const appMap = memoryStore.get(appId) || {};
    Object.entries(appMap).forEach(([key, item]) => {
      plain[key] = item.isSecret ? decrypt(item.value) : item.value;
    });
    return plain;
  }

  try {
    const res = await client.query(`
      SELECT key, value_enc, is_secret FROM env_vars WHERE app_id = $1
    `, [appId]);
    
    res.rows.forEach(row => {
      plain[row.key] = row.is_secret ? decrypt(row.value_enc) : row.value_enc;
    });
    return plain;
  } catch (err) {
    logger.error(`Database error compiling plain object credentials: ${err.message}`);
    throw err;
  } finally {
    await client.end();
  }
}

async function deleteKey(appId, key) {
  const client = await getClient();

  if (!client) {
    const appMap = memoryStore.get(appId) || {};
    delete appMap[key];
    memoryStore.set(appId, appMap);
    logger.info(`[Vault Simulation] Deleted variable key '${key}' for appId '${appId}'`);
    return true;
  }

  try {
    await client.query(`
      DELETE FROM env_vars WHERE app_id = $1 AND key = $2
    `, [appId, key]);
    logger.info(`Removed key '${key}' from database env_vars registry`);
    return true;
  } catch (err) {
    logger.error(`Database error deleting env key: ${err.message}`);
    throw err;
  } finally {
    await client.end();
  }
}

module.exports = {
  encrypt,
  decrypt,
  set,
  getAll,
  getPlainObject,
  deleteKey
};
