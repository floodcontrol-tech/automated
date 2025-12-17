import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDitHGRpa-Pxxs0JLx6OADMp5iYleJTJgk",
  authDomain: "floodcontrol-2db1c.firebaseapp.com",
  databaseURL: "https://floodcontrol-2db1c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "floodcontrol-2db1c",
  storageBucket: "floodcontrol-2db1c.firebasestorage.app",
  messagingSenderId: "477410952624",
  appId: "1:477410952624:web:33dafa7ea9dd559aacc275"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Required UI
const rawEl = document.getElementById("raw");
const levelEl = document.getElementById("level");
const angleEl = document.getElementById("angle");
const updatedEl = document.getElementById("updated");
const badgeEl = document.getElementById("badge");
const pointsCountEl = document.getElementById("pointsCount");

// SMS UI (new)
const smsTextEl = document.getElementById("smsText");
const smsBoxEl = document.getElementById("smsStatus");

// Chart
const chartCanvas = document.getElementById("chart");
const btnClear = document.getElementById("btnClearGraph");
const MAX_POINTS = 60;

if (pointsCountEl) pointsCountEl.textContent = String(MAX_POINTS);

let chart = null;
const labels = [];
const series = [];

function safeSetText(el, val) {
  if (!el) return;
  el.textContent = (val === undefined || val === null || val === "") ? "--" : String(val);
}

function normalizeLevel(level) {
  // REVISION: treat ABOVE_RANGE as LV3 on the site
  if (level === "ABOVE_RANGE" || level === "BEYOND_MAX_RANGE") return "LV3_FLOOD_ALERT";
  return level || "--";
}

function setBadge(level) {
  if (!badgeEl) return;
  badgeEl.className = "badge neutral";

  const lv = String(level || "");
  if (lv.includes("LV3")) { badgeEl.textContent = "FLOOD ALERT"; badgeEl.classList.add("lv3"); }
  else if (lv.includes("LV2")) { badgeEl.textContent = "UPCOMING FLOOD"; badgeEl.classList.add("lv2"); }
  else if (lv.includes("LV1")) { badgeEl.textContent = "WARNING"; badgeEl.classList.add("lv1"); }
  else { badgeEl.textContent = "NORMAL / LOW"; badgeEl.classList.add("ok"); }
}

function setSmsStatus(level, data) {
  // If ESP32 later writes smsStatus to Firebase, we honor it:
  // e.g., data.smsStatus = "sending" | "sent" | "idle"
  const custom = data?.smsStatus;

  let text = "SMS: Idle";
  let state = "idle"; // idle | sending | sent

  if (custom) {
    state = String(custom);
    if (state === "sending") text = "SMS: Sending alert…";
    else if (state === "sent") text = "SMS: Alert sent ✔";
    else text = "SMS: Idle";
  } else {
    // No Firebase flag → infer based on level
    if (level === "LV2_UPCOMING_FLOOD" || level === "LV3_FLOOD_ALERT") {
      text = "SMS: Sending alert…";
      state = "sending";
    }
  }

  if (smsTextEl) smsTextEl.textContent = text;

  if (smsBoxEl) {
    smsBoxEl.classList.remove("idle", "sending", "sent");
    smsBoxEl.classList.add(state);
  }
}

function ensureChart() {
  if (!chartCanvas || !window.Chart) return;
  if (chart) return;

  chart = new window.Chart(chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Water Sensor (raw)",
        data: series,
        tension: 0.25,
        fill: true,
        pointRadius: 0,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: {
        x: { ticks: { maxTicksLimit: 6 } },
        y: { beginAtZero: false }
      }
    }
  });
}

function pushPoint(raw) {
  ensureChart();
  if (!chart) return;

  labels.push(new Date().toLocaleTimeString());
  series.push(Number(raw));

  if (labels.length > MAX_POINTS) {
    labels.shift();
    series.shift();
  }
  chart.update();
}

function clearGraph() {
  labels.length = 0;
  series.length = 0;
  if (chart) chart.update();
}

if (btnClear) btnClear.addEventListener("click", clearGraph);

// Live listener
safeSetText(updatedEl, "Connecting...");
if (badgeEl) badgeEl.textContent = "CONNECTING";

onValue(ref(db, "flood/latest"), (snap) => {
  const d = snap.val();
  if (!d) return;

  const raw = d.raw ?? "--";
  const level = normalizeLevel(d.level ?? "--");
  const angle = d.barrierAngle ?? "--";

  safeSetText(rawEl, raw);
  safeSetText(levelEl, level);
  safeSetText(angleEl, angle);

  setBadge(level);
  safeSetText(updatedEl, new Date().toLocaleString());

  // SMS indicator (lower-left)
  setSmsStatus(level, d);

  // Chart
  if (raw !== "--") pushPoint(raw);
});
