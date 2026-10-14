// 직접 지휘 전투 화면: 그린 전장, 깃발 단 부대, 공격·계략 연출, 시작 대치 화면, 일기토 연출, 승패 인장
var SG = SG || {};

SG.UI.HEX = 32; // 육각형 반지름(px)

SG.UI.hexXY = function (c, r) {
  var R = SG.UI.HEX;
  return { x: R * Math.sqrt(3) * (c + 0.5 * (r & 1)) + R * 1.2, y: R * 1.5 * r + R * 1.2 };
};
SG.UI.hexPoints = function (x, y, R) {
  var p = [];
  for (var i = 0; i < 6; i++) {
    var a = Math.PI / 180 * (60 * i - 30);
    p.push((x + R * Math.cos(a)).toFixed(1) + ',' + (y + R * Math.sin(a)).toFixed(1));
  }
  return p.join(' ');
};
// 칸마다 같은 모양이 나오도록 하는 난수
SG.UI.hexRand = function (c, r, k) {
  var x = Math.sin((c + 1) * 127.1 + (r + 1) * 311.7 + (k || 0) * 74.7) * 43758.5453;
  return x - Math.floor(x);
};
// 육각 전장 지형 그림 (img/terrain/*.jpg). 없는 지형은 예전 색으로
SG.UI.TERRAIN_TEX = { plain: 'plain', forest: 'forest', hill: 'hill', mountain: 'mountain', water: 'water', castle: 'castle', keep: 'castle', gate: 'castle', wall: 'wall' };
SG.UI.DUEL_LINES = [
  '{a}의 일격이 바람을 가른다!', '{d}이(가) 간신히 막아 낸다!', '창과 칼이 부딪혀 불꽃이 튄다!', '{a}이(가) 말머리를 돌려 다시 달려든다!',
  '{d}의 반격이 매섭다!', '두 장수가 엇갈리며 숨을 고른다…', '양군의 함성이 하늘을 찌른다!', '{a}의 무기가 {d}의 투구를 스친다!'
];

// 전투 실행 → 결과 (SG.ui.tactical 로 연결)
SG.UI.tactical = function (atk, def) {
  return new Promise(function (resolve) {
    SG.UI.busy(null);
    var B = SG.T.create(atk, def);
    SG.UI.music('battle');
    var me = SG.isPlayer(atk.fid) ? 'atk' : 'def';
    var st = { sel: null, mode: 'idle', form: 'normal', prev: null, auto: false, anim: false, flash: {} };
    var fcol = { atk: SG.S.forces[atk.fid].color, def: def.fid ? SG.S.forces[def.fid].color : '#777' };
    var fname = { atk: SG.forceName(atk.fid), def: def.fid ? SG.forceName(def.fid) : '수비군' };

    var root = h('div', { id: 'battle', class: 'bt' });
    var top = h('div', { class: 'topbar bt-top', style: { gridColumn: '1 / 3' } });
    var field = h('div', { class: 'field-area' });
    var stage = h('div', { class: 'bt-stage' });
    var side = h('div', { class: 'panel bt-side', style: { gridRow: '2 / 4', gridColumn: '2' } });
    var logEl = h('div', { class: 'log' });
    field.appendChild(stage);
    field.appendChild(h('div', { class: 'bt-fog' }));
    field.appendChild(h('div', { class: 'bt-vignette' }));
    // 아래쪽 대사창: 말하는 장수 초상 + 이름 + 한 글자씩 나오는 글. 「기록」을 누르면 지난 기록이 위로 펼쳐진다
    var dlgFace = h('div', { class: 'bd-face' }), dlgWho = h('div', { class: 'bd-who' }), dlgTxt = h('div', { class: 'bd-t' });
    var dlgEl = h('div', { class: 'bt-dlg' }, [dlgFace, h('div', { class: 'bd-body' }, [dlgWho, dlgTxt]),
      h('button', { class: 'btn small bd-hist', type: 'button', text: '기록', onclick: function () { root.classList.toggle('show-log'); logEl.scrollTop = logEl.scrollHeight; } }), logEl]);
    root.appendChild(top); root.appendChild(field); root.appendChild(side); root.appendChild(dlgEl);
    document.body.appendChild(root);

    var NS2 = 'http://www.w3.org/2000/svg';
    function S2(tag, a, p) { var e = document.createElementNS(NS2, tag); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
    var R = SG.UI.HEX, W = Math.ceil(R * Math.sqrt(3) * (SG.T.COLS + 0.5) + R * 2.4), H = Math.ceil(R * 1.5 * (SG.T.ROWS - 1) + R * 3.4);
    var svgEl = S2('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, class: 'bt-svg' });
    stage.appendChild(svgEl);
    var defs = S2('defs', {}, svgEl);
    S2('circle', { r: R - 10 }, S2('clipPath', { id: 'clip-me' }, defs));
    // 종이·흙 결 (지형 위에 살짝 덮는다)
    var tex = S2('filter', { id: 'bt-tex', x: 0, y: 0, width: '100%', height: '100%' }, defs);
    S2('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035', numOctaves: 3, seed: 7, result: 'n' }, tex);
    S2('feColorMatrix', { type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0', in: 'n' }, tex);
    var glow = S2('filter', { id: 'bt-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    S2('feGaussianBlur', { stdDeviation: 3 }, glow);
    // 지형 그림 (Higgsfield 로 그린 위에서 본 바탕). 전장 크기만 한 무늬라 이음매가 없다
    var TEX = SG.UI.TERRAIN_TEX;
    Object.keys(TEX).forEach(function (k) {
      var pt = S2('pattern', { id: 'tx-' + k, patternUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, defs);
      S2('image', { href: 'img/terrain/' + TEX[k] + '.jpg', x: 0, y: 0, width: W, height: H, preserveAspectRatio: 'xMidYMid slice' }, pt);
    });
    var gMap = S2('g', { class: 'bt-terrain' }, svgEl);
    var gDeco = S2('g', { class: 'bt-deco' }, svgEl);
    S2('rect', { x: 0, y: 0, width: W, height: H, filter: 'url(#bt-tex)', class: 'bt-grain' }, svgEl);
    var gDepot = S2('g', { class: 'bt-depot' }, svgEl), gHi = S2('g', {}, svgEl), gUnits = S2('g', {}, svgEl), gFx = S2('g', {}, svgEl);
    // 공격군 보급대 (粮): 수비군이 이 칸에 들어오면 공격군이 진다
    function drawDepot() {
      gDepot.innerHTML = '';
      if (!B.depot) return;
      var p = SG.UI.hexXY(B.depot.c, B.depot.r);
      var g = S2('g', { transform: 'translate(' + p.x + ',' + p.y + ')', class: 'depot' + (B.depotLost ? ' lost' : '') }, gDepot);
      S2('polygon', { points: SG.UI.hexPoints(0, 0, R - 3), class: 'depot-hex', style: 'stroke:' + fcol.atk }, g);
      // 수레 두 대 + 쌀가마
      [-9, 7].forEach(function (dx, i) {
        S2('rect', { x: dx - 8, y: -4 - i * 3, width: 16, height: 9, rx: 2, class: 'depot-cart' }, g);
        S2('circle', { cx: dx - 4, cy: 6 - i * 3, r: 3, class: 'depot-wheel' }, g);
        S2('circle', { cx: dx + 4, cy: 6 - i * 3, r: 3, class: 'depot-wheel' }, g);
        S2('ellipse', { cx: dx, cy: -7 - i * 3, rx: 7, ry: 4, class: 'depot-sack' }, g);
      });
      var tg = S2('g', { transform: 'translate(0,' + (R * 0.42) + ')' }, g);
      S2('rect', { x: -22, y: -9, width: 44, height: 17, rx: 4, class: 'depot-tag', style: 'fill:' + fcol.atk }, tg);
      var tx = S2('text', { y: 4, 'text-anchor': 'middle', class: 'depot-ch' }, tg); tx.textContent = '粮 보급대';
    }

    // ---- 지형 그리기 (한 번만)
    function drawTerrain() {
      var K = SG.T.CASTLE;
      for (var r = 0; r < SG.T.ROWS; r++) for (var c = 0; c < SG.T.COLS; c++) {
        (function (c, r) {
          var p = SG.UI.hexXY(c, r), tt = B.map[SG.T.key(c, r)], rnd = function (k) { return SG.UI.hexRand(c, r, k); };
          var poly = S2('polygon', { points: SG.UI.hexPoints(p.x, p.y, R - 0.4), class: 'hex ' + tt + (TEX[tt] ? ' tex' : '') }, gMap);
          if (TEX[tt]) poly.style.fill = 'url(#tx-' + tt + ')';
          var tone = rnd(0);
          if (tone > 0.55) S2('polygon', { points: SG.UI.hexPoints(p.x, p.y, R - 0.4), class: 'hex-tone ' + (tone > 0.8 ? 'dk' : 'lt'), 'pointer-events': 'none' }, gMap);
          poly.addEventListener('click', function () { onHex(c, r); });
          var d = gDeco;
          if (tt === 'plain' && !TEX.plain && rnd(1) > 0.45) for (var g = 0; g < 3; g++) {
            var gx = p.x + (rnd(g + 2) - 0.5) * R, gy = p.y + (rnd(g + 5) - 0.5) * R * 0.9;
            S2('path', { d: 'M' + gx + ',' + gy + ' l-2,-5 M' + gx + ',' + gy + ' l0,-6 M' + gx + ',' + gy + ' l2,-5', class: 'grass' }, d);
          }
          if (tt === 'forest') for (var t = 0; t < (TEX.forest ? 2 : 4); t++) {
            var tx = p.x + [-10, 8, -2, 11][t] + (rnd(t) - 0.5) * 4, ty = p.y + [2, -6, 10, 7][t];
            var s = 6 + rnd(t + 3) * 3;
            S2('rect', { x: tx - 1, y: ty, width: 2, height: 5, class: 'trunk' }, d);
            S2('circle', { cx: tx, cy: ty - s * 0.4, r: s, class: 'canopy' }, d);
            S2('circle', { cx: tx - s * 0.35, cy: ty - s * 0.75, r: s * 0.45, class: 'canopy-hl' }, d);
          }
          if (tt === 'hill') {
            S2('path', { d: 'M' + (p.x - 17) + ',' + (p.y + 9) + ' Q' + (p.x - 4) + ',' + (p.y - 14) + ' ' + (p.x + 9) + ',' + (p.y + 9) + ' Z', class: 'hill-b' }, d);
            S2('path', { d: 'M' + (p.x - 3) + ',' + (p.y + 10) + ' Q' + (p.x + 8) + ',' + (p.y - 6) + ' ' + (p.x + 18) + ',' + (p.y + 10) + ' Z', class: 'hill-f' }, d);
          }
          if (tt === 'mountain') {
            [[-8, 16, 12], [7, 13, 9]].forEach(function (m) {
              var mx = p.x + m[0], top = p.y - m[1] + 6, base = p.y + 10, w = m[2];
              S2('path', { d: 'M' + (mx - w) + ',' + base + ' L' + mx + ',' + top + ' L' + (mx + w) + ',' + base + ' Z', class: 'peak' }, d);
              S2('path', { d: 'M' + mx + ',' + top + ' L' + (mx + w) + ',' + base + ' L' + (mx + w * 0.2) + ',' + base + ' Z', class: 'peak-sh' }, d);
              S2('path', { d: 'M' + (mx - w * 0.32) + ',' + (top + m[1] * 0.32) + ' L' + mx + ',' + top + ' L' + (mx + w * 0.32) + ',' + (top + m[1] * 0.32) + ' L' + mx + ',' + (top + m[1] * 0.22) + ' Z', class: 'snow' }, d);
            });
          }
          if (tt === 'water') for (var wv = 0; wv < (TEX.water ? 1 : 2); wv++) {
            S2('path', { d: 'M' + (p.x - 14) + ',' + (p.y - 4 + wv * 9) + ' q4,-4 8,0 t8,0 t8,0', class: 'wave', style: 'animation-delay:' + (rnd(wv) * -2).toFixed(2) + 's' }, d);
          }
          if (tt === 'wall') {
            S2('rect', { x: p.x - 16, y: p.y - 6, width: 32, height: 16, class: 'stone' }, d);
            for (var b = 0; b < 4; b++) S2('rect', { x: p.x - 16 + b * 8 + 1, y: p.y - 11, width: 5, height: 6, class: 'stone' }, d);
            S2('path', { d: 'M' + (p.x - 16) + ',' + (p.y + 2) + ' h32 M' + (p.x - 6) + ',' + (p.y - 6) + ' v8 M' + (p.x + 6) + ',' + (p.y + 2) + ' v8', class: 'mortar' }, d);
          }
          if (tt === 'gate') {
            S2('rect', { x: p.x - 15, y: p.y - 9, width: 30, height: 19, class: 'stone' }, d);
            S2('path', { d: 'M' + (p.x - 8) + ',' + (p.y + 10) + ' v-9 a8,8 0 0 1 16,0 v9 Z', class: 'door' }, d);
            S2('path', { d: 'M' + p.x + ',' + (p.y - 6) + ' v16', class: 'mortar' }, d);
            S2('path', { d: 'M' + (p.x - 18) + ',' + (p.y - 9) + ' L' + p.x + ',' + (p.y - 17) + ' L' + (p.x + 18) + ',' + (p.y - 9) + ' Z', class: 'roof' }, d);
          }
          if (tt === 'keep') {
            S2('rect', { x: p.x - 12, y: p.y - 2, width: 24, height: 13, class: 'stone' }, d);
            S2('path', { d: 'M' + (p.x - 19) + ',' + (p.y - 1) + ' Q' + p.x + ',' + (p.y - 9) + ' ' + (p.x + 19) + ',' + (p.y - 1) + ' L' + (p.x + 13) + ',' + (p.y - 7) + ' L' + (p.x - 13) + ',' + (p.y - 7) + ' Z', class: 'roof' }, d);
            S2('rect', { x: p.x - 7, y: p.y - 14, width: 14, height: 8, class: 'stone' }, d);
            S2('path', { d: 'M' + (p.x - 13) + ',' + (p.y - 12) + ' Q' + p.x + ',' + (p.y - 20) + ' ' + (p.x + 13) + ',' + (p.y - 12) + ' L' + (p.x + 8) + ',' + (p.y - 17) + ' L' + (p.x - 8) + ',' + (p.y - 17) + ' Z', class: 'roof' }, d);
            var kt = S2('text', { x: p.x, y: p.y + 9, 'text-anchor': 'middle', class: 'keep-char' }, d); kt.textContent = '本';
          }
          if (tt === 'castle' && c >= K.c - 1) S2('rect', { x: p.x - 9, y: p.y - 3, width: 18, height: 10, rx: 1, class: 'house' }, d);
        })(c, r);
      }
    }
    drawTerrain();

    function unitAt(c, r) { return SG.T.at(B, c, r); }
    function myTurn() { return B.side === me && !st.auto && !B.over; }
    function surname(u) { return u.oid ? (SG.O(u.oid).h || u.name).charAt(0) : '兵'; }

    // ---- 부대
    function drawUnits() {
      gUnits.innerHTML = '';
      SG.T.alive(B).sort(function (a, b) { return a.r - b.r; }).forEach(function (u) {
        var p = SG.UI.hexXY(u.c, u.r);
        var g = S2('g', { transform: 'translate(' + p.x + ',' + p.y + ')' }, gUnits);
        var inner = S2('g', { class: 'unit' + ((u.done && u.side === B.side) ? ' spent' : '') + (st.sel === u ? ' selected' : '') + (u.side === me ? ' mine' : ' foe') }, g);
        g.style.cursor = 'pointer';
        g.addEventListener('click', function () { onHex(u.c, u.r); });
        if (st.lunge && st.lunge.id === u.id) { inner.classList.add('lunge'); inner.style.setProperty('--lx', st.lunge.dx + 'px'); inner.style.setProperty('--ly', st.lunge.dy + 'px'); }
        if (st.hit && st.hit[u.id]) inner.classList.add('hit');
        var rr = R - 6;
        S2('ellipse', { cx: 0, cy: rr - 1, rx: rr * 0.85, ry: 5, class: 'unit-shadow' }, inner);
        if (st.sel === u) S2('circle', { r: rr + 4, class: 'unit-sel' }, inner);
        // 깃발 (깃대 + 성씨 한 글자)
        var fx0 = rr - 6, fy0 = -rr - 14;
        S2('path', { d: 'M' + fx0 + ',' + (fy0 - 2) + ' V' + (-4), class: 'pole' }, inner);
        var flag = S2('g', { class: 'banner', transform: 'translate(' + fx0 + ',' + fy0 + ')' }, inner);
        var fl = S2('path', { d: 'M0,0 h17 l-3,5 3,5 3,0 -3,5 3,5 h-20 Z', class: 'flag-cloth' }, flag);
        fl.style.fill = fcol[u.side];
        var ft = S2('text', { x: 8, y: 14, 'text-anchor': 'middle', class: 'flag-char' }, flag); ft.textContent = surname(u);
        var ring = S2('circle', { r: rr, class: 'unit-ring' }, inner);
        ring.style.fill = fcol[u.side];
        var t = S2('text', { y: 6, 'text-anchor': 'middle', 'font-size': 17, fill: '#fff', style: 'font-family:var(--f-display)' }, inner);
        t.textContent = surname(u);
        if (u.oid) {
          var r0 = rr - 4;
          var im = S2('image', { x: -r0, y: -r0, width: 2 * r0, height: 2 * r0, 'clip-path': 'url(#clip-me)', preserveAspectRatio: 'xMidYMid slice' }, inner);
          im.setAttribute('href', SG.UI.portraitSrc(u.oid, true));
          im.addEventListener('error', function () { im.remove(); });
        }
        var frac = Math.max(0, u.n / Math.max(1, u.max)), circ = 2 * Math.PI * (rr + 1);
        S2('circle', { r: rr + 1, class: 'hp-track' }, inner);
        S2('circle', { r: rr + 1, class: 'hp-arc ' + (u.side === me ? 'hp-me' : 'hp-foe'), 'stroke-dasharray': (circ * frac).toFixed(1) + ' ' + circ.toFixed(1), transform: 'rotate(-90)' }, inner);
        var lbl = u.n >= 1000 ? (u.n / 1000).toFixed(1) + 'k' : String(u.n);
        var bw = 8 + lbl.length * 6.5;
        S2('rect', { x: -bw / 2, y: rr - 2, width: bw, height: 14, rx: 7, class: 'unit-badge' }, inner);
        var n = S2('text', { y: rr + 8.5, 'text-anchor': 'middle', class: 'unit-num' }, inner);
        n.textContent = lbl;
        if (u.conf > 0) { var cf = S2('text', { x: -rr - 2, y: -rr + 6, class: 'unit-conf' }, inner); cf.textContent = '亂'; }
        // 병종 표시 (왼쪽 아래 작은 원: 步·騎·弓)
        S2('circle', { cx: -rr + 2, cy: rr - 6, r: 8.5, class: 'unit-type t-' + u.t }, inner);
        var ty = S2('text', { x: -rr + 2, y: rr - 2.2, 'text-anchor': 'middle', class: 'unit-type-ch' }, inner); ty.textContent = SG.TROOPS[u.t].h;
        if (st.flash[u.id]) {
          var fx = S2('text', { y: -rr - 18, 'text-anchor': 'middle', class: 'unit-flash' + (st.flash[u.id].charAt(0) === '-' ? '' : ' info') }, g);
          fx.textContent = st.flash[u.id];
        }
      });
    }

    // ---- 효과
    function at(u) { return SG.UI.hexXY(u.c, u.r); }
    function fxGroup(p, cls, ms) {
      var g = S2('g', { transform: 'translate(' + p.x + ',' + p.y + ')', class: 'fx ' + cls }, gFx);
      setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, ms || 1000);
      return g;
    }
    function shake(strong) {
      stage.classList.remove('shake', 'shake2'); void stage.offsetWidth;
      stage.classList.add(strong ? 'shake2' : 'shake');
    }
    function slash(t) {
      var g = fxGroup(at(t), 'fx-slash', 700);
      var a = SG.UI.hexRand(t.c, t.r, Date.now() % 97) * 60 - 30;
      S2('path', { d: 'M-22,-14 Q0,-2 22,12', transform: 'rotate(' + a + ')', class: 'slash-arc' }, g);
      S2('path', { d: 'M-18,12 Q0,2 18,-14', transform: 'rotate(' + (-a / 2) + ')', class: 'slash-arc s2' }, g);
      for (var i = 0; i < 8; i++) {
        var ang = i / 8 * Math.PI * 2;
        S2('line', { x1: Math.cos(ang) * 6, y1: Math.sin(ang) * 6, x2: Math.cos(ang) * 17, y2: Math.sin(ang) * 17, class: 'spark' }, g);
      }
    }
    function volley(a, t) {
      var pa = at(a), pt = at(t), g = fxGroup({ x: 0, y: 0 }, 'fx-arrows', 900);
      for (var i = 0; i < 3; i++) {
        var ox = (i - 1) * 6, oy = (i - 1) * 4;
        var mx = (pa.x + pt.x) / 2 + ox, my = Math.min(pa.y, pt.y) - 40 + oy;
        S2('path', { d: 'M' + (pa.x + ox) + ',' + (pa.y - 10) + ' Q' + mx + ',' + my + ' ' + (pt.x + ox) + ',' + (pt.y + oy), class: 'arrow-line', style: 'animation-delay:' + (i * 90) + 'ms' }, g);
      }
      setTimeout(function () { slashLite(t); }, 420);
    }
    function slashLite(t) {
      var g = fxGroup(at(t), 'fx-slash', 600);
      for (var i = 0; i < 6; i++) { var ang = i / 6 * Math.PI * 2 + 0.3; S2('line', { x1: Math.cos(ang) * 5, y1: Math.sin(ang) * 5, x2: Math.cos(ang) * 13, y2: Math.sin(ang) * 13, class: 'spark' }, g); }
    }
    function flames(t) {
      var g = fxGroup(at(t), 'fx-fire', 1500);
      for (var k = 0; k < 7; k++) {
        var x = (k - 3) * 6 + (SG.UI.hexRand(k, t.r, 3) - 0.5) * 4, hgt = 16 + SG.UI.hexRand(k, t.c, 4) * 14;
        S2('path', { d: 'M' + (x - 5) + ',8 Q' + (x - 6) + ',' + (8 - hgt * 0.5) + ' ' + x + ',' + (8 - hgt) + ' Q' + (x + 6) + ',' + (8 - hgt * 0.5) + ' ' + (x + 5) + ',8 Z', class: 'flame', style: 'animation-delay:' + (k * 60) + 'ms' }, g);
      }
      for (var e = 0; e < 10; e++) S2('circle', { cx: (SG.UI.hexRand(e, t.c, 9) - 0.5) * 34, cy: 4, r: 1.6, class: 'ember', style: 'animation-delay:' + (e * 70) + 'ms' }, g);
      S2('circle', { r: 26, class: 'smoke', style: 'animation-delay:.5s' }, g);
    }
    function confuse(t) {
      var g = fxGroup(at(t), 'fx-confuse', 1300);
      var ring = S2('g', { class: 'swirl' }, g);
      for (var i = 0; i < 3; i++) { var a = i / 3 * Math.PI * 2; var tx = S2('text', { x: Math.cos(a) * 20, y: Math.sin(a) * 12 + 4, 'text-anchor': 'middle' }, ring); tx.textContent = '亂'; }
    }
    function broken(t) {
      var g = fxGroup(at(t), 'fx-broken', 1400);
      for (var i = 0; i < 3; i++) S2('circle', { cx: (i - 1) * 12, cy: 0, r: 14, class: 'smoke', style: 'animation-delay:' + (i * 120) + 'ms' }, g);
      var tx = S2('text', { y: -6, 'text-anchor': 'middle', class: 'broke-char' }, g); tx.textContent = '潰';
      shake(true);
    }
    // 돌파: 지나간 길에 흙먼지
    function dustTrail(from, to) {
      var pa = at({ c: from[0], r: from[1] }), pb = at({ c: to[0], r: to[1] }), g = fxGroup({ x: 0, y: 0 }, 'fx-breach', 1100);
      S2('path', { d: 'M' + pa.x + ',' + pa.y + ' L' + pb.x + ',' + pb.y, class: 'breach-line' }, g);
      for (var i = 0; i < 5; i++) { var k = (i + 0.5) / 5; S2('circle', { cx: pa.x + (pb.x - pa.x) * k, cy: pa.y + (pb.y - pa.y) * k + 6, r: 9, class: 'smoke', style: 'animation-delay:' + (i * 80) + 'ms' }, g); }
    }
    function lunge(a, t) {
      var pa = at(a), pt = at(t);
      var dx = pt.x - pa.x, dy = pt.y - pa.y, d = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(20, d * 0.42) / d;
      st.lunge = { id: a.id, dx: Math.round(dx * k), dy: Math.round(dy * k) };
      st.hit = {}; st.hit[t.id] = true;
      setTimeout(function () { st.lunge = null; st.hit = null; }, 420);
    }
    // 공격 연출 한 번에
    function attackFx(a, t, before, form) {
      var ranged = SG.T.dist([a.c, a.r], [t.c, t.r]) > 1;
      var ff = B.fxForm || {};
      SG.UI.sfx(ranged || form === 'volley' || form === 'firearrow' ? 'arrow' : form === 'charge' || form === 'breach' ? 'broken' : 'clash');
      if (ranged || form === 'volley' || form === 'firearrow') {
        volley(a, t); (B.lastHits || []).forEach(function (hh) { if (hh.u !== t) volley(a, hh.u); });
        if (ff.kind === 'fire' && ff.ok) setTimeout(function () { SG.UI.sfx('fire'); flames(t); confuse(t); }, 380);
      } else if (ff.kind === 'breach') {
        slash(t); dustTrail(ff.from, ff.to); shake(false);
        if (ff.conf) setTimeout(function () { confuse(t); }, 300);
      } else { lunge(a, t); slash(t); if (form === 'combo') setTimeout(function () { SG.UI.sfx('clash'); lunge(a, t); slash(t); redraw(); }, 380); }
      if (ff.kind === 'push') setTimeout(function () { flash(t, ff.ok ? '밀려남!' : '짓눌림!'); if (!ff.ok) shake(false); }, 250);
      var lost = before - t.n;
      if (t.n <= 0) { setTimeout(function () { broken(t); }, ranged ? 420 : 150); SG.UI.sfx('broken'); }
      else if (lost > t.max * 0.12) shake(false);
    }

    // ---- 날짜·차례 띠
    var lastTurnKey = '';
    function turnBanner() {
      var key = B.day + B.side;
      if (key === lastTurnKey || B.over || !introDone) return;
      lastTurnKey = key;
      var old = field.querySelector('.turn-banner'); if (old) old.remove();
      var bnr = h('div', { class: 'turn-banner ' + (B.side === me ? 'mine' : 'foe') }, [h('b', { text: B.day + '일째' }), h('span', { text: B.side === me ? '아군 차례' : '적군 차례' })]);
      field.appendChild(bnr);
      setTimeout(function () { if (bnr.parentNode) bnr.remove(); }, 1300);
    }
    function drawHi() {
      gHi.innerHTML = '';
      if (!st.sel) return;
      var u = st.sel;
      function mark(c, r, cls) {
        var p = SG.UI.hexXY(c, r);
        S2('polygon', { points: SG.UI.hexPoints(p.x, p.y, R - 2.5), class: cls }, gHi);
      }
      if (st.mode === 'move') Object.keys(SG.T.reachable(B, u)).forEach(function (k) { var q = k.split(',').map(Number); mark(q[0], q[1], 'hl-move'); });
      if (st.mode === 'attack') SG.T.formTargets(B, u, st.form).forEach(function (t) { mark(t.c, t.r, 'hl-atk'); });
      if (st.mode === 'fire' || st.mode === 'confuse') SG.T.stratTargets(B, u).forEach(function (t) { mark(t.c, t.r, 'hl-strat'); });
      if (st.mode === 'duel') SG.T.duelTargets(B, u).forEach(function (t) { mark(t.c, t.r, 'hl-atk'); });
      if (st.mode === 'bribe') SG.T.bribeTargets(B, u).forEach(function (t) { mark(t.c, t.r, 'hl-strat'); });
    }
    function sum(side) { return SG.T.alive(B, side).reduce(function (s, u) { return s + u.n; }, 0); }
    function drawTop() {
      top.innerHTML = '';
      top.appendChild(h('div', { class: 'date' }, [h('span', { class: 'season', text: '戰' }), h('span', { class: 'date-t', text: SG.cityName(B.city) + ' 공방전' })]));
      // 사기 줄다리기 + 병력
      var ma = B.morale.atk, md = B.morale.def, tot = Math.max(1, ma + md);
      top.appendChild(h('div', { class: 'tug' }, [
        h('span', { class: 'tug-side' }, [h('i', { style: { background: fcol.atk } }), fname.atk + (me === 'atk' ? ' (우리)' : ''), h('b', { text: SG.fmt(sum('atk')) })]),
        h('div', { class: 'tug-bar', title: '사기 ' + ma + ' 대 ' + md }, [h('i', { style: { width: (ma / tot * 100) + '%', background: fcol.atk } }), h('i', { style: { width: (md / tot * 100) + '%', background: fcol.def } }), h('span', { text: '사기 ' + ma + ' : ' + md })]),
        h('span', { class: 'tug-side' }, [h('b', { text: SG.fmt(sum('def')) }), fname.def + (me === 'def' ? ' (우리)' : ''), h('i', { style: { background: fcol.def } })])
      ]));
      var days = h('div', { class: 'days', title: B.day + '일째 / ' + SG.T.DAYS + '일' }, [h('small', { text: B.day + '/' + SG.T.DAYS + '일' })]);
      var dbar = h('span', { class: 'days-bar' });
      for (var i = 1; i <= SG.T.DAYS; i++) dbar.appendChild(h('i', { class: i < B.day ? 'past' : i === B.day ? 'now' : '' }));
      days.appendChild(dbar);
      top.appendChild(days);
      if (B.supply) top.appendChild(supChips(''));
      top.appendChild(h('div', { class: 'sp' }));
      top.appendChild(h('div', { class: 'acts' }, [
        h('button', { class: 'btn small bt-auto', title: '남은 전투를 컴퓨터에게 맡깁니다', text: st.auto ? '자동 진행 중…' : '남은 전투 맡기기', disabled: st.auto || B.over ? true : null, onclick: function () {
          st.auto = true; st.sel = null; st.mode = 'idle'; redraw(); runAI();
        } }),
        h('button', { class: 'btn small', text: '퇴각', disabled: B.over || st.auto ? true : null, onclick: async function () {
          if (await SG.UI.confirm('퇴각', me === 'atk' ? '공격을 그만두고 물러날까요?' : '성을 버리고 물러날까요? (도시를 잃습니다)')) { SG.T.retreat(B, me); finish(); }
        } }),
        h('button', { class: 'btn primary end-turn', id: 'b-end', disabled: !myTurn() ? true : null, onclick: function () { endMyTurn(); } }, [h('span', { class: 'lbl-long', text: '차례 끝내기' }), h('span', { class: 'lbl-short', text: '끝' }), SG.UI.icon('next', 18)])
      ]));
    }
    // 군량(공격군이 버틸 날)·우리 금
    function supChips(cls) {
      var dl = Math.floor(B.supply.food / Math.max(1, SG.T.dailyFood(B))), myGold = B.supply.gold[me];
      return h('div', { class: 'bt-sup ' + cls, title: '공격군 군량: 하루에 ' + SG.T.dailyFood(B) + '씩 먹습니다. 떨어지거나 보급대(粮)를 빼앗기면 공격군이 집니다' }, [
        h('span', { class: 'sup-food ' + (dl <= 3 ? 'bad' : dl <= 7 ? 'warn' : '') }, [h('i', { text: '粮' }), (me === 'atk' ? '군량 ' : '적 군량 ') + dl + '일']),
        h('span', { class: 'sup-gold', title: me === 'atk' ? '챙겨 온 군자금 (매수에 씀)' : '도시 금 (매수에 씀)' }, [h('i', { text: '金' }), SG.fmt(myGold)])
      ]);
    }
    var CMD_ICON = { move: 'move', attack: 'attack', fire: 'flag', confuse: 'rumor', duel: 'officer', bribe: 'reward' };
    function drawSide() {
      side.innerHTML = '';
      var supTop = B.supply ? supChips('bt-sup-side') : null;
      if (supTop) side.appendChild(supTop);
      var u = st.sel;
      if (u) {
        var tt = B.map[SG.T.key(u.c, u.r)];
        side.appendChild(h('div', { class: 'bu-head', style: { borderColor: fcol[u.side] } }, [
          u.oid ? SG.UI.portrait(u.oid, 96, u.side === 'atk' ? atk.fid : def.fid) : h('span', { class: 'pt', style: { width: '96px', height: '96px', background: '#66706b', fontSize: '40px' } }, ['兵']),
          h('div', null, [
            h('div', { class: 'bu-side', style: { color: fcol[u.side] }, text: (u.side === me ? '아군' : '적군') + ' · ' + fname[u.side] }),
            h('div', { class: 'bu-name' }, [u.name, h('span', { class: 'tag tt t-' + u.t, title: SG.TROOPS[u.t].desc, text: SG.TROOPS[u.t].h + ' ' + SG.TROOPS[u.t].n + (u.oid && SG.apt(u.oid) === u.t ? ' ★' : '') }), u.sk ? h('span', { class: 'tag sk', text: u.sk, title: SG.SKILLS[u.sk] }) : null]),
            h('div', { class: 'note', text: SG.T.TERRAIN[tt].n + (u.conf > 0 ? ' · 혼란 중' : '') + (u.done ? ' · 행동 끝' : '') }),
            h('div', { class: 'bu-hp' }, [SG.UI.bar(u.n, u.max, u.side === me ? 'g' : 'r'), h('span', { text: SG.fmt(u.n) + ' / ' + SG.fmt(u.max) })])
          ])
        ]));
        var icons = ['flag', 'attack', 'scroll'];
        side.appendChild(h('div', { class: 'meters bu-stats' }, [['통솔', u.lead], ['무력', u.war], ['지력', u.int]].map(function (x, i) {
          return h('div', { class: 'meter' }, [SG.UI.icon(icons[i], 15), h('span', { class: 'meter-k', text: x[0] }), SG.UI.bar(x[1], 100, ['b', 'r', 'g'][i]), h('span', { class: 'meter-v ' + SG.UI.statClass(x[1]), text: x[1] })]);
        }).concat([h('div', { class: 'meter' }, [SG.UI.icon('move', 15), h('span', { class: 'meter-k', text: '이동' }), SG.UI.bar(SG.T.movePoints(u), 5, ''), h('span', { class: 'meter-v', text: SG.T.movePoints(u) })])])));
        if (u.side === me && myTurn() && !u.done) {
          var acts = h('div', { class: 'cmd-grid' });
          function add(label, mode, enabled, cls) {
            acts.appendChild(h('button', { class: 'cmd' + (st.mode === mode ? ' on-mode' : '') + (cls ? ' ' + cls : ''), type: 'button', disabled: !enabled ? true : null, onclick: function () {
              st.mode = mode;
              // 공격: 쓸 수 있는 형태 중 지난번 것, 없으면 보통 공격
              if (mode === 'attack' && SG.T.formsOf(B, u).indexOf(st.form) < 0) st.form = 'normal';
              redraw();
            } },
              [SG.UI.icon(CMD_ICON[mode] || 'order', 20), h('span', { class: 'cmd-l', text: label })]));
          }
          add('이동', 'move', !u.moved);
          add('공격', 'attack', SG.T.attackTargets(B, u).length > 0, 'war');
          add('화계', 'fire', SG.T.stratTargets(B, u).length > 0);
          add('혼란', 'confuse', SG.T.stratTargets(B, u).length > 0);
          add('일기토', 'duel', SG.T.duelTargets(B, u).length > 0, 'war');
          add('매수', 'bribe', B.supply && B.supply.gold[me] > 0 && SG.T.bribeTargets(B, u).length > 0);
          acts.appendChild(h('button', { class: 'cmd', type: 'button', onclick: function () { SG.T.wait(B, u); st.sel = null; st.mode = 'idle'; redraw(); autoEndCheck(); } }, [SG.UI.icon('check', 20), h('span', { class: 'cmd-l', text: '대기' })]));
          if (u.moved && st.prev) acts.appendChild(h('button', { class: 'cmd', type: 'button', onclick: function () { u.c = st.prev[0]; u.r = st.prev[1]; u.moved = false; st.prev = null; st.mode = 'move'; redraw(); } }, [SG.UI.icon('next', 20, 'flip'), h('span', { class: 'cmd-l', text: '이동 취소' })]));
          // 공격 형태 고르기 (공격 단추를 누르면 펼쳐짐)
          var formsEl = null;
          if (st.mode === 'attack') {
            var okF = SG.T.formsOf(B, u);
            formsEl = h('div', { class: 'bt-forms' }, [h('div', { class: 'bf-row' }, SG.T.FORM_KEYS.filter(function (f) { return !SG.T.FORMS[f].t || SG.T.FORMS[f].t === u.t; }).map(function (f) {
              var F = SG.T.FORMS[f], ok = okF.indexOf(f) >= 0;
              return h('button', { class: 'bf' + (st.form === f ? ' on' : '') + (F.t ? ' troop' : ''), type: 'button', disabled: !ok || null, title: F.desc, onclick: function () { st.form = f; redraw(); } },
                [h('i', { text: F.h }), h('span', { text: F.n })]);
            })), h('p', { class: 'bf-desc', text: SG.T.FORMS[st.form].desc })]);
          }
          side.appendChild(h('div', { class: 'sec' }, [h('h4', { class: 'bt-cmd-h' }, ['명령', supTop]), acts, formsEl,
            h('p', { class: 'note', style: { marginTop: '8px' }, text: st.mode === 'move' ? '밝은 칸을 눌러 이동하세요. 제자리면 자기 칸을 누르세요.' :
              st.mode === 'attack' ? '공격 형태를 고르고 붉은 칸의 적을 누르세요.' : st.mode === 'duel' ? '붉은 칸의 적 장수에게 일기토를 신청합니다.' :
              (st.mode === 'fire' || st.mode === 'confuse') ? '금빛 칸의 적을 누르세요. 지력이 높을수록 성공합니다.' :
              st.mode === 'bribe' ? '금빛 칸(3칸 안)의 적 장수를 누르면 값과 성공률을 보여 줍니다. 충성이 낮을수록, 매력이 높을수록 잘 넘어옵니다. 실패하면 금 절반을 잃습니다.' : '' })]));
        }
      } else {
        side.appendChild(h('div', { class: 'panel-empty', html: myTurn() ? '<b>우리 부대를 누르세요.</b><br><br>· 이동 → 공격·계략·일기토 순서로 명령합니다.<br>· 공격군은 <b>本</b>(본성) 칸을 차지하면 이깁니다.<br>· 수비군은 30일을 버티거나 적을 물리치면 이깁니다.<br>· 성벽은 지나갈 수 없고 성문으로만 들어갈 수 있습니다.<br>· 적과 붙은 칸에 들어가면 멈춥니다.' : '적이 움직이는 중…' }));
      }
      ['atk', 'def'].forEach(function (sd) {
        var sec = h('div', { class: 'sec' }, [h('h4', null, [h('i', { class: 'side-dot', style: { background: fcol[sd] } }), (sd === 'atk' ? '공격 · ' : '수비 · ') + fname[sd] + (sd === me ? ' (우리)' : '')])]);
        var listEl = h('div', { class: 'bu-list' });
        B.units.filter(function (x) { return x.side === sd; }).forEach(function (x) {
          var row = h('button', { class: 'bu-row' + (x.n <= 0 ? ' gone' : '') + (st.sel === x ? ' on' : '') + (x.done && x.side === B.side && x.n > 0 ? ' done' : ''), type: 'button', disabled: x.n <= 0 || null, onclick: function () { if (x.n > 0) selectUnit(x); } }, [
            x.oid ? SG.UI.portrait(x.oid, 30, x.side === 'atk' ? atk.fid : def.fid) : h('span', { class: 'pt', style: { width: '30px', height: '30px', background: '#66706b', fontSize: '14px' } }, ['兵']),
            h('span', { class: 'bu-rn' }, [h('i', { class: 'bu-t t-' + x.t, text: SG.TROOPS[x.t].h }), x.name]),
            SG.UI.bar(Math.max(0, x.n), Math.max(1, x.max), sd === me ? 'g' : 'r'),
            h('span', { class: 'bu-rv', text: x.n > 0 ? SG.fmt(x.n) : '궤멸' })
          ]);
          listEl.appendChild(row);
        });
        sec.appendChild(listEl);
        side.appendChild(sec);
      });
    }
    var shownLog = 0, sayTimer = null, lastSay = '';
    // 말하기: u 가 있으면 그 장수 초상, 없으면 전령
    function say(u, text, sub) {
      var key = (u ? u.id : '-') + text;
      if (key === lastSay) return;
      lastSay = key;
      dlgFace.innerHTML = '';
      var fid = u ? (u.side === 'atk' ? atk.fid : def.fid) : null;
      dlgFace.appendChild(u && u.oid ? SG.UI.portrait(u.oid, 92, fid) : SG.UI.figure('soldier', 92));
      dlgFace.style.borderColor = u ? fcol[u.side] : '';
      dlgWho.innerHTML = '';
      dlgWho.appendChild(document.createTextNode(u ? u.name : '전령'));
      dlgWho.appendChild(h('small', { text: sub || (u ? fname[u.side] + (u.side === me ? ' · 아군' : ' · 적군') : B.day + '일째') }));
      dlgWho.style.background = u ? fcol[u.side] : '';
      var full = SG.josa(text), i = 0;
      if (sayTimer) clearInterval(sayTimer);
      dlgTxt.textContent = '';
      sayTimer = setInterval(function () {
        i += 3; dlgTxt.textContent = full.slice(0, i);
        if (i >= full.length) { clearInterval(sayTimer); sayTimer = null; }
      }, 16);
    }
    function speakerOf(line) {
      var best = null, at = 1e9;
      B.units.forEach(function (u) { var k = line.indexOf(u.name); if (u.oid && k >= 0 && k < at) { at = k; best = u; } });
      return best;
    }
    // 부대를 고르면 그 장수가 한마디 (화면 연출일 뿐, 전투 난수는 쓰지 않음)
    function voice(u) {
      var o = u.oid ? SG.O(u.oid) : null, low = u.n < (u.max || u.n) * 0.4, k = (B.day + u.id) % 2;
      if (!o) return '명령을 기다립니다.';
      if (u.side !== me) return o.war >= 85 ? '덤벼라! 내 창이 기다리고 있다!' : '쉽게 물러서지 않겠다.';
      if (u.done) return '이번 차례에 할 일은 마쳤습니다.';
      if (low) return ['병사들이 많이 지쳤습니다… 무리하지 마십시오.', '피해가 큽니다. 뒤로 물러나 숨을 고르는 것이 좋겠습니다.'][k];
      if (o.war >= 85) return ['적장의 목은 제가 가져오겠습니다!', '일기토라면 누구에게도 지지 않습니다!'][k];
      if (o.int >= 85) return ['적의 허점이 보입니다. 계책을 쓰시지요.', '바람이 좋습니다. 불을 놓으면 크게 이길 수 있습니다.'][k];
      if (o.lead >= 80) return ['대열은 갖추어졌습니다. 명령만 내리십시오.', '병사들의 사기가 높습니다. 어디로 가오리까?'][k];
      return ['명을 내려 주십시오.', '어디로 가오리까?'][k];
    }
    function drawLog() {
      var added = shownLog < B.log.length;
      for (; shownLog < B.log.length; shownLog++) {
        logEl.appendChild(h('div', { class: 'e' + (/궤멸|점령|일기토|화계|혼란/.test(B.log[shownLog]) ? ' war' : '') }, [h('span', { class: 'd', text: B.day + '일' }), B.log[shownLog]]));
      }
      logEl.scrollTop = logEl.scrollHeight;
      if (added) { var line = B.log[B.log.length - 1].trim(); say(speakerOf(line), line); }
      else if (!lastSay) say(null, (me === 'atk' ? '공격' : '수비') + ' 쪽입니다. 우리 부대를 눌러 명령을 내리십시오. ' + (me === 'atk' ? '성 가운데 「本」 칸을 차지하면 이깁니다.' : SG.T.DAYS + '일을 버티면 이깁니다.'));
    }
    function redraw() { drawDepot(); drawHi(); drawUnits(); drawTop(); drawSide(); drawLog(); turnBanner(); }

    // 세로 화면에서는 전장이 옆으로 길어 넘치므로, 고른 부대가 보이게 옆으로 밀어 준다
    function reveal(u) {
      if (!u || !SG.UI.isPortrait || !SG.UI.isPortrait()) return;
      var k = svgEl.getBoundingClientRect().width / W, x = at(u).x * k;
      if (x < stage.scrollLeft + 40 || x > stage.scrollLeft + stage.clientWidth - 40) stage.scrollTo({ left: x - stage.clientWidth / 2, behavior: 'smooth' });
    }
    function selectUnit(u) {
      st.sel = u; st.prev = null;
      reveal(u);
      st.mode = (u.side === me && myTurn() && !u.done) ? (u.moved ? 'idle' : 'move') : 'idle';
      redraw();
      say(u, voice(u));
    }
    function flash(u, text) { st.flash[u.id] = text; }

    async function onHex(c, r) {
      if (st.anim || B.over || !introDone) return;
      var u = st.sel, x = unitAt(c, r);
      if (!myTurn()) { if (x) selectUnit(x); return; }
      if (u && u.side === me && !u.done) {
        if (st.mode === 'move') {
          var k = SG.T.key(c, r), reach = SG.T.reachable(B, u);
          if (c === u.c && r === u.r) { st.mode = 'idle'; u.moved = true; st.prev = [c, r]; redraw(); return; }
          if (reach[k] !== undefined) { st.prev = [u.c, u.r]; SG.T.move(B, u, c, r); st.mode = 'idle'; redraw(); if (B.over) finish(); return; }
        }
        if (st.mode === 'attack' && x && SG.T.formTargets(B, u, st.form).indexOf(x) >= 0) {
          var before = x.n, ub = u.n; SG.T.attack(B, u, x, st.form); attackFx(u, x, before, st.form);
          (B.lastHits || []).forEach(function (hh) { if (hh.u !== x) flash(hh.u, '-' + SG.fmt(hh.dmg)); });
          flash(x, '-' + SG.fmt(before - x.n));
          if (st.form !== 'normal') flash(u, SG.T.FORMS[st.form].n + '!' + (ub > u.n ? ' -' + SG.fmt(ub - u.n) : ''));
          return afterAct();
        }
        if ((st.mode === 'fire' || st.mode === 'confuse') && x && SG.T.stratTargets(B, u).indexOf(x) >= 0) {
          var b2 = x.n; SG.T.strategy(B, u, x, st.mode);
          var okFire = b2 > x.n, okConf = x.conf > 0 && st.mode === 'confuse';
          SG.UI.sfx(okFire ? 'fire' : okConf ? 'confuse' : 'fail');
          if (okFire) { flames(x); if (x.n <= 0) broken(x); } else if (okConf) confuse(x);
          flash(x, okConf ? '혼란' : (okFire ? '-' + SG.fmt(b2 - x.n) : '실패'));
          return afterAct();
        }
        if (st.mode === 'bribe' && x && SG.T.bribeTargets(B, u).indexOf(x) >= 0) {
          var price = SG.T.bribePrice(B, x), pc = Math.round(SG.T.bribeChance(B, u, x) * 100), have = B.supply.gold[me];
          if (have < price) { SG.UI.toast('금이 모자랍니다 (필요 ' + SG.fmt(price) + ', 있음 ' + SG.fmt(have) + ')', true); return; }
          var go = await SG.UI.confirm('매수', SG.josa(x.name + '(충성 ' + SG.S.off[x.oid].loy + ')에게 금 ' + SG.fmt(price) + '을(를) 건넬까요?\n성공률 ' + pc + '% · 넘어오면 그 부대가 우리 편이 되고, 싸움이 끝나면 우리 세력에 들어옵니다.\n실패하면 금 ' + SG.fmt(Math.round(price / 2)) + '을(를) 잃습니다.'), '매수한다', '그만둔다');
          if (!go) return;
          SG.T.bribe(B, u, x);
          SG.UI.sfx(x.turned ? 'coin' : 'fail');
          flash(x, x.turned ? '매수!' : '거절');
          if (x.turned) confuse(x);
          return afterAct();
        }
        if (st.mode === 'duel' && x && SG.T.duelTargets(B, u).indexOf(x) >= 0) {
          var acc = SG.T.duelAccept(B, u, x);
          if (acc) SG.T.duel(B, u, x, true, await playDuel(u, x));
          else await showDuel(u, x, SG.T.duel(B, u, x, false), false);
          return afterAct();
        }
      }
      if (x) selectUnit(x);
    }
    async function afterAct() {
      st.sel = null; st.mode = 'idle'; st.prev = null;
      redraw();
      await SG.UI.sleep(550);
      st.flash = {};
      redraw();
      if (B.over) return finish();
      autoEndCheck();
    }
    function autoEndCheck() {
      if (!myTurn()) return;
      var left = SG.T.alive(B, me).filter(function (x) { return !x.done; });
      if (!left.length) endMyTurn();
    }
    function endMyTurn() {
      if (!myTurn()) return;
      st.sel = null; st.mode = 'idle';
      SG.T.endSide(B);
      redraw();
      if (B.over) return finish();
      runAI();
    }

    // ---- 일기토 연출: 몇 합을 주고받은 뒤 결과
    // ---- 직접 겨루는 일기토: 합마다 수를 고른다. mine = 우리 장수(왼쪽), foe = 적 장수. 끝나면 {winner, loser, fate} 또는 {draw}
    function playDuel(mine, foe) {
      return new Promise(function (done) {
        var D = SG.duelNew(mine.oid, foe.oid), busy = false;
        var ov = h('div', { class: 'duel' });
        function fighter(u, key) {
          var hp = h('i'), sp = h('i'), chip = h('div', { class: 'duel-chip' }), pop = h('div', { class: 'duel-pop' });
          var el = h('div', { class: 'duel-f ' + key, style: { borderColor: fcol[u.side] } }, [
            h('div', { class: 'duel-imgw' }, [h('img', { alt: u.name, src: SG.UI.portraitSrc(u.oid) }), chip, pop]),
            h('div', { class: 'duel-n' }, [h('b', { text: u.name }), h('span', { text: fname[u.side] + ' · 무력 ' + u.war + (u.sk ? ' · ' + u.sk : '') })]),
            h('div', { class: 'duel-hp' }, [hp]), h('div', { class: 'duel-sp' }, [sp, h('small', { text: '기세' })])
          ]);
          el._hp = hp; el._sp = sp; el._chip = chip; el._pop = pop;
          return el;
        }
        var fa = fighter(mine, 'l'), fd = fighter(foe, 'r');
        var line = h('div', { class: 'duel-line', text: mine.name + '와(과) ' + foe.name + '이(가) 진 앞으로 나섰다! 수를 고르십시오.' });
        var round = h('div', { class: 'duel-round', text: '1합' });
        var acts = h('div', { class: 'duel-acts' });
        var legend = h('div', { class: 'duel-legend', text: '攻 공격은 氣 기합을 끊고 · 猛 강공은 攻 공격을 누르고 · 守 방어는 猛 강공을 막아 되친다 · 必 필살(기세 60)은 다 뚫는다' });
        var box = h('div', { class: 'duel-box live' }, [h('div', { class: 'duel-title', text: '일기토' }),
          h('div', { class: 'duel-stage' }, [fa, h('div', { class: 'duel-vs' }, [round, h('span', { text: '對' })]), fd]), line, acts, legend]);
        ov.appendChild(box);
        root.appendChild(ov);
        SG.UI.sfx('duel');
        function upd() {
          fa._hp.style.width = D.f[0].hp + '%'; fd._hp.style.width = D.f[1].hp + '%';
          fa._sp.style.width = D.f[0].sp + '%'; fd._sp.style.width = D.f[1].sp + '%';
          fa.classList.toggle('charged', D.f[0].sp >= 60); fd.classList.toggle('charged', D.f[1].sp >= 60);
        }
        function drawActs() {
          acts.innerHTML = '';
          ['atk', 'power', 'guard', 'focus', 'special', 'retreat'].forEach(function (k) {
            var A0 = SG.DUEL_ACTS[k], off = k === 'special' && D.f[0].sp < 60;
            acts.appendChild(h('button', { type: 'button', class: 'duel-act a-' + k, title: A0.desc, disabled: off || busy || null, onclick: function () { choose(k); } },
              [h('i', { text: A0.h }), h('span', { text: A0.n })]));
          });
        }
        function showChip(el, k) {
          el._chip.textContent = SG.DUEL_ACTS[k].h + ' ' + SG.DUEL_ACTS[k].n;
          el._chip.className = 'duel-chip on a-' + k;
        }
        function popDmg(el, n) {
          if (!n) return;
          el._pop.textContent = '-' + n; el._pop.className = 'duel-pop'; void el._pop.offsetWidth; el._pop.className = 'duel-pop on';
          el.classList.remove('struck'); void el.offsetWidth; el.classList.add('struck');
        }
        function choose(k) {
          if (busy || D.over) return;
          busy = true; drawActs();
          var ai = SG.duelAI(D, 1), res = SG.duelRound(D, [k, ai]);
          showChip(fa, res.acts[0]); showChip(fd, res.acts[1]);
          box.classList.remove('clash'); void box.offsetWidth; if (res.dmg[0] || res.dmg[1]) box.classList.add('clash');
          SG.UI.sfx(res.acts.indexOf('special') >= 0 ? 'broken' : res.dmg[0] || res.dmg[1] ? 'clash' : 'click');
          setTimeout(function () {
            popDmg(fa, res.dmg[0]); popDmg(fd, res.dmg[1]); upd();
            line.textContent = SG.josa(res.text);
            if (D.over) return finishDuel();
            round.textContent = (D.round + 1) + '합';
            if (D.f[1].sp >= 60) line.textContent += ' — ' + SG.josa(foe.name + '의 기세가 차올랐다! 필살을 조심하라.');
            busy = false; drawActs();
          }, 420);
        }
        function finishDuel() {
          var R = D.over;
          acts.innerHTML = ''; acts.classList.add('end'); legend.remove();
          round.textContent = '';
          line.innerHTML = '';
          if (R.draw) line.appendChild(h('b', { text: '무승부 — 승부가 나지 않았다' }));
          else {
            var meWon = R.winner === mine.oid;
            (meWon ? fd : fa).classList.add('lost'); (meWon ? fa : fd).classList.add('won');
            line.appendChild(h('b', { text: SG.name(R.winner) + ' 승리!' }));
            line.appendChild(document.createTextNode(' ' + SG.josa(SG.name(R.loser) + '은(는) ' + SG.DUEL_FATE[R.fate] + '.')));
            SG.UI.sfx(meWon ? 'win' : 'lose');
          }
          acts.appendChild(h('button', { class: 'btn primary', type: 'button', text: '확인', onclick: function () { ov.remove(); done(R); } }));
        }
        upd(); drawActs();
      });
    }
    function showDuel(a, d, res, accepted) {
      return new Promise(function (done) {
        var ov = h('div', { class: 'duel' });
        function closeIt() { if (ov.parentNode) ov.remove(); done(); }
        if (!accepted) {
          ov.appendChild(h('div', { class: 'duel-box refuse' }, [
            h('div', { class: 'duel-title', text: '일기토' }),
            h('p', { text: d.name + '이(가) 일기토를 피했습니다. ' + fname[d.side] + ' 병사들의 사기가 떨어집니다.' }),
            h('button', { class: 'btn primary', text: '확인', onclick: closeIt })
          ]));
          root.appendChild(ov);
          return;
        }
        SG.UI.sfx('duel');
        var hp = { a: 100, d: 100 };
        function fighter(u, key) {
          var bar = h('i');
          var el = h('div', { class: 'duel-f ' + key, style: { borderColor: fcol[u.side] } }, [
            h('img', { alt: u.name, src: SG.UI.portraitSrc(u.oid) }),
            h('div', { class: 'duel-n' }, [h('b', { text: u.name }), h('span', { text: fname[u.side] + ' · 무력 ' + u.war })]),
            h('div', { class: 'duel-hp' }, [bar])
          ]);
          el._bar = bar;
          return el;
        }
        var fa = fighter(a, 'l'), fd = fighter(d, 'r');
        var line = h('div', { class: 'duel-line', text: '두 장수가 진 앞으로 나선다!' });
        var round = h('div', { class: 'duel-round', text: '' });
        var skip = h('button', { class: 'btn small duel-skip', text: '건너뛰기' });
        var box = h('div', { class: 'duel-box' }, [h('div', { class: 'duel-title', text: '일기토' }), h('div', { class: 'duel-stage' }, [fa, h('div', { class: 'duel-vs' }, [round, h('span', { text: '對' })]), fd]), line, skip]);
        ov.appendChild(box);
        root.appendChild(ov);
        var aWins = res.winner === a.oid;
        var rounds = 4 + Math.floor(Math.random() * 3), i = 0, timer = null, ended = false;
        function upd() { fa._bar.style.width = hp.a + '%'; fd._bar.style.width = hp.d + '%'; }
        upd();
        function ending() {
          if (ended) return; ended = true;
          clearInterval(timer);
          if (aWins) hp.d = res.fate === 'fled' ? 18 : 0; else hp.a = res.fate === 'fled' ? 18 : 0;
          upd();
          (aWins ? fd : fa).classList.add('lost'); (aWins ? fa : fd).classList.add('won');
          round.textContent = '';
          line.innerHTML = '';
          line.appendChild(h('b', { text: SG.name(res.winner) + ' 승리!' }));
          line.appendChild(document.createTextNode(' ' + SG.josa(SG.name(res.loser) + '은(는) ' + SG.DUEL_FATE[res.fate] + '.')));
          SG.UI.sfx(aWins === (a.side === me) ? 'win' : 'lose');
          skip.textContent = '확인'; skip.classList.add('primary');
          skip.onclick = closeIt;
        }
        skip.onclick = ending;
        timer = setInterval(function () {
          i++;
          if (i > rounds) return ending();
          round.textContent = i + '합';
          var hitA = Math.random() < (aWins ? 0.62 : 0.38);
          var dmg = 8 + Math.floor(Math.random() * 12);
          if (hitA) hp.d = Math.max(aWins ? 12 : 30, hp.d - dmg); else hp.a = Math.max(aWins ? 30 : 12, hp.a - dmg);
          upd();
          var who = hitA ? fd : fa;
          who.classList.remove('struck'); void who.offsetWidth; who.classList.add('struck');
          box.classList.remove('clash'); void box.offsetWidth; box.classList.add('clash');
          var tpl = SG.UI.DUEL_LINES[Math.floor(Math.random() * SG.UI.DUEL_LINES.length)];
          var A = hitA ? a : d, D = hitA ? d : a;
          line.textContent = SG.josa(tpl.replace(/\{a\}/g, A.name).replace(/\{d\}/g, D.name));
          SG.UI.sfx('clash');
        }, 650);
      });
    }

    async function runAI() {
      st.anim = true;
      while (!B.over && (B.side !== me || st.auto)) {
        redraw();
        await SG.UI.sleep(st.auto ? 120 : 450);
        var list = SG.T.alive(B, B.side).filter(function (u) { return !u.done; });
        list.sort(function (a, b) { return SG.T.dist([a.c, a.r], [SG.T.CASTLE.c, SG.T.CASTLE.r]) - SG.T.dist([b.c, b.r], [SG.T.CASTLE.c, SG.T.CASTLE.r]); });
        for (var i = 0; i < list.length && !B.over; i++) {
          var u = list[i];
          if (u.n <= 0 || u.done) continue;
          var before = {};
          SG.T.alive(B).forEach(function (x) { before[x.id] = x.n; });
          var ev = SG.T.aiAct(B, u);
          for (var j = 0; j < ev.length; j++) {
            var e = ev[j];
            if (e.type === 'attack') attackFx(e.u, e.t, before[e.t.id], e.form);
            if (e.type === 'strat') {
              var fireOk = /화계!/.test(e.msg), confOk = /혼란에 빠졌다/.test(e.msg);
              SG.UI.sfx(fireOk ? 'fire' : confOk ? 'confuse' : 'fail');
              if (fireOk) { flames(e.t); if (e.t.n <= 0) broken(e.t); } else if (confOk) confuse(e.t);
            }
            if (e.type === 'bribe') { SG.UI.sfx(e.ok ? 'coin' : 'fail'); flash(e.t, e.ok ? '매수!' : '거절'); if (e.ok) confuse(e.t); }
            if (e.type === 'duel') {
              var acc = true;
              if (e.ask && !st.auto) {
                acc = await SG.UI.confirm('일기토 신청', u.name + '(무력 ' + u.war + ')이(가) ' + e.t.name + '(무력 ' + e.t.war + ')에게 일기토를 신청했습니다!\n받아들일까요? (피하면 사기가 떨어집니다)', '받아들인다', '피한다');
              } else if (e.ask) acc = SG.T.duelAccept(B, u, e.t);
              if (e.ask && !st.auto && acc) e.res = SG.T.duel(B, u, e.t, true, await playDuel(e.t, u)); // 우리 장수가 직접 겨룬다
              else {
                if (e.ask) e.res = SG.T.duel(B, u, e.t, acc);
                if (!st.auto || !e.ask) await showDuel(u, e.t, e.res, e.res && !e.res.refused);
              }
            }
          }
          u.done = true;
          SG.T.alive(B).concat(B.units.filter(function (x) { return x.n <= 0; })).forEach(function (x) {
            if (before[x.id] !== undefined && before[x.id] > x.n) flash(x, '-' + SG.fmt(before[x.id] - x.n));
          });
          st.sel = u;
          redraw();
          await SG.UI.sleep(st.auto ? 110 : 520);
          st.flash = {};
        }
        st.sel = null;
        if (!B.over) SG.T.endSide(B);
      }
      st.anim = false;
      redraw();
      if (B.over) finish();
    }

    // ---- 시작 대치 화면
    var introDone = false;
    function intro() {
      function side(sd, units) {
        var list = units.filter(function (u) { return u.oid; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 3);
        return h('div', { class: 'intro-side ' + sd, style: { background: 'linear-gradient(' + (sd === 'atk' ? '90deg' : '270deg') + ', ' + fcol[sd] + ' 0%, transparent 92%)' } }, [
          h('div', { class: 'intro-role', text: (sd === 'atk' ? '공격' : '수비') + (sd === me ? ' · 우리' : '') }),
          h('div', { class: 'intro-name', text: fname[sd] }),
          h('div', { class: 'intro-faces' }, list.map(function (u) { return h('img', { alt: u.name, title: u.name, src: SG.UI.portraitSrc(u.oid) }); })),
          h('div', { class: 'intro-n', text: '병사 ' + SG.fmt(sum(sd)) })
        ]);
      }
      var ov = h('div', { class: 'intro' }, [
        side('atk', SG.T.alive(B, 'atk')),
        h('div', { class: 'intro-mid' }, [h('div', { class: 'intro-city', text: SG.cityName(B.city) }), h('div', { class: 'intro-vs', text: '對' }), h('div', { class: 'intro-sub', text: '공방전 · ' + SG.T.DAYS + '일' })]),
        side('def', SG.T.alive(B, 'def'))
      ]);
      function go() {
        if (introDone) return;
        introDone = true;
        ov.classList.add('out');
        setTimeout(function () { ov.remove(); redraw(); reveal(SG.T.alive(B, me)[0]); if (B.side !== me) runAI(); }, 350);
      }
      ov.addEventListener('click', go);
      root.appendChild(ov);
      SG.UI.sfx('march');
      setTimeout(go, 2200);
    }

    // ---- 끝: 승패 인장 → 결과
    var finished = false;
    async function finish() {
      if (finished) return;
      finished = true;
      redraw();
      var won = B.over === me;
      SG.UI.sfx(won ? 'win' : 'lose');
      var stamp = h('div', { class: 'bt-stamp ' + (won ? 'win' : 'lose'), text: won ? '勝' : '敗' });
      field.appendChild(stamp);
      await SG.UI.sleep(1300);
      var remA = sum('atk'), remD = sum('def');
      var body = h('div', { class: 'bt-result' }, [
        h('p', { class: 'bt-res-main', text: B.over === 'atk' ? SG.josa(fname.atk + ' 세력이 ' + SG.cityName(B.city) + '을(를) 함락했습니다.') : SG.josa(fname.def + ' 세력이 ' + SG.cityName(B.city) + '을(를) 지켜냈습니다.') })
      ].concat(['atk', 'def'].map(function (sd) {
          var all = B.units.filter(function (u) { return u.side === sd; });
          var start = all.reduce(function (s, u) { return s + u.max; }, 0), left = sd === 'atk' ? remA : remD;
          return h('div', { class: 'bt-res-row' }, [h('i', { class: 'side-dot', style: { background: fcol[sd] } }), h('span', { class: 'bt-res-n', text: fname[sd] }),
            SG.UI.bar(left, Math.max(1, start), sd === me ? 'g' : 'r'), h('span', { class: 'note', text: SG.fmt(left) + ' / ' + SG.fmt(start) })]);
        })).concat([
        B.depotLost ? h('p', { class: 'bt-res-why', text: '보급대(粮)를 빼앗겨 공격군이 무너졌습니다. 챙겨 간 군량·금은 수비군 손에 들어갑니다.' }) : null,
        B.supplyOut ? h('p', { class: 'bt-res-why', text: '군량이 떨어져 공격군이 물러났습니다.' }) : null,
        B.turned && B.turned.length ? h('p', { class: 'note', text: '매수로 편을 바꾼 장수: ' + B.turned.map(function (t) { return SG.name(t.oid) + '(→' + fname[t.to] + ')'; }).join(', ') }) : null,
        h('p', { class: 'note', text: B.day + '일 동안 싸움' + (B.captured.length ? ' · 사로잡힌 장수: ' + B.captured.map(function (c) { return SG.name(c.oid); }).join(', ') : '') +
          (B.supply && !B.depotLost ? ' · 남은 군량 ' + SG.fmt(B.supply.food) + '·금 ' + SG.fmt(B.supply.gold.atk) + (B.over === 'atk' ? ' (차지한 도시로)' : ' (집으로)') : '') })
      ]));
      await SG.UI.modal({ title: won ? '승리' : '패배', size: 'narrow', cancel: true, body: body });
      root.parentNode.removeChild(root);
      SG.UI.music('map');
      resolve(SG.T.result(B));
    }

    root._B = B; root._duel = showDuel; // 화면 검사용
    redraw();
    intro();
  });
};
