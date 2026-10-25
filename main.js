(function () {
  const v = document.querySelector('.hero-video');
  if (v) { v.muted = true; const p = v.play(); if (p && p.catch) p.catch(() => {}); }
  const c = document.querySelector('.waves');
  if (!c) return;
  const ctx = c.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layers = [
    { amp: 10, len: 340, speed: 0.25, y: 0.30, color: 'rgba(255,255,255,0.35)' },
    { amp: 14, len: 260, speed: 0.4, y: 0.50, color: 'rgba(29,93,128,0.6)' },
    { amp: 12, len: 200, speed: 0.6, y: 0.72, color: 'rgba(15,76,110,0.85)' }
  ];
  function size() { const r = c.getBoundingClientRect(); c.width = r.width * devicePixelRatio; c.height = r.height * devicePixelRatio; }
  function draw(t) {
    const w = c.width, h = c.height, d = devicePixelRatio;
    ctx.clearRect(0, 0, w, h);
    layers.forEach(l => {
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 6 * d) {
        const y = h * l.y + Math.sin((x / d) / l.len * Math.PI * 2 + t * l.speed) * l.amp * d;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = l.color; ctx.fill();
    });
  }
  function loop(ts) { draw(ts / 1000); if (!reduce) requestAnimationFrame(loop); }
  size(); window.addEventListener('resize', () => { size(); draw(performance.now() / 1000); });
  requestAnimationFrame(loop);
})();

/* Condiciones del mar en vivo (Open-Meteo, datos DWD). Si no carga, queda el último pronóstico fijo. */
(function () {
  const box = document.querySelector('.conditions-wrap');
  if (!box) return;
  const set = (k, v) => { const el = box.querySelector('[data-k="' + k + '"]'); if (el) el.textContent = v; };
  const tz = 'America%2FArgentina%2FBuenos_Aires';
  const marine = 'https://marine-api.open-meteo.com/v1/marine?latitude=-38.02&longitude=-57.52&current=wave_height,wave_period&hourly=sea_level_height_msl&forecast_days=2&timezone=' + tz;
  const wind = 'https://api.open-meteo.com/v1/forecast?latitude=-38.0&longitude=-57.55&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kn&timezone=' + tz;
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
  const compass = d => dirs[Math.round(((d % 360) + 360) % 360 / 22.5) % 16];
  const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  Promise.all([get(marine), get(wind)]).then(([m, w]) => {
    const c = m.current, cw = w.current;
    if (!c || !cw || c.wave_height == null || cw.wind_speed_10m == null) return;
    set('ola', c.wave_height.toFixed(1).replace('.', ',') + ' m');
    if (c.wave_period != null) set('periodo', Math.round(c.wave_period) + ' s');
    set('viento', Math.round(cw.wind_speed_10m) + ' kt ' + compass(cw.wind_direction_10m));
    const h = m.hourly, hour = c.time.slice(0, 13);
    const i = h && h.time ? h.time.findIndex(t => t.slice(0, 13) === hour) : -1;
    if (i >= 0 && h.sea_level_height_msl[i + 1] != null) {
      set('marea', h.sea_level_height_msl[i + 1] > h.sea_level_height_msl[i] ? 'Subiendo' : 'Bajando');
    }
    set('title', 'Mar del Plata · hoy · ' + parseInt(c.time.slice(11, 13), 10) + ' h');
    set('src', 'Pronóstico en vivo · Open-Meteo / DWD');
  }).catch(fromStore);

  /* Respaldo: últimos datos guardados (se actualizan solos cada 3 horas). */
  async function fromStore() {
    try {
      if (!window.claude || !window.claude.use) return;
      const db = await window.claude.use('db');
      if (!db) return;
      const snap = await db.doc('conditions/current').get();
      if (!snap.exists) return;
      const d = snap.data() || {};
      ['ola', 'periodo', 'viento', 'marea'].forEach(k => { if (typeof d[k] === 'string' && d[k]) set(k, d[k]); });
      if (typeof d.hora === 'string' && d.hora) set('title', 'Mar del Plata · ' + d.hora);
      set('src', 'Pronóstico de ' + (typeof d.fuente === 'string' && d.fuente ? d.fuente : 'Windfinder'));
    } catch (e) {}
  }
})();

/* Botón de sonido del video con música */
(function () {
  document.querySelectorAll('.sound-btn').forEach(btn => {
    const v = btn.parentElement.querySelector('video');
    if (!v) return;
    const sync = () => { btn.textContent = v.muted ? '🔊 Activar sonido' : '🔇 Silenciar'; btn.setAttribute('aria-pressed', String(!v.muted)); };
    btn.addEventListener('click', () => { v.muted = !v.muted; if (!v.muted) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } sync(); });
    v.addEventListener('volumechange', sync);
  });
})();

/* Selector En persona / Virtual en Planes */
(function () {
  const tabs = Array.from(document.querySelectorAll('.mode-switch [role="tab"]'));
  if (!tabs.length) return;
  const show = t => {
    tabs.forEach(x => {
      const on = x === t;
      x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t));
    t.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; show(n); n.focus();
    });
  });
  if (location.hash === '#virtual') show(tabs[1]);
})();
