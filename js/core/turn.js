// 한 달 진행: 컴퓨터 세력 행동 → 다음 달 (수입·수확·식량·충성·나이·사건)
var SG = SG || {};

SG.income = function (cid) {
  var c = SG.S.cities[cid];
  return Math.round((c.comm * 0.12 + c.pop / 12000) * (0.5 + c.loyal / 200));
};
SG.harvest = function (cid) {
  var c = SG.S.cities[cid];
  return Math.round((c.agri * 5 + c.pop / 400) * (0.5 + c.loyal / 200));
};
SG.HARVEST_MONTH = 7;

// 플레이어가 '턴 종료'를 눌렀을 때
SG.endTurn = async function () {
  var S = SG.S;
  if (S.over) return;
  if (S.player && SG.S.forces[S.player].alive) {
    var mine = SG.citiesOf(S.player);
    var reps = mine.filter(function (cid) { return S.cities[cid].deleg; }).map(SG.runDelegated);
    if (reps.length && SG.ui && SG.ui.delegReport) await SG.ui.delegReport(reps);
    if (reps.length) await SG.AI.military(S.player, true);
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
  try { SG.AI.city(cid); } finally { acts = SG.cmdLog; SG.cmdLog = null; }
  SG.DELEG_FIELDS.forEach(function (f) { after[f] = c[f]; });
  acts.forEach(function (a) { SG.log(null, SG.cityName(cid) + '(위임) — ' + a.msg, 'deleg'); });
  var why = acts.length ? '' : !idle ? '이번 달은 직접 명령을 내려서 남은 장수가 없었습니다' :
    c.gold < 150 ? '금이 모자라 할 수 있는 일이 없었습니다 (금 ' + c.gold + ')' : '지금은 더 할 일이 없다고 보았습니다';
  return { cid: cid, before: before, after: after, acts: acts, idle: idle, why: why };
};

SG.nextMonth = async function () {
  var S = SG.S;
  S.month++;
  S.turnCount++;
  if (S.month > 12) { S.month = 1; S.year++; }
  Object.keys(S.off).forEach(function (o) { S.off[o].acted = false; });

  // 수입·수확·식량
  Object.keys(S.cities).forEach(function (cid) {
    var c = S.cities[cid];
    if (!c.owner) {
      c.loyal = Math.min(70, c.loyal + 1);
      return;
    }
    c.gold += SG.income(cid);
    if (S.month === SG.HARVEST_MONTH) c.food += SG.harvest(cid);
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
