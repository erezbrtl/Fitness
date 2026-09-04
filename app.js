/* קליסטניקס בבית — לוגיקת האפליקציה */
(function () {
  'use strict';
  const P = window.PROGRAM;
  const EX = window.EXERCISES;
  const STORE_KEY = 'calisthenics.home.v1';
  const APP_VERSION = '1.0.0';
  const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const DAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const CAT_NAMES = { warmup:'חימום', push:'דחיפה', pull:'משיכה', legs:'רגליים', core:'ליבה', cardio:'קרדיו', mobility:'ניידות', cooldown:'שחרור' };
  const KIND_LABEL = { prep:'התכוננו', warmup:'חימום', work:'עבודה', rest:'מנוחה', roundrest:'מנוחה בין סבבים', cooldown:'שחרור' };

  /* ---------- תאריכים ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const today = () => iso(new Date());
  const addDays = (s, n) => { const d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); };
  const daysBetween = (a, b) => Math.round((fromIso(b) - fromIso(a)) / 86400000);
  const fmtTime = (sec) => `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
  const fmtDate = (s) => { const d = fromIso(s); return `יום ${DAY_NAMES[d.getDay()]}, ${d.getDate()} ב${MONTHS[d.getMonth()]}`; };

  /* יום ראשון הקרוב (אם היום ראשון — היום) */
  function nextSunday(from) {
    const d = fromIso(from || today());
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
    return iso(d);
  }

  /* ---------- מצב ואחסון ---------- */
  const defaults = () => ({
    settings: { duration: 20, level: 1, trainDays: [0, 1, 2, 4, 5], sound: true, voice: false, wake: true },
    startDate: nextSunday(), // תחילת המחזור — כברירת מחדל יום ראשון הקרוב
    cycle: 1,
    sessions: [],          // { id, date, dayType, week, cycle, plannedSec, doneSec, completed, level }
    measures: [],          // { date, waist, weight }
    tests: [],             // { date, pushups, plankSec, squats }
    levelPrompted: {},     // מחזורים שכבר הוצעה בהם העלאת רמה
    quick: null,           // אימון קצר להיום בלבד { date, duration }
    hardPromptAt: null,    // מתי הוצע לאחרונה לרדת רמה בגלל עומס
    backupAt: 0,           // מספר האימונים שהושלמו בגיבוי האחרון
  });
  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaults();
      const s = Object.assign(defaults(), JSON.parse(raw));
      s.settings = Object.assign(defaults().settings, s.settings || {});
      if (!Array.isArray(s.measures)) s.measures = [];
      if (!Array.isArray(s.tests)) s.tests = [];
      return s;
    } catch { return defaults(); }
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {} }
  function weekStart(s) { const d = fromIso(s); d.setDate(d.getDate() - d.getDay()); return iso(d); }

  /* ---------- תוכנית ---------- */
  function scheduleForDays() {
    const days = state.settings.trainDays.slice().sort((a, b) => a - b);
    const order = P.SCHEDULES[days.length] || [];
    const map = {};
    days.forEach((d, i) => { map[d] = order[i]; });
    return map; // weekday -> dayType
  }
  function dayTypeFor(dateStr) {
    const wd = fromIso(dateStr).getDay();
    return scheduleForDays()[wd] || 'rest';
  }
  function weekInfo(dateStr) {
    const diff = Math.max(0, daysBetween(state.startDate, dateStr));
    const weekIdx = Math.floor(diff / 7);
    return { week: (weekIdx % 4) + 1, cycle: state.cycle + Math.floor(weekIdx / 4) };
  }
  function durationFor(dateStr) {
    const q = state.quick;
    return (q && q.date === dateStr) ? q.duration : state.settings.duration;
  }
  function workoutFor(dateStr, dayTypeOverride) {
    const dayType = dayTypeOverride || dayTypeFor(dateStr);
    if (dayType === 'rest') return null;
    const wi = weekInfo(dateStr);
    return P.buildWorkout({
      dayType, level: state.settings.level, week: wi.week,
      durationMin: durationFor(dateStr), seed: `${weekStart(dateStr)}|${wi.cycle}`,
    });
  }
  function sessionsOn(dateStr) { return state.sessions.filter((s) => s.date === dateStr); }
  function dayStatus(dateStr) {
    const ss = sessionsOn(dateStr);
    if (ss.some((s) => s.completed)) return 'done';
    if (ss.length) return 'partial';
    if (dayTypeFor(dateStr) === 'rest') return 'rest';
    if (dateStr < state.startDate) return 'none';
    if (dateStr < today()) return 'missed';
    return 'planned';
  }

  /* ---------- סטטיסטיקות ---------- */
  function stats() {
    const done = state.sessions.filter((s) => s.completed);
    const minutes = Math.round(state.sessions.reduce((a, s) => a + s.doneSec, 0) / 60);
    // רצף: ימי אימון מתוכננים רצופים שהושלמו (ימי מנוחה לא שוברים רצף)
    let streak = 0; let d = today();
    if (dayStatus(d) !== 'done' && dayStatus(d) !== 'partial') d = addDays(d, -1); // היום עוד לא נספר כהחמצה
    for (let i = 0; i < 400; i++) {
      const st = dayStatus(d);
      if (st === 'done') streak++;
      else if (st === 'rest' || st === 'planned' || st === 'none') { /* ממשיכים */ }
      else break;
      d = addDays(d, -1);
    }
    const ws = weekStart(today());
    const thisWeek = state.sessions.filter((s) => s.date >= ws && s.date <= addDays(ws, 6) && s.completed).length;
    const planned = state.settings.trainDays.length;
    return { workouts: done.length, minutes, streak, thisWeek, planned };
  }

  /* ---------- ניווט ---------- */
  const $ = (id) => document.getElementById(id);
  const screens = ['home', 'plan', 'progress', 'library', 'settings', 'player', 'summary', 'preview'];
  function show(name) {
    screens.forEach((s) => $('screen-' + s).classList.toggle('active', s === name));
    document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.screen === name));
    $('tabbar').classList.toggle('hidden', ['player', 'summary', 'preview'].includes(name));
    window.scrollTo(0, 0);
    if (name === 'home') renderHome();
    if (name === 'plan') renderPlan();
    if (name === 'progress') renderProgress();
    if (name === 'library') renderLibrary();
    if (name === 'settings') renderSettings();
  }
  document.querySelectorAll('#tabbar button').forEach((b) => b.addEventListener('click', () => show(b.dataset.screen)));

  function confirmModal(text) {
    return new Promise((resolve) => {
      $('modal-text').textContent = text; $('modal').hidden = false;
      const done = (v) => { $('modal').hidden = true; $('modal-ok').onclick = null; $('modal-cancel').onclick = null; resolve(v); };
      $('modal-ok').onclick = () => done(true); $('modal-cancel').onclick = () => done(false);
    });
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

  /* ---------- בית ---------- */
  function renderHome() {
    const t = today();
    const h = new Date().getHours();
    $('home-greeting').textContent = h < 12 ? 'בוקר טוב! ☀️' : h < 18 ? 'צהריים טובים! 💪' : 'ערב טוב! 🌙';
    $('home-date').textContent = fmtDate(t);
    const st = stats();
    $('home-streak').innerHTML = `🔥 <b>${st.streak}</b>`;

    const t0 = state.startDate;
    if (t < t0) { renderCountdown(t, t0); return; }
    const dayType = dayTypeFor(t);
    const day = P.DAY_TYPES[dayType];
    const wi = weekInfo(t);
    const status = dayStatus(t);
    const w = workoutFor(t);
    let html = `<div class="day-head"><div class="day-icon">${day.icon}</div><div><h2>${day.name}</h2><span class="muted">${day.focus}</span></div></div>`;
    if (status === 'done') html += `<div class="done-badge">✓ הושלם</div>`;
    if (w) {
      html += `<div><span class="tag">⏱ ${w.meta.durationMin} דק׳</span><span class="tag">🔁 ${w.meta.rounds}${w.meta.finisher ? '+' : ''} סבבים</span><span class="tag">⚡ ${w.meta.work}″ עבודה / ${w.meta.rest}″ מנוחה</span><span class="tag">📈 ${P.LEVELS[w.meta.level]} · שבוע ${wi.week}</span></div>`;
      html += `<div class="btn-row"><button class="btn primary" id="btn-start-today">${status === 'done' ? 'אימון נוסף' : 'התחלת אימון'} ▶</button><button class="btn secondary" id="btn-preview-today">פירוט</button></div>`;
      const cur = durationFor(t);
      const opts = [...new Set([10, 15, 20, 30, state.settings.duration])].sort((x, y) => x - y);
      html += `<div class="quick"><span>היום יש לי:</span>${opts.map((m) => `<button data-min="${m}" class="${m === cur ? 'active' : ''}">${m} דק׳</button>`).join('')}</div>`;
    } else {
      html += `<p class="muted">היום יום מנוחה. הגוף בונה שריר בזמן המנוחה — תנו לו את זה. אם בכל זאת מתחשק, אפשר לבחור אימון מהתוכנית.</p>`;
      html += `<div class="btn-row"><button class="btn secondary" id="btn-choose">בחירת אימון אחר</button></div>`;
    }
    $('today-card').innerHTML = html;
    if (w) {
      $('btn-start-today').onclick = () => startWorkout(t, dayType);
      $('btn-preview-today').onclick = () => showPreview(t, dayType);
      $('today-card').querySelectorAll('.quick button').forEach((b) => {
        b.onclick = () => {
          const m = Number(b.dataset.min);
          state.quick = m === state.settings.duration ? null : { date: t, duration: m };
          save(); renderHome();
        };
      });
    } else $('btn-choose').onclick = () => show('plan');
    renderBackupNote();

    // רצועת השבוע
    const ws = weekStart(t);
    $('week-strip').innerHTML = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(ws, i); const dt = P.DAY_TYPES[dayTypeFor(d)]; const s = dayStatus(d);
      return `<div class="d ${d === t ? 'today' : ''} ${s === 'done' ? 'done' : ''} ${s === 'missed' ? 'missed' : ''} ${s === 'rest' ? 'rest' : ''}"><span class="n">${DAY_SHORT[i]}</span><span class="i">${s === 'done' ? '✅' : dt.icon}</span>${dt.short}</div>`;
    }).join('');

    $('home-stats').innerHTML = `
      <div class="stat"><span class="v">${st.thisWeek}/${st.planned}</span><span class="l">אימונים השבוע</span></div>
      <div class="stat"><span class="v">${st.workouts}</span><span class="l">סה״כ אימונים</span></div>
      <div class="stat"><span class="v">${st.minutes}</span><span class="l">דקות אימון</span></div>`;

    // מחזור
    const mods = P.WEEK_MODS[wi.week];
    const dayInCycle = Math.max(0, daysBetween(state.startDate, t)) % 28;
    $('cycle-card').innerHTML = `<h3>מחזור ${wi.cycle} · שבוע ${wi.week} מתוך 4 — ${mods.label}</h3>
      <div class="cycle-bar"><div style="width:${Math.round((dayInCycle + 1) / 28 * 100)}%"></div></div>
      <div class="week-pills">${[1, 2, 3, 4].map((k) => `<span class="${k === wi.week ? 'cur' : k < wi.week ? 'past' : ''}">שבוע ${k}</span>`).join('')}</div>
      <p class="muted small" style="margin-top:8px">${wi.week === 4 ? 'שבוע שיא: עבודה ארוכה, מנוחה קצרה ווריאציות קשות. אחריו מתחיל מחזור חדש.' : 'עומס העבודה עולה משבוע לשבוע. שמרו על טכניקה ונשימה.'}</p>
      ${testDue(t) ? `<div class="btn-row"><button class="btn secondary" id="btn-go-test">${state.tests.length ? 'הגיע הזמן למבחן כושר' : 'לבצע מבחן כושר ראשון'}</button></div>` : ''}`;
    if (testDue(t)) $('btn-go-test').onclick = () => show('progress');

    maybeAdjustLevel(wi);
  }

  function renderCountdown(t, start) {
    const days = daysBetween(t, start);
    const map = scheduleForDays();
    const firstType = map[fromIso(start).getDay()] || Object.values(map)[0];
    const firstDay = P.DAY_TYPES[firstType] || P.DAY_TYPES.strengthA;
    $('today-card').innerHTML = `<div class="countdown">
      <div class="big">${days === 1 ? 'מחר' : `בעוד ${days} ימים`}</div>
      <p class="lbl">התוכנית מתחילה ב${fmtDate(start)}</p>
      <p class="muted small">האימון הראשון: ${firstDay.icon} ${firstDay.name} · ${state.settings.duration} דק׳</p>
      <div class="btn-row">
        <button class="btn primary" id="btn-preview-first">מה מחכה לי</button>
        <button class="btn secondary" id="btn-start-now">להתאמן כבר היום</button>
      </div></div>`;
    $('btn-preview-first').onclick = () => showPreview(start, firstType);
    $('btn-start-now').onclick = () => {
      const dt = dayTypeFor(t) === 'rest' ? firstType : dayTypeFor(t);
      showPreview(t, dt);
    };
    // רצועת השבוע של שבוע הפתיחה
    const ws = weekStart(start);
    $('week-strip').innerHTML = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(ws, i); const dt = P.DAY_TYPES[dayTypeFor(d)];
      return `<div class="d ${d === start ? 'today' : ''} ${dt.mode === 'rest' ? 'rest' : ''}"><span class="n">${DAY_SHORT[i]}</span><span class="i">${dt.icon}</span>${dt.short}</div>`;
    }).join('');
    const st = stats();
    $('home-stats').innerHTML = `
      <div class="stat"><span class="v">${state.settings.trainDays.length}</span><span class="l">ימי אימון בשבוע</span></div>
      <div class="stat"><span class="v">${state.settings.duration}</span><span class="l">דקות ליום</span></div>
      <div class="stat"><span class="v">${st.workouts}</span><span class="l">אימונים עד כה</span></div>`;
    $('cycle-card').innerHTML = `<h3>מה עומד לקרות</h3>
      <p class="muted small">מחזור של 4 שבועות: שבוע 1 בסיס, שבוע 2 עלייה בעומס, שבוע 3 עומס גבוה, שבוע 4 שיא. בסוף המחזור התוכנית מציעה לעלות רמה, ומתחילה מחזור חדש.</p>
      <div class="week-pills">${[1, 2, 3, 4].map((k) => `<span class="${k === 1 ? 'cur' : ''}">שבוע ${k}</span>`).join('')}</div>`;
  }

  /* מבחן כושר: פעם ב‑28 יום */
  function testDue(t) {
    if (!state.tests.length) return state.sessions.some((s) => s.completed);
    const last = state.tests.map((x) => x.date).sort().pop();
    return daysBetween(last, t) >= 28;
  }

  const BACKUP_EVERY = 10;
  function renderBackupNote() {
    const host = $('today-card');
    const old = document.getElementById('backup-note');
    if (old) old.remove();
    const done = state.sessions.filter((s) => s.completed).length;
    if (done - (state.backupAt || 0) < BACKUP_EVERY) return;
    const note = document.createElement('div');
    note.className = 'backup-note'; note.id = 'backup-note';
    note.innerHTML = `<p>הנתונים שלכם שמורים רק בדפדפן הזה. ניקוי נתוני גלישה או הסרת האפליקציה ימחק ${done} אימונים.</p><button>גיבוי עכשיו</button>`;
    note.querySelector('button').onclick = () => exportBackup();
    host.parentNode.insertBefore(note, host);
  }

  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  /* התאמת רמה: הנוכחות אומרת אם התמדתם, דירוג המאמץ אומר אם זו הרמה הנכונה */
  function maybeAdjustLevel(wi) {
    const lvl = state.settings.level;

    // אות מהיר: שלושת האימונים המדורגים האחרונים סומנו "קשה מדי"
    const rated = state.sessions.filter((s) => s.rpe).sort((a, b) => a.id - b.id);
    const last3 = rated.slice(-3);
    const cooled = !state.hardPromptAt || daysBetween(state.hardPromptAt, today()) >= 7;
    if (lvl > 1 && last3.length === 3 && last3.every((s) => s.rpe >= 5) && cooled) {
      state.hardPromptAt = today(); save();
      confirmModal(`שלושת האימונים האחרונים סומנו כ"קשה מדי". לרדת לרמת "${P.LEVELS[lvl - 1]}"? טכניקה נקייה ברמה נמוכה שווה יותר מחזרות עקומות ברמה גבוהה.`)
        .then((ok) => { if (ok) { state.settings.level--; save(); renderHome(); } });
      return;
    }

    // סיכום מחזור: פעם אחת, בשבוע הראשון של מחזור חדש
    if (wi.week !== 1 || wi.cycle <= 1) return;
    const prev = wi.cycle - 1;
    if (state.levelPrompted[prev]) return;
    const prevStart = addDays(state.startDate, (prev - state.cycle) * 28);
    const prevEnd = addDays(prevStart, 27);
    const inCycle = state.sessions.filter((s) => s.date >= prevStart && s.date <= prevEnd);
    const done = inCycle.filter((s) => s.completed).length;
    const planned = state.settings.trainDays.length * 4;
    const effort = avg(inCycle.map((s) => s.rpe).filter(Boolean));
    state.levelPrompted[prev] = true; save();
    if (!planned) return;

    if (effort != null && effort >= 4.3 && lvl > 1) {
      confirmModal(`במחזור האחרון דירגתם את האימונים כקשים מאוד (ממוצע ${effort.toFixed(1)} מתוך 5). לרדת לרמת "${P.LEVELS[lvl - 1]}" ולבנות בסיס יציב?`)
        .then((ok) => { if (ok) { state.settings.level--; save(); renderHome(); } });
      return;
    }
    if (done / planned < 0.75 || lvl >= 3) return;   // בלי התמדה אין ממה להסיק
    if (effort != null && effort > 2.9) return;      // התמדתם, והעומס כבר מרגיש נכון — נשארים

    const why = effort != null
      ? `השלמתם ${done} מתוך ${planned} אימונים, ודירגתם אותם כקלים יחסית (ממוצע ${effort.toFixed(1)} מתוך 5).`
      : `השלמתם ${done} מתוך ${planned} אימונים במחזור הקודם.`;
    confirmModal(`${why} להעלות את רמת הקושי ל"${P.LEVELS[lvl + 1]}"?`)
      .then((ok) => { if (ok) { state.settings.level++; save(); renderHome(); } });
  }

  /* ---------- תוכנית ---------- */
  function renderPlan() {
    const map = scheduleForDays();
    const t = today();
    $('plan-list').innerHTML = Array.from({ length: 7 }, (_, wd) => {
      const dt = P.DAY_TYPES[map[wd] || 'rest'];
      const isRest = dt.mode === 'rest';
      return `<div class="plan-day ${isRest ? 'rest' : ''}" data-wd="${wd}"><div class="ic">${dt.icon}</div><div class="t"><b>${dt.name}</b><span>${dt.focus}</span></div><div class="dn">${DAY_NAMES[wd]}</div></div>`;
    }).join('');
    $('plan-list').querySelectorAll('.plan-day:not(.rest)').forEach((el) => {
      el.onclick = () => {
        const wd = Number(el.dataset.wd);
        // תאריך היום המתאים בשבוע הנוכחי
        const d = addDays(weekStart(t), wd);
        showPreview(d, map[wd]);
      };
    });
  }

  /* ---------- תצוגה מקדימה ---------- */
  function showPreview(dateStr, dayType) {
    const w = workoutFor(dateStr, dayType);
    if (!w) return;
    const m = w.meta;
    $('pv-title').textContent = `${m.icon} ${m.name}`;
    const row = (ex, dur, i) => `<div class="pv-ex" tabindex="0"><span class="num">${i + 1}</span><div class="body"><b>${esc(ex.name)}</b><span>${CAT_NAMES[ex.cat]} · ${esc(ex.muscles)}${ex.sides ? ' · חצי זמן לכל צד' : ''}</span><div class="how"><ol class="steps">${ex.steps.map((t) => `<li>${esc(t)}</li>`).join('')}</ol><p class="tip">${esc(ex.tip)}</p></div></div><span class="dur">${dur}″</span></div>`;
    $('pv-body').innerHTML = `
      <div class="pv-summary">
        <div><b>${m.durationMin}</b><span>דקות</span></div>
        <div><b>${m.rounds}</b><span>סבבים</span></div>
        <div><b>${m.work}″</b><span>עבודה</span></div>
        <div><b>${m.rest}″</b><span>מנוחה</span></div>
      </div>
      <p class="muted small">${esc(m.focus)} · רמה: ${m.levelName} · שבוע ${m.week} (${m.weekLabel}) · ${fmtDate(dateStr)}</p>
      <div class="pv-section"><h3>חימום <small>${w.segments.filter((s) => s.kind === 'warmup').length} תרגילים</small></h3>${m.warmup.map((e, i) => row(e, 30, i)).join('')}</div>
      <div class="pv-section"><h3>עיקר האימון <small>${m.rounds} סבבים × ${m.exercises.length} תרגילים${m.finisher ? ` + סבב סיום של ${m.finisher}` : ''}, ${m.roundRest}″ מנוחה בין סבבים</small></h3>${m.exercises.map((e, i) => row(e, m.work, i)).join('')}</div>
      <div class="pv-section"><h3>שחרור ומתיחות</h3>${w.segments.filter((s) => s.kind === 'cooldown').map((s, i) => row(s.ex, s.dur, i)).join('')}</div>
      <div class="sticky-bottom"><button class="btn primary block" id="pv-start">התחלת אימון ▶</button></div>`;
    $('pv-body').querySelectorAll('.pv-ex').forEach((el) => {
      el.onclick = () => el.classList.toggle('open');
      el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.classList.toggle('open'); } };
    });
    $('pv-start').onclick = () => startWorkout(dateStr, dayType);
    $('pv-back').onclick = () => show(prevScreen);
    show('preview');
  }
  let prevScreen = 'home';
  document.querySelectorAll('#tabbar button').forEach((b) => b.addEventListener('click', () => { prevScreen = b.dataset.screen; }));

  /* ---------- צלילים ---------- */
  let audioCtx = null;
  function ensureAudio() {
    if (!state.settings.sound) return;
    try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch {}
  }
  function beep(freq = 880, dur = 0.12, vol = 0.25) {
    if (!state.settings.sound || !audioCtx) return;
    try {
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = freq; g.gain.value = vol;
      o.connect(g); g.connect(audioCtx.destination);
      const t = audioCtx.currentTime; o.start(t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.stop(t + dur);
    } catch {}
  }
  function speak(text) {
    if (!state.settings.voice || !('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'he-IL'; u.rate = 1.05; speechSynthesis.speak(u); } catch {}
  }
  if (navigator.vibrate) { /* זמין */ }
  const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

  /* ---------- Wake Lock ---------- */
  let wakeLock = null;
  async function requestWake() { if (!state.settings.wake || !('wakeLock' in navigator)) return; try { wakeLock = await navigator.wakeLock.request('screen'); } catch {} }
  function releaseWake() { try { wakeLock && wakeLock.release(); } catch {} wakeLock = null; }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !player.active || player.paused) return;
    requestWake(); tick();
  });

  /* ---------- נגן ---------- */
  const player = { active: false, paused: false, workout: null, idx: 0, segStart: 0, pausedAt: 0, timer: null, lastWhole: -1, sideDone: false, doneSec: 0, date: null, dayType: null };
  const RING = 2 * Math.PI * 54;

  function startWorkout(dateStr, dayType) {
    const w = workoutFor(dateStr, dayType);
    if (!w) return;
    ensureAudio();
    Object.assign(player, { active: true, paused: false, workout: w, idx: 0, pausedAt: 0, lastWhole: -1, sideDone: false, doneSec: 0, date: dateStr, dayType });
    $('pl-name').textContent = `${w.meta.icon} ${w.meta.name}`;
    $('pl-total').textContent = fmtTime(w.meta.plannedSec);
    show('player');
    requestWake();
    enterSegment(0);
    player.timer = setInterval(tick, 200);
  }
  function segElapsedBefore(i) { let a = 0; for (let k = 0; k < i; k++) a += player.workout.segments[k].dur; return a; }

  function enterSegment(i, opts) {
    opts = opts || {};
    const segs = player.workout.segments;
    if (i >= segs.length) return finishWorkout(true);
    player.idx = i; player.segStart = performance.now() - (opts.elapsed || 0) * 1000;
    player.lastWhole = -1; player.sideDone = false;
    const s = segs[i];
    const pl = $('screen-player');
    pl.className = `screen player active mode-${s.kind}${player.paused ? ' paused' : ''}`;
    $('pl-kind').textContent = KIND_LABEL[s.kind] + (s.round ? ` · סבב ${s.round}/${s.rounds}` : '');
    $('pl-phase').textContent = s.phase + (s.idx ? ` · תרגיל ${s.idx}/${s.of}` : '');
    $('pl-side').hidden = true;
    $('pl-swap').hidden = !s.ex;
    const upcoming = s.next || (segs[i + 1] && segs[i + 1].ex) || (segs[i + 2] && segs[i + 2].ex) || null;
    if (s.ex) {
      $('pl-ex').textContent = s.ex.name;
      $('pl-meta').textContent = `${CAT_NAMES[s.ex.cat]} · ${s.ex.muscles}${s.ex.sides ? ' · החליפו צד באמצע' : ''}`;
      setHow(s.ex, false);
      if (!opts.silent) speak(s.ex.name);
    } else {
      $('pl-ex').textContent = s.kind === 'prep' ? 'מוכנים?' : 'מנוחה';
      $('pl-meta').textContent = s.kind === 'prep' ? 'עמדו על המזרן, נשמו עמוק' : 'נשמו, שתו מים אם צריך';
      setHow(upcoming, true);
      if (s.kind !== 'prep' && !opts.silent) speak('מנוחה');
    }
    const next = upcoming;
    $('pl-next').innerHTML = next && next !== s.ex ? `הבא: <b>${esc(next.name)}</b>` : (i === segs.length - 1 ? 'זהו — התרגיל האחרון!' : '');
    $('pl-next').hidden = !$('pl-next').innerHTML;
    if (!opts.silent) {
      if (s.kind === 'work') { beep(1046, 0.25, 0.35); vibrate(120); }
      else if (s.kind === 'rest' || s.kind === 'roundrest') { beep(523, 0.2); }
      else if (s.kind !== 'prep') beep(700, 0.12);
    }
    renderTime(s.dur);
  }

  function swapCurrent() {
    const s = player.workout.segments[player.idx];
    const ex = s.ex;
    if (!ex) return;
    const used = new Set(player.workout.segments.filter((x) => x.ex).map((x) => x.ex.id));
    let pool = EX.filter((e) => e.cat === ex.cat && e.level <= state.settings.level && !used.has(e.id));
    if (!pool.length) pool = EX.filter((e) => e.cat === ex.cat && e.level <= state.settings.level && e.id !== ex.id);
    if (!pool.length) return;
    const rep = pool[Math.floor(Math.random() * pool.length)];
    player.workout.segments.forEach((x) => { if (x.ex === ex) x.ex = rep; if (x.next === ex) x.next = rep; });
    const m = player.workout.meta;
    m.exercises = m.exercises.map((e) => (e === ex ? rep : e));
    m.warmup = m.warmup.map((e) => (e === ex ? rep : e));
    const el = (performance.now() - player.segStart) / 1000;
    enterSegment(player.idx, { silent: true, elapsed: Math.min(el, 2) });
  }
  $('pl-swap').onclick = swapCurrent;

  function setHow(ex, upcoming) {
    $('pl-steps').innerHTML = ex ? ex.steps.map((t) => `<li>${esc(t)}</li>`).join('') : '';
    $('pl-tip').textContent = ex ? ex.tip : '';
    $('pl-tip').hidden = !ex;
    $('pl-steps').classList.toggle('preview', !!upcoming);
  }

  function tick() {
    if (player.paused) return;
    const segs = player.workout.segments;
    let s = segs[player.idx];
    let el = (performance.now() - player.segStart) / 1000;
    // האפליקציה הייתה מושהית (מסך כבוי / מעבר לאפליקציה אחרת) — קופצים ישר למקטע הנכון, בשקט
    if (el > s.dur + 1.5) {
      let i = player.idx;
      while (i < segs.length && el >= segs[i].dur) { el -= segs[i].dur; i++; }
      if (i >= segs.length) return finishWorkout(true);
      enterSegment(i, { silent: true, elapsed: el });
      s = segs[player.idx];
      el = (performance.now() - player.segStart) / 1000;
    }
    const remain = Math.max(0, s.dur - el);
    const whole = Math.ceil(remain);
    if (whole !== player.lastWhole) {
      player.lastWhole = whole;
      renderTime(whole);
      if (whole > 0 && whole <= 3 && s.kind !== 'cooldown') { beep(660, 0.08, 0.2); $('pl-time').classList.remove('flash'); void $('pl-time').offsetWidth; $('pl-time').classList.add('flash'); }
      if (s.ex && s.ex.sides && !player.sideDone && el >= s.dur / 2) {
        player.sideDone = true; $('pl-side').hidden = false; beep(1318, 0.15, 0.3); beep(1318, 0.15, 0.3); vibrate([60, 60, 60]); speak('החליפו צד');
      }
    }
    const done = segElapsedBefore(player.idx) + Math.min(el, s.dur);
    player.doneSec = Math.round(done);
    $('pl-elapsed').textContent = fmtTime(Math.round(done));
    $('pl-progress').style.width = `${(done / player.workout.meta.plannedSec) * 100}%`;
    $('pl-ring').style.strokeDashoffset = RING * (1 - remain / s.dur);
    if (el >= s.dur) enterSegment(player.idx + 1);
  }
  function renderTime(sec) { $('pl-time').textContent = sec >= 60 ? fmtTime(sec) : String(sec); }

  function togglePause() {
    if (!player.active) return;
    player.paused = !player.paused;
    $('screen-player').classList.toggle('paused', player.paused);
    $('pl-pause').textContent = player.paused ? '▶' : '⏸';
    if (player.paused) { player.pausedAt = performance.now(); releaseWake(); }
    else { player.segStart += performance.now() - player.pausedAt; requestWake(); ensureAudio(); }
  }
  $('pl-pause').onclick = togglePause;
  $('pl-skip').onclick = () => { if (player.active) enterSegment(player.idx + 1); };
  $('pl-prev').onclick = () => { if (!player.active) return; const el = (performance.now() - player.segStart) / 1000; enterSegment(el > 3 ? player.idx : Math.max(0, player.idx - 1)); };
  $('pl-exit').onclick = async () => {
    const wasPaused = player.paused; if (!wasPaused) togglePause();
    const ok = await confirmModal('לסיים את האימון עכשיו? ההתקדמות עד כה תישמר כאימון חלקי.');
    if (ok) finishWorkout(false); else if (!wasPaused) togglePause();
  };
  document.addEventListener('keydown', (e) => { if (player.active && e.code === 'Space') { e.preventDefault(); togglePause(); } });

  function finishWorkout(completed) {
    clearInterval(player.timer); player.timer = null; player.active = false; releaseWake();
    const w = player.workout; const wi = weekInfo(player.date);
    const doneSec = completed ? w.meta.plannedSec : player.doneSec;
    const minRecord = 60; // פחות מדקה לא נרשם
    let rec = null;
    if (doneSec >= minRecord) {
      rec = { id: Date.now(), date: today(), dayType: player.dayType, week: wi.week, cycle: wi.cycle, plannedSec: w.meta.plannedSec, doneSec, completed, level: w.meta.level, rpe: null };
      state.sessions.push(rec);
      save();
    }
    if (completed) { beep(880, 0.15, 0.3); setTimeout(() => beep(1108, 0.15, 0.3), 160); setTimeout(() => beep(1318, 0.3, 0.3), 320); vibrate([100, 50, 100, 50, 200]); speak('כל הכבוד, סיימתם את האימון'); }
    const st = stats();
    $('summary-body').innerHTML = `
      <div class="big-icon">${completed ? '🏆' : '💪'}</div>
      <h1>${completed ? 'כל הכבוד! האימון הושלם' : 'אימון חלקי נשמר'}</h1>
      <p class="muted">${w.meta.icon} ${w.meta.name} · ${Math.round(doneSec / 60)} דקות${completed ? '' : ` מתוך ${w.meta.durationMin}`}</p>
      <div class="stats-row">
        <div class="stat"><span class="v">🔥 ${st.streak}</span><span class="l">רצף</span></div>
        <div class="stat"><span class="v">${st.thisWeek}/${st.planned}</span><span class="l">השבוע</span></div>
        <div class="stat"><span class="v">${st.workouts}</span><span class="l">סה״כ</span></div>
      </div>
      ${rec ? `<div class="rpe" id="rpe-box">
        <h3>כמה קשה היה?</h3>
        <div class="rpe-scale">${RPE_LABELS.map((l, i) => `<button data-v="${i + 1}"><b>${i + 1}</b><span>${l}</span></button>`).join('')}</div>
        <p class="muted small rpe-hint">הדירוג הוא מה שקובע מתי התוכנית תעלה או תוריד לכם רמה.</p>
      </div>` : ''}
      <p class="muted small" style="margin-top:16px">${completed ? tip() : 'גם אימון קצר עדיף על אפס. נתראה מחר!'}</p>
      <button class="btn primary block" id="sum-home">חזרה לבית</button>`;
    if (rec) {
      $('rpe-box').querySelectorAll('button').forEach((btn) => {
        btn.onclick = () => {
          rec.rpe = Number(btn.dataset.v); save();
          $('rpe-box').querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === btn));
          $('rpe-box').querySelector('.rpe-hint').textContent = RPE_REPLY[rec.rpe - 1];
        };
      });
    }
    $('sum-home').onclick = () => show('home');
    show('summary');
  }
  const RPE_LABELS = ['קל מדי', 'קל', 'בדיוק', 'קשה', 'קשה מדי'];
  const RPE_REPLY = [
    'נרשם. אם זה יחזור על עצמו, התוכנית תציע לכם לעלות רמה.',
    'נרשם. יש לכם עוד מקום לגדול בו.',
    'נרשם. זו בדיוק הרמה הנכונה עבורכם כרגע.',
    'נרשם. קשה זה טוב — ככה נבנה שריר.',
    'נרשם. אם זה יחזור על עצמו, נציע לכם לרדת רמה. אין בזה שום בושה.',
  ];
  const TIPS = [
    'שריפת שומן בטני היא בעיקר עניין של עקביות ותזונה: גירעון קלורי קטן ושינה טובה עושים את ההבדל.',
    'שתו כוס מים אחרי האימון והוסיפו חלבון בארוחה הבאה, זה מה שבונה את השריר.',
    'הדירוג שאתם נותנים כאן הוא מה שמכוון את התוכנית. תהיו כנים איתו.',
    'מנוחה היא חלק מהתוכנית. השרירים גדלים בזמן שאתם נחים.',
    'טכניקה טובה בחזרות מעטות עדיפה על הרבה חזרות עקומות.',
    'רשמו לעצמכם איך הרגשתם היום. בעוד חודש תופתעו מההתקדמות.',
  ];
  const tip = () => TIPS[Math.floor(Math.random() * TIPS.length)];

  /* ---------- התקדמות ---------- */
  /* גרף קו פשוט לסדרת מדידות */
  function lineChart(points, unit) {
    if (points.length < 2) return `<p class="empty">${points.length ? 'עוד מדידה אחת והגרף יופיע' : 'אין עדיין מדידות'}</p>`;
    const W = 300, H = 118, PL = 30, PR = 6, PT = 10, PB = 18;
    const vals = points.map((p) => p.v);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi - lo < 1) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.15; lo -= pad; hi += pad;
    const x = (i) => PL + (i / (points.length - 1)) * (W - PL - PR);
    const y = (v) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join('');
    const area = `${line}L${x(points.length - 1).toFixed(1)} ${H - PB}L${x(0).toFixed(1)} ${H - PB}Z`;
    const dots = points.map((p, i) => `<circle class="dot" cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3"/>`).join('');
    const first = fromIso(points[0].date), last = fromIso(points[points.length - 1].date);
    const fd = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
    return `<svg class="line-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="גרף מדידות">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#38bdf8" stop-opacity=".35"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/>
      </linearGradient></defs>
      <line class="grid" x1="${PL}" y1="${PT}" x2="${W - PR}" y2="${PT}"/>
      <line class="grid" x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}"/>
      <path class="area" d="${area}"/><path class="line" d="${line}"/>${dots}
      <text class="lbl" x="${PL - 4}" y="${PT + 4}" text-anchor="end">${hi.toFixed(1)}</text>
      <text class="lbl" x="${PL - 4}" y="${H - PB}" text-anchor="end">${lo.toFixed(1)}</text>
      <text class="lbl" x="${x(0)}" y="${H - 5}" text-anchor="middle">${fd(first)}</text>
      <text class="lbl" x="${x(points.length - 1)}" y="${H - 5}" text-anchor="middle">${fd(last)}</text>
    </svg>`;
  }

  const deltaHtml = (cur, prev, unit, lowerIsBetter) => {
    if (prev == null || cur == null) return '';
    const d = +(cur - prev).toFixed(1);
    if (d === 0) return `<span class="delta same">ללא שינוי</span>`;
    const good = lowerIsBetter ? d < 0 : d > 0;
    return `<span class="delta ${good ? 'down' : 'up'}">${d > 0 ? '+' : '−'}${Math.abs(d)}${unit}</span>`;
  };

  let measMetric = 'waist';
  function renderMeasures() {
    const sorted = state.measures.slice().sort((a, b) => a.date.localeCompare(b.date));
    const pts = sorted.filter((m) => m[measMetric] != null).map((m) => ({ date: m.date, v: m[measMetric] }));
    $('meas-chart').innerHTML = lineChart(pts, measMetric === 'waist' ? 'ס״מ' : 'ק״ג');
    $('meas-toggle').querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.v === measMetric));
    const last = sorted[sorted.length - 1], prev = sorted[sorted.length - 2];
    if (!last) { $('meas-summary').innerHTML = ''; return; }
    const cell = (label, key, unit) => {
      const c = last[key], p = prev ? prev[key] : null;
      return `<div><span class="v">${c != null ? c : '—'}</span><span class="l">${label}${unit ? ' (' + unit + ')' : ''}</span>${deltaHtml(c, p, '', true)}</div>`;
    };
    const firstW = sorted.find((m) => m.waist != null);
    const totalW = firstW && last.waist != null && sorted.length > 1 ? deltaHtml(last.waist, firstW.waist, ' ס״מ', true) : '';
    $('meas-summary').innerHTML = `<div class="meas-row">${cell('היקף מותן', 'waist', 'ס״מ')}${cell('משקל', 'weight', 'ק״ג')}</div>
      <p class="muted small" style="margin-top:8px">מדידה אחרונה: ${fmtDate(last.date)}${totalW ? ` · מאז המדידה הראשונה: ${totalW}` : ''}</p>`;
  }

  function renderTests() {
    const sorted = state.tests.slice().sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted[sorted.length - 1], prev = sorted[sorted.length - 2];
    if (!last) { $('test-results').innerHTML = '<p class="empty">עדיין לא בוצע מבחן. בצעו אותו עכשיו כדי לקבל נקודת פתיחה.</p>'; return; }
    const row = (label, key, unit) => `<div class="test-row"><span class="n">${label}</span>${deltaHtml(last[key], prev ? prev[key] : null, '', false)}<span class="v">${last[key] != null ? last[key] + unit : '—'}</span></div>`;
    $('test-results').innerHTML = `<div>${row('שכיבות סמיכה', 'pushups', '')}${row('פלאנק', 'plankSec', ' שנ׳')}${row('סקוואטים בדקה', 'squats', '')}</div>
      <p class="muted small" style="margin-top:8px">מבחן אחרון: ${fmtDate(last.date)}${prev ? ` · קודם: ${fmtDate(prev.date)}` : ''}</p>`;
  }

  let calMonth = null;
  function renderProgress() {
    const st = stats();
    const rate = state.sessions.length ? Math.round(state.sessions.filter((s) => s.completed).length / state.sessions.length * 100) : 0;
    $('progress-stats').innerHTML = `
      <div class="stat"><span class="v">🔥 ${st.streak}</span><span class="l">רצף נוכחי</span></div>
      <div class="stat"><span class="v">${st.workouts}</span><span class="l">אימונים הושלמו</span></div>
      <div class="stat"><span class="v">${st.minutes}</span><span class="l">דקות סה״כ</span></div>`;

    // 8 שבועות
    const ws = weekStart(today());
    const weeks = Array.from({ length: 8 }, (_, i) => { const s = addDays(ws, -7 * (7 - i)); return { s, e: addDays(s, 6) }; });
    const vals = weeks.map((w) => Math.round(state.sessions.filter((x) => x.date >= w.s && x.date <= w.e).reduce((a, x) => a + x.doneSec, 0) / 60));
    const max = Math.max(1, ...vals);
    $('weekly-bars').innerHTML = weeks.map((w, i) => { const d = fromIso(w.s); return `<div class="bar ${i === 7 ? 'cur' : ''}"><div style="height:${Math.max(3, vals[i] / max * 100)}%" data-v="${vals[i] || ''}"></div><span>${d.getDate()}/${d.getMonth() + 1}</span></div>`; }).join('');

    if (!calMonth) { const n = new Date(); calMonth = { y: n.getFullYear(), m: n.getMonth() }; }
    renderCalendar();

    renderMeasures(); renderTests();

    const hist = state.sessions.slice().sort((a, b) => b.id - a.id).slice(0, 30);
    $('history-list').innerHTML = hist.length ? hist.map((s) => { const dt = P.DAY_TYPES[s.dayType] || P.DAY_TYPES.rest; return `<div class="hist"><span class="ic">${dt.icon}</span><div class="t">${dt.name}<span>${fmtDate(s.date)} · ${P.LEVELS[s.level] || ''} · שבוע ${s.week}</span></div><span class="m">${s.rpe ? `<i class="rpe-dot r${s.rpe}">${s.rpe}</i>` : ''}${Math.round(s.doneSec / 60)} דק׳ ${s.completed ? '✅' : '⏸'}</span></div>`; }).join('') : '<p class="empty">עדיין אין אימונים. היום יום טוב להתחיל!</p>';
  }
  function renderCalendar() {
    const { y, m } = calMonth;
    $('cal-title').textContent = `${MONTHS[m]} ${y}`;
    const first = new Date(y, m, 1); const days = new Date(y, m + 1, 0).getDate();
    let html = DAY_SHORT.map((d) => `<div class="h">${d}</div>`).join('');
    for (let i = 0; i < first.getDay(); i++) html += '<div class="c empty"></div>';
    const t = today();
    for (let d = 1; d <= days; d++) {
      const ds = iso(new Date(y, m, d)); const s = dayStatus(ds);
      html += `<div class="c ${s === 'done' ? 'done' : s === 'partial' ? 'partial' : s === 'missed' ? 'missed' : ''} ${ds === t ? 'today' : ''} ${ds > t ? 'future' : ''}">${d}</div>`;
    }
    $('calendar').innerHTML = html;
  }
  $('meas-toggle').querySelectorAll('button').forEach((b) => { b.onclick = () => { measMetric = b.dataset.v; renderMeasures(); }; });
  $('meas-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const waist = parseFloat($('meas-waist').value), weight = parseFloat($('meas-weight').value);
    if (isNaN(waist) && isNaN(weight)) return;
    const d = today();
    const rec = state.measures.find((m) => m.date === d) || (state.measures.push({ date: d }), state.measures[state.measures.length - 1]);
    if (!isNaN(waist)) rec.waist = waist;
    if (!isNaN(weight)) rec.weight = weight;
    save(); $('meas-waist').value = ''; $('meas-weight').value = ''; renderMeasures();
  });
  $('test-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const p = parseInt($('test-pushups').value, 10), k = parseInt($('test-plank').value, 10), s = parseInt($('test-squats').value, 10);
    if (isNaN(p) && isNaN(k) && isNaN(s)) return;
    state.tests.push({ date: today(), pushups: isNaN(p) ? null : p, plankSec: isNaN(k) ? null : k, squats: isNaN(s) ? null : s });
    save(); ['test-pushups', 'test-plank', 'test-squats'].forEach((id) => { $(id).value = ''; }); renderTests();
  });

  $('cal-prev').onclick = () => { calMonth.m--; if (calMonth.m < 0) { calMonth.m = 11; calMonth.y--; } renderCalendar(); };
  $('cal-next').onclick = () => { calMonth.m++; if (calMonth.m > 11) { calMonth.m = 0; calMonth.y++; } renderCalendar(); };

  /* ---------- ספרייה ---------- */
  let libCat = 'all';
  function renderLibrary() {
    const cats = ['all', 'push', 'pull', 'legs', 'core', 'cardio', 'mobility', 'warmup', 'cooldown'];
    $('lib-chips').innerHTML = cats.map((c) => `<button class="${c === libCat ? 'active' : ''}" data-c="${c}">${c === 'all' ? 'הכל' : CAT_NAMES[c]}</button>`).join('');
    $('lib-chips').querySelectorAll('button').forEach((b) => { b.onclick = () => { libCat = b.dataset.c; renderLibrary(); }; });
    const q = ($('lib-search').value || '').trim();
    const hay = (e) => `${e.name} ${e.muscles} ${e.steps.join(' ')} ${e.tip}`;
    const list = EX.filter((e) => (libCat === 'all' || e.cat === libCat) && (!q || hay(e).includes(q)));
    $('lib-list').innerHTML = list.length ? list.map((e) => `<details class="lib-ex"><summary><b>${esc(e.name)}</b><span class="lvl">${P.LEVELS[e.level]}</span><span class="lvl">${CAT_NAMES[e.cat]}</span></summary><ol class="steps">${e.steps.map((t) => `<li>${esc(t)}</li>`).join('')}</ol><p class="tip">${esc(e.tip)}</p><div class="m">שרירים: ${esc(e.muscles)}${e.sides ? ' · תרגיל חד‑צדדי' : ''}</div></details>`).join('') : '<p class="empty">לא נמצאו תרגילים</p>';
  }
  $('lib-search').addEventListener('input', renderLibrary);

  /* ---------- הגדרות ---------- */
  function renderSettings() {
    const s = state.settings;
    $('set-duration').value = s.duration; $('set-duration-out').textContent = `${s.duration} דק׳`;
    $('set-level').querySelectorAll('button').forEach((b) => b.classList.toggle('active', Number(b.dataset.v) === s.level));
    $('set-days').innerHTML = DAY_SHORT.map((d, i) => `<button class="${s.trainDays.includes(i) ? 'active' : ''}" data-d="${i}">${d}</button>`).join('');
    $('set-days').querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        const d = Number(b.dataset.d);
        if (s.trainDays.includes(d)) { if (s.trainDays.length <= 1) return; s.trainDays = s.trainDays.filter((x) => x !== d); }
        else s.trainDays.push(d);
        s.trainDays.sort((a, b2) => a - b2); save(); renderSettings();
      };
    });
    $('set-start').value = state.startDate;
    $('set-sound').checked = s.sound; $('set-voice').checked = s.voice; $('set-wake').checked = s.wake;
    $('version').textContent = `גרסה ${APP_VERSION}`;
  }
  $('set-duration').addEventListener('input', (e) => { state.settings.duration = Number(e.target.value); $('set-duration-out').textContent = `${state.settings.duration} דק׳`; save(); });
  $('set-level').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { state.settings.level = Number(b.dataset.v); save(); renderSettings(); }));
  $('set-start').addEventListener('change', (e) => {
    if (!e.target.value) { e.target.value = state.startDate; return; }
    state.startDate = e.target.value; state.cycle = 1; save();
  });
  $('set-sound').addEventListener('change', (e) => { state.settings.sound = e.target.checked; save(); });
  $('set-voice').addEventListener('change', (e) => { state.settings.voice = e.target.checked; save(); });
  $('set-wake').addEventListener('change', (e) => { state.settings.wake = e.target.checked; save(); });

  function exportBackup() {
    state.backupAt = state.sessions.filter((s) => s.completed).length;
    save();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const el = document.createElement('a');
    el.href = URL.createObjectURL(blob); el.download = `calisthenics-backup-${today()}.json`; el.click();
    setTimeout(() => URL.revokeObjectURL(el.href), 2000);
    const note = document.getElementById('backup-note'); if (note) note.remove();
  }
  $('btn-export').onclick = exportBackup;
  $('btn-import').onclick = () => $('import-file').click();
  $('import-file').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data || !Array.isArray(data.sessions)) throw new Error('bad');
      if (await confirmModal(`לייבא גיבוי עם ${data.sessions.length} אימונים? הנתונים הנוכחיים יוחלפו.`)) { state = Object.assign(defaults(), data); state.settings = Object.assign(defaults().settings, data.settings || {}); save(); renderSettings(); alert('הגיבוי יובא בהצלחה'); }
    } catch { alert('הקובץ אינו גיבוי תקין'); }
    e.target.value = '';
  });
  $('btn-restart-cycle').onclick = async () => {
    if (await confirmModal('להתחיל מחזור חדש של 4 שבועות מיום ראשון הקרוב (שבוע 1)? ההיסטוריה נשמרת.')) { state.startDate = nextSunday(); state.cycle = 1; save(); show('home'); }
  };
  $('btn-reset').onclick = async () => {
    if (await confirmModal('לאפס את כל הנתונים, כולל ההיסטוריה וההגדרות? פעולה זו אינה הפיכה.')) { localStorage.removeItem(STORE_KEY); state = load(); show('home'); }
  };

  /* ---------- PWA ---------- */
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; $('btn-install').hidden = false; });
  $('btn-install').onclick = async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; $('btn-install').hidden = true; };
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  /* ---------- הפעלה ---------- */
  show('home');
})();
