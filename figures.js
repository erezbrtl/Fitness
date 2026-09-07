/* מנוע הנפשה לתרגילים — דמות מפורקת למפרקים, נעה בין תנוחות מפתח.
   הכול וקטורי ומחושב בזמן אמת: אין קבצי תמונה, אין תלות ברשת. */
(function () {
  'use strict';

  /* אורכי איברים ביחידות הקנבס (200x132). הם קבועים תמיד — לכן האיברים
     לא "נמתחים" בין תנוחות: מה שמשתנה הוא הזוויות בלבד. */
  const L = { spine: 30, head: 10, hr: 7.5, upper: 18, fore: 17, thigh: 24, shin: 24, foot: 9 };
  const GY = 118;                       // קו הרצפה
  const rad = (d) => (d * Math.PI) / 180;
  const pt = (o, deg, len) => ({ x: o.x + len * Math.cos(rad(deg)), y: o.y - len * Math.sin(rad(deg)) });

  /* תנוחה = אגן (x,y) + זוויות. 0° ימינה, 90° מעלה.
     sp גו, hd ראש, sh זרוע עליונה, el אמה, hp ירך, kn שוק, an כף רגל.
     סיומת 2 = הצד הרחוק של הגוף (מצויר מאחור, בהיר יותר). */
  function build(p) {
    const hip = { x: p.x, y: p.y };
    const neck = pt(hip, p.sp, L.spine);
    const head = pt(neck, p.hd == null ? p.sp : p.hd, L.head);
    const g = (k, d) => (p[k] == null ? d : p[k]);
    const elbow = pt(neck, p.sh, L.upper), wrist = pt(elbow, p.el, L.fore);
    const elbowF = pt(neck, g('sh2', p.sh), L.upper), wristF = pt(elbowF, g('el2', p.el), L.fore);
    const knee = pt(hip, p.hp, L.thigh), ankle = pt(knee, p.kn, L.shin), toe = pt(ankle, p.an, L.foot);
    const kneeF = pt(hip, g('hp2', p.hp), L.thigh), ankleF = pt(kneeF, g('kn2', p.kn), L.shin),
          toeF = pt(ankleF, g('an2', p.an), L.foot);
    return { hip, neck, head, elbow, wrist, elbowF, wristF, knee, ankle, toe, kneeF, ankleF, toeF };
  }

  /* ---- מאגר התנוחות ----
     לכל תרגיל: frames = תנוחות המפתח, mode = איך עוברים ביניהן, period = אורך מחזור בשניות.
     pingpong הולך הלוך-חזור (ירידה ועלייה), loop רץ במעגל (סיבוב זרועות, צעידה). */
  const A = {};

  /* --- דחיפה: הידיים על הרצפה, הגוף בקו ישר, ירידה ועלייה --- */
  A.pushup = { period: 2.6, frames: [
    { x:102, y:93,  sp:20, hd:16, sh:-92, el:-88, hp:200, kn:200, an:-73, sh2:-84, el2:-95, hp2:196, kn2:204 },
    { x:104, y:110, sp:4,  hd:-6, sh:177, el:-40, hp:184, kn:184, an:-25, sh2:170, el2:-34, hp2:180, kn2:188 },
  ]};
  A.diamond_pushup = { period: 2.6, frames: [
    { x:102, y:93,  sp:20, hd:16, sh:-96, el:-84, hp:200, kn:200, an:-73, sh2:-96, el2:-84, hp2:196, kn2:204 },
    { x:104, y:110, sp:4,  hd:-6, sh:186, el:-30, hp:184, kn:184, an:-25, sh2:186, el2:-30, hp2:180, kn2:188 },
  ]};
  /* על הברכיים: הברך על המזרן, השוק מורמת מאחור */
  A.knee_pushup = { period: 2.6, frames: [
    { x:95,  y:101, sp:36, hd:30, sh:-92, el:-88, hp:216, kn:170, an:160, sh2:-84, el2:-95, hp2:212, kn2:174 },
    { x:100, y:112, sp:7,  hd:0,  sh:163, el:-65, hp:187, kn:170, an:160, sh2:156, el2:-59, hp2:183, kn2:174 },
  ]};

  /* --- רגליים --- */
  A.squat = { period: 3.0, frames: [
    { x:100, y:65, sp:90, hd:92, sh:-84, el:-86, hp:-90, kn:-90, an:-20, sh2:-78, el2:-80, hp2:-92, kn2:-88 },
    { x:81,  y:92, sp:55, hd:70, sh:-5,  el:5,   hp:5,   kn:-102, an:-20, sh2:1, el2:11, hp2:1, kn2:-98 },
  ]};
  A.slow_squat = { period: 4.2, frames: A.squat.frames };
  A.wall_less_sit = { period: 4.0, frames: [
    { x:76, y:89, sp:90, hd:92, sh:0,  el:0,  hp:0, kn:-90, an:-20, sh2:5,  el2:5,  hp2:-4, kn2:-86 },
    { x:76, y:91, sp:87, hd:89, sh:-3, el:-3, hp:0, kn:-90, an:-20, sh2:2,  el2:2,  hp2:-4, kn2:-86 },
  ]};
  A.jump_squat = { period: 2.2, mode:'loop', frames: [
    { x:81,  y:92, sp:55, hd:70, sh:-140, el:-160, hp:5,   kn:-102, an:-20, sh2:-134, el2:-154, hp2:1,   kn2:-98 },
    { x:100, y:62, sp:88, hd:90, sh:125,  el:115,  hp:-85, kn:-95,  an:-70, sh2:131,  el2:121,  hp2:-87, kn2:-93 },
    { x:94,  y:80, sp:70, hd:80, sh:-50,  el:-30,  hp:-30, kn:-115, an:-20, sh2:-44,  el2:-24,  hp2:-34, kn2:-111 },
  ]};

  /* --- ליבה סטטית: פלאנק על המרפקים --- */
  A.plank = { period: 4.5, frames: [
    { x:104, y:104, sp:7, hd:-5, sh:-90, el:0, hp:187, kn:187, an:-70, sh2:-84, el2:6, hp2:183, kn2:191 },
    { x:104, y:106, sp:6, hd:-6, sh:-92, el:-2, hp:186, kn:186, an:-70, sh2:-86, el2:4, hp2:182, kn2:190 },
  ]};
  /* פלאנק גבוה על הידיים — נגיעות כתף לסירוגין */
  const HIGH = { x:102, y:93, sp:20, hd:16, sh:-92, el:-88, hp:200, kn:200, an:-73, sh2:-84, el2:-95, hp2:196, kn2:204 };
  const withArm = (o) => Object.assign({}, HIGH, o);
  A.shoulder_taps = { period: 2.6, mode:'loop', frames: [
    withArm({}), withArm({ sh2:-35, el2:160 }), withArm({}), withArm({ sh:-35, el:160 }),
  ]};
  A.plank_reach = { period: 3.4, mode:'loop', frames: [
    withArm({}), withArm({ sh2:25, el2:25 }), withArm({}), withArm({ sh:25, el:25 }),
  ]};

  /* --- בטן: שוכבים על הגב, הראש שמאלה והרגליים ימינה --- */
  A.crunch = { period: 2.6, frames: [
    { x:112, y:113, sp:180, hd:185, sh:40, el:20, hp:55, kn:-58, an:0, sh2:46, el2:26, hp2:51, kn2:-54 },
    { x:112, y:113, sp:160, hd:140, sh:20, el:5,  hp:55, kn:-58, an:0, sh2:26, el2:11, hp2:51, kn2:-54 },
  ]};
  A.leg_raise = { period: 3.2, frames: [
    { x:112, y:113, sp:180, hd:182, sh:-2, el:-2, hp:0,  kn:0,  an:70, sh2:2, el2:2, hp2:-4, kn2:-4, an2:66 },
    { x:112, y:113, sp:180, hd:182, sh:-2, el:-2, hp:88, kn:90, an:10, sh2:2, el2:2, hp2:84, kn2:86, an2:6 },
  ]};
  A.v_up = { period: 2.8, frames: [
    { x:112, y:113, sp:180, hd:180, sh:185, el:185, hp:0,  kn:0,  an:70, sh2:189, el2:189, hp2:-4, kn2:-4, an2:66 },
    { x:112, y:111, sp:140, hd:130, sh:14,  el:14,  hp:45, kn:45, an:5,  sh2:18,  el2:18,  hp2:41, kn2:41, an2:1 },
  ]};

  /* --- שרשרת אחורית: גשר ישבן --- */
  A.glute_bridge = { period: 2.8, frames: [
    { x:104, y:111, sp:180, hd:178, sh:-2, el:-2, hp:55, kn:-65, an:0, sh2:2, el2:2, hp2:51, kn2:-61 },
    { x:100, y:94,  sp:213, hd:196, sh:-2, el:-2, hp:11, kn:-79, an:0, sh2:2, el2:2, hp2:7,  kn2:-75 },
  ]};
  A.sl_bridge = { period: 2.8, frames: [
    { x:104, y:111, sp:180, hd:178, sh:-2, el:-2, hp:55, kn:-65, an:0, sh2:2, el2:2, hp2:10, kn2:10, an2:60 },
    { x:100, y:94,  sp:213, hd:196, sh:-2, el:-2, hp:11, kn:-79, an:0, sh2:2, el2:2, hp2:20, kn2:20, an2:60 },
  ]};
  A.bridge_walk = { period: 2.8, mode:'loop', frames: [
    { x:100, y:94, sp:213, hd:196, sh:-2, el:-2, hp:11, kn:-79, an:0, sh2:2, el2:2, hp2:7,  kn2:-75 },
    { x:100, y:94, sp:213, hd:196, sh:-2, el:-2, hp:11, kn:-79, an:0, sh2:2, el2:2, hp2:20, kn2:20, an2:60 },
    { x:100, y:94, sp:213, hd:196, sh:-2, el:-2, hp:11, kn:-79, an:0, sh2:2, el2:2, hp2:7,  kn2:-75 },
    { x:100, y:94, sp:213, hd:196, sh:-2, el:-2, hp:16, kn:16,  an:60, sh2:2, el2:2, hp2:7,  kn2:-75 },
  ]};

  /* --- חימום --- */
  A.march = { period: 1.9, mode:'loop', frames: [
    { x:100, y:65, sp:90, hd:92, sh:-120, el:-100, hp:-30, kn:-110, an:-60, sh2:-60, el2:-80, hp2:-90, kn2:-90, an2:-20 },
    { x:100, y:65, sp:90, hd:92, sh:-88,  el:-88,  hp:-88, kn:-92,  an:-20, sh2:-88, el2:-88, hp2:-92, kn2:-88, an2:-20 },
    { x:100, y:65, sp:90, hd:92, sh:-60,  el:-80,  hp:-90, kn:-90,  an:-20, sh2:-120, el2:-100, hp2:-30, kn2:-110, an2:-60 },
    { x:100, y:65, sp:90, hd:92, sh:-88,  el:-88,  hp:-88, kn:-92,  an:-20, sh2:-88, el2:-88, hp2:-92, kn2:-88, an2:-20 },
  ]};
  A.arm_circles = { period: 2.6, mode:'loop', frames: [
    { x:100, y:65, sp:90, hd:92, sh:0,    el:0,    hp:-90, kn:-90, an:-20, sh2:-20,  el2:-20,  hp2:-92, kn2:-88 },
    { x:100, y:65, sp:90, hd:92, sh:-90,  el:-90,  hp:-90, kn:-90, an:-20, sh2:-110, el2:-110, hp2:-92, kn2:-88 },
    { x:100, y:65, sp:90, hd:92, sh:-180, el:-180, hp:-90, kn:-90, an:-20, sh2:-200, el2:-200, hp2:-92, kn2:-88 },
    { x:100, y:65, sp:90, hd:92, sh:-270, el:-270, hp:-90, kn:-90, an:-20, sh2:-290, el2:-290, hp2:-92, kn2:-88 },
  ]};

  /* --- שחרור --- */
  A.chest_open = { period: 4.0, frames: [
    { x:100, y:65, sp:90, hd:92, sh:-2,  el:2,   hp:-90, kn:-90, an:-20, sh2:-9,  el2:-5,  hp2:-92, kn2:-88 },
    { x:100, y:66, sp:94, hd:100, sh:196, el:206, hp:-90, kn:-90, an:-20, sh2:203, el2:213, hp2:-92, kn2:-88 },
  ]};
  A.hamstring_seated = { period: 4.5, frames: [
    { x:88, y:113, sp:75, hd:70, sh:-30, el:-25, hp:0, kn:0, an:70, sh2:-24, el2:-19, hp2:-4, kn2:-4, an2:66 },
    { x:88, y:113, sp:50, hd:35, sh:-40, el:-35, hp:0, kn:0, an:70, sh2:-34, el2:-29, hp2:-4, kn2:-4, an2:66 },
  ]};
  A.child_pose = { period: 5.0, frames: [
    { x:82, y:96, sp:-24, hd:-14, sh:-20, el:-8,  hp:-50, kn:178, an:195, sh2:-14, el2:-2, hp2:-54, kn2:182 },
    { x:82, y:97, sp:-26, hd:-16, sh:-22, el:-10, hp:-52, kn:178, an:195, sh2:-16, el2:-4, hp2:-56, kn2:182 },
  ]};

  /* ---- ציור ---- */
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* בונה שלד SVG פעם אחת, ואחר כך רק מעדכן קואורדינטות */
  /* כל תרגיל ממוסגר לפי הגודל שלו, כדי שימלא את המסגרת. יחס הצדדים קבוע
     כדי שגובה הכרטיס לא יקפוץ בין תרגילים, והרצפה תמיד בתחתית. */
  const AR = 1.06, PAD = 9;
  const boxes = {};
  function viewBox(id) {
    if (boxes[id]) return boxes[id];
    const def = A[id];
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = GY + 3;
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const j = build(poseAt(def, t));
      for (const k in j) {
        x0 = Math.min(x0, j[k].x); x1 = Math.max(x1, j[k].x);
        y0 = Math.min(y0, j[k].y); y1 = Math.max(y1, j[k].y);
      }
    }
    x0 -= PAD; x1 += PAD; y0 -= PAD; y1 += PAD - 4;
    let w = x1 - x0, h = y1 - y0;
    if (w / h < AR) { const nw = h * AR; x0 -= (nw - w) / 2; w = nw; }
    else { const nh = w / AR; y0 -= nh - h; h = nh; }   // המקום הנוסף נפתח למעלה
    return (boxes[id] = `${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
  }

  function makeRig(svg) {
    svg.innerHTML = '';
    const g = el('g', {});
    const mk = (cls, w) => el('line', { class: cls, 'stroke-width': w, 'stroke-linecap': 'round' });
    const far = {
      arm1: mk('fig-far', 5.5), arm2: mk('fig-far', 5),
      leg1: mk('fig-far', 7), leg2: mk('fig-far', 6.5), foot: mk('fig-far', 5),
    };
    const near = {
      leg1: mk('fig-limb', 7.5), leg2: mk('fig-limb', 7), foot: mk('fig-limb', 5.5),
      spine: mk('fig-body', 9),
      arm1: mk('fig-limb', 6), arm2: mk('fig-limb', 5.5),
    };
    const ground = el('line', { class: 'fig-ground', x1: 8, y1: GY + 1, x2: 192, y2: GY + 1, 'stroke-width': 2, 'stroke-linecap': 'round' });
    const head = el('circle', { class: 'fig-head', r: L.hr });
    g.appendChild(ground);
    Object.values(far).forEach((n) => g.appendChild(n));
    [near.leg1, near.leg2, near.foot, near.spine].forEach((n) => g.appendChild(n));
    g.appendChild(head);
    [near.arm1, near.arm2].forEach((n) => g.appendChild(n));
    svg.appendChild(g);
    return { far, near, head };
  }

  function apply(rig, j) {
    const set = (n, a, b) => { n.setAttribute('x1', a.x.toFixed(1)); n.setAttribute('y1', a.y.toFixed(1));
                               n.setAttribute('x2', b.x.toFixed(1)); n.setAttribute('y2', b.y.toFixed(1)); };
    set(rig.far.arm1, j.neck, j.elbowF); set(rig.far.arm2, j.elbowF, j.wristF);
    set(rig.far.leg1, j.hip, j.kneeF);   set(rig.far.leg2, j.kneeF, j.ankleF); set(rig.far.foot, j.ankleF, j.toeF);
    set(rig.near.leg1, j.hip, j.knee);   set(rig.near.leg2, j.knee, j.ankle);  set(rig.near.foot, j.ankle, j.toe);
    set(rig.near.spine, j.hip, j.neck);
    set(rig.near.arm1, j.neck, j.elbow); set(rig.near.arm2, j.elbow, j.wrist);
    rig.head.setAttribute('cx', j.head.x.toFixed(1)); rig.head.setAttribute('cy', j.head.y.toFixed(1));
  }

  const KEYS = ['x','y','sp','hd','sh','el','hp','kn','an','sh2','el2','hp2','kn2','an2'];
  function mix(a, b, u) {
    const o = {};
    for (const k of KEYS) {
      const av = a[k] == null ? fallback(a, k) : a[k];
      const bv = b[k] == null ? fallback(b, k) : b[k];
      if (av != null && bv != null) o[k] = av + (bv - av) * u;
    }
    return o;
  }
  function fallback(p, k) {
    if (k === 'sh2') return p.sh; if (k === 'el2') return p.el;
    if (k === 'hp2') return p.hp; if (k === 'kn2') return p.kn; if (k === 'an2') return p.an;
    return p[k];
  }

  const ease = (u) => u * u * (3 - 2 * u);

  /** תנוחת התרגיל בשלב t (0..1) של המחזור */
  function poseAt(def, t) {
    const f = def.frames;
    if (f.length === 1) return f[0];
    if (def.mode === 'loop') {
      const s = ((t % 1) + 1) % 1 * f.length;
      const i = Math.floor(s);
      return mix(f[i], f[(i + 1) % f.length], ease(s - i));
    }
    const u = 0.5 - 0.5 * Math.cos(2 * Math.PI * t);   // הלוך-חזור חלק
    const s = u * (f.length - 1);
    const i = Math.min(f.length - 2, Math.floor(s));
    return mix(f[i], f[i + 1], s - i);
  }

  /* ---- ממשק ---- */
  const rigs = new WeakMap();
  let raf = 0, live = [];

  function frame(now) {
    raf = 0;
    let any = false;
    for (const c of live) {
      if (!c.svg.isConnected) continue;
      any = true;
      const t = c.paused ? c.hold : ((now - c.t0) / (c.def.period * 1000));
      apply(c.rig, build(poseAt(c.def, t)));
    }
    if (any) raf = requestAnimationFrame(frame);
  }

  const Figures = {
    has(id) { return !!A[id]; },
    /** מחבר את ה‑SVG לתרגיל ומתחיל להנפיש. מחזיר false אם אין תנוחות לתרגיל. */
    play(svg, id) {
      const def = A[id];
      live = live.filter((c) => c.svg !== svg);
      if (!def) { svg.innerHTML = ''; return false; }
      let rig = rigs.get(svg);
      if (!rig) { rig = makeRig(svg); rigs.set(svg, rig); }
      svg.setAttribute('viewBox', viewBox(id));
      const c = { svg, rig, def, t0: performance.now(), paused: false, hold: 0 };
      live.push(c);
      apply(rig, build(poseAt(def, 0)));
      if (!raf) raf = requestAnimationFrame(frame);
      return true;
    },
    stop(svg) { live = live.filter((c) => c.svg !== svg); },
    setPaused(svg, on) {
      const c = live.find((x) => x.svg === svg);
      if (!c) return;
      if (on && !c.paused) { c.hold = (performance.now() - c.t0) / (c.def.period * 1000); c.paused = true; }
      else if (!on && c.paused) { c.t0 = performance.now() - c.hold * c.def.period * 1000; c.paused = false; }
    },
    /* לבדיקות: תמונה סטטית של תרגיל בשלב מסוים */
    _still(svg, id, t) {
      const def = A[id]; if (!def) return false;
      let rig = rigs.get(svg); if (!rig) { rig = makeRig(svg); rigs.set(svg, rig); }
      svg.setAttribute('viewBox', viewBox(id));
      apply(rig, build(poseAt(def, t))); return true;
    },
    _ids() { return Object.keys(A); },
  };
  window.FIGURES = Figures;
})();
