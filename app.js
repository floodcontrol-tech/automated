import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Your web app's Firebase configuration
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

// ====== REQUIRED elements (from your current page) ======
const rawEl = document.getElementById("raw");
const levelEl = document.getElementById("level");
const angleEl = document.getElementById("angle");
const uptimeEl = document.getElementById("uptime");

// ====== OPTIONAL elements (if you added the nicer UI) ======
const badgeEl = document.getElementById("badge");     // <span id="badge">
const updatedEl = document.getElementById("updated"); // <span id="updated">
const chartCanvas = document.getElementById("chart"); // <canvas id="chart">

// ====== Chart setup (works only if Chart.js + canvas exist) ======
const MAX_POINTS = 60;
let chart = null;
const labels = [];
const series = [];

function safeSetText(el, text) {
  if (!el) return;
  el.textContent = text;
}

function setBadge(level) {
  if (!badgeEl) return;

  // Reset class if you use CSS badge classes
  badgeEl.className = "badge";

  if (!level || level === "--") {
    badgeEl.textContent = "NO DATA";
    badgeEl.classList.add("neutral");
    return;
  }

  if (String(level).includes("LV3")) {
    badgeEl.textContent = "FLOOD ALERT";
    badgeEl.classList.add("lv3");
  } else if (String(level).includes("LV2")) {
    badgeEl.textContent = "UPCOMING FLOOD";
    badgeEl.classList.add("lv2");
  } else if (String(level).includes("LV1")) {
    badgeEl.textContent = "WARNING";
    badgeEl.classList.add("lv1");
  } else {
    badgeEl.textContent = "NORMAL / LOW";
    badgeEl.classList.add("ok");
  }
}

function ensureChart() {
  // Chart.js must be loaded globally as window.Chart
  if (!chartCanvas || !window.Chart) return;

  if (chart) return;

  chart = new window.Chart(chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Water Sensor (raw)",
          data: series,
          tension: 0.25,
          fill: true,
          pointRadius: 0,
          borderWidth: 2
        }
      ]
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

function pushChartPoint(rawValue) {
  ensureChart();
  if (!chart) return;

  const t = new Date().toLocaleTimeString();
  labels.push(t);
  series.push(Number(rawValue));

  if (labels.length > MAX_POINTS) {
    labels.shift();
    series.shift();
  }

  chart.update();
}

// ====== Firebase listener ======
setBadge("CONNECTING");
safeSetText(updatedEl, "Connecting...");

onValue(ref(db, "flood/latest"), (snap) => {
  const d = snap.val();
  if (!d) {
    setBadge("--");
    safeSetText(updatedEl, "No data yet");
    return;
  }

  const raw = d.raw ?? "--";
  const level = d.level ?? "--";
  const angle = d.barrierAngle ?? "--";

  // Your ESP32 code may send either uptimeMs or deviceUptimeMs
  const uptime = d.uptimeMs ?? d.deviceUptimeMs ?? "--";

  safeSetText(rawEl, raw);
  safeSetText(levelEl, level);
  safeSetText(angleEl, angle);
  safeSetText(uptimeEl, uptime);

  setBadge(level);
  safeSetText(updatedEl, new Date().toLocaleString());

  // Graph point
  if (raw !== "--") pushChartPoint(raw);
});
