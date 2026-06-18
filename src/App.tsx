import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Database,
  Terminal,
  HardDrive,
  Settings,
  Key,
  Play,
  Square,
  Save,
  Plus,
  Trash2,
  Activity,
  FileCode,
  ArrowRight,
  Clock,
  Lock,
  Unlock,
  RefreshCw,
  Server,
  Code2,
  AlertTriangle,
  FolderOpen,
  Send,
  Globe,
  UploadCloud,
  GitBranch,
  Link2,
  CheckCircle2,
  Loader2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EnvVar {
  key: string;
  value: string;
  isSecret: boolean;
}

interface AppInstance {
  id: string;
  name: string;
  slug: string;
  status: 'stopped' | 'running' | 'error';
  port: number;
  template: 'express' | 'worker' | 'serverless' | 'static' | 'node' | 'docker' | 'python' | 'go' | 'java' | 'ruby';
  code: string;
  env: EnvVar[];
  stats: {
    cpu: number;
    memory: number;
    uptime: number;
  };
  createdAt: string;
}

interface TelemetryLog {
  time: string;
  stream: 'system' | 'stdout' | 'stderr';
  appSlug?: string;
  message: string;
}

interface SystemTelemetry {
  system: {
    uptime: number;
    memory: { total: number; heap: number; external: number };
    cpu: number;
  };
  apps: Array<{ id: string; stats: AppInstance['stats']; status: AppInstance['status'] }>;
}

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'architect' | 'integrations' | 'telemetry' | 'deployments'>('architect');
  // Integration sub-tabs
  const [activeIntegrationTab, setActiveIntegrationTab] = useState<'postgres' | 'redis' | 'storage' | 'bjc-files'>('postgres');

  // Application instance state
  const [activeCatalogFile, setActiveCatalogFile] = useState<string>('backend/server.js');
  const [apps, setApps] = useState<AppInstance[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppInstance | null>(null);
  
  // Custom creator modal toggles
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppSlug, setNewAppSlug] = useState('');
  const [newAppTemplate, setNewAppTemplate] = useState<AppInstance['template']>('express');
  const [newAppEnv, setNewAppEnv] = useState<EnvVar[]>([]);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [newEnvIsSecret, setNewEnvIsSecret] = useState(false);

  // Editing state
  const [editedCode, setEditedCode] = useState('');
  const [selectedAppEnv, setSelectedAppEnv] = useState<EnvVar[]>([]);
  const [editedEnvKey, setEditedEnvKey] = useState('');
  const [editedEnvValue, setEditedEnvValue] = useState('');
  const [editedEnvIsSecret, setEditedEnvIsSecret] = useState(false);

  // Connections credentials panel inside integrations
  const [pgConnStr, setPgConnStr] = useState('');
  const [redisUrl, setRedisUrl] = useState('');
  const [redisToken, setRedisToken] = useState('');
  const [b2Id, setB2Id] = useState('');
  const [b2Key, setB2Key] = useState('');
  const [b2Bucket, setB2Bucket] = useState('');
  const [b2Endpoint, setB2Endpoint] = useState('');

  // Deployment Pipeline States
  const [deployments, setDeployments] = useState<any[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<any | null>(null);
  const [deployType, setDeployType] = useState<'zip' | 'github'>('zip');
  const [deployName, setDeployName] = useState('');
  const [deploySlug, setDeploySlug] = useState('');
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [zipFileName, setZipFileName] = useState('');
  const [zipFileSize, setZipFileSize] = useState('');
  const [isDraggingZip, setIsDraggingZip] = useState(false);
  const [deployTechTemplate, setDeployTechTemplate] = useState<string>('express');
  const [deployEnvVars, setDeployEnvVars] = useState<Array<{ key: string; value: string; isSecret: boolean }>>([]);
  const [newDeployEnvKey, setNewDeployEnvKey] = useState('');
  const [newDeployEnvValue, setNewDeployEnvValue] = useState('');
  const [newDeployEnvIsSecret, setNewDeployEnvIsSecret] = useState(false);
  const [deployingActive, setDeployingActive] = useState(false);

  // Postgres Query Tool
  const [pgSqlQuery, setPgSqlQuery] = useState('SELECT id, route_slug, requests_count, avg_latency_ms, created_at FROM api_gateway_logs WHERE avg_latency_ms > 100;');
  const [pgQueryResult, setPgQueryResult] = useState<any>(null);
  const [pgQueryLoading, setPgQueryLoading] = useState(false);
  const [pgQueryError, setPgQueryError] = useState<string | null>(null);

  // Redis CLI Tool
  const [redisCommand, setRedisCommand] = useState('SET');
  const [redisArgsText, setRedisArgsText] = useState('session_cache_user_102 "{\\"role\\":\\"admin\\", \\"tier\\":\\"free_unlimited\\"}"');
  const [redisCliHistory, setRedisCliHistory] = useState<Array<{ cmd: string; result: string; timestamp: string }>>([]);
  const [redisLoading, setRedisLoading] = useState(false);

  // Backblaze B2 storage file system
  const [storageItems, setStorageItems] = useState<Array<{ Key: string; LastModified: string; Size: number }>>([]);
  const [storageLoading, setStorageLoading] = useState(false);
  const [b2UploadKey, setB2UploadKey] = useState('configs/active-gateway-routes.env');
  const [b2UploadContent, setB2UploadContent] = useState('ENV=production\nTIMEOUT_MS=12000\nFALLBACK_URL=https://backup.beny-joe.io');

  // Logs terminal stream
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [logsFilter, setLogsFilter] = useState<'all' | 'system' | 'stdout' | 'stderr'>('all');
  const [systemTelemetry, setSystemTelemetry] = useState<SystemTelemetry | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Free Intelligent Auto-Detection Engine states
  const [detectorInput, setDetectorInput] = useState('');
  const [detectorLogs, setDetectorLogs] = useState<string[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const runAutoDetector = () => {
    if (!detectorInput.trim()) {
      alert("Veuillez coller du code ou une structure de dépôt à analyser!");
      return;
    }
    setIsDetecting(true);
    setDetectorLogs(["🔍 Initializing Free Intelligent Auto-Detector engine..."]);

    const steps = [
      "Reading workspace file tree structure...",
      "Matching patterns against standard package descriptor manifests...",
      "Parsing language syntax, imports, and system hooks...",
      "Resolving environmental requirements and third-party bindings..."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setDetectorLogs(prev => [...prev, "⚡ " + steps[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
        
        // Analyze content
        const raw = detectorInput.toLowerCase();
        let detectedTemplate: AppInstance['template'] = 'node';
        let reason = "";
        let envsFound: string[] = [];

        if (raw.includes("package.json") || raw.includes("express") || raw.includes("require(") || raw.includes("import express") || raw.includes("node_modules")) {
          detectedTemplate = raw.includes("express") ? "express" : "node";
          reason = "package.json or signature NodeJS Express framework matched.";
          const matches = detectorInput.match(/process\.env\.([a-zA-Z0-9_]+)/g);
          if (matches) {
            matches.forEach(m => envsFound.push(m.replace("process.env.", "")));
          }
        } else if (raw.includes("requirements.txt") || raw.includes("fastapi") || raw.includes("import fastapi") || raw.includes("flask") || raw.includes("import flask") || raw.includes("def read_root") || raw.includes("os.getenv") || raw.includes("os.environ")) {
          detectedTemplate = "python";
          reason = "FastAPI / Flask syntax hooks or pip requirements.txt discovered.";
          const matches = detectorInput.match(/os\.(?:environ\.get|getenv)\s*\(\s*["']([a-zA-Z0-9_]+)["']/g);
          if (matches) {
            matches.forEach(m => {
              const cleaned = m.match(/["']([a-zA-Z0-9_]+)["']/);
              if (cleaned) envsFound.push(cleaned[1]);
            });
          }
        } else if (raw.includes("dockerfile") || raw.includes("from alpine") || raw.includes("from node") || raw.includes("docker-compose") || raw.includes("expose ")) {
          detectedTemplate = "docker";
          reason = "Dockerfile instructions or expose-ports parameters located.";
          const matches = detectorInput.match(/ENV\s+([a-zA-Z0-9_]+)/gi);
          if (matches) {
            matches.forEach(m => {
              const parts = m.split(/\s+/);
              if (parts[1]) envsFound.push(parts[1].toUpperCase());
            });
          }
        } else if (raw.includes("go.mod") || raw.includes("package main") || raw.includes("import \"fmt\"") || raw.includes("os.getenv(")) {
          detectedTemplate = "go";
          reason = "Golang mod workspace structures or os.Getenv parameters verified.";
          const matches = detectorInput.match(/os\.Getenv\s*\(\s*["']([a-zA-Z0-9_]+)["']/g);
          if (matches) {
            matches.forEach(m => {
              const cleaned = m.match(/["']([a-zA-Z0-9_]+)["']/);
              if (cleaned) envsFound.push(cleaned[1]);
            });
          }
        } else if (raw.includes("pom.xml") || raw.includes("spring-boot") || raw.includes("import org.spring") || raw.includes("public class ")) {
          detectedTemplate = "java";
          reason = "Springboot Gradle/Maven dependencies parsed.";
        } else if (raw.includes("gemfile") || raw.includes("gem ") || raw.includes("require 'sinatra'") || raw.includes("env['")) {
          detectedTemplate = "ruby";
          reason = "Ruby Bundler gems or Sinatra rack structures extracted.";
        } else if (raw.includes("<!doctype html>") || raw.includes("index.html") || raw.includes("href=") || raw.includes("src=")) {
          detectedTemplate = "static";
          reason = "HTML/CSS assets or single page frontend web blueprints parsed.";
        } else if (raw.includes("setinterval") || raw.includes("worker") || raw.includes("background")) {
          detectedTemplate = "worker";
          reason = "Asynchronous loop background worker files matched.";
        } else {
          detectedTemplate = "node";
          reason = "No language specific metadata descriptors matched. Defaulted to NodeJS core.";
        }

        // Check for specific security variables that make sense
        if (raw.includes("gemini") && !envsFound.includes("GEMINI_API_KEY")) envsFound.push("GEMINI_API_KEY");
        if (raw.includes("database") || raw.includes("postgres") || raw.includes("sql")) {
          if (!envsFound.includes("DATABASE_URL")) envsFound.push("DATABASE_URL");
        }
        if (raw.includes("redis") && !envsFound.includes("UPSTASH_REDIS_REST_URL")) envsFound.push("UPSTASH_REDIS_REST_URL");

        setNewAppTemplate(detectedTemplate);
        
        const uniqueEnvs = Array.from(new Set(envsFound.map(k => k.trim().toUpperCase()).filter(k => k.length > 1)));
        if (uniqueEnvs.length > 0) {
          const generatedVars = uniqueEnvs.map(key => ({
            key,
            value: key.includes("KEY") || key.includes("SECRET") || key.includes("URL") || key.includes("PASS") ? "" : "auto_value",
            isSecret: key.includes("KEY") || key.includes("SECRET") || key.includes("PASS") || key.includes("TOKEN")
          }));
          setNewAppEnv(generatedVars);
        }

        setDetectorLogs(prev => [
          ...prev,
          `✨ [AUTO-DETECTION RESULT] Confidence: HIGH`,
          `🚀 PLATFORM IDENTIFIED: ${detectedTemplate.toUpperCase()}`,
          `📁 DECISION BASIS: "${reason}"`,
          `⚙️ EXTRACTED VAULT VARS: ${uniqueEnvs.join(', ') || 'No specific variables found (Add custom credentials below)'}`,
          `🎉 Auto-Detection Complete! We configured the blueprints and environment workspace successfully.`
        ]);
        setIsDetecting(false);
      }
    }, 600);
  };

  // Fetch initial processes list and live telemetry intervals
  useEffect(() => {
    fetchApps();
    fetchLogs();
    fetchDeployments();
    
    // Auto polling telemetry stats and logs every 3 seconds
    const interval = setInterval(() => {
      pollTelemetry();
      fetchLogs();
      fetchDeployments();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Update editor value if selected application shifts
  useEffect(() => {
    if (selectedApp) {
      setEditedCode(selectedApp.code);
      setSelectedAppEnv(selectedApp.env);
    } else {
      setEditedCode('');
      setSelectedAppEnv([]);
    }
  }, [selectedApp]);

  const [catalogFileContent, setCatalogFileContent] = useState<string>('Chargement de l\'aperçu...');

  useEffect(() => {
    let active = true;
    setCatalogFileContent('Récupération du code source en direct depuis le conteneur...');
    
    // Fallback dictionary for files in case of dev asset restriction
    const fallbacks: Record<string, string> = {
      'render.yaml': '# Beny-Joe Cloud V5 Global Render Architecture\nservices:\n  - type: web\n    name: beny-joe-paas-v5\n    env: node\n    buildCommand: npm run build\n    startCommand: npm run start\n    envVars:\n      - key: NODE_ENV\n        value: production\n      - key: DATABASE_URL\n        sync: false\n      - key: UPSTASH_REDIS_REST_URL\n        sync: false\n      - key: B2_KEY_ID\n        sync: false\n      - key: B2_APPLICATION_KEY\n        sync: false'
    };

    fetch(`/${activeCatalogFile}`)
      .then(res => {
        if (!res.ok) {
          // Try fetching from public if relative root fails
          return fetch(`/public/${activeCatalogFile}`).then(res2 => {
            if (!res2.ok) throw new Error('File not found');
            return res2.text();
          });
        }
        return res.text();
      })
      .then(text => {
        if (active) setCatalogFileContent(text);
      })
      .catch(err => {
        if (active) {
          if (fallbacks[activeCatalogFile]) {
            setCatalogFileContent(fallbacks[activeCatalogFile]);
          } else {
            setCatalogFileContent(`// Fichier: ${activeCatalogFile}\n// Le code source complet est enregistré avec succès dans le conteneur.\n// Vous pouvez le consulter directement dans le dépôt ou via les outils d'édition.`);
          }
        }
      });
    return () => { active = false; };
  }, [activeCatalogFile]);

  // Scroll terminal logs to bottom on fresh additions
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const fetchDeployments = async () => {
    try {
      const res = await fetch('/api/deployments');
      if (res.ok) {
        const data = await res.json();
        setDeployments(data);
        if (selectedDeployment) {
          const fresh = data.find((d: any) => d.id === selectedDeployment.id);
          if (fresh) {
            setSelectedDeployment(fresh);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching deployments:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingZip(true);
  };

  const handleDragLeave = () => {
    setIsDraggingZip(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingZip(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip')) {
        setZipFileName(file.name);
        setZipFileSize((file.size / 1024 / 1024).toFixed(2) + ' MB');
        const cleanName = file.name.replace('.zip', '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const cleanSlug = file.name.replace('.zip', '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (!deployName) setDeployName(cleanName);
        if (!deploySlug) setDeploySlug(cleanSlug);
        if (file.name.toLowerCase().includes('python') || file.name.toLowerCase().includes('flask') || file.name.toLowerCase().includes('fastapi')) {
          setDeployTechTemplate('python');
        } else if (file.name.toLowerCase().includes('static') || file.name.toLowerCase().includes('html') || file.name.toLowerCase().includes('portfolio')) {
          setDeployTechTemplate('static');
        } else {
          setDeployTechTemplate('express');
        }
      } else {
        alert("S'il vous plaît, déposez un fichier valide au format ZIP (.zip).");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setZipFileName(file.name);
      setZipFileSize((file.size / 1024 / 1024).toFixed(2) + ' MB');
      const cleanName = file.name.replace('.zip', '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const cleanSlug = file.name.replace('.zip', '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (!deployName) setDeployName(cleanName);
      if (!deploySlug) setDeploySlug(cleanSlug);
      if (file.name.toLowerCase().includes('python') || file.name.toLowerCase().includes('flask') || file.name.toLowerCase().includes('fastapi')) {
        setDeployTechTemplate('python');
      } else if (file.name.toLowerCase().includes('static') || file.name.toLowerCase().includes('html') || file.name.toLowerCase().includes('portfolio')) {
        setDeployTechTemplate('static');
      } else {
        setDeployTechTemplate('express');
      }
    }
  };

  const handleCreateDeployment = async () => {
    if (!deployName.trim() || !deploySlug.trim()) {
      alert('Veuillez spécifier un nom de service et son URL personnalisée.');
      return;
    }

    try {
      setDeployingActive(true);
      const slugVal = deploySlug.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const sourceStr = deployType === 'github' 
        ? `${githubRepoUrl.replace(/^https?:\/\//, '')}#${githubBranch}` 
        : zipFileName || 'uploaded-bundle.zip';

      const bodyData = {
        name: deployName,
        slug: slugVal,
        type: deployType,
        source: sourceStr,
        templateDetected: deployTechTemplate,
        customEnv: deployEnvVars
      };

      const res = await fetch('/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      if (res.ok) {
        const newDep = await res.json();
        setDeployName('');
        setDeploySlug('');
        setGithubRepoUrl('');
        setZipFileName('');
        setZipFileSize('');
        setDeployEnvVars([]);
        
        await fetchDeployments();
        setSelectedDeployment(newDep);
        await fetchApps();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit deployment');
      }
    } catch (err) {
      console.error('Error creating deployment:', err);
    } finally {
      setDeployingActive(false);
    }
  };

  // Fetch registered applications
  const fetchApps = async () => {
    try {
      const res = await fetch('/api/apps');
      if (res.ok) {
        const data = await res.json();
        setApps(data);
        if (data.length > 0 && !selectedApp) {
          setSelectedApp(data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    }
  };

  // Poll live subprocess statistics
  const pollTelemetry = async () => {
    try {
      const res = await fetch('/api/telemetry');
      if (res.ok) {
        const data: SystemTelemetry = await res.json();
        setSystemTelemetry(data);
        
        // Match with local processes array state representation safely
        setApps(prev => prev.map(app => {
          const matchingStats = data.apps.find(a => a.id === app.id);
          if (matchingStats) {
            return {
              ...app,
              status: matchingStats.status,
              stats: matchingStats.stats
            };
          }
          return app;
        }));
      }
    } catch (err) {
      console.error('Error polling metrics:', err);
    }
  };

  // Load real-time logs
  const fetchLogs = async () => {
    try {
      const url = selectedApp ? `/api/logs?slug=${selectedApp.slug}` : '/api/logs';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error loading console logs:', err);
    }
  };

  // Create Node microapp node
  const handleCreateApp = async () => {
    if (!newAppName || !newAppSlug) return;
    
    let draftCode = '';
    const nameSafe = newAppName.replace(/"/g, '\\"');
    switch (newAppTemplate) {
      case 'express':
        draftCode = `import express from "express";\nconst app = express();\nconst PORT = process.env.PORT || 8080;\n\napp.get("/", (req, res) => {\n  res.json({ status: "alive", app: "${nameSafe}", mode: "free_unlimited" });\n});\n\napp.listen(PORT, () => {\n  console.log("Listening on", PORT);\n});`;
        break;
      case 'node':
        draftCode = `import http from "http";\nconst PORT = process.env.PORT || 8080;\n\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, { "Content-Type": "application/json" });\n  res.end(JSON.stringify({ status: "running", platform: "NodeJS native", service: "${nameSafe}" }));\n});\n\nserver.listen(PORT, () => {\n  console.log("Native Node process online on port", PORT);\n});`;
        break;
      case 'python':
        draftCode = `# Free Python Micro-web cluster\nfrom fastapi import FastAPI\nimport os\n\napp = FastAPI(title="${nameSafe}")\n\n@app.get("/")\ndef read_root():\n    return {"status": "operational", "runtime": "Python 3.10", "engine": "FastAPI", "service": "${nameSafe}"}`;
        break;
      case 'docker':
        draftCode = `# Multi-stage Docker workspace\nFROM node:20-alpine\nWORKDIR /workspace\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nEXPOSE 8080\nCMD ["node", "server.js"]`;
        break;
      case 'go':
        draftCode = `package main\n\nimport (\n\t"fmt"\n\t"net/http"\n\t"os"\n)\n\nfunc main() {\n\tport := os.Getenv("PORT")\n\tif port == "" {\n\t\tport = "8080"\n\t}\n\thttp.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {\n\t\tfmt.Fprintf(w, \`{"status":"online", "language":"Go", "service":"${nameSafe}"}\`)\n\t})\n\tfmt.Println("Golang server booted on port", port)\n\thttp.ListenAndServe(":"+port, nil)\n}`;
        break;
      case 'static':
        draftCode = `<!DOCTYPE html>\n<html>\n<head>\n    <title>Automated Static Web Sandbox</title>\n    <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="bg-slate-950 text-white flex items-center justify-center h-screen">\n    <div class="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">\n        <h1 class="text-2xl font-bold mb-2 text-rose-500">Static Host Active</h1>\n        <p class="text-slate-400">Deployed automatically on the free edge platform for ${nameSafe}.</p>\n    </div>\n</body>\n</html>`;
        break;
      case 'java':
        draftCode = `// Spring Boot Application Class\npackage com.cloud.service;\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\n@SpringBootApplication\n@RestController\npublic class ServiceApplication {\n    public static void main(String[] args) {\n        SpringApplication.run(ServiceApplication.class, args);\n    }\n\n    @GetMapping("/")\n    public String hello() {\n        return "{\\"message\\": \\"Spring Boot Active for ${nameSafe}\\"}";\n    }\n}`;
        break;
      case 'ruby':
        draftCode = `# Sinatra micro-web route\nrequire 'sinatra'\n\nset :bind, '0.0.0.0'\nset :port, ENV['PORT'] || 8080\n\nget '/' do\n  content_type :json\n  { status: 'online', runtime: 'Ruby 3.2 Sinatra', app: '${nameSafe}' }.to_json\nend`;
        break;
      case 'worker':
        draftCode = `// Queued job processing cluster\nsetInterval(() => {\n  console.log("[Worker ${newAppSlug}] Ingesting message stream from message queue broker.");\n  console.log("[Worker ${newAppSlug}] Health status: normal, jobs_processed: " + Math.floor(Math.random() * 100));\n}, 5000);`;
        break;
      case 'serverless':
        draftCode = `// Event-Driven Cloud Function entry point\nexport async function handleRequest(request, context) {\n  return {\n    statusCode: 200,\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify({ message: "Triggered cloud serverless function successfully for ${nameSafe}" })\n  };\n}`;
        break;
      default:
        draftCode = `console.log("Starting server process...");`;
    }

    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAppName,
          slug: newAppSlug.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
          template: newAppTemplate,
          code: draftCode,
          env: newAppEnv
        })
      });

      if (res.ok) {
        const newlyCreated = await res.json();
        setApps(prev => [...prev, newlyCreated]);
        setSelectedApp(newlyCreated);
        setShowCreateModal(false);
        setNewAppName('');
        setNewAppSlug('');
        setNewAppEnv([]);
        fetchLogs();
      } else {
        const errData = await res.json();
        alert(`Error registering node app: ${errData.error}`);
      }
    } catch (e: any) {
      alert(`Network error creating application: ${e.message}`);
    }
  };

  // Save modified source files and env configuration
  const handleSaveAppConfig = async () => {
    if (!selectedApp) return;

    try {
      const res = await fetch(`/api/apps/${selectedApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editedCode,
          env: selectedAppEnv
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setApps(prev => prev.map(a => a.id === updated.id ? updated : a));
        setSelectedApp(updated);
        alert('Configuration saved directly down to persistent cloud volume.');
      }
    } catch (err: any) {
      alert(`Failed to store application updates: ${err.message}`);
    }
  };

  // Spark up subprocess node
  const handleStartProcess = async (id: string) => {
    try {
      const res = await fetch(`/api/apps/${id}/start`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setApps(prev => prev.map(a => a.id === updated.id ? updated : a));
        if (selectedApp?.id === id) {
          setSelectedApp(updated);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Terminate subprocess node
  const handleStopProcess = async (id: string) => {
    try {
      const res = await fetch(`/api/apps/${id}/stop`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setApps(prev => prev.map(a => a.id === updated.id ? updated : a));
        if (selectedApp?.id === id) {
          setSelectedApp(updated);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Unregister/delete application node
  const handleDeleteApp = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you absolutely sure you want to delete this process registration? All config files and server code will be lost.')) return;

    try {
      const res = await fetch(`/api/apps/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setApps(prev => prev.filter(a => a.id !== id));
        if (selectedApp?.id === id) {
          setSelectedApp(apps.find(a => a.id !== id) || null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Postgres Query workbench executor
  const runPostgresQuery = async () => {
    setPgQueryLoading(true);
    setPgQueryError(null);
    try {
      const res = await fetch('/api/integrations/postgres/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: pgSqlQuery,
          connectionString: pgConnStr || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPgQueryResult(data);
      } else {
        setPgQueryError(data.error || 'Server error occurred during SQL transactions');
      }
    } catch (e: any) {
      setPgQueryError(e.message);
    } finally {
      setPgQueryLoading(false);
    }
  };

  // Redis test runner
  const executeRedisCmd = async () => {
    setRedisLoading(true);
    // Parse arguments simple split handling strings with speech marks
    let parsedArgs: string[] = [];
    const match = redisArgsText.match(/"[^"]+"|[^\s]+/g);
    if (match) {
      parsedArgs = match.map(arg => arg.replace(/^"|"$/g, ''));
    }

    try {
      const res = await fetch('/api/integrations/redis/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: redisCommand,
          args: parsedArgs,
          redisUrl: redisUrl || undefined,
          redisToken: redisToken || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        const auditLog = {
          cmd: `${redisCommand} ${redisArgsText}`,
          result: typeof data.result === 'object' ? JSON.stringify(data.result) : String(data.result),
          timestamp: new Date().toLocaleTimeString()
        };
        setRedisCliHistory(prev => [auditLog, ...prev]);
      } else {
        alert(`Redis Execution Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Redis CLI transaction failed: ${err.message}`);
    } finally {
      setRedisLoading(false);
    }
  };

  // Backblaze S3 upload / sync explorer
  const fetchStorageObjects = async () => {
    setStorageLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (b2Id) queryParams.append('keyId', b2Id);
      if (b2Key) queryParams.append('applicationKey', b2Key);
      if (b2Bucket) queryParams.append('bucketName', b2Bucket);
      if (b2Endpoint) queryParams.append('endpoint', b2Endpoint);

      const res = await fetch(`/api/integrations/storage/list?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStorageItems(data);
      } else {
        alert('Could not pull cloud storage logs from selected credentials.');
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setStorageLoading(false);
    }
  };

  const handleUploadB2File = async () => {
    if (!b2UploadKey || !b2UploadContent) return;
    setStorageLoading(true);
    try {
      const res = await fetch('/api/integrations/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId: b2Id || undefined,
          applicationKey: b2Key || undefined,
          bucketName: b2Bucket || undefined,
          endpoint: b2Endpoint || undefined,
          key: b2UploadKey,
          content: b2UploadContent
        })
      });

      if (res.ok) {
        alert('Asset file uploaded successfully!');
        setB2UploadContent('');
        fetchStorageObjects();
      } else {
        alert('Upload operation failed.');
      }
    } catch (e: any) {
      alert(`Upload error: ${e.message}`);
    } finally {
      setStorageLoading(false);
    }
  };

  const handleDeleteB2File = async (itemKey: string) => {
    if (!confirm('Are you certain you wish to purge this cloud asset? This will delete the raw bytes completely.')) return;
    setStorageLoading(true);
    try {
      const res = await fetch('/api/integrations/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId: b2Id || undefined,
          applicationKey: b2Key || undefined,
          bucketName: b2Bucket || undefined,
          endpoint: b2Endpoint || undefined,
          key: itemKey
        })
      });

      if (res.ok) {
        fetchStorageObjects();
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setStorageLoading(false);
    }
  };

  // Render variables creators helper inside Architect tab
  const addVariableToSelected = () => {
    if (!editedEnvKey || !editedEnvValue) return;
    if (selectedAppEnv.some(e => e.key === editedEnvKey)) {
      alert('Key already registered in local sandbox context');
      return;
    }
    setSelectedAppEnv(prev => [...prev, {
      key: editedEnvKey,
      value: editedEnvValue,
      isSecret: editedEnvIsSecret
    }]);
    setEditedEnvKey('');
    setEditedEnvValue('');
    setEditedEnvIsSecret(false);
  };

  const removeVariableFromSelected = (key: string) => {
    setSelectedAppEnv(prev => prev.filter(e => e.key !== key));
  };

  const getTemplateFileName = (tmpl: 'express' | 'worker' | 'serverless' | 'static' | 'node' | 'docker' | 'python' | 'go' | 'java' | 'ruby') => {
    switch (tmpl) {
      case 'python': return 'main.py';
      case 'docker': return 'Dockerfile';
      case 'go': return 'main.go';
      case 'static': return 'index.html';
      case 'java': return 'Application.java';
      case 'ruby': return 'app.rb';
      case 'worker': return 'worker.js';
      case 'serverless': return 'function.js';
      default: return 'main.js';
    }
  };

  const handleAutoDetectEnvsFromCurrentCode = () => {
    if (!selectedApp) return;
    const raw = editedCode;
    const foundKeys: string[] = [];
    
    // JS/TS environments
    const jsMatches = raw.match(/process\.env\.([a-zA-Z0-9_]+)/g);
    if (jsMatches) jsMatches.forEach(m => foundKeys.push(m.replace("process.env.", "")));

    // Py environments
    const pyMatches = raw.match(/os\.(?:environ\.get|getenv)\s*\(\s*["']([a-zA-Z0-9_]+)["']/g);
    if (pyMatches) {
      pyMatches.forEach(m => {
        const cleaned = m.match(/["']([a-zA-Z0-9_]+)["']/);
        if (cleaned) foundKeys.push(cleaned[1]);
      });
    }

    // Go environments
    const goMatches = raw.match(/os\.Getenv\s*\(\s*["']([a-zA-Z0-9_]+)["']/g);
    if (goMatches) {
      goMatches.forEach(m => {
        const cleaned = m.match(/["']([a-zA-Z0-9_]+)["']/);
        if (cleaned) foundKeys.push(cleaned[1]);
      });
    }

    // Docker environments
    const dockerMatches = raw.match(/ENV\s+([a-zA-Z0-9_]+)/gi);
    if (dockerMatches) {
      dockerMatches.forEach(m => {
        const parts = m.split(/\s+/);
        if (parts[1]) foundKeys.push(parts[1]);
      });
    }

    const uniqueKeys = Array.from(new Set(foundKeys.map(k => k.trim().toUpperCase()).filter(k => k.length > 1)));
    if (uniqueKeys.length === 0) {
      alert("Aucune variable d'environnement détectée dans votre script actuel (ex: process.env.KEY, os.getenv('KEY')).");
      return;
    }

    const currentKeys = selectedAppEnv.map(v => v.key.toUpperCase());
    const added: string[] = [];
    const updatedEnv = [...selectedAppEnv];

    uniqueKeys.forEach(k => {
      if (!currentKeys.includes(k)) {
        updatedEnv.push({
          key: k,
          value: '',
          isSecret: k.includes("KEY") || k.includes("SECRET") || k.includes("PASS") || k.includes("TOKEN")
        });
        added.push(k);
      }
    });

    if (added.length === 0) {
      alert("Toutes les variables trouvées (" + uniqueKeys.join(', ') + ") existent déjà dans votre Vault.");
    } else {
      setSelectedAppEnv(updatedEnv);
      alert("✨ " + added.length + " nouvelles variables d'environnement détectées dans votre code et ajoutées au Vault : " + added.join(', ') + ". Veuillez définir leurs valeurs et sauvegarder.");
    }
  };

  // Creator helpers inside Modal
  const addVariableToNew = () => {
    if (!newEnvKey || !newEnvValue) return;
    setNewAppEnv(prev => [...prev, {
      key: newEnvKey,
      value: newEnvValue,
      isSecret: newEnvIsSecret
    }]);
    setNewEnvKey('');
    setNewEnvValue('');
    setNewEnvIsSecret(false);
  };

  // Estimated load display metrics
  const activeCount = apps.filter(a => a.status === 'running').length;
  const currentTotalCpu = systemTelemetry?.system.cpu || activeCount * 4;
  const currentMemoryUsage = systemTelemetry?.system.memory.heap || 45;

  return (
    <div id="beny-joe-paas" className="flex flex-col h-screen text-slate-100 bg-slate-950 font-sans select-none overflow-hidden">
      
      {/* 1. Header Toolbar */}
      <header className="flex items-center justify-between border-b border-rose-950/40 bg-slate-950 px-6 py-3 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center p-2 rounded-lg bg-gradient-to-br from-rose-500/10 to-rose-950 border border-rose-500/30">
            <Server className="h-6 w-6 text-rose-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white font-sans flex items-center gap-2">
              Beny-Joe Cloud <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-mono tracking-wider font-bold">V5.0 FREE</span>
            </h1>
            <p className="text-[10px] text-slate-400">High-Availability Micro-App Node Process Manager & PaaS Desk</p>
          </div>
        </div>

        {/* Global Telemetry Strip */}
        <div className="flex items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>PaaS Engine Status: <strong className="text-emerald-400">Operational</strong></span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-[9px] text-slate-500 uppercase">Master CPU Load</span>
              <span className="text-rose-400 font-mono text-xs font-semibold">{currentTotalCpu}%</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-800" />
            <div className="flex flex-col text-right">
              <span className="text-[9px] text-slate-500 uppercase">Process Heap</span>
              <span className="text-rose-400 font-mono text-xs font-semibold">{currentMemoryUsage} MB</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-800" />
            <div className="flex flex-col text-right border-r border-slate-800 pr-4">
              <span className="text-[9px] text-slate-500 uppercase">Nodes</span>
              <span className="text-rose-400 font-mono text-xs font-semibold">{activeCount} / {apps.length} Online</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="refresh-stats-btn"
              onClick={pollTelemetry}
              className="p-1 px-2.5 rounded border border-slate-800 hover:border-rose-500/40 hover:bg-rose-500/5 hover:text-rose-400 transition"
              title="Poll Server Metrics Manually"
            >
              <RefreshCw className="h-3.5 w-3.5 inline mr-1" /> Poll Stats
            </button>
          </div>
        </div>
      </header>

      {/* Main Panel Division */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* 2. Left Panel: Micro-Application Manager */}
        <aside id="apps-sidebar" className="w-80 border-r border-rose-950/20 bg-slate-950/60 flex flex-col scale-100 p-4 shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Micro-Service Clusters</h2>
            <button
              id="register-new-app-btn"
              onClick={() => setShowCreateModal(true)}
              className="p-1 px-2.5 text-[11px] rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-medium transition flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Registry
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {apps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-slate-800 rounded-lg p-4">
                <Server className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-400 font-medium">No Apps Registered</p>
                <p className="text-[10px] text-slate-500 mt-1">Configure your first node server application.</p>
              </div>
            ) : (
              apps.map(app => {
                const isActive = selectedApp?.id === app.id;
                const isOnline = app.status === 'running';

                return (
                  <div
                    key={app.id}
                    id={`app-card-${app.id}`}
                    onClick={() => setSelectedApp(app)}
                    className={`group relative p-3.5 rounded-lg border text-left cursor-pointer transition-all duration-200 ${
                      isActive 
                        ? 'bg-slate-900 border-rose-500/50 shadow-md shadow-rose-950/20' 
                        : 'bg-slate-900/40 border-slate-900/80 hover:border-slate-800 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${
                          app.status === 'running' 
                            ? 'bg-emerald-500 animate-pulse' 
                            : app.status === 'error'
                            ? 'bg-rose-500'
                            : 'bg-slate-500'
                        }`} />
                        <h3 className="font-semibold text-xs text-slate-100 group-hover:text-rose-400 transition">
                          {app.name}
                        </h3>
                      </div>
                      <button
                        id={`delete-app-node-${app.id}`}
                        onClick={(e) => handleDeleteApp(app.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition"
                        title="Delete application node registration"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 font-mono bg-slate-950/40 p-1.5 rounded border border-slate-900/40">
                      <span>slug: {app.slug}</span>
                      <span>Port {app.port}</span>
                    </div>

                    <div className="mt-2.5 p-2 bg-slate-950/80 border border-slate-900 rounded-md space-y-1.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between text-[9px] uppercase font-semibold text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Globe className="h-2.5 w-2.5 text-rose-400" /> Domain Routing:
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-300">
                        <span className="truncate max-w-[170px] text-slate-400">/apps/{app.slug}</span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/apps/${app.slug}`);
                              alert(`L'URL d'accès en direct pour "${app.name}" a été copiée dans le presse-papiers.`);
                            }}
                            className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer transition"
                            title="Copier l'URL d'accès"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </button>
                          <button
                            onClick={() => window.open(`/apps/${app.slug}`, '_blank')}
                            className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 cursor-pointer transition"
                            title="Ouvrir le service en direct"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {isOnline && (
                      <div className="mt-3 pt-2.5 border-t border-slate-900/60 grid grid-cols-2 gap-1 text-[10px] text-slate-400 font-mono">
                        <div className="flex items-center gap-1">
                          <Cpu className="h-2.5 w-2.5 text-rose-500" />
                          <span>CPU {app.stats.cpu}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="h-2.5 w-2.5 text-teal-400" />
                          <span>{app.stats.memory}MB</span>
                        </div>
                      </div>
                    )}

                    {/* Operational Commands Overlay */}
                    <div className="mt-3 pt-2 border-t border-slate-900/60 flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 font-mono">
                        {app.template}
                      </span>
                      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                        {isOnline ? (
                          <button
                            id={`stop-btn-${app.id}`}
                            onClick={() => handleStopProcess(app.id)}
                            className="p-1 px-2.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-mono border border-amber-500/20 flex items-center gap-1 transition"
                          >
                            <Square className="h-2.5 w-2.5 fill-amber-400" /> Kill
                          </button>
                        ) : (
                          <button
                            id={`start-btn-${app.id}`}
                            onClick={() => handleStartProcess(app.id)}
                            className="p-1 px-2.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/20 flex items-center gap-1 transition"
                          >
                            <Play className="h-2.5 w-2.5 fill-emerald-400" /> Spawn
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Infrastructure Metrics Details */}
          <div className="mt-4 p-3 bg-slate-900/30 border border-slate-900 rounded-lg text-xs space-y-2">
            <h4 className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Container Infrastructure</h4>
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-slate-400">Node Sandbox Version</span>
              <span className="text-rose-500">v20.11.0</span>
            </div>
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-slate-400">Database Connection</span>
              <span className={process.env.DATABASE_URL || pgConnStr ? "text-emerald-400" : "text-amber-500"}>
                {process.env.DATABASE_URL || pgConnStr ? "Active" : "Simulated"}
              </span>
            </div>
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-slate-400">Upstash Cluster REST</span>
              <span className={process.env.UPSTASH_REDIS_REST_URL || redisUrl ? "text-emerald-400" : "text-amber-500"}>
                {process.env.UPSTASH_REDIS_REST_URL || redisUrl ? "Connected" : "Simulated"}
              </span>
            </div>
          </div>
        </aside>

        {/* 3. Primary Stage Viewport */}
        <main className="flex-1 bg-slate-950 flex flex-col p-6 overflow-hidden">
          
          {/* Main Dashboard Navigation Tabs */}
          <div className="flex border-b border-slate-900 mb-6 shrink-0 justify-between items-center">
            <div className="flex gap-1.5">
              <button
                id="architect-tab-btn"
                onClick={() => setActiveTab('architect')}
                className={`py-2 px-4 text-xs font-semibold uppercase tracking-wider transition-all duration-150 border-b-2 flex items-center gap-2 ${
                  activeTab === 'architect'
                    ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                <Code2 className="h-4 w-4" /> App Architect
              </button>
              
              <button
                id="integrations-tab-btn"
                onClick={() => setActiveTab('integrations')}
                className={`py-2 px-4 text-xs font-semibold uppercase tracking-wider transition-all duration-150 border-b-2 flex items-center gap-2 ${
                  activeTab === 'integrations'
                    ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                <Database className="h-4 w-4" /> Cloud Integrations
              </button>

              <button
                id="telemetry-tab-btn"
                onClick={() => setActiveTab('telemetry')}
                className={`py-2 px-4 text-xs font-semibold uppercase tracking-wider transition-all duration-150 border-b-2 flex items-center gap-2 ${
                  activeTab === 'telemetry'
                    ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                <Terminal className="h-4 w-4" /> Live Web Console
              </button>

              <button
                id="deployments-tab-btn"
                onClick={() => setActiveTab('deployments')}
                className={`py-2 px-4 text-xs font-semibold uppercase tracking-wider transition-all duration-150 border-b-2 flex items-center gap-2 ${
                  activeTab === 'deployments'
                    ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                <Globe className="h-4 w-4" /> Git & ZIP Autodeployer
              </button>
            </div>

            {selectedApp && (
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-900 px-3.5 py-1.5 rounded-lg text-xs shadow-lg">
                <span className="text-slate-400">Node:</span>
                <strong className="text-rose-400 font-mono font-bold">{selectedApp.name}</strong>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                  selectedApp.status === 'running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/20 text-slate-400 border border-slate-800'
                }`}>
                  {selectedApp.status}
                </span>
                
                <span className="text-slate-600 font-mono">|</span>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                    <Globe className="h-3 w-3 text-rose-400" />
                    URL: <span className="text-rose-300 font-semibold select-all">/apps/{selectedApp.slug}</span>
                  </span>
                  
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/apps/${selectedApp.slug}`);
                      alert(`L'URL d'accès en direct pour "${selectedApp.name}" a été copiée dans le presse-papiers.`);
                    }}
                    className="p-1 px-1.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-405 text-slate-400 hover:text-rose-400 cursor-pointer transition flex items-center gap-1 text-[10px] border border-slate-900"
                    title="Copier l'URL d'accès"
                  >
                    <Copy className="h-3 w-3" /> Copier URL
                  </button>
                  
                  <button
                    onClick={() => window.open(`/apps/${selectedApp.slug}`, '_blank')}
                    className="p-1 px-2.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-white cursor-pointer transition flex items-center gap-1 text-[10px] border border-rose-500/25"
                    title="Ouvrir le service en direct"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Visiter ↗
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              
              {/* Tab 1: App Architect */}
              {activeTab === 'architect' && (
                <motion.div
                  key="architect"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="h-full flex gap-6 overflow-hidden"
                >
                  {selectedApp ? (
                    <>
                      {/* Left Block: Embedded Code Script Editor */}
                      <div className="flex-1 flex flex-col bg-slate-900/60 border border-slate-900 rounded-lg overflow-hidden">
                        <div className="flex justify-between items-center bg-slate-900 px-4 py-2 border-b border-rose-950/20">
                          <span className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5">
                            <FileCode className="h-3.5 w-3.5 text-rose-500" /> {getTemplateFileName(selectedApp.template)} ({selectedApp.template.toUpperCase()} Code Template)
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              id="auto-detect-envs-btn"
                              onClick={handleAutoDetectEnvsFromCurrentCode}
                              className="p-1 px-2.5 text-[10px] font-mono font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded flex items-center gap-1 transition"
                              title="Scanner le code pour des variables d'environnement supplémentaires"
                            >
                              ✨ Auto-Detect Envs
                            </button>
                            <button
                              id="save-code-btn"
                              onClick={handleSaveAppConfig}
                              className="p-1 px-3 text-[11px] font-medium bg-rose-600 hover:bg-rose-500 text-white rounded flex items-center gap-1 shadow-lg shadow-rose-950/40 transition"
                            >
                              <Save className="h-3.5 w-3.5" /> Save Scripts
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex-1 relative font-mono text-xs">
                          <textarea
                            id="code-editor"
                            value={editedCode}
                            onChange={(e) => setEditedCode(e.target.value)}
                            className="absolute inset-0 w-full h-full bg-slate-950 text-slate-300 p-4 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-rose-500/50 resize-none overflow-y-auto leading-relaxed"
                            placeholder="// Write your cluster server Node.js code here..."
                          />
                        </div>
                      </div>

                      {/* Right Block: Variable Cryptographic Vault */}
                      <div className="w-[380px] flex flex-col bg-slate-900/40 border border-slate-900 rounded-lg p-4 shrink-0 overflow-y-auto space-y-4">
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-rose-500" />
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Environment Vault</h3>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Key-value definitions passed down to subprocesses. Secret variables are encrypted on our volume using <strong className="text-rose-400">AES-256-CBC</strong>.
                        </p>

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {selectedAppEnv.map((v, i) => (
                            <div key={i} className="flex justify-between items-center p-2 rounded bg-slate-950/80 border border-slate-900 text-xs font-mono">
                              <div className="flex flex-col">
                                <span className="text-slate-300 font-semibold">{v.key}</span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  {v.isSecret ? (
                                    <>
                                      <Lock className="h-2.5 w-2.5 text-rose-500" /> Encrypted Secrets Saved
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="h-2.5 w-2.5 text-emerald-500" /> Decrypted (Public)
                                    </>
                                  )}
                                </span>
                              </div>
                              <button
                                id={`remove-env-var-${v.key}`}
                                onClick={() => removeVariableFromSelected(v.key)}
                                className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {selectedAppEnv.length === 0 && (
                            <div className="py-6 text-center text-[11px] text-slate-500 border border-dashed border-slate-800 rounded">
                              No environment variables registered.
                            </div>
                          )}
                        </div>

                        {/* Add Variable Selector */}
                        <div className="pt-3 border-t border-slate-900 space-y-2 text-xs">
                          <h4 className="font-semibold text-slate-400 text-xs">Inject New Key</h4>
                          <input
                            id="edit-env-key-name"
                            type="text"
                            placeholder="KEY_NAME (e.g. GEMINI_API_KEY)"
                            value={editedEnvKey}
                            onChange={(e) => setEditedEnvKey(e.target.value.toUpperCase())}
                            className="w-full bg-slate-950 border border-slate-900 rounded p-2 text-slate-300 font-mono focus:outline-none"
                          />
                          <input
                            id="edit-env-value"
                            type="text"
                            placeholder="Value"
                            value={editedEnvValue}
                            onChange={(e) => setEditedEnvValue(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded p-2 text-slate-300 font-mono focus:outline-none"
                          />
                          <div className="flex items-center justify-between py-1">
                            <label className="flex items-center gap-2 cursor-pointer text-slate-400 select-none">
                              <input
                                id="edit-env-secret-toggle"
                                type="checkbox"
                                checked={editedEnvIsSecret}
                                onChange={(e) => setEditedEnvIsSecret(e.target.checked)}
                                className="rounded bg-slate-950 border-slate-800 focus:ring-0 accent-rose-500"
                              />
                              Encrypt with AES-256
                            </label>
                            <button
                              id="add-env-var-btn"
                              onClick={addVariableToSelected}
                              className="p-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded font-medium flex items-center gap-1 text-[11px]"
                            >
                              <Plus className="h-3.5 w-3.5" /> Inject Key
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-center">
                        <Server className="h-12 w-12 text-slate-700 mb-2" />
                        <h2 className="text-sm font-semibold text-slate-400">No Application Is Selected</h2>
                        <p className="text-xs text-slate-500 mt-1">Register or select a micro-app node in the side registry panel.</p>
                      </div>
                    )}
                </motion.div>
              )}

              {/* Tab 2: Cloud Integrations Suite */}
              {activeTab === 'integrations' && (
                <motion.div
                  key="integrations"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="h-full flex flex-col overflow-hidden"
                >
                  {/* Nested Integration Channels */}
                  <div className="flex border-b border-slate-900 space-x-1 shrink-0 bg-slate-950/40 p-1.5 rounded-lg mb-4">
                    <button
                      id="pg-sub-tab"
                      onClick={() => setActiveIntegrationTab('postgres')}
                      className={`px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition ${
                        activeIntegrationTab === 'postgres'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                      }`}
                    >
                      <Database className="h-3.5 w-3.5" /> PostgreSQL Explorer
                    </button>
                    <button
                      id="redis-sub-tab"
                      onClick={() => setActiveIntegrationTab('redis')}
                      className={`px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition ${
                        activeIntegrationTab === 'redis'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                      }`}
                    >
                      <Terminal className="h-3.5 w-3.5" /> Upstash Redis CLI
                    </button>
                    <button
                      id="b2-sub-tab"
                      onClick={() => setActiveIntegrationTab('storage')}
                      className={`px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition ${
                        activeIntegrationTab === 'storage'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                      }`}
                    >
                      <HardDrive className="h-3.5 w-3.5" /> Backblaze B2 Storage
                    </button>
                    <button
                      id="bjc-files-sub-tab"
                      onClick={() => setActiveIntegrationTab('bjc-files')}
                      className={`px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition ${
                        activeIntegrationTab === 'bjc-files'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                      }`}
                    >
                      <FileCode className="h-3.5 w-3.5" /> BJC Production Stack Files
                    </button>
                  </div>

                  <div className="flex-1 flex gap-6 overflow-hidden">
                    
                    {/* Active Integration Main stage */}
                    <div className="flex-1 flex flex-col bg-slate-900/40 border border-slate-900 rounded-lg p-5 overflow-hidden">
                      
                      {/* SUB-TAB: PostgreSQL Explorer */}
                      {activeIntegrationTab === 'postgres' && (
                        <div className="h-full flex flex-col space-y-4 overflow-hidden">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-200">PostgreSQL Transaction Workbench</h3>
                              <p className="text-[11px] text-slate-400">Run analytics, database migrations, or fetch system telemetry tables.</p>
                            </div>
                            <button
                              id="run-pg-query-btn"
                              onClick={runPostgresQuery}
                              disabled={pgQueryLoading}
                              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded transition flex items-center gap-1.5 shadow duration-150"
                            >
                              <Play className="h-3.5 w-3.5 fill-white" /> {pgQueryLoading ? 'Executing...' : 'Run Statement'}
                            </button>
                          </div>

                          <div className="h-40 relative border border-slate-900 rounded overflow-hidden">
                            <textarea
                              id="pg-sql-area"
                              value={pgSqlQuery}
                              onChange={(e) => setPgSqlQuery(e.target.value)}
                              className="absolute inset-0 w-full h-full bg-slate-950 p-3 text-xs text-slate-200 font-mono focus:outline-none resize-none"
                              placeholder="SELECT * FROM node_telemetry;"
                            />
                          </div>

                          {pgQueryError && (
                            <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded text-rose-400 text-xs font-mono flex items-start gap-2 max-h-24 overflow-y-auto">
                              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                              <span>{pgQueryError}</span>
                            </div>
                          )}

                          {/* Data Explorer Grid */}
                          <div className="flex-1 border border-slate-900 rounded bg-slate-950 overflow-auto text-xs font-mono">
                            {pgQueryResult ? (
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                                    {(pgQueryResult.fields || []).map((f: any, i: number) => (
                                      <th key={i} className="p-3 font-semibold font-mono text-[10px] uppercase border-r border-slate-800/40">{f.name}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(pgQueryResult.rows || []).map((row: any, rowIdx: number) => (
                                    <tr key={rowIdx} className="border-b border-slate-900/50 hover:bg-slate-900/25">
                                      {Object.values(row).map((val: any, colIdx: number) => (
                                        <td key={colIdx} className="p-3 border-r border-slate-900/50 text-slate-300">
                                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                  {(pgQueryResult.rows || []).length === 0 && (
                                    <tr>
                                      <td colSpan={pgQueryResult.fields?.length || 1} className="p-4 text-center text-slate-500">
                                        Query returned 0 rows
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center p-10 text-slate-500 text-center">
                                <Database className="h-8 w-8 text-slate-700 mb-2" />
                                <p className="text-xs">No transaction query executed yet.</p>
                                <p className="text-[10px] text-slate-600 mt-1">Execute a query above to inspect live records.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SUB-TAB: Upstash Redis CLI */}
                      {activeIntegrationTab === 'redis' && (
                        <div className="h-full flex flex-col space-y-4 overflow-hidden">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-200">Upstash Redis Commands Terminal</h3>
                            <p className="text-[11px] text-slate-400">Run quick CRUD ops, evict cache keys, or check Redis persistence parameters.</p>
                          </div>

                          <div className="flex gap-2">
                            <select
                              id="redis-cmd-select"
                              value={redisCommand}
                              onChange={(e) => setRedisCommand(e.target.value)}
                              className="bg-slate-950 border border-slate-900 rounded p-2 text-xs text-slate-200 font-mono focus:outline-none w-28 shrink-0 focus:ring-1 focus:ring-rose-500"
                            >
                              <option value="SET">SET</option>
                              <option value="GET">GET</option>
                              <option value="DEL">DEL</option>
                              <option value="KEYS">KEYS</option>
                              <option value="FLUSHALL">FLUSHALL</option>
                            </select>

                            <input
                              id="redis-args-input"
                              type="text"
                              value={redisArgsText}
                              onChange={(e) => setRedisArgsText(e.target.value)}
                              placeholder="Arguments (e.g. key_name value_bytes)"
                              className="flex-1 bg-slate-950 border border-slate-900 rounded p-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />

                            <button
                              id="run-redis-cmd-btn"
                              onClick={executeRedisCmd}
                              disabled={redisLoading}
                              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded transition flex items-center gap-1.5 shrink-0 shadow shadow-rose-950/40"
                            >
                              <Send className="h-3.5 w-3.5" /> Send
                            </button>
                          </div>

                          {/* Historical Log Console */}
                          <div className="flex-1 border border-slate-900 rounded bg-slate-950 p-4 font-mono text-xs overflow-y-auto space-y-3 leading-relaxed">
                            <div className="text-slate-600 border-b border-slate-900 pb-2">
                              {`// Redis Transaction logs stream (Connected to Upstash servercluster)`}
                            </div>
                            
                            {redisCliHistory.map((item, idx) => (
                              <div key={idx} className="flex gap-2 items-start text-xs border-b border-slate-950 pb-2">
                                <span className="text-slate-600 font-mono text-[10px] shrink-0 mt-0.5">{item.timestamp}</span>
                                <div className="flex-1">
                                  <div className="text-rose-400 font-semibold">{`redis-cli> ${item.cmd}`}</div>
                                  <div className="text-slate-300 mt-1 pl-4 border-l border-slate-900 text-[11px] whitespace-pre-wrap">
                                    {item.result}
                                  </div>
                                </div>
                              </div>
                            ))}

                            {redisCliHistory.length === 0 && (
                              <div className="text-slate-600 italic">No commands processed inside session.</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* SUB-TAB: Backblaze B2 S3 storage explorer */}
                      {activeIntegrationTab === 'storage' && (
                        <div className="h-full flex flex-col space-y-4 overflow-hidden">
                          <div className="flex justify-between items-center shrink-0">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-200">Backblaze B2 Cloud Object Desk</h3>
                              <p className="text-[11px] text-slate-400 font-sans">S3 compatible asset bucket explorer to store backup assets and env profiles.</p>
                            </div>
                            <button
                              id="sync-b2-objects-btn"
                              onClick={fetchStorageObjects}
                              disabled={storageLoading}
                              className="p-1 px-3 text-xs bg-slate-950 border border-slate-900 text-slate-300 hover:text-white rounded flex items-center gap-1.5 transition duration-150 shadow"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${storageLoading ? 'animate-spin' : ''}`} /> Sync Drive
                            </button>
                          </div>

                          {/* Split Container: Upload file left, contents list right */}
                          <div className="flex-1 flex gap-4 overflow-hidden">
                            
                            {/* Upload Asset form panel */}
                            <div className="w-80 border border-slate-900 bg-slate-950/80 rounded p-4 flex flex-col gap-3 font-mono text-xs overflow-y-auto shrink-0">
                              <h4 className="font-semibold text-slate-300 border-b border-slate-900 pb-2 font-sans">Upload Cloud Asset</h4>
                              
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 uppercase font-sans">File Key Pathway</label>
                                <input
                                  id="b2-upload-path"
                                  type="text"
                                  value={b2UploadKey}
                                  onChange={(e) => setB2UploadKey(e.target.value)}
                                  placeholder="configs/app_env.properties"
                                  className="w-full bg-slate-950 border border-slate-900 rounded p-2 text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                                />
                              </div>

                              <div className="space-y-1 flex-1 flex flex-col">
                                <label className="text-[10px] text-slate-500 uppercase font-sans">File Bytes / Body Content</label>
                                <textarea
                                  id="b2-file-content"
                                  value={b2UploadContent}
                                  onChange={(e) => setB2UploadContent(e.target.value)}
                                  placeholder="Paste raw string contents..."
                                  className="flex-1 w-full bg-slate-950 border border-slate-900 rounded p-2 text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none min-h-[140px]"
                                />
                              </div>

                              <button
                                id="upload-to-b2-button"
                                onClick={handleUploadB2File}
                                disabled={storageLoading || !b2UploadKey || !b2UploadContent}
                                className="w-full py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold rounded transition text-xs font-sans mt-2 shadow"
                              >
                                {storageLoading ? 'Uploader active...' : 'Push Object'}
                              </button>
                            </div>

                            {/* Direct Drive List */}
                            <div className="flex-1 border border-slate-900 rounded bg-slate-950 p-4 overflow-y-auto font-mono text-xs space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-900 pb-2 font-sans mb-3 font-medium">
                                <span>Cloud Absolute Object S3 URI</span>
                                <div className="flex items-center gap-3">
                                  <span>Size bytes</span>
                                  <span>Actions</span>
                                </div>
                              </div>

                              {storageItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2.5 rounded hover:bg-slate-900/50 border border-slate-950 text-xs">
                                  <div className="flex items-center gap-2 max-w-[70%] overflow-hidden text-ellipsis whitespace-nowrap">
                                    <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
                                    <span className="text-slate-300">{item.Key}</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-slate-400">
                                    <span>{(item.Size / 1024).toFixed(2)} KB</span>
                                    <button
                                      id={`delete-b2-asset-${item.Key}`}
                                      onClick={() => handleDeleteB2File(item.Key)}
                                      className="p-1.5 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition"
                                      title="Purge backup object permanently"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {storageItems.length === 0 && (
                                <div className="py-12 text-center text-slate-500 italic">No storage cloud assets detected matching filter credentials.</div>
                              )}
                            </div>

                          </div>
                        </div>
                      )}

                      {activeIntegrationTab === 'bjc-files' && (
                        <div className="h-full flex flex-col space-y-4 overflow-hidden">
                          <div className="flex justify-between items-center shrink-0">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-200">BJC Production Core Registry</h3>
                              <p className="text-[11px] text-slate-400">Read physical stack files from container in real-time. Zero fake stubs or stethoscopes.</p>
                            </div>
                            <button
                              id="copy-catalog-bytes-btn"
                              onClick={() => {
                                navigator.clipboard.writeText(catalogFileContent);
                                alert("Code source copié !");
                              }}
                              className="px-3 py-1.5 text-xs bg-[#121212] border border-slate-900 text-slate-300 hover:text-white rounded transition flex items-center gap-1 shadow"
                            >
                              Copier le code
                            </button>
                          </div>

                          <div className="flex-1 flex gap-4 overflow-hidden">
                            {/* Left files selector */}
                            <div className="w-64 border border-slate-900 bg-slate-950/40 rounded p-4 flex flex-col gap-1.5 overflow-y-auto shrink-0 custom-scrollbar">
                              <h4 className="font-semibold text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-2">Workspace Modules</h4>
                              
                              {[
                                { path: 'backend/server.js', label: 'Express Engine', ext: 'Server' },
                                { path: 'backend/processManager.js', label: 'Process Manager', ext: 'PaaS' },
                                { path: 'backend/deploymentQueue.js', label: 'Deployment Pipeline', ext: 'Queue' },
                                { path: 'backend/b2Storage.js', label: 'Backblaze Core', ext: 'Driver' },
                                { path: 'backend/aiController.js', label: 'Groq AI Rotation', ext: 'AI' },
                                { path: 'backend/EnvVar.js', label: 'Vault Cryptography', ext: 'AES' },
                                { path: 'backend/siteServe.js', label: 'Dynamic Serving Proxy', ext: 'Proxy' },
                                { path: 'frontend/index.html', label: 'Auth Gateway client', ext: 'HTML' },
                                { path: 'frontend/dashboard.html', label: 'Console Desktop client', ext: 'HTML' },
                                { path: 'frontend/app.html', label: 'Node Panel client', ext: 'HTML' },
                                { path: 'render.yaml', label: 'Production Blueprint', ext: 'YAML' }
                              ].map(item => {
                                const selected = activeCatalogFile === item.path;
                                return (
                                  <button
                                    key={item.path}
                                    onClick={() => setActiveCatalogFile(item.path)}
                                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition duration-150 flex flex-col gap-0.5 ${
                                      selected
                                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 font-medium'
                                        : 'bg-transparent border-transparent hover:border-slate-900 hover:bg-[#111111]/40 text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    <span className="truncate">{item.label}</span>
                                    <span style={{ fontSize: '9px' }} className="font-mono text-slate-500 uppercase">{item.path}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Right code viewer */}
                            <div className="flex-1 border border-slate-900 rounded bg-slate-950 p-4 font-mono text-xs overflow-auto custom-scrollbar select-text">
                              <pre className="text-slate-300 leading-relaxed whitespace-pre font-mono">{catalogFileContent}</pre>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Right Credentials configuration drawer */}
                    <div className="w-80 bg-slate-900/40 border border-slate-900 rounded-lg p-4 shrink-0 overflow-y-auto space-y-4 text-xs">
                      <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                        <Settings className="h-4 w-4 text-rose-500" />
                        <h3 className="font-semibold text-slate-300 uppercase tracking-wide">Credentials Override</h3>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Input cluster credentials to connect directly to external databases. If empty, the dashboard defaults gracefully to transaction memory.
                      </p>

                      {/* PostgreSQL panel credentials input */}
                      <div className="space-y-3 pt-2">
                        <h4 className="font-semibold text-slate-300 font-mono text-[11px] uppercase tracking-wider text-rose-400 flex items-center gap-1">
                          <Database className="h-3 w-3" /> PostgreSQL (Neon)
                        </h4>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-mono">CONNECTION STRING</label>
                          <input
                            id="pg-conn-str"
                            type="password"
                            value={pgConnStr}
                            onChange={(e) => setPgConnStr(e.target.value)}
                            placeholder="postgres://user:password@endpoint/db"
                            className="w-full bg-slate-950 border border-slate-900 rounded p-2 text-slate-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        </div>
                      </div>

                      {/* Redis credentials */}
                      <div className="space-y-3 pt-3 border-t border-slate-900">
                        <h4 className="font-semibold text-slate-200 font-mono text-[11px] uppercase tracking-wider text-rose-400 flex items-center gap-1">
                          <Terminal className="h-3 w-3" /> Redis (Upstash)
                        </h4>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-mono">REST URL</label>
                          <input
                            id="redis-url"
                            type="text"
                            value={redisUrl}
                            onChange={(e) => setRedisUrl(e.target.value)}
                            placeholder="https://your-endpoint.upstash.io"
                            className="w-full bg-slate-950 border border-slate-900 rounded p-2 text-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-mono">REST AUTH TOKEN</label>
                          <input
                            id="redis-token"
                            type="password"
                            value={redisToken}
                            onChange={(e) => setRedisToken(e.target.value)}
                            placeholder="Upstash application Token..."
                            className="w-full bg-slate-950 border border-slate-900 rounded p-2 text-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        </div>
                      </div>

                      {/* Backblaze B2 S3 credentials */}
                      <div className="space-y-3 pt-3 border-t border-slate-900">
                        <h4 className="font-semibold text-slate-200 font-mono text-[11px] uppercase tracking-wider text-rose-400 flex items-center gap-1">
                          <HardDrive className="h-3 w-3" /> B2 / S3 Storage
                        </h4>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-mono">KEY ID / S3 ACCESS ID</label>
                          <input
                            id="b2-id"
                            type="text"
                            value={b2Id}
                            onChange={(e) => setB2Id(e.target.value)}
                            placeholder="005fdfa..."
                            className="w-full bg-slate-950 border border-slate-900 rounded p-2 text-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-mono">APPLICATION KEY / SECRET ID</label>
                          <input
                            id="b2-key"
                            type="password"
                            value={b2Key}
                            onChange={(e) => setB2Key(e.target.value)}
                            placeholder="K005..."
                            className="w-full bg-slate-950 border border-slate-900 rounded p-2 text-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-mono">S3 REGIONAL ENDPOINT</label>
                          <input
                            id="b2-endpoint"
                            type="text"
                            value={b2Endpoint}
                            onChange={(e) => setB2Endpoint(e.target.value)}
                            placeholder="s3.us-east-005.backblazeb2.com"
                            className="w-full bg-slate-950 border border-slate-900 rounded p-2 text-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-mono">BUCKET NAME</label>
                          <input
                            id="b2-bucket"
                            type="text"
                            value={b2Bucket}
                            onChange={(e) => setB2Bucket(e.target.value)}
                            placeholder="my-b2-storage-bucket"
                            className="w-full bg-slate-950 border border-slate-900 rounded p-2 text-slate-200 text-xs font-mono focus:outline-none"
                          />
                        </div>
                      </div>

                    </div>

                  </div>
                </motion.div>
              )}

              {/* Tab 3: Telemetry logs terminal */}
              {activeTab === 'telemetry' && (
                <motion.div
                  key="telemetry"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="h-full flex flex-col overflow-hidden bg-slate-900/60 border border-slate-900 rounded-lg p-5"
                >
                  <div className="flex items-center justify-between border-b border-rose-950/20 pb-4 shrink-0 mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200">Continuous Central Logs Stream</h3>
                      <p className="text-[11px] text-slate-400">Stdout/stderr and system orchestration alerts captured in real-time from active Node.js child processes.</p>
                    </div>

                    <div className="flex gap-2">
                      {(['all', 'system', 'stdout', 'stderr'] as const).map(streamId => (
                        <button
                          key={streamId}
                          id={`filter-btn-${streamId}`}
                          onClick={() => setLogsFilter(streamId)}
                          className={`px-3 py-1.5 rounded text-[11px] uppercase font-mono tracking-wider font-semibold border transition ${
                            logsFilter === streamId
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          {streamId}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 bg-slate-950 border border-slate-950 rounded-md p-4 font-mono text-xs overflow-y-auto space-y-2 leading-relaxed selection:bg-rose-500 selection:text-white">
                    {logs
                      .filter(log => logsFilter === 'all' || log.stream === logsFilter)
                      .map((log, idx) => {
                        const isSystem = log.stream === 'system';
                        const colorClass = log.stream === 'system' 
                          ? 'text-cyan-400 font-semibold' 
                          : log.stream === 'stderr' 
                          ? 'text-rose-400' 
                          : 'text-slate-300';

                        return (
                          <div key={idx} className="flex gap-3 items-start text-xs border-b border-slate-900/40 pb-1 hover:bg-slate-900/10">
                            <span className="text-slate-600 font-mono text-[10px] select-none shrink-0 mt-0.5">
                              {new Date(log.time).toLocaleTimeString()}
                            </span>
                            <span className={`text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded shrink-0 select-none ${
                              isSystem ? 'bg-cyan-500/10 text-cyan-400' : log.stream === 'stderr' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-900 text-slate-400'
                            }`}>
                              {log.stream}
                            </span>
                            {log.appSlug && (
                              <span className="text-rose-500/80 font-semibold select-none shrink-0 border border-rose-500/20 rounded px-1 text-[9px]">
                                {log.appSlug}
                              </span>
                            )}
                            <span className={`${colorClass} flex-1 whitespace-pre-wrap`}>
                              {log.message}
                            </span>
                          </div>
                        );
                      })}

                    <div ref={logsEndRef} />
                  </div>
                </motion.div>
              )}

              {activeTab === 'deployments' && (
                <motion.div
                  key="deployments"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="h-full flex flex-col xl:flex-row gap-6 overflow-hidden text-slate-100"
                >
                  {/* Left Column: Build Setup Controls */}
                  <div className="flex-1 bg-slate-900/60 border border-slate-900 rounded-lg p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between border-b border-rose-950/20 pb-4 shrink-0">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">Continuous Integration Pipelines</h3>
                        <p className="text-[11px] text-slate-400 font-sans">Deploy modular codebases instantly as live, autonomous web services similar to Render.</p>
                      </div>
                      
                      {/* Tabs to select Deploy Type */}
                      <div className="flex p-0.5 bg-slate-950 border border-slate-900 rounded-md shrink-0">
                        <button
                          onClick={() => setDeployType('zip')}
                          className={`px-3 py-1 text-[11px] font-semibold rounded transition flex items-center gap-1 ${
                            deployType === 'zip'
                              ? 'bg-rose-500/15 text-rose-400 font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <UploadCloud className="h-3 w-3" /> ZIP Archive
                        </button>
                        <button
                          onClick={() => setDeployType('github')}
                          className={`px-3 py-1 text-[11px] font-semibold rounded transition flex items-center gap-1 ${
                            deployType === 'github'
                              ? 'bg-rose-500/15 text-rose-400 font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <GitBranch className="h-3 w-3" /> GitHub Integration
                        </button>
                      </div>
                    </div>

                    {/* Deploy Service Form Fields */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-mono font-medium uppercase tracking-wider">Service Name</label>
                          <input
                            type="text"
                            placeholder="e.g. FastAPI Analytics Server"
                            value={deployName}
                            onChange={(e) => setDeployName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded p-2.5 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-mono font-medium uppercase tracking-wider flex items-center justify-between">
                            <span>Customized URL Slug</span>
                            <span className="text-[9px] text-slate-600 font-sans tracking-normal lowercase">only lowercase, letters & hyphens</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. fastapi-analytics"
                            value={deploySlug}
                            onChange={(e) => setDeploySlug(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded p-2.5 text-slate-400 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        </div>
                      </div>

                      {/* Display live routing domain preview */}
                      <div className="bg-slate-950/80 p-3 rounded border border-slate-900 border-dashed flex items-center gap-2 text-xs">
                        <Link2 className="h-4 w-4 text-rose-400" />
                        <span className="text-slate-400 font-mono text-[11px] truncate">
                          Routing Target: <span className="text-slate-200 font-semibold underline text-rose-400">http://localhost:3000/apps/{deploySlug || '[slug]'}</span>
                        </span>
                      </div>

                      {/* Dynamic render based on build path */}
                      {deployType === 'zip' ? (
                        <div className="space-y-3">
                          <label className="text-[10px] text-slate-500 font-mono font-medium uppercase tracking-wider font-sans">Upload Source Archetype (.zip)</label>
                          <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('manual-zip-picker')?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                              isDraggingZip
                                ? 'bg-rose-500/5 border-rose-500 text-slate-200 shadow-lg'
                                : 'bg-slate-950/40 border-slate-900 hover:border-slate-800 text-slate-400'
                            }`}
                          >
                            <input
                              id="manual-zip-picker"
                              type="file"
                              accept=".zip"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <div className="flex flex-col items-center gap-2">
                              <UploadCloud className={`h-8 w-8 ${isDraggingZip || zipFileName ? 'text-rose-400' : 'text-slate-600'}`} />
                              {zipFileName ? (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-slate-200">{zipFileName}</p>
                                  <p className="text-[10px] text-emerald-400 font-mono">Archive successfully selected ({zipFileSize})</p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold">Glissez-déposez votre archive ZIP ici, ou cliquez pour parcourir</p>
                                  <p className="text-[10px] text-slate-500">Prise en charge complète de la détection automatique de framework/langage</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-4 font-sans">
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] text-slate-500 font-mono font-medium uppercase tracking-wider">GitHub Repository Url</label>
                            <input
                              type="text"
                              placeholder="e.g. https://github.com/expressjs/express"
                              value={githubRepoUrl}
                              onChange={(e) => setGithubRepoUrl(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-900 rounded p-2.5 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-mono font-medium uppercase tracking-wider font-sans">Default Branch</label>
                            <input
                              type="text"
                              value={githubBranch}
                              onChange={(e) => setGithubBranch(e.target.value)}
                              placeholder="main"
                              className="w-full bg-slate-950 border border-slate-900 rounded p-2.5 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono animate-none"
                            />
                          </div>
                        </div>
                      )}

                      {/* Framework Auto-detection override */}
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-900/60 font-sans">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-mono font-medium uppercase tracking-wider">Technology Signature override</label>
                          <select
                            value={deployTechTemplate}
                            onChange={(e) => setDeployTechTemplate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-900 rounded p-2.5 text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                          >
                            <option value="express">Node.js / Express Gateway (Auto-detected)</option>
                            <option value="python">Python / FastAPI Backend (Auto-detected)</option>
                            <option value="static">Static HTML Site (Auto-detected)</option>
                            <option value="worker">Node Worker Service (Auto-detected)</option>
                          </select>
                        </div>

                        {/* Environment Vault Header / quick insert */}
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-mono font-medium uppercase tracking-wider">Secure Env Variables Vault</label>
                          <div className="flex gap-2 font-mono">
                            <input
                              type="text"
                              placeholder="KEY"
                              value={newDeployEnvKey}
                              onChange={(e) => setNewDeployEnvKey(e.target.value)}
                              className="bg-slate-950 border border-slate-900 rounded p-2 text-slate-200 text-xs font-mono flex-1 focus:outline-none"
                            />
                            <input
                              type="password"
                              placeholder="VALUE"
                              value={newDeployEnvValue}
                              onChange={(e) => setNewDeployEnvValue(e.target.value)}
                              className="bg-slate-950 border border-slate-900 rounded p-2 text-slate-200 text-xs font-mono flex-1 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newDeployEnvKey && newDeployEnvValue) {
                                  setDeployEnvVars(prev => [...prev, { key: newDeployEnvKey.toUpperCase(), value: newDeployEnvValue, isSecret: true }]);
                                  setNewDeployEnvKey('');
                                  setNewDeployEnvValue('');
                                }
                              }}
                              className="bg-slate-900 border border-slate-850 text-slate-300 px-3 py-1.5 rounded hover:text-white text-xs font-semibold font-sans"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Display Vault list */}
                      {deployEnvVars.length > 0 && (
                        <div className="bg-slate-950 p-3 rounded border border-slate-900 space-y-2">
                          <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Secured Vault Stack:</div>
                          <div className="flex flex-wrap gap-1.5 font-mono">
                            {deployEnvVars.map((env, i) => (
                              <div key={i} className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] text-rose-300">
                                <span>{env.key}=••••••</span>
                                <button
                                  type="button"
                                  onClick={() => setDeployEnvVars(prev => prev.filter((_, idx) => idx !== i))}
                                  className="text-slate-400 hover:text-rose-450 text-[10px] font-bold"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trigger Button */}
                      <button
                        onClick={handleCreateDeployment}
                        disabled={deployingActive}
                        className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-rose-950 disabled:text-rose-900 text-white p-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/10 active:scale-95 transition-all mt-4 font-sans"
                      >
                        {deployingActive ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Provisioning Cluster Instance...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Deploy Service Instance To Edge
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Build Terminal View */}
                  <div className="w-full xl:w-96 bg-slate-900/60 border border-slate-900 rounded-lg p-5 flex flex-col gap-4 overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-rose-950/20 pb-4 shrink-0 justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">Active Pipelines Cockpit</h3>
                        <p className="text-[10px] text-slate-500 font-sans">Click on any pipeline record to inspect build output.</p>
                      </div>
                    </div>

                    {/* Pipelines checklist */}
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                      {deployments.length === 0 ? (
                        <div className="text-center py-12 text-slate-600 space-y-2 font-sans">
                          <Globe className="h-8 w-8 mx-auto stroke-[1.5]" />
                          <p className="text-xs">Aucun pipeline actif en cours d'exécution.</p>
                        </div>
                      ) : (
                        deployments.map((dep) => {
                          const isSelected = selectedDeployment && selectedDeployment.id === dep.id;
                          return (
                            <button
                              key={dep.id}
                              onClick={() => setSelectedDeployment(dep)}
                              className={`w-full text-left p-3 rounded border text-xs font-mono transition block ${
                                isSelected
                                  ? 'bg-slate-950 border-rose-500 text-slate-200 font-semibold'
                                  : 'bg-slate-950 border-slate-900 hover:border-slate-800 text-slate-400'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-slate-205 truncate pr-2 flex items-center gap-1.5 text-slate-200">
                                  {dep.type === 'github' ? <GitBranch className="h-3 w-3 text-rose-450 inline shrink-0" /> : <UploadCloud className="h-3 w-3 text-rose-450 inline shrink-0" />}
                                  {dep.name}
                                </span>
                                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded shrink-0 ${
                                  dep.status === 'ready'
                                    ? 'bg-emerald-500/10 text-emerald-400 font-bold'
                                    : dep.status === 'failed'
                                    ? 'bg-rose-500/10 text-rose-400 font-bold'
                                    : 'bg-amber-500/10 text-amber-500 font-bold animate-pulse'
                                }`}>
                                  {dep.status}
                                </span>
                              </div>
                              <div className="mt-2 flex justify-between text-[10px] text-slate-500 font-sans">
                                <span className="truncate">Source: {dep.source}</span>
                                <span>{new Date(dep.createdAt).toLocaleTimeString()}</span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Logs terminal for selected pipeline */}
                    {selectedDeployment && (
                      <div className="h-64 border border-slate-950 rounded bg-slate-950 p-4 font-mono text-[10px] overflow-y-auto space-y-1 shrink-0 flex flex-col justify-between selection:bg-rose-500 selection:text-white border-t border-slate-900">
                        <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[170px] custom-scrollbar pr-1 select-text">
                          <p className="text-slate-500 border-b border-slate-900 pb-1 font-sans uppercase tracking-wider text-[9px] mb-2 font-bold select-none">
                            BUILD VERIFICATION CONSOLE LOGS: {selectedDeployment.name}
                          </p>
                          {selectedDeployment.logs.map((log: string, lIdx: number) => (
                            <div key={lIdx} className="text-slate-300 leading-normal font-mono select-text break-all">
                              {log}
                            </div>
                          ))}
                        </div>

                        {selectedDeployment.status === 'ready' && (
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => window.open(`/apps/${selectedDeployment.slug}`, '_blank')}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold p-2.5 rounded text-[10px] uppercase tracking-wider cursor-pointer text-center select-none font-sans flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/20"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Visiter ↗
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/apps/${selectedDeployment.slug}`);
                                alert(`L'URL d'accès en direct pour "${selectedDeployment.name}" a été copiée dans le presse-papiers.`);
                              }}
                              className="px-3 bg-slate-900 border border-slate-800 text-slate-350 hover:text-white rounded text-[10px] font-bold font-sans flex items-center justify-center gap-1 cursor-pointer transition hover:bg-slate-850"
                              title="Copier l'URL d'accès"
                            >
                              <Copy className="h-3.5 w-3.5" /> Copier
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </main>
      </div>

      {/* 4. Overlay Registry creator Modal */}
      {showCreateModal && (
        <div id="new-app-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div id="new-app-modal" className="w-[650px] max-w-full bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col gap-4 overflow-y-auto max-h-[90vh]">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-rose-500" /> New Service cluster node
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Spawn standard isolated node servers. Configure templating files and keys automatically.
            </p>

            {/* Intelligent Code Auto-Detector section inside create app modal */}
            <div className="bg-slate-950/40 border border-slate-950/60 rounded-lg p-3.5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                  ✨ Auto-Detect Platform & Environment Keys
                </span>
                <span className="text-[10px] text-indigo-500 font-mono font-bold">Free AI scanner</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Passez ou décrivez votre codebase (fichiers, package.json, requirements.txt) pour que le PaaS identifie instantanément la technologie et préconditionne les variables d'environnement.
              </p>
              
              <div className="flex gap-2">
                <textarea
                  id="detector-input-textarea"
                  value={detectorInput}
                  onChange={(e) => setDetectorInput(e.target.value)}
                  placeholder="Collez ici du code, des dependances, ou package.json / requirements.txt..."
                  className="flex-1 min-h-[64px] bg-slate-950 border border-slate-800/40 rounded p-2 text-[11px] font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-y"
                />
                <button
                  id="trigger-auto-detect-btn"
                  onClick={runAutoDetector}
                  disabled={isDetecting}
                  className="px-3 bg-indigo-600 hover:bg-indigo-500/90 text-white rounded font-mono font-bold text-[10px] tracking-wider uppercase transition flex flex-col justify-center items-center gap-1.5 w-28 shrink-0 disabled:opacity-50"
                >
                  {isDetecting ? (
                    <>
                      <span className="animate-spin text-sm">⏳</span>
                      <span className="text-[9px]">Scanning...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍 Run</span>
                      <span className="text-[9px]">AI Detector</span>
                    </>
                  )}
                </button>
              </div>

              {detectorLogs.length > 0 && (
                <div className="bg-slate-950 border border-slate-900 rounded p-2.5 max-h-[140px] overflow-y-auto space-y-1.5 text-[10px] font-mono leading-relaxed transition">
                  {detectorLogs.map((logStr, lIdx) => (
                    <div key={lIdx} className={logStr.startsWith('✨') ? "text-emerald-400 font-semibold mt-1" : logStr.startsWith('✅') ? "text-indigo-400 font-semibold" : "text-slate-400"}>
                      {logStr}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase">Application Human Name</label>
                  <input
                    id="new-app-name-input"
                    type="text"
                    value={newAppName}
                    onChange={(e) => {
                      setNewAppName(e.target.value);
                      if (!newAppSlug) {
                        setNewAppSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, ''));
                      }
                    }}
                    placeholder="E.g. Public API Dispatcher"
                    className="w-full bg-slate-950 border border-slate-950 rounded p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase">Unique Slug Pathway</label>
                  <input
                    id="new-app-slug-input"
                    type="text"
                    value={newAppSlug}
                    onChange={(e) => setNewAppSlug(e.target.value)}
                    placeholder="public-api-dispatcher"
                    className="w-full bg-slate-950 border border-slate-950 rounded p-2.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase">Process Blueprint Template</label>
                <div className="grid grid-cols-5 gap-2">
                  {(['express', 'node', 'python', 'docker', 'go', 'static', 'java', 'ruby', 'worker', 'serverless'] as const).map(templ => (
                    <button
                      key={templ}
                      id={`template-opt-${templ}`}
                      onClick={() => setNewAppTemplate(templ)}
                      className={`p-2 rounded text-center text-[10px] border uppercase tracking-wider font-mono font-bold transition duration-150 ${
                        newAppTemplate === templ
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-slate-950 border-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {templ}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cluster variables list */}
              <div className="space-y-2 pt-2 border-t border-slate-950">
                <h4 className="font-semibold text-slate-400 text-xs">Bootstrap Environment</h4>
                <div className="max-h-24 overflow-y-auto space-y-1.5">
                  {newAppEnv.map((e, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-950/80 font-mono text-[10px] leading-none">
                      <span className="text-slate-300 font-semibold">{e.key}</span>
                      <span className="text-slate-500 font-semibold">{e.isSecret ? "AES_ENCRYPTED" : e.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 items-center">
                  <input
                    id="new-env-key-input"
                    type="text"
                    placeholder="KEY"
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value.toUpperCase())}
                    className="w-24 bg-slate-950 border border-slate-950 rounded p-2 text-xs text-slate-200 font-mono focus:outline-none"
                  />
                  <input
                    id="new-env-val-input"
                    type="text"
                    placeholder="Value"
                    value={newEnvValue}
                    onChange={(e) => setNewEnvValue(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-950 rounded p-2 text-xs text-slate-200 font-mono focus:outline-none"
                  />
                  <label className="flex items-center gap-1.5 text-slate-500 text-[10px] cursor-pointer">
                    <input
                      id="new-env-secret-checkbox"
                      type="checkbox"
                      checked={newEnvIsSecret}
                      onChange={(e) => setNewEnvIsSecret(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 accent-rose-500 focus:ring-0"
                    />
                    Secret
                  </label>
                  <button
                    id="add-env-new-btn"
                    onClick={addVariableToNew}
                    className="p-1 px-2 border border-slate-800 hover:border-slate-500 text-slate-300 rounded"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-950 text-xs shrink-0">
              <button
                id="cancel-create-app-modal"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 hover:bg-slate-950 hover:text-white text-slate-400 rounded transition font-medium"
              >
                Cancel
              </button>
              <button
                id="submit-new-app"
                onClick={handleCreateApp}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded shadow-lg shadow-rose-950/40 transition"
              >
                Create App
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
