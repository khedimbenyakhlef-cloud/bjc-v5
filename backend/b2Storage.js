const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const winston = require("winston");
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");

// Initialize logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Lazy S3 client initializer
let s3ClientInstance = null;

function getS3Client() {
  if (s3ClientInstance) return s3ClientInstance;

  const endpoint = process.env.B2_ENDPOINT;
  const accessKeyId = process.env.B2_APPLICATION_KEY_ID;
  const secretAccessKey = process.env.B2_APPLICATION_KEY;
  const region = process.env.B2_REGION || "us-east-1";

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    logger.warn("Backblaze B2 credentials NOT fully set in environment values. Storage routes will degrade gracefully.");
    return null;
  }

  s3ClientInstance = new S3Client({
    endpoint: endpoint,
    credentials: { accessKeyId, secretAccessKey },
    region: region,
    forcePathStyle: true
  });
  return s3ClientInstance;
}

const BUCKET = process.env.B2_BUCKET || "bjc-v5-vault";

// Backoff delay utility
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function upload(key, buffer, contentType = "application/octet-stream") {
  const client = getS3Client();
  if (!client) {
    logger.info(`[Storage Simulation] Saved file mock-upload block: ${key} (${buffer.length} bytes)`);
    return true;
  }

  let attempt = 0;
  const maxRetries = 3;
  let delay = 1000;

  while (attempt < maxRetries) {
    try {
      attempt++;
      await client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType
      }));
      logger.info(`Successfully uploaded ${key} to Backblaze B2 bucket on attempt ${attempt}`);
      return true;
    } catch (err) {
      logger.error(`Failed to upload ${key} on attempt ${attempt}: ${err.message}`);
      if (attempt >= maxRetries) {
        throw new Error(`S3 upload failed for ${key} after ${maxRetries} attempts`);
      }
      await sleep(delay);
      delay *= 2; // Exponential backoff
    }
  }
}

async function download(key) {
  const client = getS3Client();
  if (!client) {
    logger.info(`[Storage Simulation] Serving downloaded content from memory for key: ${key}`);
    return Buffer.from("// Mock B2 zip artifact container\nconsole.log('Operational runtime loader');");
  }

  try {
    const response = await client.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: key
    }));
    
    // Convert readable stream to Buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (err) {
    if (err.name === "NoSuchKey" || err.code === "NoSuchKey") {
      logger.info(`B2 key not found: ${key}. Returning null.`);
      return null;
    }
    logger.error(`B2 download error for key ${key}: ${err.message}`);
    return null; // Return null on NoSuchKey/generic missing instead of crashing
  }
}

async function downloadStream(key) {
  const client = getS3Client();
  if (!client) {
    throw new Error("No B2 client configured for streaming");
  }

  const response = await client.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: key
  }));
  return response.Body;
}

async function deleteFile(key) {
  const client = getS3Client();
  if (!client) {
    logger.info(`[Storage Simulation] Unlinked simulated object file key: ${key}`);
    return true;
  }

  try {
    await client.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key
    }));
    logger.info(`Successfully deleted file from B2: ${key}`);
    return true;
  } catch (err) {
    logger.error(`B2 delete error for key ${key}: ${err.message}`);
    throw err;
  }
}

async function listFiles(prefix = "") {
  const client = getS3Client();
  if (!client) {
    return [`uploads/example_app.zip`, `sites/api-gateway/index.html`];
  }

  try {
    const data = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix
    }));
    return (data.Contents || []).map((item) => item.Key);
  } catch (err) {
    logger.error(`B2 List error for prefix ${prefix}: ${err.message}`);
    throw err;
  }
}

async function deletePrefix(prefix) {
  const client = getS3Client();
  if (!client) {
    logger.info(`[Storage Simulation] Purged simulated prefix files collection under: ${prefix}`);
    return true;
  }

  try {
    const files = await listFiles(prefix);
    if (files.length === 0) return true;

    for (const fileKey of files) {
      await deleteFile(fileKey);
    }
    logger.info(`Successfully cleared all files under prefix ${prefix}`);
    return true;
  } catch (err) {
    logger.error(`Failed to delete prefix ${prefix}: ${err.message}`);
    throw err;
  }
}

async function uploadDirectory(localDir, b2Prefix) {
  logger.info(`Recursively scanning directory '${localDir}' to upload under prefix: ${b2Prefix}`);
  
  const filesWalk = (dir, filesList = []) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const name = path.join(dir, file);
      if (fs.statSync(name).isDirectory()) {
        filesWalk(name, filesList);
      } else {
        filesList.push(name);
      }
    }
    return filesList;
  };

  try {
    if (!fs.existsSync(localDir)) {
      logger.warn(`Path '${localDir}' does not exist. Skipping recursive upload.`);
      return;
    }

    const allFiles = filesWalk(localDir);
    for (const filePath of allFiles) {
      const relativePath = path.relative(localDir, filePath);
      const b2Key = path.join(b2Prefix, relativePath).replace(/\\/g, "/");
      const buffer = fs.readFileSync(filePath);
      const mimeType = mime.lookup(filePath) || "application/octet-stream";
      
      await upload(b2Key, buffer, mimeType);
    }
    logger.info(`Successfully completed recursive recursive upload to b2Prefix ${b2Prefix}`);
  } catch (err) {
    logger.error(`Error in uploadDirectory directory task: ${err.message}`);
    throw err;
  }
}

module.exports = {
  upload,
  download,
  downloadStream,
  deleteFile,
  deletePrefix,
  listFiles,
  uploadDirectory
};
