/* V42.8：雲端（Firebase）存取。登入用 Email＋密碼；資料放在 Firestore。
 * - 設定（班表、人員有效期間、事件、班表待確認月份）：v42_settings/{key}，內容存成 JSON 文字。
 * - 電話資料：依月份切塊，v42_call_chunks/{月份}_{序號}；目錄在 v42_meta/calls。
 *   存的時候拿掉 shift／shiftSource（讀回來時依班表重算），所以改班表不用重寫電話資料。
 * 沒有載入 Firebase（離線、直接開檔案）時 available() 是 false，系統照舊只在本機使用。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CloudStore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const CONFIG = {
    apiKey: "AIzaSyCAgwkGMvOUHD6phhPelyUdBGY0Ad1jdD0",
    authDomain: "office-e266d.firebaseapp.com",
    projectId: "office-e266d",
    storageBucket: "office-e266d.firebasestorage.app",
    messagingSenderId: "16014909954",
    appId: "1:16014909954:web:1c064a871ed00fb33e3d1b",
  };
  const SETTINGS = "v42_settings", CHUNKS = "v42_call_chunks", META = "v42_meta";
  const CHUNK_BYTES = 600000; // Firestore 每份文件上限約 1MB，留一半當安全範圍

  // ── 純計算（可在 node 測試）────────────────────────────────────────────
  function stripRow(row) {
    const out = {};
    Object.keys(row || {}).forEach(function (k) { if (k !== "shift" && k !== "shiftSource") out[k] = row[k]; });
    return out;
  }
  function byteLength(text) {
    let n = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xd800 && c <= 0xdbff) ? (i++, 4) : 3;
    }
    return n;
  }
  function hashText(text) { // FNV-1a，只用來判斷「這個月有沒有變」
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16) + ":" + text.length;
  }
  // rows → { "2026-08": { hash, count, chunks: ["[...]", "[...]"] } }
  function packByMonth(rows, chunkBytes) {
    const limit = chunkBytes || CHUNK_BYTES;
    const groups = {};
    (rows || []).forEach(function (r) { const m = r.monthKey || "unknown"; (groups[m] = groups[m] || []).push(stripRow(r)); });
    const out = {};
    Object.keys(groups).sort().forEach(function (m) {
      const chunks = [];
      let cur = [], size = 2;
      groups[m].forEach(function (r) {
        const t = JSON.stringify(r), b = byteLength(t) + 1;
        if (cur.length && size + b > limit) { chunks.push("[" + cur.join(",") + "]"); cur = []; size = 2; }
        cur.push(t); size += b;
      });
      if (cur.length) chunks.push("[" + cur.join(",") + "]");
      out[m] = { hash: hashText(chunks.join("|")), count: groups[m].length, chunks: chunks };
    });
    return out;
  }
  // 比對目前資料與雲端目錄：哪些月份要寫、哪些月份要刪
  function planCallSync(packed, metaMonths) {
    const old = metaMonths || {};
    const write = Object.keys(packed).filter(function (m) { return !old[m] || old[m].hash !== packed[m].hash; });
    const remove = Object.keys(old).filter(function (m) { return !packed[m]; });
    return { write: write, remove: remove };
  }

  // ── Firebase ────────────────────────────────────────────────────────────
  let auth = null, db = null;
  function available() { return typeof window !== "undefined" && !!window.firebase && typeof window.firebase.initializeApp === "function"; }
  function init() {
    if (db) return true;
    if (!available()) return false;
    const fb = window.firebase;
    const app = fb.apps.length ? fb.app() : fb.initializeApp(CONFIG);
    auth = app.auth();
    db = app.firestore();
    return true;
  }
  function onAuth(callback) {
    if (!init()) { callback(null); return function () {}; }
    return auth.onAuthStateChanged(callback);
  }
  function signIn(email, password) { init(); return auth.signInWithEmailAndPassword(String(email || "").trim(), password); }
  function signOut() { return init() ? auth.signOut() : Promise.resolve(); }
  function stamp() { return { updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(), updatedBy: (auth.currentUser && auth.currentUser.email) || "" }; }

  async function loadSettings() {
    init();
    const snap = await db.collection(SETTINGS).get();
    const out = {};
    snap.forEach(function (doc) { try { out[doc.id] = JSON.parse(doc.data().json); } catch (e) { } });
    return out;
  }
  function saveSetting(key, value) {
    init();
    return db.collection(SETTINGS).doc(key).set(Object.assign({ json: JSON.stringify(value == null ? null : value) }, stamp()));
  }

  let lastMeta = null; // 最近一次讀到／寫入的雲端目錄
  async function loadCalls() {
    init();
    const metaDoc = await db.collection(META).doc("calls").get();
    lastMeta = metaDoc.exists ? metaDoc.data() : { months: {}, fileNames: [] };
    const months = lastMeta.months || {};
    const snap = await db.collection(CHUNKS).get();
    const parts = {};
    snap.forEach(function (doc) {
      const d = doc.data();
      if (!months[d.month] || d.index >= months[d.month].chunks) return; // 舊的、沒用到的切塊
      (parts[d.month] = parts[d.month] || [])[d.index] = d.data;
    });
    const rows = [];
    Object.keys(parts).sort().forEach(function (m) { parts[m].forEach(function (t) { if (t) rows.push.apply(rows, JSON.parse(t)); }); });
    return { rows: rows, fileNames: lastMeta.fileNames || [], updatedAt: lastMeta.updatedAt || null, updatedBy: lastMeta.updatedBy || "" };
  }
  // 把目前全部資料存上雲端：只寫有變動的月份，刪掉已經不在的月份。
  // force＝true（手動同步）：每個月份都重寫一次，不管有沒有變動。
  async function saveCalls(rows, fileNames, force) {
    init();
    if (!lastMeta) {
      const metaDoc = await db.collection(META).doc("calls").get();
      lastMeta = metaDoc.exists ? metaDoc.data() : { months: {}, fileNames: [] };
    }
    const packed = packByMonth(rows);
    const plan = planCallSync(packed, force ? {} : lastMeta.months);
    if (force) plan.remove = Object.keys(lastMeta.months || {}).filter(function (m) { return !packed[m]; });
    const oldMonths = lastMeta.months || {};
    for (const m of plan.write) {
      const batch = db.batch();
      packed[m].chunks.forEach(function (text, i) { batch.set(db.collection(CHUNKS).doc(m + "_" + i), { month: m, index: i, data: text }); });
      for (let i = packed[m].chunks.length; i < ((oldMonths[m] && oldMonths[m].chunks) || 0); i++) batch.delete(db.collection(CHUNKS).doc(m + "_" + i));
      await batch.commit();
    }
    for (const m of plan.remove) {
      const batch = db.batch();
      for (let i = 0; i < (oldMonths[m].chunks || 0); i++) batch.delete(db.collection(CHUNKS).doc(m + "_" + i));
      await batch.commit();
    }
    const months = {};
    Object.keys(packed).forEach(function (m) { months[m] = { hash: packed[m].hash, count: packed[m].count, chunks: packed[m].chunks.length }; });
    const meta = Object.assign({ months: months, fileNames: fileNames || [], total: (rows || []).length }, stamp());
    await db.collection(META).doc("calls").set(meta);
    lastMeta = { months: months, fileNames: fileNames || [] };
    return { written: plan.write.length, removed: plan.remove.length };
  }

  // 雲端目前的狀況（只讀目錄，不讀電話資料）：共幾筆、幾個月、最後更新時間
  async function cloudSummary() {
    init();
    const doc = await db.collection(META).doc("calls").get();
    if (!doc.exists) return { total: 0, months: 0, updatedAt: null };
    const d = doc.data();
    const months = d.months || {};
    const total = Object.keys(months).reduce(function (n, m) { return n + (months[m].count || 0); }, 0);
    return { total: total, months: Object.keys(months).length, updatedAt: d.updatedAt && d.updatedAt.toDate ? d.updatedAt.toDate() : null };
  }

  function errorText(e) {
    const code = (e && e.code) || "";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found" || code === "auth/invalid-login-credentials") return "Email 或密碼不對，請再確認一次。";
    if (code === "auth/invalid-email") return "Email 格式不對。";
    if (code === "auth/too-many-requests") return "錯太多次了，請過幾分鐘再試。";
    if (code === "auth/network-request-failed" || code === "unavailable") return "連不上網路，請確認網路後再試。";
    if (code === "permission-denied") return "這個帳號沒有權限讀寫雲端資料（請確認 Firebase 的門鎖規則有這個 Email）。";
    return "發生錯誤：" + ((e && e.message) || code || "未知錯誤");
  }

  return { available, onAuth, signIn, signOut, loadSettings, saveSetting, loadCalls, saveCalls, cloudSummary, errorText, stripRow, byteLength, hashText, packByMonth, planCallSync };
});
