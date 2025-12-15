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

const rawEl = document.getElementById("raw");
const levelEl = document.getElementById("level");
const angleEl = document.getElementById("angle");
const uptimeEl = document.getElementById("uptime");

onValue(ref(db, "flood/latest"), (snap) => {
  const d = snap.val();
  if (!d) return;

  rawEl.textContent = d.raw ?? "--";
  levelEl.textContent = d.level ?? "--";
  angleEl.textContent = d.barrierAngle ?? "--";
  uptimeEl.textContent = d.deviceUptimeMs ?? "--";
});
