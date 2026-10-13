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
  function take(stat, filter) {
    var list = pool.filter(filter || function () { return true; });
    if (!list.length) return null;
    list.sort(function (a, b) { return SG.O(b)[stat] - SG.O(a)[stat]; });
    pool.splice(pool.indexOf(list[0]), 1);
    return list[0];
  }
  var guard = 0;
  while (pool.length && guard++ < 20) {
    var did = false;
    // 1) 찾은 인재 등용
    var free = SG.freeIn(cid, true);
    if (free.length) {
      var r = take('cha');
      if (r) { SG.cmd.recruit(cid, r, free[0]); continue; }
    }
    // 2) 탐색 (가끔)
    if (pool.length >= 2 && !c._searched && SG.chance(0.35)) {
      c._searched = true;
      var s = take('int');
      if (s) { SG.cmd.search(cid, s); continue; }
    }
    // 3) 민심
    if (c.loyal < 45 && c.food >= 800) {
      var m = take('cha');
      if (m) { SG.cmd.relief(cid, m); continue; }
    }
    // 4) 징병
    var want = th.front ? Math.max(th.max, 7000 + size * 4000) : 3000 + size * 1000;
    var foodCap = (c.food + c.agri * 5) * 100 / 10;
    want = Math.min(want, foodCap, 60000);
    if (c.soldiers < want && c.gold >= 200 && c.loyal >= 35) {
      var k = take('cha');
      if (k) { SG.cmd.conscript(cid, k, null, SG.aiTroopType(cid)); continue; }
    }
    // 5) 훈련
    if (c.soldiers > 2000 && c.train < (th.front ? 80 : 60)) {
      var t = take('lead');
      if (t) { SG.cmd.train(cid, t); continue; }
    }
    // 5-1) 교역: 식량이 모자라면 금으로 사고, 식량이 남아도는데 금이 없으면 판다
    var needF = Math.ceil(c.soldiers / 100);
    if (!c._traded && (c.food < needF * 4 + 500 && c.gold > 500 || c.food > needF * 30 + 20000 && c.gold < 300)) {
      var tr = take('pol');
      if (tr) {
        c._traded = true;
        var R = SG.tradeRates(cid, tr), buy = c.food < needF * 4 + 500;
        var amt = buy ? Math.min(R.max, Math.floor((c.gold - 300) / R.buy) * 100) : Math.min(R.max, c.food - needF * 30);
        if (amt >= 500) { SG.cmd.trade(cid, tr, buy ? 'buy' : 'sell', amt); continue; }
        pool.push(tr);
      }
    }
    // 6) 개발
    if (c.gold >= 150) {
      var kinds = ['agri', 'comm'];
      if (th.front) kinds.push('wall');
      kinds = kinds.filter(function (k2) { return c[k2] < z[k2 + 'Max']; });
      if (kinds.length) {
        kinds.sort(function (a, b) { return c[a] / z[a + 'Max'] - c[b] / z[b + 'Max']; });
        var d = take(kinds[0] === 'wall' ? 'lead' : 'pol');
        if (d) { SG.cmd.develop(cid, d, kinds[0]); did = true; continue; }
      }
    }
    // 7) 남는 장수는 훈련
    if (c.soldiers > 0 && c.train < 100) {
      var t2 = take('lead');
      if (t2) { SG.cmd.train(cid, t2); continue; }
    }
    if (!did) break;
  }
  delete c._searched; delete c._traded;
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
  // 후방 → 전방으로 병력·장수 보내기
  cities.forEach(function (cid) {
    var c = SG.S.cities[cid], d = dist[cid];
    if (d === undefined || d === 0) return;
    var offs = SG.readyOfficers(cid);
    var next = SG.ADJ[cid].filter(function (n) { return SG.S.cities[n].owner === fid && dist[n] === d - 1; })[0];
    if (!next || !offs.length) return;
    var keep = SG.officersIn(cid, fid).length > 1;
    if (c.soldiers > 4000 || offs.length > 2) {
      offs.sort(function (a, b) { return (SG.O(b).lead + SG.O(b).war) - (SG.O(a).lead + SG.O(a).war); });
      var movers = keep ? offs.slice(0, Math.max(1, offs.length - 1)) : [];
      if (!movers.length) return;
      var n = Math.floor(c.soldiers * 0.7);
      SG.cmd.move(cid, movers, next, n, Math.floor(c.gold * 0.3), Math.floor(Math.max(0, c.food - 1500) * 0.6));
    }
  });
  if (domesticOnly) return;

  // 공격
  var attacked = {};
  var need = 1.25 + SG.rand() * 0.3; // 이번 달의 공격 기준 (병력 비율)
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
      var n0 = Math.floor(Math.min(5000, c.soldiers * 0.35));
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
    var w = squad.reduce(function (s, o) { return s + SG.O(o).lead; }, 0);
    var plan = SG.assignTypes(cid, squad.map(function (o) { return { oid: o, n: Math.floor(send * SG.O(o).lead / w / 100) * 100 }; })
      .filter(function (u2) { return u2.n >= 100; }));
    var myP = plan.reduce(function (s, u2) { return s + SG.unitPower(u2.oid, u2.n, c.train, c.morale, u2.t); }, 0);
    targets.forEach(function (n) {
      var t = SG.S.cities[n];
      if (!t.owner) return;
      var dp = SG.AI.cityDefense(n) + 1;
      var ratio = myP / dp;
      var score = ratio * (1 + SG.CITIES[n].size * 0.1) * (SG.isPlayer(t.owner) ? 0.95 : 1);
      if (ratio > need && score > bestScore) { best = n; bestScore = score; }
    });
    if (best && plan.length) {
      var foodNeed = Math.ceil(send / 100);
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
