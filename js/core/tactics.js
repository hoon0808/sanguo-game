// 직접 지휘 전투 (육각형 칸). 화면 없이 돌아가는 규칙 + 컴퓨터 지휘.
// 하루 = 공격군 차례 → 수비군 차례. 30일 안에 본성(本城)을 차지하거나 수비군을 모두 물리치면 공격군 승리.
var SG = SG || {};
SG.T = {};

SG.T.COLS = 16;
SG.T.ROWS = 11;
SG.T.DAYS = 30;
SG.T.CASTLE = { c: 13, r: 5 };
SG.T.TERRAIN = {
  plain: { n: '평지', cost: 1, def: 1.0 },
  forest: { n: '숲', cost: 2, def: 1.15 },
  hill: { n: '언덕', cost: 2, def: 1.2 },
  mountain: { n: '산', cost: 3, def: 1.3 },
  water: { n: '강', cost: 3, def: 0.8 },
  wall: { n: '성벽', cost: 99, def: 1 },
  gate: { n: '성문', cost: 1, def: 1.35 },
  castle: { n: '성 안', cost: 1, def: 1.4 },
  keep: { n: '본성', cost: 1, def: 1.5 }
};

// ---- 육각형 좌표 (홀수 줄 오른쪽으로 밀림)
SG.T.key = function (c, r) { return c + ',' + r; };
SG.T.inside = function (c, r) { return c >= 0 && r >= 0 && c < SG.T.COLS && r < SG.T.ROWS; };
SG.T.neighbors = function (c, r) {
  var d = (r & 1) ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]] : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
  var out = [];
  d.forEach(function (x) { var nc = c + x[0], nr = r + x[1]; if (SG.T.inside(nc, nr)) out.push([nc, nr]); });
  return out;
};
SG.T.cube = function (c, r) { var x = c - (r - (r & 1)) / 2; return [x, -x - r, r]; };
SG.T.dist = function (a, b) {
  var p = SG.T.cube(a[0], a[1]), q = SG.T.cube(b[0], b[1]);
  return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]));
};

// 도시마다 항상 같은 전장이 나오도록 도시 이름으로 만든 난수
function localRng(str) {
  var s = 2166136261;
  for (var i = 0; i < str.length; i++) { s ^= str.charCodeAt(i); s = Math.imul(s, 16777619) >>> 0; }
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    var t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

SG.T.makeMap = function (cid) {
  var C = SG.CITIES[cid], rnd = localRng(cid), T = SG.T, map = {};
  var kind = C.terrain;
  for (var r = 0; r < T.ROWS; r++) for (var c = 0; c < T.COLS; c++) map[T.key(c, r)] = 'plain';
  function blob(type, n, minC, maxC) {
    for (var i = 0; i < n; i++) {
      var c0 = minC + Math.floor(rnd() * (maxC - minC)), r0 = Math.floor(rnd() * T.ROWS);
      map[T.key(c0, r0)] = type;
      T.neighbors(c0, r0).forEach(function (nb) { if (rnd() < 0.55) map[T.key(nb[0], nb[1])] = type; });
    }
  }
  if (kind === 'plain') { blob('forest', 4, 2, 11); blob('hill', 2, 3, 10); }
  if (kind === 'hill') { blob('hill', 7, 2, 11); blob('forest', 3, 2, 11); }
  if (kind === 'mountain') { blob('mountain', 7, 2, 11); blob('forest', 4, 2, 11); blob('hill', 2, 2, 10); }
  if (kind === 'river') {
    blob('forest', 2, 2, 11);
    var col = 6 + Math.floor(rnd() * 2);
    var fords = [Math.floor(rnd() * 3) + 1, Math.floor(rnd() * 3) + 7];
    for (var rr = 0; rr < T.ROWS; rr++) {
      var cc = col + ((rr % 4 === 1 || rr % 4 === 2) ? 1 : 0);
      map[T.key(cc, rr)] = fords.indexOf(rr) >= 0 ? 'plain' : 'water';
    }
  }
  // 성: 본성 + 성 안(거리 1) + 성벽(거리 2, 서쪽 성문 3곳)
  var K = [T.CASTLE.c, T.CASTLE.r];
  for (var r2 = 0; r2 < T.ROWS; r2++) for (var c2 = 0; c2 < T.COLS; c2++) {
    var d = T.dist([c2, r2], K);
    if (d === 0) map[T.key(c2, r2)] = 'keep';
    else if (d === 1) map[T.key(c2, r2)] = 'castle';
    else if (d === 2) map[T.key(c2, r2)] = 'wall';
    else if (d === 3 && map[T.key(c2, r2)] === 'water') map[T.key(c2, r2)] = 'plain';
  }
  // 성문: 성벽 중 가장 서쪽 3칸 (가운데, 위, 아래)
  var gates = [[K[0] - 2, K[1]], [K[0] - 1, K[1] - 2], [K[0] - 1, K[1] + 2]];
  gates.forEach(function (g) { map[T.key(g[0], g[1])] = 'gate'; });
  // 공격군 출발지는 평지
  for (var r3 = 0; r3 < T.ROWS; r3++) { map[T.key(0, r3)] = 'plain'; map[T.key(1, r3)] = 'plain'; }
  return map;
};

// ---- 전투 만들기
SG.T.create = function (atk, def) {
  var T = SG.T, t = SG.S.cities[def.city];
  var B = { atk: atk, def: def, city: def.city, map: T.makeMap(def.city), units: [], day: 1, side: 'atk', log: [], over: null,
    morale: { atk: atk.morale, def: def.morale }, train: { atk: atk.train, def: def.train }, captured: [], killed: [], seq: 0 };
  // 수비 장수가 많으면 8명만 성에 나가고 나머지 병사는 나눠 맡는다
  var dUnits = def.units.slice().sort(function (a, b) { return (b.oid ? SG.O(b.oid).lead : 0) - (a.oid ? SG.O(a.oid).lead : 0); });
  var field = dUnits.slice(0, 8), reserve = dUnits.slice(8);
  var extra = reserve.reduce(function (s, u) { return s + u.n; }, 0);
  reserve.forEach(function (u) { u.n = 0; u.reserve = true; });
  field.forEach(function (u, i) { u.n += Math.floor(extra / field.length) + (i === 0 ? extra % field.length : 0); u.max = u.n; });
  var aSpots = [5, 3, 7, 1, 9].map(function (r) { return [r % 2 === 0 ? 1 : 0, r]; });
  atk.units.forEach(function (u, i) { B.units.push(T.unit(B, u, 'atk', aSpots[i][0], aSpots[i][1])); });
  var K = T.CASTLE;
  var dSpots = [[K.c, K.r]].concat(T.neighbors(K.c, K.r)).concat([[K.c - 2, K.r], [K.c - 1, K.r - 2], [K.c - 1, K.r + 2]]);
  dSpots.sort(function (a, b) { return a[0] - b[0]; });
  dSpots = [[K.c, K.r]].concat(dSpots.filter(function (p) { return !(p[0] === K.c && p[1] === K.r); }));
  field.forEach(function (u, i) { if (u.n > 0 || !u.oid) B.units.push(T.unit(B, u, 'def', dSpots[i][0], dSpots[i][1])); });
  B.wallBonus = 1 + 0.3 * t.wall / SG.CITY_SIZE[SG.CITIES[def.city].size].wallMax;
  // 보급: 공격군은 챙겨 온 군량·금으로 싸운다 (군량이 떨어지거나 보급대 粮 칸을 빼앗기면 진다). 수비군은 도시 금으로 매수할 수 있다
  var atot = atk.units.reduce(function (s, u) { return s + u.n; }, 0);
  // 보급대는 공격군 출발 칸들 사이 (0,6). 성벽·물이면 가까운 다른 칸
  B.depot = { c: 0, r: 6 };
  [[0, 6], [0, 4], [1, 6], [1, 4], [0, 8], [0, 2]].some(function (q) {
    var tt = B.map[T.key(q[0], q[1])];
    if (tt !== 'wall' && tt !== 'water' && tt !== 'mountain' && !T.at(B, q[0], q[1])) { B.depot = { c: q[0], r: q[1] }; return true; }
    return false;
  });
  B.supply = { food: atk.food != null ? atk.food : SG.supplyNeed(atot, SG.T.DAYS), gold: { atk: atk.gold || 0, def: def.fid ? Math.max(0, t.gold) : 0 } };
  B.turned = [];
  return B;
};
SG.T.unit = function (B, ref, side, c, r) {
  var o = ref.oid ? SG.O(ref.oid) : { lead: 30, war: 30, int: 20, sk: null, n: '수비병' };
  return { id: ++B.seq, ref: ref, oid: ref.oid, side: side, c: c, r: r, n: ref.n, max: ref.n, done: false, conf: 0, t: ref.t || 'inf',
    lead: o.lead, war: o.war, int: o.int, sk: o.sk, mv: SG.itemMove ? SG.itemMove(ref.oid) : 0, name: ref.oid ? SG.name(ref.oid) : '수비병' };
};
SG.T.at = function (B, c, r) {
  for (var i = 0; i < B.units.length; i++) { var u = B.units[i]; if (u.n > 0 && u.c === c && u.r === r) return u; }
  return null;
};
SG.T.alive = function (B, side) { return B.units.filter(function (u) { return u.n > 0 && (!side || u.side === side); }); };
SG.T.terr = function (B, c, r) { return SG.T.TERRAIN[B.map[SG.T.key(c, r)]]; };
SG.T.moveCost = function (B, u, c, r) {
  var tt = B.map[SG.T.key(c, r)];
  if (tt === 'wall') return 99;
  if ((tt === 'gate' || tt === 'castle' || tt === 'keep') && u.side === 'atk') {
    // 성문을 지나야 성 안에 들어갈 수 있다 (성벽은 막힘). 성 안 이동은 보통.
    return 1;
  }
  if (tt === 'water' && u.sk === '수군') return 1;
  // 기병은 숲·언덕·산·강에서 한 칸 더 힘들다
  if (u.t === 'cav' && (tt === 'forest' || tt === 'hill' || tt === 'mountain' || tt === 'water')) return SG.T.TERRAIN[tt].cost + 1;
  return SG.T.TERRAIN[tt].cost;
};
SG.T.movePoints = function (u) { return 4 + (u.t === 'cav' ? 2 : 0) + (u.sk === '기마' ? 1 : 0) + (u.mv || 0); };
SG.T.enemyAdj = function (B, u, c, r) {
  return SG.T.neighbors(c, r).some(function (nb) { var x = SG.T.at(B, nb[0], nb[1]); return x && x.side !== u.side; });
};

// 갈 수 있는 칸: {key: 남은 이동력}. 적과 맞닿은 칸에 들어가면 멈춘다.
SG.T.reachable = function (B, u) {
  var T = SG.T, best = {}, q = [[u.c, u.r, T.movePoints(u)]];
  best[T.key(u.c, u.r)] = T.movePoints(u);
  while (q.length) {
    q.sort(function (a, b) { return b[2] - a[2]; });
    var cur = q.shift();
    if (cur[2] <= 0) continue;
    if (!(cur[0] === u.c && cur[1] === u.r) && T.enemyAdj(B, u, cur[0], cur[1])) continue;
    T.neighbors(cur[0], cur[1]).forEach(function (nb) {
      var occ = T.at(B, nb[0], nb[1]);
      if (occ && occ !== u) {
        if (occ.side !== u.side) return;
      }
      var cost = T.moveCost(B, u, nb[0], nb[1]);
      var left = cur[2] - cost;
      if (cost >= 99) return;
      if (left < 0) { if (cur[2] === T.movePoints(u) && cost < 99) left = 0; else return; } // 한 칸은 늘 갈 수 있다
      var k = T.key(nb[0], nb[1]);
      if (best[k] === undefined || best[k] < left) { best[k] = left; q.push([nb[0], nb[1], left]); }
    });
  }
  // 아군이 있는 칸에는 멈출 수 없다
  Object.keys(best).forEach(function (k) {
    var p = k.split(',').map(Number), occ = T.at(B, p[0], p[1]);
    if (occ && occ !== u) delete best[k];
  });
  return best;
};

SG.T.move = function (B, u, c, r) {
  var k = SG.T.key(c, r);
  var reach = SG.T.reachable(B, u);
  if (reach[k] === undefined) return false;
  u.c = c; u.r = r; u.moved = true;
  SG.T.checkEnd(B);
  return true;
};

// ---- 공격
SG.T.range = function (u) { return (u.t === 'arc' ? 2 : 1) + (u.sk === '궁신' ? 1 : 0); };
SG.T.attackTargets = function (B, u) {
  return SG.T.alive(B).filter(function (x) { return x.side !== u.side && SG.T.dist([u.c, u.r], [x.c, x.r]) <= SG.T.range(u); });
};
SG.T.damage = function (B, a, d, mult, flat) {
  var aStat = a.war * 0.6 + a.lead * 0.4 + (a.sk === '무쌍' ? 8 : 0);
  var dStat = d.lead * 0.6 + d.war * 0.4;
  var ratio = SG.clamp((aStat + 20) / (dStat + 20), 0.5, 2);
  var tr = B.train[a.side], mo = B.morale[a.side];
  var dmg = a.n * 0.12 * ratio * (0.6 + tr / 250) * (0.6 + mo / 250) * (mult || 1);
  if (a.sk === '돌격') dmg *= 1.15;
  if (SG.aiMul) dmg *= SG.aiMul(a.side === 'atk' ? B.atk.fid : B.def.fid, 'power');
  // 병종: 상성, 잘 다루는 병종, 기병 돌격(움직인 뒤 공격), 성 안을 치는 기병은 약함, 성 위 궁병은 강함
  dmg *= SG.match(a.t, d.t);
  if (a.oid && SG.apt(a.oid) === a.t) dmg *= SG.APT_BONUS;
  var at = B.map[SG.T.key(a.c, a.r)], tt = B.map[SG.T.key(d.c, d.r)];
  var inCastle = function (x) { return x === 'gate' || x === 'castle' || x === 'keep'; };
  if (a.t === 'cav' && a.moved) dmg *= 1.15;
  if (a.t === 'cav' && inCastle(tt) && d.side === 'def') dmg *= 0.75;
  if (a.t === 'arc' && a.side === 'def' && inCastle(at)) dmg *= 1.15;
  var td = SG.T.TERRAIN[tt].def;
  if (tt === 'water' && d.sk === '수군') td = 1.1;
  if (d.side === 'def' && (tt === 'gate' || tt === 'castle' || tt === 'keep')) td *= B.wallBonus;
  if (d.sk === '철벽') td *= 1.2;
  dmg = dmg / td * (flat ? 1 : SG.randf(0.85, 1.15));
  return Math.max(10, Math.round(dmg));
};
SG.T.hit = function (B, d, dmg) {
  dmg = Math.min(d.n, dmg);
  d.n -= dmg;
  if (d.n <= 0) SG.T.broken(B, d);
  return dmg;
};
// 공격 형태 (전법). 공격 단추를 누른 뒤 고른다.
SG.T.FORMS = {
  normal: { n: '공격', h: '攻', desc: '보통 공격. 맞붙어 싸우면 반격을 받습니다.' },
  charge: { n: '돌격', h: '突', desc: '적진에 달려듭니다. 피해 ×1.3 (기병이 움직인 뒤면 ×1.43), 적 사기가 더 떨어집니다. 대신 반격을 세게(×1.5) 받습니다. 궁병은 못 씀.' },
  combo: { n: '연속 공격', h: '連', desc: '무력 80 이상 장수만. 두 번 잇달아 칩니다 (0.65 + 0.65). 반격은 한 번.' },
  volley: { n: '일제 사격', h: '射', t: 'arc', desc: '궁병만. 화살비로 목표(×0.9)와 그 옆의 적(×0.35)까지 맞힙니다. 반격 없음.' },
  pincer: { n: '협공', h: '挾', desc: '목표 옆에 아군이 있어야 합니다. 옆 아군 하나마다 피해 +20%, 반격은 −30%.' },
  // 병종 전법
  breach: { n: '돌파', h: '破', t: 'cav', desc: '기병만. 적 부대를 꿰뚫고 그 뒤 칸으로 빠져나갑니다 (뒤 칸이 비어 있어야 함). 피해 ×1.2, 반격은 ×0.6, 적이 흩어져 혼란에 빠질 수 있습니다.' },
  push: { n: '밀어내기', h: '推', t: 'inf', desc: '보병만. 방패를 앞세워 적을 한 칸 밀어내고 그 자리로 들어갑니다. 밀려날 곳이 막혀 있으면 짓눌려 피해가 커집니다(×1.4). 병사가 많고 무력이 높을수록 잘 밀립니다. 성안(성문·성곽) 수비군은 좀처럼 밀리지 않고, 본성을 지키는 부대는 절대 밀리지 않습니다.' },
  firearrow: { n: '불화살', h: '火', t: 'arc', desc: '궁병만. 불화살을 쏩니다. 피해 ×0.75 이지만 불이 붙으면 더 타고(숲이면 잘 붙음, 물이면 안 붙음) 적이 하루 동안 혼란에 빠집니다. 지력이 높을수록 잘 붙습니다.' }
};
SG.T.FORM_KEYS = ['normal', 'charge', 'combo', 'volley', 'pincer', 'breach', 'push', 'firearrow'];
// a 에서 d 쪽으로 한 칸 더 간 칸 (d 의 바로 뒤)
SG.T.beyond = function (a, d) {
  var p = SG.T.cube(a.c, a.r), q = SG.T.cube(d.c, d.r);
  var x = 2 * q[0] - p[0], r = 2 * q[2] - p[2], c = x + (r - (r & 1)) / 2;
  return SG.T.inside(c, r) ? [c, r] : null;
};
// u 가 p 칸에 들어설 수 있는지 (비어 있고, 성벽·물이 아님)
SG.T.canEnter = function (B, u, p) {
  if (!p || SG.T.at(B, p[0], p[1])) return false;
  var tt = B.map[SG.T.key(p[0], p[1])];
  if (tt === 'water' && u.sk !== '수군') return false;
  if (tt === 'keep') return false; // 본성은 돌파·밀어내기로 뛰어들 수 없다
  return SG.T.moveCost(B, u, p[0], p[1]) < 99;
};
// 성안(성문·성곽)에서 버티는 수비군은 좀처럼 밀리지 않고, 본성을 지키는 부대는 절대 밀리지 않는다
SG.T.pushGround = function (B, d) {
  var tt = B && B.map[SG.T.key(d.c, d.r)];
  if (d.side !== 'def') return 'open';
  return tt === 'keep' ? 'keep' : tt === 'gate' || tt === 'castle' ? 'wall' : 'open';
};
SG.T.pushChance = function (a, d, B) {
  var g = SG.T.pushGround(B, d);
  if (g === 'keep') return 0;
  var p = SG.clamp(0.5 + 0.45 * (a.n - d.n) / Math.max(1, a.n + d.n) + (a.war - d.war) / 200 + (a.lead - d.lead) / 300, 0.15, 0.85);
  return g === 'wall' ? Math.min(0.12, p * 0.15) : p;
};
SG.T.fireChance = function (B, a, d) {
  var tt = B.map[SG.T.key(d.c, d.r)];
  return SG.clamp(0.25 + (a.int - d.int) / 200 + (tt === 'forest' ? 0.2 : 0) - (tt === 'water' ? 0.4 : 0), 0.05, 0.7);
};
// 목표 옆에 붙어 있는 (공격자 말고) 아군 수
SG.T.flankers = function (B, a, d) {
  return SG.T.neighbors(d.c, d.r).filter(function (nb) { var x = SG.T.at(B, nb[0], nb[1]); return x && x !== a && x.side === a.side && x.n > 0; }).length;
};
SG.T.formOk = function (B, a, d, form) {
  var dist = SG.T.dist([a.c, a.r], [d.c, d.r]);
  if (dist > SG.T.range(a)) return false;
  if (form === 'charge') return dist === 1 && a.t !== 'arc';
  if (form === 'combo') return dist === 1 && a.war >= 80;
  if (form === 'volley') return a.t === 'arc';
  if (form === 'pincer') return dist === 1 && SG.T.flankers(B, a, d) > 0;
  if (form === 'breach') return dist === 1 && a.t === 'cav' && SG.T.canEnter(B, a, SG.T.beyond(a, d));
  if (form === 'push') return dist === 1 && a.t === 'inf';
  if (form === 'firearrow') return a.t === 'arc';
  return true;
};
SG.T.formTargets = function (B, u, form) {
  return SG.T.attackTargets(B, u).filter(function (x) { return SG.T.formOk(B, u, x, form || 'normal'); });
};
SG.T.formsOf = function (B, u) {
  return SG.T.FORM_KEYS.filter(function (f) { return SG.T.formTargets(B, u, f).length > 0; });
};
// 한 번 공격의 계획: 누구에게 얼마씩 (flat=true 면 예상치)
SG.T.formPlan = function (B, a, d, form, flat) {
  var T = SG.T, dist = T.dist([a.c, a.r], [d.c, d.r]), ranged = dist > 1;
  var base = ranged ? (a.t === 'arc' ? 0.85 : 0.7) : 1, hits = [], counter = 0;
  var cm = d.t === 'arc' ? 0.35 : 0.5;
  if (form === 'charge') { hits.push([d, T.damage(B, a, d, 1.3 * (a.t === 'cav' && a.moved ? 1.1 : 1), flat)]); counter = 1.5; }
  else if (form === 'combo') { hits.push([d, T.damage(B, a, d, 0.65, flat)]); hits.push([d, T.damage(B, a, d, 0.65, flat)]); counter = 1; }
  else if (form === 'volley') {
    hits.push([d, T.damage(B, a, d, 0.9, flat)]);
    T.neighbors(d.c, d.r).forEach(function (nb) { var x = T.at(B, nb[0], nb[1]); if (x && x.side !== a.side) hits.push([x, T.damage(B, a, x, 0.35, flat)]); });
  } else if (form === 'breach') { hits.push([d, T.damage(B, a, d, 1.2, flat)]); counter = 0.6; }
  else if (form === 'push') { hits.push([d, T.damage(B, a, d, 1, flat)]); counter = 0.8; }
  else if (form === 'firearrow') { hits.push([d, T.damage(B, a, d, 0.75, flat)]); counter = 0.6; }
  else if (form === 'pincer') { var k = Math.min(3, T.flankers(B, a, d)); hits.push([d, T.damage(B, a, d, 1 + 0.2 * k, flat)]); counter = Math.max(0, 1 - 0.3 * k); }
  else { hits.push([d, T.damage(B, a, d, base, flat)]); counter = ranged ? 0 : 1; }
  return { hits: hits, counter: ranged ? 0 : counter * cm };
};
// AI: 예상 이득(준 피해 − 받을 반격 × 0.8)이 가장 큰 형태
SG.T.bestForm = function (B, a, d) {
  var best = 'normal', bv = -1e9;
  SG.T.FORM_KEYS.forEach(function (f) {
    if (!SG.T.formOk(B, a, d, f)) return;
    var p = SG.T.formPlan(B, a, d, f, true);
    var dealt = p.hits.reduce(function (s, x) { return s + Math.min(x[0].n, x[1]); }, 0);
    var back = p.counter ? Math.min(a.n, SG.T.damage(B, d, a, p.counter, true)) : 0;
    var v = dealt - back * 0.8;
    if (f === 'firearrow') v += SG.T.fireChance(B, a, d) * (d.n * 0.06 + 200);
    if (f === 'breach') v += 150 + Math.min(d.n, 3000) * 0.04;
    if (f === 'push') v += SG.T.pushChance(a, d, B) * 120 + (SG.T.pushGround(B, d) !== 'open' ? 0.1 : SG.T.canEnter(B, d, SG.T.beyond(a, d)) ? 0 : 0.4) * Math.min(d.n, SG.T.damage(B, a, d, 1, true));
    if (v > bv) { bv = v; best = f; }
  });
  return best;
};
SG.T.attack = function (B, a, d, form) {
  var T = SG.T;
  form = form && T.formOk(B, a, d, form) ? form : 'normal';
  var dist = T.dist([a.c, a.r], [d.c, d.r]), ranged = dist > 1;
  var p = T.formPlan(B, a, d, form), done = {}, msg;
  B.lastHits = [];
  p.hits.forEach(function (x) { if (x[0].n <= 0) return; var got = T.hit(B, x[0], x[1]); done[x[0].id] = (done[x[0].id] || 0) + got; B.lastHits.push({ u: x[0], dmg: got }); });
  var main = done[d.id] || 0;
  var verb = { charge: '에 돌격했다', combo: '을(를) 연달아 베었다', volley: '에 화살비를 퍼부었다', pincer: '을(를) 협공했다', breach: '을(를) 꿰뚫고 돌파했다', push: '을(를) 방패로 밀어붙였다', firearrow: '에 불화살을 쏘았다' }[form] || (ranged ? '을(를) 활로 쏘았다' : '을(를) 공격했다');
  msg = a.name + '이(가) ' + d.name + verb + ' (-' + SG.fmt(main) + ')';
  var side = B.lastHits.filter(function (x) { return x.u !== d; });
  if (side.length) msg += ', 옆 부대 ' + side.map(function (x) { return x.u.name + ' -' + SG.fmt(x.dmg); }).join(', ');
  if (d.n > 0 && p.counter > 0 && d.conf <= 0) {
    var back = T.hit(B, a, Math.round(T.damage(B, d, a, p.counter)));
    msg += ', 반격 -' + SG.fmt(back);
  }
  // 병종 전법의 뒷일
  B.fxForm = null;
  if (form === 'breach' && a.n > 0) {
    var bp = T.beyond(a, d);
    if (T.canEnter(B, a, bp)) {
      B.fxForm = { kind: 'breach', from: [a.c, a.r], to: bp };
      a.c = bp[0]; a.r = bp[1]; a.moved = true;
      msg += ', 적진 뒤로 빠져나갔다';
      if (d.n > 0 && SG.chance(SG.clamp(0.3 + (a.war - d.lead) / 200, 0.1, 0.6))) { d.conf = Math.max(d.conf, 1); msg += ' — ' + d.name + ' 부대가 흩어져 혼란!'; B.fxForm.conf = true; }
    }
  }
  if (form === 'push' && d.n > 0 && a.n > 0) {
    var pp = T.beyond(a, d), old = [d.c, d.r];
    var ground = T.pushGround(B, d);
    if (T.canEnter(B, d, pp) && SG.chance(T.pushChance(a, d, B))) {
      d.c = pp[0]; d.r = pp[1];
      if (T.canEnter(B, a, old)) { a.c = old[0]; a.r = old[1]; a.moved = true; }
      msg += ', 한 칸 밀어냈다';
      B.fxForm = { kind: 'push', ok: true };
      T.moraleShift(B, a.side, 1);
    } else if (ground !== 'open') {
      // 성안 수비군은 성벽에 기대어 버틴다 (짓누르는 피해도 작다)
      var hold = T.hit(B, d, Math.round(T.damage(B, a, d, 0.1)));
      done[d.id] += hold; B.lastHits[0].dmg += hold;
      msg += ground === 'keep' ? ', 본성을 지키는 부대는 꿈쩍도 하지 않았다' : ', 성벽에 기댄 수비군은 밀리지 않았다';
      if (hold) msg += ' (-' + SG.fmt(hold) + ')';
      B.fxForm = { kind: 'push', ok: false, hold: true };
    } else {
      var crush = T.hit(B, d, Math.round(T.damage(B, a, d, 0.4)));
      done[d.id] += crush; B.lastHits[0].dmg += crush;
      msg += ', 밀려날 곳이 없어 짓눌렸다 (-' + SG.fmt(crush) + ')';
      B.fxForm = { kind: 'push', ok: false };
    }
  }
  if (form === 'firearrow' && d.n > 0) {
    if (SG.chance(T.fireChance(B, a, d))) {
      var burn = T.hit(B, d, Math.round(d.n * SG.randf(0.04, 0.08) + a.int * 3));
      done[d.id] += burn; B.lastHits[0].dmg += burn;
      d.conf = Math.max(d.conf, 1);
      msg += ', 불이 붙었다! (-' + SG.fmt(burn) + ', 혼란)';
      B.fxForm = { kind: 'fire', ok: true };
    } else { msg += ', 불은 붙지 않았다'; B.fxForm = { kind: 'fire', ok: false }; }
  }
  if (d.n <= 0) msg += ' — ' + d.name + ' 부대 궤멸!';
  B.log.push(msg);
  a.done = true;
  T.moraleShift(B, a.side, (d.n <= 0 ? 4 : 1) + (form === 'charge' || form === 'breach' ? 2 : 0));
  T.checkEnd(B);
  return msg;
};
SG.T.moraleShift = function (B, side, v) {
  var other = side === 'atk' ? 'def' : 'atk';
  B.morale[side] = SG.clamp(B.morale[side] + v, 0, 100);
  B.morale[other] = SG.clamp(B.morale[other] - v, 0, 100);
};
SG.T.broken = function (B, u) {
  u.n = 0;
  if (u.oid && SG.chance(0.35)) {
    B.captured.push({ oid: u.oid, by: u.side === 'atk' ? 'def' : 'atk' });
    u.ref.oidLost = u.oid; u.ref.oid = null; u.ref.out = true;
    B.log.push('  ' + u.name + '이(가) 사로잡혔다!');
  }
};

// ---- 계략 (화계·혼란): 2칸 안의 적
SG.T.STRATS = { fire: '화계', confuse: '혼란' };
SG.T.stratTargets = function (B, u) {
  return SG.T.alive(B).filter(function (x) { return x.side !== u.side && SG.T.dist([u.c, u.r], [x.c, x.r]) <= 2; });
};
SG.T.stratChance = function (B, u, t, kind) {
  var p = 0.5 + (u.int - t.int) / 90;
  // 우리 군사가 이 싸움에 나와 있으면 계략이 더 잘 먹힌다 (+8%)
  var fid = u.side === 'atk' ? B.atk.fid : B.def.fid, st = SG.strategist && SG.strategist(fid);
  if (st && SG.T.alive(B, u.side).some(function (x) { return x.oid === st; })) p += 0.08;
  if (u.sk === '신산') p += 0.15;
  if (kind === 'fire' && B.map[SG.T.key(t.c, t.r)] === 'water') p -= 0.3;
  if (kind === 'fire' && B.map[SG.T.key(t.c, t.r)] === 'forest') p += 0.1;
  return SG.clamp(p, 0.05, 0.92);
};
SG.T.strategy = function (B, u, t, kind) {
  var p = SG.T.stratChance(B, u, t, kind), msg;
  if (SG.chance(p)) {
    if (kind === 'fire') {
      var dmg = SG.T.hit(B, t, Math.round(t.n * SG.randf(0.1, 0.18) * (u.sk === '신산' ? 1.3 : 1) + u.int * 6));
      msg = u.name + '의 화계! ' + t.name + ' 부대가 불길에 휩싸였다 (-' + SG.fmt(dmg) + ')' + (t.n <= 0 ? ' — 궤멸!' : '');
      SG.T.moraleShift(B, u.side, 2);
    } else {
      t.conf = 2;
      msg = u.name + '의 계략에 ' + t.name + ' 부대가 혼란에 빠졌다! (2일 동안 움직일 수 없음)';
    }
  } else msg = u.name + '의 ' + SG.T.STRATS[kind] + '이(가) ' + t.name + '에게 간파당했다.';
  B.log.push(msg);
  u.done = true;
  SG.T.checkEnd(B);
  return msg;
};

// ---- 보급·매수
SG.T.dailyFood = function (B) { return SG.supplyNeed(SG.T.alive(B, 'atk').reduce(function (s, u) { return s + u.n; }, 0), 1); };
// 매수: 3칸 안의 적 장수를 금으로 꾀어 편을 바꾸게 한다 (군주와 그 가족은 넘어오지 않음)
SG.T.bribeTargets = function (B, u) {
  if (!u.oid) return [];
  return SG.T.alive(B).filter(function (x) { return x.side !== u.side && x.oid && !x.turned && SG.T.dist([u.c, u.r], [x.c, x.r]) <= 3 && SG.T.bribeChance(B, u, x) > 0; });
};
SG.T.bribePrice = function (B, t) { return SG.bribePrice(t.oid, t.n); };
SG.T.bribeChance = function (B, u, t) {
  var so = SG.S.off[t.oid], tf = so && SG.S.forces[so.f];
  if (!so || so.s !== 'force' || !tf || tf.lord === t.oid || SG.isKin(t.oid, tf.lord)) return 0;
  var bf = SG.S.forces[u.side === 'atk' ? B.atk.fid : B.def.fid], lord = SG.O(bf ? bf.lord : u.oid);
  var p = 0.05 + (80 - so.loy) / 90 + (SG.O(u.oid).cha - 60) / 250 + (lord.cha - 60) / 300 + (t.n < t.max * 0.5 ? 0.1 : 0);
  return SG.clamp(p, 0, 0.85);
};
SG.T.bribe = function (B, u, t) {
  var sd = u.side, price = SG.T.bribePrice(B, t), p = SG.T.bribeChance(B, u, t), msg;
  if (!B.supply || B.supply.gold[sd] < price) { u.done = true; return u.name + '은(는) 매수할 금이 모자랐다.'; }
  var bf = sd === 'atk' ? B.atk.fid : B.def.fid;
  if (SG.chance(p)) {
    B.supply.gold[sd] -= price;
    t.side = sd; t.turned = true; t.done = true; t.conf = 0;
    B.turned.push({ oid: t.oid, to: sd });
    msg = u.name + '이(가) 금 ' + SG.fmt(price) + '(으)로 ' + t.name + '을(를) 매수했다! ' + t.name + ' 부대가 ' + (bf ? SG.forceName(bf) : '') + ' 쪽으로 돌아섰다.';
    SG.T.moraleShift(B, sd, 4);
  } else {
    var lost = Math.round(price / 2);
    B.supply.gold[sd] -= lost;
    msg = t.name + '이(가) ' + u.name + '의 매수를 뿌리쳤다 (금 ' + SG.fmt(lost) + ' 잃음).';
  }
  B.log.push(msg);
  u.done = true;
  SG.T.checkEnd(B);
  return msg;
};

// ---- 일기토: 붙어 있는 적 장수에게 신청
SG.T.duelTargets = function (B, u) {
  if (!u.oid) return [];
  return SG.T.alive(B).filter(function (x) { return x.side !== u.side && x.oid && SG.T.dist([u.c, u.r], [x.c, x.r]) === 1; });
};
// 상대가 받아들이는지 (컴퓨터 판단)
SG.T.duelAccept = function (B, challenger, target) {
  var p = SG.duelWinChance(target.oid, challenger.oid);
  return p > 0.4 || SG.chance(0.25);
};
// pre: 화면에서 직접 겨룬 결과 ({winner, loser, fate} 또는 {draw:true}). 없으면 바로 계산
SG.T.duel = function (B, a, d, accepted, pre) {
  a.done = true;
  if (!accepted) {
    B.log.push(d.name + '이(가) ' + a.name + '의 일기토 신청을 피했다. 병사들의 사기가 떨어진다.');
    SG.T.moraleShift(B, a.side, 6);
    return { refused: true };
  }
  if (pre && pre.draw) {
    B.log.push('일기토! ' + a.name + ' 대 ' + d.name + ' — 승부가 나지 않아 두 장수가 물러났다.');
    return pre;
  }
  var r = pre || SG.duel(a.oid, d.oid);
  var lu = r.loser === a.oid ? a : d, wu = lu === a ? d : a;
  B.log.push('일기토! ' + a.name + ' 대 ' + d.name + ' → ' + SG.name(r.winner) + ' 승리. ' + SG.name(r.loser) + '은(는) ' + SG.DUEL_FATE[r.fate] + '.');
  SG.T.moraleShift(B, wu.side, 12);
  if (r.fate === 'fled') {
    SG.T.hit(B, lu, Math.round(lu.n * 0.3));
  } else {
    if (r.fate === 'killed') B.killed.push(lu.oid);
    else B.captured.push({ oid: lu.oid, by: wu.side });
    // 장수를 잃은 부대는 흩어진다 (절반은 살아 돌아감)
    lu.ref.oidLost = lu.oid; lu.ref.oid = null; lu.ref.out = true;
    lu.ref.n = Math.floor(lu.n * 0.5);
    lu.n = 0; lu.gone = true;
  }
  SG.T.checkEnd(B);
  return r;
};

SG.T.wait = function (B, u) { u.done = true; };

// ---- 차례·승패
SG.T.checkEnd = function (B) {
  if (B.over) return B.over;
  var a = SG.T.alive(B, 'atk'), d = SG.T.alive(B, 'def');
  var K = SG.T.CASTLE;
  var keep = SG.T.at(B, K.c, K.r);
  if (!a.length) B.over = 'def';
  else if (!d.length) B.over = 'atk';
  else if (keep && keep.side === 'atk') { B.over = 'atk'; B.log.push(keep.name + '이(가) 본성을 점령했다!'); }
  else if (B.morale.atk <= 5) { B.over = 'def'; B.log.push('공격군의 사기가 무너져 물러났다.'); }
  else if (B.depot) {
    var raider = SG.T.at(B, B.depot.c, B.depot.r);
    if (raider && raider.side === 'def') { B.over = 'def'; B.depotLost = true; B.log.push(raider.name + '이(가) 공격군의 보급대를 빼앗았다! 보급이 끊긴 공격군이 무너졌다.'); }
  }
  return B.over;
};
SG.T.endSide = function (B) {
  var side = B.side;
  B.units.forEach(function (u) { if (u.side === side) { u.done = false; u.moved = false; if (u.conf > 0) u.conf--; } });
  if (side === 'atk') B.side = 'def';
  else {
    B.side = 'atk';
    B.day++;
    // 하루가 지나면 공격군이 군량을 먹는다
    if (B.supply) {
      B.supply.food -= SG.T.dailyFood(B);
      if (B.supply.food < 0) { B.supply.food = 0; B.over = 'def'; B.supplyOut = true; B.log.push('군량이 떨어졌다! 굶주린 공격군이 물러난다.'); }
    }
    if (!B.over && B.day > SG.T.DAYS) { B.over = 'def'; B.log.push(SG.T.DAYS + '일이 지나 공격군이 지쳐 물러난다.'); }
  }
  // 혼란한 부대는 이번 차례에 움직이지 못한다
  B.units.forEach(function (u) { if (u.side === B.side && u.conf > 0) u.done = true; });
  return B.over;
};
SG.T.retreat = function (B, side) {
  B.over = side === 'atk' ? 'def' : 'atk';
  B.log.push((side === 'atk' ? '공격군' : '수비군') + '이(가) 퇴각했다.');
};

// 전투 결과를 전략 화면 형식으로
SG.T.result = function (B) {
  B.units.forEach(function (u) { if (!u.gone) u.ref.n = Math.max(0, u.n); });
  var res = { winner: B.over || 'def', log: B.log.slice(-12), captured: [], killed: B.killed.slice(), days: B.day };
  B.captured.forEach(function (cp) { res.captured.push({ oid: cp.oid, by: cp.by }); });
  B.atk.morale = B.morale.atk; B.def.morale = B.morale.def;
  // 매수되어 편을 바꾼 부대는 그쪽 군대로 옮긴다
  B.units.forEach(function (u) {
    if (!u.turned) return;
    var from = u.side === 'atk' ? B.def.units : B.atk.units, to = u.side === 'atk' ? B.atk.units : B.def.units, i = from.indexOf(u.ref);
    if (i >= 0) { from.splice(i, 1); to.push(u.ref); }
  });
  res.turned = (B.turned || []).slice();
  if (B.supply) { B.atk.food = Math.max(0, B.supply.food); B.atk.gold = Math.max(0, B.supply.gold.atk); res.defGold = B.supply.gold.def; }
  res.depotLost = !!B.depotLost; res.supplyOut = !!B.supplyOut;
  // 수비 패배 시 예비 장수들은 도시와 함께 처리된다
  return res;
};

// ---- 컴퓨터 지휘: 한 부대의 행동 계획 → 실행. step 콜백으로 화면이 움직임을 보여 준다.
SG.T.aiUnit = function (B, u) {
  var T = SG.T, K = T.CASTLE;
  if (u.n <= 0 || u.done || B.over) return null;
  // 1) 계략
  if (u.int >= 70 && SG.chance(0.6)) {
    var st = T.stratTargets(B, u).map(function (t) {
      var kind = (u.int >= 85 || SG.chance(0.6)) ? 'fire' : 'confuse';
      return { t: t, kind: kind, p: T.stratChance(B, u, t, kind) };
    }).sort(function (a, b) { return b.p - a.p; })[0];
    if (st && st.p >= 0.55) return { type: 'strat', target: st.t, kind: st.kind };
  }
  // 1-1) 매수 (금이 있고 넘어올 만한 장수가 가까이 있으면)
  if (B.supply && B.supply.gold[u.side] > 0 && SG.chance(0.5)) {
    var bb = T.bribeTargets(B, u).map(function (t) { return { t: t, p: T.bribeChance(B, u, t), c: T.bribePrice(B, t) }; })
      .filter(function (x) { return x.c <= B.supply.gold[u.side] && x.p >= 0.45; }).sort(function (a, b) { return b.p * b.t.n - a.p * a.t.n; })[0];
    if (bb) return { type: 'bribe', target: bb.t };
  }
  // 2) 일기토 (무력이 크게 앞설 때)
  var dt = T.duelTargets(B, u).filter(function (t) { return SG.duelWinChance(u.oid, t.oid) > 0.72; })[0];
  if (dt && SG.chance(0.5)) return { type: 'duel', target: dt };
  // 3) 이동 + 공격
  var reach = T.reachable(B, u), bestK = T.key(u.c, u.r), bestScore = -1e9;
  var enemies = T.alive(B).filter(function (x) { return x.side !== u.side; });
  var keepFree = !T.at(B, K.c, K.r) || T.at(B, K.c, K.r) === u;
  // 보급대: 수비 기병은 지키는 부대가 없으면 노리고, 공격군은 적이 다가오면 지키러 간다
  var D = B.depot, guarded = D && T.alive(B, 'atk').some(function (a) { return a !== u && T.dist([a.c, a.r], [D.c, D.r]) <= 2; });
  var raidNear = D && enemies.concat([]).some(function (e) { return e.side === 'def' && T.dist([e.c, e.r], [D.c, D.r]) <= 4; });
  Object.keys(reach).forEach(function (k) {
    var p = k.split(',').map(Number), s = 0;
    var tt = B.map[k];
    if (u.side === 'atk' && u.id === B.guard) {
      // 지킴이: 보급대 곁에 붙어 있고, 다가온 적만 친다
      s -= T.dist(p, [D.c, D.r]) * 60;
      if (enemies.some(function (e) { return T.dist(p, [e.c, e.r]) <= T.range(u); })) s += 40;
    } else if (u.side === 'atk') {
      if (tt === 'keep') s += 1000;
      s -= T.dist(p, [K.c, K.r]) * 6;
      var adj = enemies.filter(function (e) { return T.dist(p, [e.c, e.r]) <= T.range(u); });
      if (adj.length) s += 30 + Math.max.apply(null, adj.map(function (e) { return 20 * (1 - e.n / Math.max(1, e.max)) + (u.n > e.n ? 15 : 0) + 18 * (SG.match(u.t, e.t) - 1); }));
      if (u.t === 'arc' && enemies.some(function (e) { return T.dist(p, [e.c, e.r]) === 1; })) s -= 25;
      s += (T.TERRAIN[tt].def - 1) * 20;
      if (raidNear && T.dist([u.c, u.r], [D.c, D.r]) <= 7) s -= T.dist(p, [D.c, D.r]) * 14;
    } else {
      var dk = T.dist(p, [K.c, K.r]);
      if (tt === 'keep') {
        var keepThreat = enemies.some(function (e) { return T.dist([e.c, e.r], [K.c, K.r]) <= 4; });
        s += u.id === B.keeper ? 500 : (keepThreat ? 220 : 40);
      }
      if (dk > 3) s -= (dk - 3) * 25;
      var adj2 = enemies.filter(function (e) { return T.dist(p, [e.c, e.r]) <= T.range(u); });
      if (adj2.length) s += 40 + Math.max.apply(null, adj2.map(function (e) { return 25 * (1 - e.n / Math.max(1, e.max)) + 18 * (SG.match(u.t, e.t) - 1); }));
      if (u.t === 'arc' && enemies.some(function (e) { return T.dist(p, [e.c, e.r]) === 1; })) s -= 25;
      s += (T.TERRAIN[tt].def - 1) * 60;
      var near = enemies.reduce(function (m, e) { return Math.min(m, T.dist(p, [e.c, e.r])); }, 99);
      if (!adj2.length) s -= near * 2;
      if (D) {
        var dd = T.dist(p, [D.c, D.r]);
        if (dd === 0) s += 3000;
        else if (u.t === 'cav' && !guarded) s += Math.max(0, 10 - dd) * 30;
      }
    }
    if (s > bestScore) { bestScore = s; bestK = k; }
  });
  var dest = bestK.split(',').map(Number);
  return { type: 'move', c: dest[0], r: dest[1] };
};
// 한 부대를 끝까지 행동시킨다. 반환: 일어난 일 목록
SG.T.aiAct = function (B, u) {
  var T = SG.T, events = [];
  var kp = B.keeper && B.units.filter(function (x) { return x.id === B.keeper; })[0];
  if (u.side === 'def' && (B.keeper === undefined || !kp || kp.n <= 0)) {
    var strongest = T.alive(B, 'def').sort(function (a, b) { return (b.lead + b.n / 300) - (a.lead + a.n / 300); })[0];
    B.keeper = strongest ? strongest.id : null;
  }
  // 공격군: 수비에 기병이 있으면 한 부대를 보급대 지킴이로 남긴다
  var gd = B.guard && B.units.filter(function (x) { return x.id === B.guard; })[0];
  if (u.side === 'atk' && B.depot && (!gd || gd.n <= 0 || gd.side !== 'atk')) {
    var dl = T.alive(B, 'def'), cavN = dl.filter(function (x) { return x.t === 'cav'; }).reduce(function (s, x) { return s + x.n; }, 0);
    var foeCav = cavN >= 0.25 * dl.reduce(function (s, x) { return s + x.n; }, 0), mine = T.alive(B, 'atk');
    B.guard = foeCav && mine.length >= 3 ? mine.slice().sort(function (a, b) { return (a.t === 'cav') - (b.t === 'cav') || a.n - b.n; })[0].id : null;
  }
  var plan = T.aiUnit(B, u);
  if (!plan) { u.done = true; return events; }
  if (plan.type === 'strat') { events.push({ type: 'strat', u: u, t: plan.target, msg: T.strategy(B, u, plan.target, plan.kind) }); return events; }
  if (plan.type === 'bribe') { var bt = plan.target; events.push({ type: 'bribe', u: u, t: bt, msg: T.bribe(B, u, bt), ok: bt.turned === true }); return events; }
  if (plan.type === 'duel') {
    var acc = SG.isPlayer(plan.target.side === 'atk' ? B.atk.fid : B.def.fid) ? null : T.duelAccept(B, u, plan.target);
    events.push({ type: 'duel', u: u, t: plan.target, ask: acc === null });
    if (acc !== null) events[0].res = T.duel(B, u, plan.target, acc);
    return events;
  }
  var from = [u.c, u.r];
  if (plan.c !== u.c || plan.r !== u.r) { T.move(B, u, plan.c, plan.r); events.push({ type: 'move', u: u, from: from }); }
  if (B.over) return events;
  var targets = T.attackTargets(B, u).sort(function (a, b) { return (a.n / SG.match(u.t, a.t)) - (b.n / SG.match(u.t, b.t)); });
  if (targets.length) { var fm = T.bestForm(B, u, targets[0]); events.push({ type: 'attack', u: u, t: targets[0], form: fm, msg: T.attack(B, u, targets[0], fm) }); }
  else u.done = true;
  return events;
};
// 한 쪽 전체를 컴퓨터가 지휘 (화면 없이)
SG.T.aiSide = function (B) {
  var list = SG.T.alive(B, B.side).filter(function (u) { return !u.done; });
  list.sort(function (a, b) { return SG.T.dist([a.c, a.r], [SG.T.CASTLE.c, SG.T.CASTLE.r]) - SG.T.dist([b.c, b.r], [SG.T.CASTLE.c, SG.T.CASTLE.r]); });
  list.forEach(function (u) {
    if (B.over) return;
    var ev = SG.T.aiAct(B, u);
    ev.forEach(function (e) { if (e.type === 'duel' && e.ask) e.res = SG.T.duel(B, e.u, e.t, SG.T.duelAccept(B, e.u, e.t)); });
    u.done = true;
  });
  if (!B.over) SG.T.endSide(B);
};
// 처음부터 끝까지 컴퓨터끼리 (시험용)
SG.T.autoRun = function (atk, def) {
  var B = SG.T.create(atk, def), guard = 0;
  while (!B.over && guard++ < 200) SG.T.aiSide(B);
  return SG.T.result(B);
};
