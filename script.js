/* ==========================
   START
========================== */
document.addEventListener("DOMContentLoaded", () => {

  const overlay  = document.getElementById("start-overlay");
  const preloader = document.getElementById("preloader");

  function startExperience() {

    overlay.style.opacity     = "0";
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

  overlay.addEventListener("click", startExperience, { once: true });
});

/* ==========================
   ELEMENTS
========================== */

const sfxPop     = new Audio("assets/sounds/pop.wav");
const sfxHorn    = new Audio("assets/sounds/horn.wav");
const sfxBlow    = new Audio("assets/sounds/blow.ogg");
const sfxLighter = new Audio("assets/sounds/lighter.wav");

function playSound(audio) {
  audio.cloneNode().play();
}

const CONFETTI_COLORS = [
  "#ff4d6d", "#ffd93d", "#4ecdc4",
  "#9b5de5", "#ff9f1c", "#ffffff", "#ff85a2"
];

const scene = document.getElementById("scene");

const music =
  document.getElementById(
    "background-music"
  );

const flagsContainer =
  document.getElementById(
    "flags-container"
  );

const candlesContainer =
  document.getElementById(
    "candles-container"
  );

const confettiContainer =
  document.getElementById(
    "confetti-container"
  );

const leftPopper =
  document.getElementById(
    "left-popper"
  );

const rightPopper =
  document.getElementById(
    "right-popper"
  );

const giftBox =
  document.getElementById(
    "gift-box"
  );

const surprise =
  document.getElementById(
    "gift-surprise"
  );

const surpriseImage =
  document.getElementById(
    "surprise-image"
  );

/* ==========================
   INTERACTIVE TYPES
========================== */

const INTERACTIVES = {
  CANDLES:  "candles",
  FLAGS:    "flags",
  CONFETTI: "confetti"
};

const currentInteractive = getRandomInteractive();

function chooseGift() {

  if (selectedGift !== null) {
    return;
  }

  selectedGift =
    Math.floor(Math.random() * TOTAL_IMAGES) + 1;

  surpriseImage.src =
    `assets/images/${selectedGift}.webp`;
}

/* ==========================
   SURPRISE IMAGES
========================== */

const TOTAL_IMAGES = 7;

/* ==========================
   GAME STATE
========================== */

let gameCompleted  = false;
let giftUnlocked   = false;
let selectedGift   = null;
let surpriseVisible = false;
let imageExpanded  = false;
let candlesLocked  = false;
let poppedCount    = 0;

/* ==========================
   RANDOM INTERACTIVE
========================== */

function getRandomInteractive() {

  const list = Object.values(INTERACTIVES);

  const randomIndex =
    Math.floor(Math.random() * list.length);

  return list[randomIndex];
}

/* ==========================
   SETUP SCENE
========================== */

function setupScene() {

  /* сброс таблички */
  const hintSign = document.getElementById("hint-sign");
  const hintText = document.getElementById("hint-text");
  hintSign.classList.add("hidden");

  /* скрыть все интерактивы */
  flagsContainer.classList.add("hidden");
  confettiContainer.classList.add("hidden");

  candlesContainer.innerHTML = "";

  switch (currentInteractive) {

    case INTERACTIVES.CANDLES:
      createCandles(8);
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
      break;
  }

  console.log("Current interactive:", currentInteractive);

  /* табличка */
  if (currentInteractive === INTERACTIVES.CANDLES) {
    hintText.textContent = "Задуйте свечи";
    hintSign.classList.remove("hidden");
  } else if (currentInteractive === INTERACTIVES.CONFETTI) {
    hintText.textContent = "Пустите конфетти";
    hintSign.classList.remove("hidden");
  }
}

/* ==========================
   CREATE CANDLES
========================== */

function createCandles(count) {

  const radius = 85;

  for (let i = 0; i < count; i++) {

    const angle =
      (i / count) * Math.PI * 2 - Math.PI * 3 / 4;

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
      candle.addEventListener(
        "click",
        () => toggleCandle(candle)
      );
    }

    candlesContainer.appendChild(candle);
  }
}

/* ==========================
   CANDLE INTERACTION
========================== */

function toggleCandle(candle) {

  if (candlesLocked) {
    return;
  }

  const flame = candle.querySelector(".flame");
  const isLit = candle.dataset.lit === "true";

  /* тушим */
  if (isLit) {

    candle.dataset.lit = "false";

    playSound(sfxBlow);

    gsap.killTweensOf(flame);

    gsap.to(flame, {
      opacity:  0,
      scale:    0.2,
      duration: 0.2
    });

  }
  /* зажигаем */
  else {

    candle.dataset.lit = "true";

    playSound(sfxLighter);

    gsap.to(flame, {
      opacity:  1,
      scale:    1,
      duration: 0.2,

      onComplete: () => {
        gsap.to(flame, {
          scale:    1.08,
          repeat:   -1,
          yoyo:     true,
          duration: 0.25
        });
      }
    });
  }

  checkCandlesCompleted();
}

/* ==========================
   FLAGS INTERACTION
========================== */

function setupFlags() {

  const rows = document.querySelectorAll(".flag-row");

  rows.forEach(row => {

    shuffleRow(row);

    const flags = [...row.children];

    flags.forEach(flag => {

      Draggable.create(flag, {
        type:    "x",
        inertia: false,

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

          gsap.to(this.target, {
            scale:    1.08,
            duration: 0.12
          });
        },

        onDrag: function () {

          const dragged       = this.target;
          const draggedRect   = dragged.getBoundingClientRect();
          const draggedCenter = draggedRect.left + draggedRect.width / 2;

          const siblings = [...row.children].filter(el => el !== dragged);

          let targetIndex = siblings.length;

          siblings.forEach((sibling, index) => {

            const rect     = sibling.getBoundingClientRect();
            const midpoint = rect.left + rect.width / 2;
            const shouldMove = draggedCenter < midpoint;

            if (shouldMove && targetIndex === siblings.length) {
              targetIndex = index;
            }

            const moveDistance = 20;
            let offset = 0;

            if (index < targetIndex) {
              offset = -moveDistance;
            } else if (index >= targetIndex) {
              offset = moveDistance;
            }

            gsap.to(sibling, {
              x:        offset,
              duration: 0.15,
              ease:     "power2.out"
            });
          });

          this.targetIndex = targetIndex;
        },

        onRelease: function () {

          const dragged     = this.target;
          const siblings    = [...row.children].filter(el => el !== dragged);
          const targetIndex = this.targetIndex ?? siblings.length;

          gsap.set(dragged, { x: 0, y: 0 });

          if (targetIndex >= siblings.length) {
            row.appendChild(dragged);
          } else {
            row.insertBefore(dragged, siblings[targetIndex]);
          }

          gsap.set(dragged, {
            clearProps: "position,left,top,width,zIndex"
          });

          gsap.to([...row.children], {
            x:        0,
            duration: 0.18,
            ease:     "power2.out"
          });

          gsap.to(dragged, {
            x:        0,
            scale:    1,
            duration: 0.18,
            ease:     "power2.out"
          });

          checkFlagsCompleted();
        }
      });
    });
  });
}

/* ==========================
   SHUFFLE
========================== */

function shuffleRow(row) {

  const flags = [...row.children];

  for (let i = flags.length - 1; i > 0; i--) {

    const j = Math.floor(Math.random() * (i + 1));

    [flags[i], flags[j]] = [flags[j], flags[i]];
  }

  row.innerHTML = "";
  flags.forEach(flag => row.appendChild(flag));
}

/* ==========================
   CONFETTI GAME
========================== */

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

  if (popper.dataset.used === "true") {
    return;
  }

  popper.dataset.used = "true";
  poppedCount++;

  playSound(sfxPop);

  popper.classList.add("used");

  gsap.to(popper, {
    scale:    0.9,
    rotation: direction * 30,
    duration: 0.12,
    yoyo:     true,
    repeat:   1
  });

  spawnConfetti(popper, direction);

  checkPoppersCompleted();
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
    piece.style.pointerEvents = "none";

    document.body.appendChild(piece);

    gsap.set(piece, {
      position: "fixed",
      left:     startX,
      top:      startY,
      x:        0,
      y:        0,
      rotation: Math.random() * 360,
      scaleX:   1,
      opacity:  1,
      zIndex:   999
    });

    const dx = targetX - startX;
    const dy = targetY - startY;

    const peakFrac  = 0.35 + Math.random() * 0.30;
    const peakX     = dx * peakFrac + (Math.random() - 0.5) * 60;

    const topY      = Math.min(0, dy);
    const arcHeight = 150 + Math.random() * 130;
    const peakY     = topY - arcHeight;

    const t1         = 0.45 + Math.random() * 0.1;
    const startDelay = Math.random() * 0.08;

    const spinTotal = isRound
      ? (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 180)
      : (Math.random() > 0.5 ? 1 : -1) * (400 + Math.random() * 320);

    const fallDuration = 4   + Math.random() * 0.5;
    const drift        = (Math.random() - 0.7) * 500 * direction;
    const fallDist     = 380 + Math.random() * 200;

    const tl = gsap.timeline({ delay: startDelay });

    tl.to(piece, {
      x:        peakX,
      y:        peakY,
      rotation: `+=${spinTotal * 0.4}`,
      ease:     "power2.out",
      duration: t1
    });

    tl.to(piece, {
      x:        peakX + drift,
      y:        peakY + fallDist,
      rotation: `+=${spinTotal * 0.6}`,
      opacity:  0,
      duration: fallDuration,
      onComplete: () => piece.remove()
    });

    const wobbleDur = 0.16 + Math.random() * 0.14;
    gsap.to(piece, {
      scaleX:   -0.55,
      yoyo:     true,
      repeat:   Math.round((t1 + fallDuration) / wobbleDur) + 2,
      duration: wobbleDur,
      ease:     "sine.inOut",
      delay:    startDelay + t1 * 0.6
    });
  }
}

function checkPoppersCompleted() {
  if (poppedCount >= 2) {
    gameCompleted = true;
    giftUnlocked  = true;
    candleSuccess();
  }
}

/* ==========================
   CHECK WIN — FLAGS
========================== */

function checkFlagsCompleted() {

  const row1 =
    [...document.querySelectorAll("#row-1 .flag")]
    .map(el => el.dataset.letter)
    .join("");

  const row2 =
    [...document.querySelectorAll("#row-2 .flag")]
    .map(el => el.dataset.letter)
    .join("");

  if (row1 === "С днём" && row2 === "рождения") {

    if (gameCompleted) {
      return;
    }

    gameCompleted = true;
    giftUnlocked  = true;

    candleSuccess();
  }
}

/* ==========================
   CHECK WIN — CANDLES
========================== */

function checkCandlesCompleted() {

  const candles = document.querySelectorAll(".candle");

  const allOut = [...candles].every(
    candle => candle.dataset.lit === "false"
  );

  if (allOut) {
    gameCompleted = true;
    giftUnlocked  = true;
    candleSuccess();
  }
}

/* ==========================
   SUCCESS
========================== */

function candleSuccess() {

  playSound(sfxHorn);

  console.log("Game completed!");

  gameCompleted = true;
  giftUnlocked  = true;

  chooseGift();

  gsap.to("#gift-box", {
    scale:    1.12,
    duration: 0.25,
    repeat:   1,
    yoyo:     true
  });

  gsap.to("#gift-box", {
    filter:   "drop-shadow(0 0 16px gold)",
    duration: 0.4
  });

  setTimeout(() => {
    openGift();
  }, 600);
}

/* ==========================
   GIFT
========================== */

function openGift() {

  if (!giftUnlocked)   { return; }
  if (surpriseVisible) { return; }

  candlesLocked   = true;
  surpriseVisible = true;

  gsap.to(".gift-lid", {
    y:        -18,
    rotation: -10,
    duration: 0.45,
    ease:     "back.out(1.7)"
  });

  gsap.fromTo(
    surprise,
    {
      xPercent: -50,
      y:        70,
      opacity:  0
    },
    {
      xPercent: -50,
      y:        -110,
      opacity:  1,
      duration: 0.65,
      ease:     "back.out(1.8)",

      onStart: () => {
        surprise.style.pointerEvents = "auto";
      },

      onComplete: () => {
        if (!imageExpanded) {
          setTimeout(() => {
            toggleExpandedImage();
          }, 250);
        }
      }
    }
  );
}

function closeGift() {

  imageExpanded   = false;
  surpriseVisible = false;
  candlesLocked   = false;

  gsap.to(surprise, {
    y:        70,
    opacity:  0,
    duration: 0.45,
    onComplete: () => {
      surprise.style.pointerEvents = "none";
    }
  });

  gsap.to(".gift-lid", {
    y:        0,
    rotation: 0,
    duration: 0.4
  });
}

function toggleExpandedImage() {

  if (!surpriseVisible) { return; }

  /* OPEN */
  if (!imageExpanded) {

    imageExpanded = true;

    gsap.killTweensOf(surpriseImage);

    gsap.set(surpriseImage, {
      position: "fixed",
      left:     "50%",
      top:      "50%",
      x:        "-50%",
      y:        "-50%",
      margin:   0,
      zIndex:   99999
    });

    gsap.to(surpriseImage, {
      width:     "90vw",
      maxHeight: "90vh",
      duration:  0.45,
      ease:      "power2.out"
    });

  }
  /* CLOSE */
  else {

    imageExpanded = false;

    gsap.to(surpriseImage, {
      width:    "120px",
      duration: 0.35,
      ease:     "power2.out",

      onComplete: () => {
        gsap.set(surpriseImage, {
          position: "relative",
          left:     "auto",
          top:      "auto",
          x:        0,
          y:        0,
          zIndex:   30
        });
      }
    });
  }
}

/* ==========================
   MUSIC
========================== */

function startMusic() {

  music.volume = 0.25;

  const playPromise = music.play();

  if (playPromise !== undefined) {

    playPromise.catch(() => {
      const unlock = () => {
        music.play();
        document.removeEventListener("touchstart", unlock);
        document.removeEventListener("click", unlock);
      };

      document.addEventListener("touchstart", unlock, { once: true });
      document.addEventListener("click",      unlock, { once: true });
    });
  }
}

/* ==========================
   INTRO ANIMATION
========================== */

function animateIntro() {

  gsap.to(scene, {
    opacity:  1,
    duration: 1.2,
    ease:     "power2.out"
  });

  gsap.from("#cake", {
    y:        80,
    opacity:  0,
    duration: 1.1,
    ease:     "back.out(1.5)"
  });

  gsap.from("#gift-box", {
    y:        40,
    opacity:  0,
    duration: 1,
    delay:    0.2,
    ease:     "power2.out"
  });

  gsap.to(".flame", {
    scale:    1.08,
    repeat:   -1,
    yoyo:     true,
    stagger:  0.05,
    duration: 0.25
  });
}

/* ==========================
   EVENTS
========================== */

giftBox.addEventListener("click", () => {

  if (!giftUnlocked) { return; }

  if (surpriseVisible) {
    closeGift();
  } else {
    openGift();
  }
});

surpriseImage.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleExpandedImage();
});
