// 중국 지도 그리기 (SVG): 실제 지형 그림 위에 세력 영토·강·호수·해안선·길·성. 마우스 휠로 확대, 끌어서 이동.
var SG = SG || {};
var NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs, parent) {
  var e = document.createElementNS(NS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
// opt: {onClick(cid), onHover, interactive, selected}
SG.UI.Map = function (container, opt) {
  this.opt = opt || {};
  this.wrap = container;
  this.vb = { x: 20, y: 40, w: 990, h: 790 };
  this.selected = null;
  this.build();
};
SG.UI.Map.prototype.build = function () {
  var self = this;
  this.wrap.innerHTML = '';
  var root = svg('svg', { viewBox: '0 0 ' + SG.MAP_W + ' ' + SG.MAP_H, preserveAspectRatio: 'xMidYMid meet' });
  this.svg = root;
  var defs = svg('defs', {}, root);
  var sh = svg('filter', { id: 'shadow', x: '-20%', y: '-20%', width: '140%', height: '160%' }, defs);
  svg('feDropShadow', { dx: 0, dy: 1.5, stdDeviation: 1.2, 'flood-opacity': 0.35 }, sh);

  svg('rect', { x: -2000, y: -2000, width: SG.MAP_W + 4000, height: SG.MAP_H + 4000, class: 'm-land' }, root);
  // 실제 지형 그림 (밝은/어두운 화면용 두 장, CSS 로 하나만 보임) + 강·호수·해안선 (js/data/geo.js)
  var G = SG.GEO, im = G.image;
  [['img/map-terrain.jpg', 'l'], ['img/map-terrain-dark.jpg', 'd']].forEach(function (t) {
    var e = svg('image', { x: im.x, y: im.y, width: im.w, height: im.h, preserveAspectRatio: 'none', class: 'm-terrain ' + t[1] }, root);
    e.setAttribute('href', t[0]);
  });
  // 세력 영토 (update 때 그림을 새로 만든다)
  this.terr = svg('image', { x: SG.LANDMASK ? SG.LANDMASK.x0 : 0, y: SG.LANDMASK ? SG.LANDMASK.y0 : 0, width: 1, height: 1, preserveAspectRatio: 'none', class: 'm-terr' }, root);
  [3, 2, 1].forEach(function (k) { svg('path', { d: G.rivers[k - 1], class: 'm-river r' + k }, root); });
  svg('path', { d: G.lakes, class: 'm-lake' }, root);
  svg('path', { d: G.coast, class: 'm-coast' }, root);
  // 주(州) 이름
  var provs = {};
  SG.CITY_LIST.forEach(function (c) {
    var key = c.prov + (c.prov === '양주' ? (c.lon > 110 ? 'E' : 'W') : '');
    (provs[key] = provs[key] || { n: c.prov, xs: [], ys: [] });
    provs[key].xs.push(c.x); provs[key].ys.push(c.y);
  });
  Object.keys(provs).forEach(function (k) {
    var p = provs[k], x = p.xs.reduce(function (a, b) { return a + b; }) / p.xs.length, y = p.ys.reduce(function (a, b) { return a + b; }) / p.ys.length;
    var t = svg('text', { x: x, y: y + 34, 'text-anchor': 'middle', class: 'm-prov', 'pointer-events': 'none' }, root);
    t.textContent = p.n;
  });
  // 강·호수 이름
  G.riverLabels.forEach(function (l) {
    var t = svg('text', { x: l.x, y: l.y, class: 'm-river-lbl', 'text-anchor': 'middle', 'pointer-events': 'none',
      transform: 'rotate(' + l.a + ' ' + l.x + ' ' + l.y + ')' }, root);
    t.textContent = l.n;
  });
  G.lakeLabels.forEach(function (l) {
    var t = svg('text', { x: l.x, y: l.y, class: 'm-river-lbl lake', 'text-anchor': 'middle', 'pointer-events': 'none' }, root);
    t.textContent = l.n;
  });
  // 길: 어두운 바탕 줄 + 밝은 점선 (흙길 느낌)
  this.roadEls = {};
  var gRoads = svg('g', {}, root);
  SG.ROADS.forEach(function (r) {
    var a = SG.CITIES[r[0]], b = SG.CITIES[r[1]];
    var rg = svg('g', { class: 'road-g' }, gRoads);
    svg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'road-c' }, rg);
    svg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'road' }, rg);
    self.roadEls[r[0] + '|' + r[1]] = rg;
  });
  // 도시: 크기별 성 그림 (작은 성=망루, 보통 성=성문·각루, 큰 성=누각) + 병력 현판 + 깃발
  this.cityEls = {};
  this.gCities = svg('g', {}, root);
  SG.CITY_LIST.forEach(function (c) {
    var g = svg('g', { class: 'city-g sz' + c.size, transform: 'translate(' + c.x + ',' + c.y + ')' }, self.gCities);
    var k = [0, 0.86, 1, 1.18][c.size], W = 36 * k, top = self.castle(g, c.size, k);
    g._w = W; g._h = 16 * k;
    var pl = svg('g', { class: 'plaque' }, g);
    svg('rect', { x: -14, y: -3 * k - 6, width: 28, height: 11, rx: 1.5, class: 'base' }, pl);
    var sol = svg('text', { x: 0, y: -3 * k + 2.6, 'text-anchor': 'middle', class: 'soldier' }, pl);
    // 깃발
    var fl = svg('g', { class: 'flag-g', transform: 'translate(0,' + top + ')' }, g);
    svg('line', { x1: 0, y1: 0, x2: 0, y2: -13, class: 'pole' }, fl);
    svg('path', { d: 'M0.5,-13 Q6,-14.5 12,-12.5 L9.5,-9.5 L12,-6.5 Q6,-8.5 0.5,-7 Z', class: 'flag' }, fl);
    var cap = svg('text', { x: -4, y: top - 6, 'text-anchor': 'end', class: 'cap' }, g);
    var lbl = svg('text', { x: 0, y: 6 * k + 15, 'text-anchor': 'middle', class: 'lbl' }, g);
    lbl.textContent = c.n;
    g._sol = sol; g._cap = cap;
    g.addEventListener('click', function (e) { e.stopPropagation(); if (!self.dragged && self.opt.onClick) self.opt.onClick(c.id); });
    g.addEventListener('mouseenter', function (e) { if (!SG.UI.isTouch()) self.showTip(c.id, e); });
    g.addEventListener('mousemove', function (e) { self.moveTip(e); });
    g.addEventListener('mouseleave', function () { self.tip.style.display = 'none'; });
    self.cityEls[c.id] = g;
  });
  this.wrap.appendChild(root);
  // 분위기: 흘러가는 구름 그림자, 테두리, 나침반, 확대 단추, 제목 두루마리
  this.wrap.appendChild(h('div', { class: 'map-season' }));
  this.wrap.appendChild(h('div', { class: 'map-clouds' }, [h('i', { class: 'c1' }), h('i', { class: 'c2' }), h('i', { class: 'c3' })]));
  this.wrap.appendChild(h('div', { class: 'map-frame' }, [h('i', { class: 'tl' }), h('i', { class: 'tr' }), h('i', { class: 'bl' }), h('i', { class: 'br' })]));
  this.wrap.appendChild(h('div', { class: 'map-compass', html: SG.UI.COMPASS }));
  this.cart = h('div', { class: 'map-cart' });
  this.wrap.appendChild(this.cart);
  this.wrap.appendChild(h('div', { class: 'map-zoom' }, [
    h('button', { type: 'button', title: '확대', text: '+', onclick: function () { self.zoomBy(1 / 1.3); } }),
    h('button', { type: 'button', title: '축소', text: '−', onclick: function () { self.zoomBy(1.3); } }),
    h('button', { type: 'button', title: '전체 보기', class: 'fit', text: '全', onclick: function () { self.fit(); } })
  ]));
  this.tip = h('div', { class: 'map-tip' });
  this.wrap.appendChild(this.tip);
  this.legend = h('div', { class: 'map-legend' });
  this.wrap.appendChild(this.legend);
  this.applyVB();
  this.bindPanZoom();
  this.update();
  var me = this;
  requestAnimationFrame(function () {
    if (SG.UI.isCompact && SG.UI.isCompact()) me.home(SG.S && SG.S.player && SG.S.forces[SG.S.player] && SG.S.forces[SG.S.player].capital);
  });
};
SG.UI.Map.prototype.applyVB = function () {
  var v = this.vb;
  this.svg.setAttribute('viewBox', v.x + ' ' + v.y + ' ' + v.w + ' ' + v.h);
};
SG.UI.Map.prototype.bindPanZoom = function () {
  // 마우스 휠 확대, 끌어서 이동, 폰에서는 한 손가락으로 이동·두 손가락으로 확대
  var self = this, pts = {}, drag = null, pinch = null;
  this.svg.style.touchAction = 'none';
  function scaleOf() { var r = self.svg.getBoundingClientRect(); return { r: r, s: Math.min(r.width / self.vb.w, r.height / self.vb.h) }; }
  function toMap(cx, cy, vb, sc) {
    var ox = (sc.r.width - vb.w * sc.s) / 2, oy = (sc.r.height - vb.h * sc.s) / 2;
    return { x: vb.x + (cx - sc.r.left - ox) / sc.s, y: vb.y + (cy - sc.r.top - oy) / sc.s };
  }
  this.svg.addEventListener('wheel', function (e) {
    e.preventDefault();
    var sc = scaleOf(), m = toMap(e.clientX, e.clientY, self.vb, sc);
    var f = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    var nw = SG.clamp(self.vb.w * f, 300, 1200), k = nw / self.vb.w;
    self.vb.x = m.x - (m.x - self.vb.x) * k; self.vb.y = m.y - (m.y - self.vb.y) * k;
    self.vb.w = nw; self.vb.h = self.vb.h * k;
    self.applyVB();
  }, { passive: false });
  this.svg.addEventListener('pointerdown', function (e) {
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pts);
    if (ids.length === 1) { drag = { x: e.clientX, y: e.clientY, vx: self.vb.x, vy: self.vb.y, slop: e.pointerType === 'mouse' ? 4 : 10 }; self.dragged = false; }
    else if (ids.length === 2) {
      var a = pts[ids[0]], b = pts[ids[1]], sc = scaleOf();
      var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, vb: { x: self.vb.x, y: self.vb.y, w: self.vb.w, h: self.vb.h }, anchor: toMap(mid.x, mid.y, self.vb, sc), sc: sc };
      drag = null; self.dragged = true;
    }
  });
  window.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId]) return;
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pts);
    if (pinch && ids.length >= 2) {
      var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      var nw = SG.clamp(pinch.vb.w * pinch.d / d, 300, 1200), k = nw / pinch.vb.w;
      var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, s2 = pinch.sc.s / k;
      var ox = (pinch.sc.r.width - nw * s2) / 2, oy = (pinch.sc.r.height - pinch.vb.h * k * s2) / 2;
      self.vb.w = nw; self.vb.h = pinch.vb.h * k;
      self.vb.x = pinch.anchor.x - (mid.x - pinch.sc.r.left - ox) / s2;
      self.vb.y = pinch.anchor.y - (mid.y - pinch.sc.r.top - oy) / s2;
      self.applyVB();
      return;
    }
    if (!drag) return;
    var sc2 = scaleOf();
    if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > drag.slop) self.dragged = true;
    if (!self.dragged) return;
    self.vb.x = drag.vx - (e.clientX - drag.x) / sc2.s; self.vb.y = drag.vy - (e.clientY - drag.y) / sc2.s;
    self.applyVB();
  });
  function up(e) {
    if (!pts[e.pointerId]) return;
    delete pts[e.pointerId];
    var n = Object.keys(pts).length;
    if (n < 2) pinch = null;
    if (n === 1) { var id = Object.keys(pts)[0]; drag = { x: pts[id].x, y: pts[id].y, vx: self.vb.x, vy: self.vb.y, slop: 0 }; }
    if (n === 0) { drag = null; setTimeout(function () { self.dragged = false; }, 0); }
  }
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  this.svg.addEventListener('click', function () { if (!self.dragged && self.opt.onBlank) self.opt.onBlank(); });
};
SG.UI.Map.prototype.fit = function () {
  // 넓고 낮은 화면(폰 가로)에서는 화면 비율에 맞춰 위아래를 조금 잘라 양옆이 비지 않게 한다
  var r = this.svg && this.svg.getBoundingClientRect(), asp = r && r.height ? r.width / r.height : 990 / 790;
  if (asp > 1.4) { var w = Math.min(1200, 790 * asp), hh = w / asp; this.vb = { x: 515 - w / 2, y: 435 - hh / 2, w: w, h: hh }; }
  else this.vb = { x: 20, y: 40, w: 990, h: 790 };
  this.applyVB();
};
// 작은 화면: 전체 보기 후 그 도시로. 세로 화면은 지도 칸이 작으므로 그 도시 둘레를 확대해서 보여 준다
SG.UI.Map.prototype.home = function (cid) {
  this.fit();
  var C = cid && SG.CITIES[cid];
  if (!C) return;
  if (SG.UI.isPortrait && SG.UI.isPortrait()) { this.zoomBy(560 / this.vb.w); this.vb.x = C.x - this.vb.w / 2; this.vb.y = C.y - this.vb.h / 2; this.applyVB(); }
  else this.focus(cid);
};
// 도시가 화면 가장자리 밖이면 그 도시가 가운데 오도록 옮긴다 (확대 정도는 그대로)
SG.UI.Map.prototype.focus = function (cid) {
  var C = SG.CITIES[cid], v = this.vb;
  if (!C) return;
  if (C.x > v.x + v.w * 0.12 && C.x < v.x + v.w * 0.88 && C.y > v.y + v.h * 0.12 && C.y < v.y + v.h * 0.88) return;
  v.x = C.x - v.w / 2; v.y = C.y - v.h / 2;
  this.applyVB();
};
SG.UI.Map.prototype.pan = function (dx, dy) { this.vb.x += this.vb.w * dx; this.vb.y += this.vb.h * dy; this.applyVB(); };
SG.UI.Map.prototype.zoomBy = function (f) {
  var v = this.vb, cx = v.x + v.w / 2, cy = v.y + v.h / 2;
  var nw = SG.clamp(v.w * f, 300, 1200), k = nw / v.w;
  v.w = nw; v.h *= k; v.x = cx - v.w / 2; v.y = cy - v.h / 2;
  this.applyVB();
};

// 성 그림. 기준 크기(보통 성)로 그리고 k 배로 줄이거나 키운다. 깃대가 꽂힐 높이를 돌려준다.
SG.UI.Map.prototype.castle = function (g, size, k) {
  svg('ellipse', { cx: 0, cy: 7 * k, rx: 18 * k + 9, ry: 6 * k + 3, class: 'ring' }, g);
  svg('ellipse', { cx: 2, cy: 6.5 * k, rx: 18 * k + 5, ry: 4 * k, class: 'gshadow' }, g);
  var b = svg('g', { class: 'castle', transform: 'scale(' + k + ')' }, g), top;
  function roof(x, y, w, hgt) { // 처마가 살짝 들린 지붕
    svg('path', { d: 'M' + (x - w / 2 - 2) + ',' + y + ' L' + (x - w / 2 + 2) + ',' + (y - hgt) + ' L' + (x + w / 2 - 2) + ',' + (y - hgt) +
      ' L' + (x + w / 2 + 2) + ',' + y + ' Q' + x + ',' + (y - 2.2) + ' ' + (x - w / 2 - 2) + ',' + y + ' Z', class: 'roof' }, b);
  }
  if (size === 3) {        // 2층 누각
    svg('rect', { x: -7, y: -23, width: 14, height: 14, class: 'stone' }, b);
    roof(0, -22, 22, 5.5);
    svg('rect', { x: -4.5, y: -33, width: 9, height: 6, class: 'stone' }, b);
    roof(0, -32, 15, 5);
    top = -37;
  }
  if (size >= 2) {         // 모서리 각루
    [-17, 17].forEach(function (x) {
      svg('rect', { x: x - 4, y: -15, width: 8, height: 21, class: 'stone' }, b);
      roof(x, -14.5, 10, 4.5);
    });
  }
  svg('rect', { x: -18, y: -10, width: 36, height: 16, class: 'wall' }, b);
  for (var i = 0; i < 7; i++) svg('rect', { x: -16.5 + i * 5.1, y: -12.6, width: 2.8, height: 2.8, class: 'crn' }, b);
  if (size === 2) {        // 성문 위 문루
    svg('rect', { x: -6.5, y: -17, width: 13, height: 7, class: 'stone' }, b);
    roof(0, -16.5, 16, 5);
    top = -21.5;
  } else if (size === 1) { // 망루
    svg('rect', { x: -4, y: -16, width: 8, height: 6, class: 'stone' }, b);
    svg('path', { d: 'M-7.5,-15.5 L0,-21 L7.5,-15.5 Q0,-17.5 -7.5,-15.5 Z', class: 'roof' }, b);
    top = -21;
  }
  svg('path', { d: 'M-4,6 L-4,3 Q0,0 4,3 L4,6 Z', class: 'gate' }, b);
  return top * k;
};

// 세력 영토: 육지 칸마다 가장 가까운 도시(큰 성일수록 넓게)의 주인 색. 경계는 진하게.
SG.UI.Map.prototype.drawTerritory = function () {
  var S = SG.S, L = SG.LANDMASK;
  if (!L || !this.terr) return;
  var sig = SG.CITY_LIST.map(function (c) { var o = S.cities[c.id].owner; return o ? o + S.forces[o].color : '-'; }).join(',');
  if (sig === this._terrSig) return;
  this._terrSig = sig;
  if (!SG.UI._land) {
    var raw = atob(L.bits), n = L.w * L.h, land = new Uint8Array(n);
    for (var i = 0; i < n; i++) land[i] = (raw.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
    SG.UI._land = land;
  }
  var land = SG.UI._land, R = 2, CW = L.w * R, CH = L.h * R, u = L.step / R;
  function rgb(hex) { hex = hex.replace('#', ''); return [parseInt(hex.substr(0, 2), 16), parseInt(hex.substr(2, 2), 16), parseInt(hex.substr(4, 2), 16)]; }
  var pal = {}, cs = SG.CITY_LIST.map(function (c) {
    var o = S.cities[c.id].owner;
    if (o && !pal[o]) { var col = S.forces[o].color; pal[o] = { f: rgb(col), d: rgb(SG.UI.shade(col, -45)) }; }
    return { x: c.x, y: c.y, o: o, w: c.size * 7, reach: 100 + c.size * 12 };
  });
  var cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  var ctx = cv.getContext('2d'), img = ctx.createImageData(CW, CH), D = img.data;
  function landAt(mx, my) { // 이웃 네 칸 섞어 해안을 부드럽게
    var fx = (mx - L.x0) / L.step - 0.5, fy = (my - L.y0) / L.step - 0.5;
    var x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    function g(x, y) { return x < 0 || y < 0 || x >= L.w || y >= L.h ? 0 : land[y * L.w + x]; }
    return (g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx) * (1 - ty) + (g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx) * ty;
  }
  for (var py = 0; py < CH; py++) {
    var my = L.y0 + (py + 0.5) * u;
    var near = cs.filter(function (c) { return Math.abs(c.y - my) < c.reach + 40; });
    if (!near.length) continue;
    for (var px = 0; px < CW; px++) {
      var mx = L.x0 + (px + 0.5) * u;
      var lv = landAt(mx, my);
      if (lv <= 0) continue;
      var b1 = null, e1 = 1e9, d1 = 0, e2 = 1e9, o2;
      for (var j = 0; j < near.length; j++) {
        var c = near[j], dx = c.x - mx;
        if (dx > c.reach + 40 || dx < -c.reach - 40) continue;
        var dy = c.y - my, d = Math.sqrt(dx * dx + dy * dy), e = d - c.w;
        if (e < e1) { if (b1 && b1.o !== c.o) { e2 = e1; o2 = b1.o; } e1 = e; b1 = c; d1 = d; }
        else if (e < e2 && c.o !== b1.o) { e2 = e; o2 = c.o; }
      }
      if (!b1 || !b1.o) continue;
      var fade = SG.clamp(1 - (d1 - b1.reach) / 40, 0, 1);
      if (fade <= 0) continue;
      var gap = e2 - e1, P = pal[b1.o], col, a;
      if (gap < 2.4) { col = P.d; a = 225; }
      else { col = P.f; a = 70 + (gap < 16 ? (16 - gap) / 16 * 95 : 0); }
      var q = (py * CW + px) * 4;
      D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = a * lv * fade;
    }
  }
  ctx.putImageData(img, 0, 0);
  this.terr.setAttribute('width', L.w * L.step);
  this.terr.setAttribute('height', L.h * L.step);
  this.terr.setAttribute('href', cv.toDataURL('image/png'));
};

// 나침반 (오른쪽 아래가 아니라 왼쪽 아래 — 오른쪽 아래는 군사 자리)
SG.UI.COMPASS = '<svg viewBox="-50 -50 100 100" width="92" height="92" aria-hidden="true">' +
  '<circle r="34" class="cp-ring"/><circle r="29" class="cp-ring2"/>' +
  '<g class="cp-tick">' + [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) { return '<line x1="0" y1="-29" x2="0" y2="-34" transform="rotate(' + a + ')"/>'; }).join('') + '</g>' +
  '<path class="cp-s" d="M0,-30 L5,0 L0,30 L-5,0 Z" transform="rotate(45)"/><path class="cp-s" d="M0,-30 L5,0 L0,30 L-5,0 Z" transform="rotate(-45)"/>' +
  '<path class="cp-a" d="M0,-40 L7,0 L0,0 Z"/><path class="cp-b" d="M0,-40 L-7,0 L0,0 Z"/>' +
  '<path class="cp-b" d="M0,40 L7,0 L0,0 Z"/><path class="cp-a" d="M0,40 L-7,0 L0,0 Z"/>' +
  '<path class="cp-a" d="M40,0 L0,7 L0,0 Z"/><path class="cp-b" d="M40,0 L0,-7 L0,0 Z"/>' +
  '<path class="cp-b" d="M-40,0 L0,7 L0,0 Z"/><path class="cp-a" d="M-40,0 L0,-7 L0,0 Z"/>' +
  '<circle r="3.2" class="cp-c"/>' +
  '<text y="-41" class="cp-n">北</text></svg>';

SG.UI.Map.prototype.update = function () {
  var self = this, S = SG.S;
  SG.CITY_LIST.forEach(function (c) {
    var g = self.cityEls[c.id], cs = S.cities[c.id];
    var f = cs.owner ? S.forces[cs.owner] : null;
    var base = g.querySelector('.base');
    base.style.fill = f ? f.color : 'var(--land-2)';
    [].forEach.call(g.querySelectorAll('.roof'), function (r) { r.style.fill = f ? SG.UI.shade(f.color, -12) : ''; });
    g.querySelector('.flag').style.fill = f ? f.color : '';
    g.classList.toggle('empty', !f);
    var n = cs.soldiers;
    g._sol.textContent = n <= 0 ? '' : n >= 9950 ? (n / 10000).toFixed(1) + '만' : n >= 1000 ? Math.floor(n / 1000) + '천' : n;
    g._sol.style.fill = f ? '#fff' : 'var(--muted)';
    g._cap.textContent = f && f.capital === c.id ? '★' : '';
    g.classList.toggle('sel', self.selected === c.id);
    g.classList.toggle('mine', !!S.player && cs.owner === S.player);
  });
  Object.keys(this.roadEls).forEach(function (k) {
    var p = k.split('|');
    self.roadEls[k].classList.toggle('hl', !!self.selected && (p[0] === self.selected || p[1] === self.selected));
  });
  this.drawTerritory();
  // 계절빛 (1~3 봄, 4~6 여름, 7~9 가을, 10~12 겨울 — 위쪽 계절 인장과 같다)
  this.wrap.setAttribute('data-season', ['spring', 'summer', 'autumn', 'winter'][Math.floor((S.month - 1) / 3)]);
  // 제목 두루마리
  var sc = SG.SCENARIOS.filter(function (x) { return x.id === S.scen; })[0];
  this.cart.innerHTML = '';
  if (sc) this.cart.appendChild(h('div', null, [h('small', { text: '天下大勢' }), h('b', { text: sc.name }), h('span', { text: '군웅 ' + SG.aliveForces().length + ' · 도시 ' + SG.CITY_LIST.length })]));
  // 범례
  this.legend.innerHTML = '';
  var lg = this.legend;
  lg.appendChild(h('span', { class: 'lh', text: '세력 ' + (lg.classList.contains('closed') ? '▸' : '▾'), onclick: function () { lg.classList.toggle('closed'); self.update(); } }));
  SG.aliveForces().map(function (fid) { return [fid, SG.citiesOf(fid).length]; })
    .sort(function (a, b) { return b[1] - a[1]; })
    .forEach(function (x) {
      var f = S.forces[x[0]];
      self.legend.appendChild(h('div', { style: { fontWeight: x[0] === S.player ? '700' : '400' } }, [
        h('i', { style: { background: f.color } }), SG.forceName(x[0]) + ' (' + x[1] + ')'
      ]));
    });
};
SG.UI.Map.prototype.select = function (cid) { this.selected = cid; this.update(); };

SG.UI.Map.prototype.showTip = function (cid, e) {
  var c = SG.S.cities[cid], C = SG.CITIES[cid];
  var off = c.owner ? SG.officersIn(cid, c.owner).length : 0;
  this.tip.innerHTML = '<b>' + C.n + '</b> <span class="sub">' + C.h + ' · ' + C.prov + '</span><br>' +
    '세력: ' + (c.owner ? SG.forceName(c.owner) : '<span class="sub">공백지</span>') + '<br>' +
    '병사 ' + SG.fmt(c.soldiers) + ' · 장수 ' + off + '명<br>금 ' + SG.fmt(c.gold) + ' · 식량 ' + SG.fmt(c.food);
  this.tip.style.display = 'block';
  this.moveTip(e);
};
SG.UI.Map.prototype.moveTip = function (e) {
  var r = this.wrap.getBoundingClientRect();
  var x = e.clientX - r.left + 16, y = e.clientY - r.top + 12;
  if (x > r.width - 190) x -= 200;
  if (y > r.height - 110) y -= 110;
  this.tip.style.left = x + 'px'; this.tip.style.top = y + 'px';
};

// 도시 위로 떠오르는 글자 (명령 결과 등)
SG.UI.Map.prototype.floatText = function (cid, text, good) {
  var C = SG.CITIES[cid];
  if (!C || !this.svg) return;
  var t = svg('text', { x: C.x, y: C.y - 30, 'text-anchor': 'middle', class: 'map-float' + (good === false ? ' bad' : '') }, this.svg);
  t.textContent = text;
  setTimeout(function () { t.remove(); }, 2200);
};

// 출진 화살표 (컴퓨터 차례에도 누가 어디를 치는지 보이게)
SG.UI.Map.prototype.arrow = function (from, to, color, ms) {
  var a = SG.CITIES[from], b = SG.CITIES[to], self = this;
  ms = ms || 650;
  var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
  var ux = dx / len, uy = dy / len, s = 14;
  var x1 = a.x + ux * s, y1 = a.y + uy * s, x2 = b.x - ux * (s + 4), y2 = b.y - uy * (s + 4);
  // 살짝 휜 화살
  var mx = (x1 + x2) / 2 - uy * len * 0.18, my = (y1 + y2) / 2 + ux * len * 0.18;
  var g = svg('g', { class: 'march' }, this.svg);
  var path = svg('path', { d: 'M' + x1 + ',' + y1 + ' Q' + mx + ',' + my + ' ' + x2 + ',' + y2, class: 'march-line' }, g);
  path.style.stroke = color;
  var L = path.getTotalLength ? path.getTotalLength() : len;
  path.style.strokeDasharray = L; path.style.strokeDashoffset = L;
  path.style.animation = 'march ' + (ms / 1000) + 's ease-out forwards';
  var ang = Math.atan2(y2 - my, x2 - mx) * 180 / Math.PI;
  var head = svg('path', { d: 'M0,0 L-13,-7 L-9,0 L-13,7 Z', class: 'march-head', transform: 'translate(' + x2 + ',' + y2 + ') rotate(' + ang + ')' }, g);
  head.style.fill = color;
  head.style.animation = 'fadeIn ' + (ms / 1000) + 's steps(1, end) forwards';
  return new Promise(function (res) {
    setTimeout(res, ms + 120);
    setTimeout(function () { g.style.transition = 'opacity .5s'; g.style.opacity = '0'; setTimeout(function () { g.remove(); }, 600); }, ms + 700);
  });
};
