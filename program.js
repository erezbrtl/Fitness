/* מנוע התוכנית — חמישה תרגילים קבועים, אותם תרגילים בכל אימון.
   מה שמשתנה הוא הקושי: לכל תרגיל יש גרסה לכל רמה, וזמני העבודה עולים לאורך המחזור. */
(function () {
  const EX = window.EXERCISES;
  const byId = (id) => EX.find((e) => e.id === id);

  /* החמישייה הקבועה — דחיפה, רגליים, ליבה סטטית, בטן, ושרשרת אחורית */
  const CIRCUIT = [
    { key:'push',   label:'שכיבות סמיכה', why:'חזה, כתפיים וזרוע אחורית',
      levels:['knee_pushup', 'pushup', 'diamond_pushup'] },
    { key:'legs',   label:'סקוואט', why:'ירך קדמית וישבן — קבוצת השרירים הגדולה בגוף',
      levels:['squat', 'wall_less_sit', 'jump_squat'] },
    { key:'plank',  label:'פלאנק', why:'כל הליבה בהחזקה אחת, כולל הגב התחתון',
      levels:['plank', 'shoulder_taps', 'plank_reach'] },
    { key:'abs',    label:'בטן', why:'שרירי הבטן בתנועה, משלים את הפלאנק הסטטי',
      levels:['crunch', 'leg_raise', 'v_up'] },
    { key:'glutes', label:'גשר ישבן', why:'ישבן וירך אחורית — מאזן את הצד הקדמי של הגוף',
      levels:['glute_bridge', 'sl_bridge', 'bridge_walk'] },
  ];

  const WARMUP = ['march', 'arm_circles', 'slow_squat'];
  const COOLDOWN = ['chest_open', 'hamstring_seated', 'child_pose'];

  const DAY_TYPES = {
    workout: { key:'workout', name:'האימון היומי', short:'אימון', icon:'💪', color:'#3b82f6',
      focus:'חמישה תרגילים, כל הגוף', mode:'circuit' },
    rest: { key:'rest', name:'יום מנוחה', short:'מנוחה', icon:'😴', color:'#64748b',
      focus:'התאוששות. הליכה קלה ומתיחות אם בא לכם', mode:'rest' },
  };

  /* זמני עבודה ומנוחה לפי רמה (שניות) */
  const PARAMS = {
    1: { work:30, rest:10, roundRest:45 },
    2: { work:40, rest:10, roundRest:40 },
    3: { work:45, rest:10, roundRest:30 },
  };

  /* מחזור של 4 שבועות — העומס עולה בהדרגה */
  const WEEK_MODS = {
    1: { work:0,  rest:0,  label:'שבוע בסיס' },
    2: { work:5,  rest:0,  label:'עלייה בעומס' },
    3: { work:10, rest:-5, label:'עומס גבוה' },
    4: { work:10, rest:-5, label:'שבוע שיא' },
  };

  const LEVELS = { 1:'מתחיל', 2:'בינוני', 3:'מתקדם' };
  const READY = 10;   // שניות היכון לפני כל תרגיל בסבב — זמן להיכנס לתנוחה
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* התרגילים של הרמה הנוכחית */
  function circuitFor(level) {
    const l = clamp(level || 1, 1, 3);
    return CIRCUIT.map((c) => Object.assign({}, c, { ex: byId(c.levels[l - 1]) || byId(c.levels[0]) }));
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
    const work = p.work + mods.work;
    const rest = Math.max(5, p.rest + mods.rest);
    const roundRest = p.roundRest;

    const slots = circuitFor(level);
    const exercises = slots.map((s) => s.ex);
    const roundTime = exercises.length * (READY + work) + (exercises.length - 1) * rest;
    let rounds = clamp(Math.floor((mainSec + roundRest) / (roundTime + roundRest)), 1, 8);

    const segments = [];
    const push = (s) => segments.push(s);
    push({ kind:'prep', label:'התכוננו', dur:prepSec, ex:null, phase:'חימום' });

    // תמיד אותם שלושה תרגילי חימום, כל אחד ארוך יותר באימון ארוך יותר
    const warmList = WARMUP.map(byId);
    const warmEach = Math.max(20, Math.floor(warmSec / warmList.length / 5) * 5);
    const warmRemainder = warmSec - warmEach * warmList.length;
    warmList.forEach((ex, i) => push({ kind:'warmup', ex, dur: warmEach + (i === warmList.length - 1 ? warmRemainder : 0), phase:'חימום', idx:i + 1, of:warmList.length }));

    // סבבים מלאים, ואם נשאר זמן — סבב סיום חלקי
    let usedMain = rounds * roundTime + (rounds - 1) * roundRest;
    let leftover = Math.max(0, mainSec - usedMain);
    let finisher = 0;
    if (leftover >= roundRest + READY + work) {
      finisher = clamp(Math.floor((leftover - roundRest + rest) / (READY + work + rest)), 1, exercises.length);
      usedMain += roundRest + finisher * (READY + work) + (finisher - 1) * rest;
      leftover = Math.max(0, mainSec - usedMain);
    }
    const totalRounds = rounds + (finisher ? 1 : 0);
    for (let rd = 1; rd <= totalRounds; rd++) {
      const isFin = finisher && rd === totalRounds;
      const list = isFin ? exercises.slice(0, finisher) : exercises;
      const phase = isFin ? 'סבב סיום' : 'עיקר';
      list.forEach((ex, i) => {
        push({ kind:'ready', ex, dur:READY, phase, round:rd, rounds:totalRounds, idx:i + 1, of:list.length });
        push({ kind:'work', ex, dur:work, phase, round:rd, rounds:totalRounds, idx:i + 1, of:list.length });
        if (i < list.length - 1) push({ kind:'rest', ex:null, dur:rest, phase, round:rd, rounds:totalRounds, next:list[i + 1] });
      });
      if (rd < totalRounds) push({ kind:'roundrest', ex:null, dur:roundRest, phase:'עיקר', round:rd, rounds:totalRounds, next:exercises[0] });
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
        work, rest, ready:READY, roundRest, rounds:totalRounds, finisher, slots, exercises,
        warmup:warmList, cooldown:coolList, plannedSec, durationMin: Math.round(plannedSec / 60),
      },
    };
  }

  window.PROGRAM = { DAY_TYPES, PARAMS, WEEK_MODS, LEVELS, CIRCUIT, WARMUP, COOLDOWN, circuitFor, buildWorkout };
})();
