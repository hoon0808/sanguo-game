// 한 달 진행: 컴퓨터 세력 행동 → 다음 달 (수입·수확·식량·충성·나이·사건)
var SG = SG || {};

// 태수: 군주가 그 도시에 있으면 군주, 임명한 태수(c.gov)가 있으면 그 장수, 아니면 통솔+정치가 가장 높은 장수
SG.governor = function (cid) {
  var c = SG.S.cities[cid];
  if (!c.owner) return null;
  var offs = SG.officersIn(cid, c.owner);
  if (!offs.length) return null;
  var lord = SG.S.forces[c.owner].lord;
  if (offs.indexOf(lord) >= 0) return lord;
  if (c.gov && offs.indexOf(c.gov) >= 0) return c.gov;
  return offs.slice().sort(function (a, b) { return (SG.O(b).lead + SG.O(b).pol) - (SG.O(a).lead + SG.O(a).pol); })[0];
};
// 태수의 정치가 수입·수확을 늘리거나 줄인다 (정치 60 기준, 100 이면 +10%, 20 이면 −10%)
SG.govRate = function (cid) {
  var g = SG.governor(cid);
  return g ? 1 + (SG.O(g).pol - 60) / 400 : 0.9;
};
// 태수 임명 (명령 횟수는 쓰지 않는다)
SG.cmd = SG.cmd || {};
SG.appoint = function (cid, oid) {
  var c = SG.S.cities[cid], t = SG.S.off[oid];
  if (!c.owner || !t || t.s !== 'force' || t.f !== c.owner || t.c !== cid) return { ok: false, msg: '이 도시의 우리 장수만 태수로 임명할 수 있습니다' };
  var lord = SG.S.forces[c.owner].lord;
  if (SG.officersIn(cid, c.owner).indexOf(lord) >= 0) return { ok: false, msg: '군주가 머무는 도시는 군주가 직접 다스립니다' };
  var was = SG.governor(cid), g = 0;
  c.gov = oid;
  if (was !== oid && oid !== lord) { g = Math.min(5, 100 - t.loy); t.loy += g; }
  var msg = SG.name(oid) + '을(를) ' + SG.cityName(cid) + ' 태수로 임명했다.' + (g ? ' 충성 +' + g : '');
  SG.log(c.owner, msg, 'staff');
  return { ok: true, msg: SG.josa(msg), gain: g };
};
SG.income = function (cid) {
  var c = SG.S.cities[cid];
  return Math.round((c.comm * 0.12 + c.pop / 12000) * (0.5 + c.loyal / 200) * SG.govRate(cid));
};
SG.harvest = function (cid) {
  var c = SG.S.cities[cid];
  return Math.round((c.agri * 5 + c.pop / 400) * (0.5 + c.loyal / 200) * SG.govRate(cid));
};
SG.HARVEST_MONTH = 7;

// 플레이어가 '턴 종료'를 눌렀을 때
SG.endTurn = async function () {
  var S = SG.S;
  if (S.over) return;
  if (S.player && SG.S.forces[S.player].alive) {
    var mine = SG.citiesOf(S.player);
    // 위임한 도시만 태수가 움직인다 (위임하지 않은 도시의 장수·병사는 건드리지 않는다. 단, 위임 도시가 이웃 후방 도시의 남는 병사를 데려올 수는 있다)
    var reps = mine.filter(function (cid) { return S.cities[cid].deleg; }).map(SG.runDelegated);
    if (reps.length && SG.ui && SG.ui.delegReport) await SG.ui.delegReport(reps);
  }
  var order = SG.shuffle(SG.aliveForces().filter(function (f) { return f !== S.player; }));
  for (var i = 0; i < order.length; i++) {
    if (SG.onAIForce) await SG.onAIForce(order[i]);
    await SG.AI.force(order[i]);
    if (S.over) return;
  }
  await SG.nextMonth();
};

// 위임한 도시: 태수(컴퓨터)가 남은 장수에게 명령을 내린다. 무엇을 했는지 보고를 돌려준다
SG.DELEG_FIELDS = ['gold', 'food', 'soldiers', 'agri', 'comm', 'wall', 'loyal', 'train', 'morale'];
SG.runDelegated = function (cid) {
  var c = SG.S.cities[cid], before = {}, after = {};
  SG.DELEG_FIELDS.forEach(function (f) { before[f] = c[f]; });
  var idle = SG.readyOfficers(cid).length, acts;
  SG.cmdLog = [];
  try { SG.delegLogistics(cid); SG.AI.city(cid); } finally { acts = SG.cmdLog; SG.cmdLog = null; }
  SG.DELEG_FIELDS.forEach(function (f) { after[f] = c[f]; });
  acts.forEach(function (a) { SG.log(null, SG.cityName(cid) + '(위임) — ' + a.msg, 'deleg'); });
  var why = acts.length ? '' : !idle ? '이번 달은 직접 명령을 내려서 남은 장수가 없었습니다' :
    c.gold < 150 ? '금이 모자라 할 수 있는 일이 없었습니다 (금 ' + c.gold + ')' : '지금은 더 할 일이 없다고 보았습니다';
  return { cid: cid, before: before, after: after, acts: acts, idle: idle, why: why };
};
// 도시가 지켜야 할 병사 수 (전방: 이웃 적 병력 이상, 후방: 조금)
SG.garrisonWant = function (cid) {
  var th = SG.threat(cid), size = SG.CITIES[cid].size;
  return th.front ? Math.min(60000, Math.max(th.max, 7000 + size * 4000)) : 3000 + size * 1000;
};
// 위임 태수의 병력 조정: 전방이면 장수가 이웃 후방 도시에 가서 남는 병사를 이끌고 돌아오고(수송), 후방이면 장수가 남는 병사를 이끌고 이웃 전방 도시로 옮겨 간다(이동).
// 일은 이 도시 장수 중 정치가 가장 낮은 한두 명이 맡는다 (개발 잘하는 장수는 남겨 둔다).
SG.delegLogistics = function (cid) {
  var S = SG.S, c = S.cities[cid], fid = c.owner;
  var pool = SG.readyOfficers(cid).sort(function (a, b) { return SG.O(a).pol - SG.O(b).pol; });
  if (pool.length < 2) return; // 한 명뿐이면 도시 일을 먼저
  var spare = function (x) { return SG.threat(x).front ? 0 : Math.max(0, S.cities[x].soldiers - SG.garrisonWant(x)); };
  var foodFor = function (src, n) { return Math.floor(Math.min(S.cities[src].food * 0.5, n / 100 * 6)); };
  var nbrs = SG.ADJ[cid].filter(function (n) { return S.cities[n].owner === fid; });
  var jobs = 0;
  if (SG.threat(cid).front) {
    var need = SG.garrisonWant(cid) - c.soldiers;
    nbrs.map(function (n) { return [n, spare(n)]; }).filter(function (x) { return x[1] >= 1000; })
      .sort(function (a, b) { return b[1] - a[1]; }).forEach(function (x) {
        if (need < 1000 || jobs >= 2 || pool.length < 2) return;
        var n = Math.floor(Math.min(need, x[1]) / 100) * 100;
        var r = SG.cmd.transport(cid, pool.shift(), x[0], cid, n, foodFor(x[0], n));
        if (r.ok) { need -= n; jobs++; }
      });
  } else {
    var have = spare(cid);
    nbrs.filter(function (n) { return SG.threat(n).front; }).map(function (n) { return [n, SG.garrisonWant(n) - S.cities[n].soldiers]; })
      .filter(function (x) { return x[1] >= 1000; }).sort(function (a, b) { return b[1] - a[1]; }).forEach(function (x) {
        if (have < 1000 || jobs >= 2 || pool.length < 2) return;
        var n = Math.floor(Math.min(have, x[1]) / 100) * 100;
        var r = SG.cmd.move(cid, [pool.shift()], x[0], n, 0, foodFor(cid, n)); // 장수가 병사를 이끌고 옮겨 간다
        if (r.ok) { have -= n; jobs++; }
      });
  }
};

SG.nextMonth = async function () {
  var S = SG.S;
  S.month++;
  S.turnCount++;
  if (S.month > 12) { S.month = 1; S.year++; }
  Object.keys(S.off).forEach(function (o) { S.off[o].acted = false; });
  if (SG.resetCmds) SG.resetCmds();
  // 지난달에 보낸 수레(금·식량)가 도착
  S.arrived = {};
  if (SG.deliverConvoys) SG.deliverConvoys();

  // 수입·수확·식량
  Object.keys(S.cities).forEach(function (cid) {
    var c = S.cities[cid];
    if (!c.owner) {
      c.loyal = Math.min(70, c.loyal + 1);
      return;
    }
    var dm = SG.aiMul ? SG.aiMul(c.owner, 'inc') : 1;
    c.gold += Math.round(SG.income(cid) * dm);
    if (S.month === SG.HARVEST_MONTH) c.food += Math.round(SG.harvest(cid) * dm);
    var need = Math.ceil(c.soldiers / 100);
    if (c.food >= need) c.food -= need;
    else {
      c.food = 0;
      var lost = Math.ceil(c.soldiers * 0.12);
      c.soldiers -= lost;
      c.morale = Math.max(0, c.morale - 10);
      SG.log(c.owner, SG.cityName(cid) + '에 군량이 떨어져 병사 ' + SG.fmt(lost) + '명이 달아났다.', 'warn');
    }
    var maxPop = SG.CITY_SIZE[SG.CITIES[cid].size].pop * 1.6;
    c.pop = Math.min(maxPop, Math.round(c.pop * (1 + (c.loyal - 35) / 25000)));
    if (c.morale < c.train) c.morale = Math.min(c.train, c.morale + 1);
    // 매력 높은 태수는 백성을 다독인다
    var gv = SG.governor(cid);
    if (gv && SG.O(gv).cha >= 80 && c.loyal < 100) c.loyal++;
  });
  if (S.month === SG.HARVEST_MONTH && S.player) SG.log(S.player, '가을걷이로 각 도시에 식량이 들어왔다.', 'sys');

  // 장수 충성·이탈
  var leaving = [];
  Object.keys(S.off).forEach(function (oid) {
    var o = S.off[oid];
    if (o.s !== 'force') return;
    var f = S.forces[o.f];
    if (!f || f.lord === oid || SG.isKin(oid, f.lord)) { o.loy = 100; return; }
    if (S.month === 1) {
      var lord = SG.O(f.lord);
      o.loy = SG.clamp(o.loy + Math.round((lord.cha - 65) / 12) + SG.randInt(-2, 1), 0, 100);
    }
    // 어려운 난이도: 우리 장수 충성이 조금씩 떨어진다
    if (SG.diff && o.f === S.player && SG.chance(SG.diff().loyDrop)) o.loy = Math.max(0, o.loy - 1);
    if (o.loy < 35 && SG.chance(0.06)) leaving.push(oid);
  });
  for (var li = 0; li < leaving.length; li++) {
    var oid = leaving[li], f = S.off[oid].f;
    if (SG.isPlayer(f) && SG.farewell && await SG.farewell(oid)) continue;
    SG.makeFree(oid, S.off[oid].c);
    SG.log(f, SG.name(oid) + '이(가) ' + SG.forceName(f) + ' 세력을 떠났다.', 'person');
  }

  // 재야 장수는 가끔 떠돈다
  Object.keys(S.off).forEach(function (oid) {
    var o = S.off[oid];
    if (o.s === 'free' && SG.chance(0.04)) { o.c = SG.pick(SG.ADJ[o.c]); o.found = false; }
  });

  for (var k in S.diplo) if (S.diplo[k].ally > 0) S.diplo[k].ally--;

  if (S.month === 1) await SG.newYear();
  if (SG.runEvents) await SG.runEvents();
  if (SG.runVisits) await SG.runVisits();
  SG.checkEnd();
  S.rng = SG.rng.s;
};

// 해가 바뀔 때: 수명, 새 인물 등장
SG.newYear = async function () {
  var S = SG.S;
  var lordsDead = [];
  Object.keys(S.off).forEach(function (oid) {
    var o = S.off[oid], m = SG.O(oid);
    if (o.s === 'dead' || o.s === 'unborn') return;
    var over = S.year - SG.dies(oid);
    if ((over >= 0 && SG.chance(0.5)) || over >= 2) {
      var f = o.s === 'force' ? o.f : null;
      if (SG.kill(oid, '병으로 세상을 떠났다 (' + SG.age(oid) + '세)')) lordsDead.push(f);
    }
  });
  for (var i = 0; i < lordsDead.length; i++) await SG.succession(lordsDead[i], null);
  // 성인이 된 인물
  var grown = [];
  Object.keys(S.off).forEach(function (oid) {
    var o = S.off[oid], m = SG.O(oid);
    if (o.s !== 'unborn' || S.year < SG.born(oid) + 16) return;
    var fa = m.fa && S.off[m.fa];
    if (fa && fa.s === 'force' && S.forces[fa.f] && S.forces[fa.f].alive) {
      SG.join(oid, fa.f, fa.c);
      o.acted = false;
      SG.log(fa.f, SG.name(oid) + '(' + SG.name(m.fa) + '의 아들)이(가) 장성하여 ' + SG.forceName(fa.f) + ' 세력에 들어왔다.', 'person');
      if (SG.isPlayer(fa.f)) grown.push(oid);
    } else {
      o.s = 'free'; o.c = m.home; o.found = false;
    }
  });
  for (var gi = 0; gi < grown.length; gi++) {
    var gid = grown[gi], gf = SG.O(gid).fa;
    if (SG.visit) await SG.visit({ visitor: gid, kind: 'grown', title: '장성한 아들',
      text: SG.name(gf) + '의 아들 ' + SG.name(gid) + ', 이제 어른이 되어 인사드립니다.\n아버지와 함께 ' + SG.forceName(S.player) + ' 님을 섬기겠습니다.',
      note: SG.statLine(gid) + ' · ' + SG.cityName(S.off[gid].c), choices: [{ label: '맞이한다', value: true, cls: 'primary' }], auto: true });
  }
  var fids = Object.keys(S.forces);
  for (var j = 0; j < fids.length; j++) if (S.forces[fids[j]].alive) await SG.checkForceDead(fids[j], null);
};

SG.checkEnd = function () {
  var S = SG.S;
  if (S.over) return S.over;
  var alive = SG.aliveForces();
  if (S.player) {
    if (!S.forces[S.player].alive) S.over = 'lose';
    else if (Object.keys(S.cities).every(function (c) { return S.cities[c].owner === S.player; })) S.over = 'win';
  } else if (alive.length <= 1) S.over = 'end';
  return S.over;
};
