// 부장(副將): 출진할 때(그리고 우리 도시를 지킬 때) 부대마다 장수 한 명을 부장으로 붙인다.
// 부장은 자기 통솔·무력·지력의 15%를 주장에게 보탠다 (100까지). 거느릴 수 있는 병사도 보탠 통솔로 계산한다.
// 주장이 일기토에서 잡히거나 죽으면 부장이 지휘를 이어받아 부대가 흩어지지 않는다. 부대가 무너지면 부장도 잡힐 수 있다.
var SG = SG || {};

SG.DEP_RATE = 0.15;
SG.DEP_KEYS = ['lead', 'war', 'int'];
SG._deps = {};   // 싸우는 동안: 주장 → 부장

SG.depBoost = function (v, d) { return d == null ? v : Math.max(v, Math.min(100, v + Math.round(d * SG.DEP_RATE))); };

// 부장이 붙은 주장은 능력치가 보태진 모습으로 계산된다 (출진한 동안만)
SG._oNoDep = SG.O;
SG.O = function (id) {
  var o = SG._oNoDep(id), d = id && SG._deps[id];
  if (!o || !d) return o;
  var dp = SG._oNoDep(d), x = {};
  for (var p in o) x[p] = o[p];
  SG.DEP_KEYS.forEach(function (k) { x[k] = SG.depBoost(o[k], dp[k]); });
  return x;
};
// 주장 + 부장이 보여 줄 능력치 (출진 창 미리보기)
SG.depStats = function (oid, dep) {
  var o = SG._oNoDep(oid), dp = dep ? SG._oNoDep(dep) : null, x = {};
  SG.DEP_KEYS.forEach(function (k) { x[k] = dp ? SG.depBoost(o[k], dp[k]) : o[k]; });
  return x;
};
// 거느릴 수 있는 병사 (부장이 있으면 보탠 통솔로)
SG.unitCap = function (oid, dep) {
  if (!oid) return Infinity;
  dep = dep || SG._deps[oid];
  var lead = SG._oNoDep(oid).lead;
  if (dep) lead = SG.depBoost(lead, SG._oNoDep(dep).lead);
  return Math.max(100, Math.round(lead * SG.UNIT_PER_LEAD / 100) * 100);
};
// units 의 부장을 잠시 붙인 채 fn 을 계산한다 (예상 전투력 등)
SG.withDeps = function (units, fn) {
  var keep = SG._deps, m = {};
  for (var k in keep) m[k] = keep[k];
  (units || []).forEach(function (u) { if (u.oid && u.dep) m[u.oid] = u.dep; });
  SG._deps = m;
  try { return fn(); } finally { SG._deps = keep; }
};
// 부장 검사 (prepareAttack 에서): 출진 도시에 있고, 이번 달 일할 수 있고, 주장·다른 부장과 겹치지 않을 것
SG.checkDeps = function (from, units) {
  var used = {};
  units.forEach(function (u) { used[u.oid] = 1; });
  for (var i = 0; i < units.length; i++) {
    var d = units[i].dep;
    if (!d) continue;
    if (used[d]) return SG.name(d) + '은(는) 이미 다른 부대를 맡았습니다';
    if (!SG.ready(from, d)) return SG.name(d) + '은(는) 부장으로 나갈 수 없습니다';
    used[d] = 1;
  }
  return null;
};
// 주장을 잃었을 때 부장이 지휘를 이어받는다. 이어받으면 새 주장 id, 아니면 null
SG.depTakeOver = function (ref) {
  var d = ref.dep, main = ref.oid;
  if (!d || !SG.S.off[d] || SG.S.off[d].s !== 'force') return null;
  delete SG._deps[main];
  ref.oidLost = main; ref.oid = d; ref.dep = null; ref.out = false;
  return d;
};
// 부대 안의 장수들 (주장·잃은 주장·부장)
SG.unitOids = function (u) { return [u.oid, u.oidLost, u.dep].filter(Boolean); };

// 출진: 싸우는 동안 부장을 붙이고, 끝나면 뗀다. 부장도 이번 달 일을 한 것으로 친다
SG._launchNoDep = SG.launchAttack;
SG.launchAttack = async function (from, to, units) {
  var mine = {}, keep = {};
  for (var k in SG._deps) keep[k] = SG._deps[k];
  (units || []).forEach(function (u) { if (u.oid && u.dep) { mine[u.oid] = u.dep; SG._deps[u.oid] = u.dep; } });
  try {
    var r = await SG._launchNoDep.apply(this, arguments);
    if (r && r.ok) Object.keys(mine).forEach(function (k) { var d = SG.S.off[mine[k]]; if (d) d.acted = true; });
    return r;
  } finally {
    SG._deps = keep;   // 공격·수비 부장 모두 뗀다
  }
};

// 컴퓨터: 출진 부대에 남는 장수를 부장으로 붙인다 (보탬이 큰 순서로, 도시에 keep 명은 남김)
SG.aiDeputies = function (cid, plan, keep) {
  var used = {};
  plan.forEach(function (u) { used[u.oid] = 1; });
  var room = SG.officersIn(cid, SG.S.cities[cid].owner).length - plan.length - keep;
  var free = SG.readyOfficers(cid).filter(function (o) { return !used[o]; })
    .sort(function (a, b) { var A = SG._oNoDep(a), B = SG._oNoDep(b); return (B.lead + B.war) - (A.lead + A.war); })
    .slice(0, Math.max(0, room));
  plan.slice().sort(function (a, b) { return b.n - a.n; }).forEach(function (u) {
    if (!free.length) return;
    u.dep = free.shift();
  });
  return plan;
};
