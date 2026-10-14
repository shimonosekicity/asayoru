// オフラインで開けるか・インストールできるかを Chrome で確かめる（開発用）
// 使い方: node tools/offline-check.mjs   （Chrome がインストールされていること）
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 8766, DBG = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = () => spawn("python", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: root, stdio: "ignore" });
let srv = server();
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=" + DBG, "--user-data-dir=" + mkdtempSync(join(tmpdir(), "asayoru-")), "--no-first-run", "about:blank"], { stdio: "ignore" });
await sleep(2500);

const targets = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json();
const ws = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r));
let id = 0; const pending = new Map();
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expr => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

const url = `http://127.0.0.1:${PORT}/`;
const out = {};
try {
  await send("Page.enable");
  await send("Page.navigate", { url });
  await sleep(3000);
  out.swReady = await evaluate("navigator.serviceWorker.ready.then(r => !!r.active)");
  out.caches = await evaluate("caches.keys()");
  out.cached = await evaluate("caches.open('asayoru-v1').then(c => c.keys()).then(k => k.map(r => new URL(r.url).pathname))");
  out.installErrors = (await send("Page.getInstallabilityErrors")).result?.installabilityErrors;
  out.manifestErrors = (await send("Page.getAppManifest")).result?.errors;
  await evaluate("document.querySelector('[data-do=am][data-v=full]').click(), 1");

  srv.kill(); await sleep(1000);                     // ← サーバーを止めて、オフライン状態にする
  out.serverDown = await fetch(url).then(() => false, () => true);   // Node から見てサーバーが止まっていること
  out.fontCache = await evaluate("caches.keys()");
  await send("Page.reload", { ignoreCache: true });
  await sleep(2500);
  out.offlineTitle = await evaluate("document.title");
  out.offlineAmTitle = await evaluate("document.querySelector('#amCard .title')?.textContent");
  out.offlineDoneKept = await evaluate("!!document.querySelector('#amCard .done-row')");
  await send("Page.navigate", { url: url + "?date=2026-11-10" });
  await sleep(2000);
  out.offlineWithQuery = await evaluate("document.querySelector('#dayPill')?.textContent");
} finally {
  console.log(JSON.stringify(out, null, 2));
  ws.close(); chrome.kill(); srv.kill();
}
