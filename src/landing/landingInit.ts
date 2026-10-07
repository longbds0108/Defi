/* Landing animations — ported verbatim from the original Hedgora index.html inline script. */
// @ts-nocheck
/* eslint-disable */
export function initLanding() {
  (function () {
    'use strict';
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Hero / market entrance ---------- */
    document.querySelectorAll('.hg-hero .js-rise').forEach(function (el) {
      requestAnimationFrame(function () { el.classList.add('in'); });
    });
    if ('IntersectionObserver' in window) {
      var riseIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); riseIO.unobserve(e.target); } });
      }, { threshold: 0.2 });
      document.querySelectorAll('.hg-market-card.js-rise').forEach(function (el) { riseIO.observe(el); });
    } else {
      document.querySelectorAll('.js-rise').forEach(function (el) { el.classList.add('in'); });
    }

    /* Scroll-reveal for content sections — IntersectionObserver (all browsers incl. Safari/iOS) */
    (function () {
      if (reduce || !('IntersectionObserver' in window)) return;
      var sel = '#markets-section .hg-markets__rail h2, #markets-section .hg-markets__rail p, '
              + '#protocol-section .hg-proto__head, #protocol-section .hg-proto__card, #protocol-section .hg-proto__infra, '
              + '#faq-section .hg-steps__head, #faq-section .hg-steps__card, '
              + '.hg-sec__left, .hg-sec__card';
      var els = document.querySelectorAll(sel);
      if (!els.length) return;
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      els.forEach(function (el) { el.classList.add('sr'); io.observe(el); });
    })();

    /* ---------- Text scramble (ports TextScramble.tsx) ---------- */
    var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$€#+*';
    function mountScramble(host) {
      var text = host.textContent;
      var hover = host.hasAttribute('data-hover');
      host.classList.add('text-scramble');
      host.setAttribute('aria-label', text);
      host.textContent = '';
      var measure = document.createElement('span');
      measure.className = 'text-scramble__measure';
      measure.setAttribute('aria-hidden', 'true');
      measure.textContent = text;
      var visual = document.createElement('span');
      visual.className = 'text-scramble__visual';
      visual.setAttribute('aria-hidden', 'true');
      host.appendChild(measure);
      host.appendChild(visual);

      var chars = Array.from(text);
      function render(display, resolved) {
        visual.textContent = '';
        for (var i = 0; i < display.length; i++) {
          var s = document.createElement('span');
          if (i >= resolved && display[i] !== ' ') s.className = 'text-scramble__unresolved';
          s.textContent = display[i];
          visual.appendChild(s);
        }
      }
      render(text, chars.length);

      if (reduce) return;

      var raf = 0;
      function run() {
        cancelAnimationFrame(raf);
        var duration = Math.max(520, Math.min(820, chars.length * 18));
        var start = performance.now();
        function update(now) {
          var progress = Math.min(1, (now - start) / duration);
          var settled = Math.floor(progress * chars.length);
          var display = chars.map(function (c, i) {
            if (c === ' ' || i < settled) return c;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }).join('');
          render(display, settled);
          if (progress < 1) { raf = requestAnimationFrame(update); return; }
          render(text, chars.length);
        }
        raf = requestAnimationFrame(update);
      }

      if (hover) {
        var article = host.closest('article') || host;
        article.addEventListener('pointerenter', run);
      }
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          if (es[0].isIntersecting) { io.disconnect(); run(); }
        }, { threshold: 0.35 });
        io.observe(host);
      } else { run(); }
    }
    document.querySelectorAll('[data-scramble]').forEach(mountScramble);

    /* ---------- FAQ accordion ---------- */
    document.querySelectorAll('.hg-faq__item').forEach(function (item) {
      var btn = item.querySelector('button');
      var sign = btn.querySelector('span[aria-hidden]');
      btn.addEventListener('click', function () {
        var open = !item.classList.contains('is-open');
        document.querySelectorAll('.hg-faq__item').forEach(function (other) {
          other.classList.remove('is-open');
          var b = other.querySelector('button'); b.setAttribute('aria-expanded', 'false');
          var s = b.querySelector('span[aria-hidden]'); if (s) s.textContent = '+';
        });
        if (open) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); if (sign) sign.textContent = '−'; }
      });
    });

    /* ---------- Landing nav: active pill + section tracking ---------- */
    var nav = document.getElementById('landingNav');
    var pill = document.getElementById('navPill');
    var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a[data-sec]'));
    var NAV_INDEX = { 'markets-section': 0, 'protocol-section': 1, 'faq-section': 2 };
    var pending = null;

    function setActive(item) {
      navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-sec') === item); });
      if (item == null) { pill.classList.add('is-hidden'); }
      else { pill.classList.remove('is-hidden'); nav.style.setProperty('--landing-nav-index', NAV_INDEX[item]); }
    }
    function updateActiveSection() {
      if (pending) return;
      var line = window.innerHeight * 0.42, next = null;
      ['markets-section', 'protocol-section', 'faq-section'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) next = id;
      });
      setActive(next);
    }
    navLinks.forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var id = a.getAttribute('data-sec');
        pending = id; setActive(id);
        var el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        window.setTimeout(function () { pending = null; updateActiveSection(); }, 700);
      });
    });

    /* ---------- Header theme flip + exit progress (ports LandingPage.tsx) ---------- */
    var header = document.getElementById('landingHeader');
    var themed = Array.prototype.slice.call(document.querySelectorAll('[data-header-theme]'));
    function updateTheme() {
      var sampleLine = 112;
      var visible = themed.filter(function (s) {
        var r = s.getBoundingClientRect(); return r.top <= sampleLine && r.bottom > sampleLine;
      });
      var active = visible[visible.length - 1] || themed[0];
      var footer = document.getElementById('footer-section');
      var boundary = footer ? footer.getBoundingClientRect().top : Infinity;
      var exit = Math.max(0, Math.min(1, (sampleLine - boundary) / sampleLine));
      header.style.setProperty('--landing-header-offset', (exit * -112) + 'px');
      header.style.setProperty('--landing-header-opacity', String(1 - exit));
      header.style.pointerEvents = exit >= 0.98 ? 'none' : '';
      var isLight = active && (active.id === 'footer-section' || active.getAttribute('data-header-theme') === 'light');
      header.classList.toggle('landing-header--light', !!isLight);
      header.classList.toggle('landing-header--dark', !isLight);
    }
    var ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { ticking = false; updateTheme(); updateActiveSection(); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateTheme(); updateActiveSection();

    document.getElementById('brandHome').addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });

    /* ---------- Route curtain on launch (ports App.tsx launchApp) ---------- */
    var curtain = document.getElementById('routeCurtain');
    var curtainBusy = false;
    function launch() {
      if (curtainBusy) return; curtainBusy = true;
      curtain.classList.add('route-curtain--active');
      window.setTimeout(function () { curtain.classList.remove('route-curtain--active'); curtainBusy = false; }, reduce ? 500 : 1350);
    }
    document.querySelectorAll('.js-launch').forEach(function (b) { b.addEventListener('click', function (e) { if (e.cancelable) e.preventDefault(); launch(); }); });

    /* =========================================================
       AsciiCoinField — ported verbatim from AsciiCoinField.tsx
       ========================================================= */
    (function () {
      var canvas = document.getElementById('coinCanvas');
      if (!canvas) return;
      var context = canvas.getContext('2d');
      if (!context) return;

      var CHARACTERS = 'HEDGORA01$€◆+*:';
      function hash(x, y) { var v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); }

      var reducedMotion = reduce;
      var pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
      var width = 0, height = 0, cellSize = 11, cells = [];
      var animationFrame = 0, startTime = performance.now(), previousFrameTime = startTime;
      var isVisible = true, needsRedraw = true;

      function buildCells() {
        cellSize = width < 620 ? 9 : 11;
        var columns = Math.ceil(width / cellSize);
        var rows = Math.ceil(height / cellSize);
        var minSide = Math.min(width, height);
        var originX = width * 0.2, originY = height * 0.65;
        var maxDistance = Math.hypot(width, height);
        var next = [];
        for (var row = 0; row < rows; row += 1) {
          for (var column = 0; column < columns; column += 1) {
            var baseX = column * cellSize + cellSize / 2;
            var baseY = row * cellSize + cellSize / 2;
            var nx = (baseX - width * 0.5) / minSide;
            var ny = (baseY - height * 0.5) / minSide;
            var orbitX = (nx + 0.02) / 0.51;
            var orbitY = (ny - 0.01) / 0.22;
            var orbitDistance = Math.sqrt(orbitX * orbitX + orbitY * orbitY);
            var characterIndex = Math.floor(hash(column + 17, row + 31) * CHARACTERS.length);
            next.push({
              baseX: baseX, baseY: baseY, nx: nx, ny: ny,
              noise: hash(column, row),
              character: CHARACTERS[characterIndex],
              revealDistance: Math.hypot(baseX - originX, baseY - originY) / maxDistance,
              onOrbit: Math.abs(orbitDistance - 1) < 0.018
            });
          }
        }
        cells = next;
      }

      function resize() {
        var rect = canvas.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = rect.width; height = rect.height;
        canvas.width = Math.max(1, Math.floor(width * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildCells(); startTime = performance.now(); previousFrameTime = startTime; needsRedraw = true;
      }

      canvas.addEventListener('pointermove', function (event) {
        var rect = canvas.getBoundingClientRect();
        pointer.targetX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
        pointer.targetY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
        needsRedraw = true;
      });
      canvas.addEventListener('pointerleave', function () { pointer.targetX = 0; pointer.targetY = 0; needsRedraw = true; });

      function draw(now) {
        animationFrame = requestAnimationFrame(draw);
        if (!isVisible) { previousFrameTime = now; return; }
        var elapsed = (now - startTime) / 1000;
        var reveal = reducedMotion ? 1 : Math.min(1, elapsed / 1.45);
        var frameScale = Math.min(3, Math.max(0.25, (now - previousFrameTime) / 16.667));
        var smoothing = 1 - Math.pow(0.9, frameScale);
        previousFrameTime = now;
        pointer.x += (pointer.targetX - pointer.x) * smoothing;
        pointer.y += (pointer.targetY - pointer.y) * smoothing;
        var pointerIsMoving = Math.abs(pointer.targetX - pointer.x) > 0.0005 || Math.abs(pointer.targetY - pointer.y) > 0.0005;
        if (reducedMotion && !needsRedraw && !pointerIsMoving && reveal >= 1) return;
        needsRedraw = false;

        context.clearRect(0, 0, width, height);
        context.font = Math.max(8, cellSize - 1) + 'px "JetBrains Mono", monospace';
        context.textAlign = 'center'; context.textBaseline = 'middle';

        // Single centered circle (equal radii = perfectly round), with a
        // horizontal cream -> blue tint so it keeps the two-tone look.
        var CREAM = [232, 227, 213], COIN_BLUE = [63, 145, 255];
        var coin = { cx: 0, cy: 0, r: 0.45 };
        // Travelling shine band (sweeps left -> right in localX space) for a shimmer
        var sheenC = reducedMotion ? 999 : ((now * 0.0003) % 1) * 2.6 - 1.3;

        for (var i = 0; i < cells.length; i++) {
          var cell = cells[i];
          var localX = (cell.nx - coin.cx) / coin.r;
          var localY = (cell.ny - coin.cy) / coin.r;
          var radius = Math.sqrt(localX * localX + localY * localY);
          var inside = radius <= 1;
          var bestDepth = inside ? Math.sqrt(1 - radius * radius) : -1;
          if (!inside && !cell.onOrbit) continue;
          var revealAlpha = Math.max(0, Math.min(1, (reveal * 1.45 - cell.revealDistance) * 4));
          if (revealAlpha <= 0) continue;
          if (inside && cell.noise > 0.79 + bestDepth * 0.18) continue;
          if (cell.onOrbit && cell.noise > 0.62) continue;
          var depth = inside ? bestDepth : 0.15;
          var parallaxX = pointer.x * depth * 18;
          var parallaxY = pointer.y * depth * 13;
          var character = cell.onOrbit && !inside ? '·' : cell.character;
          var alpha = revealAlpha * (cell.onOrbit && !inside ? 0.38 : 0.28 + depth * 0.72);
          if (inside) {
            var t = Math.max(0, Math.min(1, (localX + 1) / 2));
            var rr = Math.round(CREAM[0] + (COIN_BLUE[0] - CREAM[0]) * t);
            var gg = Math.round(CREAM[1] + (COIN_BLUE[1] - CREAM[1]) * t);
            var bb = Math.round(CREAM[2] + (COIN_BLUE[2] - CREAM[2]) * t);
            var sheenA = 0;
            if (!reducedMotion) {
              var sd = Math.abs(localX - sheenC);
              var sh = Math.max(0, 1 - sd / 0.42); sh = sh * sh * (3 - 2 * sh);
              rr = Math.round(rr + (255 - rr) * sh);
              gg = Math.round(gg + (255 - gg) * sh);
              bb = Math.round(bb + (255 - bb) * sh);
              sheenA = sh * 0.9;
            }
            var edgeGlow = radius > 0.88 ? 1.18 : 1;
            context.fillStyle = 'rgba(' + rr + ', ' + gg + ', ' + bb + ', ' + Math.min(1, alpha * edgeGlow + sheenA) + ')';
          } else {
            context.fillStyle = 'rgba(232, 227, 213, ' + alpha + ')';
          }
          context.fillText(character, cell.baseX + parallaxX, cell.baseY + parallaxY);
        }
      }

      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(canvas);
      else window.addEventListener('resize', resize);
      new IntersectionObserver(function (es) { isVisible = es[0].isIntersecting; if (isVisible) needsRedraw = true; }, { rootMargin: '100px' }).observe(canvas);
      resize();
      animationFrame = requestAnimationFrame(draw);
    })();

    /* =========================================================
       FooterAsciiField — ported from FooterAsciiField.tsx
       ========================================================= */
    (function () {
      var canvas = document.getElementById('footerCanvas');
      if (!canvas) return;
      var context = canvas.getContext('2d');
      if (!context) return;

      var FOOTER_GLYPHS = 'HEDGORA01$€◆+*:';
      var PURPLE = [232, 227, 213], BLUE = [63, 145, 255];
      function hash(x, y) { var v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); }
      function clamp(v, mn, mx) { mn = mn == null ? 0 : mn; mx = mx == null ? 1 : mx; return Math.max(mn, Math.min(mx, v)); }
      function lerp(a, b, t) { return a + (b - a) * t; }
      function cubicPoint(p, s, a, b, e) {
        var inv = 1 - p;
        return { x: inv * inv * inv * s.x + 3 * inv * inv * p * a.x + 3 * inv * p * p * b.x + p * p * p * e.x,
                 y: inv * inv * inv * s.y + 3 * inv * inv * p * a.y + 3 * inv * p * p * b.y + p * p * p * e.y };
      }
      function cubicTangent(p, s, a, b, e) {
        var inv = 1 - p;
        return { x: 3 * inv * inv * (a.x - s.x) + 6 * inv * p * (b.x - a.x) + 3 * p * p * (e.x - b.x),
                 y: 3 * inv * inv * (a.y - s.y) + 6 * inv * p * (b.y - a.y) + 3 * p * p * (e.y - b.y) };
      }

      var reducedMotion = reduce;
      var pointer = { x: 0, y: 0, targetX: 0, targetY: 0, glow: 0, targetGlow: 0 };
      var width = 0, height = 0, cellSize = 10, cells = [];
      var animationFrame = 0, previousFrameTime = performance.now();
      var revealStartedAt = 0, hasRevealed = false, isVisible = false, needsRedraw = true;
      var sweepStartedAt = 0, isSweeping = false;
      var sweepDuration = reducedMotion ? 700 : 1600;

      function buildCells() {
        if (width <= 0 || height <= 0) return;
        cellSize = width < 680 ? 8 : 10;
        var map = {};
        var streams = [
          { start: { x: -width * 0.04, y: height * 0.5 }, controlA: { x: width * 0.12, y: height * 0.88 }, controlB: { x: width * 0.34, y: height * 0.88 }, end: { x: width * 0.5, y: height * 0.5 }, side: 0 },
          { start: { x: width * 1.04, y: height * 0.5 }, controlA: { x: width * 0.88, y: height * 0.12 }, controlB: { x: width * 0.66, y: height * 0.12 }, end: { x: width * 0.5, y: height * 0.5 }, side: 1 }
        ];
        var laneCount = width < 680 ? 5 : 7;
        var laneMiddle = (laneCount - 1) / 2;
        var sampleCount = Math.max(100, Math.round(width * 0.13));
        streams.forEach(function (stream) {
          for (var lane = 0; lane < laneCount; lane += 1) {
            var laneDistance = lane - laneMiddle;
            var laneFade = 1 - Math.abs(laneDistance) / (laneMiddle + 1.5);
            for (var sample = 0; sample <= sampleCount; sample += 1) {
              if (stream.side === 1 && sample === sampleCount) continue;
              var progress = sample / sampleCount;
              var point = cubicPoint(progress, stream.start, stream.controlA, stream.controlB, stream.end);
              var tangent = cubicTangent(progress, stream.start, stream.controlA, stream.controlB, stream.end);
              var tangentLength = Math.max(1, Math.hypot(tangent.x, tangent.y));
              var normalX = -tangent.y / tangentLength, normalY = tangent.x / tangentLength;
              var breathingRoom = Math.sin(progress * Math.PI);
              var laneOffset = laneDistance * cellSize * (1.1 + breathingRoom * 0.75);
              var x = point.x + normalX * laneOffset;
              var y = point.y + normalY * laneOffset;
              if (x < -cellSize || x > width + cellSize || y < 0 || y > height) continue;
              var column = Math.round(x / cellSize), rowI = Math.round(y / cellSize);
              var key = stream.side + ':' + column + ':' + rowI;
              var noise = hash(column + stream.side * 101, rowI + lane * 17);
              if (noise > 0.9) continue;
              var characterIndex = Math.floor(hash(column + 41, rowI + 73 + stream.side * 31) * FOOTER_GLYPHS.length);
              var edgeFade = clamp(Math.sin(progress * Math.PI) * 1.35 + 0.18);
              var baseAlpha = (0.24 + noise * 0.58) * laneFade * edgeFade;
              var existing = map[key];
              if (!existing || baseAlpha > existing.baseAlpha) {
                map[key] = {
                  x: column * cellSize, y: rowI * cellSize,
                  character: sample % Math.max(12, Math.round(sampleCount / 9)) === 0 ? '◆' : FOOTER_GLYPHS[characterIndex],
                  baseAlpha: baseAlpha,
                  revealThreshold: progress * 0.9 + Math.abs(laneDistance) * 0.018
                };
              }
            }
          }
        });
        cells = Object.keys(map).map(function (k) { return map[k]; });
        needsRedraw = true;
      }

      function resize() {
        var rect = canvas.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = rect.width; height = rect.height;
        canvas.width = Math.max(1, Math.floor(width * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildCells(); needsRedraw = true;
      }

      function onPointerMove(event) {
        if (!isVisible) return;
        var rect = canvas.getBoundingClientRect();
        var inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        if (!inside) { pointer.targetGlow = 0; needsRedraw = true; return; }
        pointer.targetX = event.clientX - rect.left; pointer.targetY = event.clientY - rect.top;
        if (pointer.glow < 0.01) { pointer.x = pointer.targetX; pointer.y = pointer.targetY; }
        pointer.targetGlow = 1; needsRedraw = true;
      }
      function startColorSweep() { if (isSweeping) return; sweepStartedAt = performance.now(); isSweeping = true; needsRedraw = true; }

      function draw(now) {
        animationFrame = requestAnimationFrame(draw);
        if (!isVisible || !hasRevealed) { previousFrameTime = now; return; }
        var frameScale = Math.min(3, Math.max(0.25, (now - previousFrameTime) / 16.667));
        var smoothing = 1 - Math.pow(0.86, frameScale);
        previousFrameTime = now;
        pointer.x += (pointer.targetX - pointer.x) * smoothing;
        pointer.y += (pointer.targetY - pointer.y) * smoothing;
        pointer.glow += (pointer.targetGlow - pointer.glow) * smoothing;
        var revealProgress = reducedMotion ? 1 : clamp((now - revealStartedAt) / 1700);
        var pointerMoving = Math.abs(pointer.targetX - pointer.x) > 0.15 || Math.abs(pointer.targetY - pointer.y) > 0.15 || Math.abs(pointer.targetGlow - pointer.glow) > 0.005;
        var sweepProgress = 1;
        if (isSweeping) { sweepProgress = clamp((now - sweepStartedAt) / sweepDuration); if (sweepProgress >= 1) isSweeping = false; }
        if (reducedMotion && !needsRedraw && revealProgress >= 1 && !pointerMoving && !isSweeping) return;
        needsRedraw = false;

        context.clearRect(0, 0, width, height);
        context.font = Math.max(8, cellSize - 1) + 'px "JetBrains Mono", monospace';
        context.textAlign = 'center'; context.textBaseline = 'middle';
        var spotlightRadius = width < 680 ? 48 : 72;
        var autoCenter = -999;
        if (!reducedMotion) { autoCenter = 0.5 + 0.78 * Math.sin(now * 0.0031416); } // 2s period, smooth ping-pong

        for (var i = 0; i < cells.length; i++) {
          var cell = cells[i];
          var revealAlpha = clamp((revealProgress * 1.38 - cell.revealThreshold) * 4.2);
          if (revealAlpha <= 0) continue;
          var distanceToPointer = Math.hypot(cell.x - pointer.x, cell.y - pointer.y);
          var spotlight = Math.pow(clamp(1 - distanceToPointer / spotlightRadius), 4) * pointer.glow;
          var horizontalProgress = clamp(cell.x / Math.max(1, width));
          var autoPulse = 0;
          if (!reducedMotion) {
            var autoDist = Math.abs(horizontalProgress - autoCenter);
            var autoRaw = clamp(1 - autoDist / 0.4);
            autoPulse = autoRaw * autoRaw * (3 - 2 * autoRaw) * 0.5;
          }
          var colorPulse = autoPulse;
          if (isSweeping) {
            var sweepCenter = lerp(-0.24, 1.24, sweepProgress);
            var pulseDistance = Math.abs(horizontalProgress - sweepCenter);
            var pulse = clamp(1 - pulseDistance / 0.26);
            colorPulse = Math.max(colorPulse, pulse * pulse * (3 - 2 * pulse));
          }
          var colorProgress = lerp(horizontalProgress, 1 - horizontalProgress, colorPulse);
          var visibleSpotlight = spotlight * (isSweeping ? 0.12 : 1) + autoPulse * 0.25;
          var red = Math.round(lerp(PURPLE[0], BLUE[0], colorProgress));
          var green = Math.round(lerp(PURPLE[1], BLUE[1], colorProgress));
          var blue = Math.round(lerp(PURPLE[2], BLUE[2], colorProgress));
          var litRed = Math.round(red + (245 - red) * visibleSpotlight);
          var litGreen = Math.round(green + (243 - green) * visibleSpotlight);
          var litBlue = Math.round(blue + (247 - blue) * visibleSpotlight);
          var alpha = clamp((cell.baseAlpha + visibleSpotlight * 0.42 + colorPulse * 0.18) * revealAlpha);
          context.fillStyle = 'rgba(' + litRed + ', ' + litGreen + ', ' + litBlue + ', ' + alpha + ')';
          context.fillText(cell.character, cell.x, cell.y);
        }
      }

      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(canvas);
      else window.addEventListener('resize', resize);
      var revealTarget = canvas.closest('.hg-footer-reveal') || canvas;
      new IntersectionObserver(function (es) {
        isVisible = es[0].isIntersecting;
        if (isVisible && !hasRevealed) { hasRevealed = true; revealStartedAt = performance.now(); }
        if (isVisible) needsRedraw = true;
      }, { threshold: 0.08 }).observe(revealTarget);

      var interactionTarget = canvas.closest('.hg-footer') || canvas.parentElement;
      var keyboardTarget = canvas.parentElement;
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', function () { pointer.targetGlow = 0; needsRedraw = true; });
      if (interactionTarget) interactionTarget.addEventListener('click', function (ev) {
        if (ev.target && ev.target.closest && ev.target.closest('a, button')) return;
        startColorSweep();
      });
      if (keyboardTarget) keyboardTarget.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Enter' && ev.key !== ' ') return; ev.preventDefault(); startColorSweep();
      });
      resize();
      animationFrame = requestAnimationFrame(draw);
    })();
  })();

}
