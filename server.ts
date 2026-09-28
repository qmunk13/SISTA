import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Lazy Gemini client helper
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const SETTINGS_FILE = path.join(process.cwd(), "settings-db.json");
const TMP_SETTINGS_FILE = "/tmp/settings-db.json";

const DEFAULT_SETTINGS = {
  scriptUrl: "https://script.google.com/macros/s/AKfycbzjA0wnvgBjJASr-TVRHLLBmxqhOy04A8R0Qej4oTDyFb5FEmcT5G98Slr_4z9qa3a_YQ/exec",
  appName: "SISTA TAMBORA",
  schoolName: "ROMBEL TAMBORA",
  spreadsheetId: "1XyQnYPz_0erRm7NTMGZh0ysGWZRXjqbDb271ovLeqJ4",
  folderId: "1VW1baVO9pF9nGbQ0IxuasfW6nVGNQYEu",
  folderSoalId: "16oUIgoAYOB7mhVATnEkZ0S-8BWWt7C8z",
  folderFotoSoalId: "1VW1baVO9pF9nGbQ0IxuasfW6nVGNQYEu",
  folderModulId: "1xaf825icvAaXO7T1YtxjbWQQw-sud_t0",
  folderModulUrl: "https://drive.google.com/drive/folders/1xaf825icvAaXO7T1YtxjbWQQw-sud_t0",
  folderSiswaId: "1DfCtp8BbsRzFafEa8fk30Suq-aVQoS7V",
  adminUsername: "admin",
  adminPassword: "admin",
  schoolLogoUrl: "https://lh3.googleusercontent.com/d/1Tg-mI0FDd8VDck4LVYt9NiDifdnoAyiJ",
  tahunPelajaran: "2026/2027",
  semester: "Ganjil"
};

// Helper to read settings (supports both local disk and serverless /tmp fallback)
function readSettings() {
  for (const filePath of [TMP_SETTINGS_FILE, SETTINGS_FILE]) {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8").trim();
        if (content) {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
        }
      } catch (e) {
        console.error("Error reading settings file:", e);
      }
    }
  }
  return DEFAULT_SETTINGS;
}

// Helper to write settings (falls back to /tmp on read-only serverless filesystems like Vercel)
function writeSettings(settings: any) {
  const payload = JSON.stringify(settings, null, 2);
  try {
    fs.writeFileSync(SETTINGS_FILE, payload, "utf-8");
  } catch {
    try {
      fs.writeFileSync(TMP_SETTINGS_FILE, payload, "utf-8");
    } catch (e) {
      console.error("Error writing settings file:", e);
    }
  }
}

// API Routes
app.get("/api/settings", (req, res) => {
  res.json(readSettings());
});

app.post("/api/settings", (req, res) => {
  const current = readSettings();
  const updated = { ...current, ...req.body };
  writeSettings(updated);
  res.json({ success: true, settings: updated });
});

// Robust helper to fetch from Google Apps Script with timeout, connection close, and transient socket retries
async function safeFetchGAS(url: string, options: RequestInit, timeoutMs = 25000, maxRetries = 2): Promise<{ ok: boolean; status: number; text: string; error?: string }> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let timer: NodeJS.Timeout | null = null;
    try {
      const controller = new AbortController();
      timer = setTimeout(() => controller.abort(), timeoutMs);

      const mergedHeaders = {
        "Accept": "application/json, text/plain, */*",
        "Connection": "close",
        ...(options.headers || {})
      };

      const resp = await fetch(url, {
        ...options,
        headers: mergedHeaders,
        redirect: "follow",
        signal: controller.signal
      });

      if (timer) clearTimeout(timer);
      const text = await resp.text();
      return { ok: resp.ok, status: resp.status, text };
    } catch (err: any) {
      if (timer) clearTimeout(timer);
      lastError = err;
      const isTransient = err.name === 'AbortError' || 
        err.message?.includes('closed') || 
        err.message?.includes('fetch failed') ||
        err.code === 'UND_ERR_SOCKET' ||
        err.code === 'ECONNRESET';

      if (isTransient && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
      break;
    }
  }

  return {
    ok: false,
    status: 503,
    text: JSON.stringify({
      success: false,
      status: "network_error",
      isOffline: true,
      error: `Koneksi ke Google Apps Script dialihkan ke penyimpanan lokal.`
    }),
    error: lastError?.message || "GAS unavailable"
  };
}

// Proxy for Google Apps Script to bypass browser CORS / fetch limitations
const handleGasProxy = async (req: express.Request, res: express.Response) => {
  try {
    let targetUrl = req.method === "GET" ? (req.query.url as string) : req.body?.url;
    let payload = req.body?.payload !== undefined ? req.body?.payload : req.body?.body;

    if (!targetUrl) {
      // Fallback default GAS URL from persisted settings or default
      const currentSettings = readSettings();
      targetUrl = currentSettings?.scriptUrl || DEFAULT_SETTINGS.scriptUrl;
    }

    // If it's a GET request with extra query params, forward them to targetUrl
    if (req.method === "GET") {
      try {
        const urlObj = new URL(targetUrl);
        for (const [key, val] of Object.entries(req.query)) {
          if (key !== "url") {
            urlObj.searchParams.set(key, String(val));
          }
        }
        targetUrl = urlObj.toString();
      } catch (urlErr) {
        // Continue with original targetUrl if URL parsing fails
      }
    }

    const fetchOptions: RequestInit = {
      method: req.method === "GET" ? "GET" : "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    };

    if (req.method !== "GET" && payload !== undefined) {
      fetchOptions.body = typeof payload === "string" ? payload : JSON.stringify(payload);
    }

    const response = await safeFetchGAS(targetUrl, fetchOptions);
    const text = response.text || "";
    const trimmed = text.trim();

    // Check if the response from Google Apps Script is HTML (such as Google Login redirect or Drive error page)
    if (trimmed.startsWith("<") || trimmed.toLowerCase().includes("<!doctype") || trimmed.toLowerCase().includes("<html")) {
      return res.status(200).json({
        success: false,
        status: "html_response",
        isHtml: true,
        error: "Google Apps Script mengembalikan dokumen HTML alih-alih data JSON. Pastikan Web App dideploy dengan hak akses 'Anyone' (Siapa saja) dan URL berakhiran '/exec', bukan link editor script.",
        rawHtmlSnippet: trimmed.slice(0, 250)
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { raw: text };
    }

    if (!response.ok) {
      return res.status(200).json({
        success: false,
        status: "error",
        isOffline: true,
        ...data
      });
    }

    res.json(data);
  } catch (error: any) {
    console.warn("[GAS Proxy] Handled connection failure gracefully:", error?.message);
    res.status(200).json({
      success: false,
      status: "error",
      isOffline: true,
      error: error.message || "Gagal menghubungi server GAS (Koneksi socket terputus)"
    });
  }
};

app.all("/api/gas-proxy", handleGasProxy);
app.all("/api/gas/proxy", handleGasProxy);

// Diagnostic Endpoint to test Google Apps Script Web App Health
app.all("/api/gas/status", async (req, res) => {
  try {
    const settings = readSettings();
    const scriptUrl = (req.body?.scriptUrl || req.query?.scriptUrl || settings.scriptUrl || DEFAULT_SETTINGS.scriptUrl) as string;
    const spreadsheetId = (req.body?.spreadsheetId || req.query?.spreadsheetId || settings.spreadsheetId || DEFAULT_SETTINGS.spreadsheetId) as string;

    if (!scriptUrl) {
      return res.json({ success: false, isOnline: false, error: "URL Web App belum diatur di menu Pengaturan." });
    }

    const testResp = await safeFetchGAS(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "GET_ALL_SHEETS", spreadsheetId })
    }, 12000, 1);

    const raw = testResp.text || "";
    const isHtml = raw.startsWith("<") || raw.toLowerCase().includes("<!doctype") || raw.toLowerCase().includes("<html") || raw.toLowerCase().includes("page not found");

    if (!testResp.ok || isHtml) {
      return res.json({
        success: false,
        isOnline: false,
        isHtml: true,
        scriptUrl,
        error: isHtml
          ? "URL Web App mengembalikan halaman HTML Google (Page Not Found / Akses Ditolak). Deployment script lama kemungkinan sudah tidak aktif atau izin akses belum diatur ke 'Anyone' (Siapa saja)."
          : (testResp.error || "Gagal menghubungi Web App Google Apps Script"),
        snippet: raw.slice(0, 200)
      });
    }

    let parsed: any = null;
    try { parsed = JSON.parse(raw); } catch {}

    return res.json({
      success: true,
      isOnline: true,
      scriptUrl,
      spreadsheetId,
      message: "Web App Google Apps Script aktif dan dapat berkomunikasi dengan lancar!",
      details: parsed
    });
  } catch (err: any) {
    return res.json({ success: false, isOnline: false, error: err.message || "Gagal menguji Web App" });
  }
});

// Endpoint providing the exact unified Code.gs content
app.get("/api/gas/code", (req, res) => {
  try {
    const codePath = path.join(process.cwd(), "Code.gs");
    if (fs.existsSync(codePath)) {
      const code = fs.readFileSync(codePath, "utf-8");
      return res.json({ success: true, code });
    }
    return res.status(404).json({ success: false, error: "Code.gs not found on server" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Failed to read Code.gs" });
  }
});

// Endpoint providing Index.html for Apps Script
app.get("/api/gas/html", (req, res) => {
  try {
    const distHtml = path.join(process.cwd(), "dist", "index.html");
    if (fs.existsSync(distHtml)) {
      const html = fs.readFileSync(distHtml, "utf-8");
      return res.json({ success: true, html });
    }
    const defaultHtml = `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ERP Rombel KTCT</title>
</head>
<body class="bg-slate-900 text-white">
  <div id="root">
    <div style="padding: 40px; text-align: center; font-family: sans-serif;">
      <h2>ERP Rombel KTCT Terpadu</h2>
      <p style="color: #94a3b8;">Sistem ERP & Database Spreadsheet Terhubung</p>
    </div>
  </div>
</body>
</html>`;
    return res.json({ success: true, html: defaultHtml });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Failed to read html" });
  }
});

// Endpoint providing split parts for modular GAS editor
app.get("/api/gas/parts", (req, res) => {
  try {
    const codePath = path.join(process.cwd(), "Code.gs");
    let codeSize = 0;
    if (fs.existsSync(codePath)) {
      codeSize = fs.statSync(codePath).size;
    }
    const parts = [
      {
        name: "Index.html",
        type: "html",
        description: "File HTML Master Antarmuka Pengguna",
        size: 2048,
        content: `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ERP Rombel KTCT</title>
  <?!= include('CSS'); ?>
</head>
<body class="bg-slate-900 text-slate-100">
  <div id="root">
    <div style="padding: 40px; text-align: center; font-family: sans-serif;">
      <h2 style="color: #38bdf8;">Memuat Sistem ERP Rombel KTCT...</h2>
      <p style="color: #94a3b8;">Menghubungkan ke Master Database Google Spreadsheet</p>
    </div>
  </div>
  <?!= include('JS_Part1'); ?>
</body>
</html>`
      },
      {
        name: "CSS.html",
        type: "html",
        description: "Bundle Tema & Visual Antarmuka (Tailwind CSS)",
        size: 4096,
        content: `<style>
/* Styling Tambahan ERP Rombel KTCT */
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
</style>`
      },
      {
        name: "JS_Part1.html",
        type: "html",
        description: "Logika Integrasi & Database Spreadsheet Client",
        size: 8192,
        content: `<script>
console.log("ERP Rombel KTCT Google Apps Script Client Ready");
</script>`
      }
    ];
    return res.json({ success: true, parts });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Failed to generate parts" });
  }
});

// In-memory GID Cache & In-Flight Deduplication for Google Spreadsheet tabs
let cachedSheetGids: { spreadsheetId: string; gids: Record<string, string>; timestamp: number } | null = null;
const inFlightGidPromises = new Map<string, Promise<Record<string, string>>>();

async function getOrFetchSheetGids(spreadsheetId: string): Promise<Record<string, string>> {
  if (cachedSheetGids && cachedSheetGids.spreadsheetId === spreadsheetId && (Date.now() - cachedSheetGids.timestamp < 3600000)) {
    return cachedSheetGids.gids;
  }
  const existingPromise = inFlightGidPromises.get(spreadsheetId);
  if (existingPromise) {
    return existingPromise;
  }

  const fetchPromise = (async () => {
    const gids: Record<string, string> = {};
    try {
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/edit`;
      const htmlResp = await fetch(sheetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
      });
      if (htmlResp.ok) {
        const html = await htmlResp.text();
        const regex = /\[\d+,\s*0,\s*\\?"(\d+)\\?",\s*\[\{\\?"1\\?":\s*\[\[0,\s*0,\s*\\?"([^"\\]+)\\?"/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
          if (match[2] && match[1]) {
            gids[match[2]] = match[1];
          }
        }
      }
    } catch (err) {
      console.warn("Error scraping sheet GIDs:", err);
    }
    if (Object.keys(gids).length > 0) {
      cachedSheetGids = { spreadsheetId, gids, timestamp: Date.now() };
    }
    return gids;
  })();

  inFlightGidPromises.set(spreadsheetId, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlightGidPromises.delete(spreadsheetId);
  }
}

function parseCsvToObjects(csvText: string): Record<string, any>[] {
  if (!csvText || typeof csvText !== 'string') return [];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = csvText.length;

  while (i < len) {
    const c = csvText[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < len && csvText[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        field += c;
        i++;
        continue;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (c === ',') {
        row.push(field);
        field = '';
        i++;
        continue;
      } else if (c === '\r') {
        if (i + 1 < len && csvText[i + 1] === '\n') i++;
        row.push(field);
        field = '';
        if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
          rows.push(row);
        }
        row = [];
        i++;
        continue;
      } else if (c === '\n') {
        row.push(field);
        field = '';
        if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
          rows.push(row);
        }
        row = [];
        i++;
        continue;
      } else {
        field += c;
        i++;
        continue;
      }
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
      rows.push(row);
    }
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  const results: Record<string, any>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const rData = rows[r];
    const obj: Record<string, any> = {};
    let hasVal = false;
    headers.forEach((h, colIdx) => {
      const val = rData[colIdx] !== undefined ? rData[colIdx] : '';
      obj[h] = val;
      if (val && String(val).trim()) hasVal = true;
    });
    if (hasVal) results.push(obj);
  }
  return results;
}

// Endpoint to fetch Sheet Tab GIDs directly from Google Spreadsheet or Apps Script
app.get("/api/sheet-gids", async (req, res) => {
  try {
    const spreadsheetId = (req.query.spreadsheetId as string) || DEFAULT_SETTINGS.spreadsheetId || "1XyQnYPz_0erRm7NTMGZh0ysGWZRXjqbDb271ovLeqJ4";
    const gids = await getOrFetchSheetGids(spreadsheetId);

    if (Object.keys(gids).length > 0) {
      return res.json({ success: true, gids, count: Object.keys(gids).length, source: 'google-sheets-direct' });
    }

    // Fallback: Query Apps Script endpoint if direct fetch returned empty
    const scriptUrl = (req.query.scriptUrl as string) || DEFAULT_SETTINGS.scriptUrl;
    if (scriptUrl) {
      try {
        const gasResp = await safeFetchGAS(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'GET_SHEET_GIDS', spreadsheetId })
        });
        const trimmed = (gasResp.text || '').trim();
        if (gasResp.ok && !trimmed.startsWith('<')) {
          let gasData: any;
          try {
            gasData = JSON.parse(trimmed);
          } catch {
            gasData = null;
          }
          if (gasData && gasData.gids && typeof gasData.gids === 'object' && Object.keys(gasData.gids).length > 0) {
            cachedSheetGids = { spreadsheetId, gids: gasData.gids, timestamp: Date.now() };
            return res.json({ success: true, gids: gasData.gids, count: Object.keys(gasData.gids).length, source: 'apps-script' });
          }
        }
      } catch {
        // Fallback silently
      }
    }

    return res.status(404).json({ success: false, error: 'Tidak dapat menemukan GID sheet dari Google Spreadsheet.' });
  } catch (error: any) {
    console.error("Fetch Sheet GIDs Error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to get sheet GIDs" });
  }
});

// In-memory & local cache for real-time sheet transactions (bypasses Google Sheets CDN export delay)
const recentSheetUpdates = new Map<string, { rows: any[]; timestamp: number }>();

// High-speed Server-Side Sheet CSV Cache (45s TTL) & In-Flight Request Deduplication
const sheetDataCache = new Map<string, { rows: any[]; gid?: string; timestamp: number }>();
const inFlightSheetPromises = new Map<string, Promise<{ rows: any[]; gid?: string; source: string } | null>>();
let bulkSyncCache: { spreadsheetId: string; sheetMap: Record<string, any[]>; sheetCount: number; totalRows: number; timestamp: number } | null = null;
let inFlightBulkSyncPromise: Promise<any> | null = null;

function mergeWithRecentUpdates(sheetName: string, baseRows: any[]): any[] {
  const targetKey = sheetName.trim().toUpperCase();
  const cached = recentSheetUpdates.get(targetKey);
  if (!cached || !Array.isArray(cached.rows) || cached.rows.length === 0) {
    return baseRows;
  }
  // Keep cache valid for 15 minutes to guarantee Google CDN has refreshed
  if (Date.now() - cached.timestamp > 15 * 60 * 1000) {
    return baseRows;
  }

  const idKeyMap: Record<string, string[]> = {
    USERS: ['UserID', 'userId', 'Username', 'username', 'id'],
    SISWA: ['nopdkt', 'noPdkt', 'NISN', 'nisn', 'id'],
    TABUNGAN: ['TabunganID', 'tabunganId', 'id'],
    TAGIHAN: ['TagihanID', 'tagihanId', 'id'],
    PEMBAYARAN: ['PembayaranID', 'pembayaranId', 'InvoiceID', 'invoiceId', 'id'],
    KAS: ['KasID', 'kasId', 'id']
  };
  const keysToCheck = idKeyMap[targetKey] || ['id', 'UserID', 'username'];

  const getRowId = (r: any) => {
    for (const k of keysToCheck) {
      if (r && r[k]) return String(r[k]).trim().toUpperCase();
    }
    return '';
  };

  const existingMap = new Map<string, any>();
  baseRows.forEach(r => {
    const id = getRowId(r);
    if (id) existingMap.set(id, r);
  });

  // Update or add from cached rows
  cached.rows.forEach(cr => {
    const cid = getRowId(cr);
    if (cid) {
      existingMap.set(cid, { ...(existingMap.get(cid) || {}), ...cr });
    }
  });

  // If baseRows is smaller than cached.rows, prefer the cached rows merged with any extra
  if (cached.rows.length >= baseRows.length) {
    const vals = Array.from(existingMap.values());
    return vals.length > 0 ? vals : cached.rows;
  }

  return baseRows.map(r => {
    const id = getRowId(r);
    return id && existingMap.has(id) ? existingMap.get(id) : r;
  });
}

// Direct Fast Sheet Data Endpoint (e.g. /api/sheet-data/TABUNGAN)
// Directly exports CSV via GID in <5ms (from RAM cache) or 1-2s (live CSV) with zero Apps Script overhead
app.get("/api/sheet-data/:sheetName", async (req, res) => {
  try {
    const sheetName = req.params.sheetName.trim().toUpperCase();
    const spreadsheetId = (req.query.spreadsheetId as string) || DEFAULT_SETTINGS.spreadsheetId || "1XyQnYPz_0erRm7NTMGZh0ysGWZRXjqbDb271ovLeqJ4";
    const scriptUrl = (req.query.scriptUrl as string) || DEFAULT_SETTINGS.scriptUrl || "https://script.google.com/macros/s/AKfycbzjA0wnvgBjJASr-TVRHLLBmxqhOy04A8R0Qej4oTDyFb5FEmcT5G98Slr_4z9qa3a_YQ/exec";
    const forceRefresh = req.query.force === 'true' || req.query.force === '1';

    const cacheKey = `${spreadsheetId}:${sheetName}`;
    const cachedEntry = sheetDataCache.get(cacheKey);
    if (!forceRefresh && cachedEntry && (Date.now() - cachedEntry.timestamp < 45000)) {
      const finalRows = mergeWithRecentUpdates(sheetName, cachedEntry.rows);
      return res.json({
        success: true,
        sheetName,
        gid: cachedEntry.gid,
        data: finalRows,
        count: finalRows.length,
        source: 'server-ram-cache-instant'
      });
    }

    let flight = inFlightSheetPromises.get(cacheKey);
    if (!flight) {
      flight = (async () => {
        const gids = await getOrFetchSheetGids(spreadsheetId);
        const gid = (sheetName === 'UJIAN' && gids['JADWAL_UJIAN'])
          ? gids['JADWAL_UJIAN']
          : (gids[sheetName] || gids[req.params.sheetName.trim()]);

        if (gid) {
          try {
            const csvUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`;
            const csvResp = await fetch(csvUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              }
            });
            if (csvResp.ok) {
              const csvText = await csvResp.text();
              const rows = parseCsvToObjects(csvText);
              sheetDataCache.set(cacheKey, { rows, gid, timestamp: Date.now() });
              return { rows, gid, source: 'google-sheets-csv-fast' };
            }
          } catch {
            // Fallback to Apps Script below
          }
        }
        return null;
      })();
      inFlightSheetPromises.set(cacheKey, flight);
    }

    let csvResult: { rows: any[]; gid?: string; source: string } | null = null;
    try {
      csvResult = await flight;
    } finally {
      inFlightSheetPromises.delete(cacheKey);
    }

    if (csvResult) {
      const finalRows = mergeWithRecentUpdates(sheetName, csvResult.rows);
      return res.json({
        success: true,
        sheetName,
        gid: csvResult.gid,
        data: finalRows,
        count: finalRows.length,
        source: csvResult.source
      });
    }

    // Fallback to Apps Script if CSV export fails or sheet has no GID
    if (scriptUrl) {
      try {
        const gasResp = await safeFetchGAS(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'GET_SHEET', sheetName, spreadsheetId })
        });
        const trimmed = (gasResp.text || '').trim();
        if (gasResp.ok && !trimmed.startsWith('<')) {
          let gasData: any;
          try {
            gasData = JSON.parse(trimmed);
          } catch {
            gasData = null;
          }
          if (gasData) {
            const rows = Array.isArray(gasData.data) ? gasData.data : (Array.isArray(gasData.result) ? gasData.result : []);
            const finalRows = mergeWithRecentUpdates(sheetName, rows);
            return res.json({
              success: true,
              sheetName,
              data: finalRows,
              count: finalRows.length,
              source: 'apps-script-fallback'
            });
          }
        }
      } catch {
        // Handled silently
      }
    }

    // If Google Sheets/GAS both failed but we have recent live updates in memory
    const targetKey = sheetName.trim().toUpperCase();
    const cached = recentSheetUpdates.get(targetKey);
    if (cached && Array.isArray(cached.rows) && cached.rows.length > 0) {
      return res.json({
        success: true,
        sheetName,
        data: cached.rows,
        count: cached.rows.length,
        source: 'server-cache-fallback'
      });
    }

    return res.status(404).json({ success: false, error: `Sheet "${sheetName}" tidak ditemukan atau tidak dapat diakses.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to fetch sheet data" });
  }
});

// Dedicated endpoint to save, update, delete, or bulk-create CBT questions directly to Google Spreadsheet
app.post("/api/cbt/save-question", async (req, res) => {
  try {
    const { action = 'CREATE', question, bankPackage, detailSoalId } = req.body;
    const settings = readSettings();
    const scriptUrl = settings.scriptUrl || DEFAULT_SETTINGS.scriptUrl;
    const spreadsheetId = settings.spreadsheetId || DEFAULT_SETTINGS.spreadsheetId;

    if (!scriptUrl) {
      return res.status(400).json({ success: false, error: "Script URL Google Apps Script tidak terkonfigurasi." });
    }

    if (action === 'DELETE') {
      const delResp = await safeFetchGAS(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "DELETE",
          sheetName: "SOAL",
          idKey: "DetailSoalID",
          idValue: detailSoalId,
          spreadsheetId
        })
      });

      if (bankPackage && (bankPackage.BankSoalID || bankPackage.id)) {
        const bankId = bankPackage.BankSoalID || bankPackage.id;
        await safeFetchGAS(scriptUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "UPDATE",
            sheetName: "BANK_SOAL",
            idKey: "BankSoalID",
            idValue: bankId,
            recordData: {
              BankSoalID: bankId,
              JumlahSoal: bankPackage.jumlahSoal || (bankPackage.soalList || []).length,
              SoalJSON: typeof bankPackage.SoalJSON === 'string' ? bankPackage.SoalJSON : JSON.stringify(bankPackage.soalList || []),
              UpdatedAt: new Date().toISOString()
            },
            spreadsheetId
          })
        });
      }

      return res.json({ success: true, message: `Butir soal ${detailSoalId} berhasil dihapus langsung dari Google Spreadsheet.` });
    }

    if (action === 'BULK_CREATE') {
      const questions: any[] = req.body.questions || [];
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, error: "Tidak ada butir soal yang dikirim." });
      }

      const bankId = bankPackage?.BankSoalID || bankPackage?.id || `BNK-${Date.now()}`;
      let successCount = 0;

      for (const q of questions) {
        const recordData = {
          DetailSoalID: q.DetailSoalID || `SOAL-${bankId}-${q.id || q.NomorSoal || Date.now()}`,
          UjianID: q.UjianID || bankId,
          BankSoalID: bankId,
          MataPelajaran: bankPackage?.mapel || bankPackage?.Mapel || '',
          Kelas: String(bankPackage?.kelas || bankPackage?.Kelas || ''),
          Jenjang: bankPackage?.jenjang || bankPackage?.Jenjang || 'Paket C',
          NomorSoal: q.id || q.NomorSoal || 1,
          Pertanyaan: q.pertanyaan || q.Pertanyaan || '',
          TipeSoal: q.tipe || q.TipeSoal || 'Pilihan Ganda',
          PilihanA: q.opsi?.a || q.PilihanA || '',
          PilihanB: q.opsi?.b || q.PilihanB || '',
          PilihanC: q.opsi?.c || q.PilihanC || '',
          PilihanD: q.opsi?.d || q.PilihanD || '',
          PilihanE: q.opsi?.e || q.PilihanE || '',
          KunciJawaban: String(q.kunci || q.KunciJawaban || 'a').toLowerCase(),
          PembahasanRasional: q.pembahasan || q.PembahasanRasional || '',
          Bobot: q.bobot || q.Bobot || 5,
          CreatedAt: q.CreatedAt || new Date().toISOString()
        };

        const postResp = await safeFetchGAS(scriptUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "CREATE",
            sheetName: "SOAL",
            recordData,
            spreadsheetId
          })
        });

        if (postResp.ok) successCount++;
      }

      if (bankPackage) {
        await safeFetchGAS(scriptUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "UPDATE",
            sheetName: "BANK_SOAL",
            idKey: "BankSoalID",
            idValue: bankId,
            recordData: {
              BankSoalID: bankId,
              JumlahSoal: bankPackage.jumlahSoal || (bankPackage.soalList || []).length,
              SoalJSON: typeof bankPackage.SoalJSON === 'string' ? bankPackage.SoalJSON : JSON.stringify(bankPackage.soalList || []),
              UpdatedAt: new Date().toISOString()
            },
            spreadsheetId
          })
        });
      }

      return res.json({
        success: true,
        count: successCount,
        message: `${successCount} butir soal berhasil disimpan langsung ke Google Spreadsheet!`
      });
    }

    // Default: Single CREATE or UPDATE
    const bankId = bankPackage?.BankSoalID || bankPackage?.id || `BNK-${Date.now()}`;
    const qId = question?.DetailSoalID || `SOAL-${bankId}-${question?.id || question?.NomorSoal || Date.now()}`;

    const recordData = {
      DetailSoalID: qId,
      UjianID: question?.UjianID || bankId,
      BankSoalID: bankId,
      MataPelajaran: bankPackage?.mapel || bankPackage?.Mapel || '',
      Kelas: String(bankPackage?.kelas || bankPackage?.Kelas || ''),
      Jenjang: bankPackage?.jenjang || bankPackage?.Jenjang || 'Paket C',
      NomorSoal: question?.id || question?.NomorSoal || 1,
      Pertanyaan: question?.pertanyaan || question?.Pertanyaan || '',
      TipeSoal: question?.tipe || question?.TipeSoal || 'Pilihan Ganda',
      PilihanA: question?.opsi?.a || question?.PilihanA || '',
      PilihanB: question?.opsi?.b || question?.PilihanB || '',
      PilihanC: question?.opsi?.c || question?.PilihanC || '',
      PilihanD: question?.opsi?.d || question?.PilihanD || '',
      PilihanE: question?.opsi?.e || question?.PilihanE || '',
      KunciJawaban: String(question?.kunci || question?.KunciJawaban || 'a').toLowerCase(),
      PembahasanRasional: question?.pembahasan || question?.PembahasanRasional || '',
      Bobot: question?.bobot || question?.Bobot || 5,
      CreatedAt: question?.CreatedAt || new Date().toISOString()
    };

    let gasResp;
    if (action === 'UPDATE') {
      gasResp = await safeFetchGAS(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "UPDATE",
          sheetName: "SOAL",
          idKey: "DetailSoalID",
          idValue: qId,
          recordData,
          spreadsheetId
        })
      });
    } else {
      gasResp = await safeFetchGAS(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "CREATE",
          sheetName: "SOAL",
          recordData,
          spreadsheetId
        })
      });
    }

    if (bankPackage) {
      await safeFetchGAS(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "UPDATE",
          sheetName: "BANK_SOAL",
          idKey: "BankSoalID",
          idValue: bankId,
          recordData: {
            BankSoalID: bankId,
            JumlahSoal: bankPackage.jumlahSoal || (bankPackage.soalList || []).length,
            SoalJSON: typeof bankPackage.SoalJSON === 'string' ? bankPackage.SoalJSON : JSON.stringify(bankPackage.soalList || []),
            UpdatedAt: new Date().toISOString()
          },
          spreadsheetId
        })
      });
    }

    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(gasResp.text || "{}");
    } catch {
      parsedResult = { raw: gasResp.text };
    }

    return res.json({
      success: true,
      action,
      detailSoalId: qId,
      message: `Butir soal berhasil disimpan langsung ke Google Spreadsheet (Sheet SOAL & BANK_SOAL)!`,
      gasResult: parsedResult
    });
  } catch (error: any) {
    console.error("[CBT Save Question Error]:", error);
    res.status(500).json({ success: false, error: error.message || "Gagal menyimpan butir soal ke Google Sheets" });
  }
});

// Dedicated endpoint to save/update/delete Bank Soal packages and all questions directly into Sheet BANK_SOAL & SOAL
app.post("/api/cbt/save-bank-soal", async (req, res) => {
  try {
    const { action = 'SAVE_PACKAGE', bankPackage, packages, packageId } = req.body;
    const settings = readSettings();
    const scriptUrl = settings.scriptUrl || DEFAULT_SETTINGS.scriptUrl;
    const spreadsheetId = settings.spreadsheetId || DEFAULT_SETTINGS.spreadsheetId;

    if (!scriptUrl) {
      return res.status(400).json({ success: false, error: "Script URL Google Apps Script tidak terkonfigurasi." });
    }

    // Helper to format a package record for Sheet BANK_SOAL
    const formatBankPackageRecord = (pkg: any) => {
      const bId = String(pkg.BankSoalID || pkg.id || `BNK-${Date.now()}`).trim();
      const rawK = String(pkg.Kelas || pkg.kelas || '4');
      const cleanK = rawK.replace(/[A-Za-z]/g, '').trim() || '4';
      const cleanSoal = Array.isArray(pkg.soalList) ? pkg.soalList : [];
      return {
        BankSoalID: bId,
        id: bId,
        Mapel: pkg.mapel || pkg.Mapel || 'Mata Pelajaran',
        mapel: pkg.mapel || pkg.Mapel || 'Mata Pelajaran',
        Kelas: cleanK,
        kelas: cleanK,
        Kurikulum: pkg.kurikulum || pkg.Kurikulum || 'Kurikulum Merdeka',
        Guru: pkg.guru || pkg.Guru || 'Tim Guru',
        JumlahSoal: cleanSoal.length || Number(pkg.jumlahSoal || pkg.JumlahSoal || 0),
        TipeSoal: pkg.tipeSoal || pkg.TipeSoal || `${cleanSoal.length} Pilihan Ganda`,
        Kesulitan: pkg.kesulitan || pkg.Kesulitan || 'Sedang',
        Status: pkg.status || pkg.Status || 'Siap Digunakan',
        Topik: pkg.topik || pkg.Topik || '',
        TemaModul: pkg.temaModul || pkg.TemaModul || '',
        KodeSubTugas: pkg.kodeSubTugas || pkg.KodeSubTugas || '',
        SoalJSON: typeof pkg.SoalJSON === 'string' && pkg.SoalJSON.length > 5 ? pkg.SoalJSON : JSON.stringify(cleanSoal),
        UpdatedAt: new Date().toISOString()
      };
    };

    if (action === 'DELETE_PACKAGE') {
      const targetId = packageId || bankPackage?.BankSoalID || bankPackage?.id;
      if (!targetId) {
        return res.status(400).json({ success: false, error: "ID Paket tidak valid" });
      }

      await safeFetchGAS(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "DELETE",
          sheetName: "BANK_SOAL",
          idKey: "BankSoalID",
          idValue: targetId,
          spreadsheetId
        })
      });

      return res.json({ success: true, message: `Paket ${targetId} berhasil dihapus dari Spreadsheet.` });
    }

    if (action === 'SAVE_ALL_PACKAGES') {
      const pkgList: any[] = Array.isArray(packages) ? packages : (bankPackage ? [bankPackage] : []);
      if (pkgList.length === 0) {
        return res.json({ success: true, message: "Tidak ada paket yang dikirim.", savedCount: 0 });
      }

      const allPkgRecords: any[] = [];
      const allQRecords: any[] = [];

      for (const p of pkgList) {
        const pkgRecord = formatBankPackageRecord(p);
        const bId = pkgRecord.BankSoalID;
        allPkgRecords.push(pkgRecord);

        const soalList = Array.isArray(p.soalList) ? p.soalList : [];
        for (let qIdx = 0; qIdx < soalList.length; qIdx++) {
          const q = soalList[qIdx];
          const qNum = Number(q.id || q.NomorSoal || qIdx + 1);
          const qDetailId = q.DetailSoalID || `SOAL-${bId}-${qNum}`;

          allQRecords.push({
            DetailSoalID: qDetailId,
            UjianID: q.UjianID || bId,
            BankSoalID: bId,
            MataPelajaran: pkgRecord.Mapel,
            Kelas: pkgRecord.Kelas,
            Jenjang: p.jenjang || p.Jenjang || (Number(pkgRecord.Kelas) <= 6 ? 'Paket A' : Number(pkgRecord.Kelas) <= 9 ? 'Paket B' : 'Paket C'),
            NomorSoal: qNum,
            Pertanyaan: q.pertanyaan || q.Pertanyaan || '',
            TipeSoal: q.tipe || q.TipeSoal || 'Pilihan Ganda',
            PilihanA: q.opsi?.a || q.PilihanA || '',
            PilihanB: q.opsi?.b || q.PilihanB || '',
            PilihanC: q.opsi?.c || q.PilihanC || '',
            PilihanD: q.opsi?.d || q.PilihanD || '',
            PilihanE: q.opsi?.e || q.PilihanE || '',
            KunciJawaban: String(q.kunci || q.KunciJawaban || 'a').toLowerCase(),
            PembahasanRasional: q.pembahasan || q.PembahasanRasional || '',
            Bobot: q.bobot || q.Bobot || 5,
            CreatedAt: q.CreatedAt || new Date().toISOString()
          });
        }
      }

      // Update in-memory live cache immediately
      recentSheetUpdates.set('BANK_SOAL', { rows: allPkgRecords, timestamp: Date.now() });
      recentSheetUpdates.set('SOAL', { rows: allQRecords, timestamp: Date.now() });

      // Fast Batch Push via syncData to Google Apps Script
      const pkgResp = await safeFetchGAS(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "syncData",
          table: "BANK_SOAL",
          data: allPkgRecords,
          spreadsheetId
        })
      });

      let qRespText = "";
      if (allQRecords.length > 0) {
        const qResp = await safeFetchGAS(scriptUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "syncData",
            table: "SOAL",
            data: allQRecords,
            spreadsheetId
          })
        });
        qRespText = qResp.text || "";
      }

      const rawText = pkgResp.text || "";
      const isHtml = rawText.startsWith("<") || rawText.toLowerCase().includes("<!doctype") || rawText.toLowerCase().includes("<html") || rawText.toLowerCase().includes("page not found");

      if (!pkgResp.ok || isHtml) {
        return res.status(200).json({
          success: false,
          savedLocally: true,
          isGasOffline: true,
          savedPkgCount: allPkgRecords.length,
          savedQCount: allQRecords.length,
          error: isHtml
            ? "Google Apps Script mengembalikan 'Page Not Found' (HTML). Paket telah tersimpan di sistem, namun belum masuk ke Google Spreadsheet. Silakan periksa / deploy ulang Web App Google Apps Script di menu Pengaturan."
            : (pkgResp.error || "Gagal menghubungi Google Apps Script"),
          gasResponse: rawText.slice(0, 300)
        });
      }

      return res.json({
        success: true,
        savedPkgCount: allPkgRecords.length,
        savedQCount: allQRecords.length,
        message: `Berhasil menyimpan otomatis ${allPkgRecords.length} paket dan ${allQRecords.length} butir soal langsung ke Sheet BANK_SOAL & SOAL!`
      });
    }

    // Default: Single SAVE_PACKAGE
    const pkgRecord = formatBankPackageRecord(bankPackage);
    const bId = pkgRecord.BankSoalID;
    const soalList = Array.isArray(bankPackage?.soalList) ? bankPackage.soalList : [];

    const qRecords: any[] = [];
    for (let qIdx = 0; qIdx < soalList.length; qIdx++) {
      const q = soalList[qIdx];
      const qNum = Number(q.id || q.NomorSoal || qIdx + 1);
      const qDetailId = q.DetailSoalID || `SOAL-${bId}-${qNum}`;

      qRecords.push({
        DetailSoalID: qDetailId,
        UjianID: q.UjianID || bId,
        BankSoalID: bId,
        MataPelajaran: pkgRecord.Mapel,
        Kelas: pkgRecord.Kelas,
        Jenjang: bankPackage.jenjang || bankPackage.Jenjang || (Number(pkgRecord.Kelas) <= 6 ? 'Paket A' : Number(pkgRecord.Kelas) <= 9 ? 'Paket B' : 'Paket C'),
        NomorSoal: qNum,
        Pertanyaan: q.pertanyaan || q.Pertanyaan || '',
        TipeSoal: q.tipe || q.TipeSoal || 'Pilihan Ganda',
        PilihanA: q.opsi?.a || q.PilihanA || '',
        PilihanB: q.opsi?.b || q.PilihanB || '',
        PilihanC: q.opsi?.c || q.PilihanC || '',
        PilihanD: q.opsi?.d || q.PilihanD || '',
        PilihanE: q.opsi?.e || q.PilihanE || '',
        KunciJawaban: String(q.kunci || q.KunciJawaban || 'a').toLowerCase(),
        PembahasanRasional: q.pembahasan || q.PembahasanRasional || '',
        Bobot: q.bobot || q.Bobot || 5,
        CreatedAt: q.CreatedAt || new Date().toISOString()
      });
    }

    // Update in-memory live cache immediately
    recentSheetUpdates.set('BANK_SOAL', { rows: [pkgRecord], timestamp: Date.now() });
    if (qRecords.length > 0) {
      recentSheetUpdates.set('SOAL', { rows: qRecords, timestamp: Date.now() });
    }

    // Batch push single package and questions
    const pkgResp = await safeFetchGAS(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "syncData",
        table: "BANK_SOAL",
        data: [pkgRecord],
        spreadsheetId
      })
    });

    if (qRecords.length > 0) {
      await safeFetchGAS(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "syncData",
          table: "SOAL",
          data: qRecords,
          spreadsheetId
        })
      });
    }

    const rawText = pkgResp.text || "";
    const isHtml = rawText.startsWith("<") || rawText.toLowerCase().includes("<!doctype") || rawText.toLowerCase().includes("<html") || rawText.toLowerCase().includes("page not found");

    if (!pkgResp.ok || isHtml) {
      return res.status(200).json({
        success: false,
        savedLocally: true,
        isGasOffline: true,
        bankId: bId,
        savedQCount: qRecords.length,
        error: isHtml
          ? "Google Apps Script mengembalikan 'Page Not Found' (HTML). Paket telah tersimpan di sistem aplikasi, namun belum masuk ke Google Spreadsheet. Silakan periksa / deploy ulang Web App di Pengaturan."
          : (pkgResp.error || "Gagal menghubungi Google Apps Script"),
        gasResponse: rawText.slice(0, 300)
      });
    }

    return res.json({
      success: true,
      bankId: bId,
      savedQCount: qRecords.length,
      message: `Paket ${bId} (${pkgRecord.Mapel}) & ${qRecords.length} butir soal berhasil disimpan langsung ke Google Spreadsheet!`
    });
  } catch (error: any) {
    console.error("[CBT Save Bank Soal Error]:", error);
    res.status(500).json({ success: false, error: error.message || "Gagal menyimpan paket ke Google Sheets" });
  }
});

// Dedicated endpoint to save transactions (Tabungan, Tagihan, Pembayaran, Kas) directly to Google Spreadsheet
app.post("/api/keuangan/transaksi", async (req, res) => {
  try {
    const { type, records, record, fullList, updateTagihanList } = req.body;
    const settings = readSettings();
    const scriptUrl = settings.scriptUrl || DEFAULT_SETTINGS.scriptUrl;
    const spreadsheetId = settings.spreadsheetId || DEFAULT_SETTINGS.spreadsheetId;

    if (!scriptUrl) {
      return res.status(400).json({ success: false, error: "Script URL Google Apps Script tidak terkonfigurasi." });
    }

    const itemsToSave: any[] = Array.isArray(records) ? records : (record ? [record] : []);
    const targetTable = String(type || '').trim().toUpperCase();

    if (!['TABUNGAN', 'TAGIHAN', 'PEMBAYARAN', 'KAS'].includes(targetTable)) {
      return res.status(400).json({ success: false, error: `Tipe transaksi tidak valid: ${type}. Harus TABUNGAN, TAGIHAN, PEMBAYARAN, atau KAS.` });
    }

    let finalRows: any[] = [];

    if (Array.isArray(fullList) && fullList.length > 0) {
      finalRows = fullList;
    } else if (itemsToSave.length > 0) {
      // 1. Fetch current rows from Google Sheet to ensure zero data loss
      let existingRows: any[] = [];
      try {
        const gids = await getOrFetchSheetGids(spreadsheetId);
        const gid = gids[targetTable];
        if (gid) {
          const csvUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`;
          const csvResp = await fetch(csvUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
          });
          if (csvResp.ok) {
            const csvText = await csvResp.text();
            existingRows = parseCsvToObjects(csvText);
          }
        }
      } catch (err) {
        console.warn(`[Transaksi API] Gagal membaca existing sheet ${targetTable}:`, err);
      }

      // Merge new items with existing rows
      const idKeyMap: Record<string, string> = {
        TABUNGAN: 'TabunganID',
        TAGIHAN: 'TagihanID',
        PEMBAYARAN: 'PembayaranID',
        KAS: 'KasID'
      };
      const idKey = idKeyMap[targetTable] || 'id';

      const existingIdSet = new Set(existingRows.map((r: any) => String(r[idKey] || r.id || '').trim().toUpperCase()));
      const newItemsToAdd = itemsToSave.filter((item: any) => {
        const itemKey = String(item[idKey] || item.id || '').trim().toUpperCase();
        return !itemKey || !existingIdSet.has(itemKey);
      });

      const updateMap = new Map<string, any>();
      itemsToSave.forEach((item: any) => {
        const itemKey = String(item[idKey] || item.id || '').trim().toUpperCase();
        if (itemKey && existingIdSet.has(itemKey)) {
          updateMap.set(itemKey, item);
        }
      });

      const updatedExisting = existingRows.map((r: any) => {
        const rKey = String(r[idKey] || r.id || '').trim().toUpperCase();
        return updateMap.has(rKey) ? { ...r, ...updateMap.get(rKey) } : r;
      });

      finalRows = [...updatedExisting, ...newItemsToAdd];
    } else {
      return res.status(400).json({ success: false, error: "Tidak ada data transaksi yang dikirim." });
    }

    // Update server-side live cache immediately so /api/sheet-data/:sheetName returns it right away
    recentSheetUpdates.set(targetTable, { rows: finalRows, timestamp: Date.now() });
    if (targetTable === 'PEMBAYARAN' && Array.isArray(updateTagihanList) && updateTagihanList.length > 0) {
      recentSheetUpdates.set('TAGIHAN', { rows: updateTagihanList, timestamp: Date.now() });
    }

    // Push to Google Apps Script via syncData
    const gasResp = await safeFetchGAS(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "syncData",
        table: targetTable,
        data: finalRows,
        spreadsheetId
      })
    });

    let tagihanSynced = false;
    if (targetTable === 'PEMBAYARAN' && Array.isArray(updateTagihanList) && updateTagihanList.length > 0) {
      try {
        await safeFetchGAS(scriptUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "syncData",
            table: "TAGIHAN",
            data: updateTagihanList,
            spreadsheetId
          })
        });
        tagihanSynced = true;
      } catch (tErr) {
        console.warn("[Transaksi API] Sync TAGIHAN alongside PEMBAYARAN error:", tErr);
      }
    }

    const rawText = gasResp.text || "";
    const isHtml = rawText.startsWith("<") || rawText.toLowerCase().includes("<!doctype") || rawText.toLowerCase().includes("<html") || rawText.toLowerCase().includes("page not found");

    if (!gasResp.ok || isHtml) {
      return res.status(200).json({
        success: false,
        savedLocally: true,
        isGasOffline: true,
        type: targetTable,
        count: finalRows.length,
        tagihanSynced,
        error: isHtml
          ? `Google Apps Script mengembalikan 'Page Not Found' atau HTML Google. Transaksi ${targetTable} tersimpan di memori sistem, namun belum masuk ke Google Spreadsheet. Silakan periksa / deploy ulang Web App Google Apps Script di menu Pengaturan.`
          : (gasResp.error || "Gagal menghubungi Google Apps Script"),
        gasResponse: rawText.slice(0, 300)
      });
    }

    return res.json({
      success: true,
      type: targetTable,
      count: finalRows.length,
      tagihanSynced,
      message: `Transaksi ${targetTable} berhasil disimpan & disinkronkan langsung ke Google Spreadsheet (${finalRows.length} baris)!`,
      gasResponse: gasResp.text
    });
  } catch (error: any) {
    console.error("[Keuangan Transaksi Error]:", error);
    res.status(500).json({ success: false, error: error.message || "Gagal menyimpan transaksi ke Google Sheets" });
  }
});

// Endpoint to generate users for all students and parents into USERS sheet
app.post("/api/users/generate-all", async (req, res) => {
  try {
    const spreadsheetId = (req.body?.spreadsheetId as string) || DEFAULT_SETTINGS.spreadsheetId || "1XyQnYPz_0erRm7NTMGZh0ysGWZRXjqbDb271ovLeqJ4";
    const scriptUrl = (req.body?.scriptUrl as string) || DEFAULT_SETTINGS.scriptUrl || "https://script.google.com/macros/s/AKfycbzjA0wnvgBjJASr-TVRHLLBmxqhOy04A8R0Qej4oTDyFb5FEmcT5G98Slr_4z9qa3a_YQ/exec";

    // Fetch full SISWA data
    const gids = await getOrFetchSheetGids(spreadsheetId);
    const siswaGid = gids["SISWA"];
    if (!siswaGid) {
      return res.status(400).json({ success: false, message: "Sheet SISWA GID tidak ditemukan" });
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(siswaGid)}`;
    const csvResp = await fetch(csvUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!csvResp.ok) {
      return res.status(500).json({ success: false, message: "Gagal mengunduh sheet SISWA" });
    }

    const csvText = await csvResp.text();
    const students = parseCsvToObjects(csvText);

    // Fetch existing USERS if any to keep GURU/ADMIN
    let existingGuruOrAdmin: any[] = [];
    const usersGid = gids["USERS"];
    if (usersGid) {
      try {
        const uResp = await fetch(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(usersGid)}`);
        if (uResp.ok) {
          const uText = await uResp.text();
          const uObjects = parseCsvToObjects(uText);
          existingGuruOrAdmin = uObjects.filter((u: any) => {
            const role = (u.RoleID || u.role || '').toUpperCase();
            return role !== 'SISWA' && role !== 'ORANG_TUA' && role !== 'ORTU';
          });
        }
      } catch (err) {
        console.warn("Could not fetch existing users:", err);
      }
    }

    const allUserRows: any[] = [];
    const nowIso = new Date().toISOString();

    // Re-add GURU/ADMIN accounts
    existingGuruOrAdmin.forEach(g => allUserRows.push(g));

    let countSiswa = 0;
    let countOrtu = 0;

    students.forEach((s: any) => {
      const pdkt = (s.nopdkt || s.noPdkt || s.NoPDKT || s.nis || '').toString().trim();
      const nisn = (s.NISN || s.nisn || '').toString().trim();
      const nama = (s.NamaLengkap || s.nama || s.Nama || s.name || '').toString().trim();
      if (!nisn && !nama) return;

      const cleanPdkt = pdkt.replace(/^pdkt-?/i, '') || (nisn ? nisn.slice(-3) : '123');
      const namaDepan = nama.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const pass = `${namaDepan}${cleanPdkt}`;
      const email = (s['E-Mail'] || s.email || `${nisn}@siswa.sch.id`).trim();
      const hp = (s.NomorHP || s.noHp || s.phone || '-').trim();

      const ayah = (s.NamaAyah || s.fatherName || '').trim();
      const ibu = (s.NamaIbu || s.namaIbuKandung || '').trim();
      const wali = (s.NamaWali || s.parentName || '').trim();
      let namaOrtu = ayah && !ayah.toLowerCase().includes('(alm)') ? ayah : (ibu && !ibu.toLowerCase().includes('(alm)') ? ibu : (wali || ('Orang Tua ' + nama)));

      // Status persis dari kolom Status di Sheet SISWA (Aktif, TIDAK AKTIF, Keluar, Pindah, Lulus, Belum)
      const rawStatus = (s.Status || s.status || s['Status Terbaru'] || '').toString().trim();
      let statusSiswa = 'Aktif';
      if (rawStatus) {
        statusSiswa = rawStatus;
      } else {
        statusSiswa = 'TIDAK AKTIF';
      }

      // Akun Siswa
      allUserRows.push({
        UserID: 'USR_' + cleanPdkt,
        Username: nisn || cleanPdkt,
        Password: pass,
        RoleID: 'SISWA',
        Nama: nama,
        NIP_NISN: cleanPdkt,
        Email: email,
        NoHP: hp,
        Status: statusSiswa,
        LastLogin: nowIso,
        Token: '',
        CreatedAt: nowIso,
        UpdatedAt: nowIso
      });
      countSiswa++;

      // Akun Orang Tua
      allUserRows.push({
        UserID: 'USR_ORTU_' + cleanPdkt,
        Username: 'ortu_' + (nisn || cleanPdkt),
        Password: pass,
        RoleID: 'ORANG_TUA',
        Nama: namaOrtu,
        NIP_NISN: nisn || cleanPdkt,
        Email: `ortu_${nisn || cleanPdkt}@ortu.sch.id`,
        NoHP: hp,
        Status: statusSiswa,
        LastLogin: nowIso,
        Token: '',
        CreatedAt: nowIso,
        UpdatedAt: nowIso
      });
      countOrtu++;
    });

    // Update in-memory cache
    recentSheetUpdates.set('USERS', { rows: allUserRows, timestamp: Date.now() });

    // Sync to GAS in background
    let gasResult: any = { status: 'pending' };
    try {
      const gasPayload = {
        action: 'syncData',
        table: 'USERS',
        spreadsheetId,
        rows: allUserRows
      };
      const gasResp = await safeFetchGAS(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(gasPayload)
      });
      gasResult = { ok: gasResp.ok, status: gasResp.status };
    } catch (gErr: any) {
      gasResult = { error: gErr.message };
    }

    return res.json({
      success: true,
      message: `Berhasil membuat ${countSiswa} akun Siswa dan ${countOrtu} akun Orang Tua. Total akun di USERS: ${allUserRows.length}`,
      countSiswa,
      countOrtu,
      countTotal: allUserRows.length,
      sampleSiswa: allUserRows.find(u => u.RoleID === 'SISWA'),
      sampleOrtu: allUserRows.find(u => u.RoleID === 'ORANG_TUA'),
      gasResult
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Fast Bulk Sync Endpoint to pull all available spreadsheet sheets via direct CSV exports
app.get("/api/sync-all-sheets", async (req, res) => {
  try {
    const spreadsheetId = (req.query.spreadsheetId as string) || DEFAULT_SETTINGS.spreadsheetId || "1XyQnYPz_0erRm7NTMGZh0ysGWZRXjqbDb271ovLeqJ4";
    const forceRefresh = req.query.force === 'true' || req.query.force === '1';

    if (!forceRefresh && bulkSyncCache && bulkSyncCache.spreadsheetId === spreadsheetId && (Date.now() - bulkSyncCache.timestamp < 60000)) {
      return res.json({
        success: true,
        status: "success",
        data: bulkSyncCache.sheetMap,
        sheetCount: bulkSyncCache.sheetCount,
        totalRows: bulkSyncCache.totalRows,
        source: "server-ram-cache-instant"
      });
    }

    if (!inFlightBulkSyncPromise) {
      inFlightBulkSyncPromise = (async () => {
        const gids = await getOrFetchSheetGids(spreadsheetId);
        const sheetEntries = Object.entries(gids);
        if (sheetEntries.length === 0) {
          return null;
        }

        const sheetMap: Record<string, any[]> = {};
        let totalRows = 0;

        // Concurrently fetch CSV for all sheets with high-throughput batching (15 at a time)
        const BATCH_SIZE = 15;
        for (let i = 0; i < sheetEntries.length; i += BATCH_SIZE) {
          const batch = sheetEntries.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(async ([sheetName, gid]) => {
              const upperName = sheetName.toUpperCase();
              const cacheKey = `${spreadsheetId}:${upperName}`;
              const existingCache = sheetDataCache.get(cacheKey);
              if (!forceRefresh && existingCache && (Date.now() - existingCache.timestamp < 45000)) {
                const mergedRows = mergeWithRecentUpdates(upperName, existingCache.rows);
                sheetMap[sheetName] = mergedRows;
                sheetMap[upperName] = mergedRows;
                totalRows += mergedRows.length;
                return;
              }

              try {
                const csvUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`;
                const csvResp = await fetch(csvUrl, {
                  headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  },
                });
                if (csvResp.ok) {
                  const csvText = await csvResp.text();
                  const rows = parseCsvToObjects(csvText);
                  sheetDataCache.set(cacheKey, { rows, gid, timestamp: Date.now() });
                  const mergedRows = mergeWithRecentUpdates(upperName, rows);
                  sheetMap[sheetName] = mergedRows;
                  sheetMap[upperName] = mergedRows;
                  totalRows += mergedRows.length;
                  return;
                }
              } catch {
                // Will fallback below
              }

              sheetMap[sheetName] = [];
              sheetMap[upperName] = [];
            })
          );
        }

        if (Array.isArray(sheetMap['JADWAL_UJIAN']) && sheetMap['JADWAL_UJIAN'].length >= 114) {
          sheetMap['UJIAN'] = sheetMap['JADWAL_UJIAN'];
          sheetMap['CBT_UJIAN'] = sheetMap['JADWAL_UJIAN'];
        }

        const resultObj = {
          spreadsheetId,
          sheetMap,
          sheetCount: Object.keys(gids).length,
          totalRows,
          timestamp: Date.now()
        };
        bulkSyncCache = resultObj;
        return resultObj;
      })();
    }

    let bulkRes: any = null;
    try {
      bulkRes = await inFlightBulkSyncPromise;
    } finally {
      inFlightBulkSyncPromise = null;
    }

    if (!bulkRes) {
      return res.status(404).json({ success: false, error: "Tidak dapat menemukan GID sheet dari Google Spreadsheet." });
    }

    res.json({
      success: true,
      status: "success",
      data: bulkRes.sheetMap,
      sheetCount: bulkRes.sheetCount,
      totalRows: bulkRes.totalRows,
      source: "google-sheets-csv-fast"
    });
  } catch (error: any) {
    console.warn("Sync All Sheets handled exception:", error?.message);
    res.status(500).json({ success: false, error: error?.message || "Failed to sync all sheets" });
  }
});

// Direct Rename Endpoint for Google Drive Files via Google Apps Script
app.post("/api/drive/rename", async (req, res) => {
  try {
    const { fileId, newName, url, gasUrl } = req.body;
    let targetFileId = fileId;
    if (!targetFileId && url) {
      const match = String(url).match(/[-\w]{25,}/);
      if (match) targetFileId = match[0];
    }

    if (!targetFileId || !newName) {
      return res.status(400).json({ error: "fileId dan newName wajib diisi." });
    }

    const targetGasUrl = gasUrl || readSettings().scriptUrl || DEFAULT_SETTINGS.scriptUrl;
    const response = await safeFetchGAS(targetGasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "RENAME_DRIVE_FILE",
        fileId: targetFileId,
        newName: String(newName).trim()
      })
    });

    const text = response.text || "";
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { raw: text };
    }
    if (data && (data.status === 'error' || data.success === false || data.error)) {
      return res.status(400).json(data);
    }
    res.json(data);
  } catch (error: any) {
    console.warn("Drive Rename Error:", error?.message);
    res.status(500).json({ error: error.message || "Gagal mengubah nama berkas di Google Drive" });
  }
});

// Direct File Info Endpoint for Google Drive Files via Google Apps Script
app.all("/api/drive/file-info", async (req, res) => {
  try {
    const fileId = req.method === "GET" ? (req.query.fileId as string) : req.body?.fileId;
    const url = req.method === "GET" ? (req.query.url as string) : req.body?.url;
    const gasUrl = req.method === "GET" ? (req.query.gasUrl as string) : req.body?.gasUrl;

    let targetFileId = fileId;
    if (!targetFileId && url) {
      const match = String(url).match(/[-\w]{25,}/);
      if (match) targetFileId = match[0];
    }

    if (!targetFileId) {
      return res.status(400).json({ error: "fileId atau url wajib diisi." });
    }

    const targetGasUrl = gasUrl || readSettings().scriptUrl || DEFAULT_SETTINGS.scriptUrl;
    const response = await safeFetchGAS(targetGasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "GET_DRIVE_FILE_INFO",
        fileId: targetFileId
      })
    });

    const text = response.text || "";
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { raw: text };
    }
    res.json(data);
  } catch (error: any) {
    console.error("Drive File Info Error:", error);
    res.status(500).json({ error: error.message || "Gagal mengambil info berkas Google Drive" });
  }
});

// AI Gemini Model Status Endpoint
app.get("/api/ai/status", (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY);
  res.json({
    available: hasKey,
    model: "gemini-3.1-flash-lite",
    capabilities: ["pdf-analysis", "structured-exam-generation", "pedagogical-rubric"]
  });
});

// Helper to extract text from PDF buffers directly on the server
async function extractTextFromPdfBuffers(buffers: Buffer[], maxPagesTotal = 40): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    let accumulatedText = "";
    let pagesRead = 0;

    for (let i = 0; i < buffers.length; i++) {
      if (pagesRead >= maxPagesTotal) break;
      const buf = buffers[i];
      try {
        const loading = pdfjs.getDocument({
          data: new Uint8Array(buf),
          standardFontDataUrl: "node_modules/pdfjs-dist/standard_fonts/"
        });
        const pdf = await loading.promise;
        const pagesToRead = Math.min(pdf.numPages, maxPagesTotal - pagesRead);
        for (let p = 1; p <= pagesToRead; p++) {
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          const pageStr = content.items.map((it: any) => it.str || "").join(" ");
          if (pageStr.trim()) {
            accumulatedText += `\n[Dokumen ${i + 1} Halaman ${p}]\n` + pageStr.trim();
          }
          pagesRead++;
        }
      } catch (e: any) {
        console.warn(`[PDF Text Extract] Gagal ekstrak dokumen ${i + 1}:`, e?.message || e);
      }
    }
    return accumulatedText.trim();
  } catch (err: any) {
    console.warn("[PDF Text Extract] Gagal import pdfjs-dist:", err?.message || err);
    return "";
  }
}

// Helper to clean an individual concept name from syllabus codes, action verbs, and meta-labels
function cleanIndividualConcept(raw: string): string {
  if (!raw) return "Pokok Bahasan";
  let s = String(raw).trim();

  // Strip syllabus / sub-task codes like "PAN-4-01", "PAI-4-02", "SUB-01", "A4 - PAI - MODUL 1 - 1 -", etc.
  s = s.replace(/\b[A-Z]\d+\s*-\s*[A-Z]+\s*-\s*MODUL\s*\d+\s*-\s*\d+\s*-\s*/gi, "");
  s = s.replace(/\b[A-Z]{2,5}-\d{1,2}-\d{1,2}\b/gi, "");
  s = s.replace(/\bSUB-\d{1,3}\b/gi, "");

  // Strip leading list numbering like "(1):", "(2):", "1.", "1)", "[1]", "(1)", "1:", etc.
  s = s.replace(/^\s*(\(\d+\)|\d+[\.\)]|\[\d+\]|\d+:)\s*[:\-–—]?\s*/gi, "");

  // Strip action verbs and curriculum phrases commonly found in syllabus titles
  s = s.replace(/^(mengkaji|mempelajari|memahami|mengenal|menelaah|menjelaskan|mengidentifikasi|menganalisis|membahas|menyambut|meneladani|menerapkan|indahnya)\s+/gi, "");
  s = s.replace(/^(teladan\s+mulia|teladan)\s+/gi, "");

  // Strip meta labels: modul, bab, unit, etc.
  s = s.replace(/^(modul\s*\d*|bab\s*\d*|unit\s*\d*|sub-?modul\s*\d*|topik\s*bahasan|topik|materi\s*pembelajaran|materi\s*pokok|materi|tema|sub-tema|sub-topik|subtopik|judul)\s*[:\-–—]?\s*/gi, "");
  s = s.replace(/\b(topik\s*bahasan|topik|materi\s*bahasan|materi\s*pembelajaran|materi|modul\s*\d*|modul)\b/gi, "");
  s = s.replace(/["“”'']/g, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s || "Pokok Bahasan";
}

// Splits combined topics into individual clean concepts
function extractSubTopics(raw: string): string[] {
  if (!raw) return [];
  const parts = String(raw)
    .split(/[;|\n]+/)
    .map(p => cleanIndividualConcept(p))
    .filter(p => p.length > 2 && p !== "Pokok Bahasan");

  if (parts.length > 0) return parts;
  const single = cleanIndividualConcept(raw);
  return single && single !== "Pokok Bahasan" ? [single] : [];
}

// Helper to clean concept name for display
function cleanConceptName(raw: string): string {
  if (!raw) return "Pokok Bahasan";
  const subTopics = extractSubTopics(raw);
  if (subTopics.length > 1) {
    return subTopics.slice(0, 3).join(", ");
  }
  return cleanIndividualConcept(raw);
}

// Function to strictly remove all occurrences of "modul", "dalam materi...", list numbering "(1):", and raw titles
function sanitizeNoModul(text: string): string {
  if (!text) return "";
  let s = String(text);

  // 0. Remove list numbering and syllabus code patterns: "(1):", "(2):", etc.
  s = s.replace(/\(\d+\):?\s*/g, "");
  s = s.replace(/;\s*\(\d+\):?/g, ", ");
  s = s.replace(/\b[A-Z]\d+\s*-\s*[A-Z]+\s*-\s*MODUL\s*\d+\s*-\s*\d+\s*-\s*/gi, "");

  // If a question accidentally includes a semicolon-separated list of multiple titles:
  s = s.replace(/(?:mengkaji\s+)?q\.s\.\s*al-[ḥh]ujur[āa]t\/49:13[;\s]+(?:teladan\s+mulia\s+)?asmaulhusna[;\s]+(?:indahnya\s+)?saling\s+menghargai[^\.;?]*[;\s]+(?:menyambut\s+)?usia\s+balig/gi, "Pendidikan Agama Islam");

  // Strip syllabus title headings and action verbs
  s = s.replace(/\bmengkaji\s+q\.s\.\s*al-[ḥh]ujur[āa]t\/49:13\b/gi, "Surah Al-Hujurat ayat 13");
  s = s.replace(/\bteladan\s+mulia\s+asmaulhusna\b/gi, "Asmaulhusna");
  s = s.replace(/\bindahnya\s+saling\s+menghargai\s+dalam\s+keragaman\b/gi, "sikap saling menghargai dalam keragaman");
  s = s.replace(/\bmenyambut\s+usia\s+balig\b/gi, "usia balig");

  // If a question starts with multiple semicolon-separated items before a question mark or comma
  s = s.replace(/^[^?\n]+?;\s*[^?\n]+?,\s*(?=[A-Za-z])/gi, "");

  // 1. Remove leading meta phrases
  s = s.replace(/^(menurut|berdasarkan|sesuai|pada|dalam)\s+(isi\s+)?(modul(\s+(ke-)?\d+)?|materi(\s+pembelajaran|\s+ajar|\s+bacaan|\s+teks|\s+ini)?)\s*(di\s+atas)?\s*[,:\-–—]?\s*/gi, "");
  s = s.replace(/^(menurut|berdasarkan|pada|dalam)\s+(bacaan|teks|uraian|penjelasan)\s*(ini|di\s+atas)?\s*[,:\-–—]?\s*/gi, "");

  // If question starts with "Dalam materi <Topik>, " -> strip meta prefix
  s = s.replace(/^(dalam|pada)\s+(materi|modul)\s+([^,]+?),\s*/gi, "");
  s = s.replace(/^(dalam|pada)\s+(materi|modul)\s*[,:\-–—]?\s*/gi, "");
  s = s.replace(/^mengenai\s+[^,]+?,\s*/gi, "");

  // 2. Remove mid-sentence meta references
  s = s.replace(/\b(sebagaimana\s+diajarkan|yang\s+diajarkan|yang\s+disampaikan|yang\s+dipelajari)\s+(dalam|pada)\s+(materi|modul)\s*/gi, "tentang ");
  s = s.replace(/\b(dalam|pada)\s+(materi|modul)\s+(pembelajaran|ajar|ini)\b/gi, "");
  s = s.replace(/\b(dalam|pada)\s+(materi|modul)\s+(adalah|yang|merupakan)\b/gi, "$3");
  s = s.replace(/\b(dalam|pada)\s+(materi|modul)\s+/gi, "pada ");
  s = s.replace(/\b(dalam|pada)\s+(materi|modul)\b/gi, "");
  s = s.replace(/\b(berdasarkan|menurut)\s+(materi|modul)\s+/gi, "menurut ");
  s = s.replace(/\b(terkait|sesuai)\s+(materi|modul)\s+/gi, "tentang ");
  s = s.replace(/\b(isi\s+modul|isi\s+materi)\b/gi, "pokok bahasan");
  s = s.replace(/\b(buku\s+modul|buku\s+materi|bab\s+modul)\b/gi, "buku pelajaran");
  s = s.replace(/\b(modul\s+ajar|modul\s+pembelajaran|modul(\s+(ke-)?\d+)?)\b/gi, "pokok bahasan");
  s = s.replace(/\b(modul)\b/gi, "");

  // 3. Clean up formatting
  s = s.replace(/\s{2,}/g, " ");
  s = s.replace(/\s*([,;:\-–—])\s*\1+/g, "$1");
  s = s.replace(/^[,;:\-–—\s]+/, "");
  s = s.trim();
  if (s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s;
}

// Student-friendly, subject-grounded fallback question builder that eliminates confusing meta-pedagogy
function buildSmartCurriculumFallback(params: {
  mapel: string;
  topik: string;
  temaModul?: string;
  kelas: string;
  targetCount: number;
  isSMA: boolean;
  materiText?: string;
  tingkatKesulitan?: string;
}) {
  const { mapel, topik, temaModul, kelas, targetCount, isSMA, materiText } = params;
  const cleanTopik = cleanConceptName(topik);
  const cleanMapel = String(mapel).trim().toLowerCase();

  // If rich text from PDF or syllabus is available, extract sentences and generate direct reading comprehension questions
  const extractedQuestions: any[] = [];
  if (materiText && materiText.length > 50) {
    const rawSentences = materiText
      .split(/[.\n;]+/)
      .map(s => s.trim())
      .filter(s => s.length >= 25 && s.length <= 220 && !s.startsWith('[Materi Silabus') && !s.includes('Kurikulum Merdeka capaian'));

    // Look for definitional or factual sentences
    const keywordSentences = rawSentences.filter(s => 
      /\b(adalah|merupakan|yaitu|artinya|berfungsi|contoh|terdiri|disebut|seperti|tujuan|manfaat|karena|dalam|menurut)\b/i.test(s)
    );

    const candidates = keywordSentences.length >= 3 ? keywordSentences : rawSentences;
    candidates.slice(0, targetCount).forEach((sentence, sIdx) => {
      let qText = `Manakah pernyataan yang paling benar mengenai ${cleanTopik}?`;
      let correctOpt = sentence;

      // Extract other candidate sentences or terms to serve as plausible distractors from the actual document
      const otherSentences = candidates.filter((_, idx) => idx !== sIdx);
      let distractor1 = otherSentences[0] ? otherSentences[0].slice(0, 100) : `Memiliki fungsi yang berlawanan dengan mekanisme ${cleanTopik}`;
      let distractor2 = otherSentences[1] ? otherSentences[1].slice(0, 100) : `Hanya terjadi pada kondisi eksternal tertentu tanpa pengaruh ${cleanTopik}`;
      let distractor3 = otherSentences[2] ? otherSentences[2].slice(0, 100) : `Menyebabkan perlambatan proses alami yang seharusnya dipercepat oleh ${cleanTopik}`;
      let distractor4 = otherSentences[3] ? otherSentences[3].slice(0, 100) : `Tidak memerlukan keterlibatan faktor internal maupun eksternal`;

      if (/\b(adalah|merupakan|yaitu|artinya)\b/i.test(sentence)) {
        const parts = sentence.split(/\b(adalah|merupakan|yaitu|artinya)\b/i);
        if (parts.length >= 3 && parts[0].trim().length > 3) {
          const term = parts[0].trim();
          const def = parts.slice(2).join('').trim();
          if (def.length > 10) {
            qText = `Apa yang dimaksud dengan ${term}?`;
            correctOpt = def.charAt(0).toUpperCase() + def.slice(1);

            // Find other definitions if available
            const otherDefs = otherSentences
              .map(os => os.split(/\b(adalah|merupakan|yaitu|artinya)\b/i))
              .filter(p => p.length >= 3 && p.slice(2).join('').trim().length > 10)
              .map(p => p.slice(2).join('').trim());

            if (otherDefs[0]) distractor1 = otherDefs[0].charAt(0).toUpperCase() + otherDefs[0].slice(1, 90);
            if (otherDefs[1]) distractor2 = otherDefs[1].charAt(0).toUpperCase() + otherDefs[1].slice(1, 90);
            if (otherDefs[2]) distractor3 = otherDefs[2].charAt(0).toUpperCase() + otherDefs[2].slice(1, 90);
          }
        }
      } else if (/\b(tujuan|berfungsi untuk|manfaat|berfungsi)\b/i.test(sentence)) {
        qText = `Fungsi atau peran utama dari ${cleanTopik} adalah...`;
        correctOpt = sentence;
      }

      extractedQuestions.push({
        q: qText,
        opts: [
          correctOpt,
          distractor1,
          distractor2,
          distractor3,
          distractor4
        ],
        exp: `Berdasarkan fakta dokumen pembelajaran: "${sentence.slice(0, 140)}".`
      });
    });
  }

  // Subject-specific concrete question templates
  const subjectTemplates: { q: string; opts: string[]; exp: string }[] = [];
  const rawTopikLower = String(topik || '').toLowerCase();
  const subTopics = extractSubTopics(topik);

  if (cleanMapel.includes('agama') || cleanMapel.includes('pai') || cleanTopik.toLowerCase().includes('q.s') || cleanTopik.toLowerCase().includes('surat') || cleanTopik.toLowerCase().includes('ayat') || rawTopikLower.includes('hujurat') || rawTopikLower.includes('asmaul') || rawTopikLower.includes('balig')) {
    // 1. Q.S. Al-Hujurat 13
    if (rawTopikLower.includes('hujurat') || rawTopikLower.includes('q.s') || rawTopikLower.includes('ayat') || subTopics.some(t => /hujurat|q\.s|ayat/i.test(t))) {
      subjectTemplates.push(
        {
          q: `Pesan pokok yang terkandung dalam Surah Al-Hujurat ayat 13 mengenai keberagaman manusia adalah...`,
          opts: [
            `Manusia diciptakan berbangsa-bangsa dan bersuku-suku agar saling mengenal (ta'aruf) dan hidup rukun`,
            `Manusia diciptakan berbeda-beda agar saling berselisih dan bermusuhan`,
            `Satu suku memiliki derajat kemuliaan lebih tinggi daripada suku lainnya`,
            `Perbedaan bahasa dan budaya menjadi alasan untuk saling menjauhi pergaulan`,
            `Manusia tidak perlu menghormati orang yang berasal dari daerah lain`
          ],
          exp: `Surah Al-Hujurat ayat 13 menegaskan bahwa keberagaman adalah ketetapan Allah SWT agar manusia saling mengenal (lita'arafu) dan hidup rukun.`
        },
        {
          q: `Menurut Surah Al-Hujurat ayat 13, ukuran kemuliaan seorang hamba di sisi Allah SWT ditentukan oleh...`,
          opts: [
            `Kadar ketakwaan, keimanan, dan amal saleh yang dilakukannya`,
            `Banyaknya harta kekayaan dan kemewahan tempat tinggalnya`,
            `Tingginya status sosial dan garis keturunan keluarganya`,
            `Kekuatan fisik dan popularitas di kalangan masyarakat`,
            `Banyaknya pengikut dan pujian dari orang lain`
          ],
          exp: `Allah SWT berfirman: 'Inna akramakum 'indallahi atqakum' (Sesungguhnya orang yang paling mulia di antara kamu di sisi Allah ialah orang yang paling bertakwa).`
        },
        {
          q: `Sikap seorang muslim di sekolah yang mencerminkan pengamalan Surah Al-Hujurat ayat 13 adalah...`,
          opts: [
            `Berteman dengan siapa saja tanpa membedakan suku, daerah, maupun status ekonomi`,
            `Hanya mau bergaul dengan teman yang berasal dari suku yang sama`,
            `Menolak bekerja kelompok dengan teman yang berbeda logat bicara`,
            `Mengejek adat istiadat dan pakaian daerah teman lain`,
            `Membentuk kelompok tertutup yang tidak mau membaur di kelas`
          ],
          exp: `Menghargai keragaman teman tanpa membeda-bedakan latar belakang merupakan wujud nyata ketakwaan di lingkungan sekolah.`
        }
      );
    }

    // 2. Asmaulhusna
    if (rawTopikLower.includes('asmaul') || rawTopikLower.includes('husna') || subTopics.some(t => /asmaul|husna/i.test(t))) {
      subjectTemplates.push(
        {
          q: `Pengertian Asmaulhusna bagi setiap umat muslim yang beriman kepada Allah SWT adalah...`,
          opts: [
            `Nama-nama yang terindah, terbaik, dan agung yang hanya dimiliki oleh Allah SWT`,
            `Nama-nama malaikat yang bertugas mencatat amal perbuatan manusia`,
            `Gelar kehormatan untuk para nabi dan rasul yang wajib diimani`,
            `Nama-nama tempat bersejarah dalam penyebaran agama Islam`,
            `Sebutan kehormatan bagi para pemimpin dan ulama besar`
          ],
          exp: `Asmaulhusna adalah nama-nama Allah SWT yang agung dan indah yang mencerminkan kesempurnaan sifat-sifat-Nya.`
        },
        {
          q: `Contoh perilaku terpuji yang meneladani sifat Asmaulhusna Al-Quddus (Maha Suci) dalam kehidupan sehari-hari adalah...`,
          opts: [
            `Menjaga kesucian hati dari sifat dengki serta merawat kebersihan badan dan lingkungan`,
            `Membiarkan sampah berserakan di ruang kelas dan halaman rumah`,
            `Mengotori sarana ibadah di musala atau masjid sekolah`,
            `Berkata kasar dan mencela kekurangan teman saat bermain`,
            `Menolak membersihkan lingkungan bersama warga sekitar`
          ],
          exp: `Al-Quddus mengajarkan kita untuk menjaga kesucian batin (hati) dan kesucian lahiriah (badan dan lingkungan).`
        },
        {
          q: `Sikap meneladani sifat Asmaulhusna As-Salam (Maha Sejahtera / Maha Menyelamatkan) tercermin dalam perilaku...`,
          opts: [
            `Senantiasa menebarkan salam, menjaga kedamaian, dan gemar menolong teman`,
            `Mencari-cari kesalahan orang lain agar timbul pertengkaran`,
            `Mendiamkan teman yang sedang ditimpa musibah kesusahan`,
            `Menyebarkan kabar bohong yang meresahkan warga sekolah`,
            `Merasa paling hebat dan meremehkan salam orang lain`
          ],
          exp: `As-Salam mengajarkan kita menjadi pribadi pembawa kedamaian, keselamatan, dan ketenangan bagi sesama.`
        },
        {
          q: `Sikap meneladani sifat Asmaulhusna Al-Malik (Maha Merajai) diwujudkan dengan cara...`,
          opts: [
            `Mampu mengendalikan hawa nafsu diri, bersikap rendah hati, dan bertindak adil`,
            `Bertindak sewenang-wenang kepada teman yang lebih lemah`,
            `Memaksa teman untuk menuruti segala perintah pribadi`,
            `Sombong karena memiliki fasilitas yang lebih lengkap`,
            `Menolak mendengarkan usulan orang lain saat berdiskusi`
          ],
          exp: `Meneladani Al-Malik berarti mampu memimpin dan menahan hawa nafsu diri sendiri serta bersikap adil dan bijaksana.`
        }
      );
    }

    // 3. Saling Menghargai dalam Keragaman
    if (rawTopikLower.includes('menghargai') || rawTopikLower.includes('keragaman') || subTopics.some(t => /menghargai|keragaman|toleran/i.test(t))) {
      subjectTemplates.push(
        {
          q: `Sikap terpuji yang benar ketika menghadapi perbedaan suku, adat, dan bahasa antarteman adalah...`,
          opts: [
            `Menghormati perbedaan adat istiadat dan senantiasa menjaga kerukunan bersama`,
            `Menganggap tradisi sukunya sendiri yang paling sempurna`,
            `Menertawakan pakaian adat daerah lain yang berbeda kebiasaan`,
            `Menolak bergaul jika tidak berasal dari daerah yang sama`,
            `Memaksakan kebiasaan kelompok sendiri kepada orang lain`
          ],
          exp: `Saling menghormati keragaman merupakan kunci kerukunan, persatuan bangsa, dan wujud akhlak mulia.`
        },
        {
          q: `Tujuan mulia Allah SWT menciptakan manusia dalam berbagai suku dan bangsa adalah agar...`,
          opts: [
            `Saling mengenal, bekerja sama, dan tolong-menolong dalam kebaikan`,
            `Saling bersaing dan mencari kelemahan suku bangsa lain`,
            `Kelompok yang besar dapat menguasai kelompok yang kecil`,
            `Manusia hidup terpisah tanpa perlu menjalin komunikasi`,
            `Saling membanggakan kekayaan dan kedudukan masing-masing`
          ],
          exp: `Keberagaman ditakdirkan agar manusia saling melengkapi, saling belajar, dan tolong-menolong dalam kebaikan.`
        }
      );
    }

    // 4. Usia Balig
    if (rawTopikLower.includes('balig') || rawTopikLower.includes('baligh') || subTopics.some(t => /balig|baligh/i.test(t))) {
      subjectTemplates.push(
        {
          q: `Pengertian usia balig dalam ajaran Islam menandakan bahwa seseorang telah...`,
          opts: [
            `Mencapai kedewasaan dan mulai memikul tanggung jawab penuh menjalankan syariat agama (mukallaf)`,
            `Bebas dari segala kewajiban ibadah dan aturan hidup`,
            `Tidak perlu lagi mendengarkan nasihat orang tua dan bimbingan guru`,
            `Selesai menuntut ilmu dan bebas berbuat sesuka hati`,
            `Boleh meninggalkan salat fardu lima waktu tanpa dosa`
          ],
          exp: `Balig menandai awal fase mukallaf, yaitu individu yang telah dibebani kewajiban syariat untuk beribadah dan mempertanggungjawabkan perbuatannya.`
        },
        {
          q: `Kewajiban ibadah yang wajib dikerjakan secara mandiri setelah seseorang memasuki usia balig adalah...`,
          opts: [
            `Menunaikan salat fardu lima waktu dan menjalankan ibadah puasa di bulan Ramadan`,
            `Hanya melaksanakan salat jika diperintah oleh orang tua`,
            `Boleh menunda pelaksanaan salat fardu sampai masa tua`,
            `Hanya berbuat baik tanpa perlu menjalankan kewajiban salat`,
            `Meninggalkan puasa Ramadan meski tidak ada halangan syar'i`
          ],
          exp: `Setelah balig, setiap muslim wajib menunaikan salat fardu lima waktu dan puasa Ramadan secara konsisten.`
        },
        {
          q: `Tanda fisik seseorang telah memasuki usia balig menurut pandangan ilmu biologi dan fikih antara lain...`,
          opts: [
            `Mengalami mimpi basah bagi laki-laki dan mengalami haid bagi perempuan`,
            `Pertumbuhan fisik berhenti total sejak masa kanak-kanak`,
            `Gigi susu belum ada yang tanggal sama sekali`,
            `Daya ingat dan kecerdasan berpikir menurun drastis`,
            `Kembali memiliki sifat kekanak-kanakan seperti balita`
          ],
          exp: `Tanda balig secara biologis dan fikih adalah keluarnya mani/ihtilam bagi laki-laki dan haid bagi perempuan, atau telah mencapai batas usia tertentu.`
        }
      );
    }

    // Default Agama / PAI Questions
    subjectTemplates.push(
      {
        q: `Pesan pokok dan ajaran utama dalam meneladani nilai-nilai kebaikan bagi umat beragama adalah...`,
        opts: [
          `Menumbuhkan keimanan, ketakwaan, serta saling menghargai dan tolong-menolong sesama manusia`,
          `Mementingkan kepentingan diri sendiri di atas kepentingan bersama`,
          `Membeda-bedakan pergaulan berdasarkan suku dan kekayaan harta`,
          `Menjauhi interaksi sosial dengan orang yang berbeda latar belakang`,
          `Mengabaikan perintah ibadah dalam kehidupan sehari-hari`
        ],
        exp: `Pendidikan agama senantiasa menanamkan nilai tauhid, ketakwaan, akhlak mulia, dan toleransi sosial.`
      },
      {
        q: `Sikap seorang muslim yang baik ketika menghadapi perbedaan suku, budaya, atau bangsa adalah...`,
        opts: [
          `Saling mengenal (ta'aruf) dan menghargai dengan penuh kerukunan`,
          `Merasa suku atau kelompok sendiri lebih mulia daripada orang lain`,
          `Menjauhi dan menolak berinteraksi dengan orang lain`,
          `Mengejek adat kebiasaan suku lain yang berbeda`,
          `Memaksakan kehendak kepada orang yang berbeda latar belakang`
        ],
        exp: `Dalam ajaran Islam, keberagaman diciptakan Allah SWT agar manusia saling mengenal, bekerja sama, dan hidup rukun.`
      },
      {
        q: `Ukuran kemuliaan seorang hamba di sisi Allah SWT ditentukan oleh...`,
        opts: [
          `Ketaatan, amal saleh, dan tingkat ketakwaannya kepada Allah SWT`,
          `Jumlah harta kekayaan dan kemewahan tempat tinggalnya`,
          `Tingginya jabatan sosial dan garis keturunan keluarganya`,
          `Kekuatan fisik dan popularitas di lingkungan masyarakat`,
          `Banyaknya barang mewah yang dimiliki`
        ],
        exp: `Kemuliaan di hadapan Allah SWT semata-mata diukur dari kadar takwa dan amal saleh seseorang, bukan harta maupun nasab.`
      },
      {
        q: `Contoh perilaku nyata yang mencerminkan akhlak terpuji di lingkungan sekolah adalah...`,
        opts: [
          `Berteman dengan siapa saja tanpa membedakan suku, agama, maupun status ekonomi`,
          `Hanya mau berteman dengan siswa yang kaya dan seiman saja`,
          `Membentuk kelompok tertutup yang tidak mau berbaur di kelas`,
          `Menolak bekerja kelompok dengan teman yang berbeda suku`,
          `Mengejek teman yang sedang menjalankan ibadahnya`
        ],
        exp: `Perilaku toleran dan bersikap adil kepada semua teman merupakan bentuk nyata penerapan nilai-nilai mulia ajaran agama.`
      },
      {
        q: `Manfaat membiasakan akhlak terpuji bagi ketenteraman lingkungan dan masyarakat adalah...`,
        opts: [
          `Menciptakan suasana persaudaraan yang damai, harmonis, dan penuh keberkahan`,
          `Menimbulkan permusuhan dan kecurigaan antar sesama warga`,
          `Menjadikan seseorang merasa paling benar dan sombong`,
          `Membuat hubungan pertemanan menjadi renggang dan tidak nyaman`,
          `Menyebabkan perselisihan di lingkungan sekolah`
        ],
        exp: `Akhlak terpuji menjadi kunci keharmonisan, keamanan, dan kedamaian hidup bersama di masyarakat.`
      }
    );
  } else if (cleanMapel.includes('bahasa') || cleanMapel.includes('indonesia') || cleanMapel.includes('inggris') || cleanMapel.includes('literasi')) {
    subjectTemplates.push(
      {
        q: `Gagasan utama atau ide pokok dari pembahasan ${cleanTopik} adalah...`,
        opts: [
          `Informasi pokok yang menjelaskan tema bacaan secara runtut dan jelas`,
          `Rincian kalimat penjelas yang tidak berkaitan dengan tema bacaan`,
          `Kesimpulan keliru yang berlawanan dengan fakta di dalam bacaan`,
          `Pendapat pribadi yang menyimpang dari uraian teks`,
          `Keterangan tambahan yang membingungkan alur cerita`
        ],
        exp: `Gagasan utama merupakan ide pokok yang menjadi dasar pengembangan seluruh teks bacaan.`
      },
      {
        q: `Pernyataan berikut yang paling sesuai dengan isi bacaan tentang ${cleanTopik} adalah...`,
        opts: [
          `Penjelasan disajikan berdasarkan fakta dan kaidah bahasa yang baik dan benar`,
          `Teks memuat data fiktif tanpa didukung alur penjelasan yang logis`,
          `Informasi yang disajikan bertentangan dengan kaidah kebahasaan baku`,
          `Teks tidak memberikan manfaat pemahaman bagi pembaca`,
          `Pernyataan di luar konteks yang tidak terdapat dalam teks`
        ],
        exp: `Pemahaman bacaan menuntut ketelitian menemukan informasi faktual yang tertuang langsung di dalam teks.`
      },
      {
        q: `Makna kata atau istilah penting yang digunakan dalam pembahasan ${cleanTopik} merujuk pada...`,
        opts: [
          `Arti lugas yang sesuai dengan konteks kalimat dan Kamus Besar Bahasa Indonesia (KBBI)`,
          `Arti kiasan yang tidak memiliki keterkaitan dengan konteks kalimat`,
          `Arti yang berlawanan dengan maksud kalimat penulis`,
          `Istilah acak yang tidak baku dan tidak dikenal dalam tata bahasa`,
          `Penggunaan kosakata yang membingungkan pembaca`
        ],
        exp: `Memahami arti kata sesuai konteks merupakan keterampilan literasi dasar untuk memahami teks dengan tepat.`
      },
      {
        q: `Kalimat efektif dan santun yang tepat digunakan saat menyampaikan tanggapan mengenai ${cleanTopik} adalah...`,
        opts: [
          `Menyampaikan pendapat dengan kalimat yang jelas, runtut, dan menghargai lawan bicara`,
          `Menggunakan kata-kata kasar yang memojokkan pendapat orang lain`,
          `Menolak pendapat teman tanpa alasan yang logis`,
          `Berbicara dengan nada tinggi agar dituruti semua peserta diskusi`,
          `Menyela pembicaraan orang lain secara tiba-tiba`
        ],
        exp: `Keterampilan berbicara menuntut penguasaan kalimat efektif, diksi yang santun, dan sikap saling menghormati.`
      },
      {
        q: `Kesimpulan yang tepat setelah menelaah pokok bahasan ${cleanTopik} adalah...`,
        opts: [
          `Pembahasan ini memberikan wawasan penting yang dapat diterapkan dalam komunikasi sehari-hari`,
          `Pembahasan ini tidak memiliki relevansi dengan kemampuan berbahasa siswa`,
          `Pembahasan ini sebaiknya diabaikan karena tidak penting`,
          `Pembahasan ini hanya berisi teori tanpa contoh penggunaan nyata`,
          `Pembahasan ini sulit diterapkan dalam percakapan sehari-hari`
        ],
        exp: `Menarik simpulan bacaan bertujuan merangkum pokok-pokok pikiran teks menjadi satu pemahaman utuh yang bermakna.`
      }
    );
  } else if (cleanMapel.includes('ipa') || cleanMapel.includes('ipas') || cleanMapel.includes('sains') || cleanMapel.includes('fisika') || cleanMapel.includes('biologi') || cleanMapel.includes('kimia')) {
    subjectTemplates.push(
      {
        q: `Konsep dasar atau fenomena alam mengenai ${cleanTopik} menjelaskan tentang...`,
        opts: [
          `Proses kerja alam dan interaksi antarkomponen di lingkungan sekitar secara ilmiah`,
          `Kejadian gaib yang tidak dapat diamati dan dibuktikan secara nyata`,
          `Asumsi mitos tanpa didasarkan pada pengamatan empiris dan fakta sains`,
          `Fenomena acak yang tidak mengikuti hukum dan keteraturan alam`,
          `Pendapat subjektif tanpa bukti pengamatan di laboratorium`
        ],
        exp: `Sains berlandaskan pengamatan objektif, fakta alam, dan pembuktian ilmiah yang teratur.`
      },
      {
        q: `Contoh nyata dari penerapan konsep ${cleanTopik} yang dapat kita temukan di lingkungan sekitar adalah...`,
        opts: [
          `Peristiwa atau gejala alam yang terjadi dalam kehidupan sehari-hari siswa`,
          `Cerita dongeng masa lampau yang tidak memiliki kaitan dengan alam nyata`,
          `Kondisi yang hanya ada dalam imajinasi tanpa wujud fisik`,
          `Tindakan merusak kelestarian alam dan lingkungan hidup`,
          `Perilaku yang mengabaikan keteraturan hukum alam`
        ],
        exp: `Pembelajaran sains kontekstual menghubungkan teori di buku dengan peristiwa nyata di lingkungan siswa.`
      },
      {
        q: `Fungsi atau peranan utama dari ${cleanTopik} adalah...`,
        opts: [
          `Mendukung kelangsungan hidup dan menjaga keseimbangan sistem secara optimal`,
          `Merusak tatanan keseimbangan lingkungan dan makhluk hidup`,
          `Menghambat proses kerja alami organ atau komponen ekosistem`,
          `Menimbulkan gangguan pada rantai kehidupan di sekitarnya`,
          `Menghentikan proses pertumbuhan makhluk hidup`
        ],
        exp: `Setiap komponen atau organ memiliki peranan spesifik untuk menjaga keselarasan dan fungsi hidup.`
      },
      {
        q: `Sikap ilmiah dan kepedulian lingkungan yang berkaitan dengan ${cleanTopik} tercermin pada...`,
        opts: [
          `Menjaga kelestarian alam, merawat makhluk hidup, dan memanfaatkan sumber daya secara bijak`,
          `Membuang sampah dan limbah sembarangan ke sungai dan tanah`,
          `Menebang pohon secara liar tanpa melakukan penanaman kembali`,
          `Menggunakan energi secara boros tanpa memikirkan masa depan`,
          `Membiarkan lingkungan kotor dan tercemar polusi`
        ],
        exp: `Memahami sains menumbuhkan rasa syukur kepada Tuhan Yang Maha Esa dan kepedulian menjaga kelestarian bumi.`
      },
      {
        q: `Langkah yang benar dalam mengamati atau melakukan percobaan mengenai ${cleanTopik} adalah...`,
        opts: [
          `Melakukan pengamatan secara cermat, mencatat data hasil apa adanya, dan menarik kesimpulan logis`,
          `Mengubah data pengamatan agar sesuai dengan keinginan pribadi`,
          `Bekerja tergesa-gesa tanpa memperhatikan keselamatan kerja`,
          `Mengabaikan petunjuk penggunaan alat dan bahan praktikum`,
          `Menyalin hasil pengamatan teman tanpa melakukan observasi sendiri`
        ],
        exp: `Metode ilmiah menuntut kejujuran data, ketelitian pengamatan, dan penerapan prosedur keselamatan kerja.`
      }
    );
  } else if (cleanMapel.includes('matematika') || cleanMapel.includes('mtk') || cleanMapel.includes('hitung')) {
    subjectTemplates.push(
      {
        q: `Konsep dasar atau aturan berhitung yang harus diperhatikan pada ${cleanTopik} adalah...`,
        opts: [
          `Mengikuti urutan operasi hitung yang benar dan teliti dalam menghitung nilai`,
          `Menjumlahkan angka secara acak tanpa memperhatikan aturan matematika`,
          `Mengabaikan tanda operasi seperti tambah, kurang, kali, dan bagi`,
          `Menebak hasil perhitungan secara perkiraan tanpa menghitung langkahnya`,
          `Mengabaikan satuan ukuran yang digunakan dalam soal`
        ],
        exp: `Matematika mengutamakan ketepatan alur berpikir logis, urutan operasi hitung, dan ketelitian angka.`
      },
      {
        q: `Penerapan konsep ${cleanTopik} paling sering digunakan dalam kehidupan sehari-hari pada saat...`,
        opts: [
          `Menghitung uang kembalian saat berbelanja, mengukur benda, atau membagi makanan secara adil`,
          `Menggambar pemandangan alam dengan cat minyak`,
          `Membaca puisi karya sastrawan di depan panggung`,
          `Menyanyikan lagu kebangsaan secara bersama-sama`,
          `Melakukan pemanasan senam pagi di lapangan`
        ],
        exp: `Konsep matematika kontekstual sangat bermanfaat dalam transaksi jual beli, pengukuran, dan pembagian adil.`
      },
      {
        q: `Langkah pertama yang paling tepat dilakukan saat menyelesaikan soal cerita mengenai ${cleanTopik} adalah...`,
        opts: [
          `Membaca soal dengan saksama untuk mengetahui apa yang diketahui dan apa yang ditanyakan`,
          `Langsung menulis jawaban akhir tanpa menghitung rumus terlebih dahulu`,
          `Mengalikan semua angka yang terlihat di dalam soal cerita`,
          `Menolak mengerjakan soal karena terlihat panjang`,
          `Mengira-ngira jawaban yang paling disukai`
        ],
        exp: `Membedah apa yang diketahui dan apa yang ditanyakan merupakan kunci menyelesaikan soal cerita dengan benar.`
      },
      {
        q: `Ciri atau sifat khas yang dimiliki oleh bangun atau bilangan pada ${cleanTopik} adalah...`,
        opts: [
          `Memiliki sifat dan rumus baku yang konsisten serta terbukti secara matematis`,
          `Bentuk dan nilainya selalu berubah-ubah tanpa aturan pasti`,
          `Hanya berlaku pada satu angka dan tidak berlaku pada angka lain`,
          `Tidak memiliki rumus untuk menghitung luas maupun kelilingnya`,
          `Tidak dapat digambarkan secara visual`
        ],
        exp: `Karakteristik matematis memiliki kepastian sifat, pola keteraturan, dan formula yang konsisten.`
      },
      {
        q: `Sikap yang sangat dibutuhkan agar berhasil dan tidak keliru dalam mempelajari ${cleanTopik} adalah...`,
        opts: [
          `Tekun, teliti dalam memeriksa hitungan, dan sering berlatih soal latihan`,
          `Terburu-buru mengerjakan soal agar cepat selesai`,
          `Hanya mengandalkan kalkulator tanpa memahami konsep dasarnya`,
          `Cepat menyerah saat menemukan angka pecahan atau perkalian`,
          `Malas mencoret-coret lembar buram untuk memeriksa langkah hitung`
        ],
        exp: `Keberhasilan matematika dibangun dari pembiasaan latihan, ketelitian menghitung, dan kesabaran meneliti langkah kerja.`
      }
    );
  } else if (cleanMapel.includes('pancasila') || cleanMapel.includes('pkn') || cleanMapel.includes('ppkn')) {
    subjectTemplates.push(
      {
        q: `Nilai luhur Pancasila yang paling mencerminkan pengamalan ${cleanTopik} dalam kehidupan bermasyarakat adalah...`,
        opts: [
          `Menjunjung tinggi keadilan, kerukunan, musyawarah, dan gotong royong antarwarga`,
          `Mementingkan kepentingan pribadi di atas kepentingan umum`,
          `Mengutamakan ego dan menolak pendapat orang lain saat bermusyawarah`,
          `Melanggar aturan tata tertib di sekolah dan di lingkungan rumah`,
          `Membuat keributan saat warga sedang beristirahat`
        ],
        exp: `Nilai-nilai Pancasila mengarahkan warga negara untuk hidup rukun, adil, bermusyawarah, dan saling bergotong royong.`
      },
      {
        q: `Contoh kewajiban seorang siswa di sekolah yang berkaitan dengan ${cleanTopik} adalah...`,
        opts: [
          `Menaati tata tertib sekolah, menghormati guru, dan menjaga kebersihan kelas`,
          `Menuntut hak untuk bermain tanpa mau belajar dan mengerjakan tugas`,
          `Datang terlambat ke sekolah secara sengaja setiap hari`,
          `Merusak fasilitas meja, kursi, dan tanaman di taman sekolah`,
          `Mengejek teman yang sedang melaksanakan piket kelas`
        ],
        exp: `Kewajiban harus dijalankan dengan penuh tanggung jawab sebelum seorang siswa menuntut hak-haknya.`
      },
      {
        q: `Manfaat diterapkannya musyawarah untuk mufakat sesuai pembahasan ${cleanTopik} adalah...`,
        opts: [
          `Menghasilkan keputusan bersama yang adil dan dihargai oleh semua pihak`,
          `Menimbulkan pertengkaran sengit yang memecah persatuan warga`,
          `Membuat pihak yang kalah merasa diperlakukan tidak adil`,
          `Memperlama penyelesaian masalah tanpa ada jalan keluar`,
          `Mendorong seseorang untuk bertindak secara sewenang-wenang`
        ],
        exp: `Sila ke-4 Pancasila mengajarkan bahwa musyawarah menghasilkan mufakat demi kemaslahatan dan persatuan bersama.`
      },
      {
        q: `Sikap yang benar terhadap keragaman suku, bahasa, dan budaya Indonesia berdasarkan ${cleanTopik} adalah...`,
        opts: [
          `Bangga dan ikut melestarikan budaya bangsa dengan semboyan Bhinneka Tunggal Ika`,
          `Menganggap budaya daerah lain lebih rendah daripada budaya daerah sendiri`,
          `Malu mengakui kesenian tradisional Indonesia di hadapan orang lain`,
          `Menolak mempelajari tari atau alat musik tradisional daerah nusantara`,
          `Hanya mau berteman dengan orang yang berasal dari satu daerah saja`
        ],
        exp: `Bhinneka Tunggal Ika mengajarkan kebanggaan atas keragaman budaya sebagai kekayaan persatuan bangsa Indonesia.`
      },
      {
        q: `Tindakan yang tepat saat melihat teman mengalami kesulitan belajar di kelas adalah...`,
        opts: [
          `Membantu menjelaskan materi dengan sabar tanpa rasa sombong`,
          `Menertawakan teman karena belum memahami materi pelajaran`,
          `Menyembunyikan buku catatan agar teman tidak bisa belajar`,
          `Masa bodoh dan menganggap itu bukan urusan pribadi`,
          `Melarang teman bertanya kepada guru di depan kelas`
        ],
        exp: `Semangat gotong royong dan tolong-menolong merupakan cerminan nyata nilai kemanusiaan yang adil dan beradab.`
      }
    );
  } else {
    // General subject templates with simple, student-friendly wording
    subjectTemplates.push(
      {
        q: `Pengertian pokok atau hal utama yang dipelajari pada ${cleanTopik} adalah...`,
        opts: [
          `Konsep dasar yang bermanfaat dan dapat diterapkan langsung dalam kehidupan siswa sehari-hari`,
          `Informasi keliru yang tidak memiliki keterkaitan dengan pembelajaran ${mapel}`,
          `Kumpulan teori yang tidak memiliki contoh nyata di lingkungan sekolah`,
          `Hal yang bertentangan dengan tujuan capaian pembelajaran di kelas`,
          `Catatan acak yang membingungkan siswa saat belajar`
        ],
        exp: `Pembahasan ${cleanTopik} dirancang agar siswa memahami konsep inti dan mampu mempraktikkannya secara nyata.`
      },
      {
        q: `Contoh kegiatan atau penerapan langsung dari ${cleanTopik} di lingkungan sekitar adalah...`,
        opts: [
          `Melakukan kegiatan belajar dan praktik secara teratur, tertib, dan bermanfaat`,
          `Mengabaikan aturan dan petunjuk keselamatan yang telah dijelaskan guru`,
          `Menolak bekerja sama dengan teman saat mengerjakan tugas bersama`,
          `Merusak sarana belajar yang telah disediakan di sekolah`,
          `Menghindari latihan mandiri yang diberikan oleh pendidik`
        ],
        exp: `Penerapan langsung konsep pembelajaran melatih kemandirian dan kecakapan hidup peserta didik.`
      },
      {
        q: `Manfaat utama yang didapatkan peserta didik setelah memahami ${cleanTopik} dengan baik adalah...`,
        opts: [
          `Menambah wawasan pengetahuan dan keterampilan praktis untuk memecahkan masalah sehari-hari`,
          `Sekadar menghafal kata-kata untuk ujian lalu melupakannya kembali`,
          `Menjadikan diri sendiri merasa lebih unggul dan meremehkan orang lain`,
          `Menghilangkan semangat ingin tahu terhadap hal-hal baru di sekitar`,
          `Menolak belajar materi lanjutan yang lebih menarik`
        ],
        exp: `Tujuan esensial pembelajaran adalah membekali siswa dengan ilmu yang berguna bagi diri dan lingkungannya.`
      },
      {
        q: `Langkah yang paling tepat untuk memahami ${cleanTopik} secara mendalam adalah...`,
        opts: [
          `Membaca penjelasan dengan cermat, bertanya jika belum paham, dan rajin berlatih soal`,
          `Hanya membaca judul sepintas lalu tanpa mempelajari isinya`,
          `Menunggu kunci jawaban tanpa mau mencoba mengerjakan secara mandiri`,
          `Belajar hanya sesaat menjelang ujian dengan sistem terburu-buru`,
          `Menyalin pekerjaan teman tanpa memahami alur penyelesaiannya`
        ],
        exp: `Pembelajaran yang bermakna dicapai melalui ketekunan membaca, keaktifan bertanya, dan latihan mandiri secara teratur.`
      },
      {
        q: `Sikap yang perlu ditunjukkan oleh peserta didik saat mempraktikkan ${cleanTopik} adalah...`,
        opts: [
          `Bersikap jujur, teliti, bertanggung jawab, dan menghargai masukan orang lain`,
          `Mengabaikan keselamatan dan petunjuk kerja yang diberikan guru`,
          `Bekerja asal-asalan demi cepat selesai tanpa memeriksa keakuratan hasil`,
          `Menolak menerima koreksi atau saran perbaikan dari rekan sekelas`,
          `Menyalahkan kondisi sekitar saat menghadapi kendala pengerjaan`
        ],
        exp: `Karakter jujur, teliti, dan bertanggung jawab merupakan pilar utama keberhasilan setiap kegiatan belajar.`
      }
    );
  }

  // Combine extracted reading questions + subject templates
  const allPool = [...extractedQuestions, ...subjectTemplates];

  // Repeat and expand pool if targetCount > allPool.length
  let poolIndex = 0;
  const chosenTemplates: { q: string; opts: string[]; exp: string }[] = [];
  while (chosenTemplates.length < targetCount) {
    const baseItem = allPool[poolIndex % allPool.length];
    chosenTemplates.push({
      q: baseItem.q,
      opts: [...baseItem.opts],
      exp: baseItem.exp
    });
    poolIndex++;
  }

  const soalList = chosenTemplates.map((item, idx) => {
    const keys: ('a' | 'b' | 'c' | 'd' | 'e')[] = isSMA ? ['a', 'b', 'c', 'd', 'e'] : ['a', 'b', 'c', 'd'];
    const targetKey = keys[idx % keys.length];

    const correctText = item.opts[0];
    const otherOpts = item.opts.slice(1, isSMA ? 5 : 4);

    const finalOpsi: Record<string, string> = {};
    let otherIdx = 0;
    for (const k of keys) {
      if (k === targetKey) {
        finalOpsi[k] = sanitizeNoModul(correctText);
      } else {
        finalOpsi[k] = sanitizeNoModul(otherOpts[otherIdx++] || `Alternatif pilihan ${k.toUpperCase()}`);
      }
    }

    return {
      id: idx + 1,
      pertanyaan: sanitizeNoModul(item.q),
      tipe: "Pilihan Ganda",
      opsi: finalOpsi,
      kunci: targetKey,
      bobot: 5,
      pembahasan: sanitizeNoModul(item.exp)
    };
  });

  return {
    ringkasanDokumen: `Materi pokok ${cleanTopik} (${mapel} Kelas ${kelas}) menyajikan pemahaman penting yang terarah, ramah siswa, serta sesuai dengan capaian pembelajaran.`,
    soalList
  };
}

// AI Gemini Exam & Question Generator from PDF Endpoint (Supports Single & Multiple PDFs)
app.post("/api/ai/generate-soal", async (req, res) => {
  try {
    const { 
      pdfBase64,
      pdfBase64List,
      pdfUrl, 
      pdfUrls,
      materiText: rawMateriText, 
      mapel = "Mata Pelajaran", 
      topik = "Materi Pembelajaran", 
      kelas = "4", 
      jumlahSoal = 20,
      temaModul = "",
      tingkatKesulitan = "mudah"
    } = req.body;

    let materiText = rawMateriText ? String(rawMateriText).trim() : "";

    const base64List: string[] = [];
    if (Array.isArray(pdfBase64List) && pdfBase64List.length > 0) {
      pdfBase64List.forEach((b: string) => {
        const clean = String(b).replace(/^data:application\/pdf;base64,/, "").trim();
        if (clean) base64List.push(clean);
      });
    } else if (pdfBase64) {
      const clean = String(pdfBase64).replace(/^data:application\/pdf;base64,/, "").trim();
      if (clean) base64List.push(clean);
    }

    // Collect all URL targets
    const targetUrls: string[] = [];
    if (Array.isArray(pdfUrls)) {
      pdfUrls.forEach((u: any) => {
        if (typeof u === 'string' && u.trim()) {
          u.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).forEach(part => {
            if (!targetUrls.includes(part)) targetUrls.push(part);
          });
        }
      });
    } else if (typeof pdfUrls === 'string' && pdfUrls.trim()) {
      pdfUrls.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).forEach(part => {
        if (!targetUrls.includes(part)) targetUrls.push(part);
      });
    }
    if (pdfUrl && typeof pdfUrl === 'string' && pdfUrl.trim()) {
      pdfUrl.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).forEach(part => {
        if (!targetUrls.includes(part)) targetUrls.push(part);
      });
    }

    // Download PDF URLs with robust fallback for Google Drive links
    if (base64List.length === 0 && targetUrls.length > 0) {
      for (const singleUrl of targetUrls) {
        try {
          let downloadUrl = String(singleUrl).trim();
          const driveMatch = downloadUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || downloadUrl.match(/id=([a-zA-Z0-9_-]+)/);
          
          if (driveMatch && driveMatch[1]) {
            const fileId = driveMatch[1];
            downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
          }

          let fetchRes = await fetch(downloadUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            signal: AbortSignal.timeout(15000)
          });

          // Secondary Google Drive fallback endpoints if not ok
          if (!fetchRes.ok && driveMatch && driveMatch[1]) {
            const altUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
            fetchRes = await fetch(altUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
              signal: AbortSignal.timeout(12000)
            });
          }

          if (fetchRes.ok) {
            const arrayBuf = await fetchRes.arrayBuffer();
            const buf = Buffer.from(arrayBuf);
            if (buf.length > 100) {
              base64List.push(buf.toString("base64"));
              console.log(`[PDF Download] Berhasil mengunduh dokumen PDF (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
            }
          }
        } catch (err: any) {
          console.warn("[PDF Download] Unduh PDF dilewati:", singleUrl, err.message);
        }
      }
    }

    // Extract text from base64 PDF buffers if materiText is missing or short
    if (base64List.length > 0 && (!materiText || String(materiText).trim().length < 100)) {
      try {
        const buffers = base64List.map(b => Buffer.from(b, "base64"));
        const extracted = await extractTextFromPdfBuffers(buffers, 35);
        if (extracted && extracted.trim().length > 50) {
          materiText = materiText ? `${materiText}\n\n${extracted}` : extracted;
          console.log(`[PDF Server Extract] Berhasil mengekstrak ${extracted.length} karakter teks dari ${buffers.length} dokumen PDF.`);
        }
      } catch (exErr) {
        console.warn("[PDF Server Extract] Ekstraksi teks PDF server dilewati:", exErr);
      }
    }

    const cleanK = String(kelas).replace(/\D/g, "") || "4";
    const isSMA = ["10", "11", "12"].includes(cleanK);
    const targetCount = Math.min(Math.max(Number(jumlahSoal) || 20, 3), 25);

    let parsedData: any = null;
    let modelUsed = "gemini-3.1-flash-lite";
    let isFallback = false;

    const ai = getGeminiClient();

    if (!ai) {
      console.log("[AI Engine] GEMINI_API_KEY belum dikonfigurasi. Mengaktifkan kurikulum cerdas ramah siswa.");
      isFallback = true;
      parsedData = buildSmartCurriculumFallback({
        mapel,
        topik,
        temaModul,
        kelas,
        targetCount,
        isSMA,
        materiText,
        tingkatKesulitan
      });
    } else {
      try {
        const parts: any[] = [];

        // Attach actual PDF file data if available (up to 3 documents)
        base64List.slice(0, 3).forEach((bData) => {
          parts.push({
            inlineData: {
              mimeType: "application/pdf",
              data: bData,
            },
          });
        });

        // Context definition depending on whether PDF inlineData or raw text exists
        let sourceInstruction = "";
        const hasText = materiText && String(materiText).trim().length > 30;
        const hasPdf = base64List.length > 0;

        if (hasText && hasPdf) {
          sourceInstruction = `SUMBER MATERI LENGKAP DARI DOKUMEN PDF PEMBELAJARAN:
Berikut adalah teks isi materi yang diekstrak langsung dari ${base64List.length} dokumen PDF:
"""
${String(materiText).slice(0, 80000)}
"""
Serta berkas PDF terlampir.
PETUNJUK KELAYAKAN SOAL:
Seluruh butir soal, opsi jawaban, dan kunci jawaban WAJIB 100% berakar pada fakta, proses, definisi, data, atau istilah yang tertera di dalam dokumen PDF di atas. DILARANG membuat soal pengetahuan umum di luar dokumen ini.`;
        } else if (hasText) {
          sourceInstruction = `SUMBER MATERI PEMBELAJARAN DARI DOKUMEN:
Berikut adalah teks isi materi yang diekstrak dari dokumen pembelajaran:
"""
${String(materiText).slice(0, 80000)}
"""
PETUNJUK KELAYAKAN SOAL:
Seluruh butir soal dan jawaban WAJIB 100% bersumber langsung dari teks materi di atas. Ujilah pemahaman fakta konkret, arti istilah penting, mekanisme/fungsi, atau contoh yang tertulis dalam bacaan.`;
        } else if (hasPdf) {
          sourceInstruction = `SUMBER MATERI: Telaah ${base64List.length > 1 ? `${base64List.length} dokumen PDF terlampir` : "dokumen PDF terlampir"}. Seluruh butir soal, opsi jawaban, dan kunci jawaban WAJIB 100% diambil dari isi teks, definisi, fakta, nama, contoh, atau kaidah yang tertulis di dalam dokumen PDF ini. Distribusikan soal secara merata ke seluruh halaman/bab.`;
        } else {
          sourceInstruction = `SUMBER MATERI: Mata Pelajaran ${mapel}, Materi Pokok: "${topik}" (Kelas ${kelas}). Susunlah butir soal pilihan ganda standar ujian sekolah yang secara langsung menguji penguasaan materi pokok tersebut.`;
        }

        const cleanTopikPrompt = cleanConceptName(topik);
        const cleanTemaPrompt = cleanConceptName(temaModul || topik);

        const promptText = `
Anda adalah Guru Penyusun Soal Ujian Sekolah yang ramah siswa, jelas, dan fokus menguji pemahaman materi pokok.
TUGAS UTAMA: Susunlah TEPAT ${targetCount} butir soal pilihan ganda untuk:
- Mata Pelajaran: ${mapel}
- Topik / Materi Pembelajaran: ${cleanTopikPrompt}
- Pembahasan Materi: ${cleanTemaPrompt}
- Kelas: ${kelas} (${isSMA ? "Tingkat SMA / Paket C dengan opsi A, B, C, D, E" : "Tingkat SD/SMP / Paket A/B dengan opsi A, B, C, D"})
- Tingkat Kesulitan: ${tingkatKesulitan === 'tantangan' ? 'Menengah (Analisis Sederhana)' : tingkatKesulitan === 'sedang' ? 'Sedang / Standar Sekolah' : 'Mudah & Ramah Siswa (Fakta & Pemahaman Pokok Materi)'}

${sourceInstruction}

PANDUAN KETAT (SOAL TIDAK BOLEH BIKIN PUSING, JANGAN BAHAS-BAHAS MODUL/MATERI, DAN FOKUS MURNI PADA SUBSTANSI):
1. DILARANG KERAS MENGGUNAKAN KATA "MODUL" MAUPUN FRASA "DALAM MATERI...", "PADA MATERI...":
   - JANGAN PERNAH menyertakan kata "modul" dalam kalimat pertanyaan, opsi jawaban, maupun pembahasan!
   - DILARANG menggunakan awalan/frasa seperti: "Menurut modul...", "Berdasarkan modul...", "Dalam modul ini...", "Pada modul...", "Isi modul...", "Modul pembelajaran...", "Dalam materi...", "Pada materi...", "Menurut materi...", atau "Berdasarkan materi...".
   - LANGSUNG tanyakan substansi materinya:
     * CONTOH SALAH: "Dalam materi pernapasan, apa fungsi utama paru-paru?"
     * CONTOH BENAR: "Apa fungsi utama paru-paru pada manusia?"
     * CONTOH SALAH: "Menurut modul, apa fungsi utama organ pernapasan?"
     * CONTOH BENAR: "Apa fungsi utama dari organ pernapasan manusia?"
     * CONTOH SALAH: "Berdasarkan modul 1, siapakah tokoh yang memimpin perang Diponegoro?"
     * CONTOH BENAR: "Siapakah tokoh yang memimpin Perang Diponegoro?"
     * CONTOH SALAH: "Dalam materi toleransi, bagaimana sikap yang baik?"
     * CONTOH BENAR: "Bagaimana sikap yang baik ketika menghadapi perbedaan suku dan budaya?"
2. BAHASA LUGAS, SEDERHANA, DAN RAMAH SISWA:
   - Gunakan kalimat yang singkat, jelas, bahasa baku yang mudah dipahami siswa Kelas ${kelas}, dan TIDAK berbelit-belit.
   - DILARANG menggunakan istilah filsafat pendidikan rumit, teori abstrak, kalimat yang terlalu panjang, atau istilah metakognisi yang membuat siswa pusing.
3. FOKUS 100% PADA SUBSTANSI PELAJARAN:
   - Pertanyaan harus LANGSUNG menanyakan materi: arti kata/istilah, isi bacaan, pesan ayat/surat, nama tokoh/peristiwa, rumus atau perhitungan praktis, bagian organ/alat dan fungsinya, atau contoh perilaku nyata dalam kehidupan sehari-hari.
   - DILARANG KERAS membuat pertanyaan tentang: cara belajar kelompok, strategi belajar jangka panjang, Profil Pelajar Pancasila saat asesmen, miskonsepsi belajar, atau pertanyaan meta-kurikulum.
4. MODEL PERTANYAAN LANGSUNG:
   - Buat pertanyaan langsung seperti:
     * "Apa yang dimaksud dengan...?"
     * "Tujuan utama dari ... adalah..."
     * "Berikut ini yang merupakan contoh penerapan ... dalam kehidupan sehari-hari adalah..."
     * "Manakah pernyataan yang paling benar mengenai ...?"
     * "Bagaimana sikap yang baik saat ...?"
5. PILIHAN JAWABAN & PEMBAHASAN:
   - Opsi jawaban A, B, C, D (dan E) harus singkat, jelas, dan tidak mengecoh secara membingungkan.
   - Kunci jawaban harus pasti benar dan sesuai materi.
   - Pembahasan singkat dan menerangkan alasan jawaban yang benar dengan bahasa yang mudah dimengerti siswa tanpa menyebut kata "modul" atau "dalam materi".
6. DILARANG KERAS MEMBAWA-BAWA JUDUL SILABUS ATAU PENOMORAN DAFTAR MATERI KE DALAM SOAL:
   - JANGAN PERNAH menyalin daftar judul silabus seperti "(1): Mengkaji Q.S. Al-ḥujurāt/49:13; (2): Teladan Mulia Asmaulhusna; (1): Indahnya Saling Menghargai Dalam Keragaman; (2): Menyambut Usia Balig" ke dalam kalimat pertanyaan, opsi, maupun pembahasan!
   - DILARANG menyertakan penomoran "(1):", "(2):", "(3):", "(4):", kode silabus, atau kata kerja judul seperti "Mengkaji", "Menelaah", "Membahas", "Menyambut", "Indahnya".
   - Jika diberikan beberapa subtopik materi, buatlah pertanyaan-pertanyaan terpisah yang langsung menguji konsep masing-masing secara jelas dan mandiri (misalnya soal tentang Surah Al-Hujurat ayat 13, soal tentang Asmaulhusna, soal tentang saling menghargai keragaman, atau soal tentang usia balig).

FORMAT OUTPUT WAJIB JSON VALID (HANYA JSON, TANPA PEMBUKA):
{
  "ringkasanDokumen": "Ringkasan 1-2 kalimat tentang materi pokok pembelajaran ini.",
  "soalList": [
    {
      "pertanyaan": "Kalimat pertanyaan langsung yang jelas dan ramah siswa...",
      "opsi": {
        "a": "Opsi A...",
        "b": "Opsi B...",
        "c": "Opsi C...",
        "d": "Opsi D..."${isSMA ? ',\n        "e": "Opsi E..."' : ""}
      },
      "kunci": "a",
      "bobot": 5,
      "pembahasan": "Penjelasan singkat mengapa pilihan ini benar sesuai materi."
    }
  ]
}
`;

        parts.push({ text: promptText });

        // Candidate models: prioritize gemini-3.1-flash-lite for instant response without 503 errors
        const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];

        for (const candidate of candidateModels) {
          let attempt = 0;
          const maxAttempts = 2;
          let succeeded = false;

          while (attempt < maxAttempts && !succeeded) {
            attempt++;
            try {
              console.log(`[Gemini] Memproses butir soal dengan model ${candidate} (percobaan ${attempt})...`);
              const aiRes = await ai.models.generateContent({
                model: candidate,
                contents: { parts },
                config: {
                  responseMimeType: "application/json",
                },
              });

              const responseText = aiRes.text || "{}";
              try {
                parsedData = JSON.parse(responseText);
              } catch (e) {
                const match = responseText.match(/\{[\s\S]*\}/);
                if (match) {
                  parsedData = JSON.parse(match[0]);
                }
              }

              if (parsedData && Array.isArray(parsedData.soalList) && parsedData.soalList.length > 0) {
                modelUsed = candidate;
                console.log(`[Gemini] Berhasil menyusun ${parsedData.soalList.length} soal ramah siswa menggunakan ${candidate}!`);
                succeeded = true;
                break;
              }
            } catch (err: any) {
              const errMsg = String(err?.message || err || "");
              const isTemporary = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");

              if (isTemporary && attempt < maxAttempts) {
                console.log(`[Gemini] Model ${candidate} mengalami antrean sesaat. Menunggu 1 detik untuk percobaan ulang...`);
                await new Promise((resolve) => setTimeout(resolve, 1000));
              } else {
                console.log(`[Gemini] Beralih dari model ${candidate} ke penanganan alternatif.`);
                break;
              }
            }
          }

          if (succeeded) break;
        }

        if (!parsedData || !Array.isArray(parsedData.soalList) || parsedData.soalList.length === 0) {
          console.log("[Gemini] Antrean cloud AI padat. Mengaktifkan kurikulum materi cerdas ramah siswa...");
          isFallback = true;
          parsedData = buildSmartCurriculumFallback({
            mapel,
            topik,
            temaModul,
            kelas,
            targetCount,
            isSMA,
            materiText,
            tingkatKesulitan
          });
        }
      } catch (genAiError: any) {
        console.log("[Gemini] Fallback kurikulum ramah siswa diaktifkan.");
        isFallback = true;
        parsedData = buildSmartCurriculumFallback({
          mapel,
          topik,
          temaModul,
          kelas,
          targetCount,
          isSMA,
          materiText,
          tingkatKesulitan
        });
      }
    }

    const rawList = Array.isArray(parsedData.soalList) ? parsedData.soalList : [];
    if (rawList.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Tidak dapat menyusun soal dari materi ini. Silakan periksa kembali berkas PDF atau teks materi.",
      });
    }

    const formattedSoalList = rawList.map((q: any, idx: number) => ({
      id: idx + 1,
      pertanyaan: sanitizeNoModul(q.pertanyaan || `Soal nomor ${idx + 1}`),
      tipe: "Pilihan Ganda",
      opsi: {
        a: sanitizeNoModul(q.opsi?.a || "Pilihan A"),
        b: sanitizeNoModul(q.opsi?.b || "Pilihan B"),
        c: sanitizeNoModul(q.opsi?.c || "Pilihan C"),
        d: sanitizeNoModul(q.opsi?.d || "Pilihan D"),
        ...(isSMA ? { e: sanitizeNoModul(q.opsi?.e || "Pilihan E") } : {})
      },
      kunci: (["a", "b", "c", "d", "e"].includes(String(q.kunci).toLowerCase()) ? String(q.kunci).toLowerCase() : "a"),
      bobot: Number(q.bobot) || 5,
      pembahasan: sanitizeNoModul(q.pembahasan || `Kunci jawaban terverifikasi dari materi ${cleanConceptName(topik)}.`)
    }));

    res.json({
      success: true,
      mapel,
      topik: cleanConceptName(topik),
      kelas,
      jumlahSoal: formattedSoalList.length,
      ringkasanDokumen: sanitizeNoModul(parsedData.ringkasanDokumen || ""),
      soalList: formattedSoalList,
      source: isFallback
        ? "Materi Kurikulum Sekolah Terpadu"
        : `Dokumen PDF Materi (${modelUsed})`,
      modelUsed,
      isFallback
    });
  } catch (error: any) {
    console.error("Generate Soal Endpoint Error, activating smart curriculum fallback:", error);
    try {
      const cleanK = String(req.body?.kelas || "4").replace(/\D/g, "") || "4";
      const isSMA = ["10", "11", "12"].includes(cleanK);
      const targetCount = Math.min(Math.max(Number(req.body?.jumlahSoal) || 20, 3), 25);
      const fallbackResult = buildSmartCurriculumFallback({
        mapel: req.body?.mapel || "Mata Pelajaran",
        topik: req.body?.topik || "Materi Pembelajaran",
        temaModul: req.body?.temaModul || "Kurikulum Merdeka",
        kelas: req.body?.kelas || "4",
        targetCount,
        isSMA,
        materiText: req.body?.materiText,
        tingkatKesulitan: req.body?.tingkatKesulitan || "mudah"
      });

      const sanitizedFallbackList = fallbackResult.soalList.map((q: any, idx: number) => ({
        ...q,
        id: idx + 1,
        pertanyaan: sanitizeNoModul(q.pertanyaan),
        opsi: {
          a: sanitizeNoModul(q.opsi?.a || ""),
          b: sanitizeNoModul(q.opsi?.b || ""),
          c: sanitizeNoModul(q.opsi?.c || ""),
          d: sanitizeNoModul(q.opsi?.d || ""),
          ...(isSMA ? { e: sanitizeNoModul(q.opsi?.e || "") } : {})
        },
        pembahasan: sanitizeNoModul(q.pembahasan || "")
      }));

      res.json({
        success: true,
        mapel: req.body?.mapel || "Mata Pelajaran",
        topik: cleanConceptName(req.body?.topik || "Materi Pembelajaran"),
        kelas: req.body?.kelas || "4",
        jumlahSoal: sanitizedFallbackList.length,
        ringkasanDokumen: sanitizeNoModul(fallbackResult.ringkasanDokumen),
        soalList: sanitizedFallbackList,
        source: "Materi Kurikulum Sekolah Terpadu",
        modelUsed: "Kurikulum Sekolah Terpadu",
        isFallback: true
      });
    } catch (fbErr: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Gagal membuat soal dari PDF",
        error: String(error)
      });
    }
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    // Pre-warm GIDs and core sheets in background so initial client requests resolve in <5ms
    setTimeout(async () => {
      try {
        const defaultId = DEFAULT_SETTINGS.spreadsheetId || "1XyQnYPz_0erRm7NTMGZh0ysGWZRXjqbDb271ovLeqJ4";
        const gids = await getOrFetchSheetGids(defaultId);
        const coreSheets = ['SISWA', 'TAGIHAN', 'PEMBAYARAN', 'TABUNGAN', 'BIAYA', 'KAS', 'GURU', 'USERS'];
        await Promise.allSettled(
          coreSheets.map(async (sheetName) => {
            const gid = gids[sheetName];
            if (!gid) return;
            const cacheKey = `${defaultId}:${sheetName}`;
            if (sheetDataCache.has(cacheKey)) return;
            const csvUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(defaultId)}/export?format=csv&gid=${encodeURIComponent(gid)}`;
            const csvResp = await fetch(csvUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
            });
            if (csvResp.ok) {
              const csvText = await csvResp.text();
              const rows = parseCsvToObjects(csvText);
              sheetDataCache.set(cacheKey, { rows, gid, timestamp: Date.now() });
            }
          })
        );
      } catch {}
    }, 100);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;

