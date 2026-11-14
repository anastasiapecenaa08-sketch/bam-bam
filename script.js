/* =========================================================
   Slide deck: mouse wheel / trackpad / keyboard / swipe
   ========================================================= */
const slides = [...document.querySelectorAll(".slide")];
const dotsNav = document.querySelector(".dots");
const counterCurrent = document.querySelector(".counter__current");
const counterTotal = document.querySelector(".counter__total");
const root = document.documentElement;

const TRANSITION_MS = 950;
let current = -1;
let animating = false;
let deckLocked = false;      // true while the mini game is open
const slideHooks = [];       // functions called with the new slide id (see fun.js)

const pad = (n) => String(n).padStart(2, "0");
counterTotal.textContent = pad(slides.length);

// stagger index for every animated element
slides.forEach((slide) => {
  slide.querySelectorAll(".anim").forEach((el, i) => el.style.setProperty("--i", i));
});

// navigation dots
const dots = slides.map((slide, i) => {
  const dot = document.createElement("button");
  dot.className = "dot";
  dot.type = "button";
  dot.setAttribute("aria-label", slide.dataset.title);
  dot.innerHTML = `<span class="dot__label">${slide.dataset.title}</span>`;
  dot.addEventListener("click", () => go(i));
  dotsNav.appendChild(dot);
  return dot;
});

function go(index) {
  index = Math.max(0, Math.min(slides.length - 1, index));
  if (index === current) return;

  slides.forEach((slide, i) => {
    const active = i === index;
    slide.classList.toggle("is-active", active);
    slide.classList.toggle("is-past", i < index);
    slide.inert = !active;
    slide.setAttribute("aria-hidden", String(!active));
  });

  dots.forEach((dot, i) => {
    dot.classList.toggle("is-active", i === index);
    if (i === index) dot.setAttribute("aria-current", "step");
    else dot.removeAttribute("aria-current");
  });

  const style = getComputedStyle(slides[index]);
  root.style.setProperty("--current-accent", style.getPropertyValue("--accent"));
  root.style.setProperty("--current-accent-2", style.getPropertyValue("--accent-2"));
  root.style.setProperty("--progress", ((index + 1) / slides.length) * 100 + "%");
  counterCurrent.textContent = pad(index + 1);
  document.title = index === 0 ? "Parker — Tibetan Mastiff" : `${slides[index].dataset.title} · Parker`;
  history.replaceState(null, "", "#" + slides[index].id);

  current = index;
  slideHooks.forEach((fn) => fn(slides[index].id));
  animating = true;
  setTimeout(() => (animating = false), TRANSITION_MS);
}

const next = () => go(current + 1);
const prev = () => go(current - 1);

// --- Mouse wheel & trackpad ---
// One gesture = one slide. Trackpads keep firing wheel events (inertia)
// for a while, so we wait for a short pause before accepting a new gesture.
let lastWheel = 0;
let gestureUsed = false;

window.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    if (deckLocked) return;
    const now = performance.now();
    if (now - lastWheel > 220) gestureUsed = false;
    lastWheel = now;

    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (animating || gestureUsed || Math.abs(delta) < 4) return;

    gestureUsed = true;
    delta > 0 ? next() : prev();
  },
  { passive: false }
);

// --- Keyboard ---
window.addEventListener("keydown", (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey || deckLocked) return;
  const onButton = e.target.closest && e.target.closest("button, a");

  switch (e.key) {
    case "ArrowDown":
    case "ArrowRight":
    case "PageDown":
      e.preventDefault();
      if (!animating) next();
      break;
    case " ":
      if (onButton) return;
      e.preventDefault();
      if (!animating) (e.shiftKey ? prev : next)();
      break;
    case "ArrowUp":
    case "ArrowLeft":
    case "PageUp":
      e.preventDefault();
      if (!animating) prev();
      break;
    case "Home":
      e.preventDefault();
      go(0);
      break;
    case "End":
      e.preventDefault();
      go(slides.length - 1);
      break;
  }
});

// --- Touch swipe ---
let touchStart = null;
window.addEventListener(
  "touchstart",
  (e) => (touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }),
  { passive: true }
);
window.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
window.addEventListener("touchend", (e) => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  touchStart = null;
  if (animating || deckLocked) return;
  if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx)) dy < 0 ? next() : prev();
  else if (Math.abs(dx) > 60) dx < 0 ? next() : prev();
});

// --- Buttons & links that jump to slides ---
document.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", next));
document.querySelectorAll("[data-goto]").forEach((el) =>
  el.addEventListener("click", (e) => {
    e.preventDefault();
    go(Number(el.dataset.goto));
  })
);

// start on the slide from the URL (#sleep, #food, ...) or the first one
const startIndex = Math.max(0, slides.findIndex((s) => "#" + s.id === location.hash));
go(startIndex);

// react to manual URL changes / back-forward (#food, #bark, ...)
window.addEventListener("hashchange", () => {
  const i = slides.findIndex((s) => "#" + s.id === location.hash);
  if (i >= 0) go(i);
});

/* =========================================================
   Bark button
   ========================================================= */
const barkBtn = document.getElementById("barkBtn");
const barkPhoto = document.getElementById("barkPhoto");
const woofs = ["WOOF!", "WOOF WOOF!", "BORK!", "ARF!", "WOOOF!"];
let audioCtx;

// a short synthesized "woof" — no audio files needed
function woofSound(when) {
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(320, when);
  osc.frequency.exponentialRampToValueAtTime(110, when + 0.22);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1400, when);
  filter.frequency.exponentialRampToValueAtTime(300, when + 0.22);
  filter.Q.value = 6;

  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.5, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.26);

  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(when);
  osc.stop(when + 0.3);
}

barkBtn.addEventListener("click", () => {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    woofSound(t);
    woofSound(t + 0.28);
  } catch (_) {}

  const bubble = document.createElement("span");
  bubble.className = "woof";
  bubble.textContent = woofs[Math.floor(Math.random() * woofs.length)];
  bubble.style.left = 8 + Math.random() * 45 + "%";
  bubble.style.top = 8 + Math.random() * 45 + "%";
  bubble.style.setProperty("--r", (Math.random() * 24 - 12).toFixed(0) + "deg");
  barkPhoto.appendChild(bubble);
  bubble.addEventListener("animationend", () => bubble.remove());

  barkPhoto.classList.remove("shake");
  void barkPhoto.offsetWidth;
  barkPhoto.classList.add("shake");
});

/* =========================================================
   Treat counter (remembered in this browser)
   ========================================================= */
const treatBtn = document.getElementById("treatBtn");
const treatCount = document.getElementById("treatCount");
const treatMsg = document.getElementById("treatMsg");
const STORAGE_KEY = "parker-treats";

let treats = 0;
try {
  treats = parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0;
} catch (_) {}
treatCount.textContent = treats.toLocaleString("en-US");

const messages = [
  "Nom nom nom!",
  "Gone in one second.",
  "He's looking at you. He wants another one.",
  "Elephant mode: activated 🐘",
  "Still hungry. Obviously.",
  "Good boy! 🐾",
  "That didn't even touch the sides.",
];

function treatMessage(n) {
  if (n === 1) return "First treat! He loves you now.";
  if (n === 10) return "10 treats — that's basically a snack.";
  if (n === 50) return "50 treats! He says that's a good start.";
  if (n === 100) return "100 treats. Parker has never been happier.";
  return messages[Math.floor(Math.random() * messages.length)];
}

const treatEmojis = ["🦴", "🍖", "🥩", "🧀", "❤️", "🐾"];

treatBtn.addEventListener("click", (e) => {
  const before = treats;
  treats += 1;
  treatCount.textContent = treats.toLocaleString("en-US");
  treatMsg.textContent = treatMessage(treats);
  try {
    localStorage.setItem(STORAGE_KEY, String(treats));
  } catch (_) {}

  treatBtn.classList.remove("is-nom");
  void treatBtn.offsetWidth;
  treatBtn.classList.add("is-nom");

  const rect = treatBtn.getBoundingClientRect();
  const x = e.clientX || rect.left + rect.width / 2;
  const y = e.clientY || rect.top + rect.height / 2;
  for (let i = 0; i < 6; i++) {
    const s = document.createElement("span");
    s.className = "flying";
    s.textContent = treatEmojis[Math.floor(Math.random() * treatEmojis.length)];
    s.style.left = x + "px";
    s.style.top = y + "px";
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 90;
    s.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    s.style.setProperty("--dy", Math.sin(angle) * dist - 40 + "px");
    s.style.setProperty("--rot", (Math.random() * 120 - 60).toFixed(0) + "deg");
    document.body.appendChild(s);
    s.addEventListener("animationend", () => s.remove());
  }

  // confetti + thank-you card at 10, 25, 50, 100... treats (fun.js)
  if (typeof celebrate === "function") celebrate(before, treats);
});
