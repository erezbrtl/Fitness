/* מנוע התוכנית — בונה אימון מתוזמן לפי סוג יום, רמה, שבוע במחזור ומשך יעד. */
(function () {
  const EX = window.EXERCISES;

  /* סוגי ימים — תבנית של קטגוריות לסבב אחד */
  const DAY_TYPES = {
    strengthA: { key:'strengthA', name:'כוח גוף מלא A', short:'כוח A', icon:'💪', color:'#3b82f6',
      focus:'דחיפה, רגליים וליבה', mode:'strength',
      pattern:['push','legs','core','push','legs','pull'] },
    hiit: { key:'hiit', name:'HIIT שריפת שומן', short:'HIIT', icon:'🔥', color:'#f97316',
      focus:'אינטרוולים בעצימות גבוהה', mode:'hiit',
      pattern:['cardio','cardio','core','cardio','cardio','legs'] },
    core: { key:'core', name:'ליבה ובטן', short:'ליבה', icon:'🎯', color:'#a855f7',
      focus:'בטן, אלכסונים וגב תחתון', mode:'core',
      pattern:['core','core','core','core','core','cardio'] },
    strengthB: { key:'strengthB', name:'כוח גוף מלא B', short:'כוח B', icon:'🏋️', color:'#14b8a6',
      focus:'משיכה, רגליים וליבה', mode:'strength',
      pattern:['pull','legs','core','pull','legs','push'] },
    metabolic: { key:'metabolic', name:'מטבולי משולב', short:'מטבולי', icon:'⚡', color:'#eab308',
      focus:'כוח + קרדיו לשריפת שומן', mode:'hiit',
      pattern:['cardio','legs','push','cardio','core','pull'] },
    mobility: { key:'mobility', name:'ניידות וליבה קלה', short:'ניידות', icon:'🧘', color:'#22c55e',
      focus:'טווחי תנועה, התאוששות פעילה', mode:'mobility',
      pattern:['mobility','core','mobility','core','mobility','core'] },
    rest: { key:'rest', name:'יום מנוחה', short:'מנוחה', icon:'😴', color:'#64748b',
      focus:'התאוששות. הליכה קלה ומתיחות אם בא לכם', mode:'rest', pattern:[] },
  };

  /* סדר סוגי הימים לפי מספר ימי אימון בשבוע */
  const SCHEDULES = {
    1: ['metabolic'],
    2: ['strengthA', 'hiit'],
    3: ['strengthA', 'hiit', 'strengthB'],
    4: ['strengthA', 'hiit', 'strengthB', 'core'],
    5: ['strengthA', 'hiit', 'core', 'strengthB', 'metabolic'],
    6: ['strengthA', 'hiit', 'core', 'strengthB', 'metabolic', 'mobility'],
    7: ['strengthA', 'hiit', 'core', 'strengthB', 'metabolic', 'mobility', 'core'],
  };

  /* פרמטרי עבודה/מנוחה (שניות) לפי רמה ומצב אימון */
  const PARAMS = {
    strength: { 1:{work:30,rest:20,roundRest:45}, 2:{work:40,rest:15,roundRest:40}, 3:{work:45,rest:15,roundRest:30} },
    hiit:     { 1:{work:20,rest:20,roundRest:45}, 2:{work:30,rest:15,roundRest:40}, 3:{work:40,rest:10,roundRest:30} },
    core:     { 1:{work:30,rest:15,roundRest:40}, 2:{work:40,rest:10,roundRest:30}, 3:{work:45,rest:10,roundRest:30} },
    mobility: { 1:{work:40,rest:10,roundRest:20}, 2:{work:45,rest:10,roundRest:20}, 3:{work:50,rest:5,roundRest:15} },
  };

  /* התקדמות בתוך מחזור של 4 שבועות (עומס עולה, שבוע 4 = שיא) */
  const WEEK_MODS = {
    1: { work:0,  rest:0,  label:'שבוע בסיס' },
    2: { work:5,  rest:0,  label:'עלייה בעומס' },
    3: { work:10, rest:-5, label:'עומס גבוה' },
    4: { work:10, rest:-5, label:'שבוע שיא', harder:true },
  };

  const LEVELS = { 1:'מתחיל', 2:'בינוני', 3:'מתקדם' };

  /* מחולל מספרים דטרמיניסטי — אותו אימון לאותו יום */
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function hashStr(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* בחירת תרגילים לקטגוריה, בהתאם לרמה, ללא כפילויות */
  function pickForCat(cat, level, harder, r, used) {
    let pool = EX.filter(e => e.cat === cat && e.level <= level && !used.has(e.id));
    if (pool.length === 0) pool = EX.filter(e => e.cat === cat && e.level <= level);
    if (pool.length === 0) pool = EX.filter(e => e.cat === cat);
    // בשבוע שיא מעדיפים את הווריאציות הקשות ביותר שהרמה מאפשרת
    if (harder) {
      const maxLvl = Math.max(...pool.map(e => e.level));
      const hard = pool.filter(e => e.level === maxLvl);
      if (hard.length && r() < 0.7) pool = hard;
    }
    const pick = pool[Math.floor(r() * pool.length)];
    used.add(pick.id);
    return pick;
  }

  function pickMany(cat, n, level, r, used) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(pickForCat(cat, level, false, r, used));
    return out;
  }

  /**
   * בונה אימון מלא.
   * @param {object} o  { dayType, level, week(1-4), durationMin, seed }
   * @returns {object}  { segments:[...], meta:{...} }
   */
  function buildWorkout(o) {
    const day = DAY_TYPES[o.dayType];
    if (!day || day.mode === 'rest') return null;
    const level = clamp(o.level || 1, 1, 3);
    const week = clamp(o.week || 1, 1, 4);
    const mods = WEEK_MODS[week];
    const r = rng(hashStr(`${o.seed || ''}|${o.dayType}|${level}|${week}`));
    const used = new Set();
    const total = clamp(o.durationMin || 20, 5, 90) * 60;

    // חלוקת זמן: חימום ~12%, שחרור ~10%, השאר עיקר
    const warmSec = clamp(Math.round(total * 0.12 / 30) * 30, 60, 300);
    const coolSec = clamp(Math.round(total * 0.10 / 30) * 30, 60, 240);
    const prepSec = 10;
    let mainSec = total - warmSec - coolSec - prepSec;

    const p = PARAMS[day.mode][level];
    const work = p.work + mods.work;
    const rest = Math.max(10, p.rest + mods.rest);
    const roundRest = p.roundRest;

    // כמה תרגילים בסבב וכמה סבבים נכנסים בזמן
    let pattern = day.pattern.slice();
    let rounds, roundTime;
    for (;;) {
      roundTime = pattern.length * (work + rest) - rest; // בלי מנוחה אחרי התרגיל האחרון בסבב
      rounds = Math.floor((mainSec + roundRest) / (roundTime + roundRest));
      if (rounds >= 1 || pattern.length <= 3) break;
      pattern = pattern.slice(0, pattern.length - 1);
    }
    rounds = clamp(rounds, 1, 8);

    const exercises = pattern.map(cat => pickForCat(cat, level, !!mods.harder, r, used));

    const segments = [];
    const push = (s) => segments.push(s);

    push({ kind:'prep', label:'התכוננו', dur: prepSec, ex:null, phase:'חימום' });

    // חימום
    const warmList = pickMany('warmup', Math.round(warmSec / 30), level, r, used);
    warmList.forEach((ex, i) => push({ kind:'warmup', ex, dur:30, phase:'חימום', idx:i+1, of:warmList.length }));

    // עיקר: סבבים מלאים + סבב סיום חלקי (Finisher) אם נשאר זמן
    let usedMain = rounds * roundTime + (rounds - 1) * roundRest;
    let leftover = Math.max(0, mainSec - usedMain);
    let finisher = 0;
    if (leftover >= roundRest + work) {
      finisher = clamp(Math.floor((leftover - roundRest + rest) / (work + rest)), 1, exercises.length);
      usedMain += roundRest + finisher * (work + rest) - rest;
      leftover = Math.max(0, mainSec - usedMain);
    }
    const totalRounds = rounds + (finisher ? 1 : 0);
    for (let rd = 1; rd <= totalRounds; rd++) {
      const isFin = finisher && rd === totalRounds;
      const list = isFin ? exercises.slice(0, finisher) : exercises;
      const phase = isFin ? 'סבב סיום' : 'עיקר';
      list.forEach((ex, i) => {
        push({ kind:'work', ex, dur:work, phase, round:rd, rounds:totalRounds, idx:i+1, of:list.length });
        if (i < list.length - 1) push({ kind:'rest', ex:null, dur:rest, phase, round:rd, rounds:totalRounds, next:list[i+1] });
      });
      if (rd < totalRounds) push({ kind:'roundrest', ex:null, dur:roundRest, phase:'עיקר', round:rd, rounds:totalRounds, next:exercises[0] });
    }

    const coolTotal = coolSec + leftover;
    const coolN = clamp(Math.round(coolTotal / 40), 2, 8);
    const coolEach = Math.max(20, Math.floor(coolTotal / coolN / 5) * 5);
    const coolList = shuffle(EX.filter(e => e.cat === 'cooldown' && e.id !== 'breathing'), r).slice(0, coolN - 1);
    coolList.push(EX.find(e => e.id === 'breathing'));
    const coolRemainder = coolTotal - coolEach * coolList.length;
    coolList.forEach((ex, i) => push({ kind:'cooldown', ex, dur: coolEach + (i === coolList.length - 1 ? coolRemainder : 0), phase:'שחרור', idx:i+1, of:coolList.length }));

    const plannedSec = segments.reduce((a, s) => a + s.dur, 0);
    return {
      segments,
      meta: {
        dayType: day.key, name: day.name, icon: day.icon, color: day.color, focus: day.focus,
        level, levelName: LEVELS[level], week, weekLabel: mods.label,
        work, rest, roundRest, rounds, finisher, exercises, warmup: warmList, cooldown: coolList,
        plannedSec, durationMin: Math.round(plannedSec / 60),
      },
    };
  }

  window.PROGRAM = { DAY_TYPES, SCHEDULES, PARAMS, WEEK_MODS, LEVELS, buildWorkout, hashStr };
})();
