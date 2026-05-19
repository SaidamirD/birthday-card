/* ==========================
   GLOBAL CONFIG & STATE
========================== */
const CONFETTI_COLORS = [
  "#ff4d6d", "#ffd93d", "#4ecdc4",
  "#9b5de5", "#ff9f1c", "#ffffff", "#ff85a2"
];

const INTERACTIVES = {
  CANDLES:  "candles",
  FLAGS:    "flags",
  CONFETTI: "confetti"
};

// Все картинки и стейт игры
const preloadedImages = [];
const TOTAL_IMAGES = 8; // Используем 8 картинок, как в предзагрузке

let currentInteractive = null;
let gameCompleted  = false;
let giftUnlocked   = false;
let selectedGift   = null;
let surpriseVisible = false;
let imageExpanded  = false;
let candlesLocked  = false;
let poppedCount    = 0;

// Глобальные ссылки на DOM-элементы (будут найдены при старте)
let scene, music, flagsContainer, candlesContainer, confettiContainer;
let leftPopper, rightPopper, giftBox, surprise, surpriseImage;
let sfxPop, sfxHorn, sfxBlow, sfxLighter;

/* ==========================
   PRELOAD SURPRISE IMAGES
========================== */
function preloadSurpriseImages() {
  for (let i = 1; i <= TOTAL_IMAGES; i++) {
    const img = new Image();
    img.src = `assets/images/${i}.webp`;
    preloadedImages.push(img);
  }
}
preloadSurpriseImages();

/* ==========================
   BOKEH BACKGROUND (IIFE)
========================== */
(function () {
  const canvas = document.getElementById("bokeh-bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W, H, circles;

  const COLORS = [
    "255, 160, 0",
    "255, 200, 0",
    "255, 220, 80",
    "255, 255, 200",
    "200, 60, 0",
    "255, 120, 0"
  ];

function randomCircle() {
  // Увеличиваем диапазон радиусов: от крошечных (10px) до огромных (310px)
  // Это создает сильный эффект глубины (какие-то круги кажутся близкими, какие-то далекими)
  const randomRadius = 30 + Math.random() * 300; 

  // Задаем более контрастный разброс скоростей. 
  // Маленькие круги будут двигаться чуть быстрее, большие — лениво плыть
  const speedModifier = randomRadius > 150 ? 0.15 : 0.4;

  return {
    x:       Math.random() * W,
    y:       Math.random() * H,
    r:       randomRadius,
    // Разброс прозрачности, чтобы они не сливались в одну массу
    alpha:   0.02 + Math.random() * 0.15,
    color:   COLORS[Math.floor(Math.random() * COLORS.length)],
    // Случайное направление движения с учетом модификатора скорости
    speedX:  (Math.random() - 0.5) * speedModifier,
    speedY:  (Math.random() - 0.5) * speedModifier,
    pulse:   Math.random() * Math.PI * 2,
    // Разброс скорости мерцания (пульсации)
    pulseSpeed: 0.002 + Math.random() * 0.012
  };
}

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function init() {
    resize();
    circles = Array.from({ length: 15 }, randomCircle);
  }

  function draw() {
    ctx.fillStyle = "#2a0500";
    ctx.fillRect(0, 0, W, H);

    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, H * 0.85);
    vignette.addColorStop(0, "rgba(80, 10, 0, 0)");
    vignette.addColorStop(1, "rgba(10, 0, 0, 0.7)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    circles.forEach(c => {
      c.pulse += c.pulseSpeed;
      const alphaNow = c.alpha + Math.sin(c.pulse) * 0.04;

      const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      grad.addColorStop(0,   `rgba(${c.color}, ${alphaNow})`);
      grad.addColorStop(0.5, `rgba(${c.color}, ${alphaNow * 0.4})`);
      grad.addColorStop(1,   `rgba(${c.color}, 0)`);

      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      c.x += c.speedX;
      c.y += c.speedY;

      if (c.x < -c.r)  c.x = W + c.r;
      if (c.x > W + c.r) c.x = -c.r;
      if (c.y < -c.r)  c.y = H + c.r;
      if (c.y > H + c.r) c.y = -c.r;
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  init();
  draw();
})();

/* ==========================
   AUDIO HELPER
========================== */
function playSound(audio) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(e => console.log("Audio play error:", e));
}

function startMusic() {
  if (!music) return;
  music.volume = 0.25;
  music.play().catch(() => {
    const unlock = () => {
      music.play();
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
    };
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("click",      unlock, { once: true });
  });
}

/* ==========================
   GAME MECHANICS FUNCTIONS
========================== */
function getRandomInteractive() {
  const list = Object.values(INTERACTIVES);
  return list[Math.floor(Math.random() * list.length)];
}

function chooseGift() {
  if (selectedGift !== null) return;
  selectedGift = Math.floor(Math.random() * TOTAL_IMAGES) + 1;
  surpriseImage.src = `assets/images/${selectedGift}.webp`;
}

function setupScene() {
  const hintSign = document.getElementById("hint-sign");
  const hintText = document.getElementById("hint-text");
  
  hintSign.classList.add("hidden");
  flagsContainer.classList.add("hidden");
  confettiContainer.classList.add("hidden");
  candlesContainer.innerHTML = "";

  switch (currentInteractive) {
    case INTERACTIVES.CANDLES:
      createCandles(8);
      hintText.textContent = "Задуйте свечи";
      hintSign.classList.remove("hidden");
      break;
    case INTERACTIVES.FLAGS:
      createCandles(5);
      flagsContainer.classList.remove("hidden");
      setupFlags();
      break;
    case INTERACTIVES.CONFETTI:
      createCandles(5);
      confettiContainer.classList.remove("hidden");
      setupPoppers();
      hintText.textContent = "Пустите конфетти";
      hintSign.classList.remove("hidden");
      break;
  }
  console.log("Current interactive active:", currentInteractive);
}

function createCandles(count) {
  const radius = 85;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI * 3 / 4;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.35;

    const candle = document.createElement("div");
    candle.classList.add("candle");
    candle.style.left = `calc(50% + ${x}px)`;
    candle.style.top  = `${y + 20}px`;
    candle.dataset.lit = "true";

    const flame = document.createElement("div");
    flame.classList.add("flame");
    candle.appendChild(flame);

    if (currentInteractive === INTERACTIVES.CANDLES) {
      candle.addEventListener("click", () => toggleCandle(candle));
    }
    candlesContainer.appendChild(candle);
  }
}

function toggleCandle(candle) {
  if (candlesLocked) return;
  const flame = candle.querySelector(".flame");
  const isLit = candle.dataset.lit === "true";

  if (isLit) {
    candle.dataset.lit = "false";
    playSound(sfxBlow);
    gsap.killTweensOf(flame);
    gsap.to(flame, { opacity: 0, scale: 0.2, duration: 0.2 });
  } else {
    candle.dataset.lit = "true";
    playSound(sfxLighter);
    gsap.to(flame, {
      opacity: 1,
      scale: 1,
      duration: 0.2,
      onComplete: () => {
        gsap.to(flame, { scale: 1.08, repeat: -1, yoyo: true, duration: 0.25 });
      }
    });
  }
  checkCandlesCompleted();
}

function checkCandlesCompleted() {
  const candles = document.querySelectorAll(".candle");
  const allOut = [...candles].every(c => c.dataset.lit === "false");
  if (allOut) candleSuccess();
}

/* FLAGS GAME */
function setupFlags() {
  const rows = document.querySelectorAll(".flag-row");
  rows.forEach(row => {
    shuffleRow(row);
    const flags = [...row.children];

    flags.forEach(flag => {
      Draggable.create(flag, {
        type: "x",
        onPress: function () {
          const rect = this.target.getBoundingClientRect();
          this.flagWidth  = rect.width;
          this.startIndex = [...row.children].indexOf(this.target);

          gsap.set(this.target, {
            position: "absolute",
            left:     this.target.offsetLeft,
            top:      this.target.offsetTop,
            width:    rect.width,
            zIndex:   999
          });
          gsap.to(this.target, { scale: 1.08, duration: 0.12 });
        },
        onDrag: function () {
          const dragged = this.target;
          const draggedCenter = dragged.getBoundingClientRect().left + dragged.getBoundingClientRect().width / 2;
          const siblings = [...row.children].filter(el => el !== dragged);

          let targetIndex = siblings.length;
          siblings.forEach((sibling, index) => {
            const midpoint = sibling.getBoundingClientRect().left + sibling.getBoundingClientRect().width / 2;
            if (draggedCenter < midpoint && targetIndex === siblings.length) {
              targetIndex = index;
            }

            let offset = 0;
            if (index < targetIndex) offset = -20;
            else if (index >= targetIndex) offset = 20;

            gsap.to(sibling, { x: offset, duration: 0.15, ease: "power2.out" });
          });
          this.targetIndex = targetIndex;
        },
        onRelease: function () {
          const dragged = this.target;
          const siblings = [...row.children].filter(el => el !== dragged);
          const targetIndex = this.targetIndex ?? siblings.length;

          gsap.set(dragged, { x: 0, y: 0 });
          if (targetIndex >= siblings.length) row.appendChild(dragged);
          else row.insertBefore(dragged, siblings[targetIndex]);

          gsap.set(dragged, { clearProps: "position,left,top,width,zIndex" });
          gsap.to([...row.children], { x: 0, duration: 0.18, ease: "power2.out" });
          gsap.to(dragged, { x: 0, scale: 1, duration: 0.18, ease: "power2.out" });

          checkFlagsCompleted();
        }
      });
    });
  });
}

function shuffleRow(row) {
  const flags = [...row.children];
  for (let i = flags.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flags[i], flags[j]] = [flags[j], flags[i]];
  }
  row.innerHTML = "";
  flags.forEach(flag => row.appendChild(flag));
}

function checkFlagsCompleted() {
  const row1 = [...document.querySelectorAll("#row-1 .flag")].map(el => el.dataset.letter).join("");
  const row2 = [...document.querySelectorAll("#row-2 .flag")].map(el => el.dataset.letter).join("");
  if (row1 === "С днём" && row2 === "рождения" && !gameCompleted) {
    candleSuccess();
  }
}

/* POPPERS GAME */
function setupPoppers() {
  poppedCount = 0;
  leftPopper.classList.remove("used");
  rightPopper.classList.remove("used");
  leftPopper.dataset.used  = "false";
  rightPopper.dataset.used = "false";

  leftPopper.onclick  = () => popPopper(leftPopper,  -1);
  rightPopper.onclick = () => popPopper(rightPopper,  1);
}

function popPopper(popper, direction) {
  if (popper.dataset.used === "true") return;
  popper.dataset.used = "true";
  poppedCount++;

  playSound(sfxPop);
  popper.classList.add("used");

  gsap.to(popper, { scale: 0.9, rotation: direction * 30, duration: 0.12, yoyo: true, repeat: 1 });
  spawnConfetti(popper, direction);
  if (poppedCount >= 2 && !gameCompleted) candleSuccess();
}

function spawnConfetti(popper, direction) {
  const popRect  = popper.getBoundingClientRect();
  const startX   = popRect.left + popRect.width  / 2;
  const startY   = popRect.top  + popRect.height * 0.25;

  const cake     = document.getElementById("cake");
  const cakeRect = cake.getBoundingClientRect();
  const targetX  = cakeRect.left + cakeRect.width  / 2;
  const targetY  = cakeRect.top  - 60;

  const COUNT = 70;

  for (let i = 0; i < COUNT; i++) {
    const piece = document.createElement("div");
    piece.classList.add("confetti-piece");

    const isRound = Math.random() > 0.55;
    const w = 7  + Math.random() * 9;
    const h = isRound ? w : w * (1.5 + Math.random() * 0.8);

    piece.style.width         = `${w}px`;
    piece.style.height        = `${h}px`;
    piece.style.background    = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.borderRadius  = isRound ? "50%" : "3px";

    document.body.appendChild(piece);

    gsap.set(piece, {
      position: "fixed", left: startX, top: startY, x: 0, y: 0,
      rotation: Math.random() * 360, scaleX: 1, opacity: 1, zIndex: 999
    });

    const dx = targetX - startX;
    const dy = targetY - startY;
    const peakFrac  = 0.35 + Math.random() * 0.30;
    const peakX     = dx * peakFrac + (Math.random() - 0.5) * 60;
    const peakY     = Math.min(0, dy) - (150 + Math.random() * 130);

    const t1         = 0.45 + Math.random() * 0.1;
    const startDelay = Math.random() * 0.08;
    const spinTotal = (Math.random() > 0.5 ? 1 : -1) * (isRound ? 180 : 400);

    const tl = gsap.timeline({ delay: startDelay });
    tl.to(piece, { x: peakX, y: peakY, rotation: `+=${spinTotal * 0.4}`, ease: "power2.out", duration: t1 });
    tl.to(piece, { x: peakX + ((Math.random() - 0.7) * 500 * direction), y: peakY + (380 + Math.random() * 200), rotation: `+=${spinTotal * 0.6}`, opacity: 0, duration: 4 + Math.random() * 0.5, onComplete: () => piece.remove() });

    gsap.to(piece, { scaleX: -0.55, yoyo: true, repeat: Math.round(4.5 / 0.2), duration: 0.16 + Math.random() * 0.14, ease: "sine.inOut", delay: startDelay + t1 * 0.6 });
  }
}

/* ==========================
   WIN & SURPRISE LOGIC
========================== */
function candleSuccess() {
  playSound(sfxHorn);
  gameCompleted = true;
  giftUnlocked  = true;
  chooseGift();

  gsap.to("#gift-box", { scale: 1.12, duration: 0.25, repeat: 1, yoyo: true });
  gsap.to("#gift-box", { filter: "drop-shadow(0 0 16px gold)", duration: 0.4 });

  setTimeout(() => openGift(), 600);
}

function openGift() {
  if (!giftUnlocked || surpriseVisible) return;
  candlesLocked   = true;
  surpriseVisible = true;

  gsap.to(".gift-lid", { y: -18, rotation: -10, duration: 0.45, ease: "back.out(1.7)" });
  gsap.fromTo(surprise, 
    { xPercent: -50, y: 70, opacity: 0 },
    { 
      xPercent: -50, y: -110, opacity: 1, duration: 0.65, ease: "back.out(1.8)",
      onStart: () => { surprise.style.pointerEvents = "auto"; },
      onComplete: () => { if (!imageExpanded) setTimeout(() => toggleExpandedImage(), 250); }
    }
  );
}

function closeGift() {
  imageExpanded   = false;
  surpriseVisible = false;
  candlesLocked   = false;

  gsap.to(surprise, { y: 70, opacity: 0, duration: 0.45, onComplete: () => { surprise.style.pointerEvents = "none"; } });
  gsap.to(".gift-lid", { y: 0, rotation: 0, duration: 0.4 });
}

function toggleExpandedImage() {
  if (!surpriseVisible) return;

  if (!imageExpanded) {
    imageExpanded = true;
    gsap.killTweensOf(surpriseImage);
    gsap.set(surpriseImage, { position: "fixed", left: "50%", top: "50%", x: "-50%", y: "-50%", margin: 0, zIndex: 99999 });
    gsap.to(surpriseImage, { width: "90vw", maxHeight: "90vh", duration: 0.45, ease: "power2.out" });
  } else {
    imageExpanded = false;
    gsap.to(surpriseImage, {
      width: "120px", duration: 0.35, ease: "power2.out",
      onComplete: () => {
        gsap.set(surpriseImage, { position: "relative", left: "auto", top: "auto", x: 0, y: 0, zIndex: 30 });
      }
    });
  }
}

function animateIntro() {
  gsap.to(scene, { opacity: 1, duration: 1.2, ease: "power2.out" });
  gsap.from("#cake", { y: 80, opacity: 0, duration: 1.1, ease: "back.out(1.5)" });
  gsap.from("#gift-box", { y: 40, opacity: 0, duration: 1, delay: 0.2, ease: "power2.out" });
  gsap.to(".flame", { scale: 1.08, repeat: -1, yoyo: true, stagger: 0.05, duration: 0.25 });
}

/* ==========================
   START INITIALIZATION (DOM READY)
========================== */
document.addEventListener("DOMContentLoaded", () => {
  // Находим все элементы интерфейса
  scene             = document.getElementById("scene");
  music             = document.getElementById("background-music");
  flagsContainer    = document.getElementById("flags-container");
  candlesContainer  = document.getElementById("candles-container");
  confettiContainer = document.getElementById("confetti-container");
  leftPopper        = document.getElementById("left-popper");
  rightPopper       = document.getElementById("right-popper");
  giftBox           = document.getElementById("gift-box");
  surprise          = document.getElementById("gift-surprise");
  surpriseImage     = document.getElementById("surprise-image");

  // Звуки
  sfxPop     = document.getElementById("sfx-pop");
  sfxHorn    = document.getElementById("sfx-horn");
  sfxBlow    = document.getElementById("sfx-blow");
  sfxLighter = document.getElementById("sfx-lighter");

  const overlay   = document.getElementById("start-overlay");
  const preloader = document.getElementById("preloader");

  // Выбираем тип игры только ПОСЛЕ того, как всё дерево готово
  currentInteractive = getRandomInteractive();

  function startExperience() {
    // Разблокировка контекста аудио для Safari/Chrome
    [sfxPop, sfxHorn, sfxBlow, sfxLighter].forEach(sound => {
      if (sound) {
        sound.play().then(() => {
          sound.pause();
          sound.currentTime = 0;
        }).catch(e => console.log("Audio unlock bypass active", e));
      }
    });

    overlay.style.opacity       = "0";
    overlay.style.pointerEvents = "none";
    setTimeout(() => overlay.remove(), 300);

    gsap.to(preloader, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        preloader.style.display = "none";
        setupScene();
        animateIntro();
        startMusic();
      }
    });
  }

  if (overlay) {
    overlay.addEventListener("click", startExperience, { once: true });
  }

  // Клик по коробке подарка
  giftBox.addEventListener("click", () => {
    if (!giftUnlocked) return;
    if (surpriseVisible) closeGift(); else openGift();
  });

  // Клик по самой картинке внутри подарка
  surpriseImage.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleExpandedImage();
  });
});