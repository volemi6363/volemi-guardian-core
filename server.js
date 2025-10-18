
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const STATE = {
  version: "v1.0.0",
  guardianActive: true,
  thresholds: { green: 10, yellow: 1 },
  metrics: {
    meta:   { clicks: 0, ctr: 0, cpc: 0, status: "yellow" },
    google: { clicks: 0, ctr: 0, cpc: 0, status: "yellow" },
    tiktok: { clicks: 0, ctr: 0, cpc: 0, status: "yellow" },
    x:      { clicks: 0, ctr: 0, cpc: 0, status: "yellow" }
  },
  lastActions: []
};

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "VOLEMI Guardian Core", version: STATE.version, ts: new Date().toISOString() });
});

app.post("/api/guardian/toggle", (req, res) => {
  STATE.guardianActive = !!(req.body?.active);
  logAction("guardian-toggle", { active: STATE.guardianActive });
  res.json({ ok: true, guardianActive: STATE.guardianActive });
});

app.get("/api/metrics", (req, res) => {
  res.json({ ok: true, guardianActive: STATE.guardianActive, metrics: STATE.metrics, lastActions: STATE.lastActions, thresholds: STATE.thresholds });
});

app.post("/api/thresholds", (req, res) => {
  const { green, yellow } = req.body || {};
  if (Number.isFinite(green)) STATE.thresholds.green = green;
  if (Number.isFinite(yellow)) STATE.thresholds.yellow = yellow;
  logAction("thresholds-update", { thresholds: STATE.thresholds });
  res.json({ ok: true, thresholds: STATE.thresholds });
});

app.post("/api/optimize", (req, res) => {
  const { platform } = req.body || {};
  if (!platform || !STATE.metrics[platform]) return res.status(400).json({ ok:false, error:"platform?" });
  logAction("optimize", { platform });
  res.json({ ok: true, note: `Optimize isteği alındı: ${platform}` });
});

app.post("/dev/fake-click", (req, res) => {
  const { platform="tiktok", inc=1 } = req.body || {};
  if (!STATE.metrics[platform]) return res.status(400).json({ ok:false });
  STATE.metrics[platform].clicks += Number(inc);
  res.json({ ok:true, clicks: STATE.metrics[platform].clicks });
});

function analyzeLoop(){
  if (!STATE.guardianActive) return;
  const { green, yellow } = STATE.thresholds;
  for (const [key, m] of Object.entries(STATE.metrics)){
    m.status = m.clicks >= green ? "green" : (m.clicks >= yellow ? "yellow" : "red");
  }
}
cron.schedule("*/5 * * * *", analyzeLoop);
analyzeLoop();

function logAction(action, payload){
  STATE.lastActions.unshift({ at: new Date().toISOString(), action, ...payload });
  STATE.lastActions = STATE.lastActions.slice(0, 50);
}

const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));
app.get("/", (req, res) => res.sendFile(path.join(publicDir, "dashboard.html")));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("VOLEMI Guardian Core listening on", PORT));
