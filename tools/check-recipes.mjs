// アプリに入っているネットのレシピが、まだ見られるか・カロリーが変わっていないかを確かめる
// 使い方: node tools/check-recipes.mjs
import { createRequire } from "node:module";
const { WEB } = createRequire(import.meta.url)("../recipes.js");

let ng = 0, changed = 0;
for (const r of WEB) {
  try {
    const res = await fetch(r.url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const html = await res.text();
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => { try { return JSON.parse(m[1]); } catch { return null; } }).find(j => j && j["@type"] === "Recipe");
    if (!ld) throw new Error("レシピの情報が見つかりません");
    const kcal = Math.round(parseFloat(String(ld.nutrition?.calories || "").replace(/[^\d.]/g, "")));
    const note = kcal && kcal !== r.kcal ? `（カロリーが ${r.kcal} → ${kcal} に変わっています）` : "";
    if (note) changed++;
    console.log("OK  ", r.id, ld.name, note);
  } catch (e) {
    ng++;
    console.log("NG  ", r.id, r.name, "→", e.message);
  }
  await new Promise(ok => setTimeout(ok, 300));
}
console.log(`\n${WEB.length}件中 見られない:${ng}件 カロリー変更:${changed}件`);
process.exitCode = ng ? 1 : 0;
