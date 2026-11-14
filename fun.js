/* =========================================================
   Interactive extras
   Uses globals from script.js: slides, current, deckLocked,
   slideHooks, treats, treatCount, STORAGE_KEY, audioCtx, woofSound
   ========================================================= */
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;
const isActive = (id) => slides[current] && slides[current].id === id;

function playWoof(times = 1) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < times; i++) woofSound(audioCtx.currentTime + i * 0.28);
  } catch (_) {}
}

/* ---------------------------------------------------------
   1. Cartoon Parker on the first slide: eyes follow you
   --------------------------------------------------------- */
(() => {
  const buddy = document.getElementById("buddy");
  if (!buddy) return;
  const svg = buddy.querySelector("svg");
  const pupils = [...svg.querySelectorAll(".buddy__pupil")];
  const eyes = [[47, 55], [73, 55]];
  const bubble = document.getElementById("buddyBubble");
  let bubbleTimer;

  function say(text, ms = 2400) {
    bubble.textContent = text;
    buddy.classList.add("is-talking");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => buddy.classList.remove("is-talking"), ms);
  }

  function look(x, y) {
    const r = svg.getBoundingClientRect();
    if (!r.width) return;
    const scale = r.width / 120;
    pupils.forEach((p, i) => {
      const dx = x - (r.left + eyes[i][0] * scale);
      const dy = y - (r.top + eyes[i][1] * scale);
      const d = Math.hypot(dx, dy) || 1;
      const m = Math.min(2.8, d / 40);
      p.setAttribute("transform", `translate(${((dx / d) * m).toFixed(2)} ${((dy / d) * m).toFixed(2)})`);
    });
  }

  const onPointer = (e) => isActive("hello") && look(e.clientX, e.clientY);
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerdown", onPointer, { passive: true });

  (function blink() {
    setTimeout(() => {
      buddy.classList.add("is-blinking");
      setTimeout(() => buddy.classList.remove("is-blinking"), 160);
      blink();
    }, 2200 + Math.random() * 3600);
  })();

  const lines = [
    "Woof! 🐾",
    "Got a treat? 🦴",
    "Boop! 👃",
    "Scroll down, I'll tell you everything",
    "70 kilos of love, at your service",
    "Again! Again!",
  ];
  let n = 0;
  buddy.addEventListener("click", () => {
    buddy.classList.remove("is-woof");
    void buddy.offsetWidth;
    buddy.classList.add("is-woof");
    say(lines[n++ % lines.length]);
    playWoof();
  });

  const greet = () => setTimeout(() => isActive("hello") && say("Psst… I see you 👀", 3400), 1700);
  slideHooks.push((id) => id === "hello" && greet());
  if (isActive("hello")) greet();
})();

/* ---------------------------------------------------------
   2. Sleep: a wake-up button that never works
   --------------------------------------------------------- */
(() => {
  const btn = document.getElementById("wakeBtn");
  if (!btn) return;
  const msg = document.getElementById("wakeMsg");
  const pct = document.querySelector("#sleep .meter__head strong");
  const frame = document.querySelector("#sleep .frame");
  const replies = [
    "Zzz… 💤",
    "He rolled over. Still asleep.",
    "One ear twitched. False alarm.",
    "The snoring just got louder.",
    "He's dreaming about snow.",
    "Nope. Not happening.",
    "Maybe try a treat instead? 🦴",
    "A deep sigh. Still asleep.",
  ];
  let tries = 0;
  let louderTimer;

  btn.addEventListener("click", () => {
    tries += 1;
    if (tries === 10) msg.textContent = "🏆 Achievement unlocked: 10 tries, 0 success. Parker wins.";
    else if (tries === 25) msg.textContent = "25 tries?! Respect. He is still asleep though.";
    else msg.textContent = replies[(tries - 1) % replies.length];

    pct.textContent = "1%";
    setTimeout(() => (pct.textContent = "0%"), 450);

    frame.classList.remove("shake");
    void frame.offsetWidth;
    frame.classList.add("shake", "is-louder");
    clearTimeout(louderTimer);
    louderTimer = setTimeout(() => frame.classList.remove("is-louder"), 1500);
  });
})();

/* ---------------------------------------------------------
   3. Mini game: catch the treats
   --------------------------------------------------------- */
(() => {
  const game = document.getElementById("game");
  const openBtn = document.getElementById("gameBtn");
  if (!game || !openBtn) return;
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const panel = document.getElementById("gamePanel");
  const closeBtn = game.querySelector(".game__close");
  const hud = {
    score: document.getElementById("hudScore"),
    time: document.getElementById("hudTime"),
    best: document.getElementById("hudBest"),
  };
  const bestLabel = document.getElementById("gameBest");

  const face = new Image();
  face.src = "photos/hero.jpg";

  const GOOD = ["🦴", "🍖", "🧀", "🍗"];
  const SUPER = "🥩";
  const BAD = "🥦";
  const DURATION = 30;
  const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

  let W = 0, H = 0;
  let running = false;
  let items = [], pops = [];
  let score = 0, timeLeft = DURATION, last = 0, spawnIn = 0;
  let px = 0, targetX = 0, keyDir = 0, bump = 0, flash = 0;

  let best = 0;
  try {
    best = parseInt(localStorage.getItem("parker-best"), 10) || 0;
  } catch (_) {}
  bestLabel.textContent = best;

  const radius = () => Math.max(34, Math.min(62, Math.min(W, H) * 0.075));
  const catcherY = () => H - radius() - Math.max(28, H * 0.05);

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function updateHud() {
    hud.score.textContent = score;
    hud.time.textContent = Math.ceil(timeLeft);
    hud.best.textContent = best;
  }

  function showPanel(html) {
    panel.innerHTML = html;
    panel.hidden = false;
    panel.querySelectorAll("[data-start]").forEach((b) => b.addEventListener("click", start));
    panel.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
    const first = panel.querySelector("button");
    if (first) first.focus();
  }

  function intro() {
    showPanel(`
      <h3>Catch the treats!</h3>
      <p>Move Parker with your mouse, your finger or the ← → keys.
      Catch 🦴 🍖 🧀 🍗 for +1 and 🥩 for +3. Dodge 🥦: Parker hates broccoli (−2).</p>
      <p class="game__small">${DURATION} seconds. Every treat you catch also counts on the last slide.</p>
      <div class="game__buttons">
        <button class="btn" type="button" data-start>Start</button>
        <button class="btn btn--ghost" type="button" data-close>Maybe later</button>
      </div>`);
  }

  function open() {
    game.hidden = false;
    deckLocked = true;
    resize();
    px = targetX = W / 2;
    score = 0;
    timeLeft = DURATION;
    items = [];
    pops = [];
    updateHud();
    draw();
    intro();
  }

  function close() {
    running = false;
    game.hidden = true;
    deckLocked = false;
    keyDir = 0;
    openBtn.focus();
  }

  function start() {
    panel.hidden = true;
    items = [];
    pops = [];
    score = 0;
    timeLeft = DURATION;
    spawnIn = 0.3;
    running = true;
    last = performance.now();
    updateHud();
    requestAnimationFrame(loop);
  }

  function end() {
    running = false;
    const newBest = score > best;
    if (newBest) {
      best = score;
      try {
        localStorage.setItem("parker-best", String(best));
      } catch (_) {}
    }
    bestLabel.textContent = best;
    updateHud();
    const rating =
      score >= 40 ? "Legendary feeder. Parker will love you forever. 🏆"
      : score >= 25 ? "Elephant mode activated 🐘"
      : score >= 10 ? "Good snack! He wants more though."
      : "Parker is still hungry. Very, very hungry.";
    if (score >= 10) playWoof(2);
    showPanel(`
      <h3>${score} treat${score === 1 ? "" : "s"}!</h3>
      <p>${rating}</p>
      <p class="game__small">${newBest && score > 0 ? "New personal best! 🎉" : `Your best: ${best}`}</p>
      <div class="game__buttons">
        <button class="btn" type="button" data-start>Play again</button>
        <button class="btn btn--ghost" type="button" data-close>Back to the site</button>
      </div>`);
  }

  function spawn() {
    const roll = Math.random();
    const type = roll < 0.2 ? "bad" : roll < 0.27 ? "super" : "good";
    const size = Math.max(30, Math.min(46, W * 0.05));
    const progress = (DURATION - timeLeft) / DURATION;
    const heightScale = Math.max(0.8, Math.min(1.3, H / 700));
    items.push({
      x: size + Math.random() * (W - 2 * size),
      y: -size,
      size,
      type,
      emoji: type === "bad" ? BAD : type === "super" ? SUPER : GOOD[Math.floor(Math.random() * GOOD.length)],
      vy: (150 + Math.random() * 90) * (1 + progress * 0.9) * heightScale,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 4,
    });
  }

  function addTreats(n) {
    treats += n;
    treatCount.textContent = treats.toLocaleString("en-US");
    try {
      localStorage.setItem(STORAGE_KEY, String(treats));
    } catch (_) {}
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      draw();
      end();
      return;
    }

    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawn();
      const elapsed = DURATION - timeLeft;
      spawnIn = Math.max(0.28, 0.75 - elapsed * 0.015) * (0.75 + Math.random() * 0.5);
    }

    const r = radius();
    const cy = catcherY();
    if (keyDir) targetX += keyDir * W * 1.1 * dt;
    targetX = Math.max(r, Math.min(W - r, targetX));
    px += (targetX - px) * Math.min(1, dt * 14);

    for (const it of items) {
      it.y += it.vy * dt;
      it.rot += it.vr * dt;
      if (!it.hit && Math.hypot(it.x - px, it.y - cy) < r + it.size * 0.45) {
        it.hit = true;
        const pts = it.type === "bad" ? -2 : it.type === "super" ? 3 : 1;
        score = Math.max(0, score + pts);
        if (pts > 0) {
          bump = 1;
          addTreats(pts);
        } else {
          flash = 1;
        }
        pops.push({ x: it.x, y: cy - r - 12, text: pts > 0 ? `+${pts}` : "🤢 −2", life: 1, good: pts > 0 });
      }
    }
    items = items.filter((it) => !it.hit && it.y < H + 60);
    pops.forEach((p) => {
      p.life -= dt * 1.4;
      p.y -= 50 * dt;
    });
    pops = pops.filter((p) => p.life > 0);
    bump = Math.max(0, bump - dt * 5);
    flash = Math.max(0, flash - dt * 3);

    updateHud();
    draw();
    requestAnimationFrame(loop);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const r = radius();
    const cy = catcherY();

    if (flash) {
      ctx.fillStyle = `rgba(255, 70, 70, ${0.2 * flash})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const it of items) {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot);
      ctx.font = `${it.size}px ${EMOJI_FONT}`;
      ctx.fillText(it.emoji, 0, 0);
      ctx.restore();
    }

    // Parker's face as the catcher
    const s = r * (1 + bump * 0.18);
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, cy, s, 0, Math.PI * 2);
    ctx.fillStyle = "#1c1d23";
    ctx.fill();
    ctx.clip();
    if (face.complete && face.naturalWidth) {
      const fw = face.naturalWidth;
      const fh = face.naturalHeight;
      const fr = fw * 0.36;
      ctx.drawImage(face, fw * 0.46 - fr, fh * 0.4 - fr, fr * 2, fr * 2, px - s, cy - s, s * 2, s * 2);
    }
    ctx.restore();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ff8a3d";
    ctx.beginPath();
    ctx.arc(px, cy, s + 2, 0, Math.PI * 2);
    ctx.stroke();

    for (const p of pops) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.font = `800 ${Math.round(r * 0.6)}px Unbounded, ${EMOJI_FONT}`;
      ctx.fillStyle = p.good ? "#ffc46b" : "#ff6b6b";
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  const setTarget = (e) => (targetX = e.clientX - canvas.getBoundingClientRect().left);
  canvas.addEventListener("pointermove", setTarget);
  canvas.addEventListener("pointerdown", setTarget);

  window.addEventListener("keydown", (e) => {
    if (game.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft" || e.key === "a") { keyDir = -1; e.preventDefault(); }
    else if (e.key === "ArrowRight" || e.key === "d") { keyDir = 1; e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => {
    if ((e.key === "ArrowLeft" || e.key === "a") && keyDir < 0) keyDir = 0;
    if ((e.key === "ArrowRight" || e.key === "d") && keyDir > 0) keyDir = 0;
  });
  window.addEventListener("resize", () => {
    if (game.hidden) return;
    resize();
    if (!running) draw();
  });

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
})();

/* ---------------------------------------------------------
   4. Winter: snow that dodges the cursor + snowballs
   --------------------------------------------------------- */
(() => {
  const slide = document.getElementById("winter");
  const canvas = slide && slide.querySelector("canvas.snow");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const countEl = document.getElementById("snowCount");
  if (!finePointer) document.getElementById("snowVerb").textContent = "Tap";

  let W = 0, H = 0;
  let flakes = [], balls = [], bits = [], splats = [];
  let running = false, last = 0, thrown = 0;
  const pointer = { x: -999, y: -999 };

  function newFlake(anywhere) {
    const r = 0.8 + Math.random() * 2.6;
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : -6,
      r,
      vy: 16 + r * 14,
      vx: 0,
      ph: Math.random() * 6.28,
      a: 0.35 + Math.random() * 0.55,
    };
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = slide.clientWidth;
    H = slide.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(150, (W * H) / 9000));
    while (flakes.length < n) flakes.push(newFlake(true));
    flakes.length = n;
  }

  function splat(x, y) {
    const blobs = [[0, 0, 15 + Math.random() * 6]];
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 10 + Math.random() * 16;
      blobs.push([Math.cos(a) * d, Math.sin(a) * d, 4 + Math.random() * 7]);
    }
    splats.push({ x, y, blobs, life: 1 });
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 120 + Math.random() * 220;
      bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, r: 1.5 + Math.random() * 2.5, life: 1 });
    }
  }

  function throwAt(x, y) {
    const fromLeft = x > W / 2;
    balls.push({
      x0: fromLeft ? W * 0.15 : W * 0.85,
      y0: H + 30,
      x1: x,
      y1: y,
      t: 0,
      dur: 0.5,
      arc: Math.min(220, H * 0.25),
      r0: 22,
      r1: 12,
    });
    thrown += 1;
    countEl.textContent = thrown;
  }

  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "#fff";
    for (const f of flakes) {
      if (!reduceMotion) {
        f.ph += dt;
        const dx = f.x - pointer.x;
        const dy = f.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < 110 && d > 0) {
          const push = ((110 - d) / 110) * 260;
          f.vx += (dx / d) * push * dt * 6;
          f.y += (dy / d) * push * dt * 0.6;
        }
        f.vx *= 0.94;
        f.x += (Math.sin(f.ph) * 12 + f.vx) * dt;
        f.y += f.vy * dt;
        if (f.y > H + 6) Object.assign(f, newFlake(false));
        if (f.x < -10) f.x = W + 10;
        if (f.x > W + 10) f.x = -10;
      }
      ctx.globalAlpha = f.a;
      circle(f.x, f.y, f.r);
    }

    ctx.fillStyle = "#f4f9ff";
    for (const s of splats) {
      s.life -= dt * 0.6;
      ctx.globalAlpha = Math.max(0, s.life) * 0.9;
      for (const b of s.blobs) circle(s.x + b[0], s.y + b[1], b[2]);
    }
    splats = splats.filter((s) => s.life > 0);

    for (const b of balls) {
      b.t += dt / b.dur;
      const t = Math.min(1, b.t);
      const x = b.x0 + (b.x1 - b.x0) * t;
      const y = b.y0 + (b.y1 - b.y0) * t - Math.sin(Math.PI * t) * b.arc;
      const r = b.r0 + (b.r1 - b.r0) * t;
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(1, "#cfe6ff");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      circle(x, y, r);
      if (t >= 1) {
        b.done = true;
        splat(b.x1, b.y1);
      }
    }
    balls = balls.filter((b) => !b.done);

    ctx.fillStyle = "#fff";
    for (const p of bits) {
      p.vy += 600 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 1.2;
      ctx.globalAlpha = Math.max(0, p.life);
      circle(p.x, p.y, p.r);
    }
    bits = bits.filter((p) => p.life > 0);

    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  }

  slide.addEventListener("click", (e) => {
    if (e.target.closest("button, a")) return;
    const r = slide.getBoundingClientRect();
    throwAt(e.clientX - r.left, e.clientY - r.top);
  });
  window.addEventListener(
    "pointermove",
    (e) => {
      if (!running) return;
      const r = slide.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    },
    { passive: true }
  );

  function start() {
    if (running) return;
    resize();
    running = true;
    last = performance.now();
    requestAnimationFrame(loop);
  }
  slideHooks.push((id) => (id === "winter" ? start() : (running = false)));
  window.addEventListener("resize", () => running && resize());
  if (isActive("winter")) start();
})();

/* ---------------------------------------------------------
   5. Paw prints follow the mouse
   --------------------------------------------------------- */
(() => {
  if (reduceMotion || !finePointer) return;
  const layer = document.createElement("div");
  layer.className = "paws";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  let lx = null, ly = null, side = 1;

  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse" || deckLocked) return;
      if (lx === null) {
        lx = e.clientX;
        ly = e.clientY;
        return;
      }
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      if (Math.hypot(dx, dy) < 46) return;
      const angle = Math.atan2(dy, dx);
      side *= -1;
      const paw = document.createElement("span");
      paw.className = "paw";
      paw.style.left = lx - Math.sin(angle) * 9 * side + "px";
      paw.style.top = ly + Math.cos(angle) * 9 * side + "px";
      paw.style.rotate = (angle * 180) / Math.PI + 90 + "deg";
      layer.appendChild(paw);
      paw.addEventListener("animationend", () => paw.remove());
      if (layer.childElementCount > 40) layer.firstElementChild.remove();
      lx = e.clientX;
      ly = e.clientY;
    },
    { passive: true }
  );
})();

/* ---------------------------------------------------------
   6. Confetti + "thank you" from Parker at treat milestones
   --------------------------------------------------------- */
const confetti = (() => {
  const canvas = document.querySelector("canvas.confetti");
  const ctx = canvas.getContext("2d");
  const colors = ["#ffb547", "#ff5c93", "#4ff0b4", "#7cc8ff", "#a78bfa", "#ffffff", "#ff8a3d"];
  const emojis = ["🦴", "🐾", "❤️"];
  let parts = [], running = false, last = 0, W = 0, H = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 900 * dt;
      p.vx *= 1 - 1.2 * dt;
      p.vy *= 1 - 1.2 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.emoji) {
        ctx.font = '22px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.fillText(p.emoji, 0, 0);
      } else {
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)) + 1);
      }
      ctx.restore();
    }
    parts = parts.filter((p) => p.y < H + 40);
    if (parts.length) {
      requestAnimationFrame(loop);
    } else {
      running = false;
      canvas.hidden = true;
    }
  }

  return function burst() {
    if (reduceMotion) return;
    resize();
    for (let i = 0; i < 180; i++) {
      const fromLeft = i % 2 === 0;
      const a = (fromLeft ? -Math.PI / 3 : (-2 * Math.PI) / 3) + (Math.random() - 0.5) * 0.7;
      const v = 650 + Math.random() * 750;
      parts.push({
        x: fromLeft ? -10 : W + 10,
        y: H * 0.85,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        w: 6 + Math.random() * 7,
        h: 8 + Math.random() * 10,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 12,
        c: colors[i % colors.length],
        emoji: Math.random() < 0.12 ? emojis[Math.floor(Math.random() * emojis.length)] : null,
      });
    }
    if (!running) {
      running = true;
      canvas.hidden = false;
      last = performance.now();
      requestAnimationFrame(loop);
    }
  };
})();

const thanks = document.getElementById("thanks");
const thanksText = document.getElementById("thanksText");
let thanksTimer;
const hideThanks = () => (thanks.hidden = true);
document.getElementById("thanksBtn").addEventListener("click", hideThanks);

function celebrate(before, after) {
  const notes = {
    10: "You're officially his favourite human.",
    25: "25 treats! He'd like to remind you that he's still hungry.",
    50: "50 treats. The elephant approves 🐘",
    100: "100 treats. Legend. Parker will remember this forever.",
    250: "250?! You might love him as much as we do.",
  };
  const milestone = Object.keys(notes).map(Number).find((m) => before < m && after >= m);
  if (!milestone) return;
  confetti();
  playWoof(2);
  thanksText.textContent = notes[milestone];
  thanks.hidden = false;
  clearTimeout(thanksTimer);
  thanksTimer = setTimeout(hideThanks, 7000);
}
