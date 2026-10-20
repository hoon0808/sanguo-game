// 컴퓨터 군주의 판단: 내정 → 인재 → 병력 이동 → 공격
var SG = SG || {};
SG.AI = {};

// 도시 하나의 내정 (플레이어의 '위임' 도시도 이것을 쓴다)
SG.AI.city = function (cid) {
  var c = SG.S.cities[cid], fid = c.owner, size = SG.CITIES[cid].size, z = SG.CITY_SIZE[size];
  if (!fid) return;
  var th = SG.threat(cid);
  var pool = SG.readyOfficers(cid);
  // 충성 낮은 장수 포상 (행동 소모 없음)
  SG.officersIn(cid, fid).forEach(function (o) {
    if (SG.S.off[o].loy < 70 && c.gold > 400 && SG.S.forces[fid].lord !== o) SG.cmd.reward(cid, o);
  });
  // 명령마다 한 달에 한 번: 할 일을 고른 뒤, 남는 장수는 협력 장수로 붙인다
  var free = SG.freeIn(cid, true), tasks = [];
  function add(key, stat, run, weight) { if (!SG.cmdUsed(cid, key)) tasks.push({ key: key, stat: stat, run: run, w: weight || 1 }); }
  if (free.length) add('recruit', 'cha', function (o) { return SG.cmd.recruit(cid, o, free[0]); }, 2);
  if (pool.length >= 2 && SG.chance(0.35)) add('search', 'int', function (o) {
    var sr = SG.cmd.search(cid, o);
    if (sr && sr.item) SG.log(c.owner, SG.forceName(c.owner) + '의 ' + SG.name(o) + '이(가) ' + SG.cityName(cid) + '에서 ' + SG.itemName(sr.item) + '을(를) 손에 넣었다.', 'person');
    return sr;
  }, 0.5);
  if (c.loyal < 45 && c.food >= 800) add('relief', 'cha', function (o) { return SG.cmd.relief(cid, o); }, 1.5);
  var want = th.front ? Math.max(th.max, 7000 + size * 4000) : 3000 + size * 1000;
  var foodCap = (c.food + c.agri * 5) * 100 / 10;
  want = Math.min(want * (SG.aiMul ? SG.aiMul(fid, 'army') : 1), foodCap, 60000);
  if (c.soldiers < want && c.gold >= 200 && c.loyal >= 35) add('conscript', 'cha', function (o) { return SG.cmd.conscript(cid, o, null, SG.aiTroopType(cid)); }, 1.5);
  if (c.soldiers > 2000 && c.train < (th.front ? 80 : 60)) add('train', 'lead', function (o) { return SG.cmd.train(cid, o); }, 1.2);
  // 교역: 식량이 모자라면 금으로 사고, 식량이 남아도는데 금이 없으면 판다
  var needF = Math.ceil(c.soldiers / 100);
  if (c.food < needF * 4 + 500 && c.gold > 500 || c.food > needF * 30 + 20000 && c.gold < 300) add('trade', 'pol', function (o) {
    var R = SG.tradeRates(cid, o), buy = c.food < needF * 4 + 500;
    var amt = buy ? Math.min(R.max, Math.floor((c.gold - 300) / R.buy) * 100) : Math.min(R.max, c.food - needF * 30);
    return amt >= 500 ? SG.cmd.trade(cid, o, buy ? 'buy' : 'sell', amt) : null;
  }, 0.3);
  // 개발: 모자란 것부터 (금이 될 때만)
  var kinds = ['agri', 'comm'];
  if (th.front) kinds.push('wall');
  kinds = kinds.filter(function (k2) { return c[k2] < z[k2 + 'Max']; });
  kinds.sort(function (a, b) { return c[a] / z[a + 'Max'] - c[b] / z[b + 'Max']; });
  var budget = c.gold - 100;
  kinds.forEach(function (k2) { if (budget >= SG.COST.develop) { budget -= SG.COST.develop * 2; add(k2, k2 === 'wall' ? 'lead' : 'pol', function (o) { return SG.cmd.develop(cid, o, k2); }, 1); } });
  // 계략: 위협받는 전방 도시는 매복, 여유가 있으면 사이 나쁜 이웃 적 도시에 선동·방화 (내응은 플레이어만 — 시험해 보니 컴퓨터가 쓰면 괜히 적만 늘었다)
  // 난이도: 쉬움이면 컴퓨터는 이 계략들을 쓰지 않는다 (예전 그대로), 보통은 절반쯤
  var sm = SG.aiMul ? SG.aiMul(fid, 'scheme') : 1;
  if (SG.cmd.ambush && th.front && sm > 0) {
    // 선동·방화는 우호도를 깎으므로 이미 사이가 나쁜(우호도 30 미만) 이웃에게만
    var foes = SG.ADJ[cid].filter(function (x) { var w = SG.S.cities[x].owner; return w && w !== fid && !SG.isAlly(fid, w) && SG.rel(fid, w).fr < 30; });
    if (th.max > c.soldiers * 0.6 && !SG.ambushOf(cid) && c.gold > 300 && c.soldiers >= 500 && SG.chance(Math.min(1, 0.6 * sm))) add('ambush', 'int', function (o) { return SG.cmd.ambush(cid, o); }, 1.1);
    if (foes.length && c.gold > 1000 && SG.chance(0.25 * sm)) {
      var tg = foes.slice().sort(function (a, b) { return SG.S.cities[a].loyal - SG.S.cities[b].loyal; })[0], T = SG.S.cities[tg];
      if (T.loyal < 50) add('incite', 'int', function (o) { return SG.cmd.incite(cid, o, tg); }, 0.6);
      else if (T.food > 3000) add('arson', 'int', function (o) { return SG.cmd.arson(cid, o, tg); }, 0.6);
    }
  }
  // 남는 장수가 있는데 할 일이 없으면 훈련
  if (!tasks.some(function (t) { return t.key === 'train'; }) && c.soldiers > 0 && c.train < 100) add('train', 'lead', function (o) { return SG.cmd.train(cid, o); }, 0.8);

  tasks = tasks.slice(0, pool.length);
  // 주장: 할 일마다 그 능력이 가장 높은 장수
  function best(stat) {
    if (!pool.length) return null;
    pool.sort(function (a, b) { return SG.O(b)[stat] - SG.O(a)[stat]; });
    return pool.shift();
  }
  tasks.forEach(function (t) { t.main = best(t.stat); t.help = []; });
  // 남은 장수는 중요한 일부터 협력 (한 일에 최대 3명)
  var order = tasks.filter(function (t) { return t.key !== 'trade' && t.key !== 'search'; }).sort(function (a, b) { return b.w - a.w; });
  var guard = 0;
  while (pool.length && order.length && guard++ < 40) {
    var t = order[guard % order.length];
    if (t.help.length >= SG.COOP_MAX) { if (order.every(function (x) { return x.help.length >= SG.COOP_MAX; })) break; continue; }
    t.help.push(best(t.stat));
  }
  tasks.forEach(function (t) {
    if (!t.main) return;
    SG.setHelpers(t.main, t.help);
    t.run(t.main);
    SG.helpers = null;
  });
};

// 앞쪽(적과 맞닿은) 도시까지 거리
SG.AI.frontDistance = function (fid) {
  var dist = {}, q = [];
  SG.citiesOf(fid).forEach(function (cid) {
    if (SG.threat(cid).front) { dist[cid] = 0; q.push(cid); }
  });
  while (q.length) {
    var x = q.shift();
    SG.ADJ[x].forEach(function (n) {
      if (SG.S.cities[n].owner === fid && dist[n] === undefined) { dist[n] = dist[x] + 1; q.push(n); }
    });
  }
  return dist;
};

// 대략적인 전투력 비교
SG.AI.cityDefense = function (cid) {
  var t = SG.S.cities[cid], wallMax = SG.CITY_SIZE[SG.CITIES[cid].size].wallMax;
  var d = SG.makeDefense(cid);
  var p = d.units.reduce(function (s, u) { return s + SG.unitPower(u.oid, u.n, t.train, t.morale, u.t); }, 0);
  return p * (1 + 0.4 * t.wall / wallMax);
};

// 세력 전체: 병력 이동과 공격
SG.AI.military = async function (fid, domesticOnly) {
  var cities = SG.shuffle(SG.citiesOf(fid));
  var dist = SG.AI.frontDistance(fid);
  // 전방 도시마다 모자라는 병사 (이미 길 위에서 오고 있는 병사는 뺀다)
  var gap = {}, S = SG.S;
  cities.forEach(function (x) {
    if (dist[x] !== 0) return;
    var coming = (SG.marchesTo ? SG.marchesTo(x) : []).filter(function (v) { return v.fid === fid; }).reduce(function (t, v) { return t + (v.n || 0); }, 0);
    gap[x] = SG.garrisonWant(x) * 1.1 - S.cities[x].soldiers - coming;
  });
  // 가장 급한 전방 도시 (멀수록 덜 고른다: 모자람 ÷ (걸리는 달 + 1)), 4달 넘게 걸리면 안 감
  // 난이도 쉬움의 컴퓨터는 예전처럼 한 걸음씩만 (far 0)
  var far = SG.aiMul ? SG.aiMul(fid, 'far') : 1;
  function pickFront(cid, minGap) {
    if (!far) return null;
    var best = null, bs = 0;
    Object.keys(gap).forEach(function (x) {
      if (x === cid || gap[x] < minGap) return;
      var m = SG.travelMonths ? SG.travelMonths(fid, cid, x) : 0;
      if (!m || m > 4) return;
      var sc = gap[x] / (m + 1);
      if (sc > bs) { bs = sc; best = x; }
    });
    return best;
  }
  // 후방 → 전방으로 병력·장수 보내기: 급한 전방 도시가 있으면 멀어도 곧장 그리로 (도시 하나 건널 때마다 한 달), 없으면 한 걸음 앞 도시로
  cities.forEach(function (cid) {
    var c = S.cities[cid], d = dist[cid];
    if (d === undefined || d === 0) return;
    var offs = SG.readyOfficers(cid);
    var next = SG.ADJ[cid].filter(function (n) { return S.cities[n].owner === fid && dist[n] === d - 1; })[0];
    if (!next || !offs.length) return;
    var keep = SG.officersIn(cid, fid).length > 1;
    if (c.soldiers > 4000 || offs.length > 2) {
      offs.sort(function (a, b) { return (SG.O(b).lead + SG.O(b).war) - (SG.O(a).lead + SG.O(a).war); });
      var movers = keep ? offs.slice(0, Math.max(1, offs.length - 1)) : [];
      if (!movers.length) return;
      var n = Math.floor(c.soldiers * 0.7);
      var to = pickFront(cid, 1500) || next;
      var r = SG.cmd.move(cid, movers, to, n, Math.floor(c.gold * 0.3), Math.floor(Math.max(0, c.food - 1500) * 0.6));
      if (r && r.ok && gap[to] !== undefined) gap[to] -= n;
    }
  });
  // 식량: 곳간이 넘치는 후방 도시가 식량이 모자란 전방 도시로 수레를 보낸다 (장수는 제자리)
  cities.forEach(function (cid) {
    var c = S.cities[cid];
    if (!far || !dist[cid] || !SG.cmd.transport || SG.cmdUsed(cid, 'transport')) return;
    var spareF = c.food - Math.ceil(c.soldiers / 100) * 12 - 5000;
    if (spareF < 3000) return;
    var best = null, bs = 0;
    cities.forEach(function (x) {
      if (dist[x] !== 0) return;
      var t = S.cities[x], short = Math.ceil(t.soldiers / 100) * 6 - t.food;
      var m = SG.travelMonths(fid, cid, x);
      if (short > 1000 && m && m <= 4 && short / (m + 1) > bs) { bs = short / (m + 1); best = x; }
    });
    if (!best) return;
    var carrier = SG.readyOfficers(cid).sort(function (a, b) { return SG.O(a).pol - SG.O(b).pol; })[0];
    if (carrier) SG.cmd.transport(cid, carrier, cid, best, 0, Math.min(spareF, Math.ceil(S.cities[best].soldiers / 100) * 6 - S.cities[best].food + 2000), 0);
  });
  if (domesticOnly) return;

  // 공격
  var attacked = {};
  var need = 1.25 + SG.rand() * 0.3 + (SG.isAI && SG.isAI(fid) ? SG.diff().need : 0); // 이번 달의 공격 기준 (병력 비율, 어려울수록 과감)
  cities = SG.shuffle(SG.citiesOf(fid));
  for (var i = 0; i < cities.length; i++) {
    var cid = cities[i], c = SG.S.cities[cid];
    if (c.owner !== fid) continue;
    var ready = SG.readyOfficers(cid);
    if (!ready.length) continue;
    var targets = SG.ADJ[cid].filter(function (n) {
      var o = SG.S.cities[n].owner;
      return o !== fid && !SG.isAlly(fid, o) && !attacked[n];
    });
    if (!targets.length) continue;
    // 빈 도시 먼저
    var empty = targets.filter(function (n) { var t = SG.S.cities[n]; return !t.owner && t.soldiers <= 0; })[0];
    var total = SG.officersIn(cid, fid).length;
    if (empty && total >= 2 && c.soldiers >= 4000) {
      ready.sort(function (a, b) { return SG.O(a).lead - SG.O(b).lead; });
      var u = ready[ready.length > 1 ? 1 : 0];
      var n0 = Math.floor(Math.min(5000, c.soldiers * 0.35, SG.unitCap(u)));
      var res0 = await SG.launchAttack(cid, empty, SG.assignTypes(cid, [{ oid: u, n: n0 }]));
      if (res0.ok) { attacked[empty] = true; continue; }
    }
    // 적 도시
    var best = null, bestScore = 0;
    ready.sort(function (a, b) { return (SG.O(b).lead * 1.2 + SG.O(b).war) - (SG.O(a).lead * 1.2 + SG.O(a).war); });
    var squad = ready.slice(0, Math.min(SG.MAX_UNITS, ready.length));
    if (squad.length === total && total > 1) squad.pop(); // 한 명은 남긴다
    if (!squad.length) continue;
    var otherFront = targets.length > 1;
    var send = Math.floor(c.soldiers * (otherFront ? 0.65 : 0.8));
    if (send < 5000) continue;
    var share = SG.splitByLead(send, squad);
    send = squad.reduce(function (s, o) { return s + share[o]; }, 0);   // 통솔 한도 때문에 줄 수 있다
    var plan = SG.assignTypes(cid, squad.map(function (o) { return { oid: o, n: share[o] }; })
      .filter(function (u2) { return u2.n >= 100; }));
    var myP = plan.reduce(function (s, u2) { return s + SG.unitPower(u2.oid, u2.n, c.train, c.morale, u2.t); }, 0);
    targets.forEach(function (n) {
      var t = SG.S.cities[n];
      if (!t.owner) return;
      var dp = SG.AI.cityDefense(n) + 1;
      var ratio = myP / dp;
      var score = ratio * (1 + SG.CITIES[n].size * 0.1) * (SG.isPlayer(t.owner) ? (SG.diff ? SG.diff().hunt : 0.95) : 1);
      if (ratio > need && score > bestScore) { best = n; bestScore = score; }
    });
    if (best && plan.length) {
      var foodNeed = SG.supplyNeed(send, 20);
      if (c.food < foodNeed + 300) continue;
      attacked[best] = true;
      await SG.launchAttack(cid, best, plan);
      if (SG.S.over) return;
    }
  }
};

SG.AI.force = async function (fid) {
  if (!SG.S.forces[fid] || !SG.S.forces[fid].alive) return;
  if (SG.AI.diplomacy) await SG.AI.diplomacy(fid);
  await SG.AI.military(fid, false);
  if (!SG.S.forces[fid].alive) return;
  SG.citiesOf(fid).forEach(SG.AI.city);
};
