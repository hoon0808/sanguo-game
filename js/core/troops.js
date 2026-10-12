// 병종: 보병(步)·기병(騎)·궁병(弓). 도시마다 기병·궁병 수를 따로 들고, 나머지는 보병이다.
// 상성: 보병(창)은 기병에, 기병은 궁병에, 궁병은 보병에 강하다.
var SG = SG || {};

SG.TROOP_KEYS = ['inf', 'cav', 'arc'];
SG.TROOPS = {
  inf: { n: '보병', h: '步', cost: 1, desc: '창과 방패. 기병에 강하고 궁병에 약하다. 성을 공격하고 지키는 데 든든하다' },
  cav: { n: '기병', h: '騎', cost: 2.2, desc: '빠르다(이동 +2). 궁병에 강하고 보병(창)에 약하다. 숲·산과 성 공격에는 약하다' },
  arc: { n: '궁병', h: '弓', cost: 1.4, desc: '두 칸 떨어진 적에게 활을 쏜다. 보병에 강하고 기병에 약하다. 성벽 위에서 강하다' }
};
// 공격하는 쪽 병종 → 맞는 쪽 병종: 피해 배율
SG.MATCH = { inf: { cav: 1.3, arc: 0.8 }, cav: { arc: 1.3, inf: 0.8 }, arc: { inf: 1.3, cav: 0.8 } };
SG.match = function (a, b) { return (SG.MATCH[a || 'inf'] || {})[b || 'inf'] || 1; };

// ---- 장수가 잘 다루는 병종 (잘 쓰는 병종을 맡으면 힘 +12%)
SG.APT_CAV = ['lvbu', 'machao', 'madai', 'pangde', 'zhangliao', 'zhaoyun', 'gongsunzan', 'xiahouyuan', 'mateng', 'hansui', 'caochun', 'wenchou', 'yanliang', 'zhangfei', 'sunce', 'huaxiong'];
SG.APT_ARC = ['huangzhong', 'taishici', 'ganning', 'zhangren', 'yanyan', 'huanggai', 'chengpu', 'zhurong'];
SG.apt = function (oid) {
  if (!oid) return 'inf';
  var o = SG.O(oid);
  if (SG.APT_CAV.indexOf(oid) >= 0 || o.sk === '기마') return 'cav';
  if (SG.APT_ARC.indexOf(oid) >= 0 || o.sk === '궁신') return 'arc';
  if (o.int >= 85 && o.war < 65) return 'arc';  // 책사는 뒤에서 활 부대를 부린다
  return 'inf';
};
SG.APT_BONUS = 1.12;

// ---- 도시 병력 구성
// 처음 구성: 북쪽·서쪽(유주·병주·기주·량주)은 기병이 많고, 남쪽(형주·익주·양주 동쪽)은 궁병이 많다
SG.troopShare = function (cid) {
  var C = SG.CITIES[cid];
  if (C.prov === '유주' || C.prov === '병주' || C.prov === '기주' || (C.prov === '양주' && C.lon < 110)) return { cav: 0.3, arc: 0.15 };
  if (C.prov === '형주' || C.prov === '익주' || C.prov === '양주') return { cav: 0.1, arc: 0.3 };
  return { cav: 0.2, arc: 0.2 };
};
SG.initTroops = function (c, cid) {
  var sh = SG.troopShare(cid);
  c.cav = Math.floor(c.soldiers * sh.cav / 100) * 100;
  c.arc = Math.floor(c.soldiers * sh.arc / 100) * 100;
  c.tTot = c.soldiers;
};
// 병사 수가 다른 곳(굶주림·재해·반란 등)에서 줄었으면 기병·궁병도 같은 비율로 줄인다. 늘었으면 보병으로 본다.
SG.troops = function (c, cid) {
  if (c.cav === undefined || c.arc === undefined) {
    if (cid) SG.initTroops(c, cid); else { c.cav = 0; c.arc = 0; c.tTot = c.soldiers; }
  }
  if (c.tTot !== c.soldiers) {
    if (c.soldiers < c.tTot && c.tTot > 0) {
      var k = Math.max(0, c.soldiers) / c.tTot;
      c.cav = Math.floor(c.cav * k); c.arc = Math.floor(c.arc * k);
    }
    c.tTot = c.soldiers;
  }
  c.cav = SG.clamp(c.cav, 0, Math.max(0, c.soldiers));
  c.arc = SG.clamp(c.arc, 0, Math.max(0, c.soldiers - c.cav));
  return { inf: Math.max(0, c.soldiers - c.cav - c.arc), cav: c.cav, arc: c.arc };
};
SG.cityTroops = function (cid) { return SG.troops(SG.S.cities[cid], cid); };
SG.addTroops = function (c, t, n, cid) {
  SG.troops(c, cid);
  c.soldiers += n;
  if (t === 'cav') c.cav += n; else if (t === 'arc') c.arc += n;
  c.tTot = c.soldiers;
};
// mix: {inf, cav, arc}
SG.takeTroops = function (c, mix, cid) {
  SG.troops(c, cid);
  var tot = (mix.inf || 0) + (mix.cav || 0) + (mix.arc || 0);
  c.cav -= mix.cav || 0; c.arc -= mix.arc || 0; c.soldiers -= tot;
  c.tTot = c.soldiers;
  SG.troops(c, cid);
};
SG.putTroops = function (c, mix, cid) {
  SG.TROOP_KEYS.forEach(function (t) { if (mix[t] > 0) SG.addTroops(c, t, mix[t], cid); });
};
// 도시 구성 비율대로 n 명을 나눈다
SG.mixOf = function (cid, n) {
  var p = SG.cityTroops(cid), tot = p.inf + p.cav + p.arc;
  if (tot <= 0 || n <= 0) return { inf: 0, cav: 0, arc: 0 };
  n = Math.min(n, tot);
  var cav = Math.min(p.cav, Math.round(n * p.cav / tot)), arc = Math.min(p.arc, Math.round(n * p.arc / tot));
  var inf = n - cav - arc;
  if (inf > p.inf) { var over = inf - p.inf; inf = p.inf; if (p.cav - cav >= over) cav += over; else arc += over; }
  return { inf: inf, cav: cav, arc: arc };
};
// 부대 목록의 병종별 합
SG.unitsMix = function (units) {
  var m = { inf: 0, cav: 0, arc: 0 };
  units.forEach(function (u) { if (u.n > 0) m[u.t || 'inf'] += u.n; });
  return m;
};
// 도시에 부대 병력을 그대로 둔다 (점령·수비 성공 뒤)
SG.setTroopsFromUnits = function (c, units) {
  var m = SG.unitsMix(units);
  c.soldiers = m.inf + m.cav + m.arc; c.cav = m.cav; c.arc = m.arc; c.tTot = c.soldiers;
};

// 출진 부대에 병종을 정한다: 장수가 잘 다루는 병종을 먼저, 모자라면 많이 남은 병종으로 (병력은 줄일 수 있음)
SG.assignTypes = function (cid, plan) {
  var pool = SG.cityTroops(cid);
  plan.slice().sort(function (a, b) { return b.n - a.n; }).forEach(function (u) {
    var want = u.t || SG.apt(u.oid);
    if (pool[want] < u.n) {
      var alt = SG.TROOP_KEYS.slice().sort(function (a, b) { return pool[b] - pool[a]; })[0];
      if (pool[want] < Math.min(u.n, pool[alt]) * 0.6 || pool[want] < 100) want = alt;
      u.n = Math.min(u.n, Math.floor(pool[want] / 100) * 100);
    }
    u.t = want; pool[want] -= u.n;
  });
  return plan.filter(function (u) { return u.n >= 100; });
};

// 컴퓨터 징병: 목표 비율에서 가장 모자란 병종
SG.aiTroopType = function (cid) {
  var c = SG.S.cities[cid], p = SG.cityTroops(cid), sh = SG.troopShare(cid), tot = Math.max(1, c.soldiers);
  var gap = { inf: (1 - sh.cav - sh.arc) - p.inf / tot, cav: sh.cav - p.cav / tot, arc: sh.arc - p.arc / tot };
  var t = SG.TROOP_KEYS.slice().sort(function (a, b) { return gap[b] - gap[a]; })[0];
  if (t === 'cav' && c.gold < 350) t = 'inf';
  return t;
};

// 양쪽 병종 구성에서 나오는 힘 배율 (자동 전투)
SG.mixShare = function (units) {
  var m = SG.unitsMix(units), tot = m.inf + m.cav + m.arc || 1;
  return { inf: m.inf / tot, cav: m.cav / tot, arc: m.arc / tot };
};
SG.matchVs = function (t, foeShare) {
  return SG.TROOP_KEYS.reduce(function (s, e) { return s + foeShare[e] * SG.match(t, e); }, 0);
};
