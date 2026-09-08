/* מנוע התוכנית — חמישה תרגילים קבועים, אותם תרגילים בכל אימון.
   מה שמשתנה הוא הקושי: לכל תרגיל יש גרסה לכל רמה, וזמני העבודה עולים לאורך המחזור. */
(function () {
  const EX = window.EXERCISES;
  const byId = (id) => EX.find((e) => e.id === id);

  /* שמונת התרגילים הקבועים — אותה סדרה בכל אימון, שלוש סטים לכל אחד.
     לכל תרגיל יעד משלו: מספר חזרות, או שניות החזקה בתרגילים הסטטיים. */
  const CIRCUIT = [
    { key:'push',   id:'pushup',           reps:12, label:'שכיבות סמיכה', why:'חזה, כתפיים וזרוע אחורית' },
    { key:'legs',   id:'squat',            reps:15, label:'סקוואט',        why:'ירך קדמית וישבן — קבוצת השרירים הגדולה בגוף' },
    { key:'plank',  id:'plank',            hold:45, label:'פלאנק',         why:'כל הליבה בהחזקה אחת, כולל הגב התחתון' },
    { key:'lunge',  id:'fwd_lunge',        reps:12, label:'לאנג׳',         why:'רגל אחת בכל פעם — שיווי משקל וחוזק לא סימטרי' },
    { key:'cardio', id:'mountain_climber', hold:30, label:'מטפסי הרים',    why:'מעלה דופק ועובד על הליבה בו־זמנית' },
    { key:'abs',    id:'leg_raise',        reps:12, label:'הרמות רגליים',  why:'הבטן התחתונה, שהפלאנק הסטטי פחות מגיע אליה' },
    { key:'glutes', id:'glute_bridge',     reps:15, label:'גשר ישבן',      why:'ישבן וירך אחורית — מאזן את הצד הקדמי של הגוף' },
    { key:'back',   id:'superman',         reps:12, label:'סופרמן',        why:'הגב התחתון והעליון — הצד שיושב מול מחשב כל היום' },
  ];

  /* כמה שניות לוקחת חזרה אחת, לפי התרגיל. מכאן נגזר חלון הזמן שמוצג בשעון. */
  const TEMPO = { pushup:3, squat:2.5, fwd_lunge:3, leg_raise:3, glute_bridge:2.5, superman:2.5 };

  const WARMUP = ['march', 'arm_circles', 'slow_squat'];
  const COOLDOWN = ['chest_open', 'hamstring_seated', 'child_pose'];

  /* לכל תרגיל שהתוכנית מגישה יש איור ב‑img/<id>.webp */
  const IMAGES = new Set([...CIRCUIT.map((c) => c.id), ...WARMUP, ...COOLDOWN]);
  const hasImage = (id) => IMAGES.has(id);

  const DAY_TYPES = {
    workout: { key:'workout', name:'האימון היומי', short:'אימון', icon:'💪', color:'#3b82f6',
      focus:'שמונה תרגילים, כל הגוף', mode:'circuit' },
    rest: { key:'rest', name:'יום מנוחה', short:'מנוחה', icon:'😴', color:'#64748b',
      focus:'התאוששות. הליכה קלה ומתיחות אם בא לכם', mode:'rest' },
  };

  /* מנוחות לפי רמה. זמן העבודה עצמו נגזר מהיעד של כל תרגיל. */
  const PARAMS = {
    1: { rest:15, roundRest:60 },
    2: { rest:10, roundRest:40 },
    3: { rest:10, roundRest:30 },
  };

  /* היעדים גדלים עם הרמה ולאורך המחזור. ברמה בינונית בשבוע הראשון
     היעדים הם בדיוק אלה שבתוכנית: 12, 15, 45״, 12, 30״, 12, 15, 12. */
  const LEVEL_F = { 1: 0.7, 2: 1, 3: 1.3 };
  const WEEK_MODS = {
    1: { f: 1,    rest:0,  label:'שבוע בסיס' },
    2: { f: 1.08, rest:0,  label:'עלייה בעומס' },
    3: { f: 1.15, rest:-5, label:'עומס גבוה' },
    4: { f: 1.15, rest:-5, label:'שבוע שיא' },
  };

  const LEVELS = { 1:'מתחיל', 2:'בינוני', 3:'מתקדם' };
  const READY = 10;   // שניות היכון לפני כל תרגיל בסבב — זמן להיכנס לתנוחה
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const round5 = (n) => Math.max(15, Math.round(n / 5) * 5);

  /* התרגילים עם היעד שלהם ברמה ובשבוע הנתונים */
  function circuitFor(level, week) {
    const f = LEVEL_F[clamp(level || 1, 1, 3)] * WEEK_MODS[clamp(week || 1, 1, 4)].f;
    return CIRCUIT.map((c) => {
      const ex = byId(c.id);
      const slot = Object.assign({}, c, { ex });
      if (c.hold) {
        slot.hold = round5(c.hold * f);
        slot.work = slot.hold;
        slot.target = `${slot.hold} שניות`;
      } else {
        slot.reps = Math.max(4, Math.round(c.reps * f));
        slot.work = round5(slot.reps * (TEMPO[c.id] || 3));
        slot.target = `${slot.reps} חזרות`;
      }
      return slot;
    });
  }

  /**
   * בונה אימון באורך המבוקש בדיוק.
   * @param {object} o { level, week(1-4), durationMin }
   */
  function buildWorkout(o) {
    const level = clamp(o.level || 1, 1, 3);
    const week = clamp(o.week || 1, 1, 4);
    const mods = WEEK_MODS[week];
    const total = clamp(o.durationMin || 20, 5, 90) * 60;

    const warmSec = clamp(Math.round(total * 0.12 / 30) * 30, 60, 300);
    const coolSec = clamp(Math.round(total * 0.10 / 30) * 30, 60, 240);
    const prepSec = 10;
    const mainSec = total - warmSec - coolSec - prepSec;

    const p = PARAMS[level];
    const rest = Math.max(5, p.rest + mods.rest);
    const roundRest = p.roundRest;

    const slots = circuitFor(level, week);
    const exercises = slots.map((s) => s.ex);
    const workSum = slots.reduce((a, s) => a + s.work, 0);
    const roundTime = slots.length * READY + workSum + (slots.length - 1) * rest;
    // באימון קצר ברמה גבוהה אפילו סבב אחד ארוך מדי — אז בונים סבב חלקי בלבד
    let rounds = clamp(Math.floor((mainSec + roundRest) / (roundTime + roundRest)), 0, 8);

    const segments = [];
    const push = (s) => segments.push(s);
    push({ kind:'prep', label:'התכוננו', dur:prepSec, ex:null, phase:'חימום' });

    // תמיד אותם שלושה תרגילי חימום, כל אחד ארוך יותר באימון ארוך יותר
    const warmList = WARMUP.map(byId);
    const warmEach = Math.max(20, Math.floor(warmSec / warmList.length / 5) * 5);
    const warmRemainder = warmSec - warmEach * warmList.length;
    warmList.forEach((ex, i) => push({ kind:'warmup', ex, dur: warmEach + (i === warmList.length - 1 ? warmRemainder : 0), phase:'חימום', idx:i + 1, of:warmList.length }));

    // סבבים מלאים, ואם נשאר זמן — סבב סיום חלקי. כל תרגיל תורם את הזמן שלו,
    // ולכן סופרים תרגיל־תרגיל במקום להכפיל בזמן עבודה אחיד.
    let usedMain = rounds ? rounds * roundTime + (rounds - 1) * roundRest : 0;
    let leftover = Math.max(0, mainSec - usedMain);
    let finisher = 0, finSec = 0;
    for (let i = 0; i < slots.length; i++) {
      const add = (i ? rest : (rounds ? roundRest : 0)) + READY + slots[i].work;
      if (finSec + add > leftover) break;
      finSec += add; finisher = i + 1;
    }
    if (!rounds && !finisher) finisher = 1, finSec = READY + slots[0].work;   // תמיד לפחות תרגיל אחד
    if (finisher) { usedMain += finSec; leftover = Math.max(0, mainSec - usedMain); }

    const totalRounds = rounds + (finisher ? 1 : 0);
    for (let rd = 1; rd <= totalRounds; rd++) {
      const isFin = finisher && rounds && rd === totalRounds;
      const list = (finisher && rd === totalRounds) ? slots.slice(0, finisher) : slots;
      const phase = isFin ? 'סבב סיום' : 'עיקר';
      list.forEach((slot, i) => {
        const common = { ex:slot.ex, phase, round:rd, rounds:totalRounds, idx:i + 1, of:list.length, target:slot.target, reps:slot.reps, hold:slot.hold };
        push(Object.assign({ kind:'ready', dur:READY }, common));
        push(Object.assign({ kind:'work', dur:slot.work }, common));
        if (i < list.length - 1) push({ kind:'rest', ex:null, dur:rest, phase, round:rd, rounds:totalRounds, next:list[i + 1].ex, nextTarget:list[i + 1].target });
      });
      if (rd < totalRounds) push({ kind:'roundrest', ex:null, dur:roundRest, phase:'עיקר', round:rd, rounds:totalRounds, next:slots[0].ex, nextTarget:slots[0].target });
    }

    const coolList = COOLDOWN.map(byId);
    const coolTotal = coolSec + leftover;
    const coolEach = Math.max(20, Math.floor(coolTotal / coolList.length / 5) * 5);
    const coolRemainder = coolTotal - coolEach * coolList.length;
    coolList.forEach((ex, i) => push({ kind:'cooldown', ex, dur: coolEach + (i === coolList.length - 1 ? coolRemainder : 0), phase:'שחרור', idx:i + 1, of:coolList.length }));

    const plannedSec = segments.reduce((a, s) => a + s.dur, 0);
    return {
      segments,
      meta: {
        dayType:'workout', name:DAY_TYPES.workout.name, icon:DAY_TYPES.workout.icon,
        color:DAY_TYPES.workout.color, focus:DAY_TYPES.workout.focus,
        level, levelName:LEVELS[level], week, weekLabel:mods.label,
        rest, ready:READY, roundRest, rounds:totalRounds, finisher, slots, exercises, roundTime,
        warmup:warmList, cooldown:coolList, plannedSec, durationMin: Math.round(plannedSec / 60),
      },
    };
  }

  window.PROGRAM = { DAY_TYPES, PARAMS, WEEK_MODS, LEVELS, CIRCUIT, WARMUP, COOLDOWN, circuitFor, buildWorkout, hasImage };
})();
