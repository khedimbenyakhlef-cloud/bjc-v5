const express = require("express");
const mime = require("mime-types");
const b2Storage = require("./b2Storage");
const processManager = require("./processManager");
const winston = require("winston");
const httpProxy = require("http-proxy");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const router = express.Router();
const proxy = httpProxy.createProxyServer({});

// Handle error events on reverse proxy to prevent server crash
proxy.on("error", (err, req, res) => {
  logger.error(`[Proxy Core Error] Failed to route to socket downstream: ${err.message}`);
  if (!res.headersSent) {
    res.status(502).json({ error: "Service Gateway Timeout - Target process busy or crashed." });
  }
});

// Helper function — shared proxy/static logic for both /site/ and /apps/ routes
async function handleAppRequest(req, res, slug) {
  
  // 1. Check if the app is a running Fullstack dynamic process
  const activeProcess = processManager.processes.get(slug);

  if (activeProcess) {
    if (activeProcess.status === "running") {
      const target = `http://localhost:${activeProcess.port}`;
      logger.info(`Proxying network connection for /site/${slug} -> Downstream Core Target: ${target}`);
      
      // Rewrite request paths — strip both /site/:slug and /apps/:slug prefixes
      req.url = req.url.replace(`/site/${slug}`, "").replace(`/apps/${slug}`, "") || "/";
      
      return proxy.web(req, res, { target });
    } else {
      return res.status(503).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Service Unavailable</title><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-slate-950 text-white flex items-center justify-center h-screen font-sans">
          <div class="p-8 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-sm text-center">
            <span class="text-xs font-mono px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">NODE_SUSPENDED</span>
            <h1 class="text-xl font-bold mt-4 mb-2">Service is Sleeping</h1>
            <p class="text-sm text-slate-400">The application target '${slug}' is currently in an inactive or crashed state.</p>
          </div>
        </body>
        </html>
      `);
    }
  }

  // 2. Otherwise, treat query context as a Static Site stream directly from Backblaze B2 Storage bucket
  try {
    // Clean and extract path variables safely
    const requestedPath = req._bjcPath || req.params[0] || "index.html";
    let b2KeyPath = `sites/${slug}/${requestedPath}`;

    // Standard SPA Routing Fallback Logic:
    // If we can list files but this specific file is absent, fallback index.html context
    const bucketFiles = await b2Storage.listFiles(`sites/${slug}/`);
    
    let targetKey = b2KeyPath;
    let isHtml = requestedPath.endsWith(".html") || !requestedPath.includes(".");

    if (!bucketFiles.includes(b2KeyPath)) {
      // Fallback index file
      const indexFallbackKey = `sites/${slug}/index.html`;
      if (bucketFiles.includes(indexFallbackKey)) {
        targetKey = indexFallbackKey;
        isHtml = true;
      } else {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head><title>No Service Node Found</title><script src="https://cdn.tailwindcss.com"></script></head>
          <body class="bg-slate-950 text-white flex items-center justify-center h-screen font-sans">
            <div class="p-8 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-sm text-center">
              <span class="text-xs font-mono px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">404 NOT FOUND</span>
              <h1 class="text-xl font-bold mt-4 mb-2">No Service Found</h1>
              <p class="text-sm text-slate-400">The server routing proxy couldn't map any active static or fullstack node under site '${slug}'.</p>
            </div>
          </body>
          </html>
        `);
      }
    }

    // Download content buffer or stream
    const fileBytesBuffer = await b2Storage.download(targetKey);
    
    if (!fileBytesBuffer) {
      return res.status(404).send("File Asset Unavailable");
    }

    // Set precise MIME headers
    const contentType = mime.lookup(targetKey) || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    // Optimize page asset speeds with smart caching
    if (isHtml) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    } else {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); // 1 year cache headers for fast local asset parsing
    }

    return res.end(fileBytesBuffer);

  } catch (err) {
    logger.error(`Edge routing failure under static stream route: ${err.message}`);
    return res.status(500).send("Primary site router routing container exception.");
  }
}

// Dynamic router and proxy mapping logic — supports both /site/:slug and /apps/:slug
router.all("/site/:slug/*", async (req, res) => {
  const { slug } = req.params;
  const requestedPath = req.params[0] || "index.html";
  // Attach path to req for handleAppRequest
  req._bjcPath = requestedPath;
  await handleAppRequest(req, res, slug);
});

router.all("/apps/:slug", async (req, res) => {
  const { slug } = req.params;
  req._bjcPath = "index.html";
  await handleAppRequest(req, res, slug);
});

router.all("/apps/:slug/*", async (req, res) => {
  const { slug } = req.params;
  req._bjcPath = req.params[0] || "index.html";
  await handleAppRequest(req, res, slug);
});

module.exports = router;
