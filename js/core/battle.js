// 전쟁: 출진 → 전투(자동 계산 또는 직접 지휘) → 포로·도주·도시 점령·세력 멸망
var SG = SG || {};

SG.MAX_UNITS = 5;

// 장수 한 명이 거느릴 수 있는 병사: 통솔 × 300 (출진·방어 모두)
SG.UNIT_PER_LEAD = 300;
// 장수 없는 「수비병」의 통솔·무력 (성을 지키는 상비군)
SG.GUARD_STAT = 50;
SG.unitCap = function (oid) { return oid ? Math.max(100, Math.round(SG.O(oid).lead * SG.UNIT_PER_LEAD / 100) * 100) : Infinity; };
// 병사 total 을 장수들에게 통솔 비율로 나눈다 (각자 한도까지, 넘친 몫은 여유 있는 장수에게)
SG.splitByLead = function (total, oids) {
  var out = {}, left = total, open = oids.slice();
  oids.forEach(function (o) { out[o] = 0; });
  for (var k = 0; k < 6 && left >= 100 && open.length; k++) {
    var w = open.reduce(function (s, o) { return s + SG.O(o).lead; }, 0) || 1, give = left;
    open.forEach(function (o) { var add = Math.min(SG.unitCap(o) - out[o], Math.floor(give * SG.O(o).lead / w / 100) * 100); out[o] += add; left -= add; });
    open = open.filter(function (o) { return out[o] < SG.unitCap(o); });
  }
  return out;
};
// 수비 부대를 한도에 맞춘다: 넘친 병사는 같은 병종의 여유 있는 장수에게, 그래도 남으면 장수 없는 「수비병」 (약하다)
SG.capDefense = function (units) {
  var over = {};
  units.forEach(function (u) {
    if (!u.oid) return;
    var cap = SG.unitCap(u.oid);
    if (u.n > cap) { over[u.t] = (over[u.t] || 0) + u.n - cap; u.n = u.max = cap; }
  });
  SG.TROOP_KEYS.forEach(function (t) {
    if (!over[t]) return;
    units.forEach(function (u) {
      if (!over[t] || !u.oid || u.t !== t) return;
      var add = Math.min(over[t], SG.unitCap(u.oid) - u.n);
      if (add > 0) { u.n += add; u.max = u.n; over[t] -= add; }
    });
    if (over[t] > 0) {
      var g = units.filter(function (u) { return !u.oid && u.t === t; })[0];
      if (g) { g.n += over[t]; g.max = g.n; } else units.push({ oid: null, n: over[t], max: over[t], t: t });
    }
  });
  return units;
};

// 부대 하나의 전투력
SG.unitPower = function (oid, n, train, morale, t) {
  var o = oid ? SG.O(oid) : { lead: SG.GUARD_STAT, war: SG.GUARD_STAT, sk: null };
  var p = n * (0.5 + (o.lead * 0.6 + o.war * 0.4) / 120) * (0.6 + train / 250) * (0.6 + morale / 250);
  if (oid && t && SG.apt(oid) === t) p *= SG.APT_BONUS;
  if (o.sk === '돌격') p *= 1.12;
  if (o.sk === '무쌍') p *= 1.08;
  return p;
};
SG.armyTotal = function (side) { return side.units.reduce(function (s, u) { return s + u.n; }, 0); };

// 수비군 만들기: 도시 병사를 장수들에게 통솔 비율로 나눈다
SG.makeDefense = function (cid) {
  var c = SG.S.cities[cid];
  var offs = SG.officersIn(cid, c.owner).sort(function (a, b) { return SG.O(b).lead - SG.O(a).lead; });
  var units = [], pool = SG.troops(c, cid);
  var types = SG.TROOP_KEYS.filter(function (t) { return pool[t] > 0; }).sort(function (a, b) { return pool[b] - pool[a]; });
  if (!offs.length) {
    types.forEach(function (t) { units.push({ oid: null, n: pool[t], max: pool[t], t: t }); });
  } else {
    // 병종마다 맡을 장수 수를 병력 비율로 정하고(적어도 한 명), 장수는 잘 다루는 병종에 먼저 앉힌다
    var k = offs.length, slots = {}, used = 0;
    types = types.slice(0, k);
    var tot = types.reduce(function (s, t) { return s + pool[t]; }, 0) || 1;
    types.forEach(function (t) { slots[t] = 1; used++; });
    while (used < k && types.length) {
      var t2 = types.slice().sort(function (a, b) { return pool[b] / (slots[b] + 1) - pool[a] / (slots[a] + 1); })[0];
      slots[t2]++; used++;
    }
    // 병종이 장수보다 많으면 남은 병종 병력은 보병(없으면 가장 큰 병종)에 합친다
    SG.TROOP_KEYS.forEach(function (t) {
      if (pool[t] > 0 && types.indexOf(t) < 0) { var into = types.indexOf('inf') >= 0 ? 'inf' : types[0]; pool[into] += pool[t]; }
    });
    var left = {}; types.forEach(function (t) { left[t] = slots[t]; });
    var asg = {};
    offs.forEach(function (o) {
      var a = SG.apt(o), t = left[a] > 0 ? a : types.filter(function (x) { return left[x] > 0; })[0];
      if (!t) return;
      left[t]--; (asg[t] = asg[t] || []).push(o);
    });
    types.forEach(function (t) {
      var list = asg[t] || [], w = list.reduce(function (s, o) { return s + SG.O(o).lead; }, 0), rest = pool[t];
      list.forEach(function (o, i) {
        var n = i === list.length - 1 ? rest : Math.floor(pool[t] * SG.O(o).lead / w);
        rest -= n;
        units.push({ oid: o, n: n, max: n, t: t });
      });
    });
    // 병종을 받지 못한 장수(장수가 병종보다 많을 때는 생기지 않음)도 부대 목록엔 넣는다
    offs.forEach(function (o) { if (!units.some(function (u) { return u.oid === o; })) units.push({ oid: o, n: 0, max: 0, t: SG.apt(o) }); });
    units.sort(function (a, b) { return SG.O(b.oid).lead - SG.O(a.oid).lead; });
    SG.capDefense(units);
  }
  return { fid: c.owner, city: cid, units: units, train: c.train, morale: c.morale };
};

// 군량: 병사 1,000명이 하루에 식량 1을 먹는다 (출진할 때 10일치 이상 챙겨야 함)
SG.supplyNeed = function (total, days) { return days * Math.max(1, Math.ceil(total / 1000)); };
SG.MIN_SUPPLY_DAYS = 10;
// 매수 값: 거느린 병사가 많고 능력이 높을수록 비싸다
SG.bribePrice = function (oid, n) { var o = SG.O(oid); return Math.round((100 + n / 20 + (o.lead + o.war + o.int) * 1.5) / 10) * 10; };
// 컴퓨터가 챙기는 보급: 30일치(없으면 있는 만큼), 매수용 금은 도시 금의 30% (최대 1,500)
SG.defaultSupply = function (from, total) {
  var c = SG.S.cities[from];
  return { food: Math.min(c.food, SG.supplyNeed(total, 30)), gold: Math.min(Math.floor(c.gold * 0.3), 1500) };
};
// 출진 검사 + 부대 편성. units: [{oid, n}], supply: {food, gold} (없으면 컴퓨터 기본값)
SG.prepareAttack = function (from, to, units, supply) {
  var c = SG.S.cities[from], t = SG.S.cities[to], fid = c.owner;
  if (SG.ADJ[from].indexOf(to) < 0) return { ok: false, msg: '붙어 있는 도시만 공격할 수 있습니다' };
  if (t.owner === fid) return { ok: false, msg: '우리 도시입니다' };
  if (t.owner && SG.isAlly(fid, t.owner)) return { ok: false, msg: '동맹 세력의 도시는 공격할 수 없습니다' };
  if (c.used && c.used.attack) return { ok: false, msg: '이번 달 이 도시에서는 이미 출진했습니다 (명령마다 한 달에 한 번)' };
  if (!units.length) return { ok: false, msg: '출진할 장수를 고르세요' };
  if (units.length > SG.MAX_UNITS) return { ok: false, msg: '한 번에 ' + SG.MAX_UNITS + '명까지 출진할 수 있습니다' };
  var total = 0;
  for (var i = 0; i < units.length; i++) {
    if (!SG.ready(from, units[i].oid)) return { ok: false, msg: SG.name(units[i].oid) + '은(는) 출진할 수 없습니다' };
    if (units[i].n < 100) return { ok: false, msg: '부대마다 병사가 100명 이상 있어야 합니다' };
    if (units[i].n > SG.unitCap(units[i].oid)) return { ok: false, msg: SG.name(units[i].oid) + '은(는) 병사를 ' + SG.fmt(SG.unitCap(units[i].oid)) + '명까지 거느릴 수 있습니다 (통솔 × ' + SG.UNIT_PER_LEAD + ')' };
    total += units[i].n;
  }
  if (total > c.soldiers) return { ok: false, msg: '병사가 부족합니다' };
  var pool = SG.cityTroops(from), need = SG.unitsMix(units);
  for (var k = 0; k < SG.TROOP_KEYS.length; k++) {
    var tk = SG.TROOP_KEYS[k];
    if (need[tk] > pool[tk]) return { ok: false, msg: SG.TROOPS[tk].n + '이(가) 부족합니다 (필요 ' + SG.fmt(need[tk]) + ', 있음 ' + SG.fmt(pool[tk]) + ')' };
  }
  supply = supply || SG.defaultSupply(from, total);
  var food = Math.floor(supply.food || 0), gold = Math.floor(supply.gold || 0), need = SG.supplyNeed(total, SG.MIN_SUPPLY_DAYS);
  if (food > c.food) return { ok: false, msg: '도시에 식량이 부족합니다 (있음 ' + SG.fmt(c.food) + ')' };
  if (food < need) return { ok: false, msg: '군량을 적어도 ' + SG.MIN_SUPPLY_DAYS + '일치(식량 ' + SG.fmt(need) + ') 챙겨야 합니다' };
  if (gold > c.gold) return { ok: false, msg: '도시에 금이 부족합니다 (있음 ' + SG.fmt(c.gold) + ')' };
  return { ok: true, food: food, gold: gold, total: total };
};

// 공격 실행 (비동기: 플레이어가 끼면 화면에서 결정)
SG.launchAttack = async function (from, to, units, supply) {
  var chk = SG.prepareAttack(from, to, units, supply);
  if (!chk.ok) return chk;
  var c = SG.S.cities[from], t = SG.S.cities[to], fid = c.owner, dfid = t.owner;
  units.forEach(function (u) { u.t = u.t || 'inf'; });
  SG.takeTroops(c, SG.unitsMix(units), from);
  c.food -= chk.food; c.gold -= chk.gold;
  units.forEach(function (u) { SG.S.off[u.oid].acted = true; u.max = u.n; });
  (c.used = c.used || {}).attack = 1;
  var atk = { fid: fid, from: from, units: units, train: c.train, morale: c.morale, food: chk.food, gold: chk.gold };

  // 빈 도시: 바로 점령
  if (!dfid || (t.soldiers <= 0 && !SG.officersIn(to, dfid).length)) {
    var prev = dfid;
    SG.takeCity(atk, to);
    t.food += atk.food; t.gold += atk.gold;
    SG.log(fid, SG.forceName(fid) + ' 세력이 ' + SG.cityName(to) + '을(를) 차지했다.', 'war');
    if (prev) await SG.checkForceDead(prev, fid);
    return { ok: true, winner: 'atk', msg: SG.cityName(to) + '을(를) 차지했다.' };
  }

  if (dfid) { var r = SG.rel(fid, dfid); r.fr = Math.max(0, r.fr - 25); }
  var def = SG.makeDefense(to);
  SG.log(fid, SG.forceName(fid) + ' 세력이 ' + SG.cityName(from) + '에서 ' + SG.forceName(dfid) + ' 세력의 ' +
    SG.cityName(to) + '을(를) 공격했다! (병사 ' + SG.fmt(chk.total) + ' 대 ' + SG.fmt(t.soldiers) + ')', 'war');

  if (SG.ui && SG.ui.attackAnim) await SG.ui.attackAnim(from, to, fid);
  // 우리 도시가 공격받으면 수비 배치를 직접 정한다 (장수마다 병종·병사 수)
  if (SG.isPlayer(dfid) && SG.ui && SG.ui.defenseSetup) {
    var dset = await SG.ui.defenseSetup(atk, def);
    if (dset && dset.units) def.units = dset.units;
  }
  // 내응·매복 (계략으로 미리 꾸며 둔 일)
  var pre = SG.preBattle ? SG.preBattle(atk, def) : { log: [], turned: [] };
  atk.pre = pre;
  var involved = SG.isPlayer(fid) || SG.isPlayer(dfid);
  var mode = 'auto';
  if (involved && SG.ui && SG.ui.battleMode) mode = await SG.ui.battleMode(atk, def);
  var res;
  if (pre.log.length && involved && SG.ui && SG.ui.preBattle) await SG.ui.preBattle(atk, def, pre);
  if (mode === 'tactical' && SG.ui && SG.ui.tactical) res = await SG.ui.tactical(atk, def);
  else { res = SG.autoBattle(atk, def); res.log = pre.log.concat(res.log); }
  res.turned = pre.turned.concat(res.turned || []);
  if (involved && SG.ui && SG.ui.battleReport && mode !== 'tactical') await SG.ui.battleReport(atk, def, res);
  await SG.finishBattle(atk, def, res);
  return { ok: true, winner: res.winner, msg: res.winner === 'atk' ? SG.cityName(to) + ' 점령 성공!' : SG.cityName(to) + ' 공략 실패.' };
};
// 싸우는 동안(병사가 도시를 떠나 있는 동안)은 자동 저장을 하지 않도록 표시해 둔다
SG._launchAttackRaw = SG.launchAttack;
SG.launchAttack = async function () {
  SG.battling = (SG.battling || 0) + 1;
  try { return await SG._launchAttackRaw.apply(this, arguments); } finally { SG.battling--; }
};

// ---- 일기토 (장수 1:1 대결)
SG.duelWinChance = function (a, b) {
  var wa = SG.O(a).war + (SG.hasSkill(a, '무쌍') ? 8 : 0), wb = SG.O(b).war + (SG.hasSkill(b, '무쌍') ? 8 : 0);
  return 1 / (1 + Math.exp(-(wa - wb) / 7));
};
// 결과: {winner, loser, fate: 'killed'|'captured'|'fled'}
SG.duel = function (a, b) {
  var win = SG.chance(SG.duelWinChance(a, b));
  var w = win ? a : b, l = win ? b : a, r = SG.rand();
  var fate = r < 0.08 ? 'killed' : (r < 0.35 ? 'captured' : 'fled');
  return { winner: w, loser: l, fate: fate };
};
SG.DUEL_FATE = { killed: '목숨을 잃었다', captured: '사로잡혔다', fled: '도망쳤다' };

// ---- 직접 겨루는 일기토: 합마다 두 장수가 수를 고른다 (가위바위보처럼 서로 이기고 진다)
// 攻 공격: 기합을 끊는다 · 猛 강공: 공격을 누른다 · 守 방어: 강공을 막고 되친다 · 氣 기합: 기세를 모은다 · 必 필살(기세 60 이상): 무엇이든 뚫는다
SG.DUEL_ACTS = {
  atk: { n: '공격', h: '攻', desc: '빠른 일격. 기합을 끊고 들어간다. 방어에는 막힌다' },
  power: { n: '강공', h: '猛', desc: '온 힘을 실은 일격. 공격을 누르지만 방어에 막히면 되치기를 당한다' },
  guard: { n: '방어', h: '守', desc: '막아 낸다. 강공을 막으면 되친다. 기합에는 아무 일도 없다' },
  focus: { n: '기합', h: '氣', desc: '숨을 고르고 기세를 크게 모은다. 공격에 끊기면 더 아프다' },
  special: { n: '필살', h: '必', desc: '기세 60 이상. 모은 기세를 모두 써서 큰 일격. 방어도 뚫는다' },
  retreat: { n: '물러나기', h: '退', desc: '말머리를 돌려 달아난다. 진 것이 되지만 잡히지는 않는다' }
};
// ---- 일기토 무기와 묘사 (연의에 나오는 이름난 무기는 그대로, 나머지는 잘 다루는 병종으로)
SG.WEAPONS = {
  guanyu: ['청룡언월도', 'blade'], zhangfei: ['장팔사모', 'spear'], lvbu: ['방천화극', 'spear'], zhaoyun: ['애각창', 'spear'],
  machao: ['호두점강창', 'spear'], huangzhong: ['봉취도', 'blade'], dianwei: ['쌍철극', 'spear'], xuchu: ['대감도', 'blade'],
  liubei: ['쌍고검', 'sword'], taishici: ['단극', 'spear'], ganning: ['철쇄 대도', 'blade'], sunce: ['패왕창', 'spear'],
  xiahoudun: ['대도', 'blade'], huaxiong: ['대도', 'blade'], weiyan: ['대도', 'blade'], pangde: ['대도', 'blade'],
  zhangliao: ['월아극', 'spear'], wenchou: ['장창', 'spear'], yanliang: ['대도', 'blade'], jiangwei: ['창', 'spear']
};
SG.weaponOf = function (oid) {
  if (SG.WEAPONS[oid]) return { n: SG.WEAPONS[oid][0], k: SG.WEAPONS[oid][1] };
  var blade = SG.itemsOf ? SG.itemsOf(oid).filter(function (id) { return SG.ITEMS[id].k === 'blade'; })[0] : null;
  if (blade) return { n: SG.ITEMS[blade].n, k: 'sword' };
  var t = SG.apt ? SG.apt(oid) : 'inf';
  return t === 'cav' ? { n: '장창', k: 'spear' } : t === 'arc' ? { n: '장검', k: 'sword' } : { n: '대도', k: 'blade' };
};
// 한 합을 두 줄로: [i=0 이 한 것, i=1 이 한 것]
SG.duelMoveText = function (oid, act, hitTaken, opAct) {
  var w = SG.weaponOf(oid), n = SG.name(oid), wn = w.n, P = SG.rand();
  var verbs = {
    atk: w.k === 'spear' ? ['이(가) ' + wn + '(으)로 번개같이 찔러 들어갔다', '이(가) ' + wn + '을(를) 연달아 내질렀다']
      : w.k === 'blade' ? ['이(가) ' + wn + '을(를) 비스듬히 베어 들어갔다', '이(가) ' + wn + '(으)로 말 위에서 쳐 들어갔다']
      : ['이(가) ' + wn + '을(를) 뽑아 빠르게 베었다', '이(가) ' + wn + '(으)로 틈을 노려 찔렀다'],
    power: w.k === 'blade' ? ['이(가) ' + wn + '을(를) 머리 위로 높이 들어 온 힘으로 내리쳤다', '이(가) 말을 박차며 ' + wn + '을(를) 크게 휘둘렀다']
      : ['이(가) 말을 몰아 달려들며 ' + wn + '에 온 힘을 실었다', '이(가) 고함과 함께 ' + wn + '을(를) 깊숙이 내질렀다'],
    guard: ['이(가) ' + wn + '을(를) 비껴 들고 막아 섰다', '이(가) 말머리를 틀며 ' + wn + '(으)로 받아 냈다'],
    focus: ['이(가) 말을 물려 숨을 고르며 기세를 모았다', '이(가) 눈을 부릅뜨고 기합을 내질렀다'],
    special: ['의 필살 일격! ' + wn + '이(가) 번개처럼 떨어졌다', '이(가) 모은 기세를 터뜨려 ' + wn + '을(를) 내리꽂았다'],
    retreat: ['이(가) 말머리를 돌려 달아났다']
  }[act] || ['이(가) 맞섰다'];
  var line = n + verbs[Math.floor(P * verbs.length)];
  if (hitTaken > 0) line += hitTaken >= 25 ? ' — 그러나 크게 베였다! (−' + hitTaken + ')' : ' — 그러나 한 대 맞았다 (−' + hitTaken + ')';
  else if (act === 'guard' && (opAct === 'atk' || opAct === 'power')) line += ' — 막아 냈다!';
  return SG.josa(line);
};
SG.duelNew = function (a, b) {
  return { f: [{ oid: a, hp: 100, sp: 10 }, { oid: b, hp: 100, sp: 10 }], round: 0, over: null };
};
SG.duelHit = function (D, i, mult) {
  var me = SG.O(D.f[i].oid), op = SG.O(D.f[1 - i].oid);
  var wa = me.war + (SG.hasSkill(D.f[i].oid, '무쌍') ? 8 : 0), wb = op.war + (SG.hasSkill(D.f[1 - i].oid, '무쌍') ? 8 : 0);
  return Math.max(1, Math.round((10 + wa * 0.12) * (1 + (wa - wb) / 110) * mult * SG.randf(0.85, 1.15)));
};
// 한 합. acts = [i=0 의 수, i=1 의 수]. 돌려주는 것: {acts, dmg:[0이 받은 피해, 1이 받은 피해], text}
SG.duelRound = function (D, acts) {
  var F = D.f, dmg = [0, 0], gain = [8, 8], note = '';
  D.round++;
  acts = acts.map(function (x, i) { return x === 'special' && F[i].sp < 60 ? 'atk' : x; });
  if (acts[0] === 'retreat' || acts[1] === 'retreat') {
    var q = acts[0] === 'retreat' ? 0 : 1;
    D.over = { winner: F[1 - q].oid, loser: F[q].oid, fate: 'fled' };
    return { acts: acts, dmg: dmg, text: SG.name(F[q].oid) + '이(가) 말머리를 돌려 달아났다!' };
  }
  // i 가 j 에게 주는 피해 배수
  function mult(i) {
    var me = acts[i], op = acts[1 - i];
    if (me === 'special') return op === 'guard' ? 1.4 : 2.2;
    if (me === 'atk') return op === 'guard' ? 0.35 : op === 'focus' ? 1.25 : op === 'power' ? 0.55 : 1;
    if (me === 'power') return op === 'guard' ? 0 : op === 'atk' ? 1.6 : op === 'focus' ? 1.6 : op === 'special' ? 0.6 : 1.4;
    if (me === 'guard') return op === 'power' ? 0.9 : 0; // 되치기
    return 0; // 기합
  }
  [0, 1].forEach(function (i) {
    var m = mult(i);
    if (m > 0) dmg[1 - i] = SG.duelHit(D, i, m);
    if (acts[i] === 'focus') gain[i] = acts[1 - i] === 'atk' || acts[1 - i] === 'special' ? 15 : 40;
    if (acts[i] === 'guard') gain[i] = 14;
    if (acts[i] === 'special') F[i].sp = 0;
  });
  [0, 1].forEach(function (i) {
    F[i].hp = Math.max(0, F[i].hp - dmg[i]);
    F[i].sp = Math.min(100, F[i].sp + gain[i] + (dmg[i] ? 10 : 0));
  });
  // 장면 설명
  var n0 = SG.name(F[0].oid), n1 = SG.name(F[1].oid), A0 = acts[0], A1 = acts[1];
  function pair(x, y) { return (A0 === x && A1 === y) ? 0 : (A0 === y && A1 === x) ? 1 : -1; }
  var w;
  if ((w = pair('guard', 'power')) >= 0) note = [n0, n1][w] + '이(가) 강공을 받아 넘기고 되쳤다!';
  else if ((w = pair('power', 'atk')) >= 0) note = [n0, n1][w] + '의 강공이 상대의 칼을 눌러 버렸다!';
  else if ((w = pair('atk', 'focus')) >= 0) note = [n0, n1][w] + '이(가) 숨 고르는 틈을 파고들었다!';
  else if (A0 === 'special' || A1 === 'special') note = (A0 === 'special' ? n0 : n1) + '의 필살 일격!';
  else if (A0 === 'guard' && A1 === 'guard') note = '둘 다 칼을 거두고 서로를 노려본다.';
  else if (A0 === 'focus' && A1 === 'focus') note = '두 장수가 기세를 끌어올린다…';
  else if ((w = pair('guard', 'atk')) >= 0) note = [n0, n1][w] + '이(가) 일격을 막아 냈다.';
  else if ((w = pair('focus', 'guard')) >= 0) note = [n0, n1][w] + '이(가) 틈을 타 기세를 모았다.';
  else note = '칼과 칼이 맞부딪친다!';
  // 끝
  if (F[0].hp <= 0 || F[1].hp <= 0) {
    var l = F[0].hp <= 0 && F[1].hp <= 0 ? (F[0].hp - dmg[0] < F[1].hp - dmg[1] ? 0 : 1) : (F[0].hp <= 0 ? 0 : 1);
    var r = SG.rand(), margin = dmg[l];
    var fate = r < (margin > 30 ? 0.12 : 0.05) ? 'killed' : (r < 0.4 ? 'captured' : 'fled');
    D.over = { winner: F[1 - l].oid, loser: F[l].oid, fate: fate };
  } else if (D.round >= 15) {
    D.over = { draw: true };
    note += ' 날이 저물어 두 장수가 물러났다.';
  }
  return { acts: acts, dmg: dmg, text: note, moves: [SG.duelMoveText(F[0].oid, acts[0], dmg[0], acts[1]), SG.duelMoveText(F[1].oid, acts[1], dmg[1], acts[0])] };
};
// 컴퓨터의 수: 무력이 높을수록 덤비고, 상대 기세가 차면 막고, 제 기세가 차면 필살
SG.duelAI = function (D, i) {
  var me = D.f[i], op = D.f[1 - i], r = SG.rand();
  if (me.sp >= 60 && r < 0.65) return 'special';
  if (op.sp >= 60 && r < 0.5) return 'guard';
  if (me.hp < 18 && op.hp > 50 && r < 0.25) return 'retreat';
  var w = [['atk', 34], ['power', 24], ['guard', 20], ['focus', 18 + (me.sp < 30 ? 8 : 0)]];
  var tot = w.reduce(function (s, x) { return s + x[1]; }, 0), p = SG.rand() * tot;
  for (var k = 0; k < w.length; k++) { p -= w[k][1]; if (p <= 0) return w[k][0]; }
  return 'atk';
};
// 둘 다 컴퓨터일 때 끝까지
SG.duelAuto = function (a, b) {
  var D = SG.duelNew(a, b);
  while (!D.over) SG.duelRound(D, [SG.duelAI(D, 0), SG.duelAI(D, 1)]);
  return D.over.draw ? SG.duel(a, b) : D.over;
};

// ---- 자동 전투 계산
SG.autoBattle = function (atk, def) {
  var log = [], t = SG.S.cities[def.city], wallMax = SG.CITY_SIZE[SG.CITIES[def.city].size].wallMax;
  var wallBonus = 1 + 0.4 * t.wall / wallMax;
  var am = atk.morale, dm = def.morale;
  var res = { winner: 'def', log: log, captured: [], killed: [], days: 0, turned: [] };
  if (atk.food == null) atk.food = SG.supplyNeed(SG.armyTotal(atk), 30);
  // 매수: 싸우기 전에 한 번, 넘어올 만한 수비 장수를 금으로 꾄다
  if (atk.gold > 0) SG.autoBribe(atk, def, res);

  // 일기토
  var ta = atk.units.filter(function (u) { return u.oid; }).sort(function (x, y) { return SG.O(y.oid).war - SG.O(x.oid).war; })[0];
  var td = def.units.filter(function (u) { return u.oid; }).sort(function (x, y) { return SG.O(y.oid).war - SG.O(x.oid).war; })[0];
  if (ta && td && SG.O(ta.oid).war >= 70 && SG.O(td.oid).war >= 60 && SG.chance(0.3)) {
    var d = SG.duel(ta.oid, td.oid);
    var lu = d.loser === ta.oid ? ta : td, wonAtk = d.winner === ta.oid;
    log.push('일기토! ' + SG.name(ta.oid) + ' 대 ' + SG.name(td.oid) + ' → ' + SG.name(d.winner) + ' 승리. ' +
      SG.name(d.loser) + '은(는) ' + SG.DUEL_FATE[d.fate] + '.');
    SG.applyDuelFate(res, lu, d.fate, wonAtk ? 'atk' : 'def');
    if (wonAtk) { am += 12; dm -= 15; } else { dm += 12; am -= 15; }
  }

  for (var day = 1; day <= 10; day++) {
    res.days = day * 3;
    var aT = SG.armyTotal(atk), dT = SG.armyTotal(def);
    if (aT <= 0 || dT <= 0) break;
    // 사흘치 군량
    atk.food -= SG.supplyNeed(aT, 3);
    if (atk.food < 0) { atk.food = 0; res.supplyOut = true; log.push((day * 3) + '일째: 군량이 떨어졌다! 굶주린 공격군이 물러난다.'); break; }
    // 수비군도 성안 식량을 먹는다. 떨어지면 병사가 달아나고 사기가 꺾이며, 엿새를 굶으면 항복한다
    var dNeed = SG.supplyNeed(dT, 3);
    if (t.food >= dNeed) t.food -= dNeed;
    else {
      t.food = 0; res.hungry = (res.hungry || 0) + 1;
      def.units.forEach(function (u) { u.n = Math.floor(u.n * 0.85); });
      dm -= 15;
      if (res.hungry >= 2) { res.starved = true; log.push((day * 3) + '일째: 굶주린 수비군이 성문을 열고 항복했다!'); break; }
      log.push((day * 3) + '일째: 성안에 식량이 떨어졌다! 굶주린 수비군이 달아나기 시작한다.');
    }
    // 수비 기병이 보급대를 노린다 (공격군이 많을수록 잘 지킨다)
    var dCav = SG.mixShare(def.units).cav || 0;
    if (SG.chance((0.012 + dCav * 0.05) * SG.clamp(dT / Math.max(1, aT), 0.3, 1))) {
      res.depotLost = true; log.push((day * 3) + '일째: 수비군이 보급대를 습격해 빼앗았다! 보급이 끊긴 공격군이 무너졌다.');
      atk.units.forEach(function (u) { u.n = Math.floor(u.n * 0.75); });
      break;
    }
    // 병종 상성: 상대 병종 구성에 따라 힘이 오르내린다. 성벽이 있으면 공격 기병은 약하고 수비 궁병은 강하다
    var aS = SG.mixShare(atk.units), dS = SG.mixShare(def.units), walled = t.wall > wallMax * 0.15;
    var aP = atk.units.reduce(function (s, u) { return s + (u.n > 0 ? SG.unitPower(u.oid, u.n, atk.train, am, u.t) * SG.matchVs(u.t, dS) * (walled && u.t === 'cav' ? 0.85 : 1) : 0); }, 0) * (SG.aiMul ? SG.aiMul(atk.fid, 'power') : 1);
    var dP = def.units.reduce(function (s, u) { return s + (u.n > 0 ? SG.unitPower(u.oid, u.n, def.train, dm, u.t) * SG.matchVs(u.t, aS) * (walled && u.t === 'arc' ? 1.15 : 1) : 0); }, 0) * wallBonus * (SG.aiMul ? SG.aiMul(def.fid, 'power') : 1);
    var toDef = aP * 0.09 * SG.randf(0.8, 1.2), toAtk = dP * 0.09 * SG.randf(0.8, 1.2);
    var lostD = SG.spreadDamage(def.units, toDef, dT), lostA = SG.spreadDamage(atk.units, toAtk, aT);
    var rA = lostA / Math.max(1, aT), rD = lostD / Math.max(1, dT);
    if (rA > rD) { am -= SG.randInt(3, 7); dm += 1; } else { dm -= SG.randInt(3, 7); am += 1; }
    am = SG.clamp(am, 0, 100); dm = SG.clamp(dm, 0, 100);
    if (day === 1 || day % 3 === 0) log.push((day * 3) + '일째: 공격군 ' + SG.fmt(SG.armyTotal(atk)) + ' / 수비군 ' + SG.fmt(SG.armyTotal(def)));
    if (am < 15) { log.push('공격군의 사기가 무너져 물러났다.'); break; }
    if (dm < 10 && SG.armyTotal(def) < SG.armyTotal(atk)) { def.units.forEach(function (u) { u.n = Math.floor(u.n * 0.5); }); log.push('수비군이 겁을 먹고 흩어졌다.'); dm = 0; }
  }
  // 전멸 부대 장수 처리 (처음부터 병사 없이 성 안에 머문 장수는 빼고)
  atk.units.concat(def.units).forEach(function (u) { if (u.oid && u.n <= 0 && !u.out && u.max > 0) SG.unitBroken(res, u); });
  var aT2 = SG.armyTotal(atk), dT2 = SG.armyTotal(def);
  res.winner = !res.supplyOut && !res.depotLost && (dT2 <= 0 || res.starved || (dm <= 0 && aT2 > 0)) && aT2 > 0 ? 'atk' : 'def';
  if (res.winner === 'def' && aT2 > 0 && dT2 > 0) log.push('공격군이 성을 함락하지 못하고 물러났다.');
  atk.morale = am; def.morale = dm;
  return res;
};
// 자동 전투의 매수: 공격 장수 중 매력이 가장 높은 이가 넘어올 확률이 가장 높은 수비 장수를 꾄다
SG.autoBribe = function (atk, def, res) {
  var S = SG.S, bf = S.forces[atk.fid]; if (!bf) return;
  var who = atk.units.filter(function (u) { return u.oid; }).sort(function (a, b) { return SG.O(b.oid).cha - SG.O(a.oid).cha; })[0];
  if (!who) return;
  var cha = SG.O(who.oid).cha, lord = SG.O(bf.lord);
  var best = null;
  def.units.forEach(function (u) {
    if (!u.oid || u.n <= 0) return;
    var so = S.off[u.oid], tf = S.forces[so.f];
    if (!tf || tf.lord === u.oid || SG.isKin(u.oid, tf.lord)) return;
    var price = SG.bribePrice(u.oid, u.n);
    var p = SG.clamp(0.05 + (80 - so.loy) / 90 + (cha - 60) / 250 + (lord.cha - 60) / 300, 0, 0.85);
    if (price <= atk.gold && p >= 0.3 && (!best || p * u.n > best.p * best.u.n)) best = { u: u, p: p, price: price };
  });
  if (!best) return;
  if (SG.chance(best.p)) {
    atk.gold -= best.price;
    def.units.splice(def.units.indexOf(best.u), 1); atk.units.push(best.u); best.u.max = best.u.n;
    res.turned.push({ oid: best.u.oid, to: 'atk' });
    res.log.push(SG.name(who.oid) + '이(가) 금 ' + SG.fmt(best.price) + '(으)로 ' + SG.name(best.u.oid) + '을(를) 매수했다! ' + SG.name(best.u.oid) + ' 부대가 편을 바꾸었다.');
  } else {
    var lost = Math.round(best.price / 2); atk.gold -= lost;
    res.log.push(SG.name(best.u.oid) + '이(가) ' + SG.name(who.oid) + '의 매수를 뿌리쳤다 (금 ' + SG.fmt(lost) + ' 잃음).');
  }
};
SG.spreadDamage = function (units, dmg, total) {
  var lost = 0;
  units.forEach(function (u) {
    if (u.n <= 0) return;
    var d = dmg * u.n / Math.max(1, total);
    if (u.oid && SG.hasSkill(u.oid, '철벽')) d *= 0.8;
    d = Math.min(u.n, Math.round(d));
    u.n -= d; lost += d;
  });
  return lost;
};
// 일기토 결과를 부대에 반영
SG.applyDuelFate = function (res, unit, fate, winnerSide) {
  if (fate === 'killed') { res.killed.push(unit.oid); unit.out = true; }
  else if (fate === 'captured') { res.captured.push({ oid: unit.oid, by: winnerSide }); unit.out = true; }
  else unit.n = Math.floor(unit.n * 0.7);
  if (unit.out) {
    // 장수를 잃은 부대는 절반이 흩어지고 나머지는 남는다 (장수 없는 부대)
    unit.n = Math.floor(unit.n * 0.5);
    unit.oidLost = unit.oid; unit.oid = null;
  }
};
// 부대가 전멸했을 때 장수: 포로 35%
SG.unitBroken = function (res, u) {
  u.out = true;
  if (SG.chance(0.35)) res.captured.push({ oid: u.oid, by: null });
};

// ---- 전투 뒤 처리
SG.finishBattle = async function (atk, def, res) {
  var to = def.city, from = atk.from, t = SG.S.cities[to], fid = atk.fid, dfid = def.fid;
  res.log.forEach(function (l) { SG.log(fid, l, 'battle'); });
  var captives = [];
  // 일기토·전멸로 잡힌 장수: 잡은 쪽 = 상대편
  res.captured.forEach(function (cp) {
    var isAtkUnit = atk.units.some(function (u) { return (u.oid || u.oidLost) === cp.oid; });
    captives.push({ oid: cp.oid, by: isAtkUnit ? dfid : fid });
  });
  var lordsLost = [];
  res.killed.forEach(function (oid) {
    var f = SG.S.off[oid].f;
    if (SG.kill(oid, '전투 중 목숨을 잃었다')) lordsLost.push(f);
  });

  // 매수되어 편을 바꾼 장수는 그 세력에 들어간다
  (res.turned || []).forEach(function (tv) {
    var so = SG.S.off[tv.oid], nf = tv.to === 'atk' ? fid : dfid;
    if (!so || so.s !== 'force' || !nf || so.f === nf) return;
    SG.join(tv.oid, nf, tv.to === 'atk' ? from : to);
    SG.log(nf, SG.name(tv.oid) + '이(가) 매수되어 ' + SG.forceName(nf) + ' 세력에 들어왔다.', 'person');
  });
  // 수비군이 매수에 쓴 금은 도시 금에서 빠진다
  if (dfid && res.defGold != null) t.gold = Math.max(0, Math.min(t.gold, Math.round(res.defGold)));
  // 남은 군량·금: 이기면 차지한 도시로, 지면 집으로, 보급대를 빼앗기면 수비 도시로
  var sF = Math.max(0, Math.round(atk.food || 0)), sG = Math.max(0, Math.round(atk.gold || 0));
  var defLeft = SG.armyTotal(def);
  if (res.depotLost) {
    if (dfid) { t.food += sF; t.gold += sG; }
    SG.log(fid, SG.forceName(fid) + ' 세력이 보급대를 빼앗겨 ' + [sF ? '식량 ' + SG.fmt(sF) : '', sG ? '금 ' + SG.fmt(sG) : ''].filter(Boolean).join('·') + '을(를) 잃었다.', 'warn');
    sF = 0; sG = 0;
  }
  if (res.winner === 'atk') {
    // 수비 장수: 도주 또는 포로
    var flee = SG.ADJ[to].filter(function (n) { return SG.S.cities[n].owner === dfid; });
    SG.officersIn(to, dfid).forEach(function (oid) {
      if (captives.some(function (c) { return c.oid === oid; }) || SG.S.off[oid].s !== 'force') return;
      var p = 0.55 + SG.O(oid).war / 300 + (SG.S.forces[dfid] && SG.S.forces[dfid].lord === oid ? 0.15 : 0);
      if (flee.length && SG.chance(p)) {
        var dest = SG.pick(flee);
        SG.S.off[oid].c = dest;
        SG.addTroops(SG.S.cities[dest], 'inf', Math.floor(defLeft / Math.max(1, SG.officersIn(to, dfid).length + 1) * 0.5), dest);
      } else captives.push({ oid: oid, by: fid });
    });
    SG.takeCity(atk, to);
    t.food += sF; t.gold += sG;
    t.loyal = Math.max(0, t.loyal - 10);
    SG.log(fid, SG.forceName(fid) + ' 세력이 ' + SG.cityName(to) + '을(를) 함락했다!', 'war');
  } else {
    SG.setTroopsFromUnits(t, def.units);
    t.morale = SG.clamp(def.morale, 20, 100);
    SG.returnArmy(atk);
    var home0 = SG.S.cities[atk.from].owner === fid ? atk.from : SG.nearestOwn(fid, atk.from);
    if (home0) { SG.S.cities[home0].food += sF; SG.S.cities[home0].gold += sG; }
    SG.log(fid, SG.forceName(dfid) + ' 세력이 ' + SG.cityName(to) + '을(를) 지켜냈다.', 'war');
  }
  // 포로 처리
  for (var i = 0; i < captives.length; i++) {
    var cp = captives[i];
    if (SG.S.off[cp.oid].s !== 'force') continue;
    await SG.handleCaptive(cp.oid, cp.by, to);
  }
  for (var j = 0; j < lordsLost.length; j++) await SG.succession(lordsLost[j], lordsLost[j] === fid ? dfid : fid);
  if (dfid) await SG.checkForceDead(dfid, fid);
  await SG.checkForceDead(fid, dfid);
};

// 공격군이 도시를 차지
SG.takeCity = function (atk, to) {
  var t = SG.S.cities[to], n = SG.armyTotal(atk);
  t.owner = atk.fid;
  SG.setTroopsFromUnits(t, atk.units);
  t.train = atk.train;
  t.morale = SG.clamp(atk.morale, 20, 100);
  t.deleg = false;
  atk.units.forEach(function (u) {
    var oid = u.oid || null;
    if (oid && SG.S.off[oid].s === 'force') SG.S.off[oid].c = to;
  });
};
// 패배한 공격군이 돌아감
SG.returnArmy = function (atk) {
  var home = SG.S.cities[atk.from].owner === atk.fid ? atk.from : SG.nearestOwn(atk.fid, atk.from);
  var n = SG.armyTotal(atk);
  atk.units.forEach(function (u) {
    if (u.oid && SG.S.off[u.oid].s === 'force') {
      if (home) SG.S.off[u.oid].c = home; else SG.makeFree(u.oid, atk.from);
    }
  });
  if (home) SG.putTroops(SG.S.cities[home], SG.unitsMix(atk.units), home);
};
SG.nearestOwn = function (fid, cid) {
  var seen = {}, q = [cid];
  seen[cid] = true;
  while (q.length) {
    var x = q.shift();
    if (SG.S.cities[x].owner === fid) return x;
    SG.ADJ[x].forEach(function (n) { if (!seen[n]) { seen[n] = true; q.push(n); } });
  }
  return null;
};

// ---- 포로
SG.handleCaptive = async function (oid, captor, cid) {
  var o = SG.S.off[oid], from = o.f;
  o.s = 'captive'; o.capt = captor; o.c = cid;
  if (SG.seizeItems) SG.seizeItems(oid, captor);
  var choice;
  // 잡은 쪽이 도시를 모두 잃었으면 포로를 붙잡아 둘 곳이 없다 → 풀려남
  if (!SG.S.forces[captor] || !SG.S.forces[captor].alive || !SG.citiesOf(captor).length) choice = 'release';
  else if (SG.isPlayer(captor) && SG.ui && SG.ui.captive) choice = await SG.ui.captive(oid, captor);
  else choice = SG.aiCaptiveChoice(oid, captor, from);
  var isLord = SG.S.forces[from] && SG.S.forces[from].lord === oid;
  if (choice === 'recruit') {
    var p = isLord ? 0 : SG.recruitChance(SG.S.forces[captor].lord, oid, captor);
    if (SG.chance(p)) {
      SG.join(oid, captor, SG.S.cities[cid].owner === captor ? cid : SG.S.forces[captor].capital);
      if (SG.S.cities[SG.S.off[oid].c].owner !== captor) SG.S.off[oid].c = SG.citiesOf(captor)[0];
      SG.log(captor, '포로가 된 ' + SG.name(oid) + '이(가) ' + SG.forceName(captor) + ' 세력에 들어왔다.', 'person');
      return 'joined';
    }
    SG.log(captor, SG.name(oid) + '은(는) 항복을 거부했다. 풀어 주었다.', 'person');
    choice = 'release';
  }
  if (choice === 'execute') {
    SG.kill(oid, SG.forceName(captor) + ' 세력에게 처형되었다');
    if (from) { var r = SG.rel(captor, from); r.fr = Math.max(0, r.fr - 30); }
    if (isLord) await SG.succession(from, captor);
    return 'executed';
  }
  // 해방: 원래 세력으로 돌아가거나 재야
  var back = from && SG.S.forces[from] && SG.S.forces[from].alive ? SG.citiesOf(from) : [];
  if (back.length) {
    o.s = 'force'; o.f = from; o.c = SG.nearestOwn(from, cid) || back[0]; delete o.capt;
    o.loy = Math.max(0, o.loy - 5);
    if (from) { var rr = SG.rel(captor, from); rr.fr = Math.min(100, rr.fr + 5); }
  } else {
    SG.makeFree(oid, cid);
    if (isLord) await SG.succession(from, captor);
  }
  return 'released';
};
SG.aiCaptiveChoice = function (oid, captor, from) {
  var lord = SG.O(SG.S.forces[captor].lord);
  var isLord = SG.S.forces[from] && SG.S.forces[from].lord === oid;
  if (isLord) return lord.cha < 50 || SG.chance(0.4) ? 'execute' : 'release';
  if (SG.chance(0.85)) return 'recruit';
  return lord.cha < 45 && SG.chance(0.5) ? 'execute' : 'release';
};

// ---- 장수 상태 변경
SG.makeFree = function (oid, cid) {
  var o = SG.S.off[oid];
  o.s = 'free'; o.f = null; o.c = cid; o.loy = 0; o.found = true; delete o.capt;
};
SG.kill = function (oid, why) {
  var o = SG.S.off[oid];
  var wasLord = o.s === 'force' && SG.S.forces[o.f] && SG.S.forces[o.f].lord === oid;
  o.s = 'dead'; o.diedAt = SG.S.year;
  SG.log(o.f, SG.name(oid) + '이(가) ' + why + '.', 'death');
  if (SG.dropItems) SG.dropItems(oid);
  return wasLord;
};

// 군주가 사라졌을 때 후계자
SG.succession = async function (fid, byFid) {
  var f = SG.S.forces[fid];
  if (!f || !f.alive) return;
  var old = f.lord;
  var cands = SG.officersOf(fid).filter(function (o) { return o !== old; });
  if (!cands.length || !SG.citiesOf(fid).length) { await SG.destroyForce(fid, byFid); return; }
  cands.sort(function (a, b) {
    var A = SG.O(a), B = SG.O(b);
    var sa = (A.fa === old ? 200 : 0) + (SG.isKin(a, old) ? 80 : 0) + A.cha + A.lead + A.int / 2 + SG.S.off[a].loy / 2;
    var sb = (B.fa === old ? 200 : 0) + (SG.isKin(b, old) ? 80 : 0) + B.cha + B.lead + B.int / 2 + SG.S.off[b].loy / 2;
    return sb - sa;
  });
  var nl = cands[0];
  f.lord = nl;
  SG.S.off[nl].loy = 100;
  SG.officersOf(fid).forEach(function (o) {
    if (o !== nl && !SG.isKin(o, nl)) SG.S.off[o].loy = Math.max(0, SG.S.off[o].loy - SG.randInt(5, 15));
  });
  if (SG.S.cities[f.capital].owner !== fid) f.capital = SG.citiesOf(fid)[0];
  SG.log(fid, SG.name(nl) + '이(가) ' + SG.name(old) + '의 뒤를 이어 군주가 되었다.', 'sys');
  if (SG.isPlayer(fid) && SG.ui && SG.ui.visit) await SG.visit({ visitor: nl, from: fid, kind: 'succession', title: '새 군주',
    text: SG.name(old) + ' 님께서 세상을 떠나셨습니다.\n이제 제가 그 뜻을 이어 ' + SG.forceName(fid) + ' 세력을 이끌겠습니다. 모두 힘을 모아 주시오.',
    note: SG.statLine(nl), choices: [{ label: '뒤를 잇는다', value: true, cls: 'primary' }], auto: true });
  else if (SG.isPlayer(fid) && SG.ui && SG.ui.notify) await SG.ui.notify(SG.name(old) + '이(가) 세상을 떠났습니다.\n' + SG.name(nl) + '이(가) 뒤를 이어 군주가 됩니다.');
};
SG.checkForceDead = async function (fid, byFid) {
  var f = SG.S.forces[fid];
  if (!f || !f.alive) return;
  if (SG.citiesOf(fid).length === 0) await SG.destroyForce(fid, byFid);
  else if (SG.S.cities[f.capital].owner !== fid) f.capital = SG.citiesOf(fid)[0];
};
SG.destroyForce = async function (fid, byFid) {
  var f = SG.S.forces[fid];
  if (!f || !f.alive) return;
  f.alive = false;
  Object.keys(SG.S.off).forEach(function (oid) {
    var o = SG.S.off[oid];
    if ((o.s === 'force' && o.f === fid)) SG.makeFree(oid, o.c);
  });
  SG.citiesOf(fid).forEach(function (cid) { var c = SG.S.cities[cid]; c.owner = null; c.soldiers = 0; });
  SG.log(fid, SG.name(f.lord) + ' 세력이 멸망했다.', 'sys');
  if (SG.isPlayer(fid)) SG.S.over = 'lose';
};
