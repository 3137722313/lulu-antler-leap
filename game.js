(() => {
  'use strict';

  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  const startOverlay = document.querySelector('#start-overlay');
  const endOverlay = document.querySelector('#end-overlay');
  const startButton = document.querySelector('#start-button');
  const againButton = document.querySelector('#again-button');
  const restartButton = document.querySelector('#restart-button');
  const musicButton = document.querySelector('#music-button');
  const endCrest = document.querySelector('#end-crest');
  const endLabel = document.querySelector('#end-label');
  const endTitle = document.querySelector('#end-title');
  const endCopy = document.querySelector('#end-copy');
  const resultScore = document.querySelector('#result-score');
  const bestScore = document.querySelector('#best-score');

  const W = canvas.width;
  const H = canvas.height;
  const LEVEL_END = 5780;
  const GROUND_Y = 442;
  const GRAVITY = 1880;
  const FOOT_INSET = 5;
  // A one-pixel landing skin absorbs sub-pixel animation rounding without ever
  // pulling Lulu back up after she has already passed through an edge.
  const LANDING_SKIN = 1;
  const colors = {
    ink: '#1f2147',
    outline: '#202044',
    sky: '#6397ee',
    skyLight: '#9cc9ff',
    hill: '#7497d2',
    hillDark: '#5879bd',
    pine: '#2f8364',
    pineLight: '#62bb79',
    grass: '#5dc87b',
    grassLight: '#a7e78e',
    dirt: '#9c4e3f',
    dirtDark: '#673446',
    brick: '#c05a55',
    brickLight: '#ee886f',
    violet: '#8e67d9',
    violetDark: '#553789',
    cream: '#fff5dc',
    berry: '#f3658c',
    gold: '#ffdd69',
    goldShadow: '#d9943f',
    mint: '#a6e7bc',
    aqua: '#79d8d1',
  };

  const heroSheet = new Image();
  let heroFrames = [];
  let heroSpriteReady = false;
  heroSheet.addEventListener('load', () => {
    heroFrames = measureHeroFrames(heroSheet);
    heroSpriteReady = heroFrames.length === 4;
  });
  heroSheet.addEventListener('error', () => { heroSpriteReady = false; });
  heroSheet.src = './assets/lulu-sprite-purple.png';

  // Crop each transparent pose to its visible pixels. In particular, never keep
  // padding below the feet: the bottom of this crop is our render foot line.
  function measureHeroFrames(source) {
    const sheet = document.createElement('canvas');
    sheet.width = source.naturalWidth;
    sheet.height = source.naturalHeight;
    const sheetCtx = sheet.getContext('2d', { willReadFrequently: true });
    sheetCtx.drawImage(source, 0, 0);
    const frameWidth = source.naturalWidth / 4;
    const frames = [];
    for (let index = 0; index < 4; index += 1) {
      const sourceX = Math.floor(index * frameWidth);
      const nextX = Math.floor((index + 1) * frameWidth);
      const width = nextX - sourceX;
      const image = sheetCtx.getImageData(sourceX, 0, width, source.naturalHeight);
      const { data } = image;
      let left = width;
      let top = source.naturalHeight;
      let right = -1;
      let bottom = -1;
      for (let y = 0; y < source.naturalHeight; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (data[(y * width + x) * 4 + 3] < 18) continue;
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
      if (right < left || bottom < top) return [];
      const padding = 3;
      const croppedLeft = Math.max(0, left - padding);
      const croppedTop = Math.max(0, top - padding);
      const croppedRight = Math.min(width, right + padding + 1);
      const croppedBottom = Math.min(source.naturalHeight, bottom + 1);
      frames.push({
        sx: sourceX + croppedLeft,
        sy: croppedTop,
        sw: croppedRight - croppedLeft,
        sh: croppedBottom - croppedTop,
      });
    }
    return frames;
  }

  const ground = [
    { x: -260, y: GROUND_Y, w: 1140, h: 130 },
    { x: 1030, y: GROUND_Y, w: 1030, h: 130 },
    { x: 2220, y: GROUND_Y, w: 780, h: 130 },
    { x: 3160, y: GROUND_Y, w: 1020, h: 130 },
    { x: 4350, y: GROUND_Y, w: 1600, h: 130 },
  ];

  const platforms = [
    { x: 190, y: 364, w: 140, h: 22, kind: 'moss' },
    { x: 398, y: 318, w: 108, h: 22, kind: 'brick' },
    { x: 568, y: 350, w: 126, h: 22, kind: 'moss' },
    { x: 755, y: 304, w: 104, h: 22, kind: 'brick' },
    { x: 898, y: 366, w: 112, h: 22, kind: 'bridge' },
    { x: 932, y: 390, w: 86, h: 20, kind: 'crystal' },
    { x: 1090, y: 354, w: 122, h: 22, kind: 'moss' },
    { x: 1290, y: 294, w: 146, h: 22, kind: 'brick' },
    { x: 1518, y: 352, w: 106, h: 22, kind: 'moss' },
    { x: 1694, y: 319, w: 112, h: 22, kind: 'spring' },
    { x: 1860, y: 263, w: 150, h: 22, kind: 'cloud' },
    { x: 2014, y: 370, w: 112, h: 22, kind: 'bridge' },
    { x: 2120, y: 392, w: 78, h: 20, kind: 'bridge' },
    { x: 2276, y: 348, w: 132, h: 22, kind: 'moss' },
    { x: 2488, y: 302, w: 120, h: 22, kind: 'brick' },
    { x: 2670, y: 358, w: 102, h: 22, kind: 'moss' },
    { x: 2855, y: 302, w: 112, h: 22, kind: 'spring' },
    { x: 3050, y: 373, w: 80, h: 22, kind: 'bridge' },
    { x: 3072, y: 390, w: 72, h: 20, kind: 'crystal' },
    { x: 3228, y: 344, w: 132, h: 22, kind: 'moss' },
    { x: 3430, y: 274, w: 156, h: 22, kind: 'brick' },
    { x: 3685, y: 339, w: 104, h: 22, kind: 'moss' },
    { x: 3865, y: 296, w: 118, h: 22, kind: 'cloud' },
    { x: 4060, y: 358, w: 98, h: 22, kind: 'spring' },
    { x: 4250, y: 374, w: 76, h: 22, kind: 'bridge' },
    { x: 4200, y: 393, w: 100, h: 20, kind: 'bridge' },
    { x: 4435, y: 349, w: 142, h: 22, kind: 'moss' },
    { x: 4652, y: 297, w: 122, h: 22, kind: 'brick' },
    { x: 4860, y: 354, w: 108, h: 22, kind: 'moss' },
    { x: 5048, y: 283, w: 132, h: 22, kind: 'cloud' },
    { x: 5262, y: 344, w: 126, h: 22, kind: 'brick' },
  ];

  const movingPlatforms = [
    { id: 'drift-cloud-a', x: 1465, y: 238, w: 102, h: 18, kind: 'cloud', axis: 'x', range: 38, speed: .72, phase: .3 },
    { id: 'drift-cloud-b', x: 2705, y: 218, w: 108, h: 18, kind: 'cloud', axis: 'x', range: 84, speed: 1.1, phase: 1.6 },
    { id: 'drift-cloud-c', x: 3940, y: 248, w: 106, h: 18, kind: 'cloud', axis: 'x', range: 44, speed: .68, phase: 2.4 },
  ];

  const starSeed = [
    [238, 322], [314, 322], [432, 276], [488, 276], [606, 308], [644, 308],
    [788, 262], [834, 262], [944, 327], [1126, 310], [1192, 310], [1328, 250],
    [1388, 250], [1550, 308], [1734, 276], [1900, 222], [1962, 222], [2050, 328],
    [2310, 302], [2382, 302], [2520, 256], [2576, 256], [2702, 312], [2890, 254],
    [3078, 327], [3268, 298], [3340, 298], [3472, 228], [3540, 228], [3720, 293],
    [3900, 250], [3956, 250], [4092, 312], [4272, 326], [4476, 302], [4542, 302],
    [4690, 250], [4742, 250], [4898, 308], [5088, 238], [5148, 238], [5300, 298],
    [5360, 298], [5460, 348], [972, 350], [2158, 350], [3108, 348], [4245, 351],
  ];

  const enemySeed = [
    [650, 404, 570, 820], [1180, 404, 1080, 1390], [1580, 404, 1480, 1880],
    [2370, 404, 2260, 2510], [2740, 404, 2630, 2900], [3360, 404, 3200, 3500],
    [3770, 404, 3620, 4000], [4010, 404, 3930, 4150], [4550, 404, 4430, 4640],
    [4950, 404, 4850, 5040], [5380, 404, 5240, 5450],
  ];

  const checkpoints = [
    { x: 2860, active: false },
    { x: 4700, active: false },
  ];

  const input = { left: false, right: false, jump: false };
  const player = {
    x: 110, y: 330, w: 38, h: 52, vx: 0, vy: 0, dir: 1,
    grounded: false, coyote: 0, jumpBuffer: 0, invulnerable: 0,
    hearts: 3, shield: 0, checkpoint: { x: 110, y: 300 }, frame: 0,
    groundY: null, springLock: null, supportId: null, supportX: null, supportY: null,
  };

  let stars = [];
  let enemies = [];
  let powerup = null;
  let particles = [];
  let score = 0;
  let cameraX = 0;
  let elapsed = 0;
  let timer = 160;
  let lastTime = 0;
  let gameState = 'title';
  let paused = false;
  let jumpCooldown = 0;
  let audioContext = null;
  let best = 0;
  let musicEnabled = true;
  let musicTimer = null;
  let musicStep = 0;
  let musicNextTime = 0;
  let musicStarting = false;
  let musicSession = 0;
  let sfxBus = null;
  let musicBus = null;

  try { best = Number(window.localStorage.getItem('lulu-antler-leap-best')) || 0; } catch (_) { best = 0; }
  try { musicEnabled = window.localStorage.getItem('lulu-antler-leap-music') !== 'off'; } catch (_) { musicEnabled = true; }
  updateBest();
  updateMusicButton();

  function roundedScore(value) { return String(Math.max(0, Math.floor(value))).padStart(3, '0'); }
  function updateBest() { bestScore.textContent = roundedScore(best); }

  function resetLevel() {
    stars = starSeed.map(([x, y], index) => ({ x, y, got: false, phase: index * .59 }));
    enemies = enemySeed.map(([x, y, min, max], index) => ({
      x, y, w: 42, h: 38, vx: index % 2 ? 48 : -48, min, max, squashed: 0, removed: false,
    }));
    powerup = { x: 1924, y: 214, got: false, phase: 0 };
    checkpoints.forEach((checkpoint) => { checkpoint.active = false; });
    Object.assign(player, {
      x: 110, y: 300, vx: 0, vy: 0, dir: 1, grounded: false, coyote: 0,
      jumpBuffer: 0, invulnerable: 0, hearts: 3, shield: 0,
      checkpoint: { x: 110, y: 300 }, frame: 0, groundY: null, springLock: null,
      supportId: null, supportX: null, supportY: null,
    });
    particles = [];
    score = 0;
    timer = 160;
    elapsed = 0;
    cameraX = 0;
    jumpCooldown = 0;
    input.left = false;
    input.right = false;
    input.jump = false;
  }

  function startGame() {
    resetLevel();
    gameState = 'running';
    paused = false;
    startOverlay.classList.add('is-hidden');
    endOverlay.classList.add('is-hidden');
    canvas.focus({ preventScroll: true });
    createAudio();
    startMusic();
    tone(330, .06, 'triangle', .045);
  }

  function restartGame() {
    if (gameState === 'title') startGame();
    else startGame();
  }

  function showEnd(kind) {
    gameState = kind === 'win' ? 'won' : 'lost';
    paused = false;
    stopMusic();
    resultScore.textContent = roundedScore(score);
    if (score > best) {
      best = score;
      try { window.localStorage.setItem('lulu-antler-leap-best', String(best)); } catch (_) { /* local storage is optional */ }
      updateBest();
    }
    if (kind === 'win') {
      endCrest.textContent = '✦';
      endLabel.textContent = '峡谷已点亮';
      endTitle.textContent = '月光晶核找到了！';
      endCopy.textContent = '鹿角小勇士把最后一盏灯塔重新点亮。';
      tone(523, .1, 'triangle', .06);
      window.setTimeout(() => tone(659, .12, 'triangle', .06), 110);
      window.setTimeout(() => tone(784, .18, 'triangle', .07), 230);
    } else {
      endCrest.textContent = '☁';
      endLabel.textContent = '迷雾挡住了去路';
      endTitle.textContent = '再试一次';
      endCopy.textContent = '调整节奏，星果和灯塔还在前面等你。';
      tone(165, .22, 'sawtooth', .05);
    }
    endOverlay.classList.remove('is-hidden');
  }

  function createAudio() {
    if (audioContext) return;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      sfxBus = audioContext.createGain();
      musicBus = audioContext.createGain();
      sfxBus.gain.value = .88;
      // The tune sits below effects, but is clearly audible on laptop speakers.
      musicBus.gain.value = .48;
      sfxBus.connect(audioContext.destination);
      musicBus.connect(audioContext.destination);
    } catch (_) {
      audioContext = null;
      sfxBus = null;
      musicBus = null;
    }
  }

  function tone(frequency, duration, type = 'square', volume = .04) {
    if (!audioContext) return;
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(sfxBus || audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + .02);
  }

  // A small four-bar, pentatonic "forest walk" loop: lead, soft harmony and bass
  // are scheduled separately so it reads as music rather than a one-shot effect.
  const musicLead = [
    74, null, 76, 79, 81, null, 79, 76, 74, null, 71, 74, 76, null, 74, null,
    79, null, 81, 83, 81, null, 79, 76, 74, null, 76, 79, 76, null, 74, null,
    76, null, 79, 81, 83, null, 81, 79, 76, null, 74, 76, 79, null, 76, null,
    74, null, 71, 74, 76, null, 79, 76, 74, null, 69, 71, 74, null, 72, null,
  ];
  const musicHarmony = [
    62, null, null, null, 62, null, null, null, 64, null, null, null, 64, null, null, null,
    59, null, null, null, 59, null, null, null, 62, null, null, null, 62, null, null, null,
    64, null, null, null, 64, null, null, null, 67, null, null, null, 67, null, null, null,
    62, null, null, null, 62, null, null, null, 59, null, null, null, 60, null, null, null,
  ];
  const musicBass = [
    50, null, null, null, 50, null, null, null, 52, null, null, null, 52, null, null, null,
    47, null, null, null, 47, null, null, null, 50, null, null, null, 50, null, null, null,
    52, null, null, null, 52, null, null, null, 55, null, null, null, 55, null, null, null,
    50, null, null, null, 50, null, null, null, 47, null, null, null, 48, null, null, null,
  ];

  function midiFrequency(note) { return 440 * Math.pow(2, (note - 69) / 12); }

  function scheduleMusicNote(note, at, duration, type, volume) {
    if (note === null || !audioContext || !musicBus) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(midiFrequency(note), at);
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(gain).connect(musicBus);
    oscillator.start(at);
    oscillator.stop(at + duration + .03);
  }

  function scheduleMusic() {
    if (!audioContext || !musicEnabled || gameState !== 'running' || paused) {
      musicTimer = null;
      return;
    }
    // A browser can temporarily suspend audio after a focus change. Keep the
    // current loop alive instead of silently abandoning music for the whole run.
    if (audioContext.state !== 'running') {
      musicTimer = window.setTimeout(scheduleMusic, 180);
      return;
    }
    const stepSeconds = 60 / 132 / 4;
    const now = audioContext.currentTime;
    if (musicNextTime < now - .05) {
      musicNextTime = now + .05;
      musicStep = 0;
    }
    while (musicNextTime < now + .24) {
      const index = musicStep % musicLead.length;
      scheduleMusicNote(musicLead[index], musicNextTime, stepSeconds * .86, 'triangle', .105);
      scheduleMusicNote(musicHarmony[index], musicNextTime, stepSeconds * 1.82, 'sine', .052);
      scheduleMusicNote(musicBass[index], musicNextTime, stepSeconds * 1.58, 'triangle', .108);
      if (index % 8 === 4) scheduleMusicNote(86, musicNextTime, .025, 'square', .015);
      musicStep = (musicStep + 1) % musicLead.length;
      musicNextTime += stepSeconds;
    }
    musicTimer = window.setTimeout(scheduleMusic, 52);
  }

  function startMusic() {
    if (!musicEnabled || musicTimer || musicStarting) return;
    createAudio();
    if (!audioContext) return;
    const session = musicSession;
    musicStarting = true;
    const resumed = audioContext.state === 'running' ? Promise.resolve() : audioContext.resume();
    resumed.then(() => {
      musicStarting = false;
      if (session !== musicSession || !musicEnabled || gameState !== 'running' || paused || musicTimer) return;
      musicStep = 0;
      musicNextTime = audioContext.currentTime + .05;
      scheduleMusic();
    }).catch(() => { musicStarting = false; });
  }

  function stopMusic() {
    musicSession += 1;
    musicStarting = false;
    if (musicTimer) window.clearTimeout(musicTimer);
    musicTimer = null;
    musicStep = 0;
    musicNextTime = 0;
  }

  function updateMusicButton() {
    if (!musicButton) return;
    musicButton.textContent = musicEnabled ? '♫ 音乐：开' : '♫ 音乐：关';
    musicButton.setAttribute('aria-pressed', String(musicEnabled));
    musicButton.setAttribute('aria-label', musicEnabled ? '关闭背景音乐' : '开启背景音乐');
  }

  function getMovingPlatforms() {
    return movingPlatforms.map((platform) => {
      const movement = Math.sin(elapsed * platform.speed + platform.phase) * platform.range;
      return {
        ...platform,
        x: platform.axis === 'x' ? platform.x + movement : platform.x,
        y: platform.axis === 'y' ? platform.y + movement : platform.y,
      };
    });
  }

  function getSolids() { return ground.concat(platforms, getMovingPlatforms()); }

  function clearMovingSupport() {
    player.supportId = null;
    player.supportX = null;
    player.supportY = null;
  }

  function rememberMovingSupport(solid, top) {
    if (!solid.id) {
      clearMovingSupport();
      return;
    }
    player.supportId = solid.id;
    player.supportX = solid.x;
    player.supportY = top;
  }

  // Moving platforms are rebuilt each frame, so retain their stable id and the
  // last surface position rather than their transient object identity. We only
  // carry Lulu while her feet still overlap the same cloud, avoiding stale support.
  function rideMovingSupport(solids) {
    if (!player.grounded || !player.supportId) return;
    if (Math.abs(player.y + player.h - player.supportY) > LANDING_SKIN) {
      clearMovingSupport();
      return;
    }
    const support = solids.find((solid) => solid.id === player.supportId);
    if (!support) {
      clearMovingSupport();
      return;
    }
    if (!horizontalContact(player, support)) {
      clearMovingSupport();
      return;
    }
    const top = solidTop(support);
    player.x = Math.max(-80, player.x + support.x - player.supportX);
    player.y = top - player.h;
    player.groundY = top;
    player.supportX = support.x;
    player.supportY = top;
  }

  function solidTop(solid) { return solid.y - (solid.kind ? 3 : 4); }
  function solidBottom(solid) { return solid.y + solid.h + (solid.kind ? 3 : 0); }
  function horizontalContact(a, solid) {
    return a.x + a.w - FOOT_INSET > solid.x && a.x + FOOT_INSET < solid.x + solid.w;
  }
  function verticalContact(a, solid) {
    return a.y + a.h - 2 > solidTop(solid) && a.y + 2 < solidBottom(solid);
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function update(dt) {
    elapsed += dt;
    if (gameState !== 'running' || paused) return;

    timer = Math.max(0, timer - dt);
    if (timer <= 0) { showEnd('lost'); return; }

    const solids = getSolids();
    rideMovingSupport(solids);

    const axis = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const targetSpeed = axis * (player.shield > 0 ? 296 : 250);
    const acceleration = player.grounded ? 2100 : 1180;
    if (axis) {
      player.vx += Math.sign(targetSpeed - player.vx) * acceleration * dt;
      if (Math.abs(player.vx - targetSpeed) < 18) player.vx = targetSpeed;
      player.dir = axis;
    } else {
      const friction = player.grounded ? 2050 : 330;
      player.vx = approach(player.vx, 0, friction * dt);
    }

    player.coyote = player.grounded ? .11 : Math.max(0, player.coyote - dt);
    jumpCooldown = Math.max(0, jumpCooldown - dt);
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    if (player.jumpBuffer > 0 && (player.grounded || player.coyote > 0)) {
      launchJump();
    }
    if (!input.jump && player.vy < -220) player.vy += 1150 * dt;

    player.vy = Math.min(850, player.vy + GRAVITY * dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.shield = Math.max(0, player.shield - dt);
    player.frame = Math.floor(elapsed * (Math.abs(player.vx) > 35 ? 11 : 3)) % (Math.abs(player.vx) > 35 ? 3 : 2);

    movePlayerX(dt, solids);
    movePlayerY(dt, solids);
    updateParticles(dt);
    updateEnemies(dt);
    collectStars();
    collectPowerup();
    activateCheckpoints();
    resolveEnemyHits();

    if (player.y > H + 145) harmPlayer();
    if (player.x + player.w > 5536 && player.y + player.h > 244) showEnd('win');
    cameraX = approach(cameraX, clamp(player.x - W * .38, 0, LEVEL_END - W), 740 * dt);
  }

  function approach(value, target, step) {
    if (value < target) return Math.min(value + step, target);
    if (value > target) return Math.max(value - step, target);
    return target;
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function launchJump() {
    if (gameState !== 'running' || paused || jumpCooldown > 0) return false;
    player.vy = player.shield > 0 ? -760 : -708;
    player.grounded = false;
    player.groundY = null;
    clearMovingSupport();
    player.coyote = 0;
    player.jumpBuffer = 0;
    jumpCooldown = .14;
    tone(440, .08, 'square', .04);
    return true;
  }

  function requestJump() {
    const wasHeld = input.jump;
    input.jump = true;
    if (wasHeld || gameState !== 'running' || paused) return;
    player.jumpBuffer = .13;
  }

  function movePlayerX(dt, solids) {
    const previousX = player.x;
    let nextX = previousX + player.vx * dt;
    if (player.vx > 0) {
      const previousRight = previousX + player.w;
      const nextRight = nextX + player.w;
      let obstacle = null;
      for (const solid of solids) {
        if (!verticalContact(player, solid)) continue;
        if (previousRight <= solid.x + 2 && nextRight >= solid.x && (!obstacle || solid.x < obstacle.x)) obstacle = solid;
      }
      if (obstacle) {
        nextX = obstacle.x - player.w;
        player.vx = 0;
      }
    } else if (player.vx < 0) {
      const previousLeft = previousX;
      const nextLeft = nextX;
      let obstacle = null;
      for (const solid of solids) {
        const right = solid.x + solid.w;
        if (!verticalContact(player, solid)) continue;
        if (previousLeft >= right - 2 && nextLeft <= right && (!obstacle || right > obstacle.x + obstacle.w)) obstacle = solid;
      }
      if (obstacle) {
        nextX = obstacle.x + obstacle.w;
        player.vx = 0;
      }
    }
    player.x = Math.max(-80, nextX);
    if (player.springLock && !horizontalContact(player, player.springLock)) player.springLock = null;
  }

  function movePlayerY(dt, solids) {
    const previousTop = player.y;
    const previousBottom = previousTop + player.h;
    const nextTop = previousTop + player.vy * dt;
    const nextBottom = nextTop + player.h;
    const falling = player.vy >= 0;
    player.grounded = false;
    player.groundY = null;
    if (falling) {
      let landing = null;
      let landingY = Infinity;
      for (const solid of solids) {
        const top = solidTop(solid);
        if (!horizontalContact(player, solid)) continue;
        if (previousBottom <= top + LANDING_SKIN && nextBottom >= top - LANDING_SKIN && top < landingY) {
          landing = solid;
          landingY = top;
        }
      }
      if (landing) {
        const impact = player.vy;
        player.y = landingY - player.h;
        player.groundY = landingY;
        if (landing.kind === 'spring' && player.springLock !== landing) {
          player.springLock = landing;
          clearMovingSupport();
          player.vy = -790;
          player.coyote = 0;
          player.jumpBuffer = 0;
          spawnLandingDust(player.x + player.w / 2, landingY, '#f59a8b', 6);
          tone(270, .12, 'square', .045);
        } else {
          player.vy = 0;
          player.grounded = true;
          rememberMovingSupport(landing, landingY);
          if (landing !== player.springLock) player.springLock = null;
          if (impact > 270) spawnLandingDust(player.x + player.w / 2, landingY, '#c7e7b6', 5);
        }
        return;
      }
      clearMovingSupport();
      player.y = nextTop;
      return;
    }

    clearMovingSupport();
    let ceiling = null;
    let ceilingY = -Infinity;
    for (const solid of solids) {
      const bottom = solidBottom(solid);
      if (!horizontalContact(player, solid)) continue;
      if (previousTop >= bottom - 3 && nextTop <= bottom && bottom > ceilingY) {
        ceiling = solid;
        ceilingY = bottom;
      }
    }
    if (ceiling) {
      player.y = ceilingY;
      player.vy = 0;
      return;
    }
    player.y = nextTop;
  }

  function updateEnemies(dt) {
    for (const enemy of enemies) {
      if (enemy.removed) continue;
      if (enemy.squashed > 0) {
        enemy.squashed -= dt;
        if (enemy.squashed <= 0) enemy.removed = true;
        continue;
      }
      enemy.x += enemy.vx * dt;
      if (enemy.x < enemy.min || enemy.x + enemy.w > enemy.max) {
        enemy.vx *= -1;
        enemy.x = clamp(enemy.x, enemy.min, enemy.max - enemy.w);
      }
    }
  }

  function collectStars() {
    for (const star of stars) {
      if (star.got) continue;
      const hitbox = { x: star.x - 11, y: star.y - 11, w: 22, h: 22 };
      if (overlaps(player, hitbox)) {
        star.got = true;
        score += 10;
        tone(780, .05, 'triangle', .035);
      }
    }
  }

  function collectPowerup() {
    if (!powerup || powerup.got) return;
    powerup.phase += .05;
    const hitbox = { x: powerup.x - 15, y: powerup.y - 15, w: 30, h: 32 };
    if (overlaps(player, hitbox)) {
      powerup.got = true;
      player.shield = 11;
      score += 80;
      tone(392, .1, 'triangle', .055);
      window.setTimeout(() => tone(524, .12, 'triangle', .055), 95);
    }
  }

  function activateCheckpoints() {
    for (const checkpoint of checkpoints) {
      if (!checkpoint.active && player.x > checkpoint.x) {
        checkpoint.active = true;
        player.checkpoint = { x: checkpoint.x + 42, y: 260 };
        score += 25;
        tone(590, .12, 'triangle', .045);
      }
    }
  }

  function resolveEnemyHits() {
    for (const enemy of enemies) {
      if (enemy.removed || enemy.squashed > 0 || !overlaps(player, enemy)) continue;
      const playerBottom = player.y + player.h;
      if (player.vy > 90 && playerBottom < enemy.y + 22) {
        enemy.squashed = .5;
        player.vy = -482;
        player.grounded = false;
        player.groundY = null;
        clearMovingSupport();
        player.jumpBuffer = 0;
        score += 30;
        tone(190, .09, 'square', .045);
      } else {
        harmPlayer();
      }
    }
  }

  function harmPlayer() {
    if (player.invulnerable > 0 || gameState !== 'running') return;
    if (player.shield > 0) {
      player.shield = 0;
      player.invulnerable = 1.3;
      player.vy = -350;
      player.grounded = false;
      player.groundY = null;
      clearMovingSupport();
      player.jumpBuffer = 0;
      tone(220, .13, 'sawtooth', .045);
      return;
    }
    player.hearts -= 1;
    if (player.hearts <= 0) { showEnd('lost'); return; }
    player.x = player.checkpoint.x;
    player.y = player.checkpoint.y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.groundY = null;
    player.springLock = null;
    clearMovingSupport();
    player.coyote = 0;
    player.jumpBuffer = 0;
    player.invulnerable = 1.8;
    tone(130, .2, 'sawtooth', .05);
  }

  function draw() {
    drawSky();
    drawFarScenery();
    ctx.save();
    ctx.translate(-Math.round(cameraX), 0);
    drawWorldDecorations();
    ground.forEach(drawGround);
    platforms.forEach(drawPlatform);
    getMovingPlatforms().forEach(drawPlatform);
    drawCheckpoints();
    drawStars();
    drawPowerup();
    drawParticles();
    enemies.forEach(drawEnemy);
    drawGoal();
    drawPlayer();
    ctx.restore();
    drawHud();
    if (paused && gameState === 'running') drawPauseCurtain();
  }

  function drawSky() {
    ctx.fillStyle = '#5078cc';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#6f98e3';
    ctx.fillRect(0, 0, W, 92);
    ctx.fillStyle = '#83abea';
    ctx.fillRect(0, 92, W, 94);
    ctx.fillStyle = 'rgba(202, 222, 255, .22)';
    ctx.fillRect(0, 186, W, 54);
    drawMoon(828, 64);
    drawSkySparkles();
    const cloudOffset = (cameraX * .12) % 1000;
    drawCloud(120 - cloudOffset, 111, 1.05);
    drawCloud(642 - cloudOffset, 94, .72);
    drawCloud(1015 - cloudOffset, 150, 1.25);
    drawCloud(-240 - cloudOffset, 168, .72);
  }

  function drawMoon(x, y) {
    ctx.fillStyle = 'rgba(241, 239, 255, .16)';
    ctx.fillRect(x - 20, y - 20, 40, 40);
    ctx.fillStyle = '#fff5c7';
    ctx.fillRect(x - 8, y - 14, 18, 26);
    ctx.fillRect(x - 14, y - 8, 28, 18);
    ctx.fillStyle = '#f0d993';
    ctx.fillRect(x - 7, y - 7, 7, 8);
    ctx.fillRect(x + 4, y + 4, 6, 5);
    ctx.fillStyle = '#7398df';
    ctx.fillRect(x + 6, y - 12, 10, 23);
  }

  function drawSkySparkles() {
    const sparkles = [[96, 54], [242, 98], [404, 44], [590, 132], [735, 39], [903, 138]];
    ctx.fillStyle = 'rgba(255, 250, 206, .9)';
    for (const [x, y] of sparkles) {
      const pulse = Math.floor((Math.sin(elapsed * 2.4 + x) + 1) * 1.5);
      ctx.fillRect(x, y, 2 + pulse, 2 + pulse);
    }
  }

  function drawCloud(x, y, scale) {
    const s = Math.round(scale * 10);
    ctx.fillStyle = '#eaf5ff';
    ctx.fillRect(Math.round(x), Math.round(y), s * 7, s * 2);
    ctx.fillRect(Math.round(x + s), Math.round(y - s), s * 4, s * 3);
    ctx.fillRect(Math.round(x + s * 3), Math.round(y - s * 2), s * 2, s * 4);
    ctx.fillStyle = '#bfdcf8';
    ctx.fillRect(Math.round(x + s), Math.round(y + s), s * 2, s);
    ctx.fillRect(Math.round(x + s * 5), Math.round(y + s), s * 2, s);
  }

  function drawFarScenery() {
    const farShift = (cameraX * .12) % 620;
    for (let i = -1; i < 3; i += 1) drawHill(i * 620 - farShift, 346, 1.28, '#6f8bc7');
    const shift = (cameraX * .2) % 460;
    for (let i = -1; i < 4; i += 1) drawHill(i * 460 - shift, 370, 1, colors.hill);
    const nearShift = (cameraX * .36) % 350;
    for (let i = -1; i < 5; i += 1) drawHill(i * 350 - nearShift, 405, .78, colors.hillDark);
    ctx.fillStyle = 'rgba(220, 240, 255, .16)';
    for (let band = 0; band < 3; band += 1) ctx.fillRect(0, 334 + band * 22, W, 7);
    const treeShift = (cameraX * .49) % 190;
    for (let i = -1; i < 7; i += 1) drawPine(i * 190 - treeShift + 34, 415, .72, '#387d72', '#77c280');
  }

  function drawHill(x, base, scale, color) {
    const w = 310 * scale;
    const h = 130 * scale;
    ctx.fillStyle = color;
    for (let row = 0; row < 8; row += 1) {
      const inset = (7 - row) * (w / 18);
      ctx.fillRect(Math.round(x + inset), Math.round(base - h + row * h / 8), Math.round(w - inset * 2), Math.ceil(h / 8) + 1);
    }
    ctx.fillStyle = 'rgba(228,244,255,.3)';
    ctx.fillRect(Math.round(x + w * .28), Math.round(base - h * .48), Math.round(w * .12), Math.round(h * .1));
  }

  function drawWorldDecorations() {
    const trees = [70, 490, 710, 1240, 1430, 2110, 2280, 2500, 3200, 3600, 3800, 4400, 4820, 5160, 5420];
    for (const x of trees) drawPine(x, GROUND_Y + 2, x % 3 === 0 ? 1.2 : .86, colors.pine, colors.pineLight);
    const tinyFlowers = [146, 694, 1145, 1386, 1870, 2300, 2636, 3380, 3940, 4510, 5008, 5350];
    tinyFlowers.forEach((x, index) => drawFlower(x, GROUND_Y - 8, index % 2));
    const lanterns = [334, 1044, 1980, 3030, 4308, 5192];
    lanterns.forEach((x, index) => drawLantern(x, GROUND_Y, index));
    const rocks = [270, 810, 1268, 2318, 2805, 3518, 4425, 4980];
    rocks.forEach((x, index) => drawRock(x, GROUND_Y - 2, index));
    drawFireflies();
  }

  function drawPine(x, y, scale, dark, light) {
    const s = Math.round(scale * 12);
    ctx.fillStyle = colors.outline;
    ctx.fillRect(Math.round(x - s * .32), Math.round(y - s * 1.1), Math.round(s * .64), Math.round(s * 1.12));
    ctx.fillStyle = '#794544';
    ctx.fillRect(Math.round(x - s * .12), Math.round(y - s * .2), Math.round(s * .25), Math.round(s * .58));
    ctx.fillStyle = dark;
    for (let layer = 0; layer < 3; layer += 1) {
      const width = s * (1.9 - layer * .38);
      const top = y - s * (1.15 + layer * .47);
      ctx.fillRect(Math.round(x - width / 2), Math.round(top), Math.round(width), Math.round(s * .32));
      ctx.fillRect(Math.round(x - width * .32), Math.round(top - s * .18), Math.round(width * .64), Math.round(s * .2));
    }
    ctx.fillStyle = light;
    ctx.fillRect(Math.round(x - s * .46), Math.round(y - s * 1.24), Math.round(s * .45), Math.round(s * .15));
  }

  function drawFlower(x, y, variant) {
    ctx.fillStyle = '#34875f';
    ctx.fillRect(x, y, 3, 9);
    ctx.fillStyle = variant ? '#ffc9df' : '#fdf083';
    ctx.fillRect(x - 3, y - 3, 9, 6);
    ctx.fillStyle = '#f26a99';
    ctx.fillRect(x, y - 5, 3, 10);
  }

  function drawLantern(x, y, index) {
    const glow = Math.floor((Math.sin(elapsed * 3 + index * 1.7) + 1) * 2);
    ctx.fillStyle = 'rgba(255, 225, 132, .12)';
    ctx.fillRect(x - 18, y - 56, 36, 34);
    ctx.fillStyle = colors.outline;
    ctx.fillRect(x - 2, y - 59, 5, 57);
    ctx.fillRect(x - 10, y - 61, 21, 4);
    ctx.fillStyle = '#765071';
    ctx.fillRect(x - 7, y - 54, 15, 20);
    ctx.fillStyle = '#ffd978';
    ctx.fillRect(x - 4, y - 50, 9, 12);
    ctx.fillStyle = '#fff6be';
    ctx.fillRect(x - 2, y - 48, 5 + glow, 5 + glow);
  }

  function drawRock(x, y, index) {
    const size = 8 + (index % 3) * 3;
    ctx.fillStyle = colors.outline;
    ctx.fillRect(x - 2, y - size + 2, size + 4, size);
    ctx.fillStyle = index % 2 ? '#73939a' : '#8c90ba';
    ctx.fillRect(x, y - size, size, size - 2);
    ctx.fillStyle = '#c6ddde';
    ctx.fillRect(x + 2, y - size + 2, Math.max(3, size - 5), 3);
  }

  function drawFireflies() {
    const fireflies = [[182, 380], [584, 344], [1070, 365], [1770, 380], [2420, 338], [3190, 364], [3990, 336], [4630, 371], [5280, 336]];
    for (let index = 0; index < fireflies.length; index += 1) {
      const [x, y] = fireflies[index];
      const lift = Math.sin(elapsed * 2.2 + index * 1.8) * 5;
      const glow = Math.floor((Math.sin(elapsed * 4.5 + index) + 1) * 1.5);
      ctx.fillStyle = 'rgba(255, 235, 129, .15)';
      ctx.fillRect(x - 4, Math.round(y + lift - 4), 10, 10);
      ctx.fillStyle = '#fff2a2';
      ctx.fillRect(x, Math.round(y + lift), 2 + glow, 2 + glow);
    }
  }

  function drawGround(segment) {
    const surface = solidTop(segment);
    ctx.fillStyle = colors.outline;
    ctx.fillRect(segment.x - 3, surface, segment.w + 6, segment.h + 4);
    ctx.fillStyle = colors.grass;
    ctx.fillRect(segment.x, surface + 1, segment.w, 17);
    ctx.fillStyle = colors.grassLight;
    for (let x = segment.x + 8; x < segment.x + segment.w; x += 29) {
      ctx.fillRect(x, surface + 4, 13, 3);
      ctx.fillRect(x + 4, surface - 3, 3, 5);
    }
    ctx.fillStyle = colors.dirt;
    ctx.fillRect(segment.x, surface + 17, segment.w, segment.h - 13);
    ctx.fillStyle = colors.dirtDark;
    for (let y = surface + 28; y < H + 90; y += 20) {
      for (let x = segment.x + ((y / 20) % 2) * 12; x < segment.x + segment.w; x += 32) {
        ctx.fillRect(Math.round(x), Math.round(y), 15, 4);
        ctx.fillRect(Math.round(x + 5), Math.round(y + 4), 4, 5);
      }
    }
    ctx.fillStyle = '#c26e53';
    for (let x = segment.x + 18; x < segment.x + segment.w; x += 54) ctx.fillRect(x, surface + 38 + (x % 3) * 7, 8, 5);
  }

  function drawPlatform(platform) {
    const { x, y, w, h, kind } = platform;
    ctx.fillStyle = colors.outline;
    ctx.fillRect(Math.round(x - 3), Math.round(y - 3), Math.round(w + 6), Math.round(h + 6));
    if (kind === 'brick') {
      ctx.fillStyle = colors.brick;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = colors.brickLight;
      for (let tile = 0; tile < w; tile += 29) {
        ctx.fillRect(x + tile + 3, y + 3, 22, 7);
        ctx.fillRect(x + tile + (tile % 58 ? 0 : 13), y + 13, 21, 5);
      }
    } else if (kind === 'cloud') {
      ctx.fillStyle = '#f4fbff';
      ctx.fillRect(x, y + 5, w, h - 5);
      ctx.fillRect(x + 13, y, w - 26, 8);
      ctx.fillStyle = '#b8dcf3';
      ctx.fillRect(x + 5, y + h - 5, w - 10, 4);
    } else if (kind === 'bridge') {
      ctx.fillStyle = '#d69c62';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#ffe0a0';
      for (let plank = 4; plank < w; plank += 20) ctx.fillRect(x + plank, y + 3, 13, h - 7);
    } else if (kind === 'crystal') {
      ctx.fillStyle = '#6659b5';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#a9a4f2';
      for (let shard = 7; shard < w; shard += 22) {
        ctx.fillRect(x + shard, y + 5, 10, h - 7);
        ctx.fillRect(x + shard + 2, y + 2, 6, 5);
      }
      ctx.fillStyle = '#e3e5ff';
      for (let shard = 10; shard < w; shard += 28) ctx.fillRect(x + shard, y + 5, 3, 6);
    } else if (kind === 'spring') {
      ctx.fillStyle = colors.dirt;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = colors.berry;
      ctx.fillRect(x + 8, y + 6, w - 16, 7);
      ctx.fillStyle = colors.cream;
      for (let spring = 16; spring < w - 10; spring += 19) {
        ctx.fillRect(x + spring, y + 14, 4, 5);
        ctx.fillRect(x + spring + 4, y + 11, 4, 4);
      }
    } else {
      ctx.fillStyle = colors.dirt;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = colors.grass;
      ctx.fillRect(x, y, w, 9);
      ctx.fillStyle = colors.grassLight;
      for (let sprout = 8; sprout < w; sprout += 24) ctx.fillRect(x + sprout, y + 2, 10, 3);
      ctx.fillStyle = colors.dirtDark;
      for (let mark = 12; mark < w; mark += 28) ctx.fillRect(x + mark, y + 14, 12, 3);
    }
  }

  function drawCheckpoints() {
    for (const checkpoint of checkpoints) {
      const active = checkpoint.active;
      ctx.fillStyle = colors.outline;
      ctx.fillRect(checkpoint.x, 300, 7, 142);
      ctx.fillStyle = active ? colors.gold : colors.cream;
      ctx.fillRect(checkpoint.x + 7, 308, 54, 33);
      ctx.fillStyle = active ? '#fb9f54' : '#a7c8ec';
      ctx.fillRect(checkpoint.x + 12, 313, 39, 18);
      ctx.fillStyle = colors.outline;
      ctx.fillRect(checkpoint.x + 20, 319, 22, 5);
      if (active) {
        ctx.fillStyle = '#fff1a6';
        ctx.fillRect(checkpoint.x - 8, 287, 8, 8);
        ctx.fillRect(checkpoint.x + 59, 298, 5, 5);
      }
    }
  }

  function drawStars() {
    for (const star of stars) {
      if (star.got) continue;
      const bob = Math.sin(elapsed * 5 + star.phase) * 3;
      drawStarFruit(star.x, star.y + bob);
    }
  }

  function drawStarFruit(x, y) {
    ctx.fillStyle = colors.outline;
    ctx.fillRect(x - 4, y - 12, 8, 25);
    ctx.fillRect(x - 12, y - 4, 25, 8);
    ctx.fillStyle = colors.gold;
    ctx.fillRect(x - 3, y - 9, 6, 19);
    ctx.fillRect(x - 9, y - 3, 19, 6);
    ctx.fillStyle = '#fff3a4';
    ctx.fillRect(x - 2, y - 7, 4, 7);
    ctx.fillStyle = colors.goldShadow;
    ctx.fillRect(x + 3, y + 2, 4, 5);
  }

  function drawPowerup() {
    if (!powerup || powerup.got) return;
    const bob = Math.sin(elapsed * 4) * 4;
    const x = powerup.x;
    const y = powerup.y + bob;
    ctx.fillStyle = colors.outline;
    ctx.fillRect(x - 13, y - 11, 27, 24);
    ctx.fillStyle = colors.aqua;
    ctx.fillRect(x - 9, y - 8, 19, 17);
    ctx.fillStyle = '#e4fdff';
    ctx.fillRect(x - 3, y - 13, 7, 29);
    ctx.fillRect(x - 14, y - 2, 29, 7);
    ctx.fillStyle = colors.gold;
    ctx.fillRect(x - 2, y - 4, 5, 12);
  }

  function drawEnemy(enemy) {
    if (enemy.removed) return;
    const x = Math.round(enemy.x);
    const y = Math.round(enemy.y + (enemy.squashed > 0 ? 20 : 0));
    const h = enemy.squashed > 0 ? 18 : enemy.h;
    ctx.fillStyle = colors.outline;
    ctx.fillRect(x - 2, y - 2, enemy.w + 4, h + 3);
    ctx.fillStyle = '#c4836c';
    ctx.fillRect(x + 4, y + 10, enemy.w - 8, h - 10);
    ctx.fillStyle = '#f2c07b';
    ctx.fillRect(x + 7, y + 5, enemy.w - 14, 16);
    ctx.fillStyle = '#743e56';
    ctx.fillRect(x + 7, y, enemy.w - 14, 8);
    if (enemy.squashed <= 0) {
      ctx.fillStyle = colors.outline;
      ctx.fillRect(x + 10, y + 10, 4, 5);
      ctx.fillRect(x + 28, y + 10, 4, 5);
      ctx.fillStyle = '#e35371';
      ctx.fillRect(x + 18, y + 19, 7, 4);
      ctx.fillStyle = '#593546';
      ctx.fillRect(x + 5, y + h - 5, 10, 5);
      ctx.fillRect(x + 27, y + h - 5, 10, 5);
    }
  }

  function drawGoal() {
    const x = 5525;
    ctx.fillStyle = colors.outline;
    ctx.fillRect(x - 8, 214, 62, 230);
    ctx.fillStyle = '#5f4e9d';
    ctx.fillRect(x - 3, 222, 52, 220);
    ctx.fillStyle = '#a487e1';
    ctx.fillRect(x + 4, 230, 38, 201);
    ctx.fillStyle = colors.outline;
    ctx.fillRect(x - 18, 195, 82, 30);
    ctx.fillStyle = '#f6d36d';
    ctx.fillRect(x - 12, 201, 70, 18);
    ctx.fillStyle = colors.cream;
    ctx.fillRect(x + 13, 174, 22, 22);
    ctx.fillStyle = colors.gold;
    ctx.fillRect(x + 17, 166, 14, 36);
    ctx.fillRect(x + 7, 176, 34, 15);
    ctx.fillStyle = '#fff2a7';
    ctx.fillRect(x + 20, 170, 8, 8);
    ctx.fillStyle = colors.outline;
    ctx.fillRect(x + 14, 275, 20, 29);
    ctx.fillStyle = '#bceff0';
    ctx.fillRect(x + 18, 279, 12, 21);
  }

  function spawnLandingDust(x, y, color, count) {
    for (let index = 0; index < count; index += 1) {
      const direction = index % 2 ? 1 : -1;
      particles.push({
        x: x + direction * (4 + index * 2),
        y: y - 4,
        vx: direction * (26 + index * 14),
        vy: -42 - (index % 3) * 20,
        life: .34 + (index % 2) * .08,
        maxLife: .42,
        size: 3 + (index % 3),
        color,
      });
    }
    if (particles.length > 72) particles.splice(0, particles.length - 72);
  }

  function updateParticles(dt) {
    for (const particle of particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 260 * dt;
    }
    particles = particles.filter((particle) => particle.life > 0);
  }

  function drawParticles() {
    for (const particle of particles) {
      ctx.save();
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
      ctx.restore();
    }
  }

  function drawPlayerShadow() {
    let surface = player.groundY;
    if (surface === null) {
      const playerBottom = player.y + player.h;
      for (const solid of getSolids()) {
        const top = solidTop(solid);
        if (!horizontalContact(player, solid) || top < playerBottom - 2 || top > playerBottom + 92) continue;
        if (surface === null || top < surface) surface = top;
      }
    }
    if (surface === null) return;
    const distance = Math.max(0, surface - (player.y + player.h));
    const width = Math.max(8, Math.round(24 - Math.min(distance, 68) * .18));
    ctx.save();
    ctx.globalAlpha = .2 - Math.min(distance, 68) * .002;
    ctx.fillStyle = '#26234c';
    ctx.fillRect(Math.round(player.x + player.w / 2 - width / 2), Math.round(surface - 2), width, 3);
    ctx.restore();
  }

  function drawPlayer() {
    if (player.invulnerable > 0 && Math.floor(elapsed * 16) % 2 === 0) return;
    const x = Math.round(player.x);
    const y = Math.round(player.y);
    drawPlayerShadow();
    if (heroSpriteReady && heroFrames.length) {
      const frameIndex = player.grounded ? (Math.abs(player.vx) > 38 ? player.frame : 0) : 3;
      const frame = heroFrames[frameIndex] || heroFrames[0];
      const drawHeight = 98;
      const drawWidth = Math.round(frame.sw * (drawHeight / frame.sh));
      ctx.save();
      // The cropped visible foot is anchored to the physics foot line exactly.
      ctx.translate(x + player.w / 2, y + player.h);
      ctx.scale(player.dir, 1);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(heroSheet, frame.sx, frame.sy, frame.sw, frame.sh, -Math.round(drawWidth / 2), -drawHeight, drawWidth, drawHeight);
      ctx.restore();
    } else {
      drawFallbackHero(x, y);
    }
    drawShieldGlimmer(x, y);
  }

  // Crystal protection stays visible without putting a distracting frame around
  // the character: just a few small pixel glints.
  function drawShieldGlimmer(x, y) {
    if (player.shield <= 0) return;
    const pulse = Math.floor(elapsed * 7) % 4;
    const glints = [[-3, 11], [39, 18], [5, 51], [34, 46]];
    ctx.save();
    ctx.fillStyle = pulse < 2 ? '#dcffff' : '#83ddd7';
    for (let index = 0; index < glints.length; index += 1) {
      if ((index + pulse) % 2 !== 0) continue;
      const [offsetX, offsetY] = glints[index];
      ctx.fillRect(x + offsetX, y + offsetY, 3, 3);
    }
    ctx.restore();
  }

  function drawFallbackHero(x, y) {
    ctx.save();
    ctx.translate(x + player.w / 2, y + player.h / 2 + 19);
    ctx.scale(player.dir, 1);
    ctx.translate(-player.w / 2, -player.h / 2);
    ctx.fillStyle = colors.outline;
    ctx.fillRect(6, -10, 26, 17);
    ctx.fillRect(2, -18, 8, 12);
    ctx.fillRect(28, -18, 8, 12);
    ctx.fillStyle = '#ad7fe5';
    ctx.fillRect(9, -7, 20, 13);
    ctx.fillRect(3, -16, 5, 9);
    ctx.fillRect(30, -16, 5, 9);
    ctx.fillStyle = colors.outline;
    ctx.fillRect(2, 3, 34, 22);
    ctx.fillStyle = colors.violet;
    ctx.fillRect(5, 5, 28, 19);
    ctx.fillStyle = colors.cream;
    ctx.fillRect(9, 12, 20, 11);
    ctx.fillStyle = '#ffd0df';
    ctx.fillRect(7, 14, 5, 4);
    ctx.fillRect(26, 14, 5, 4);
    ctx.fillStyle = colors.outline;
    ctx.fillRect(11, 8, 4, 4);
    ctx.fillRect(24, 8, 4, 4);
    ctx.fillStyle = colors.berry;
    ctx.fillRect(18, 14, 4, 4);
    ctx.fillStyle = colors.outline;
    ctx.fillRect(6, 24, 10, 9);
    ctx.fillRect(22, 24, 10, 9);
    ctx.fillStyle = colors.violetDark;
    ctx.fillRect(8, 24, 7, 6);
    ctx.fillRect(23, 24, 7, 6);
    ctx.restore();
  }

  function drawHud() {
    ctx.save();
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(24, 39, 95, .72)';
    ctx.fillRect(13, 13, 208, 53);
    ctx.fillRect(735, 13, 212, 53);
    ctx.fillStyle = colors.cream;
    ctx.fillText('星果  ' + String(score).padStart(4, '0'), 25, 22);
    ctx.fillStyle = colors.gold;
    ctx.fillText('✦', 25, 43);
    ctx.fillStyle = colors.cream;
    ctx.fillText('× ' + stars.filter((star) => star.got).length + '/' + stars.length, 47, 43);
    ctx.fillStyle = colors.cream;
    ctx.fillText('云杉峡谷  1-1', 745, 22);
    ctx.fillStyle = colors.gold;
    ctx.fillText('TIME ' + String(Math.ceil(timer)).padStart(3, '0'), 745, 43);
    ctx.fillStyle = colors.berry;
    const hearts = player.hearts > 0 ? '♥'.repeat(player.hearts) : '—';
    ctx.fillText(hearts, 145, 43);
    if (player.shield > 0) {
      ctx.fillStyle = '#dcffff';
      ctx.fillText('晶核盾 ' + Math.ceil(player.shield), 396, 18);
    }
    ctx.restore();
  }

  function drawPauseCurtain() {
    ctx.fillStyle = 'rgba(28, 31, 76, .52)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = colors.cream;
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('已暂停 · 点击画面继续', W / 2, H / 2 - 10);
    ctx.textAlign = 'left';
  }

  function clearControls() {
    input.left = false;
    input.right = false;
    input.jump = false;
    player.jumpBuffer = 0;
  }

  function pauseGame() {
    if (gameState !== 'running') return;
    paused = true;
    clearControls();
    stopMusic();
  }

  function resumeGame() {
    if (gameState !== 'running' || !paused) return;
    paused = false;
    startMusic();
  }

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000 || 0, .034);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function normalizeKey(event) {
    return event.code === 'ArrowLeft' || event.code === 'ArrowRight' || event.code === 'ArrowUp' || event.code === 'Space' || event.code === 'KeyA' || event.code === 'KeyD' || event.code === 'KeyW' || event.code === 'KeyR' || event.code === 'Enter';
  }

  document.addEventListener('keydown', (event) => {
    const isGameKey = normalizeKey(event);
    if (isGameKey) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (paused && gameState === 'running') resumeGame();
    if (gameState === 'title' && (event.code === 'Enter' || event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW')) {
      startGame();
      if (event.code !== 'Enter') {
        requestJump();
      }
      return;
    }
    if ((gameState === 'won' || gameState === 'lost') && (event.code === 'Enter' || event.code === 'Space' || event.code === 'KeyR')) { startGame(); return; }
    if (event.code === 'KeyR') { restartGame(); return; }
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') input.left = true;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') input.right = true;
    if (event.code === 'ArrowUp' || event.code === 'KeyW' || event.code === 'Space') {
      if (!event.repeat) requestJump();
    }
  }, { capture: true, passive: false });

  document.addEventListener('keyup', (event) => {
    if (normalizeKey(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') input.left = false;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') input.right = false;
    if (event.code === 'ArrowUp' || event.code === 'KeyW' || event.code === 'Space') input.jump = false;
  }, { capture: true, passive: false });

  document.querySelectorAll('[data-control]').forEach((button) => {
    const control = button.dataset.control;
    const pressed = (event) => {
      event.preventDefault();
      if (gameState === 'title') startGame();
      if (paused && gameState === 'running') resumeGame();
      if (control === 'jump') {
        requestJump();
      } else {
        input[control] = true;
      }
      button.setPointerCapture?.(event.pointerId);
    };
    const released = (event) => {
      event.preventDefault();
      if (control === 'jump') input.jump = false;
      else input[control] = false;
    };
    button.addEventListener('pointerdown', pressed, { passive: false });
    button.addEventListener('pointerup', released, { passive: false });
    button.addEventListener('pointercancel', released, { passive: false });
    button.addEventListener('pointerleave', released, { passive: false });
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (paused && gameState === 'running') resumeGame();
    if (gameState === 'running') {
      requestJump();
      canvas.setPointerCapture?.(event.pointerId);
    }
  });
  canvas.addEventListener('pointerup', () => { input.jump = false; });
  canvas.addEventListener('pointercancel', () => { input.jump = false; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState === 'running') pauseGame();
  });
  window.addEventListener('blur', () => {
    if (gameState === 'running') pauseGame();
  });
  startButton.addEventListener('click', startGame);
  againButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', restartGame);
  musicButton?.addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    try { window.localStorage.setItem('lulu-antler-leap-music', musicEnabled ? 'on' : 'off'); } catch (_) { /* storage is optional */ }
    updateMusicButton();
    if (musicEnabled && gameState === 'running' && !paused) startMusic();
    else stopMusic();
  });

  resetLevel();
  requestAnimationFrame(loop);
})();
