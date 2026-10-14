// 実行: node --test tests/   （日付をずらして、計算が正しいかを確かめる）
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../core.js");
const { addDays, diffDays } = C;

const START = "2026-10-13"; // 火曜日
const st = (done = {}, start = START) => ({ start, done, body: {}, settings: {} });
const doneOn = (...days) => Object.fromEntries(days.flatMap(([d, slots]) => slots.map(s => [d + "|" + s, "full"])));

test("日付の計算（月末・年末・うるう年）", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2027-02-28", 1), "2027-03-01");
  assert.equal(diffDays("2026-10-13", "2027-10-13"), 365);
  assert.equal(diffDays("2026-10-20", "2026-10-13"), -7);
});

test("週・周の切り替わり", () => {
  const s = st();
  const at = n => C.dayInfo(s, addDays(START, n));
  assert.deepEqual([at(0).round, at(0).wk, at(0).w], [0, 0, 0]);
  assert.deepEqual([at(6).wk, at(7).wk, at(13).wk, at(14).wk, at(21).wk], [0, 1, 1, 2, 3]);
  assert.equal(at(27).dr, 27);
  // 29日目から2周目。3週目・4週目のメニューを交互に
  assert.deepEqual([at(28).round, at(28).dr, at(28).w], [1, 0, 2]);
  assert.equal(at(35).w, 3);
  assert.equal(at(42).w, 2);
  assert.equal(at(49).w, 3);
  assert.deepEqual([at(56).round, at(56).w], [2, 2]);
  assert.deepEqual([at(365).round, at(365).dr], [13, 1]);
  assert.equal(C.wname(1, 0), "2周目・1週目");
  // スタート前
  assert.deepEqual([at(-3).idx, at(-3).round, at(-3).w], [-3, 0, 0]);
});

test("日曜の夜はお休み、ほかの日は夜メニューあり", () => {
  const s = st();
  for (let n = 0; n < 120; n++) {
    const d = addDays(START, n), i = C.dayInfo(s, d);
    assert.ok(i.am, d + " 朝メニュー");
    if (i.dow === 0) assert.equal(i.pm, null, d + " は日曜");
    else assert.ok(i.pm && i.pm.min >= 20, d + " 夜メニュー");
  }
});

test("メニューの時間：朝は10分以内、夜は1週目25分以内・最大50分、週ごとに少しずつ増える", () => {
  const s = st();
  const all = [...C.AM, ...Object.values(C.PMENU).filter(Boolean)];
  for (const m of all) {
    // 表示の「約○分」は、メインの動画の長さ＋動画のない手順の合計と一致する
    assert.equal(m.min, m.main.reduce((a, v) => a + v.m, 0) + (m.items.join("").includes("肩甲骨まわし") || m.items.join("").includes("姿勢チェック") ? 1 : 0), m.title);
  }
  for (const m of C.AM) assert.ok(m.min >= 5 && m.min <= 10, "朝 " + m.title + " " + m.min);
  const week = w => Array.from({ length: 7 }, (_, k) => C.dayInfo(s, addDays(START, w * 7 + k)).pm).filter(Boolean).map(m => m.min);
  assert.ok(week(0).every(m => m <= 25), "1週目 " + week(0));
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(avg(week(0)) < avg(week(1)) && avg(week(1)) < avg(week(2)), "週ごとに増える");
  for (let w = 0; w < 4; w++) assert.ok(week(w).every(m => m <= 50), (w + 1) + "週目 " + week(w));
});

test("反り腰の人が腰を痛めやすい脚上げ系の動画（miey シングルレッグレイズ）を使っていない", () => {
  const ids = [...C.AM, ...Object.values(C.PMENU).filter(Boolean)].flatMap(m => [...m.main, ...m.opt]).map(v => v.id);
  assert.ok(!ids.includes("gZ3nw05hX4s"));
});

test("連続日数：毎日やる", () => {
  const s = st(doneOn([START, ["am"]], [addDays(START, 1), ["pm"]], [addDays(START, 2), ["am", "pm"]]));
  assert.equal(C.streak(s, addDays(START, 2)), 3);
  // 今日（3日目）はまだ何もしていない → 昨日までの分が続いている
  assert.equal(C.streak(s, addDays(START, 3)), 3);
});

test("連続日数：1日休んでもリセットしない", () => {
  const s = st(doneOn([START, ["am"]], [addDays(START, 2), ["am"]]));
  assert.equal(C.streak(s, addDays(START, 2)), 2);
  assert.equal(C.streak(s, addDays(START, 3)), 2); // 今日は未記録でもまだOK
});

test("連続日数：2日続けて休んだらリセット", () => {
  const s = st(doneOn([START, ["am"]], [addDays(START, 1), ["am"]]));
  assert.equal(C.streak(s, addDays(START, 3)), 2);  // 2日目だけ休み → まだ続く
  assert.equal(C.streak(s, addDays(START, 4)), 0);  // 2日目・3日目と休んだ → リセット
  s.done[addDays(START, 4) + "|am"] = "full";
  assert.equal(C.streak(s, addDays(START, 4)), 1);  // また1から
});

test("連続日数：日曜（夜休み）に何もしなくても途切れない・数えない", () => {
  // START=火。5日目=日曜
  const sun = addDays(START, 5);
  assert.equal(C.dayInfo(st(), sun).dow, 0);
  const days = [0, 1, 2, 3, 4, 6].map(n => [addDays(START, n), ["am"]]);
  const s = st(doneOn(...days));
  assert.equal(C.streak(s, addDays(START, 6)), 6);
  // 日曜に朝をやれば1日として数える
  s.done[sun + "|am"] = "mini";
  assert.equal(C.streak(s, addDays(START, 6)), 7);
});

test("連続日数：土曜を休んで日曜も何もしない → 日曜は休む日なので土曜の1日休みあつかい", () => {
  const fri = addDays(START, 3), sat = addDays(START, 4), mon = addDays(START, 6);
  const s = st(doneOn([START, ["am"]], [addDays(START, 1), ["am"]], [addDays(START, 2), ["am"]], [fri, ["am"]], [mon, ["am"]]));
  assert.equal(C.dayScore(s, sat), "none");
  assert.equal(C.streak(s, mon), 5);
});

test("連続日数：スタート前の記録は数えない", () => {
  const s = st(doneOn([addDays(START, -1), ["am"]], [START, ["am"]]));
  assert.equal(C.streak(s, START), 1);
});

test("おかえりなさい：3日以上空いたら出る・責めない条件", () => {
  const s = st(doneOn([START, ["am"]]));
  assert.equal(C.welcomeBack(s, addDays(START, 1)), false);
  assert.equal(C.welcomeBack(s, addDays(START, 2)), false);
  assert.equal(C.welcomeBack(s, addDays(START, 3)), true);   // 2日空いて3日目
  assert.equal(C.welcomeBack(s, addDays(START, 10)), true);
  s.done[addDays(START, 10) + "|pm"] = "mini";
  assert.equal(C.welcomeBack(s, addDays(START, 10)), false);  // 今日やったら消える
  // まだ一度も記録がない人：スタートから3日目以降
  assert.equal(C.welcomeBack(st(), addDays(START, 1)), false);
  assert.equal(C.welcomeBack(st(), addDays(START, 2)), true);
  assert.equal(C.welcomeBack(st(), addDays(START, -2)), false);
});

test("回数と分数（5分だけ版も1回・5分）", () => {
  const s = st({ [START + "|am"]: "full", [START + "|pm"]: "mini", [START + "|food0"]: 1, [START + "|feel2"]: 1 });
  const t = C.totals(s);
  assert.equal(t.n, 2);
  assert.equal(t.m, 7 + 5); // 1日目の朝は7分、夜は5分だけ版
  s.done[addDays(START, 1) + "|pm"] = "full";
  assert.equal(C.totals(s).m, 12 + 20);
});

test("体重の7日平均", () => {
  const s = st();
  s.body = { "2026-10-13": { w: 56 }, "2026-10-15": { w: 55.6 }, "2026-10-21": { w: 55.0 } };
  const ds = C.weightDates(s);
  assert.equal(C.avg7(s, ds, "2026-10-15").toFixed(2), "55.80");
  assert.equal(C.avg7(s, ds, "2026-10-21").toFixed(2), "55.30"); // 10/13は8日前なので入らない
});

test("保存データ：書き出し→読み込みで同じに戻る", () => {
  const s = C.emptyState(START);
  s.done = doneOn([START, ["am", "pm"]]);
  s.done[START + "|food1"] = 1;
  s.body[START] = { w: 56, c: 82.5 };
  s.settings.amTime = "06:45";
  const file = JSON.parse(JSON.stringify(C.exportPayload(s, new Date("2026-10-13T12:00:00Z"))));
  assert.equal(file.app, "asayoru28");
  assert.deepEqual(C.normalize(file), s);
});

test("保存データ：試作版の形式（settingsなし・weightsあり）も読める", () => {
  const old = { start: "2026-10-01", done: { "2026-10-01|am": "full", "2026-10-02|pm": "mini", "2026-10-02|feel0": 1 }, weights: {}, body: { "2026-10-01": { w: 56 } } };
  const n = C.normalize(old);
  assert.equal(n.start, "2026-10-01");
  assert.equal(C.totals(n).n, 2);
  assert.equal(n.settings.amTime, "07:00");
});

test("保存データ：こわれたデータは読み込まない・変な値は捨てる", () => {
  assert.throws(() => C.normalize(null));
  assert.throws(() => C.normalize({ start: "2026-13-40" }));
  assert.throws(() => C.normalize({ done: {} }));
  const n = C.normalize({ start: START, done: { "x|am": "full", "2026-10-13|zz": 1, "2026-10-13|am": "weird" }, body: { "2026-10-13": { w: "56" }, "2026-10-14": { w: 999, c: 80 } }, settings: { amTime: "25:00", theme: "pink" } });
  assert.deepEqual(n.done, { "2026-10-13|am": "full" });
  assert.deepEqual(n.body, { "2026-10-14": { c: 80 } });
  assert.equal(n.settings.amTime, "07:00");
  assert.equal(n.settings.theme, "auto");
});

test("カレンダー（.ics）：8週間ぶん・日曜夜なし・形式が正しい", () => {
  const r = C.buildICS({ start: START, amTime: "07:00", pmTime: "21:30", from: START, days: 56, appUrl: "https://example.github.io/asayoru/", now: new Date("2026-10-13T00:00:00Z") });
  assert.equal(r.until, addDays(START, 55));
  assert.equal(r.count, 56 + 48);
  const t = r.text;
  assert.ok(t.startsWith("BEGIN:VCALENDAR\r\n") && t.endsWith("END:VCALENDAR\r\n"));
  assert.equal((t.match(/BEGIN:VEVENT/g) || []).length, 104);
  assert.equal((t.match(/BEGIN:VALARM/g) || []).length, 104);
  assert.ok(t.includes("DTSTART:20261013T070000"));
  assert.ok(t.includes("DTSTART:20261013T213000"));
  assert.ok(!t.includes("DTSTART:20261018T213000"), "10/18は日曜なので夜の予定なし");
  assert.ok(t.includes("DTSTART:20261018T070000"));
  // 1行75バイト以内・改行はCRLF
  for (const line of t.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75, line);
  assert.ok(!/[^\r]\n/.test(t));
  // 折り返しを戻すと、メニュー名が読める
  const unfolded = t.replace(/\r\n /g, "");
  assert.ok(unfolded.includes("SUMMARY:☀ 朝：目覚めの朝ヨガ（約7分）"));
  assert.ok(unfolded.includes("SUMMARY:🌙 夜：ヨガ＋お腹・二の腕（約20分）"));
  assert.ok(unfolded.includes("お知らせはここまでです"));
});

test("カレンダー：2周目の途中から作っても正しいメニュー", () => {
  const from = addDays(START, 30);
  const r = C.buildICS({ start: START, amTime: "07:00", pmTime: "21:00", from, days: 7, appUrl: "" });
  const unfolded = r.text.replace(/\r\n /g, "");
  assert.ok(unfolded.includes("2周目・1週目"));
  assert.ok(unfolded.includes("姿勢リセットヨガ"));
});

test("ics の文字エスケープ", () => {
  assert.equal(C.icsEscape("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
});

test("動画IDの形式・長さ・ラベル", () => {
  const all = [...C.AM, ...Object.values(C.PMENU).filter(Boolean)].flatMap(m => [...m.main, ...m.opt]).concat(C.REST_LINKS);
  for (const v of all) {
    assert.match(v.id, /^[A-Za-z0-9_-]{11}$/);
    assert.ok(v.m > 0 && v.m < 30, v.t);
    assert.ok(v.t.length > 3);
  }
  for (const v of Object.values(C.V)) assert.ok(all.includes(v), "使われていない動画: " + v.t);
});

/* ---- 食事・目標 ---- */
const M = require("../meals.js");

test("アプリのレシピ（夜ごはん7品）：ごはん半分こみで約330〜400kcal・たんぱく質20g以上", () => {
  assert.equal(M.DINNERS.length, 7);
  for (const d of M.DINNERS) {
    assert.ok(d.kcal >= 300 && d.kcal <= 420, d.name + " " + d.kcal);
    assert.ok(d.p >= 20, d.name + " P" + d.p);
    assert.ok(d.steps.length && d.ing.length);
    for (const [key, g, label] of d.ing) assert.ok(M.F[key] && g > 0 && label, key);
    assert.ok(d.ing.some(([k, g]) => k === "rice" && g <= 75), "主食は半分（75g以下）");
  }
  // カロリーは材料から計算した値（5kcal単位）
  const d = M.DINNERS[0];
  assert.equal(d.kcal, Math.round(d.ing.reduce((a, [k, g]) => a + M.F[k][1] * g / 100, 0) / 5) * 5);
});

test("カロリーの目安：年齢がないと出さない・1,200kcalより下にしない", () => {
  assert.equal(C.kcalTarget({ height: 148, age: null }, 56), null);
  const t30 = C.kcalTarget({ height: 148, age: 30 }, 56);
  assert.equal(t30.bmr, 1174);           // 10×56 + 6.25×148 − 5×30 − 161
  assert.equal(t30.target, 1244);        // 1174×1.4 − 400
  assert.deepEqual([t30.lo, t30.hi], [1200, 1350]);
  const t50 = C.kcalTarget({ height: 148, age: 50 }, 52);
  assert.ok(t50.target >= 1200 && t50.target >= t50.bmr);
});

test("夜ごはんの目安：1日の目安 −（朝300・昼450・おやつ100）", () => {
  assert.deepEqual(C.dinnerBudget({ lo: 1200, hi: 1350 }), { lo: 350, hi: 500, rest: 850 });
  assert.deepEqual(C.dinnerBudget(null), { lo: 350, hi: 500, rest: 850 });
});

test("カロリーの記録：入れた数字＋追加した分", () => {
  const s = st(); s.meals = { [START]: { am: 350, dinner: 396, extra: [100, 300] } };
  assert.equal(C.mealTotal(s, START), 350 + 396 + 400);
  assert.equal(C.mealTotal(s, addDays(START, 1)), 0);
});

test("目標の進み具合：達成率・残り・目安ペース・節目", () => {
  const s = C.emptyState(START);
  assert.equal(C.goalProgress(s, START), null);
  s.body = { [START]: { w: 56 } };
  let g = C.goalProgress(s, START);
  assert.deepEqual([g.start, g.goal, g.pct, g.remain, g.status, g.mile], [56, 51, 0, 5, "early", 0]);
  assert.equal(g.eta, addDays(START, 70)); // 5kg ÷ 0.5kg/週 = 10週間
  // 3週間後：7日平均 54.6 → 1.4kg減（目安ペースなら1.5kg減）
  s.body[addDays(START, 15)] = { w: 54.8 }; s.body[addDays(START, 21)] = { w: 54.4 };
  g = C.goalProgress(s, addDays(START, 21));
  assert.equal(g.now.toFixed(1), "54.6");
  assert.equal(Math.round(g.pct), 28);
  assert.equal(g.mile, 1);
  assert.equal(g.status, "ahead");      // 目安 54.5 + 0.2 以内
  s.profile.startW = 57;
  assert.equal(C.goalProgress(s, addDays(START, 21)).start, 57);
  s.body[addDays(START, 80)] = { w: 50.8 };
  g = C.goalProgress(s, addDays(START, 80));
  assert.deepEqual([g.remain, g.pct], [0, 100]);
});

test("保存データ：目標・カロリー記録・記録のオンオフも書き出し→読み込みで戻る", () => {
  const s = C.emptyState(START);
  s.profile.age = 32; s.profile.goal = 50.5; s.profile.mile = 1;
  s.meals = { [START]: { am: 350, snack: 100, extra: [300] } };
  s.settings.kcalLog = true;
  const back = C.normalize(JSON.parse(JSON.stringify(C.exportPayload(s, new Date()))));
  assert.deepEqual(back.profile, s.profile);
  assert.deepEqual(back.meals, s.meals);
  assert.equal(back.settings.kcalLog, true);
  // 古いバックアップ（目標・食事なし）も読める。記録は最初オフ
  const old = C.normalize({ start: START, done: {} });
  assert.deepEqual(old.profile, C.DEFAULT_PROFILE);
  assert.deepEqual(old.meals, {});
  assert.equal(old.settings.kcalLog, false);
  // 前の版の「献立どおり食べた（1）」や変な値は捨てる
  const bad = C.normalize({ start: START, profile: { age: 300, goal: "51" }, meals: { [START]: { am: 1, lunch: 500, dinner: "x", extra: [-5, 99999, 200] }, "bad": { am: 300 } } });
  assert.equal(bad.profile.age, null);
  assert.equal(bad.profile.goal, 51);
  assert.deepEqual(bad.meals, { [START]: { lunch: 500, extra: [200] } });
});

/* ---- 夜ごはんのおすすめ・1週間の予定 ---- */
const REC = require("../recipes.js");
const POOL = C.dinnerPool(M, REC);
const RANGE = C.kcalTarget({ height: 148, age: 30 }, 56);

test("ネットのレシピ：URL・カロリー・たんぱく質・塩分・時間がそろっている", () => {
  assert.ok(REC.WEB.length >= 40);
  assert.equal(new Set(REC.WEB.map(r => r.id)).size, REC.WEB.length);
  for (const r of REC.WEB) {
    assert.match(r.url, /^https:\/\/park\.ajinomoto\.co\.jp\/recipe\/card\/\d{6}\/$/);
    assert.ok(r.kcal >= 100 && r.kcal <= 360, r.name);
    assert.ok(r.p >= 15 && r.salt <= 2.5 && r.min <= 30 && r.serv >= 1, r.name);
    assert.ok(REC.TAGS[r.tag], r.name + " " + r.tag);
    assert.ok(r.main.length >= 1);
  }
  assert.equal(POOL.length, REC.WEB.length + 7);
});

test("おすすめ：同じ日は何度見ても同じ・7日の中で同じレシピをくり返さない・前の日と主菜の種類を変える", () => {
  const s = C.emptyState(START);
  const week = Array.from({ length: 14 }, (_, k) => C.dinnerFor(s, addDays(START, k), POOL, RANGE));
  for (let k = 0; k < 14; k++) assert.equal(C.dinnerFor(s, addDays(START, k), POOL, RANGE).id, week[k].id);
  for (let w = 0; w < 2; w++) assert.equal(new Set(week.slice(w * 7, w * 7 + 7).map(x => x.id)).size, 7, "週" + (w + 1));
  for (let k = 1; k < 14; k++) assert.notEqual(week[k].tag, week[k - 1].tag, addDays(START, k));
  assert.ok(week.every(x => !x.chosen));
});

test("おすすめ：夜の目安（約350〜500kcal）に入るものを選ぶ", () => {
  const s = C.emptyState(START), b = C.dinnerBudget(RANGE);
  for (let k = 0; k < 28; k++) {
    const din = C.dinnerFor(s, addDays(START, k), POOL, RANGE);
    assert.ok(din.kcal >= b.lo - 30 && din.kcal <= b.hi + 30, addDays(START, k) + " " + din.kcal);
  }
});

test("自分で選んだ夜ごはん・自分で入れた夜ごはんが優先される", () => {
  const s = C.emptyState(START);
  s.dinners[START] = { r: "aj709495" };
  const a = C.dinnerFor(s, START, POOL, RANGE);
  assert.deepEqual([a.id, a.chosen, a.name], ["aj709495", true, "温野菜豚しゃぶサラダ"]);
  for (let k = 1; k < 7; k++) assert.notEqual(C.dinnerFor(s, addDays(START, k), POOL, RANGE).id, "aj709495");
  s.dinners[addDays(START, 1)] = { name: "外食（焼き魚定食）", kcal: 650 };
  const b = C.dinnerFor(s, addDays(START, 1), POOL, RANGE);
  assert.deepEqual([b.kind, b.kcal, b.chosen], ["custom", 650, true]);
  s.dinners[addDays(START, 2)] = { name: "友だちとごはん" };
  assert.deepEqual([C.dinnerFor(s, addDays(START, 2), POOL, RANGE).kcal, C.dinnerFor(s, addDays(START, 2), POOL, RANGE).kcalUnknown], [450, true]);
  s.dinners[addDays(START, 3)] = { r: "aj000000" };
  assert.equal(C.dinnerFor(s, addDays(START, 3), POOL, RANGE).chosen, false);
});

test("保存データ：夜ごはんの予定も書き出し→読み込みで戻る・危ないURLは捨てる", () => {
  const s = C.emptyState(START);
  s.dinners = { [START]: { r: "aj622020" }, [addDays(START, 1)]: { name: "鍋", kcal: 500, url: "https://example.com/r/1" } };
  assert.deepEqual(C.normalize(JSON.parse(JSON.stringify(s))).dinners, s.dinners);
  const bad = C.normalize({ start: START, dinners: { [START]: { r: "evil" }, [addDays(START, 1)]: { name: "x", url: "javascript:alert(1)" }, [addDays(START, 2)]: { name: "  " } } });
  assert.deepEqual(bad.dinners, { [addDays(START, 1)]: { name: "x" } });
});
