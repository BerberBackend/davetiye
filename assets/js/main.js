/* ==========================================================================
   Şüheda & Fatih · Davetiye — etkileşimler
   Bağımlılık yok; tüm çizimler (dallar, mühür, kemer, yol) tarayıcıda üretilir.
   ========================================================================== */
(() => {
  'use strict';

  const doc = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const NS = 'http://www.w3.org/2000/svg';
  const mq = (q) => window.matchMedia(q).matches;
  const reduceMotion = mq('(prefers-reduced-motion: reduce)');
  const finePointer = mq('(hover: hover) and (pointer: fine)');
  const hasIO = 'IntersectionObserver' in window;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const r1 = (n) => Math.round(n * 10) / 10;

  // Türkiye saati (UTC+3) ile etkinlikler
  const EVENTS = {
    kina: {
      label: 'Kına gecesi',
      title: 'Şüheda & Fatih · Kına Gecesi',
      start: Date.parse('2026-10-30T19:00:00+03:00'),
      end: Date.parse('2026-10-30T23:00:00+03:00'),
      when: '30 Ekim 2026 Cuma · Saat 19.00',
      place: 'Tektaş Gümüş Koza Düğün Salonu, Kumköprü Mah. Özgümüş Sk. No:17, Karatay / Konya',
      ics: 'assets/takvim/kina.ics',
      caption: 'Kına gecesine kalan süre'
    },
    dugun: {
      label: 'Düğün',
      title: 'Şüheda & Fatih · Düğün',
      start: Date.parse('2026-11-01T14:00:00+03:00'),
      end: Date.parse('2026-11-01T18:00:00+03:00'),
      when: '1 Kasım 2026 Pazar · Saat 14.00',
      place: 'Tektaş Altın Koza Düğün Salonu, İstiklal Mah. Saraçoğlu Cd. No:109, Karatay / Konya',
      ics: 'assets/takvim/dugun.ics',
      caption: 'Düğüne kalan süre',
      note: "Gelin alma: Saat 13.30'da erkek evinden hareket edilecektir."
    }
  };

  /* ---------- Tohumlu rastgele sayı: her ziyarette aynı dal ---------- */
  function rng(seed) {
    let a = (seed * 2654435761) >>> 0 || 1;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Noktalardan yumuşak eğri (Catmull-Rom → Bézier) */
  function curveThrough(pts, closed) {
    const n = pts.length;
    const at = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
    let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      d += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ` +
        `${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
    }
    return closed ? `${d}Z` : d;
  }

  /* ==========================================================================
     Altın toz (tuval)
     ========================================================================== */
  const Dust = (() => {
    const canvas = $('#dust');
    const ctx = canvas && canvas.getContext && canvas.getContext('2d');
    if (!ctx) return { burst() {} };

    const sprites = {};
    let W = 0, H = 0, motes = [], sparks = [], lastY = window.scrollY, raf = 0;

    function sprite(key, core, halo) {
      const s = document.createElement('canvas');
      s.width = s.height = 64;
      const g = s.getContext('2d');
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.16, core);
      grd.addColorStop(0.42, halo);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      sprites[key] = s;
    }
    sprite('gold', 'rgba(244,214,140,.95)', 'rgba(200,150,70,.26)');
    sprite('rose', 'rgba(255,205,195,.95)', 'rgba(215,120,120,.24)');

    function size() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function mote(fresh) {
      return {
        x: Math.random() * W,
        y: fresh ? Math.random() * H : H + 12,
        r: 0.7 + Math.random() * 1.8,
        vy: -(0.06 + Math.random() * 0.2),
        ph: Math.random() * Math.PI * 2,
        sp: 0.004 + Math.random() * 0.011,
        a: 0.22 + Math.random() * 0.45,
        z: 0.3 + Math.random() * 0.9
      };
    }

    function populate() {
      const n = Math.round(clamp((W * H) / 17000, 16, 60));
      motes = Array.from({ length: n }, () => mote(true));
    }

    function frame() {
      raf = 0;
      if (document.hidden) return;
      const sy = window.scrollY;
      const dy = sy - lastY;
      lastY = sy;
      ctx.clearRect(0, 0, W, H);

      if (!reduceMotion) {
        for (const m of motes) {
          m.ph += m.sp;
          m.y += m.vy - dy * 0.12 * m.z;
          m.x += Math.sin(m.ph) * 0.22;
          if (m.y < -20) Object.assign(m, mote(false));
          else if (m.y > H + 30) m.y = -10;
          const s = m.r * 7;
          ctx.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(m.ph * 2.7));
          ctx.drawImage(sprites.gold, m.x - s / 2, m.y - s / 2, s, s);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        if (--p.life <= 0) { sparks.splice(i, 1); continue; }
        p.vx *= 0.965;
        p.vy = p.vy * 0.965 + 0.06;
        p.x += p.vx;
        p.y += p.vy - dy;
        const k = p.life / p.max;
        const s = p.r * (4 + 5 * k);
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.drawImage(sprites[p.c], p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;

      if (!reduceMotion || sparks.length) raf = requestAnimationFrame(frame);
    }

    function start() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    size();
    populate();
    start();

    window.addEventListener('resize', () => {
      const oldW = W;
      size();
      if (Math.abs(W - oldW) > 60) populate();
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { lastY = window.scrollY; start(); }
    });

    return {
      burst(x, y, n = 36, palette = ['gold']) {
        if (reduceMotion) return;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 1.2 + Math.random() * 4.4;
          const life = 50 + Math.random() * 55;
          sparks.push({
            x, y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v - 1.6,
            r: 0.8 + Math.random() * 1.9,
            life, max: life,
            c: palette[i % palette.length]
          });
        }
        start();
      }
    };
  })();

  /* ==========================================================================
     Dallar: kökten uca doğru "büyüyen" çizim
     ========================================================================== */
  function budPath(s) {
    const b = s * 0.5;   // sap
    const L = s * 1.75;  // tomurcuk boyu
    const W = s * 0.62;  // yarı genişlik
    return `M0 0Q${r1(b * 0.5)} ${r1(-s * 0.12)} ${r1(b)} 0` +
      `C${r1(b + L * 0.04)} ${r1(-W * 1.25)} ${r1(b + L * 0.9)} ${r1(-W * 1.25)} ${r1(b + L)} ${r1(-W * 0.08)}` +
      `C${r1(b + L * 0.94)} ${r1(W * 1.1)} ${r1(b + L * 0.06)} ${r1(W * 1.12)} ${r1(b)} 0` +
      `M${r1(b + L * 0.24)} ${r1(W * 0.18)}Q${r1(b + L * 0.56)} ${r1(-W * 0.6)} ${r1(b + L * 0.84)} ${r1(-W * 0.18)}`;
  }

  function growBranch(svg) {
    let cfg;
    try { cfg = JSON.parse(svg.dataset.branch || '{}'); } catch (_) { return; }
    const R = rng(cfg.seed || 1);
    const speed = cfg.speed || 240;
    const bud = cfg.bud || 6;
    const width = cfg.width || 1.3;
    const maxDepth = cfg.depth == null ? 2 : cfg.depth;
    const items = [];

    function stem(x, y, ang, len, depth, t0, bend) {
      const segs = Math.max(4, Math.round(len / 12));
      const step = len / segs;
      const pts = [[x, y]];
      const angs = [ang];
      let a = ang;
      for (let i = 0; i < segs; i++) {
        a += bend / segs + (R() - 0.5) * 0.07;
        x += Math.cos(a) * step;
        y += Math.sin(a) * step;
        pts.push([x, y]);
        angs.push(a);
      }
      const dur = len / speed;
      items.push({ stem: true, d: curveThrough(pts), t: t0, dur, len, w: width * Math.pow(0.7, depth) });

      if (depth < maxDepth) {
        const n = depth === 0 ? (cfg.twigs || 6) : (R() < 0.55 ? 3 : 2);
        let side = R() < 0.5 ? -1 : 1;
        for (let k = 0; k < n; k++) {
          const f = depth === 0
            ? 0.14 + ((k + 0.2 + R() * 0.6) / n) * 0.74
            : 0.28 + ((k + 0.2 + R() * 0.6) / n) * 0.56;
          const i = clamp(Math.round(f * segs), 1, segs - 1);
          const childAng = angs[i] + side * (0.45 + R() * 0.4);
          const childLen = len * (depth === 0 ? 0.42 : 0.5) * (1 - f * 0.5) * (0.75 + R() * 0.45);
          stem(pts[i][0], pts[i][1], childAng, childLen, depth + 1, t0 + dur * (i / segs), -side * (0.3 + R() * 0.5));
          side = -side;
        }
      }

      const nb = depth === 0 ? 1 : 2 + Math.floor(R() * 2);
      let bs = R() < 0.5 ? -1 : 1;
      for (let k = 0; k < nb; k++) {
        const f = 0.4 + ((k + R() * 0.7) / nb) * 0.52;
        const i = clamp(Math.round(f * segs), 1, segs);
        items.push({ x: pts[i][0], y: pts[i][1], a: angs[i] + bs * (0.6 + R() * 0.45), s: bud * (0.68 + R() * 0.32), t: t0 + dur * (i / segs) });
        bs = -bs;
      }
      items.push({ x, y, a: a + (R() - 0.5) * 0.25, s: bud * (0.95 + R() * 0.3), t: t0 + dur });
    }

    (cfg.roots || [cfg]).forEach((r) => {
      stem(r.x || 0, r.y || 0, ((r.angle || 0) * Math.PI) / 180, r.length || 300, 0, r.delay || 0, r.bend || 0);
    });

    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'br');
    for (const it of items) {
      const p = document.createElementNS(NS, 'path');
      if (it.stem) {
        p.setAttribute('d', it.d);
        p.setAttribute('class', 'br-stem');
        p.setAttribute('stroke-width', it.w.toFixed(2));
        p.style.cssText = `--l:${Math.ceil(it.len * 1.05) + 2};--t:${it.t.toFixed(2)}s;--d:${it.dur.toFixed(2)}s`;
        g.appendChild(p);
      } else {
        const holder = document.createElementNS(NS, 'g');
        holder.setAttribute('transform', `translate(${r1(it.x)} ${r1(it.y)}) rotate(${r1((it.a * 180) / Math.PI)})`);
        p.setAttribute('d', budPath(it.s));
        p.setAttribute('class', 'br-bud');
        p.setAttribute('stroke-width', (width * 0.62).toFixed(2));
        p.style.setProperty('--t', `${(it.t + 0.08).toFixed(2)}s`);
        holder.appendChild(p);
        g.appendChild(holder);
      }
    }
    svg.appendChild(g);
  }

  /* ==========================================================================
     Balmumu mühür
     ========================================================================== */
  function buildSeal() {
    const R = rng(19);
    const pts = [];
    const n = 24;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = 44.5 + (R() - 0.5) * 5 + (i % 3 === 0 ? 1.4 : 0);
      pts.push([50 + Math.cos(a) * rr, 50 + Math.sin(a) * rr]);
    }
    const svg =
      '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      `<path d="${curveThrough(pts, true)}" fill="url(#g-wax)"/>` +
      '<circle cx="50" cy="50" r="32.5" fill="url(#g-wax-in)"/>' +
      '<circle cx="50" cy="50" r="32.5" fill="none" stroke="rgba(45,0,10,.5)" stroke-width="1.6"/>' +
      '<circle cx="50" cy="50" r="34.4" fill="none" stroke="rgba(255,200,200,.25)" stroke-width="1"/>' +
      '<text class="seal__mono" x="49.3" y="61.3" text-anchor="middle" fill="rgba(40,0,10,.55)">ŞF</text>' +
      '<text class="seal__mono" x="50.7" y="62.7" text-anchor="middle" fill="rgba(255,190,190,.32)">ŞF</text>' +
      '<text class="seal__mono" x="50" y="62" text-anchor="middle" fill="#7D1D2C">ŞF</text>' +
      '<ellipse cx="35" cy="28" rx="15" ry="7" fill="rgba(255,255,255,.16)" transform="rotate(-32 35 28)"/>' +
      '</svg>';
    $$('.seal__whole, .seal__half').forEach((el) => { el.innerHTML = svg; });
  }

  /* ==========================================================================
     Sivri kemer çerçeve (kartın boyuna göre çizilir)
     ========================================================================== */
  function buildArch(card) {
    const svg = $('.arch__frame', card);
    const w = card.clientWidth;
    const h = card.clientHeight;
    if (!svg || !w || !h || svg.dataset.size === `${w}x${h}`) return;
    svg.dataset.size = `${w}x${h}`;

    const paint = card.dataset.arch === 'silver' ? 'url(#g-silver)' : 'url(#g-gold)';
    const xm = w / 2;
    const geo = (ins) => {
      const x0 = ins, x1 = w - ins, cw = x1 - x0;
      const r = cw * 0.66;
      const rise = Math.sqrt(r * r - (r - cw / 2) ** 2);
      return { x0, x1, r, top: ins, ys: ins + rise, yb: h - ins };
    };
    const full = (ins) => {
      const k = geo(ins);
      return `M${r1(k.x0)} ${r1(k.yb)}L${r1(k.x0)} ${r1(k.ys)}A${r1(k.r)} ${r1(k.r)} 0 0 1 ${r1(xm)} ${r1(k.top)}` +
        `A${r1(k.r)} ${r1(k.r)} 0 0 1 ${r1(k.x1)} ${r1(k.ys)}L${r1(k.x1)} ${r1(k.yb)}Z`;
    };
    // Tepeden aşağı iki yana simetrik çizilen yarım çizgiler
    const half = (ins, side) => {
      const k = geo(ins);
      const x = side < 0 ? k.x0 : k.x1;
      return `M${r1(xm)} ${r1(k.top)}A${r1(k.r)} ${r1(k.r)} 0 0 ${side < 0 ? 0 : 1} ${r1(x)} ${r1(k.ys)}` +
        `L${r1(x)} ${r1(k.yb)}L${r1(xm)} ${r1(k.yb)}`;
    };

    const settled = card.classList.contains('is-in');
    if (settled) svg.classList.add('no-tr');

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML =
      `<path class="arch__fill" d="${full(0.6)}"/>` +
      [1, 9].map((ins, k) => [-1, 1].map((s) =>
        `<path class="arch__line${k ? ' arch__line--in' : ''}" d="${half(ins, s)}" stroke="${paint}"/>`).join('')).join('') +
      `<g transform="translate(${r1(xm)} 0.5)"><g class="arch__apex">` +
      `<path d="M0-13 2.6-2.6 13 0 2.6 2.6 0 13-2.6 2.6-13 0-2.6-2.6z" fill="${paint}"/>` +
      `<circle r="2.2" fill="${paint}"/></g></g>`;

    $$('.arch__line', svg).forEach((p) => p.style.setProperty('--l', String(Math.ceil(p.getTotalLength()) + 2)));

    if (settled) requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.remove('no-tr')));
  }

  /* ==========================================================================
     Gökyüzü (kına gecesi)
     ========================================================================== */
  function buildStars() {
    const box = $('.sky__stars');
    if (!box) return;
    const R = rng(77);
    const n = window.innerWidth < 640 ? 50 : 90;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      const big = R() < 0.1;
      if (big) s.className = 'is-big';
      s.style.cssText =
        `left:${(R() * 100).toFixed(2)}%;top:${(R() * 100).toFixed(2)}%;` +
        `--s:${(big ? 2.2 : 0.8 + R() * 1.5).toFixed(2)}px;--o:${(0.45 + R() * 0.55).toFixed(2)};` +
        `--dur:${(2.2 + R() * 4).toFixed(2)}s;--del:${(-R() * 6).toFixed(2)}s`;
      frag.appendChild(s);
    }
    box.appendChild(frag);
  }

  /* Davet cümlesi kelime kelime belirsin */
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((word, i) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.style.setProperty('--i', i);
      s.textContent = word;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }

  /* ==========================================================================
     Geri sayım
     ========================================================================== */
  const Countdown = (() => {
    const root = $('#cd');
    if (!root) return { reveal() {} };
    const seg = $('.seg');
    const cap = $('#cd-cap');
    const sr = $('#cd-sr');
    const C = 289.03;
    const units = $$('.cd__u', root).map((u) => ({ n: $('.cd__n', u), bar: $('.cd__bar', u), cols: [] }));
    let key = Date.now() < EVENTS.kina.end ? 'kina' : 'dugun';
    let revealed = false;

    const pos = (i) => `translateY(calc(var(--dh) * ${-i}))`;

    function makeCol(unit) {
      const box = document.createElement('span');
      box.className = 'dg';
      const strip = document.createElement('span');
      strip.className = 'dg__s';
      strip.innerHTML = `<span>0</span>${'0123456789'.split('').map((d) => `<span>${d}</span>`).join('')}`;
      box.appendChild(strip);
      unit.n.appendChild(box);
      return { strip, extra: strip.firstChild, v: null, tm: 0 };
    }

    function setDigit(col, d, animate) {
      if (col.v === d) return;
      const prev = col.v;
      col.v = d;
      clearTimeout(col.tm);
      if (!animate || prev === null || reduceMotion) {
        col.strip.style.transition = 'none';
        col.strip.style.transform = pos(d + 1);
        return;
      }
      col.strip.style.transition = '';
      if (d < prev) {
        col.strip.style.transform = pos(d + 1);
      } else {
        // 0 → 9 gibi geri sarmalarda rakam yukarıdan düşsün
        col.extra.textContent = d;
        col.strip.style.transform = pos(0);
        col.tm = setTimeout(() => {
          col.strip.style.transition = 'none';
          col.strip.style.transform = pos(d + 1);
        }, 720);
      }
    }

    function render(vals, animate) {
      units.forEach((u, idx) => {
        const v = vals[idx];
        const str = String(v).padStart(2, '0');
        if (u.cols.length !== str.length) {
          u.n.textContent = '';
          u.cols = str.split('').map(() => makeCol(u));
        }
        str.split('').forEach((ch, i) => setDigit(u.cols[i], Number(ch), animate));
        if (revealed) {
          const frac = idx === 0 ? Math.min(v, 30) / 30 : v / (idx === 1 ? 24 : 60);
          u.bar.style.strokeDashoffset = (C * (1 - frac)).toFixed(2);
        }
      });
    }

    function parts(ms) {
      const s = Math.max(0, Math.floor(ms / 1000));
      return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
    }

    function tick(animate) {
      const ev = EVENTS[key];
      const now = Date.now();
      if (now < ev.start) {
        render(parts(ev.start - now), animate && revealed);
        cap.textContent = ev.caption;
      } else {
        render([0, 0, 0, 0], animate && revealed);
        cap.textContent = now < ev.end ? `${ev.label} şu an devam ediyor` : `${ev.label} gerçekleşti, teşekkür ederiz`;
      }
    }

    function announce() {
      const ev = EVENTS[key];
      const [d, h, m] = parts(ev.start - Date.now());
      sr.textContent = Date.now() < ev.start ? `${ev.caption}: ${d} gün ${h} saat ${m} dakika` : cap.textContent;
    }

    function select(k) {
      if (k === key) return;
      key = k;
      seg.dataset.active = k;
      $$('.seg__btn', seg).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.target === k)));
      tick(true);
      announce();
    }

    $$('.seg__btn', seg).forEach((b) => b.addEventListener('click', () => select(b.dataset.target)));
    seg.dataset.active = key;
    $$('.seg__btn', seg).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.target === key)));

    tick(false);
    (function loop() {
      tick(true);
      setTimeout(loop, 1000 - (Date.now() % 1000) + 15);
    })();

    return {
      reveal() {
        if (revealed) return;
        revealed = true;
        root.classList.add('is-filling');
        units.forEach((u) => u.cols.forEach((c) => setDigit(c, 0, false)));
        requestAnimationFrame(() => requestAnimationFrame(() => {
          tick(true);
          announce();
          setTimeout(() => root.classList.remove('is-filling'), 2000);
        }));
      }
    };
  })();

  /* Kartlardaki "x gün kaldı" rozetleri (Türkiye takvim günü) */
  function updateBadges() {
    const now = Date.now();
    const dayNo = (ms) => Math.floor((ms + 3 * 3600e3) / 864e5);
    $$('[data-badge]').forEach((el) => {
      const ev = EVENTS[el.dataset.badge];
      if (!ev) return;
      let txt;
      if (now >= ev.end) txt = 'Gerçekleşti · Teşekkür ederiz';
      else if (now >= ev.start) txt = 'Şu an devam ediyor';
      else {
        const dd = dayNo(ev.start) - dayNo(now);
        txt = dd <= 0 ? 'Bugün' : dd === 1 ? 'Yarın' : `${dd} gün kaldı`;
      }
      el.textContent = txt;
    });
  }

  /* ==========================================================================
     Gelin arabası: kaydırdıkça yolda ilerler
     ========================================================================== */
  const Route = (() => {
    const track = $('#route');
    if (!track) return { active() {} };
    const section = track.closest('.route');
    const svg = $('.route__svg', track);
    const road = $('.route__road', track);
    const glow = $('.route__glow', track);
    const trail = $('.route__trail', track);
    const car = $('.car', track);
    const stops = $$('.stop', track);
    const pins = stops.map((s) => $('.stop__pin', s));
    const reached = stops.map(() => false);
    let samples = [], total = 0, stopAt = [], cur = 0, target = 0, raf = 0, on = false, ready = false;

    function lengthAtY(y) {
      if (!samples.length) return 0;
      if (y <= samples[0].y) return 0;
      const last = samples[samples.length - 1];
      if (y >= last.y) return total;
      let lo = 0, hi = samples.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (samples[mid].y < y) lo = mid; else hi = mid;
      }
      const a = samples[lo], b = samples[hi];
      return a.L + (b.L - a.L) * ((y - a.y) / ((b.y - a.y) || 1));
    }

    function pointAt(L) {
      const f = clamp(L / (total || 1), 0, 1) * (samples.length - 1);
      const i = Math.min(samples.length - 2, Math.floor(f));
      const a = samples[i], b = samples[i + 1], t = f - i;
      return [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, Math.atan2(b.y - a.y, b.x - a.x)];
    }

    function build() {
      const tr = track.getBoundingClientRect();
      if (!tr.width || !tr.height) return;
      const pts = pins.map((p) => {
        const r = p.getBoundingClientRect();
        return [r.left + r.width / 2 - tr.left, r.top + r.height / 2 - tr.top];
      });
      const amp = 15;
      let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[i + 1];
        const dy = y2 - y1;
        const s = i % 2 ? -1 : 1;
        d += `C${r1(x1 + amp * s)} ${r1(y1 + dy * 0.4)} ${r1(x2 - amp * s)} ${r1(y2 - dy * 0.4)} ${r1(x2)} ${r1(y2)}`;
      }
      svg.setAttribute('viewBox', `0 0 ${r1(tr.width)} ${r1(tr.height)}`);
      [road, glow, trail].forEach((p) => p.setAttribute('d', d));
      total = trail.getTotalLength();
      samples = [];
      const N = 300;
      for (let i = 0; i <= N; i++) {
        const L = (total * i) / N;
        const p = trail.getPointAtLength(L);
        samples.push({ L, x: p.x, y: p.y });
      }
      stopAt = pts.map(([, py]) => lengthAtY(py));
      trail.style.strokeDasharray = `${total} ${total}`;
      glow.style.strokeDasharray = `${total} ${total}`;
      ready = true;
      update(true);
    }

    function celebrate(i) {
      const s = stops[i];
      if (i === 1) {
        s.classList.remove('pop');
        void s.offsetWidth;
        s.classList.add('pop');
      }
      if (i === stops.length - 1) {
        const r = pins[i].getBoundingClientRect();
        Dust.burst(r.left + r.width / 2, r.top + r.height / 2, 44, ['gold', 'rose', 'gold']);
      }
    }

    function step() {
      raf = 0;
      cur += (target - cur) * 0.12;
      if (Math.abs(target - cur) < 0.4) cur = target;
      const [x, y, ang] = pointAt(cur);
      car.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${((ang * 180) / Math.PI).toFixed(1)}deg)`;
      const off = (total - cur).toFixed(1);
      trail.style.strokeDashoffset = off;
      glow.style.strokeDashoffset = off;
      stops.forEach((s, i) => {
        const hit = cur >= stopAt[i] - 2;
        if (hit !== reached[i]) {
          reached[i] = hit;
          s.classList.toggle('is-reached', hit);
          if (hit && i > 0) celebrate(i);
        }
      });
      if (cur !== target) raf = requestAnimationFrame(step);
    }

    function update(instant) {
      if (!ready) return;
      const tr = track.getBoundingClientRect();
      target = lengthAtY(window.innerHeight * 0.56 - tr.top);
      if (instant || reduceMotion) cur = target;
      if (!raf) raf = requestAnimationFrame(step);
    }

    window.addEventListener('scroll', () => { if (on) update(false); }, { passive: true });
    window.addEventListener('resize', () => update(false), { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(build).observe(track);
    window.addEventListener('load', build);
    build();

    return {
      active(v) {
        on = v;
        section.classList.toggle('is-on', v);
        if (v) update(false);
      }
    };
  })();

  /* ==========================================================================
     Görünürlük: belirme animasyonları ve ekran dışı duraklatma
     ========================================================================== */
  function show(el) {
    el.classList.add('is-in');
    if (el.matches('svg[data-branch]')) el.classList.add('is-grown');
    if (el.matches('.arch--night')) setTimeout(() => el.classList.add('is-lit'), reduceMotion ? 0 : 1100);
    if (el.id === 'cd-card') Countdown.reveal();
  }

  function initReveal() {
    const targets = [
      ...$$('.rv'),
      ...$$('[data-words]'),
      ...$$('svg[data-branch]').filter((s) => !s.closest('.hero'))
    ];
    if (!hasIO) { targets.forEach(show); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        show(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    targets.forEach((t) => io.observe(t));
  }

  function initVisibility() {
    const defs = $('.svg-defs');
    const sections = $$('.hero, .event, .route');
    if (!hasIO) { Route.active(true); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const el = e.target;
        el.classList.toggle('is-off', !e.isIntersecting);
        if (el.id === 'hero' && defs && defs.pauseAnimations) {
          if (e.isIntersecting) defs.unpauseAnimations(); else defs.pauseAnimations();
        }
        if (el.id === 'gelin-alma') Route.active(e.isIntersecting);
      });
    }, { rootMargin: '140px 0px' });
    sections.forEach((s) => io.observe(s));
  }

  /* ==========================================================================
     Takvime ekle penceresi
     ========================================================================== */
  function initSheet() {
    const sheet = $('#sheet');
    if (!sheet) return;
    const gLink = $('#cal-google');
    const icsLink = $('#cal-ics');
    const sub = $('#sheet-sub');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    let lastFocus = null;
    let closeTimer = 0;

    function onKey(e) { if (e.key === 'Escape') close(); }

    function open(k) {
      const ev = EVENTS[k];
      if (!ev) return;
      const details = [
        'Hayatımızın en anlamlı gününde sizleri de aramızda görmekten mutluluk duyarız.',
        ev.note,
        'Fotoğraf ve video çekimi kesinlikle yasaktır.'
      ].filter(Boolean).join('\n\n');
      sub.textContent = ev.when;
      gLink.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
        `&text=${encodeURIComponent(ev.title)}` +
        `&dates=${stamp(ev.start)}/${stamp(ev.end)}` +
        '&ctz=Europe%2FIstanbul' +
        `&location=${encodeURIComponent(ev.place)}` +
        `&details=${encodeURIComponent(details)}`;
      icsLink.href = ev.ics;
      if (isIOS) icsLink.removeAttribute('download');
      else icsLink.setAttribute('download', ev.ics.split('/').pop());

      clearTimeout(closeTimer);
      lastFocus = document.activeElement;
      sheet.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('is-open')));
      setTimeout(() => gLink.focus({ preventScroll: true }), 80);
      document.addEventListener('keydown', onKey);
    }

    function close() {
      sheet.classList.remove('is-open');
      document.removeEventListener('keydown', onKey);
      closeTimer = setTimeout(() => { sheet.hidden = true; }, 450);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    $$('[data-cal]').forEach((b) => b.addEventListener('click', () => open(b.dataset.cal)));
    $$('[data-close]', sheet).forEach((b) => b.addEventListener('click', close));
    [gLink, icsLink].forEach((a) => a.addEventListener('click', () => setTimeout(close, 200)));
  }

  /* ==========================================================================
     Paylaş & bildirim
     ========================================================================== */
  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
  }

  function initShare() {
    const btn = $('#share');
    if (!btn) return;
    // Yerel paylaşım menüsü telefonda; masaüstünde bağlantıyı kopyalamak daha pratik
    const nativeShare = navigator.share && mq('(pointer: coarse)');
    btn.addEventListener('click', async () => {
      const url = location.href.split('#')[0];
      const data = { title: 'Şüheda & Fatih · Davetiye', text: "Şüheda & Fatih'in kına ve düğün davetiyesi", url };
      if (nativeShare) {
        try { await navigator.share(data); } catch (_) { /* kullanıcı vazgeçti */ }
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        toast('Bağlantı kopyalandı');
      } catch (_) {
        window.prompt('Bağlantıyı kopyalayın:', url);
      }
    });
  }

  /* ==========================================================================
     Alt menü
     ========================================================================== */
  function initDock() {
    const dock = $('#dock');
    const hero = $('#hero');
    if (!dock || !hero || !hasIO) return;
    const links = $$('a', dock);
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));

    new IntersectionObserver(([e]) => dock.classList.toggle('is-on', !e.isIntersecting), { threshold: 0.12 }).observe(hero);

    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('is-active', a === byId.get(e.target.id)));
        dock.classList.toggle('is-night', e.target.id === 'kina');
      });
    }, { rootMargin: '-46% 0px -50% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ==========================================================================
     Açılış paralaksı & masaüstünde kart eğimi
     ========================================================================== */
  function initParallax() {
    if (reduceMotion) return;
    const hero = $('#hero');
    const inner = $('.hero__inner', hero);
    const tr = $('.branch--hero-tr', hero);
    const bl = $('.branch--hero-bl', hero);
    let ticking = false;
    function apply() {
      ticking = false;
      const y = window.scrollY;
      const h = hero.offsetHeight || 1;
      if (y > h * 1.2) return;
      inner.style.translate = `0 ${(y * 0.28).toFixed(1)}px`;
      inner.style.opacity = String(clamp(1 - (y / h) * 1.15, 0, 1));
      if (tr) tr.style.translate = `0 ${(y * -0.12).toFixed(1)}px`;
      if (bl) bl.style.translate = `0 ${(y * 0.2).toFixed(1)}px`;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(apply); }
    }, { passive: true });
  }

  function initTilt() {
    if (!finePointer || reduceMotion) return;
    $$('.arch').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(1200px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ==========================================================================
     Zarf → açılış
     ========================================================================== */
  function fontsReady(ms) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.race([
      Promise.all([
        document.fonts.load('400 64px "Great Vibes"', 'Şüheda Fatih'),
        document.fonts.load('400 20px "Cormorant Garamond"'),
        document.fonts.load('600 20px "Cormorant Garamond"'),
        document.fonts.load('italic 400 20px "Cormorant Garamond"')
      ]).catch(() => {}),
      wait(ms)
    ]);
  }

  let heroStarted = false;
  function startHero() {
    if (heroStarted) return;
    heroStarted = true;
    const hero = $('#hero');
    hero.classList.add('is-playing');
    $$('svg[data-branch]', hero).forEach((b, i) => {
      setTimeout(() => b.classList.add('is-grown'), reduceMotion ? 0 : 200 + i * 450);
    });
  }

  function goToHash() {
    if (!location.hash) return;
    let el = null;
    try { el = document.querySelector(location.hash); } catch (_) { return; }
    if (el) setTimeout(() => el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }), 400);
  }

  function initIntro() {
    const intro = $('#intro');
    if (!intro) { startHero(); return; }

    doc.classList.add('is-locked');
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    buildSeal();
    fontsReady(2600).then(() => intro.classList.add('is-ready'));

    const env = $('#envelope');
    const seal = $('#seal');
    let opened = false;

    function open() {
      if (opened) return;
      opened = true;
      if (navigator.vibrate) { try { navigator.vibrate(18); } catch (_) { /* yok say */ } }
      const r = seal.getBoundingClientRect();
      Dust.burst(r.left + r.width / 2, r.top + r.height / 2, 46, ['gold', 'gold', 'rose']);
      intro.classList.add('is-cracked');

      const T = reduceMotion ? [0, 0, 0, 150, 500] : [420, 880, 1200, 2450, 3900];
      setTimeout(() => intro.classList.add('is-open'), T[0]);
      setTimeout(() => intro.classList.add('is-flap-back'), T[1]);
      setTimeout(() => intro.classList.add('is-out'), T[2]);
      setTimeout(() => {
        intro.classList.add('is-gone');
        doc.classList.remove('is-locked');
        startHero();
        goToHash();
      }, T[3]);
      setTimeout(() => intro.remove(), T[4]);
    }

    env.addEventListener('click', open);
  }

  /* ==========================================================================
     Başlat
     ========================================================================== */
  function init() {
    $$('[data-words]').forEach(splitWords);
    $$('svg[data-branch]').forEach(growBranch);
    buildStars();
    $$('.arch').forEach((card) => {
      buildArch(card);
      if ('ResizeObserver' in window) new ResizeObserver(() => buildArch(card)).observe(card);
    });
    updateBadges();
    setInterval(updateBadges, 60e3);
    initReveal();
    initVisibility();
    initSheet();
    initShare();
    initDock();
    initParallax();
    initTilt();
    initIntro();
  }

  init();
})();
