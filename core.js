/* 朝晩28日メニュー — 画面に依存しない計算まわり（ブラウザとNodeのテストの両方で使う） */
(function (root) {
"use strict";

/* ---- 日付（すべて端末のローカル時刻の "YYYY-MM-DD" 文字列で扱う） ---- */
const pad = n => String(n).padStart(2, "0");
const ds = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ds(d); };
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const isYmd = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && ds(parse(s)) === s;
const isHm = s => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/* ---- 動画（2026-10-13 に YouTube oEmbed で公開中を確認済み）
   m＝動画の実際の長さ（分・四捨五入）。メニューの「約○分」はメインの動画の m を足して自動で計算する。
   中身は説明文・チャプターで確認（動画そのものは未視聴）。 ---- */
const V = {
  // 朝
  amYoga5:    { id: "GuxDXXYUjn0", m: 7,  t: "B-Flow 毎日5分の朝ヨガ" },
  amYoga5b:   { id: "BlJpibXWjzs", m: 7,  t: "B-Flow 5分朝ヨガ・全身をやさしくリセット" },
  nekoSori8:  { id: "2L9pUnyjoWo", m: 8,  t: "竹脇まりなch 猫背・反り腰解消ヨガ" },
  morning9:   { id: "6rTnwWhJzN4", m: 9,  t: "竹脇まりなch 寝たまま全身ストレッチ（反り腰改善）" },
  neko4:      { id: "hI9XRg4uaLY", m: 4,  t: "B-Flow 猫背・巻き肩リセット" },
  hip7:       { id: "6X6LGF1LSnI", m: 7,  t: "B-Flow 股関節をほぐして骨盤リセット" },
  kenko7:     { id: "URL0Lhk5hO4", m: 7,  t: "B-Flow 肩甲骨ほぐし" },
  amYoga10:   { id: "kO-3aNbttmQ", m: 10, t: "B-Flow 朝ヨガ10分" },
  amYoga9:    { id: "DODZzcgKfSE", m: 9,  t: "B-Flow 朝のやさしいストレッチヨガ" },
  sori11:     { id: "wOhJ4UJzn-U", m: 11, t: "B-Flow 反り腰改善ピラティスストレッチ" },
  // 夜：ヨガ・ストレッチ
  nightYoga:  { id: "sDCuD5gv_sw", m: 12, t: "竹脇まりな 初心者のための寝る前ヨガ" },
  bedYoga16:  { id: "fJJrJ2dd1U4", m: 16, t: "B-Flow 寝る前のヨガ" },
  bedStr11:   { id: "ZdoECl5OznE", m: 11, t: "B-Flow 寝たまま全身の疲れを取るストレッチ" },
  legStr6:    { id: "rm8qjygvHV8", m: 6,  t: "竹脇まりな 運動後の脚ストレッチ" },
  legMukumi:  { id: "y2xMLAF0XFg", m: 7,  t: "B-Flow 寝たまま脚のむくみリセット" },
  face5:      { id: "gzZTEPy-DwY", m: 5,  t: "竹脇まりな むくみ解消小顔マッサージ" },
  front10:    { id: "4swJQkLPFQI", m: 10, t: "B-Flow 前ももをほぐすストレッチ" },
  // 夜：お腹・反り腰（腰を反らせる脚上げ系はさける）
  absSafe4:   { id: "kcj40PNGgbQ", m: 4,  t: "竹脇まりな 初心者用・腰が痛くならない寝たまま下腹" },
  pelvic8:    { id: "iDExNhTqads", m: 8,  t: "B-Flow 姿勢改善・骨盤底筋ピラティス" },
  pil21:      { id: "26aFrEzofnk", m: 21, t: "B-Flow 初心者のためのやさしいピラティス（姿勢改善）" },
  soriLeg9:   { id: "laGkefFP0JI", m: 9,  t: "竹脇まりな 反り腰改善・太もも＆下腹ストレッチ" },
  mieySori:   { id: "V9TtNYwPUs4", m: 10, t: "miey 反り腰改善（運動は3分目から）" },
  mieyHip3:   { id: "9E94lvmH9fQ", m: 3,  t: "miey 股関節ムーブで下腹（美的チャンネル）" },
  // 夜：二の腕・脚・お尻
  arm4:       { id: "aVXzpKQKp60", m: 4,  t: "竹脇まりな 座ったまま二の腕" },
  mieyArm8:   { id: "eHPhExxllj8", m: 8,  t: "miey 二の腕やせ" },
  inner7:     { id: "Cb-2TisI4hs", m: 7,  t: "竹脇まりな 内もも ストレッチ＆筋トレ" },
  hip4:       { id: "VGqLNzCHdCo", m: 4,  t: "竹脇まりな 寝たまま太もも・お尻" },
  // 夜：脂肪燃焼（マンションOK）
  burn15:     { id: "hXyamPHNhkk", m: 15, t: "竹脇まりな 飛ばない有酸素15分" },
  burn20:     { id: "M5rpg8msrus", m: 24, t: "竹脇まりな 20分有酸素・マンションOK" },
  walk21:     { id: "2yBc-qPhF_M", m: 21, t: "竹脇まりな 20分室内散歩" }
};

/* ---- メニュー
   steps：上から順番にやること。[ 表示名, 動画（なければ null）, 動画がないときの分数 ]
   opt  ：時間と元気がある日だけ（やらなくてOK）
   tip  ：気をつけること ---- */
const TIP_HIP = "お尻を上げる・脚を動かす運動は、お腹を軽くへこませて腰を反らさないように。腰が痛いときはとばしてOK。";
const TIP_BURN = "きつい動きは、その場の足踏みにしてOK。マットを敷くと足音が響きにくいです。";
const NUM = "①②③④⑤⑥⑦⑧";
function menu(title, steps, opt, tip) {
  const main = steps.filter(s => s[1]).map(s => s[1]);
  return {
    title, opt: opt || [], tip: tip || "", main,
    // 動画が2本以上のときは、動画ボタンと同じ番号（①②…）を付ける
    items: steps.map(s => (s[1] && main.length > 1 ? NUM[main.indexOf(s[1])] + " " : "") + s[0] + (s[1] ? "（" + s[1].m + "分）" : (s[2] ? "（" + s[2] + "分）" : ""))),
    min: steps.reduce((a, s) => a + (s[1] ? s[1].m : (s[2] || 0)), 0)
  };
}
const AM = [
  menu("目覚めの朝ヨガ", [["朝ヨガで体を起こす", V.amYoga5], ["コップ1杯の水", null, 0]], [V.neko4, V.hip7]),
  menu("朝ヨガ＋肩甲骨", [["朝ヨガで全身をやさしく起こす", V.amYoga5b], ["肩甲骨まわしを10回", null, 1]], [V.kenko7, V.hip7]),
  menu("姿勢リセットヨガ", [["猫背・反り腰をほぐすヨガ", V.nekoSori8], ["壁に背中をつけて姿勢チェック", null, 1]], [V.amYoga10, V.sori11]),
  menu("寝たまま姿勢リセット", [["前もも・胸・お尻をのばして、最後に体幹", V.morning9], ["通勤や買い物で少し多めに歩く", null, 0]], [V.amYoga9, V.sori11])
];
const AM_MINI = "ベッドの上で大きく伸びを1分＋水を1杯";
const PMENU = {
  w1:    menu("ヨガ＋お腹・二の腕", [["寝る前ヨガ", V.nightYoga], ["腰が痛くならない下腹トレ", V.absSafe4], ["座ったまま二の腕", V.arm4]], [V.front10, V.hip7]),
  pilA:  menu("ピラティス＋二の腕＋内もも", [["姿勢を整えるやさしいピラティス", V.pil21], ["座ったまま二の腕", V.arm4], ["内もも", V.inner7]], [V.front10]),
  burnA: menu("脂肪燃焼＋お尻＋二の腕", [["飛ばない有酸素（脂肪燃焼）", V.burn15], ["お尻・太もも", V.hip4], ["座ったまま二の腕", V.arm4], ["脚のストレッチ", V.legStr6]], [V.inner7], TIP_HIP + TIP_BURN),
  yogaA: menu("ヨガ＋お腹＋脚のむくみ", [["寝る前ヨガ", V.bedYoga16], ["骨盤底筋ピラティス（ぽっこりお腹）", V.pelvic8], ["脚のむくみ取り", V.legMukumi]], [V.absSafe4]),
  pilB:  menu("燃焼＋反り腰ケア＋お腹", [["飛ばない有酸素（先に燃やす）", V.burn15], ["反り腰改善（3分目から）", V.mieySori], ["骨盤底筋ピラティス", V.pelvic8], ["座ったまま二の腕", V.arm4]], [V.mieyArm8, V.front10], TIP_BURN),
  burnB: menu("しっかり燃焼＋お尻＋お腹", [["有酸素（脂肪燃焼）", V.burn20], ["お尻・太もも", V.hip4], ["腰が痛くならない下腹トレ", V.absSafe4], ["座ったまま二の腕", V.arm4], ["脚のストレッチ", V.legStr6]], [V.inner7], TIP_HIP + TIP_BURN),
  yogaB: menu("ヨガ＋反り腰＋むくみ取り", [["寝る前ヨガ", V.bedYoga16], ["反り腰・太もも・下腹ストレッチ", V.soriLeg9], ["脚のむくみ取り", V.legMukumi], ["顔のむくみマッサージ", V.face5]], [V.mieyHip3]),
  walk:  menu("おさんぽ＋脚＋二の腕", [["15〜20分の散歩（雨の日は室内散歩の動画）", V.walk21], ["内もも", V.inner7], ["座ったまま二の腕", V.arm4], ["寝る前ストレッチ", V.bedStr11]], [], TIP_HIP),
  rest: null
};
const REST_LINKS = [V.bedStr11];
const PM_MINI = "好きなストレッチを5分だけ";
// getDay() の順: 日 月 火 水 木 金 土
const PM = [
  ["rest", "w1", "w1", "w1", "w1", "w1", "w1"],
  ["rest", "pilA", "burnA", "pilA", "burnA", "pilA", "yogaA"],
  ["rest", "pilB", "burnB", "pilB", "burnB", "yogaB", "burnB"],
  ["rest", "pilB", "burnB", "pilB", "burnB", "yogaB", "walk"]
];
const WEEKNAME = ["1週目：慣れる", "2週目：習慣にする", "3週目：燃やす", "4週目：仕上げ"];
const wname = (r, wk) => r === 0 ? WEEKNAME[wk] : (r + 1) + "周目・" + (wk + 1) + "週目";
const FEELS = ["むくみが少ない", "よく眠れた", "姿勢を意識できた", "体が軽い", "服がゆるく感じた", "お腹がへこんで見えた"];
const FOODS = ["夜ごはんの主食を半分にした", "毎食タンパク質をとった（卵・納豆・豆腐・肉・魚）", "飲み物は水かお茶にした", "塩分ひかえめ＆夜食なし（顔のむくみ対策）"];
const MILES = [1, 3, 7, 14, 28, 50, 100, 200];

/* ---- 1日ぶんの情報 ---- */
function dayInfo(state, dstr) {
  const idx = diffDays(state.start, dstr);
  const round = idx < 0 ? 0 : Math.floor(idx / 28), dr = idx < 0 ? 0 : idx % 28, wk = Math.floor(dr / 7);
  const w = round === 0 ? wk : (wk % 2 === 0 ? 2 : 3); // 2周目以降は3・4週目のメニューを交互に
  const dow = parse(dstr).getDay();
  return { idx, round, dr, wk, w, dow, am: AM[w], pmKey: PM[w][dow], pm: PMENU[PM[w][dow]] };
}
const key = (d, s) => d + "|" + s;
const isDone = (state, d, s) => !!state.done[key(d, s)];
const didMove = (state, d) => isDone(state, d, "am") || isDone(state, d, "pm");

/** "both"＝朝晩とも / "half"＝どちらか / "restd"＝休む日で何もしていない / "none"＝何もしていない */
function dayScore(state, d) {
  const i = dayInfo(state, d), a = isDone(state, d, "am"), p = isDone(state, d, "pm");
  if (!i.pm) return a || p ? "both" : "restd";
  return a && p ? "both" : (a || p ? "half" : "none");
}

/** 連続日数。1日だけ空いてもつながる。2日続けて空いたら途切れる。
 *  今日はまだ終わっていないので、今日が未記録でも「休み」には数えない。休む日（日曜夜）は数えないし、途切れもしない。 */
function streak(state, today) {
  let d = today, n = 0;
  if (dayScore(state, d) === "none") d = addDays(d, -1);
  while (diffDays(state.start, d) >= 0) {
    const s = dayScore(state, d);
    if (s === "none") {
      const pv = addDays(d, -1);
      if (diffDays(state.start, pv) >= 0 && dayScore(state, pv) !== "none") { d = pv; continue; }
      break;
    }
    if (s !== "restd") n++;
    d = addDays(d, -1);
  }
  return n;
}

function totals(state) {
  let n = 0, m = 0;
  for (const k in state.done) {
    const mm = k.match(/^(\d{4}-\d{2}-\d{2})\|(am|pm)$/);
    if (!mm) continue;
    n++;
    if (state.done[k] === "mini") m += 5;
    else { const i = dayInfo(state, mm[1]); const x = mm[2] === "am" ? i.am : i.pm; m += x ? x.min : 5; }
  }
  return { n, m };
}

/** 最後に体を動かした日（今日をふくむ。なければ null） */
function lastActive(state, today) {
  let best = null;
  for (const k in state.done) {
    const mm = k.match(/^(\d{4}-\d{2}-\d{2})\|(am|pm)$/);
    if (mm && diffDays(mm[1], today) >= 0 && (!best || mm[1] > best)) best = mm[1];
  }
  return best;
}

/** 「おかえりなさい」を出すか：最後に動いた日（記録がなければスタート前日）から3日以上たっていて、今日はまだ何もしていない */
function welcomeBack(state, today) {
  if (diffDays(state.start, today) < 0 || didMove(state, today)) return false;
  const ref = lastActive(state, today) || addDays(state.start, -1);
  return diffDays(ref, today) >= 3;
}

/* ---- 体重 ---- */
function weightDates(state) { return Object.keys(state.body).filter(d => state.body[d] && state.body[d].w).sort(); }
function avg7(state, dates, d) {
  const vals = dates.filter(x => diffDays(x, d) >= 0 && diffDays(x, d) < 7).map(x => state.body[x].w);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

/* ---- 食事のカロリー ---- */
/** カロリーの目安（Mifflin-St Jeor式・女性）。年齢がないときは null。
 *  基礎代謝 × 1.4（毎日30〜45分ほど動く）− 400kcal。ただし 1,200kcal と基礎代謝より下にはしない */
function kcalTarget(profile, weight) {
  if (!profile || !profile.age || !profile.height || !weight) return null;
  const bmr = 10 * weight + 6.25 * profile.height - 5 * profile.age - 161;
  const tdee = bmr * 1.4;
  const target = Math.max(tdee - 400, bmr, 1200);
  const lo = Math.floor(target / 50) * 50;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), target: Math.round(target), lo, hi: lo + 150 };
}
/** カロリーの記録（設定でオンにしたときだけ使う）：朝・昼・夜・おやつに入れた数字＋追加した分 */
function mealTotal(state, d) {
  const m = (state.meals || {})[d] || {};
  let kcal = 0;
  for (const k of MEAL_SLOTS) if (typeof m[k] === "number") kcal += m[k];
  for (const x of (m.extra || [])) kcal += x;
  return kcal;
}

/* ---- 夜ごはんのおすすめ・1週間の予定 ---- */
const SIDE_RICE = { kcal: 117, p: 2 };   // ごはん半分（75g）
const SIDE_MISO = { kcal: 45, p: 4 };    // 豆腐とわかめのみそ汁
const DEFAULT_RANGE = { lo: 1200, hi: 1350 };
// 朝・昼・おやつのだいたいの量（レシピは出さないので、ふつうに食べた場合の目安）
const DAY_REST = { am: 300, lunch: 450, snack: 100 };
/** 夜ごはんの候補：アプリのレシピ（own0〜6）＋ネットのレシピ。kcal・p は「ごはん半分・みそ汁こみ」の夜ごはん全体 */
function dinnerPool(Meals, Recipes) {
  const OWN_TAGS = ["fish", "chicken", "meat", "fish", "sea", "chicken", "tofu"]; // アプリのレシピの主菜
  const own = Meals.DINNERS.map((d, k) => ({ id: "own" + k, kind: "own", name: d.name, kcal: d.kcal, p: d.p, tag: OWN_TAGS[k], dish: d }));
  const web = Recipes.WEB.map(r => ({ id: r.id, kind: "web", name: r.name, tag: r.tag, web: r,
    kcal: r.kcal + SIDE_RICE.kcal + (r.soup ? 0 : SIDE_MISO.kcal), p: r.p + SIDE_RICE.p + (r.soup ? 0 : SIDE_MISO.p) }));
  return own.concat(web);
}
/** 文字列から決まった数を作る（日付ごとに、毎回同じおすすめ順にするため） */
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** 夜ごはんにちょうどいいカロリー：1日の目安 −（朝・昼・おやつのだいたいの量） */
function dinnerBudget(range) {
  const r = range || DEFAULT_RANGE, rest = DAY_REST.am + DAY_REST.lunch + DAY_REST.snack;
  return { lo: r.lo - rest, hi: r.hi - rest, rest };
}
const fits = (x, b) => x.kcal >= b.lo - 30 && x.kcal <= b.hi + 30;
/** その日のおすすめ順（予算に合うもの → 合わないもの。どちらも日付ごとのばらばらな順） */
function dinnerOrder(d, pool, range) {
  const b = dinnerBudget(range);
  const dist = x => x.kcal < b.lo ? b.lo - x.kcal : (x.kcal > b.hi ? x.kcal - b.hi : 0);
  return pool.slice().sort((a, c) => (fits(c, b) - fits(a, b)) || (fits(a, b) ? 0 : dist(a) - dist(c)) || (hash(d + a.id) - hash(d + c.id)));
}
/** アプリが自動で選ぶ夜ごはん。
 *  スタート日から7日ごとの区切り（週）の中で、前の日から順番に決めていく。
 *  同じ週の中では同じレシピを出さない・前の日と主菜の種類（鶏・魚…）を変える・自分で選んだレシピとかぶらない。
 *  区切りの最初から順に決めるので、あとから見ても同じ日のおすすめは変わらない（自分で選び直した日より後ろだけが変わる） */
function autoWeek(state, ws, pool, range, prev, prevUsed) {
  const picks = {}, used = new Set(prevUsed || []);
  for (let k = 0; k < 7; k++) { const x = (state.dinners || {})[addDays(ws, k)]; if (x && x.r) used.add(x.r); }
  let last = prev || null;
  for (let k = 0; k < 7; k++) {
    const d = addDays(ws, k), x = (state.dinners || {})[d];
    const order = dinnerOrder(d, pool, range);
    const ok = c => !used.has(c.id) && (!last || c.id !== last.id);
    const pick = order.find(c => ok(c) && (!last || c.tag !== last.tag)) || order.find(ok) || order[0];
    picks[d] = pick; used.add(pick.id);
    const chosen = x && x.r && pool.find(c => c.id === x.r);
    last = chosen || (x && x.name ? { id: null, tag: "custom" } : pick);
  }
  return { picks, last };
}
function autoDinner(state, d, pool, range) {
  const idx = diffDays(state.start, d);
  const ws = addDays(state.start, Math.floor(idx / 7) * 7);
  // 前の週は「その前の週」を見ずに決めたものを使う（こうすると、どの日から見ても同じ結果になる）
  const pw = autoWeek(state, addDays(ws, -7), pool, range, null, null);
  return autoWeek(state, ws, pool, range, pw.last, Object.values(pw.picks).map(x => x.id)).picks[d];
}
/** その日の夜ごはん（自分で決めたもの → なければおすすめ）。chosen：自分で決めたかどうか */
function dinnerFor(state, d, pool, range) {
  const x = (state.dinners || {})[d];
  if (x && x.r) { const hit = pool.find(p => p.id === x.r); if (hit) return Object.assign({ chosen: true }, hit); }
  if (x && x.name) return { id: null, kind: "custom", tag: "custom", chosen: true, name: x.name, kcal: x.kcal || 450, kcalUnknown: !x.kcal, p: null, url: x.url || null };
  return Object.assign({ chosen: false }, autoDinner(state, d, pool, range));
}

/* ---- 体重の目標 ---- */
const PACE = 0.5; // 無理のないペース：1週間に0.5kg
/** スタート体重・いま（7日平均）・目標から、進み具合を計算する。体重の記録がなければ null */
function goalProgress(state, today) {
  const dates = weightDates(state).filter(d => diffDays(d, today) >= 0);
  if (!dates.length) return null;
  const pr = state.profile || DEFAULT_PROFILE;
  const first = dates[0], last = dates[dates.length - 1];
  const start = pr.startW || state.body[first].w;
  const now = avg7(state, dates, last);
  const goal = pr.goal;
  const total = start - goal;
  const lost = start - now;
  const pct = total > 0 ? Math.max(0, Math.min(100, lost / total * 100)) : 0;
  const remain = Math.max(0, now - goal);
  const weeks = diffDays(first, last) / 7;
  const paceW = Math.max(goal, start - PACE * weeks);          // 目安ペースどおりなら、いまごろの体重
  const status = weeks < 1 ? "early" : (now <= paceW + 0.2 ? "ahead" : (now <= paceW + 1 ? "close" : "slow"));
  const eta = remain > 0 ? addDays(today, Math.ceil(remain / PACE * 7)) : today; // 目安ペースで進んだときの到着日
  return { start, now, goal, lost, pct, remain, first, last, weeks, paceW, status, eta, mile: Math.max(0, Math.floor(lost + 1e-9)) };
}

/* ---- 保存データ ---- */
const STORE_KEY = "asayoru28";
const DEFAULT_SETTINGS = { amTime: "07:00", pmTime: "21:00", theme: "auto", calUntil: null, lastBackup: null, nudgeOff: null, kcalLog: false };
// からだの目標（身長・目標体重はあらかじめ入れておく。年齢は本人が入れたときだけカロリーの目安を出す）
const DEFAULT_PROFILE = { height: 148, goal: 51, startW: null, age: null };
const MEAL_SLOTS = ["am", "lunch", "dinner", "snack"];
function emptyState(today) { return { v: 4, start: today, done: {}, body: {}, meals: {}, dinners: {}, profile: Object.assign({}, DEFAULT_PROFILE), settings: Object.assign({}, DEFAULT_SETTINGS) }; }

/** 読み込んだデータを点検して、正しい形にそろえる。おかしいときは Error を投げる */
function normalize(raw) {
  if (raw && raw.app === "asayoru28" && raw.data) raw = raw.data;   // バックアップファイルの形
  if (!raw || typeof raw !== "object") throw new Error("データの形がちがいます");
  if (!isYmd(raw.start)) throw new Error("スタート日が読み取れません");
  const out = emptyState(raw.start);
  const doneRe = /^(\d{4}-\d{2}-\d{2})\|(am|pm|food[0-3]|feel[0-5])$/;
  for (const k in (raw.done || {})) {
    const m = k.match(doneRe), v = raw.done[k];
    if (!m || !isYmd(m[1]) || !v) continue;
    if (m[2] === "am" || m[2] === "pm") out.done[k] = v === "mini" ? "mini" : "full";
    else out.done[k] = 1;
  }
  for (const d in (raw.body || {})) {
    const b = raw.body[d];
    if (!isYmd(d) || !b || typeof b !== "object") continue;
    const e = {};
    if (typeof b.w === "number" && b.w > 20 && b.w < 200) e.w = b.w;
    if (typeof b.c === "number" && b.c > 30 && b.c < 200) e.c = b.c;
    if (e.w || e.c) out.body[d] = e;
  }
  const s = raw.settings || {};
  if (isHm(s.amTime)) out.settings.amTime = s.amTime;
  if (isHm(s.pmTime)) out.settings.pmTime = s.pmTime;
  if (["auto", "light", "dark"].includes(s.theme)) out.settings.theme = s.theme;
  if (isYmd(s.calUntil)) out.settings.calUntil = s.calUntil;
  if (isYmd(s.lastBackup)) out.settings.lastBackup = s.lastBackup;
  if (isYmd(s.nudgeOff)) out.settings.nudgeOff = s.nudgeOff;
  if (s.kcalLog === true) out.settings.kcalLog = true;
  const pr = raw.profile || {};
  const num = (v, lo, hi) => typeof v === "number" && v >= lo && v <= hi;
  if (num(pr.height, 120, 200)) out.profile.height = pr.height;
  if (num(pr.goal, 30, 150)) out.profile.goal = pr.goal;
  if (num(pr.startW, 30, 200)) out.profile.startW = pr.startW;
  if (num(pr.age, 15, 90)) out.profile.age = pr.age;
  if (num(pr.mile, 0, 100)) out.profile.mile = pr.mile;
  for (const d in (raw.meals || {})) {
    const m = raw.meals[d];
    if (!isYmd(d) || !m || typeof m !== "object") continue;
    const e = {};
    for (const k of MEAL_SLOTS) if (num(m[k], 50, 3000)) e[k] = Math.round(m[k]);
    if (Array.isArray(m.extra)) { const x = m.extra.filter(v => num(v, 1, 3000)); if (x.length) e.extra = x; }
    if (Object.keys(e).length) out.meals[d] = e;
  }
  for (const d in (raw.dinners || {})) {
    const x = raw.dinners[d];
    if (!isYmd(d) || !x || typeof x !== "object") continue;
    if (typeof x.r === "string" && /^(aj\d{6}|own[0-6])$/.test(x.r)) out.dinners[d] = { r: x.r };
    else if (typeof x.name === "string" && x.name.trim()) {
      const e = { name: x.name.trim().slice(0, 40) };
      if (num(x.kcal, 50, 2000)) e.kcal = Math.round(x.kcal);
      if (typeof x.url === "string" && /^https?:\/\/\S+$/.test(x.url) && x.url.length < 500) e.url = x.url;
      out.dinners[d] = e;
    }
  }
  return out;
}

function exportPayload(state, now) {
  return { app: "asayoru28", version: 2, exportedAt: now.toISOString(), data: state };
}

/* ---- カレンダー（.ics）---- */
function icsEscape(s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
/** 1行75バイト（UTF-8）で折り返す。日本語の途中で切らない */
function icsFold(line) {
  const enc = c => { const p = c.codePointAt(0); return p < 0x80 ? 1 : p < 0x800 ? 2 : p < 0x10000 ? 3 : 4; };
  const out = []; let cur = "", bytes = 0, limit = 75;
  for (const ch of line) {
    const b = enc(ch);
    if (bytes + b > limit) { out.push(cur); cur = " "; bytes = 1; limit = 75; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join("\r\n");
}
const icsDate = (d, hm) => d.replace(/-/g, "") + "T" + hm.replace(":", "") + "00";
function icsStamp(now) {
  return now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + "T" + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + "Z";
}

/** from の日から days 日ぶん、朝と夜のお知らせつき予定を作る（日曜夜の休みは入れない） */
function buildICS(opts) {
  const { start, amTime, pmTime, from, days, appUrl } = opts;
  const st = { start, done: {} };
  const stamp = icsStamp(opts.now || new Date());
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//asayoru28//JA", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:朝晩28日メニュー"];
  const until = addDays(from, days - 1);
  let count = 0;
  for (let k = 0; k < days; k++) {
    const d = addDays(from, k), i = dayInfo(st, d), last = k === days - 1;
    const slots = [["am", "☀ 朝", i.am, amTime], ["pm", "🌙 夜", i.pm, pmTime]];
    for (const [slot, label, m, hm] of slots) {
      if (!m) continue;
      const desc = (i.idx < 0 ? "スタート前のおためし\n" : wname(i.round, i.wk) + "\n") + m.items.map(x => "・" + x).join("\n") +
        "\n\nつらい日は「5分だけ版」でもOK。" + (appUrl ? "\nアプリ: " + appUrl : "") +
        (last ? "\n\n※お知らせはここまでです。アプリの「お知らせ」から次の分を追加してください。" : "");
      L.push("BEGIN:VEVENT",
        "UID:asayoru28-" + d.replace(/-/g, "") + "-" + slot + "@asayoru28",
        "DTSTAMP:" + stamp,
        "DTSTART:" + icsDate(d, hm),
        "DURATION:PT" + m.min + "M",
        "SUMMARY:" + icsEscape(label + "：" + m.title + "（約" + m.min + "分）"),
        "DESCRIPTION:" + icsEscape(desc));
      if (appUrl) L.push("URL:" + appUrl);
      L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEscape(label + "のメニュー：" + m.title), "TRIGGER:PT0M", "END:VALARM", "END:VEVENT");
      count++;
    }
  }
  L.push("END:VCALENDAR");
  return { text: L.map(icsFold).join("\r\n") + "\r\n", until, count };
}

const api = {
  pad, ds, parse, addDays, diffDays, isYmd, isHm,
  V, NUM, AM, AM_MINI, PMENU, PM, PM_MINI, REST_LINKS, WEEKNAME, wname, FEELS, FOODS, MILES,
  dayInfo, key, isDone, didMove, dayScore, streak, totals, lastActive, welcomeBack,
  weightDates, avg7, STORE_KEY, DEFAULT_SETTINGS, DEFAULT_PROFILE, MEAL_SLOTS, emptyState, normalize, exportPayload,
  kcalTarget, mealTotal, PACE, goalProgress,
  SIDE_RICE, SIDE_MISO, DEFAULT_RANGE, DAY_REST, dinnerPool, dinnerBudget, dinnerOrder, autoDinner, dinnerFor,
  icsEscape, icsFold, buildICS
};
if (typeof module === "object" && module.exports) module.exports = api;
else root.Core = api;
})(typeof self !== "undefined" ? self : this);
