/* 朝晩28日メニュー — 画面の動き */
(function () {
"use strict";
const C = window.Core;
const { ds, parse, addDays, diffDays, isYmd, isHm, key } = C;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const md = s => { const d = parse(s); return (d.getMonth() + 1) + "/" + d.getDate(); };
const WD = "日月火水木金土";

/* ---- 端末の種類 ---- */
const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, "");

/* ---- 今日の日付（?date=YYYY-MM-DD でテスト用に日付をずらせる） ---- */
const testDate = (() => { const v = new URLSearchParams(location.search).get("date"); return isYmd(v) ? v : null; })();
const getToday = () => testDate || ds(new Date());
let today = getToday();

// Safari用「カレンダーに追加」画面（#cal=スタート日,朝,夜,開始日）で開かれたか
const CAL_MODE = location.hash.startsWith("#cal=");

/* ---- 読み込み・保存 ---- */
let state;
let saveFailed = false;
(function load() {
  let raw = null;
  try { raw = localStorage.getItem(C.STORE_KEY); } catch (e) {}
  if (!raw) { state = C.emptyState(today); if (!CAL_MODE) save(); return; }  // スタート日をすぐ保存（翌日に Day 1 に戻らないように）
  try { state = C.normalize(JSON.parse(raw)); }
  catch (e) {
    // 読めないデータは消さずに別名で残しておく
    try { localStorage.setItem(C.STORE_KEY + "-broken-" + Date.now(), raw); } catch (e2) {}
    state = C.emptyState(today);
  }
})();
function save() {
  try { localStorage.setItem(C.STORE_KEY, JSON.stringify(state)); saveFailed = false; }
  catch (e) { if (!saveFailed) toast("保存できませんでした。容量がいっぱいかもしれません"); saveFailed = true; }
}
// ブラウザが勝手にデータを消さないようにお願いする（対応ブラウザのみ）
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(renderStorageNote).catch(() => {});

/* ---- 表示 ---- */
const vidLink = (v, mark) => '<a class="pick" href="https://www.youtube.com/watch?v=' + v.id + '" target="_blank" rel="noopener">' + (mark ? '<span class="num">' + mark + '</span>' : '') + esc(v.t) + '（' + v.m + '分）</a>';
function videosHTML(m) {
  let h = '<div class="links">' + m.main.map((v, k) => vidLink(v, m.main.length > 1 ? C.NUM[k] : "")).join("") + '</div>';
  if (m.opt.length) h += '<p class="opt-label">時間と元気があれば（やらなくてOK）</p><div class="links opt">' + m.opt.map(v => vidLink(v)).join("") + '</div>';
  if (m.tip) h += '<p class="tip">' + esc(m.tip) + '</p>';
  return h;
}
function slotHTML(slot, m) {
  const label = slot === "am" ? "MORNING 朝" : "NIGHT 夜";
  if (!m) return '<div class="slot-top"><span class="tag">' + label + '</span><span class="min">休む日</span></div><p class="title">今日はお休み</p><p class="rest">体を休めるのも大事なメニューです。物足りなければ、ストレッチを少しだけでもOK。</p><div class="links opt">' + C.REST_LINKS.map(v => vidLink(v)).join("") + '</div>';
  const v = state.done[key(today, slot)];
  let h = '<div class="slot-top"><span class="tag">' + label + '</span><span class="min">約' + m.min + '分</span></div><p class="title">' + esc(m.title) + '</p><ul class="items">' + m.items.map(i => '<li' + (C.NUM.includes(i[0]) ? ' class="n"' : '') + '>' + esc(i) + '</li>').join("") + '</ul>' + videosHTML(m);
  if (v) h += '<div class="done-row"><span>✓ ' + (v === "mini" ? "5分だけ版" : "できた！") + '</span><button data-undo="' + slot + '">取り消す</button></div>';
  else h += '<div class="btns"><button class="full" data-do="' + slot + '" data-v="full">できた！</button><button class="mini" data-do="' + slot + '" data-v="mini">5分だけ版</button></div><p class="note">5分だけ版：' + (slot === "am" ? C.AM_MINI : C.PM_MINI) + '</p>';
  return h;
}
function chartSVG() {
  const dates = C.weightDates(state);
  if (dates.length < 2) return '<p class="note">2回記録するとグラフが出ます。</p>';
  const from = dates[0], to = dates[dates.length - 1] > today ? dates[dates.length - 1] : today, span = Math.max(6, diffDays(from, to));
  const W = 320, H = 150, L = 34, Rr = 8, T = 10, B = 22;
  const ws = dates.map(d => state.body[d].w);
  const gp = C.goalProgress(state, today);
  let lo = Math.floor(Math.min(...ws, gp ? gp.goal : Infinity) - 0.5), hi = Math.ceil(Math.max(...ws, gp ? gp.start : -Infinity) + 0.5); if (hi - lo < 2) hi = lo + 2;
  const X = d => L + (W - L - Rr) * diffDays(from, d) / span, Y = v => T + (H - T - B) * (hi - v) / (hi - lo);
  let g = ""; const step = Math.max(1, Math.round((hi - lo) / 3));
  for (let v = lo; v <= hi; v += step) g += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" style="stroke:var(--line)"/><text x="' + (L - 5) + '" y="' + (Y(v) + 3) + '" text-anchor="end">' + v + '</text>';
  g += '<text x="' + L + '" y="' + (H - 6) + '">' + md(from) + '</text><text x="' + (W - Rr) + '" y="' + (H - 6) + '" text-anchor="end">' + md(to) + '</text>';
  if (gp) {
    // 目標の線と、1週間0.5kgの目安ペースの線（点線）
    g += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(gp.goal).toFixed(1) + '" y2="' + Y(gp.goal).toFixed(1) + '" style="stroke:var(--ok);stroke-width:1.5;stroke-dasharray:4 3"/><text x="' + (W - Rr - 2) + '" y="' + (Y(gp.goal) - 4).toFixed(1) + '" text-anchor="end" style="fill:var(--ok)">目標 ' + gp.goal + '</text>';
    const paceAt = d => Math.max(gp.goal, gp.start - C.PACE * diffDays(gp.first, d) / 7);
    g += '<line x1="' + X(gp.first).toFixed(1) + '" y1="' + Y(gp.start).toFixed(1) + '" x2="' + X(to).toFixed(1) + '" y2="' + Y(paceAt(to)).toFixed(1) + '" style="stroke:var(--am);stroke-width:1.5;stroke-dasharray:2 3"/>';
  }
  g += dates.map(d => '<circle cx="' + X(d).toFixed(1) + '" cy="' + Y(state.body[d].w).toFixed(1) + '" r="2.5" style="fill:var(--muted);opacity:.5"/>').join("");
  const line = dates.map(d => X(d).toFixed(1) + "," + Y(C.avg7(state, dates, d)).toFixed(1)).join(" ");
  g += '<polyline points="' + line + '" style="fill:none;stroke:var(--pm);stroke-width:3;stroke-linejoin:round;stroke-linecap:round"/>';
  const last = dates[dates.length - 1];
  g += '<circle cx="' + X(last).toFixed(1) + '" cy="' + Y(C.avg7(state, dates, last)).toFixed(1) + '" r="4.5" style="fill:var(--pm)"/>';
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="体重の7日平均の推移">' + g + '</svg>';
}

function render() {
  const i = C.dayInfo(state, today), dt = parse(today);
  $("dateLine").textContent = (dt.getMonth() + 1) + "月" + dt.getDate() + "日（" + WD[i.dow] + "）・" + (i.idx < 0 ? "スタート前" : C.wname(i.round, i.wk));
  const pill = $("dayPill");
  pill.textContent = (testDate ? "テスト日付 · " : "") + (i.idx < 0 ? "開始まで" + (-i.idx) + "日" : (i.round === 0 ? "Day " + (i.dr + 1) + " / 28" : (i.round + 1) + "周目 · Day " + (i.dr + 1)));
  pill.classList.toggle("test", !!testDate);
  $("back").hidden = !C.welcomeBack(state, today);
  $("amCard").innerHTML = slotHTML("am", i.am);
  $("pmCard").innerHTML = slotHTML("pm", i.pm);

  $("streak").textContent = C.streak(state, today);
  const t = C.totals(state);
  $("total").textContent = t.n; $("mins").textContent = t.m;
  $("badges").innerHTML = C.MILES.map(m => '<span class="badge' + (t.n >= m ? ' on' : '') + '">' + (t.n >= m ? '★ ' : '') + m + '回</span>').join("");
  const nx = C.MILES.find(m => t.n < m);
  $("nextBadge").textContent = nx ? "次のバッジ（" + nx + "回）まで、あと" + (nx - t.n) + "回" : "全部のバッジを集めました！";

  const bd = C.weightDates(state);
  const wd = bd.length > 1 ? C.avg7(state, bd, bd[bd.length - 1]) - state.body[bd[0]].w : null;
  $("wdiff").textContent = wd === null ? "–" : (wd > 0 ? "+" : "") + wd.toFixed(1);
  const cd = Object.keys(state.body).filter(d => state.body[d].c).sort();
  let kv = "";
  if (cd.length) {
    const cl = state.body[cd[cd.length - 1]].c, cf = state.body[cd[0]].c;
    kv += '<span>お腹まわり <b>' + cl + '</b> cm' + (cd.length > 1 ? '（最初から ' + (cl - cf > 0 ? '+' : '') + (cl - cf).toFixed(1) + '）' : '') + '</span>';
  }
  $("bodyKv").innerHTML = kv;
  $("chart").innerHTML = chartSVG();
  renderGoal();
  renderMeal();

  $("feels").innerHTML = C.FEELS.map((f, k) => '<button class="chip" data-feel="' + k + '" aria-pressed="' + C.isDone(state, today, "feel" + k) + '">' + f + '</button>').join("");
  let fc = 0;
  for (let k = 0; k < 7; k++) for (let f = 0; f < C.FEELS.length; f++) if (C.isDone(state, addDays(today, -k), "feel" + f)) fc++;
  $("feelNote").textContent = fc ? "この7日間で、体のいい変化を" + fc + "個見つけました。" : "体重より先に、こういう変化が出てきます。当てはまるものをタップ。";

  let g = "";
  const r0 = i.round;
  $("gridTitle").textContent = r0 === 0 ? "28日のきろく" : (r0 + 1) + "周目のきろく";
  for (let k = 0; k < 28; k++) {
    if (k % 7 === 0) g += '<div class="wk">' + C.wname(r0, k / 7) + '</div>';
    const d = addDays(state.start, r0 * 28 + k);
    const future = diffDays(today, d) > 0;
    let cls = future ? "" : C.dayScore(state, d);
    if (cls === "none") cls = "";
    if (future && !C.dayInfo(state, d).pm) cls = "restd";
    g += '<div class="d ' + cls + (d === today ? " today" : "") + '" title="' + d + '">' + md(d) + '</div>';
  }
  $("grid").innerHTML = g;

  C.FOODS.forEach((_, f) => { $("f" + f).checked = C.isDone(state, today, "food" + f); });
  $("startIn").value = state.start;
  $("amTime").value = state.settings.amTime;
  $("pmTime").value = state.settings.pmTime;
  $("themeSel").value = state.settings.theme;
  const pr = state.profile;
  $("pHeight").value = pr.height || ""; $("pAge").value = pr.age || ""; $("pStart").value = pr.startW || ""; $("pGoal").value = pr.goal || "";
  renderNudge(t.n);
  renderCalStatus();
  renderBackupStatus();
}

/* ---- 体重の目標 ---- */
const GOAL_MSG = {
  early: "記録を続けると、目安ペースとくらべられます。まずは1週間、気楽に。",
  ahead: "目安ペースより順調です！ この調子で、無理せずいきましょう。",
  close: "ほぼ目安ペースどおり。体重はゆっくりでOK、続けていることが一番です。",
  slow: "体重はゆっくりめ。でも、お腹まわりや体の変化が先に出ることも多いです。続けている自分にマル。"
};
function renderGoal() {
  const gp = C.goalProgress(state, today), el = $("goalBox");
  if (!gp) { el.innerHTML = '<p class="note">体重を記録すると、目標（' + state.profile.goal + 'kg）までの進み具合がここに出ます。</p>'; return; }
  const total = gp.start - gp.goal;
  let ticks = "";
  for (let k = 1; k < total; k++) ticks += '<s style="left:' + (k / total * 100).toFixed(1) + '%"></s>';
  const miles = [];
  for (let k = 1; k <= Math.floor(total); k++) miles.push('<span class="badge' + (gp.mile >= k ? ' on' : '') + '">' + (gp.mile >= k ? '★ ' : '') + '−' + k + 'kg</span>');
  el.innerHTML =
    '<div class="gnow">いま（7日平均） <b>' + gp.now.toFixed(1) + '</b> kg　' + (gp.lost > 0.05 ? '<span style="color:var(--ok)">−' + gp.lost.toFixed(1) + 'kg</span>' : '') + '</div>' +
    '<div class="gbar" role="img" aria-label="目標までの達成率 ' + Math.round(gp.pct) + '%"><i style="width:' + gp.pct.toFixed(1) + '%"></i>' + ticks + '</div>' +
    '<div class="ends"><span>スタート ' + gp.start.toFixed(1) + 'kg</span><span>達成率 ' + Math.round(gp.pct) + '%</span><span>目標 ' + gp.goal.toFixed(1) + 'kg</span></div>' +
    (gp.remain > 0 ? '<p class="note">目標まで あと <b>' + gp.remain.toFixed(1) + 'kg</b>。1週間に0.5kgの目安ペースなら ' + md(gp.eta) + 'ごろです。</p>' : '<p class="note"><b>目標達成です！ 本当によくがんばりました。</b></p>') +
    '<p class="note" style="color:var(--fg)">' + (gp.remain > 0 ? GOAL_MSG[gp.status] : "これからは、今の体をキープする習慣を楽しみましょう。") + '</p>' +
    (miles.length ? '<div class="miles">' + miles.join("") + '</div>' : '');
}

/* ---- ごはんタブ ---- */
const POOL = C.dinnerPool(Meals, Recipes);
function curWeight() { const bd = C.weightDates(state); return bd.length ? C.avg7(state, bd, bd[bd.length - 1]) : (state.profile.startW || null); }
function kcalRange() { return C.kcalTarget(state.profile, curWeight()) || C.DEFAULT_RANGE; }
function dinnerOf(d) { return C.dinnerFor(state, d, POOL, kcalRange()); }
function recipeHTML(d) {
  return '<span class="ing">材料（1人分）・' + esc(d.time) + '・たんぱく質 ' + d.p + 'g</span><ul>' + d.ing.map(x => '<li>' + esc(Meals.F[x[0]][0]) + '　' + esc(x[2]) + '</li>').join("") + '</ul>' +
    '<ol>' + d.steps.map(x => '<li>' + esc(x) + '</li>').join("") + '</ol>' + (d.tip ? '<p class="tip">' + esc(d.tip) + '</p>' : '');
}
function dinnerBodyHTML(din) {
  let h = '<div class="recipe" style="padding:0">';
  if (din.kind === "web") {
    const r = din.web;
    h += '<span class="ing">' + esc(r.src) + 'のレシピ・約' + r.min + '分・1人分 ' + r.kcal + 'kcal・たんぱく質 ' + r.p + 'g・塩分 ' + r.salt + 'g</span>' +
      '<span>主な材料（' + r.serv + '人分のレシピ' + (r.serv > 1 ? '。1人なら材料は1/' + r.serv : '') + '）：' + esc(r.main.join("、")) + '</span>' +
      '<span>＋ごはん半分（' + C.SIDE_RICE.kcal + 'kcal）' + (r.soup ? '' : '＋豆腐とわかめのみそ汁（' + C.SIDE_MISO.kcal + 'kcal）') + '　＝ 夜ごはん 約' + din.kcal + 'kcal</span>' +
      '<a class="golink" href="' + esc(r.url) + '" target="_blank" rel="noopener">作り方を見る（' + esc(r.src) + '）↗</a>';
  } else if (din.kind === "custom") {
    h += '<span>自分で決めた夜ごはん：' + (din.kcalUnknown ? 'カロリーは入っていないので、約450kcalとして計算しています' : '約' + din.kcal + 'kcal（ごはんなどもこみ）') + '</span>' +
      (din.url ? '<a class="golink" href="' + esc(din.url) + '" target="_blank" rel="noopener">レシピを見る ↗</a>' : '');
  } else {
    h += recipeHTML(din.dish);
  }
  return h + '<div class="row"><button class="ghost sm" data-reroll="' + today + '">ほかのおすすめにする</button><button class="ghost sm" data-pick="' + today + '">自分で選ぶ</button></div></div>';
}
function renderMeal() {
  const din = dinnerOf(today);
  const badge = '<span class="pill sm">' + (din.chosen ? '決めた' : 'おすすめ') + (din.kind === "web" ? '・ネット' : din.kind === "own" ? '・アプリのレシピ' : '') + '</span>';
  $("mealCard").innerHTML = '<div class="slot-top"><span class="tag">TONIGHT 夜ごはん</span><span class="min">約' + din.kcal + 'kcal' + (din.p ? '・たんぱく質' + din.p + 'g' : '') + '</span></div>' +
    '<p class="title">' + esc(din.name) + '</p><div>' + badge + '</div>' + dinnerBodyHTML(din);
  $("dinTeaser").innerHTML = '<span aria-hidden="true">🍽</span><span>今夜のごはん<br><b>' + esc(din.name) + '</b></span><span class="go">約' + din.kcal + 'kcal ›</span>';
  const tg = C.kcalTarget(state.profile, curWeight()), b = C.dinnerBudget(kcalRange()), R = C.DAY_REST;
  $("kcalGuide").textContent = (tg ? 'あなたの1日の目安は ' + tg.lo.toLocaleString() + '〜' + tg.hi.toLocaleString() + 'kcal。' : '1日の目安は 1,200〜1,350kcal くらい（設定で年齢を入れると、あなたに合わせた目安になります）。') +
    '朝 約' + R.am + '・昼 約' + R.lunch + '・おやつ 約' + R.snack + 'kcal なら、夜は 約' + b.lo + '〜' + b.hi + 'kcal がちょうどよく、夜のおすすめはこの量で選んでいます。';
  renderLog(din);
  renderWeek();
}

/* カロリーの記録（オンにしたときだけ）：ボタン1回でだいたいの量を入れる */
const LOG_OPTS = {
  am: [["軽め", 200], ["ふつう", 350], ["多め", 550]],
  lunch: [["軽め", 350], ["ふつう", 500], ["多め", 750]],
  dinner: [["軽め", 350], ["多め", 700]],
  snack: [["少し", 100], ["ふつう", 200]]
};
function renderLog(din) {
  const on = !!state.settings.kcalLog;
  let h = '<label class="switch"><span><b>カロリーを記録する</b><br><span class="note">毎食の記録は負担になりやすいので、ふだんはオフでOK。気になる日だけ使ってください。</span></span><input type="checkbox" id="kcalLogToggle"' + (on ? ' checked' : '') + '></label>';
  if (on) {
    const m = state.meals[today] || {}, tg = C.kcalTarget(state.profile, curWeight()) || C.DEFAULT_RANGE;
    const opts = Object.assign({}, LOG_OPTS, { dinner: [["今夜のごはん", din.kcal]].concat(LOG_OPTS.dinner) });
    h += '<div class="loggrid">' + [["am", "朝"], ["lunch", "昼"], ["dinner", "夜"], ["snack", "おやつ"]].map(([k, l]) =>
      '<span>' + l + '</span><span class="opts">' + opts[k].map(([t, v]) => '<button data-log="' + k + ':' + v + '" aria-pressed="' + (m[k] === v) + '">' + t + ' ' + v + '</button>').join("") + '</span>').join("") + '</div>';
    h += '<div class="extras"><span class="note">ほかに：</span><button data-extra="100">＋100</button><button data-extra="300">＋300</button>' +
      (m.extra || []).map((x, k) => '<button class="x" data-unextra="' + k + '" aria-label="' + x + 'kcalを取り消す">' + x + ' ×</button>').join("") + '</div>';
    const eaten = C.mealTotal(state, today), max = tg.hi + 300, pct = Math.min(100, eaten / max * 100);
    const msg = eaten === 0 ? "食べたら、近いものをタップ。ぴったりじゃなくて大丈夫です。"
      : eaten > tg.hi ? "今日は多めの日。そんな日もあります。明日の朝ヨガでリセットしましょう。"
      : eaten >= tg.lo ? "ちょうどいいバランスです！" : "いい感じです。";
    h += '<div><div class="row" style="justify-content:space-between;font-size:13px"><span>今日の合計 <b style="font-size:16px">' + eaten.toLocaleString() + '</b> kcal</span><span class="note">目安 ' + tg.lo.toLocaleString() + '〜' + tg.hi.toLocaleString() + 'kcal</span></div>' +
      '<div class="kbar" role="img" aria-label="目安に対する今日の合計"><i style="width:' + pct.toFixed(1) + '%"></i><b style="left:' + (tg.lo / max * 100).toFixed(1) + '%"></b><b style="left:' + (tg.hi / max * 100).toFixed(1) + '%"></b></div>' +
      '<p class="note" style="margin-top:4px">' + msg + '</p></div>';
  }
  $("logCard").innerHTML = h;
}

/* ---- 1週間の夜ごはん・買い物リスト ---- */
function dayLabel(d) { const off = diffDays(today, d), dt = parse(d); return (off === 0 ? '今日' : off === 1 ? 'あした' : md(d)) + '（' + WD[dt.getDay()] + '）'; }
function renderWeek() {
  const days = Array.from({ length: 7 }, (_, k) => addDays(today, k));
  let h = '<p class="note">何も決めない日は、アプリがおすすめを出します（同じ週にくり返さず、前の日と主菜を変えます）。「変える」で好きなレシピや外食にできます。</p>';
  h += days.map(d => {
    const din = dinnerOf(d);
    return '<div class="plan-row"><span class="pd">' + dayLabel(d) + '</span><span class="pn">' + esc(din.name) + '<br><span class="note">' + (din.chosen ? '決めた' : 'おすすめ') + (din.kind === "web" ? '・' + esc(din.web.src) : din.kind === "own" ? '・アプリのレシピ' : '') + '・約' + din.kcal + 'kcal</span></span><button class="ghost sm" data-pick="' + d + '">変える</button></div>';
  }).join("");
  // 買い物リスト：アプリのレシピは材料を合計、ネットのレシピは主な材料をレシピごとに
  const sum = {}, webList = [], customList = [];
  for (const d of days) {
    const din = dinnerOf(d);
    if (din.kind === "own") for (const [k, g] of din.dish.ing) sum[k] = (sum[k] || 0) + g;
    else if (din.kind === "web") {
      webList.push([d, din]); sum.rice = (sum.rice || 0) + 75;
      if (!din.web.soup) { sum.miso = (sum.miso || 0) + 8; sum.tofuK = (sum.tofuK || 0) + 50; sum.wakame = (sum.wakame || 0) + 10; }
    } else customList.push([d, din]);
  }
  h += '<details style="margin-top:6px"><summary><b>この7日分の夜ごはんの買い物リスト</b></summary>';
  h += '<ul class="shop" style="margin-top:6px">' + Object.keys(sum).map(k => '<li>' + esc(k === "rice" ? "ごはん（炊いた量）" : Meals.F[k][3]) + ' 約' + (sum[k] >= 1000 ? (sum[k] / 1000).toFixed(1) + 'kg' : Math.round(sum[k]) + 'g') + '</li>').join("") + '</ul>';
  if (webList.length) h += '<p class="note" style="margin-top:6px">ネットのレシピの主な材料（レシピの人数分。1人なら割って買ってね）：</p><ul style="font-size:13px;margin:0;padding-left:1.2em">' +
    webList.map(([d, din]) => '<li>' + dayLabel(d) + ' ' + esc(din.name) + '（' + din.web.serv + '人分）：' + esc(din.web.main.join("、")) + '</li>').join("") + '</ul>';
  if (customList.length) h += '<p class="note">自分で決めた日（' + customList.map(([d]) => dayLabel(d)).join("・") + '）の材料は、リストに入っていません。</p>';
  h += '</details>';
  $("weekBody").innerHTML = h;
}

/* ---- タブの切りかえ ---- */
function setTab(t) {
  document.body.dataset.tab = t;
  document.querySelectorAll("#tabbar [data-gotab]").forEach(x => x.toggleAttribute("aria-current", x.dataset.gotab === t));
  document.querySelectorAll("#tabbar [aria-current]").forEach(x => x.setAttribute("aria-current", "page"));
  scrollTo(0, 0);
}

/* ---- 夜ごはんを選ぶ画面 ---- */
let pickDate = null, pickTag = "all";
function openPicker(d) {
  pickDate = d; pickTag = "all";
  $("pickTitle").textContent = dayLabel(d) + 'の夜ごはん';
  $("cName").value = ""; $("cKcal").value = ""; $("cUrl").value = "";
  document.querySelector("#picker .custom").open = false;
  renderPicker();
  const dlg = $("picker");
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
}
function closePicker() { const dlg = $("picker"); if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
function renderPicker() {
  const b = C.dinnerBudget(kcalRange()), cur = dinnerOf(pickDate);
  const order = C.dinnerOrder(pickDate, POOL, kcalRange());
  const tags = [["all", "すべて"], ["own", "アプリのレシピ"]].concat(Object.entries(Recipes.TAGS));
  $("pickTags").innerHTML = tags.map(([t, l]) => '<button class="chip" data-ptag="' + t + '" aria-pressed="' + (pickTag === t) + '">' + l + '</button>').join("");
  $("pickBudget").textContent = '夜は約' + b.lo + '〜' + b.hi + 'kcalがちょうどいい量です（ごはん半分・みそ汁こみ）。';
  const list = order.filter(x => pickTag === "all" || (pickTag === "own" ? x.kind === "own" : x.tag === pickTag && x.kind === "web") || (pickTag !== "own" && x.kind === "own" && x.tag === pickTag));
  $("pickList").innerHTML = list.map(x => {
    const fit = x.kcal >= b.lo - 30 && x.kcal <= b.hi + 30;
    return '<button class="pick-item' + (cur.id === x.id ? ' cur' : '') + '" data-choose="' + x.id + '"><b>' + esc(x.name) + '</b><span class="note">' +
      (x.kind === "web" ? esc(x.web.src) + '・約' + x.web.min + '分' : 'アプリのレシピ・' + esc(x.dish.time)) + '・夜ごはん約' + x.kcal + 'kcal' + (fit ? ' ・ちょうどいい' : '') + '</span></button>';
  }).join("");
}

/* 上のほうに1つだけ出す、やさしいお知らせ（お知らせ未設定 → カレンダーの期限 → バックアップ の順） */
let nudgeKind = "";
function renderNudge(total) {
  const s = state.settings, el = $("nudge");
  let text = "", btn = "設定する";
  nudgeKind = "";
  if (s.nudgeOff === today) text = "";
  else if (!s.calUntil) { text = "朝と夜に、今日のメニューをお知らせしませんか？"; nudgeKind = "cal"; }
  else if (diffDays(today, s.calUntil) < 7) { text = diffDays(today, s.calUntil) < 0 ? "カレンダーのお知らせが終わっています。続きを追加しましょう" : "カレンダーのお知らせは" + md(s.calUntil) + "まで。続きを追加しましょう"; nudgeKind = "cal"; }
  else if (total >= 7 && (!s.lastBackup || diffDays(s.lastBackup, today) >= 30)) { text = "そろそろ記録をバックアップしておきませんか？"; btn = "ひらく"; nudgeKind = "backup"; }
  el.hidden = !text;
  $("nudgeText").textContent = text;
  $("nudgeBtn").textContent = btn;
}
function renderCalStatus() {
  const u = state.settings.calUntil;
  $("calStatus").textContent = u ? "カレンダーには " + md(u) + " までのお知らせを作りました。" : "";
}
function renderBackupStatus() {
  const b = state.settings.lastBackup;
  $("backupStatus").textContent = b ? "最後に書き出した日：" + md(b) + "（" + (diffDays(b, today) === 0 ? "今日" : diffDays(b, today) + "日前") + "）" : "まだ書き出していません。";
}
function renderStorageNote() {
  const el = $("storageNote");
  if (!el) return;
  const base = "記録はこの端末の中（ブラウザの保存領域）だけに保存しています。サーバーには送っていません。";
  if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(p => { el.textContent = base + (p ? "（消えにくい保存：ON）" : ""); }).catch(() => { el.textContent = base; });
  else el.textContent = base;
}
function renderInstallHelp() {
  let h;
  if (isStandalone) h = "<b>ホーム画面から使っています。</b>オフラインでも開けます。";
  else if (isIOS) h = "<b>iPhoneでホーム画面に追加するには</b><ol><li>Safariで開く</li><li>下の共有ボタン（□に↑）をタップ</li><li>「ホーム画面に追加」をタップ</li></ol>注意：Safariで使った記録と、ホーム画面のアプリの記録は別々に保存されます。先にホーム画面に追加してから使い始めてください（記録がある場合は「書き出す」→アプリで「読み込む」で移せます）。";
  else h = "<b>ホーム画面に追加するには</b><br>Chromeの右上「︙」→「ホーム画面に追加」または「アプリをインストール」。" + (deferredInstall ? '<button class="save" id="installBtn" style="margin-top:6px">今すぐインストール</button>' : "");
  $("installHelp").innerHTML = h;
}
let deferredInstall = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; renderInstallHelp(); });

/* ---- テーマ ---- */
function applyTheme() {
  const t = state.settings.theme;
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  const dark = t === "dark" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute("content", dark ? "#15161f" : "#f3f4f7"));
}

/* ---- 小さなお知らせ ---- */
let tt;
function toast(m) { const t = $("toast"); t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 2600); }

/* ---- ファイルの書き出し ---- */
function downloadText(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function shareOrDownload(text, name, type) {
  // iPhone のホーム画面アプリではダウンロードがうまくいかないので、共有シート（「ファイルに保存」など）を使う
  if (isIOS && navigator.canShare) {
    const file = new File([text], name, { type });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return true; }
      catch (e) { if (e && e.name === "AbortError") return false; }
    }
  }
  downloadText(text, name, type);
  return true;
}

/* ---- カレンダー ---- */
const CAL_DAYS = 56;
function calLink() { return appUrl() + "#cal=" + [state.start, state.settings.amTime, state.settings.pmTime, today].join(","); }
function openICSInSafari(text) { location.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(text); }
function makeICS(start, am, pm, from) { return C.buildICS({ start, amTime: am, pmTime: pm, from, days: CAL_DAYS, appUrl: appUrl() }); }

function onCalendar() {
  const am = $("amTime").value, pm = $("pmTime").value;
  if (!isHm(am) || !isHm(pm)) { toast("時刻を入れてください"); return; }
  state.settings.amTime = am; state.settings.pmTime = pm;
  const ics = makeICS(state.start, am, pm, today);
  const help = $("calHelp");
  help.classList.remove("hidden");
  if (isIOS && isStandalone) {
    // ホーム画面アプリからはカレンダーに直接渡せないことが多いので、Safariで開くリンクを使う
    help.innerHTML = "<b>iPhoneのホーム画面アプリからは、カレンダーに直接追加できません。</b>次の手順でSafariから追加してください。" +
      "<ol><li>下の「リンクをコピー」をタップ</li><li>Safariを開いて、アドレス欄に貼りつけて開く</li><li>「カレンダーに追加する」→「すべてを追加」</li></ol>" +
      '<div class="row"><button class="save" id="copyCal">リンクをコピー</button></div>' +
      '<span class="note">リンクには、スタート日とお知らせの時刻だけが入っています（体重などの記録は入りません）。</span>';
  } else if (isIOS) {
    help.innerHTML = "「すべてを追加」をタップすると予定が入ります。出てこないときは、もう一度ボタンを押してください。";
    openICSInSafari(ics.text);
  } else {
    downloadText(ics.text, "asayoru-calendar.ics", "text/calendar");
    help.innerHTML = "<b>ファイル（asayoru-calendar.ics）を保存しました。</b>" +
      "<ol><li>Androidは、ダウンロードの通知か「Files」アプリからファイルを開き、カレンダーアプリを選びます</li>" +
      "<li>開けないときは、パソコンで Googleカレンダー（calendar.google.com）→ 設定 → 「インポート/エクスポート」→ このファイルを選ぶ</li></ol>" +
      "Googleカレンダーに取り込んだ場合、お知らせはそのカレンダーの「デフォルトの通知」になります。設定で「0分前」や「予定の時刻」にしておくと、ちょうどの時刻に届きます。";
  }
  state.settings.calUntil = ics.until; state.settings.nudgeOff = null;
  save(); render();
}

function calPage() {
  $("main").classList.add("hidden");
  document.body.classList.add("calmode");
  $("calPage").classList.remove("hidden");
  try { const st = JSON.parse(localStorage.getItem(C.STORE_KEY) || "null"); if (st && st.settings) { state = { settings: st.settings }; applyTheme(); } } catch (e) {}
  const [start, am, pm, from0] = decodeURIComponent(location.hash.slice(5)).split(",");
  if (!isYmd(start) || !isHm(am) || !isHm(pm)) { $("calPageText").textContent = "リンクが正しくありません。アプリからもう一度コピーしてください。"; $("calPageBtn").hidden = true; return; }
  const from = isYmd(from0) && diffDays(from0, today) <= 0 ? from0 : today; // 古いリンクなら今日から作る
  const ics = makeICS(start, am, pm, from);
  $("calPageText").textContent = md(from) + "〜" + md(ics.until) + " の毎日、朝 " + am + "・夜 " + pm + " に、その日のメニューをお知らせします（" + ics.count + "件）。";
  $("calPageBtn").addEventListener("click", () => isIOS ? openICSInSafari(ics.text) : downloadText(ics.text, "asayoru-calendar.ics", "text/calendar"));
}

/* ---- バックアップ ---- */
async function onExport() {
  const text = JSON.stringify(C.exportPayload(state, new Date()), null, 1);
  const ok = await shareOrDownload(text, "asayoru-backup-" + today + ".json", "application/json");
  if (ok) { state.settings.lastBackup = today; save(); render(); toast("バックアップを書き出しました"); }
}
function onImportFile(file) {
  const r = new FileReader();
  r.onload = () => {
    let next;
    try { next = C.normalize(JSON.parse(r.result)); }
    catch (e) { toast("このファイルは読み込めませんでした"); return; }
    const n = C.totals(next).n;
    if (!confirm("バックアップ（スタート日 " + next.start + "、やった回数 " + n + "回）を読み込みます。\nいまこの端末にある記録は、バックアップの内容に置きかわります。よろしいですか？")) return;
    state = next; save(); applyTheme(); render(); toast("バックアップを読み込みました");
  };
  r.onerror = () => toast("ファイルを読めませんでした");
  r.readAsText(file);
}

/* ---- 操作 ---- */
const CHEERS = ["えらい！その調子です", "今日の自分にマル", "続けた日が一番の結果です", "いい流れ、明日もこの感じで", "5分でもやった日はやった日"];
document.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.do) {
    state.done[key(today, b.dataset.do)] = b.dataset.v; save(); render();
    const di = C.dayInfo(state, today);
    const both = C.isDone(state, today, "am") && (C.isDone(state, today, "pm") || !di.pm);
    const tn = C.totals(state).n;
    toast(C.MILES.includes(tn) ? "バッジ獲得！ " + tn + "回目です" : (di.dr === 27 && both ? "28日完走！明日から次の周です" : (both ? "今日は朝晩コンプリート！" : CHEERS[Math.floor(Math.random() * CHEERS.length)])));
  }
  if (b.dataset.feel) { const k = key(today, "feel" + b.dataset.feel); if (state.done[k]) delete state.done[k]; else state.done[k] = 1; save(); render(); }
  if (b.dataset.undo) { delete state.done[key(today, b.dataset.undo)]; save(); render(); }
  if (b.id === "copyCal") {
    const link = calLink();
    (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => toast("リンクをコピーしました。Safariに貼りつけてください"), () => { prompt("このリンクをコピーして、Safariで開いてください", link); });
  }
  if (b.dataset.gotab) setTab(b.dataset.gotab);
  if (b.dataset.log) {
    const [k, v] = b.dataset.log.split(":"), m = state.meals[today] = state.meals[today] || {};
    if (m[k] === +v) delete m[k]; else m[k] = +v;
    if (!Object.keys(m).length) delete state.meals[today];
    save(); render();
  }
  if (b.dataset.pick) { e.preventDefault(); openPicker(b.dataset.pick); }
  if (b.dataset.reroll) {
    // 今のおすすめの次の候補（同じ日に何回も押すと、順番に変わっていく）
    const d = b.dataset.reroll, cur = dinnerOf(d);
    const bud = C.dinnerBudget(kcalRange()), all = C.dinnerOrder(d, POOL, kcalRange());
    const fit = all.filter(x => x.kcal >= bud.lo - 30 && x.kcal <= bud.hi + 30), list = fit.length ? fit : all;
    const k = list.findIndex(x => x.id === cur.id);
    state.dinners[d] = { r: list[(k + 1) % list.length].id };
    save(); render(); toast("夜ごはんを「" + dinnerOf(d).name + "」にしました");
  }
  if (b.dataset.ptag) { pickTag = b.dataset.ptag; renderPicker(); }
  if (b.dataset.choose) { state.dinners[pickDate] = { r: b.dataset.choose }; save(); closePicker(); render(); toast(dayLabel(pickDate) + "の夜ごはんを決めました"); }
  if (b.id === "pickAuto") { delete state.dinners[pickDate]; save(); closePicker(); render(); toast("おすすめにまかせました"); }
  if (b.id === "pickClose") closePicker();
  if (b.id === "cSave") {
    const name = $("cName").value.trim(), kc = parseFloat($("cKcal").value), url = $("cUrl").value.trim();
    if (!name) { toast("料理の名前を入れてください"); return; }
    if (url && !/^https?:\/\/\S+$/.test(url)) { toast("URLは https:// から入れてください"); return; }
    const x = { name: name.slice(0, 40) };
    if (kc >= 50 && kc <= 2000) x.kcal = Math.round(kc);
    if (url) x.url = url;
    state.dinners[pickDate] = x; save(); closePicker(); render(); toast(dayLabel(pickDate) + "の夜ごはんを決めました");
  }
  if (b.dataset.extra) { const m = state.meals[today] = state.meals[today] || {}; (m.extra = m.extra || []).push(+b.dataset.extra); save(); render(); }
  if (b.dataset.unextra) {
    const m = state.meals[today];
    if (m && m.extra) { m.extra.splice(+b.dataset.unextra, 1); if (!m.extra.length) delete m.extra; if (!Object.keys(m).length) delete state.meals[today]; }
    save(); render();
  }
  if (b.id === "installBtn" && deferredInstall) { deferredInstall.prompt(); deferredInstall = null; }
});
$("foods").innerHTML = C.FOODS.map((f, k) => '<label><input type="checkbox" id="f' + k + '"> ' + esc(f) + '</label>').join("");
C.FOODS.forEach((_, f) => $("f" + f).addEventListener("change", e => { if (e.target.checked) state.done[key(today, "food" + f)] = 1; else delete state.done[key(today, "food" + f)]; save(); render(); }));
$("wSave").addEventListener("click", () => {
  const v = parseFloat(String($("wIn").value).replace(",", ".")), c = parseFloat(String($("cIn").value).replace(",", "."));
  const okW = v > 20 && v < 200, okC = c > 30 && c < 200;
  if (!okW && !okC) { toast("体重かお腹まわりを数字で入れてください"); return; }
  const before = C.goalProgress(state, today);
  const e = Object.assign({}, state.body[today] || {}); if (okW) e.w = v; if (okC) e.c = c; state.body[today] = e;
  $("wIn").value = ""; $("cIn").value = "";
  const after = C.goalProgress(state, today);
  if (after && after.remain === 0 && before && before.remain > 0) toast("🎉 目標達成！ 本当におめでとう");
  else if (after && after.mile > (state.profile.mile || 0)) { state.profile.mile = after.mile; toast("🎉 −" + after.mile + "kg達成！ 続けてきた成果です"); }
  else toast("今日の記録を保存しました");
  save(); render();
});
document.addEventListener("change", e => {
  if (e.target.id === "kcalLogToggle") { state.settings.kcalLog = e.target.checked; save(); render(); }
});
$("pSave").addEventListener("click", () => {
  const f = (id, lo, hi) => { const v = parseFloat(String($(id).value).replace(",", ".")); return v >= lo && v <= hi ? v : null; };
  const pr = state.profile;
  pr.height = f("pHeight", 120, 200) || pr.height;
  pr.goal = f("pGoal", 30, 150) || pr.goal;
  pr.age = f("pAge", 15, 90) ? Math.round(f("pAge", 15, 90)) : null;
  pr.startW = f("pStart", 30, 200);
  save(); render(); toast("からだの目標を保存しました");
});
$("startSave").addEventListener("click", () => {
  const v = $("startIn").value; if (!isYmd(v)) return;
  state.start = v; if (state.settings.calUntil) state.settings.calUntil = null;
  save(); render(); toast("スタート日を変更しました。お知らせも入れ直してください");
});
["amTime", "pmTime"].forEach(id => $(id).addEventListener("change", e => { if (isHm(e.target.value)) { state.settings[id] = e.target.value; save(); } }));
$("themeSel").addEventListener("change", e => { state.settings.theme = e.target.value; save(); applyTheme(); });
$("calBtn").addEventListener("click", onCalendar);
$("exportBtn").addEventListener("click", onExport);
$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", e => { const f = e.target.files[0]; if (f) onImportFile(f); e.target.value = ""; });
$("nudgeBtn").addEventListener("click", () => {
  setTab("today");
  const s = $("settings"); s.open = true;
  $(nudgeKind === "backup" ? "backupSec" : "notifySec").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("nudgeLater").addEventListener("click", () => { state.settings.nudgeOff = today; save(); render(); });

/* 日付が変わったら（夜中にアプリを開きっぱなし・翌朝に再開など）画面を更新する */
function checkDay() { const t = getToday(); if (t !== today) { today = t; render(); } }
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkDay(); });
addEventListener("focus", checkDay);
setInterval(checkDay, 60000);
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", applyTheme);

if (CAL_MODE) calPage();
else { applyTheme(); render(); renderInstallHelp(); renderStorageNote(); }

/* オフラインで開けるようにする */
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
})();
