const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const lifeEl = document.getElementById("life");
const bossEl = document.getElementById("boss");
const overlayEl = document.getElementById("overlay");
const startButton = document.getElementById("startButton");
const toastEl = document.getElementById("toast");
const overlayTitleEl = document.getElementById("overlayTitle");
const overlayLine1El = document.getElementById("overlayLine1");
const overlayLine2El = document.getElementById("overlayLine2");
const overlayLine3El = document.getElementById("overlayLine3");

const W = canvas.width;
const H = canvas.height;

const state = {
  running: false,
  time: 0,
  score: 0,
  stageTime: 0,
  stars: [],
  bullets: [],
  enemies: [],
  enemyBullets: [],
  items: [],
  effects: [],
  boss: null,
  spawnTimer: 0,
  bossReady: false,
  clear: false,
  audioReady: false,
  audio: null,
  touchId: null,
  player: {
    x: W / 2,
    y: H - 44,
    w: 14,
    h: 14,
    speed: 160,
    life: 3,
    cooldown: 0,
    fireRate: 0.18,
    power: 1,
    shield: 0,
    invincible: 0,
  },
};

function resetGame() {
  state.time = 0;
  state.score = 0;
  state.stageTime = 0;
  state.bullets = [];
  state.enemies = [];
  state.enemyBullets = [];
  state.items = [];
  state.effects = [];
  state.spawnTimer = 0;
  state.bossReady = false;
  state.clear = false;
  state.touchId = null;
  state.player = {
    x: W / 2,
    y: H - 44,
    w: 14,
    h: 14,
    speed: 160,
    life: 3,
    cooldown: 0,
    fireRate: 0.18,
    power: 1,
    shield: 0,
    invincible: 0,
  };
  state.boss = null;
  createStars();
  updateHud();
}

function createStars() {
  state.stars = Array.from({ length: 36 }, (_, i) => ({
    x: (i * 53) % W,
    y: (i * 29) % H,
    size: i % 3 === 0 ? 2 : 1,
    speed: 12 + (i % 4) * 10,
  }));
}

function updateHud() {
  scoreEl.textContent = state.score;
  lifeEl.textContent = state.player.life;
  bossEl.textContent = state.boss ? Math.max(0, Math.ceil(state.boss.life)) : "--";
}

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 1000);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return (
    Math.abs(a.x - b.x) * 2 < a.w + b.w &&
    Math.abs(a.y - b.y) * 2 < a.h + b.h
  );
}

function fireBullet() {
  const power = state.player.power;
  const spread = power >= 3 ? [-10, 0, 10] : power === 2 ? [-6, 6] : [0];
  for (const offset of spread) {
    state.bullets.push({
      x: state.player.x + offset,
      y: state.player.y - 10,
      vx: offset * 0.03,
      vy: -220,
      w: 4,
      h: 8,
      damage: 1,
    });
  }
}

function spawnEnemy() {
  const side = Math.random();
  const type = Math.random() < 0.28 ? "zigzag" : "basic";
  state.enemies.push({
    type,
    x: 24 + Math.random() * (W - 48),
    y: -12,
    w: 14,
    h: 14,
    life: type === "zigzag" ? 2 : 1,
    vx: side < 0.5 ? -40 : 40,
    vy: 30 + Math.random() * 24,
    fire: 1.1 + Math.random() * 0.9,
    frame: Math.random() * Math.PI * 2,
  });
}

function spawnBoss() {
  state.boss = {
    x: W / 2,
    y: 62,
    w: 54,
    h: 28,
    life: 65,
    phase: 0,
    fire: 0.9,
    move: 1,
  };
  showToast("BOSS APPROACH");
}

function spawnItem(x, y) {
  const roll = Math.random();
  const kind = roll < 0.45 ? "power" : roll < 0.75 ? "heal" : "shield";
  state.items.push({ x, y, w: 10, h: 10, vy: 40, kind });
}

function makeExplosion(x, y, color = "#ffd54a") {
  state.effects.push({ x, y, r: 2, life: 0.4, color });
}

function damagePlayer() {
  if (state.player.invincible > 0 || state.clear || !state.running) {
    return;
  }
  if (state.player.shield > 0) {
    state.player.shield -= 1;
    state.player.invincible = 0.8;
    showToast("SHIELD");
    return;
  }
  state.player.life -= 1;
  state.player.invincible = 1.4;
  makeExplosion(state.player.x, state.player.y, "#ff6b6b");
  updateHud();
  if (state.player.life <= 0) {
    endGame(false);
  }
}

function endGame(clear) {
  state.running = false;
  state.clear = clear;
  overlayEl.classList.remove("hidden");
  startButton.textContent = clear ? "RETRY" : "RESTART";
  overlayTitleEl.textContent = clear ? "MISSION CLEAR" : "GAME OVER";
  overlayLine1El.textContent = clear ? "ボスをたおした" : "もう一度チャレンジ";
  overlayLine2El.textContent = clear ? "スコア " + state.score : "スワイプでよけながら進む";
  overlayLine3El.textContent = clear ? "STARTで再挑戦できる" : "アイテムを取ると少し楽になる";
}

function applyItem(kind) {
  if (kind === "power") {
    state.player.power = Math.min(3, state.player.power + 1);
    showToast("POWER UP");
  } else if (kind === "heal") {
    state.player.life = Math.min(5, state.player.life + 1);
    showToast("LIFE UP");
  } else {
    state.player.shield = Math.min(3, state.player.shield + 1);
    showToast("SHIELD UP");
  }
  updateHud();
}

function update(dt) {
  state.time += dt;
  for (const star of state.stars) {
    star.y += star.speed * dt;
    if (star.y > H) {
      star.y = -4;
      star.x = Math.random() * W;
    }
  }

  if (!state.running) {
    return;
  }

  state.stageTime += dt;
  state.player.cooldown -= dt;
  state.player.invincible = Math.max(0, state.player.invincible - dt);

  if (state.player.cooldown <= 0) {
    fireBullet();
    state.player.cooldown = state.player.fireRate;
  }

  if (!state.boss && !state.bossReady) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      state.spawnTimer = 0.55;
    }
    if (state.stageTime > 28) {
      state.bossReady = true;
      state.enemies.length = 0;
      state.enemyBullets.length = 0;
      spawnBoss();
    }
  }

  for (const bullet of state.bullets) {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy * dt;
  }
  state.bullets = state.bullets.filter((b) => b.y > -12);

  for (const enemy of state.enemies) {
    enemy.frame += dt * 4;
    enemy.y += enemy.vy * dt;
    if (enemy.type === "zigzag") {
      enemy.x += Math.sin(enemy.frame) * 50 * dt;
    }
    enemy.fire -= dt;
    if (enemy.fire <= 0) {
      state.enemyBullets.push({
        x: enemy.x,
        y: enemy.y + 8,
        vx: 0,
        vy: 120,
        w: 4,
        h: 8,
      });
      enemy.fire = 1.5;
    }
  }
  state.enemies = state.enemies.filter((e) => e.y < H + 20 && e.life > 0);

  if (state.boss) {
    state.boss.phase += dt;
    state.boss.x += Math.sin(state.boss.phase * 1.4) * 32 * dt;
    state.boss.fire -= dt;
    if (state.boss.fire <= 0) {
      const angles = [-0.7, -0.35, 0, 0.35, 0.7];
      for (const angle of angles) {
        state.enemyBullets.push({
          x: state.boss.x + angle * 8,
          y: state.boss.y + 10,
          vx: Math.sin(angle) * 45,
          vy: 110 + Math.abs(angle) * 40,
          w: 5,
          h: 9,
        });
      }
      state.boss.fire = state.boss.life < 28 ? 0.45 : 0.8;
    }
  }

  for (const shot of state.enemyBullets) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
  }
  state.enemyBullets = state.enemyBullets.filter(
    (b) => b.y < H + 10 && b.x > -10 && b.x < W + 10
  );

  for (const item of state.items) {
    item.y += item.vy * dt;
  }
  state.items = state.items.filter((item) => item.y < H + 20);

  for (const fx of state.effects) {
    fx.life -= dt;
    fx.r += 40 * dt;
  }
  state.effects = state.effects.filter((fx) => fx.life > 0);

  for (const bullet of state.bullets) {
    for (const enemy of state.enemies) {
      if (enemy.life > 0 && rectsOverlap(bullet, enemy)) {
        bullet.y = -100;
        enemy.life -= bullet.damage;
        makeExplosion(bullet.x, bullet.y, "#7be0ff");
        if (enemy.life <= 0) {
          state.score += 100;
          makeExplosion(enemy.x, enemy.y);
          if (Math.random() < 0.28) {
            spawnItem(enemy.x, enemy.y);
          }
        }
      }
    }
    if (state.boss && rectsOverlap(bullet, state.boss)) {
      bullet.y = -100;
      state.boss.life -= bullet.damage;
      makeExplosion(bullet.x, bullet.y, "#7be0ff");
      if (state.boss.life <= 0) {
        state.score += 5000;
        makeExplosion(state.boss.x, state.boss.y, "#ffd54a");
        state.boss = null;
        updateHud();
        endGame(true);
        return;
      }
    }
  }

  for (const enemy of state.enemies) {
    if (rectsOverlap(enemy, state.player)) {
      enemy.life = 0;
      damagePlayer();
    }
  }

  for (const shot of state.enemyBullets) {
    if (rectsOverlap(shot, state.player)) {
      shot.y = H + 20;
      damagePlayer();
    }
  }

  if (state.boss && rectsOverlap(state.boss, state.player)) {
    damagePlayer();
  }

  for (const item of state.items) {
    if (rectsOverlap(item, state.player)) {
      item.y = H + 30;
      applyItem(item.kind);
    }
  }

  updateHud();
}

function drawPixelShip(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 2, y - 6, 4, 4);
  ctx.fillRect(x - 6, y - 2, 12, 4);
  ctx.fillRect(x - 4, y + 2, 8, 4);
  ctx.fillRect(x - 2, y + 6, 4, 2);
}

function drawEnemy(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 6, y - 4, 12, 4);
  ctx.fillRect(x - 4, y, 8, 4);
  ctx.fillRect(x - 2, y + 4, 4, 4);
}

function drawBoss(boss) {
  ctx.fillStyle = "#d96bff";
  ctx.fillRect(boss.x - 27, boss.y - 10, 54, 8);
  ctx.fillRect(boss.x - 18, boss.y - 2, 36, 8);
  ctx.fillRect(boss.x - 10, boss.y + 6, 20, 8);

  ctx.fillStyle = "#fff2a8";
  ctx.fillRect(boss.x - 15, boss.y - 2, 8, 4);
  ctx.fillRect(boss.x + 7, boss.y - 2, 8, 4);
}

function render() {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = "#050811";
  ctx.fillRect(0, 0, W, H);

  for (const star of state.stars) {
    ctx.fillStyle = star.size === 2 ? "#b8efff" : "#5d8de1";
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }

  if (state.bossReady && !state.boss && state.running) {
    ctx.fillStyle = "#1f304c";
    ctx.fillRect(20, 20, W - 40, 10);
    ctx.fillStyle = "#ffd54a";
    ctx.fillRect(20, 20, W - 40, 10);
  } else if (state.boss) {
    ctx.fillStyle = "#1f304c";
    ctx.fillRect(20, 20, W - 40, 10);
    ctx.fillStyle = "#ff7f7f";
    ctx.fillRect(20, 20, (W - 40) * (state.boss.life / 65), 10);
  }

  for (const item of state.items) {
    ctx.fillStyle =
      item.kind === "power" ? "#ffd54a" : item.kind === "heal" ? "#7bffb2" : "#7be0ff";
    ctx.fillRect(item.x - 5, item.y - 5, 10, 10);
    ctx.fillStyle = "#14203a";
    ctx.fillRect(item.x - 2, item.y - 2, 4, 4);
  }

  for (const bullet of state.bullets) {
    ctx.fillStyle = "#ffe27b";
    ctx.fillRect(bullet.x - 2, bullet.y - 4, bullet.w, bullet.h);
  }

  for (const bullet of state.enemyBullets) {
    ctx.fillStyle = "#ff7676";
    ctx.fillRect(bullet.x - 2, bullet.y - 4, bullet.w, bullet.h);
  }

  for (const enemy of state.enemies) {
    drawEnemy(enemy.x, enemy.y, enemy.type === "zigzag" ? "#ff8f66" : "#f06478");
  }

  if (state.boss) {
    drawBoss(state.boss);
  }

  if (!state.clear || state.running) {
    const blink = state.player.invincible > 0 && Math.floor(state.time * 12) % 2 === 0;
    if (!blink) {
      drawPixelShip(state.player.x, state.player.y, "#7be0ff");
      if (state.player.shield > 0) {
        ctx.strokeStyle = "#7bffb2";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, 13, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  for (const fx of state.effects) {
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, fx.r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function loop(now) {
  if (!loop.last) {
    loop.last = now;
  }
  const dt = Math.min(0.033, (now - loop.last) / 1000);
  loop.last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function movePlayer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  state.player.x = clamp((clientX - rect.left) * scaleX, 12, W - 12);
  state.player.y = clamp((clientY - rect.top) * scaleY, 16, H - 16);
}

canvas.addEventListener(
  "touchstart",
  (event) => {
    const touch = event.changedTouches[0];
    state.touchId = touch.identifier;
    movePlayer(touch.clientX, touch.clientY);
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (event) => {
    for (const touch of event.changedTouches) {
      if (touch.identifier === state.touchId) {
        movePlayer(touch.clientX, touch.clientY);
      }
    }
    event.preventDefault();
  },
  { passive: false }
);

canvas.addEventListener("touchend", (event) => {
  for (const touch of event.changedTouches) {
    if (touch.identifier === state.touchId) {
      state.touchId = null;
    }
  }
});

canvas.addEventListener("pointerdown", (event) => {
  movePlayer(event.clientX, event.clientY);
});

canvas.addEventListener("pointermove", (event) => {
  if (event.buttons > 0) {
    movePlayer(event.clientX, event.clientY);
  }
});

function createAudio() {
  if (state.audioReady) {
    return;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtx();
  const master = audioCtx.createGain();
  master.gain.value = 0.05;
  master.connect(audioCtx.destination);

  const musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.6;
  musicGain.connect(master);

  state.audio = { audioCtx, master, musicGain };
  state.audioReady = true;

  const notes = [261.63, 329.63, 392.0, 329.63, 293.66, 349.23, 440.0, 349.23];
  let step = 0;
  setInterval(() => {
    if (!state.running || !state.audioReady) {
      return;
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = notes[step % notes.length];
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.24);
    step += 1;
  }, 240);
}

function startGame() {
  resetGame();
  overlayEl.classList.add("hidden");
  overlayTitleEl.textContent = "PIXEL SKY FORCE";
  overlayLine1El.textContent = "スワイプで自機を動かす";
  overlayLine2El.textContent = "弾は自動で出続ける";
  overlayLine3El.textContent = "アイテムを取りながらボスを倒す";
  state.running = true;
  createAudio();
}

startButton.addEventListener("click", startGame);

resetGame();
render();
requestAnimationFrame(loop);
