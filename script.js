// ---------- Заглушки для фото, которых ещё нет ----------
document.querySelectorAll("img[data-fallback]").forEach((img) => {
  const holder = img.parentElement;
  const markEmpty = () => {
    holder.classList.add("is-empty");
    holder.dataset.fallback = img.dataset.fallback;
    holder.dataset.hint = "Добавьте " + img.getAttribute("src");
  };
  if (img.complete && img.naturalWidth === 0) markEmpty();
  img.addEventListener("error", markEmpty);
});

// ---------- Мобильное меню ----------
const toggle = document.querySelector(".nav__toggle");
const links = document.querySelector(".nav__links");

toggle.addEventListener("click", () => {
  const open = links.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
});

links.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    links.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }
});

// ---------- Появление блоков при прокрутке ----------
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// ---------- Подсветка активного пункта меню ----------
const navLinks = [...document.querySelectorAll(".nav__links a")];
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) =>
        a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id)
      );
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
document.querySelectorAll("section[id]").forEach((s) => sectionObserver.observe(s));

// ---------- Просмотр фото ----------
const lightbox = document.querySelector(".lightbox");
const lightboxImg = lightbox.querySelector("img");

document.querySelectorAll(".gallery__item").forEach((item) => {
  item.addEventListener("click", () => {
    if (item.classList.contains("is-empty")) return;
    const img = item.querySelector("img");
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.hidden = false;
  });
});

const closeLightbox = () => (lightbox.hidden = true);
lightbox.addEventListener("click", (e) => {
  if (e.target !== lightboxImg) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});

// ---------- Кнопка «Погладить» ----------
const petBtn = document.querySelector(".pet__btn");
const petCount = document.getElementById("petCount");
const petWord = document.getElementById("petWord");
const STORAGE_KEY = "bambam-pets";

let pets = 0;
try {
  pets = parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0;
} catch (_) {}

function plural(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "раза";
  return "раз";
}

function renderPets() {
  petCount.textContent = pets.toLocaleString("ru-RU");
  petWord.textContent = plural(pets);
}
renderPets();

const hearts = ["❤️", "🧡", "💚", "💜", "🐾", "🦴"];

petBtn.addEventListener("click", (e) => {
  pets += 1;
  renderPets();
  try {
    localStorage.setItem(STORAGE_KEY, String(pets));
  } catch (_) {}

  petBtn.classList.remove("is-wiggle");
  void petBtn.offsetWidth; // перезапуск анимации
  petBtn.classList.add("is-wiggle");

  const rect = petBtn.getBoundingClientRect();
  const heart = document.createElement("span");
  heart.className = "heart";
  heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
  heart.style.left = (e.clientX || rect.left + rect.width / 2) + "px";
  heart.style.top = (e.clientY || rect.top) + "px";
  heart.style.setProperty("--dx", (Math.random() * 80 - 40).toFixed(0) + "px");
  document.body.appendChild(heart);
  heart.addEventListener("animationend", () => heart.remove());
});
