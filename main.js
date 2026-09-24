// Adiazi Ugochukwu portfolio: vanilla ES module, no dependencies.

const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Theme toggle ----------
// The inline script in <head> sets data-theme before first paint.
// This only handles the toggle and remembers the choice.
const themeBtn = document.querySelector('.theme-toggle');

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  themeBtn?.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
}

applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

themeBtn?.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  const swap = () => applyTheme(next);
  try { localStorage.setItem('theme', next); } catch (e) { /* storage blocked: choice lasts this visit only */ }

  // Where supported, the new theme grows in a circle from the toggle; otherwise it just switches
  if (!document.startViewTransition || reducedMotion) { swap(); return; }
  const r = themeBtn.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.startViewTransition(swap).ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 550, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  });
});

// ---------- Reading progress hairline in the nav ----------
const progress = document.querySelector('.nav__progress');
if (progress) {
  let queued = false;
  const setProgress = () => {
    queued = false;
    const max = root.scrollHeight - innerHeight;
    progress.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0);
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(setProgress); } }, { passive: true });
  addEventListener('resize', setProgress);
  requestAnimationFrame(setProgress); // not during start-up: reading scrollHeight forces a full layout
}

// ---------- Mobile menu (overlay, focus trap, Esc to close) ----------
const header = document.getElementById('site-header');
const burger = header.querySelector('.nav__burger');
const desktopMq = window.matchMedia('(min-width: 861px)');

function setMenu(open) {
  header.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  // Everything outside the header is unreachable while the overlay is up
  document.querySelectorAll('main, footer').forEach((el) => { el.inert = open; });
  if (open) header.querySelector('.nav__links a')?.focus();
}

burger.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
header.querySelectorAll('.nav__menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
desktopMq.addEventListener('change', (e) => { if (e.matches) setMenu(false); });

document.addEventListener('keydown', (e) => {
  if (!header.classList.contains('is-open')) return;
  if (e.key === 'Escape') {
    setMenu(false);
    burger.focus();
  } else if (e.key === 'Tab') {
    // Keep focus cycling inside the header while the menu is open
    const items = [...header.querySelectorAll('a[href], button')].filter((el) => el.offsetParent !== null);
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// ---------- Active nav link ----------
const navLinks = [...header.querySelectorAll('.nav__links a')];
const spy = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle('is-active', a.hash === `#${entry.target.id}`));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main > section[id]').forEach((s) => spy.observe(s));

// ---------- Text effects (vanilla ports of React Bits' DecryptedText and BlurText) ----------
// Screen readers get the real text from an sr-only copy; the animated copy is aria-hidden.
function splitForA11y(el) {
  const text = el.textContent.trim();
  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = text;
  const shown = document.createElement('span');
  shown.setAttribute('aria-hidden', 'true');
  el.replaceChildren(sr, shown);
  return { text, shown };
}

// DecryptedText: mono labels resolve from random glyphs, left to right
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#*+';
function decrypt(el) {
  const { text, shown } = splitForA11y(el);
  let frame = 0;
  const steps = 16;
  const tick = () => {
    const done = Math.floor((text.length * ++frame) / steps);
    shown.textContent = [...text].map((c, i) => (i < done || ' /·'.includes(c) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
    if (frame < steps) setTimeout(tick, 45);
  };
  tick();
}

// BlurText: split into words that blur into focus in sequence (CSS does the animation)
document.querySelectorAll('.blur-text').forEach((el) => {
  if (!reducedMotion) {
    const { text, shown } = splitForA11y(el);
    text.split(/\s+/).forEach((w, i) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.style.setProperty('--i', i);
      span.textContent = w;
      shown.append(span, ' ');
    });
  }
  el.classList.add('is-split');
});

// ---------- Scroll reveal (once, 60ms stagger per batch) ----------
const revealer = new IntersectionObserver((entries) => {
  entries.filter((e) => e.isIntersecting).forEach((entry, i) => {
    entry.target.style.setProperty('--delay', `${i * 60}ms`);
    entry.target.classList.add('is-visible');
    if (!reducedMotion && entry.target.matches('.section__index')) decrypt(entry.target);
    revealer.unobserve(entry.target);
  });
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => revealer.observe(el));

// ---------- Pointer effects, desktop only (React Bits' SpotlightCard and Magnet) ----------
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reducedMotion) {
  // Spotlight: a soft light follows the cursor across cards
  document.querySelectorAll('.card, .arch').forEach((el) => {
    el.classList.add('spotlight');
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
  // Magnet: buttons lean up to ~5px toward the cursor
  document.querySelectorAll('.btn').forEach((btn) => {
    btn.classList.add('magnet');
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--tx', `${(((e.clientX - r.left) / r.width) - 0.5) * 10}px`);
      btn.style.setProperty('--ty', `${(((e.clientY - r.top) / r.height) - 0.5) * 8}px`);
    });
    btn.addEventListener('pointerleave', () => { btn.style.removeProperty('--tx'); btn.style.removeProperty('--ty'); });
  });
}

// ---------- Skills: highlight everything tagged with a production skill ----------
// Hover/focus previews a skill; click pins it (click again to unpin).
const livePills = [...document.querySelectorAll('.pill--live')];
let pinned = null;

function highlight(skill) {
  root.classList.toggle('skill-active', Boolean(skill));
  document.querySelectorAll('[data-skills]').forEach((el) => {
    el.classList.toggle('is-match', Boolean(skill) && el.dataset.skills.split(' ').includes(skill));
  });
}

// Keep a visible tooltip inside the viewport (it is left-aligned to its pill by default)
function placeTip(pill) {
  const tip = pill.querySelector('.tip');
  tip.style.left = '0px';
  const r = tip.getBoundingClientRect();
  const over = r.right - (root.clientWidth - 12);
  if (r.width && over > 0) tip.style.left = `${-over}px`;
}

livePills.forEach((pill) => {
  const skill = pill.dataset.skill;
  const preview = () => { highlight(skill); placeTip(pill); };
  pill.addEventListener('pointerenter', preview);
  pill.addEventListener('focus', preview);
  pill.addEventListener('pointerleave', () => highlight(pinned));
  pill.addEventListener('blur', () => highlight(pinned));
  pill.addEventListener('click', () => {
    pinned = pinned === skill ? null : skill;
    livePills.forEach((p) => p.setAttribute('aria-pressed', String(p.dataset.skill === pinned)));
    highlight(pinned);
    placeTip(pill);
  });
});

// ---------- Architecture diagram ----------
// Wires draw in on scroll; then one light travels the route slowly, and each box
// lights up while the light is inside it. The loop only runs while the diagram is visible.
const arch = document.querySelector('.arch');
if (arch) {
  const narrow = window.matchMedia('(max-width: 899px)');
  const layouts = [...arch.querySelectorAll('.arch__svg')].map((svg) => {
    const gradId = svg.querySelector('linearGradient').id;
    const nodes = [...svg.querySelectorAll('.node')].map((g) => {
      const rect = g.querySelector('rect');
      const glow = rect.cloneNode();
      glow.classList.add('node__glow');
      glow.style.stroke = `url(#${gradId})`;
      rect.after(glow);
      const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((a) => +rect.getAttribute(a));
      return { g, x, y, w, h };
    });
    return { path: svg.querySelector('.pulse-path'), pulse: svg.querySelector('.pulse'), nodes };
  });

  const TRAVEL = 16000; // ms for one full trip
  const REST = 1500;    // pause before the next trip
  let raf = 0, t0 = 0, elapsed = 0, visible = false, started = false;

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const { path, pulse, nodes } = layouts[narrow.matches ? 1 : 0];
    const t = (now - t0) % (TRAVEL + REST);
    const moving = t < TRAVEL;
    const p = path.getPointAtLength(path.getTotalLength() * Math.min(t / TRAVEL, 1));
    pulse.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    pulse.setAttribute('visibility', moving ? 'visible' : 'hidden');
    nodes.forEach((n) => n.g.classList.toggle('is-lit', moving && p.x >= n.x && p.x <= n.x + n.w && p.y >= n.y && p.y <= n.y + n.h));
  };

  const update = () => {
    const go = visible && arch.classList.contains('is-pulsing');
    if (go && !raf) { t0 = performance.now() - elapsed; raf = requestAnimationFrame(frame); }
    if (!go && raf) { cancelAnimationFrame(raf); raf = 0; elapsed = performance.now() - t0; }
  };

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !started) {
      started = true;
      arch.classList.add('is-drawn');
      // Start the light once the wires have finished drawing
      if (!reducedMotion) setTimeout(() => { arch.classList.add('is-pulsing'); update(); }, 2200);
    }
    update();
  }, { threshold: 0.35 }).observe(arch);
}

// ---------- Case study page: draw diagrams on scroll, track the contents list ----------
const diagramObserver = new IntersectionObserver((entries) => {
  entries.filter((e) => e.isIntersecting).forEach((e) => {
    e.target.classList.add('is-drawn');
    diagramObserver.unobserve(e.target);
  });
}, { threshold: 0.3 });
document.querySelectorAll('.diagram').forEach((d) => diagramObserver.observe(d));

const tocLinks = [...document.querySelectorAll('.toc a')];
if (tocLinks.length) {
  const tocObserver = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e) => {
      tocLinks.forEach((a) => a.classList.toggle('is-active', a.hash === `#${e.target.id}`));
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  document.querySelectorAll('.cs-section[id]').forEach((s) => tocObserver.observe(s));
}

// ---------- Contact form: submit with fetch and show the result inline ----------
const form = document.querySelector('.form');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = form.querySelector('.form__status');
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.className = 'form__status';
  status.textContent = 'Sending…';
  try {
    const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Formspree responded ${res.status}`);
    form.reset();
    status.classList.add('is-ok');
    status.textContent = "Thanks, your message is on its way. I'll get back to you soon.";
  } catch (err) {
    status.classList.add('is-error');
    status.textContent = "That didn't send. Please try again, or email adiaziprecious@gmail.com.";
  } finally {
    button.disabled = false;
  }
});

// ---------- Footer year ----------
document.querySelectorAll('.js-year').forEach((el) => { el.textContent = new Date().getFullYear(); });

// ---------- Hero: WebGL chroma mesh (CSS blobs as fallback) ----------
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uR;
uniform float uT;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}
// The five --chroma stops, looped so there is no seam
vec3 pal(float x) {
  vec3 c0 = vec3(0.486, 0.612, 1.0), c1 = vec3(0.725, 0.549, 1.0), c2 = vec3(1.0, 0.561, 0.820),
       c3 = vec3(1.0, 0.827, 0.541), c4 = vec3(0.486, 0.953, 0.902);
  x = fract(x) * 5.0;
  if (x < 1.0) return mix(c0, c1, x);
  if (x < 2.0) return mix(c1, c2, x - 1.0);
  if (x < 3.0) return mix(c2, c3, x - 2.0);
  if (x < 4.0) return mix(c3, c4, x - 3.0);
  return mix(c4, c0, x - 4.0);
}
void main() {
  vec2 uv = gl_FragCoord.xy / uR;
  float asp = uR.x / uR.y;
  float t = uT * 0.04;
  vec2 p = vec2(uv.x * asp, uv.y);
  // Domain-warped noise drives both colour and the blob's wobbly edge
  vec2 q = vec2(fbm(p * 1.4 + vec2(t, -t)), fbm(p * 1.4 + vec2(5.2 - t, 1.3 + t)));
  float f = fbm(p * 1.1 + q * 1.8 + t * 0.6);
  vec3 col = pal(f * 1.6 + t * 0.5);
  // Blob sits right of the text on wide screens, top right on tall ones
  vec2 c = asp > 1.0 ? vec2(0.74, 0.58) : vec2(0.85, 0.82);
  vec2 d = (uv - c) * vec2(asp, 1.0) + (q - 0.5) * 0.35;
  float a = smoothstep(0.9, 0.0, length(d)) * (0.45 + 0.3 * f);
  gl_FragColor = vec4(col * a, a);
}`;

// Compile the shader into a full-screen triangle. Returns draw(time), or null without WebGL.
function createShader(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}');
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one big triangle
  const loc = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(program, 'uR');
  const uT = gl.getUniformLocation(program, 'uT');

  // The gradient is soft, so half resolution looks the same and costs a quarter of the pixels
  const resize = () => {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * 0.5));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * 0.5));
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  return (time) => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.uniform1f(uT, time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
}

function initHero() {
  const hero = document.querySelector('.hero');
  const bg = hero?.querySelector('.hero__bg');
  const canvas = bg?.querySelector('canvas');
  // Reduced motion: the CSS blobs stay still, which is the single static gradient frame
  if (!canvas || reducedMotion) return;

  // The CSS blobs render first everywhere. On mouse-driven desktops the WebGL shader is
  // compiled on the visitor's first mouse move or scroll (so never during page load),
  // in an idle moment, then cross-fades in over the blobs.
  // Phones keep the blobs: cheaper on battery and never blocks the main thread.
  let draw = null;
  if (window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)').matches) {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
    const startGL = () => {
      removeEventListener('pointermove', startGL);
      removeEventListener('scroll', startGL);
      idle(() => {
        draw = createShader(canvas);
        if (!draw) return;
        requestAnimationFrame(() => {
          bg.classList.add('gl-ready');
          setTimeout(() => bg.classList.add('gl-done'), 1200); // blobs fully hidden, stop animating them
        });
      });
    };
    addEventListener('pointermove', startGL, { passive: true });
    addEventListener('scroll', startGL, { passive: true });
  }

  // Pointer drift, desktop only: lerp toward the target, capped at 20px
  const drift = { x: 0, y: 0, tx: 0, ty: 0 };
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  if (finePointer) {
    window.addEventListener('pointermove', (e) => {
      drift.tx = (e.clientX / window.innerWidth - 0.5) * 40;
      drift.ty = (e.clientY / window.innerHeight - 0.5) * 40;
    }, { passive: true });
  }

  let raf = 0, last = 0, heroVisible = true;
  const start = performance.now();
  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    if (now - last < 33) return; // ~30fps is plenty for a slow drift
    last = now;
    const dx = (drift.tx - drift.x) * 0.08;
    const dy = (drift.ty - drift.y) * 0.08;
    if (Math.abs(dx) + Math.abs(dy) > 0.01) { // skip the style write when nothing moved
      drift.x += dx;
      drift.y += dy;
      bg.style.transform = `translate3d(${drift.x.toFixed(2)}px, ${drift.y.toFixed(2)}px, 0)`;
    }
    draw?.((now - start) / 1000);
  };

  // Run only while the hero is on screen and the tab is visible. On touch devices there is
  // no drift and no WebGL, so no frame loop at all: only the CSS blobs, paused off screen.
  const update = () => {
    const run = heroVisible && !document.hidden;
    bg.classList.toggle('is-paused', !run);
    if (run && !raf && finePointer) raf = requestAnimationFrame(tick);
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; update(); }).observe(hero);
  document.addEventListener('visibilitychange', update);
}

initHero();
