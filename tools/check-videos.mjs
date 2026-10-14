// アプリ内の ▶ 動画がまだ公開されているかを YouTube oEmbed で確認する
// 使い方: node tools/check-videos.mjs
import { createRequire } from "node:module";
const C = createRequire(import.meta.url)("../core.js");

let ng = 0;
for (const [name, v] of Object.entries(C.V)) {
  const url = "https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent("https://www.youtube.com/watch?v=" + v.id);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const j = await res.json();
    console.log("OK  ", v.id, j.author_name.padEnd(14), "|", j.title);
  } catch (e) {
    ng++;
    console.log("NG  ", v.id, name, v.t, "→", e.message, "（非公開・削除・埋め込み禁止のどれか）");
  }
}
console.log(ng ? `\n${ng}本が確認できませんでした。core.js の V を差し替えてください。` : "\nすべて公開中です。");
process.exitCode = ng ? 1 : 0;
