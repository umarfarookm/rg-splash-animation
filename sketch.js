// Robogebra Splash Screen Animation
// Fixed 720x1600 mobile splash screen

let phase = 0;
let phaseStart = 0;
let sc, ox, oy;
let shapes = [];
let particles = [];
let burstParticles = [];
let audioCtx;
let audioReady = false;
let waitingForTap = true;

// Brand colors for particles
const BRAND_COLORS = [
  [0, 172, 255],
  [255, 2, 95],
  [252, 192, 0],
  [109, 2, 218]
];

// Canvas size (mobile splash)
const CW = 720;
const CH = 1600;

// Phase durations (ms)
const T_STATIC  = 2000;
const T_EXPLODE = 1200;
const T_FLOAT   = 700;
const T_GATHER  = 1200;
const T_FINAL   = 2000;

function setup() {
  createCanvas(CW, CH);
  textFont('Poppins');
  updateLayout();
  defineShapes();
  initParticles();
}

// --- Audio ---
function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioReady = true;
}

function playExplodeSound() {
  if (!audioReady) return;
  let now = audioCtx.currentTime;

  // Noise burst for whoosh
  let bufSize = audioCtx.sampleRate * 0.5;
  let buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  let data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.08));
  }
  let noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  let nGain = audioCtx.createGain();
  let nFilter = audioCtx.createBiquadFilter();
  nFilter.type = 'lowpass';
  nFilter.frequency.setValueAtTime(3000, now);
  nFilter.frequency.exponentialRampToValueAtTime(200, now + 0.4);
  noise.connect(nFilter);
  nFilter.connect(nGain);
  nGain.connect(audioCtx.destination);
  nGain.gain.setValueAtTime(0.18, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  noise.start(now);
  noise.stop(now + 0.45);

  // Descending impact tone
  let osc = audioCtx.createOscillator();
  osc.type = 'sine';
  let oGain = audioCtx.createGain();
  osc.connect(oGain);
  oGain.connect(audioCtx.destination);
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
  oGain.gain.setValueAtTime(0.2, now);
  oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.start(now);
  osc.stop(now + 0.4);

  // Sub hit
  let sub = audioCtx.createOscillator();
  sub.type = 'sine';
  let sGain = audioCtx.createGain();
  sub.connect(sGain);
  sGain.connect(audioCtx.destination);
  sub.frequency.setValueAtTime(80, now);
  sub.frequency.exponentialRampToValueAtTime(40, now + 0.3);
  sGain.gain.setValueAtTime(0.25, now);
  sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  sub.start(now);
  sub.stop(now + 0.35);
}

function playGatherSound() {
  if (!audioReady) return;
  let now = audioCtx.currentTime;

  // Ascending shimmer chord
  let freqs = [250, 375, 500, 625];
  freqs.forEach(function(freq, i) {
    let osc = audioCtx.createOscillator();
    osc.type = 'sine';
    let gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    let d = i * 0.07;
    osc.frequency.setValueAtTime(freq * 0.4, now + d);
    osc.frequency.exponentialRampToValueAtTime(freq, now + d + 0.5);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + d + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + d + 0.7);

    osc.start(now + d);
    osc.stop(now + d + 0.7);
  });

  // Soft rising noise shimmer
  let bufSize = audioCtx.sampleRate * 0.6;
  let buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  let data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    let env = Math.sin((i / bufSize) * Math.PI);
    data[i] = (Math.random() * 2 - 1) * env * 0.3;
  }
  let noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  let nFilter = audioCtx.createBiquadFilter();
  nFilter.type = 'highpass';
  nFilter.frequency.setValueAtTime(2000, now);
  nFilter.frequency.exponentialRampToValueAtTime(6000, now + 0.5);
  let nGain = audioCtx.createGain();
  noise.connect(nFilter);
  nFilter.connect(nGain);
  nGain.connect(audioCtx.destination);
  nGain.gain.setValueAtTime(0.06, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  noise.start(now);
  noise.stop(now + 0.6);
}

// --- Tap to start (required for audio) ---
function drawTapScreen() {
  background(255);
  updateAndDrawParticles(millis());

  push();
  translate(ox, oy);
  scale(sc);
  noStroke();
  for (let s of shapes) {
    fill(s.color[0], s.color[1], s.color[2]);
    s.draw();
  }
  pop();

  // Tap prompt
  push();
  textFont('Poppins');
  textAlign(CENTER, CENTER);
  textSize(3 * sc);
  textStyle(BOLD);
  noStroke();
  let pulse = 120 + sin(millis() / 500) * 80;
  fill(49, 49, 49, pulse);
  text('Tap to start', ox, oy + 24 * sc);
  pop();
}

function touchStarted() {
  if (waitingForTap) {
    waitingForTap = false;
    initAudio();
    phaseStart = millis();
    return false;
  }
}

function mousePressed() {
  if (waitingForTap) {
    waitingForTap = false;
    initAudio();
    phaseStart = millis();
  }
}

// --- Floating background particles ---
function initParticles() {
  for (let i = 0; i < 30; i++) {
    particles.push(createParticle(random(CW), random(CH)));
  }
}

function createParticle(x, y) {
  let col = random(BRAND_COLORS);
  return {
    x: x,
    y: y,
    size: random(8, 22),
    color: col,
    alpha: random(50, 100),
    speedX: random(-0.3, 0.3),
    speedY: random(-0.25, -0.05),
    rotation: random(TWO_PI),
    rotSpeed: random(-0.008, 0.008),
    shape: floor(random(3)), // 0=circle, 1=triangle, 2=rect
    drift: random(TWO_PI)    // phase offset for horizontal sway
  };
}

function updateAndDrawParticles(now) {
  noStroke();
  for (let p of particles) {
    // Gentle drift
    p.x += p.speedX + sin(now / 3000 + p.drift) * 0.15;
    p.y += p.speedY;
    p.rotation += p.rotSpeed;

    // Wrap around edges
    if (p.y < -20) { p.y = CH + 20; p.x = random(CW); }
    if (p.x < -20) p.x = CW + 20;
    if (p.x > CW + 20) p.x = -20;

    push();
    translate(p.x, p.y);
    rotate(p.rotation);
    fill(p.color[0], p.color[1], p.color[2], p.alpha);

    if (p.shape === 0) {
      ellipse(0, 0, p.size);
    } else if (p.shape === 1) {
      let s = p.size * 0.6;
      triangle(0, -s, -s * 0.866, s * 0.5, s * 0.866, s * 0.5);
    } else {
      rectMode(CENTER);
      rect(0, 0, p.size * 0.8, p.size * 0.8);
    }
    pop();
  }
}

// --- Burst particles (during explode/gather) ---
function spawnBurst() {
  for (let i = 0; i < 40; i++) {
    let angle = random(TWO_PI);
    let speed = random(2, 8);
    let col = random(BRAND_COLORS);
    burstParticles.push({
      x: ox,
      y: oy,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      size: random(8, 18),
      color: col,
      alpha: random(180, 255),
      life: 1.0,
      decay: random(0.008, 0.018),
      shape: floor(random(3))
    });
  }
}

function updateAndDrawBurst() {
  noStroke();
  for (let i = burstParticles.length - 1; i >= 0; i--) {
    let bp = burstParticles[i];
    bp.x += bp.vx;
    bp.y += bp.vy;
    bp.vy += 0.03; // slight gravity
    bp.vx *= 0.995;
    bp.life -= bp.decay;

    if (bp.life <= 0) {
      burstParticles.splice(i, 1);
      continue;
    }

    let a = bp.alpha * bp.life;
    let s = bp.size * bp.life;

    push();
    translate(bp.x, bp.y);
    fill(bp.color[0], bp.color[1], bp.color[2], a);

    if (bp.shape === 0) {
      ellipse(0, 0, s);
    } else if (bp.shape === 1) {
      let h = s * 0.6;
      triangle(0, -h, -h * 0.866, h * 0.5, h * 0.866, h * 0.5);
    } else {
      rectMode(CENTER);
      rect(0, 0, s * 0.8, s * 0.8);
    }
    pop();
  }
}

// --- Radial glow behind logo ---
function drawRadialGlow(now, elapsed) {
  let glowAlpha = 0;
  let glowSize = 22 * sc;

  if (phase === 0) {
    glowAlpha = 12;
    glowSize += sin(now / 1200) * 1.5 * sc;
  } else if (phase === 1) {
    glowAlpha = 12 * (1 - constrain(elapsed / 600, 0, 1));
  } else if (phase === 3) {
    glowAlpha = 12 * constrain((elapsed - 400) / 600, 0, 1);
    glowSize += sin(now / 1200) * 1.5 * sc;
  } else if (phase === 4) {
    glowAlpha = 12;
    glowSize += sin(now / 1200) * 1.5 * sc;
  }

  if (glowAlpha > 0) {
    noStroke();
    // Layered radial glow
    for (let i = 5; i >= 1; i--) {
      let r = glowSize * (i / 3);
      let a = glowAlpha * (1 - i / 6);
      fill(252, 192, 0, a);
      ellipse(ox, oy, r * 2);
    }
  }
}

function updateLayout() {
  sc = CW / 65;
  ox = CW / 2;
  oy = CH / 2 - 8 * sc;
}

function defineShapes() {
  shapes = [
    {
      color: [0, 172, 255],
      cx: -5.05, cy: -9.51,
      r: 3.5,
      scatterAngle: -2.3,
      scatterDist: 28,
      floatPhase: random(TWO_PI),
      draw: function() {
        triangle(-9.65, -7.26, -2.76, -7.26, -2.75, -14);
      }
    },
    {
      color: [255, 2, 95],
      cx: -6.21, cy: 3.71,
      r: 5,
      scatterAngle: PI + 0.4,
      scatterDist: 30,
      floatPhase: random(TWO_PI),
      draw: function() {
        rect(-9.65, -6.64, 6.888, 20.706);
      }
    },
    {
      color: [252, 192, 0],
      cx: 4, cy: -6,
      r: 6,
      scatterAngle: -0.4,
      scatterDist: 29,
      floatPhase: random(TWO_PI),
      draw: function() {
        beginShape();
        vertex(0.008, -14);
        bezierVertex(5.315, -14, 9.618, -10.243, 9.618, -5.607);
        bezierVertex(9.618, -1.853, 6.795, 1.326, 2.848, 2.413);
        bezierVertex(2.671, 2.236, -2.023, -2.223, -2.186, -2.387);
        vertex(-2.208, -14);
        endShape(CLOSE);
      }
    },
    {
      color: [109, 2, 218],
      cx: 2.26, cy: 6.84,
      r: 5,
      scatterAngle: 0.5,
      scatterDist: 26,
      floatPhase: random(TWO_PI),
      draw: function() {
        quad(8.77, 8.97, 4.63, 13.26, -2.18, 6.74, -2.18, -1.61);
      }
    },
    {
      color: [109, 2, 218],
      cx: 7.92, cy: 12.28,
      r: 2.5,
      scatterAngle: 0.9,
      scatterDist: 22,
      floatPhase: random(TWO_PI),
      draw: function() {
        triangle(5.14, 13.47, 9.62, 13.92, 9.01, 9.46);
      }
    }
  ];
}

function easeInOutCubic(t) {
  t = constrain(t, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t) {
  t = constrain(t, 0, 1);
  return 1 - pow(1 - t, 3);
}

function easeInCubic(t) {
  t = constrain(t, 0, 1);
  return t * t * t;
}

function draw() {
  if (waitingForTap) {
    drawTapScreen();
    return;
  }

  background(255);

  let now = millis();
  let elapsed = now - phaseStart;

  let prevPhase = phase;
  if (phase === 0 && elapsed > T_STATIC)  { phase = 1; phaseStart = now; elapsed = 0; }
  if (phase === 1 && elapsed > T_EXPLODE) { phase = 2; phaseStart = now; elapsed = 0; }
  if (phase === 2 && elapsed > T_FLOAT)   { phase = 3; phaseStart = now; elapsed = 0; }
  if (phase === 3 && elapsed > T_GATHER)  { phase = 4; phaseStart = now; elapsed = 0; }
  if (phase === 4 && elapsed > T_FINAL)   { phase = 1; phaseStart = now; elapsed = 0; }

  // Trigger burst + sound when explode starts
  if (prevPhase !== 1 && phase === 1) { spawnBurst(); playExplodeSound(); }
  // Trigger sound when gather starts
  if (prevPhase !== 3 && phase === 3) { playGatherSound(); }

  // Background layers
  updateAndDrawParticles(now);
  drawRadialGlow(now, elapsed);
  updateAndDrawBurst();

  push();
  translate(ox, oy);
  scale(sc);

  if (phase === 4) {
    let breathe = 1 + sin(now / 800) * 0.012;
    scale(breathe);
  }

  noStroke();

  for (let i = 0; i < shapes.length; i++) {
    drawLogoShape(i, elapsed, now);
  }

  pop();

  drawBrandText(elapsed, now);
}

function drawLogoShape(i, elapsed, now) {
  let s = shapes[i];
  let delay = i * 100;

  let morphT = 0;
  let offX = 0, offY = 0;
  let rot = 0;

  switch (phase) {
    case 0:
      break;

    case 1: {
      let t = easeInOutCubic(constrain((elapsed - delay) / 800, 0, 1));
      morphT = t;
      offX = cos(s.scatterAngle) * s.scatterDist * t;
      offY = sin(s.scatterAngle) * s.scatterDist * t;
      rot = t * HALF_PI * (i % 2 === 0 ? 1 : -1);
      break;
    }

    case 2: {
      morphT = 1;
      let ft = elapsed / 1000;
      // Smooth ramp in/out so no jump at phase transitions
      let floatIn = constrain(elapsed / 400, 0, 1);
      let floatOut = 1 - constrain((elapsed - T_FLOAT + 400) / 400, 0, 1);
      let floatAmp = floatIn * floatOut;
      offX = cos(s.scatterAngle) * s.scatterDist + sin(ft * 1.3 + s.floatPhase) * 1.8 * floatAmp;
      offY = sin(s.scatterAngle) * s.scatterDist + cos(ft * 0.9 + s.floatPhase) * 1.8 * floatAmp;
      rot = HALF_PI * (i % 2 === 0 ? 1 : -1) + sin(ft * 0.8 + s.floatPhase) * 0.15 * floatAmp;
      break;
    }

    case 3: {
      let t = easeInOutCubic(constrain((elapsed - delay) / 800, 0, 1));
      morphT = 1 - t;
      let startX = cos(s.scatterAngle) * s.scatterDist;
      let startY = sin(s.scatterAngle) * s.scatterDist;
      offX = lerp(startX, 0, t);
      offY = lerp(startY, 0, t);
      let startRot = HALF_PI * (i % 2 === 0 ? 1 : -1);
      rot = lerp(startRot, 0, t);
      break;
    }

    case 4:
      break;
  }

  push();
  translate(offX, offY);
  translate(s.cx, s.cy);
  rotate(rot);

  let popScale = 1 + sin(morphT * PI) * 0.12;
  scale(popScale);
  translate(-s.cx, -s.cy);

  fill(s.color[0], s.color[1], s.color[2]);

  if (morphT < 0.5) {
    s.draw();
  } else {
    ellipse(s.cx, s.cy, s.r * 2);
  }

  pop();
}

function textReveal(word, textY, elapsed, delayMs) {
  let fontSize = 5.5 * sc;
  textSize(fontSize);
  textStyle(NORMAL);
  drawingContext.font = '500 ' + fontSize + 'px Poppins';

  let totalW = textWidth(word);
  let halfW = totalW / 2 + 4;
  let underlineY = textY + fontSize * 0.5;

  // Timeline: line expands → text reveals behind it → line fades
  let lineT = easeOutCubic(constrain((elapsed - delayMs) / 400, 0, 1));
  let revealT = easeOutCubic(constrain((elapsed - delayMs - 150) / 600, 0, 1));
  let lineFadeT = easeInCubic(constrain((elapsed - delayMs - 600) / 500, 0, 1));

  // Expanding underline
  let lineW = lineT * halfW;
  let lineAlpha = lineT * 255 * (1 - lineFadeT);

  if (lineAlpha > 0) {
    stroke(109, 2, 218, lineAlpha);
    strokeWeight(2.2);
    line(ox - lineW, underlineY, ox + lineW, underlineY);
    noStroke();
  }

  // Clip-reveal text from center outward
  if (revealT > 0) {
    let clipW = revealT * halfW;

    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(
      ox - clipW,
      textY - fontSize * 0.7,
      clipW * 2,
      fontSize * 1.6
    );
    drawingContext.clip();

    fill(49, 49, 49);
    noStroke();
    text(word, ox, textY);

    drawingContext.restore();
  }
}

function textConceal(word, textY, elapsed) {
  let fontSize = 5.5 * sc;
  textSize(fontSize);
  textStyle(NORMAL);
  drawingContext.font = '500 ' + fontSize + 'px Poppins';

  let totalW = textWidth(word);
  let halfW = totalW / 2 + 4;

  // Clip shrinks from edges to center
  let t = easeInOutCubic(constrain(elapsed / 500, 0, 1));
  let clipW = (1 - t) * halfW;

  if (clipW > 0.5) {
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(
      ox - clipW,
      textY - fontSize * 0.7,
      clipW * 2,
      fontSize * 1.6
    );
    drawingContext.clip();

    fill(49, 49, 49);
    noStroke();
    text(word, ox, textY);

    drawingContext.restore();
  }
}

function drawBrandText(elapsed, now) {
  let textY = oy + 18 * sc;
  let word = "Robogebra";

  push();
  textFont('Poppins');
  textAlign(CENTER, CENTER);
  noStroke();

  if (phase === 0) {
    textReveal(word, textY, elapsed, 500);

  } else if (phase === 1) {
    textConceal(word, textY, elapsed);

  } else if (phase === 2 || phase === 3) {
    // Hidden

  } else if (phase === 4) {
    textReveal(word, textY, elapsed, 0);
  }

  pop();
}

function windowResized() {
  // Fixed 720x1600, no resize
}
