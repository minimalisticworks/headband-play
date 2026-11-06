// Device glue: sensors, sound, haptics, screen. Game logic lives in C#.
window.hb = (() => {
  let ctx, dotnet, armed = false, upright = false, hasOrient = false, wake, fitEl;
  addEventListener('resize', () => fitEl?.isConnected && window.hb.fit(fitEl));

  // (y, z) = "up" direction in device frame, unit length. y: top edge up (portrait), z: screen facing ceiling.
  function tilt(y, z) {
    if (!dotnet) return;
    const up = deg(z); // 0 = vertical (on forehead), 90 = facing ceiling
    if (Math.abs(up) <= 30) armed = true;
    else if (armed && up >= 80) { armed = false; dotnet.invokeMethodAsync('Skip'); }
    // Phone held upright (portrait), works even when screen is locked to landscape.
    const now = Math.abs(y) > 0.7 ? true : Math.abs(y) < 0.4 ? false : upright;
    if (now !== upright) { upright = now; dotnet.invokeMethodAsync('Upright', now); }
  }
  const deg = x => Math.asin(Math.max(-1, Math.min(1, x))) * 180 / Math.PI;
  // Gyro-based orientation (most phones, iOS).
  function onOrient(e) {
    if (e.beta == null) return;
    hasOrient = true;
    const r = Math.PI / 180;
    tilt(Math.sin(e.beta * r), Math.cos(e.beta * r) * Math.cos(e.gamma * r));
  }
  // Fallback: accelerometer gravity (phones without gyroscope report null orientation).
  function onMotion(e) {
    const g = e.accelerationIncludingGravity;
    if (hasOrient || g?.z == null) return;
    const n = Math.hypot(g.x, g.y, g.z);
    if (n > 5) tilt(g.y / n, g.z / n);
  }

  function tone(freq, start, dur, type = 'sine', vol = 0.4, endFreq) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + start;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + dur);
  }

  const sounds = {
    beep: () => tone(880, 0, 0.15, 'square', 0.2),
    go: () => tone(1320, 0, 0.4, 'square', 0.2),
    ding: () => { tone(1320, 0, 0.5); tone(1980, 0.08, 0.6, 'sine', 0.3); },
    bloop: () => tone(320, 0, 0.35, 'triangle', 0.5, 120),
    ring: () => { for (let i = 0; i < 6; i++) { tone(880, i * 0.25, 0.3, 'square', 0.25); tone(1175, i * 0.25 + 0.12, 0.3, 'square', 0.25); } },
  };
  const buzz = { ding: 60, bloop: [60, 60, 60], ring: 800 };

  return {
    // Must run inside the tap handler (iOS permission, audio unlock, fullscreen).
    start(ref) {
      dotnet = ref;
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume();
      if (window.DeviceOrientationEvent?.requestPermission) DeviceOrientationEvent.requestPermission().catch(() => {});
      if (window.DeviceMotionEvent?.requestPermission) DeviceMotionEvent.requestPermission().catch(() => {});
      removeEventListener('deviceorientation', onOrient);
      removeEventListener('devicemotion', onMotion);
      addEventListener('deviceorientation', onOrient);
      addEventListener('devicemotion', onMotion);
      armed = false; upright = false;
      document.documentElement.requestFullscreen?.()
        .then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
      navigator.wakeLock?.request('screen').then(w => wake = w).catch(() => {});
    },
    stop() {
      removeEventListener('deviceorientation', onOrient);
      removeEventListener('devicemotion', onMotion);
      wake?.release(); wake = null;
    },
    play(name) {
      sounds[name]?.();
      if (buzz[name]) navigator.vibrate?.(buzz[name]);
    },
    // Largest font size that fits the word in its box.
    fit(el) {
      if (!el) return;
      fitEl = el;
      el.style.fontSize = '100px';
      const box = el.parentElement, k = Math.min(box.clientWidth * 0.92 / el.scrollWidth, box.clientHeight * 0.8 / el.scrollHeight);
      el.style.fontSize = Math.floor(100 * k) + 'px';
    },
  };
})();
