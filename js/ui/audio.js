// 배경음악·효과음. 녹음 파일 없이 브라우저(Web Audio)에서 악기 소리를 직접 만든다.
// 악기: 고쟁(뜯는 현), 적(피리), 이호(활 현), 큰북·작은북, 징. 음계는 5음계(궁조·우조).
var SG = SG || {};
SG.Audio = (function () {
  var A = {
    ctx: null, master: null, musicBus: null, sfxBus: null, verb: null,
    track: null, timer: null, nextBar: 0, barIndex: 0,
    settings: { music: true, sfx: true, musicVol: 0.7, sfxVol: 0.8 }
  };
  try { var saved = JSON.parse(localStorage.getItem('sanguo_audio') || 'null'); if (saved) Object.assign(A.settings, saved); } catch (e) { /* 저장소를 못 쓰면 기본값 */ }
  A.save = function () { try { localStorage.setItem('sanguo_audio', JSON.stringify(A.settings)); } catch (e) { /* 무시 */ } };

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // 음악 전용 난수 (게임 난수와 따로)
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), s | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- 소리 장치 연결 (ctx는 실시간 또는 오프라인)
  A.build = function (ctx) {
    var g = {};
    g.ctx = ctx;
    g.comp = ctx.createDynamicsCompressor();
    g.comp.threshold.value = -14; g.comp.ratio.value = 3; g.comp.attack.value = 0.01; g.comp.release.value = 0.25;
    g.master = ctx.createGain(); g.master.gain.value = 0.85;
    g.limit = ctx.createDynamicsCompressor();
    g.limit.threshold.value = -2; g.limit.knee.value = 0; g.limit.ratio.value = 20; g.limit.attack.value = 0.002; g.limit.release.value = 0.1;
    g.comp.connect(g.master); g.master.connect(g.limit); g.limit.connect(ctx.destination);
    g.musicBus = ctx.createGain(); g.sfxBus = ctx.createGain();
    g.musicBus.connect(g.comp); g.sfxBus.connect(g.comp);
    // 잔향: 짧게 잦아드는 잡음으로 만든 공간감
    g.verb = ctx.createConvolver();
    var len = Math.floor(ctx.sampleRate * 2.4), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    var r = rng(7);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    g.verb.buffer = ir;
    g.verbIn = ctx.createGain(); g.verbIn.gain.value = 0.32;
    g.verbIn.connect(g.verb); g.verb.connect(g.comp);
    g.pluckCache = {};
    return g;
  };
  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    A.ctx = new AC();
    A.g = A.build(A.ctx);
    A.applyVolumes();
    return true;
  };
  // 노트북 스피커에서도 잘 들리도록 크게 (2026-10-13: 지도 음악이 너무 작다는 의견). 끝에 리미터로 찢어짐 방지
  A.MUSIC_GAIN = 1.9; A.SFX_GAIN = 2.0;
  A.applyVolumes = function () {
    if (!A.g) return;
    A.g.musicBus.gain.value = A.settings.music ? A.settings.musicVol * A.MUSIC_GAIN : 0;
    A.g.sfxBus.gain.value = A.settings.sfx ? A.settings.sfxVol * A.SFX_GAIN : 0;
  };

  // ---- 악기
  function out(g, bus, node, wet) {
    node.connect(bus);
    if (wet) { var s = g.ctx.createGain(); s.gain.value = wet; node.connect(s); s.connect(g.verbIn); }
  }
  // 고쟁: 카플러스-스트롱 방식으로 뜯는 현 소리를 미리 만들어 둔다
  function pluckBuffer(g, midi, bright) {
    var key = midi + (bright ? 'b' : '');
    if (g.pluckCache[key]) return g.pluckCache[key];
    var sr = g.ctx.sampleRate, f = mtof(midi), N = Math.max(2, Math.round(sr / f));
    var len = Math.floor(sr * (midi < 50 ? 3.2 : 2.4)), buf = g.ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    var line = new Float32Array(N), r = rng(midi * 13 + 1), damp = midi > 84 ? 0.985 : 0.996;
    for (var i = 0; i < N; i++) line[i] = r() * 2 - 1;
    // 줄을 뜯는 위치 효과(약간 부드럽게)
    for (var k = 0; k < 2; k++) for (var j = 1; j < N; j++) line[j] = bright ? line[j] : (line[j] + line[j - 1]) * 0.5;
    var p = 0, prev = 0;
    for (var n = 0; n < len; n++) {
      var cur = line[p];
      var nx = line[(p + 1) % N];
      line[p] = damp * 0.5 * (cur + nx);
      d[n] = cur;
      prev = cur;
      p = (p + 1) % N;
    }
    // 앞부분 정규화
    var peak = 0;
    for (var q = 0; q < Math.min(len, 2000); q++) peak = Math.max(peak, Math.abs(d[q]));
    if (peak > 0) for (var w = 0; w < len; w++) d[w] /= peak;
    g.pluckCache[key] = buf;
    return buf;
  }
  A.pluck = function (g, bus, t, midi, vel, opt) {
    opt = opt || {};
    var src = g.ctx.createBufferSource();
    src.buffer = pluckBuffer(g, midi, opt.bright);
    var gain = g.ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.5, t);
    if (opt.dur) gain.gain.setTargetAtTime(0, t + opt.dur, 0.08);
    // 고쟁 특유의 끝음 꺾기(살짝 올라갔다 돌아옴)
    if (opt.bend) { src.playbackRate.setValueAtTime(1, t + 0.12); src.playbackRate.linearRampToValueAtTime(1.059, t + 0.3); src.playbackRate.linearRampToValueAtTime(1, t + 0.6); }
    var lp = g.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = opt.bright ? 7000 : 4200;
    src.connect(lp); lp.connect(gain);
    out(g, bus, gain, 0.35);
    src.start(t);
    src.stop(t + (opt.dur ? opt.dur + 0.6 : 3.2));
  };
  // 적(대나무 피리): 사인파 + 약한 배음 + 숨소리 + 떨림
  A.flute = function (g, bus, t, midi, dur, vel) {
    var c = g.ctx, f = mtof(midi);
    var o1 = c.createOscillator(), o2 = c.createOscillator();
    o1.type = 'sine'; o2.type = 'triangle';
    o1.frequency.value = f; o2.frequency.value = f * 2;
    var vib = c.createOscillator(), vg = c.createGain();
    vib.frequency.value = 5.2; vg.gain.value = 0;
    vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.6, dur * 0.6));
    vib.connect(vg); vg.connect(o1.frequency); vg.connect(o2.frequency);
    var g2 = c.createGain(); g2.gain.value = 0.12;
    var amp = c.createGain();
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(vel * 0.32, t + 0.07);
    amp.gain.setValueAtTime(vel * 0.3, t + Math.max(0.08, dur - 0.08));
    amp.gain.linearRampToValueAtTime(0, t + dur + 0.12);
    // 숨소리
    var nb = noiseBuffer(c), ns = c.createBufferSource(); ns.buffer = nb;
    var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 1.2;
    var ng = c.createGain(); ng.gain.value = 0.05;
    ns.connect(bp); bp.connect(ng); ng.connect(amp);
    o1.connect(amp); o2.connect(g2); g2.connect(amp);
    out(g, bus, amp, 0.5);
    [o1, o2, vib, ns].forEach(function (o) { o.start(t); o.stop(t + dur + 0.2); });
  };
  // 이호: 톱니파를 몸통 공명처럼 걸러서, 활로 긋는 느낌
  A.erhu = function (g, bus, t, midi, dur, vel, slideFrom) {
    var c = g.ctx, f = mtof(midi);
    var o = c.createOscillator(); o.type = 'sawtooth';
    if (slideFrom) { o.frequency.setValueAtTime(mtof(slideFrom), t); o.frequency.exponentialRampToValueAtTime(f, t + 0.09); }
    else o.frequency.setValueAtTime(f, t);
    var vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 6;
    vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.018, t + Math.min(0.5, dur * 0.7));
    vib.connect(vg); vg.connect(o.frequency);
    var b1 = c.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = 1100; b1.Q.value = 0.9;
    var b2 = c.createBiquadFilter(); b2.type = 'peaking'; b2.frequency.value = 2600; b2.gain.value = 5;
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
    var amp = c.createGain();
    amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(vel * 0.2, t + 0.08);
    amp.gain.setValueAtTime(vel * 0.18, t + Math.max(0.1, dur - 0.06)); amp.gain.linearRampToValueAtTime(0, t + dur + 0.08);
    o.connect(b1); b1.connect(b2); b2.connect(lp); lp.connect(amp);
    out(g, bus, amp, 0.4);
    o.start(t); vib.start(t); o.stop(t + dur + 0.15); vib.stop(t + dur + 0.15);
  };
  var _noise = null;
  function noiseBuffer(c) {
    if (_noise && _noise.sampleRate === c.sampleRate && _noise._ctx === c) return _noise;
    var len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0), r = rng(99);
    for (var i = 0; i < len; i++) d[i] = r() * 2 - 1;
    b._ctx = c; _noise = b;
    return b;
  }
  function noise(g, bus, t, dur, type, freq, q, vel, wet, attack) {
    var c = g.ctx, s = c.createBufferSource(); s.buffer = noiseBuffer(c);
    var f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    var a = c.createGain();
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(vel, t + (attack || 0.003));
    a.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(a); out(g, bus, a, wet || 0);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    return f;
  }
  // 큰북 (전고)
  A.bigDrum = function (g, bus, t, vel) {
    var c = g.ctx, o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.35);
    var a = c.createGain(); a.gain.setValueAtTime(vel * 0.9, t); a.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    o.connect(a); out(g, bus, a, 0.25); o.start(t); o.stop(t + 1);
    noise(g, bus, t, 0.12, 'lowpass', 900, 0, vel * 0.35, 0.2);
  };
  A.smallDrum = function (g, bus, t, vel) {
    var c = g.ctx, o = c.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.08);
    var a = c.createGain(); a.gain.setValueAtTime(vel * 0.35, t); a.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(a); out(g, bus, a, 0.15); o.start(t); o.stop(t + 0.2);
    noise(g, bus, t, 0.09, 'bandpass', 2400, 1.2, vel * 0.25, 0.1);
  };
  A.woodblock = function (g, bus, t, vel) {
    var c = g.ctx, o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 1050;
    var a = c.createGain(); a.gain.setValueAtTime(vel * 0.4, t); a.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(a); out(g, bus, a, 0.2); o.start(t); o.stop(t + 0.1);
  };
  // 징: 어긋난 배음 여러 개 + 천천히 잦아듦
  A.gong = function (g, bus, t, vel, base) {
    var c = g.ctx; base = base || 96;
    [1, 1.48, 1.97, 2.43, 2.97, 3.6, 4.2].forEach(function (k, i) {
      var o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(base * k, t);
      o.frequency.linearRampToValueAtTime(base * k * (i === 0 ? 1.015 : 0.995), t + 1.5);
      var a = c.createGain(); var v = vel * 0.22 / (1 + i * 0.5);
      a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.02 + i * 0.03);
      a.gain.exponentialRampToValueAtTime(0.0005, t + 3.5 - i * 0.25);
      o.connect(a); out(g, bus, a, 0.45); o.start(t); o.stop(t + 3.6);
    });
    noise(g, bus, t, 0.6, 'bandpass', 3200, 0.8, vel * 0.08, 0.4);
  };
  A.cymbal = function (g, bus, t, vel) { noise(g, bus, t, 1.1, 'highpass', 5200, 0, vel * 0.16, 0.35); };
  // 뿔나팔
  A.horn = function (g, bus, t, midi, dur, vel) {
    var c = g.ctx, o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(mtof(midi) * 0.94, t); o.frequency.linearRampToValueAtTime(mtof(midi), t + 0.18);
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(1500, t + 0.3);
    var a = c.createGain(); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(vel * 0.22, t + 0.15);
    a.gain.setValueAtTime(vel * 0.2, t + dur - 0.1); a.gain.linearRampToValueAtTime(0, t + dur + 0.2);
    o.connect(lp); lp.connect(a); out(g, bus, a, 0.5); o.start(t); o.stop(t + dur + 0.3);
  };

  // ---- 작곡 (마디 단위로 만들어 미리 예약)
  // 5음계: 궁조(D: D E F# A B), 우조(E 단조 5음: E G A B D)
  var GONG = [0, 2, 4, 7, 9], YU = [0, 3, 5, 7, 10];
  function deg(root, scale, d) { // 음계 도수 → MIDI
    var o = Math.floor(d / 5), i = ((d % 5) + 5) % 5;
    return root + o * 12 + scale[i];
  }
  var RHYTHMS = {
    calm: [[2, 2], [3, 1], [1, 1, 2], [2, 1, 1], [4], [1.5, 0.5, 2]],
    epic: [[1, 1, 1, 1], [1.5, 0.5, 1, 1], [0.5, 0.5, 1, 2], [2, 1, 1], [1, 1, 2], [0.75, 0.25, 1, 2]]
  };
  // 선율 한 마디: 지난 음에서 대체로 한두 칸씩 움직이고, 구절 끝은 으뜸음으로
  function melodyBar(st, r, kind, cadence) {
    var rh = RHYTHMS[kind][Math.floor(r() * RHYTHMS[kind].length)];
    if (cadence) rh = kind === 'calm' ? [2, 2] : [1, 1, 2];
    var notes = [], t = 0;
    rh.forEach(function (d, i) {
      var step = r() < 0.55 ? (r() < 0.5 ? 1 : -1) : (r() < 0.6 ? (r() < 0.5 ? 2 : -2) : 0);
      st.d = Math.max(st.lo, Math.min(st.hi, st.d + step));
      if (cadence && i === rh.length - 1) st.d = st.home;
      notes.push({ t: t, d: d, deg: st.d });
      t += d;
    });
    return notes;
  }

  var TRACKS = {};
  // 타이틀: 느리고 장엄하게 (징·큰북·고쟁 펼침화음·피리)
  TRACKS.title = { bpm: 58, beats: 4, root: 50, scale: GONG, seed: 11,
    bar: function (g, bus, t0, bi, spb, r, st) {
      var roots = [0, 3, 4, 0, 2, 3, 1, 0], R = roots[bi % 8];
      if (bi % 8 === 0) A.gong(g, bus, t0, 0.9, 82);
      A.bigDrum(g, bus, t0, 0.55); if (bi % 2 === 1) A.bigDrum(g, bus, t0 + 2.5 * spb, 0.35);
      A.pluck(g, bus, t0, deg(this.root - 12, this.scale, R), 0.7);
      [0, 2, 4, 5, 7, 5, 4, 2].forEach(function (k, i) {
        A.pluck(g, bus, t0 + i * spb * 0.5, deg(TRACKS.title.root, TRACKS.title.scale, R + k), 0.28 + (i === 0 ? 0.1 : 0));
      });
      if (bi % 8 >= 2) melodyBar(st, r, 'calm', bi % 4 === 3).forEach(function (n) {
        A.flute(g, bus, t0 + n.t * spb, deg(TRACKS.title.root + 12, TRACKS.title.scale, n.deg), n.d * spb * 0.95, 0.75);
      });
    } };
  // 전략 지도: 잔잔하게 (고쟁 반주 + 피리/고쟁 선율 번갈아)
  TRACKS.map = { bpm: 74, beats: 4, root: 50, scale: GONG, seed: 23,
    bar: function (g, bus, t0, bi, spb, r, st) {
      var roots = [0, 0, 3, 4, 2, 3, 1, 0], R = roots[bi % 8], T = TRACKS.map;
      A.pluck(g, bus, t0, deg(T.root - 12, T.scale, R), 0.6);
      var pat = (bi % 16) < 8 ? [0, 4, 7, 4, 5, 4, 7, 9] : [0, 2, 4, 7, 4, 2, 5, 4];
      pat.forEach(function (k, i) { A.pluck(g, bus, t0 + i * spb * 0.5, deg(T.root, T.scale, R + k), i % 2 ? 0.16 : 0.24); });
      if (bi % 4 === 0) A.woodblock(g, bus, t0, 0.18);
      var section = Math.floor(bi / 8) % 4; // 피리 → 고쟁 → 피리 → 쉼
      var cad = bi % 4 === 3;
      if (section === 3) return;
      melodyBar(st, r, 'calm', cad).forEach(function (n) {
        var m = deg(T.root + 12, T.scale, n.deg);
        if (section === 1) A.pluck(g, bus, t0 + n.t * spb, m, 0.62, { bright: true, bend: n.d >= 2 && r() < 0.5 });
        else A.flute(g, bus, t0 + n.t * spb, m, n.d * spb * 0.92, 0.6);
      });
    } };
  // 전투: 빠르고 긴장감 있게 (북 장단 + 이호 선율 + 고쟁 빠른 반주)
  TRACKS.battle = { bpm: 118, beats: 4, root: 52, scale: YU, seed: 37,
    bar: function (g, bus, t0, bi, spb, r, st) {
      var T = TRACKS.battle, roots = [0, 0, 3, 4, 0, 2, 3, 4], R = roots[bi % 8];
      A.bigDrum(g, bus, t0, 0.8); A.bigDrum(g, bus, t0 + 1.5 * spb, 0.45); A.bigDrum(g, bus, t0 + 2 * spb, 0.7);
      if (bi % 2 === 1) A.bigDrum(g, bus, t0 + 3.5 * spb, 0.5);
      for (var i = 0; i < 8; i++) A.smallDrum(g, bus, t0 + i * spb * 0.5, i % 2 ? 0.25 : 0.4);
      if (bi % 8 === 0) A.cymbal(g, bus, t0, 0.8);
      if (bi % 16 === 0) A.gong(g, bus, t0, 0.6, 70);
      for (var j = 0; j < 8; j++) A.pluck(g, bus, t0 + j * spb * 0.5, deg(T.root - 12, T.scale, R + (j % 2 ? 2 : 0)), 0.22, { dur: spb * 0.45 });
      if ((bi % 16) < 2) return; // 북만 울리는 도입
      var prev = null;
      melodyBar(st, r, 'epic', bi % 4 === 3).forEach(function (n) {
        var m = deg(T.root + 12, T.scale, n.deg);
        A.erhu(g, bus, t0 + n.t * spb, m, n.d * spb * 0.93, 0.9, prev && Math.abs(prev - m) <= 3 && r() < 0.3 ? prev : null);
        prev = m;
      });
      if (bi % 8 === 6) A.horn(g, bus, t0, deg(T.root, T.scale, 0), spb * 2.5, 0.7);
    } };

  // 곡 예약: [from, to) 시간 구간의 마디들을 만든다
  A.scheduleTrack = function (g, bus, tr, state, until) {
    var spb = 60 / tr.bpm;
    // 탭을 오래 내려 두면 타이머가 멈춘다: 밀린 마디를 한꺼번에 울리지 말고 지금부터 다시
    if (state.next < g.ctx.currentTime - 0.3) state.next = g.ctx.currentTime + 0.1;
    while (state.next < until) {
      var r = rng(tr.seed * 1000 + state.bar);
      tr.bar(g, bus, state.next, state.bar, spb, r, state.mel);
      state.next += spb * tr.beats;
      state.bar++;
    }
  };
  A.newState = function (tr, t) {
    var home = 0;
    return { next: t, bar: 0, mel: { d: home + 2, lo: -2, hi: 7, home: home } };
  };

  A.play = function (name) {
    if (A.trackName === name && A.timer) return;
    A.stopMusic();
    if (!A.ctx || !TRACKS[name]) return; // 아직 소리를 켤 수 없으면 곡 이름도 남기지 않는다 (나중에 누르면 시작)
    A.trackName = name;
    // 바뀔 때 부드럽게
    var tr = TRACKS[name];
    var bus = A.ctx.createGain(); bus.gain.value = 0;
    bus.gain.linearRampToValueAtTime(1, A.ctx.currentTime + 1.2);
    bus.connect(A.g.musicBus);
    A.curBus = bus;
    A.state = A.newState(tr, A.ctx.currentTime + 0.15);
    A.timer = setInterval(function () {
      if (!A.ctx || A.ctx.state !== 'running') return;
      A.scheduleTrack(A.g, bus, tr, A.state, A.ctx.currentTime + 1.2);
    }, 250);
    A.scheduleTrack(A.g, bus, tr, A.state, A.ctx.currentTime + 1.2);
  };
  // 지킴이: 음악이 켜져 있어야 하는데 멈춰 있으면 다시 (브라우저가 소리를 잠갔다 풀었을 때, 탭을 다시 열었을 때)
  A.ensure = function () {
    if (!A.ctx || !A.settings.music || !A.want) return;
    if (A.ctx.state !== 'running') { try { A.ctx.resume(); } catch (e) { /* 누를 때 다시 */ } return; }
    if (A.trackName !== A.want || !A.timer) A.play(A.want);
  };
  setInterval(function () { A.ensure(); }, 2000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) A.ensure(); });
  A.stopMusic = function () {
    if (A.timer) clearInterval(A.timer);
    A.timer = null;
    if (A.curBus && A.ctx) {
      var b = A.curBus, now = A.ctx.currentTime;
      b.gain.cancelScheduledValues(now); b.gain.setValueAtTime(b.gain.value, now); b.gain.linearRampToValueAtTime(0, now + 0.8);
      setTimeout(function () { try { b.disconnect(); } catch (e) { /* 이미 끊김 */ } }, 1500);
    }
    A.curBus = null;
  };

  // ---- 효과음
  var SFX = {
    click: function (g, b, t) { A.woodblock(g, b, t, 0.45); },
    ok: function (g, b, t) { A.pluck(g, b, t, 74, 0.45, { bright: true }); A.pluck(g, b, t + 0.07, 81, 0.4, { bright: true }); },
    coin: function (g, b, t) { [86, 90, 93].forEach(function (m, i) { A.pluck(g, b, t + i * 0.05, m, 0.35, { bright: true }); }); },
    found: function (g, b, t) { [69, 71, 74, 78, 81].forEach(function (m, i) { A.pluck(g, b, t + i * 0.07, m, 0.4, { bright: true }); }); },
    recruit: function (g, b, t) { [62, 66, 69, 74].forEach(function (m, i) { A.pluck(g, b, t + i * 0.09, m, 0.5); }); A.flute(g, b, t + 0.36, 78, 0.6, 0.5); },
    fail: function (g, b, t) { A.pluck(g, b, t, 57, 0.5, { dur: 0.4 }); A.pluck(g, b, t + 0.12, 52, 0.45, { dur: 0.5 }); },
    error: function (g, b, t) { A.woodblock(g, b, t, 0.2); A.woodblock(g, b, t + 0.09, 0.15); },
    drum: function (g, b, t) { for (var i = 0; i < 4; i++) A.smallDrum(g, b, t + i * 0.08, 0.5 - i * 0.08); A.bigDrum(g, b, t + 0.32, 0.6); },
    turn: function (g, b, t) { A.gong(g, b, t, 0.45, 110); },
    march: function (g, b, t) { A.horn(g, b, t, 52, 0.9, 0.8); [0, 0.45, 0.9, 1.1].forEach(function (d, i) { A.bigDrum(g, b, t + d, 0.8 - i * 0.1); }); },
    clash: function (g, b, t) { noise(g, b, t, 0.18, 'bandpass', 4200, 6, 1.2, 0.3); noise(g, b, t + 0.02, 0.35, 'bandpass', 6800, 12, 0.8, 0.3); A.smallDrum(g, b, t, 0.3); },
    hit: function (g, b, t) { noise(g, b, t, 0.22, 'lowpass', 1500, 0, 0.6, 0.15); A.bigDrum(g, b, t, 0.35); },
    arrow: function (g, b, t) { var f = noise(g, b, t, 0.4, 'bandpass', 1800, 3, 0.7, 0.1, 0.08); f.frequency.linearRampToValueAtTime(5200, t + 0.35); noise(g, b, t + 0.38, 0.1, 'lowpass', 900, 0, 0.4, 0); },
    fire: function (g, b, t) { noise(g, b, t, 1.2, 'lowpass', 900, 0, 0.5, 0.3, 0.15); for (var i = 0; i < 9; i++) noise(g, b, t + 0.1 + i * 0.11 + Math.random() * 0.05, 0.03, 'highpass', 3000, 0, 0.35, 0); },
    confuse: function (g, b, t) {
      var c = g.ctx, o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(660, t);
      var l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 7; lg.gain.value = 80; l.connect(lg); lg.connect(o.frequency);
      o.frequency.linearRampToValueAtTime(330, t + 0.7);
      var a = c.createGain(); a.gain.setValueAtTime(0.3, t); a.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      o.connect(a); out(g, b, a, 0.4); o.start(t); l.start(t); o.stop(t + 0.85); l.stop(t + 0.85);
    },
    broken: function (g, b, t) { A.bigDrum(g, b, t, 0.9); A.bigDrum(g, b, t + 0.25, 0.6); noise(g, b, t, 0.7, 'lowpass', 600, 0, 0.4, 0.3); },
    duel: function (g, b, t) { [0, 0.28, 0.5, 0.9].forEach(function (d) { SFX.clash(g, b, t + d); }); },
    win: function (g, b, t) { A.gong(g, b, t, 0.8, 98); [62, 66, 69, 74, 78].forEach(function (m, i) { A.pluck(g, b, t + 0.2 + i * 0.11, m, 0.5, { bright: true }); }); A.horn(g, b, t + 0.75, 62, 1.2, 0.6); },
    lose: function (g, b, t) { A.bigDrum(g, b, t, 0.7); [64, 62, 59, 57].forEach(function (m, i) { A.erhu(g, b, t + 0.2 + i * 0.32, m, 0.34, 0.7); }); },
    capture: function (g, b, t) { A.gong(g, b, t, 0.6, 120); A.bigDrum(g, b, t, 0.6); },
    event: function (g, b, t) { A.gong(g, b, t, 0.55, 90); A.flute(g, b, t + 0.5, 74, 0.6, 0.5); A.flute(g, b, t + 1.1, 76, 1.1, 0.5); },
    harvest: function (g, b, t) { [74, 76, 78, 81, 83, 86].forEach(function (m, i) { A.pluck(g, b, t + i * 0.06, m, 0.35, { bright: true }); }); }
  };
  A.sfx = function (name) {
    if (!A.ctx || !A.settings.sfx || !SFX[name]) return;
    if (A.ctx.state !== 'running') return;
    // 같은 소리가 한꺼번에 몰리면 하나만
    var now = A.ctx.currentTime;
    A._last = A._last || {};
    if (A._last[name] && now - A._last[name] < 0.06) return;
    A._last[name] = now;
    SFX[name](A.g, A.g.sfxBus, now + 0.01);
  };

  // 시험용: 곡 하나를 오프라인으로 만들어 소리 데이터를 돌려준다
  A.renderOffline = function (name, seconds, sfxName) {
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var ctx = new OAC(2, Math.floor(44100 * seconds), 44100);
    var g = A.build(ctx);
    g.musicBus.gain.value = A.settings.musicVol * A.MUSIC_GAIN; g.sfxBus.gain.value = A.settings.sfxVol * A.SFX_GAIN;
    if (name) { var tr = TRACKS[name], st = A.newState(tr, 0.05); A.scheduleTrack(g, g.musicBus, tr, st, seconds - 1); }
    if (sfxName) SFX[sfxName](g, g.sfxBus, 0.05);
    return ctx.startRendering();
  };
  A.TRACKS = TRACKS; A.SFX_NAMES = Object.keys(SFX);
  return A;
})();
