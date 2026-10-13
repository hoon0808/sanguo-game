// 명령 규칙: 내정·군사·인사. 한 장수는 한 달에 명령 하나.
var SG = SG || {};

SG.COST = { develop: 50, relief: 300, reward: 100, rumor: 50, sow: 80, gift: 300 };

SG.cmd = {};

// 장수가 이 도시에서 명령을 받을 수 있는지
SG.ready = function (cid, oid) {
  var o = SG.S.off[oid], c = SG.S.cities[cid];
  return !!o && !!c && o.s === 'force' && o.c === cid && o.f === c.owner && !o.acted;
};
SG.readyOfficers = function (cid) {
  return SG.officersIn(cid, SG.S.cities[cid].owner).filter(function (o) { return !SG.S.off[o].acted; });
};
function fail(msg) { return { ok: false, msg: msg }; }
function done(oid, msg, extra) {
  SG.S.off[oid].acted = true;
  var r = { ok: true, msg: msg };
  if (extra) for (var k in extra) r[k] = extra[k];
  if (SG.cmdLog) SG.cmdLog.push({ oid: oid, msg: SG.josa(msg), ok: r.success !== false });
  return r;
}

// ---- 내정
SG.DEV_KIND = { agri: '농업', comm: '상업', wall: '성벽' };
SG.devGain = function (oid, kind) {
  var o = SG.O(oid);
  var base = kind === 'wall' ? (o.lead * 0.35 + o.pol * 0.3 + 10) : (o.pol * 0.6 + 10);
  if (o.sk === '치세') base *= 1.3;
  return base;
};
SG.cmd.develop = function (cid, oid, kind) {
  if (!SG.ready(cid, oid)) return fail('명령할 수 없는 장수입니다');
  var c = SG.S.cities[cid], z = SG.CITY_SIZE[SG.CITIES[cid].size];
  var max = z[kind + 'Max'];
  if (c[kind] >= max) return fail(SG.DEV_KIND[kind] + '이(가) 이미 최고치입니다');
  if (c.gold < SG.COST.develop) return fail('금이 부족합니다 (필요 ' + SG.COST.develop + ')');
  c.gold -= SG.COST.develop;
  var g = Math.max(1, Math.round(SG.devGain(oid, kind) * SG.randf(0.85, 1.15)));
  g = Math.min(g, max - c[kind]);
  c[kind] += g;
  return done(oid, SG.name(oid) + '이(가) ' + SG.DEV_KIND[kind] + '을(를) ' + g + ' 올렸다.', { gain: g });
};
SG.cmd.relief = function (cid, oid) {
  if (!SG.ready(cid, oid)) return fail('명령할 수 없는 장수입니다');
  var c = SG.S.cities[cid];
  if (c.loyal >= 100) return fail('민심이 이미 최고치입니다');
  if (c.food < SG.COST.relief) return fail('식량이 부족합니다 (필요 ' + SG.COST.relief + ')');
  c.food -= SG.COST.relief;
  var o = SG.O(oid);
  var g = Math.round((o.cha * 0.15 + 6) * (o.sk === '인덕' ? 1.3 : 1) * SG.randf(0.85, 1.15));
  g = Math.min(g, 100 - c.loyal);
  c.loyal += g;
  return done(oid, SG.name(oid) + '이(가) 백성에게 식량을 나눠 민심이 ' + g + ' 올랐다.', { gain: g });
};

// ---- 군사
SG.conscriptAmount = function (cid, oid) {
  var o = SG.O(oid), c = SG.S.cities[cid];
  var n = (o.cha * 25 + o.lead * 10 + 600) * (o.sk === '인덕' ? 1.2 : 1);
  n = Math.min(n, c.pop * 0.04);
  return Math.floor(n / 100) * 100;
};
SG.conscriptCost = function (n, type) { return Math.ceil(n / 20 * (SG.TROOPS[type || 'inf'] || SG.TROOPS.inf).cost); };
SG.cmd.conscript = function (cid, oid, want, type) {
  type = SG.TROOPS[type] ? type : 'inf';
  if (!SG.ready(cid, oid)) return fail('명령할 수 없는 장수입니다');
  var c = SG.S.cities[cid];
  if (c.loyal < 25) return fail('민심이 너무 낮아 병사가 모이지 않습니다 (25 이상 필요)');
  var n = SG.conscriptAmount(cid, oid);
  if (want) n = Math.min(n, want);
  var cost = SG.conscriptCost(n, type);
  if (c.gold < cost) { n = Math.floor(c.gold * 20 / SG.TROOPS[type].cost / 100) * 100; cost = SG.conscriptCost(n, type); }
  if (n < 100) return fail('금이 부족합니다');
  c.gold -= cost;
  c.train = Math.round((c.train * c.soldiers + 25 * n) / (c.soldiers + n));
  c.morale = Math.round((c.morale * c.soldiers + 50 * n) / (c.soldiers + n));
  SG.addTroops(c, type, n, cid);
  c.pop -= n;
  c.loyal = Math.max(0, c.loyal - Math.round(n / 500));
  return done(oid, SG.name(oid) + '이(가) ' + SG.TROOPS[type].n + ' ' + SG.fmt(n) + '명을 모았다 (금 ' + cost + ').', { gain: n, type: type });
};
SG.cmd.train = function (cid, oid) {
  if (!SG.ready(cid, oid)) return fail('명령할 수 없는 장수입니다');
  var c = SG.S.cities[cid];
  if (c.soldiers <= 0) return fail('훈련할 병사가 없습니다');
  if (c.train >= 100 && c.morale >= 100) return fail('훈련·사기가 이미 최고치입니다');
  var o = SG.O(oid);
  var g = Math.round((o.lead * 0.22 + 4) * SG.randf(0.85, 1.15) * Math.min(1.3, 30000 / (c.soldiers + 15000)));
  g = Math.max(1, g);
  c.train = Math.min(100, c.train + g);
  c.morale = Math.min(100, c.morale + Math.round(g / 2) + 2);
  return done(oid, SG.name(oid) + '이(가) 병사를 훈련시켰다 (훈련 +' + g + ').', { gain: g });
};

// ---- 인사
SG.cmd.search = function (cid, oid) {
  if (!SG.ready(cid, oid)) return fail('명령할 수 없는 장수입니다');
  var o = SG.O(oid), c = SG.S.cities[cid];
  var hidden = SG.freeIn(cid).filter(function (x) { return !SG.S.off[x].found; });
  var found = [];
  hidden.forEach(function (x) {
    if (SG.chance(0.25 + (o.int + o.cha) / 300)) { SG.S.off[x].found = true; found.push(x); }
  });
  if (found.length) {
    return done(oid, SG.name(oid) + '이(가) 인재 ' + found.map(SG.name).join(', ') + '을(를) 찾아냈다!', { found: found });
  }
  var r = SG.rand();
  if (r < 0.25) {
    var g = SG.randInt(50, 150); c.gold += g;
    return done(oid, SG.name(oid) + '이(가) 인재는 찾지 못했지만 금 ' + g + '을(를) 얻었다.', { found: [] });
  }
  if (r < 0.45) {
    var f = SG.randInt(200, 500); c.food += f;
    return done(oid, SG.name(oid) + '이(가) 인재는 찾지 못했지만 식량 ' + f + '을(를) 얻었다.', { found: [] });
  }
  return done(oid, SG.name(oid) + '이(가) 인재를 찾았지만 아무도 없었다.', { found: [] });
};

// 등용 성공 확률
SG.recruitChance = function (oid, target, fid) {
  var t = SG.S.off[target], o = SG.O(oid), lord = SG.O(SG.S.forces[fid].lord);
  if (!t) return 0;
  if (t.s === 'free') {
    // 제갈량은 210년 전까지 유비가 아니면 나서지 않는다 (삼고초려)
    if (target === 'zhugeliang' && SG.S.year < 210 && lord.id !== 'liubei') return 0;
    var p = 0.3 + o.cha / 250 + (lord.cha - 50) / 250;
    if (o.sk === '인덕' || lord.sk === '인덕') p += 0.1;
    if (SG.isKin(target, lord.id)) p = 1;
    return SG.clamp(p, 0.05, 0.95);
  }
  if (t.s === 'force' || t.s === 'captive') {
    var tf = SG.S.forces[t.f];
    if (tf && (tf.lord === target || SG.isKin(target, tf.lord))) return 0;
    if (t.s === 'captive') return SG.clamp(0.25 + o.cha / 300 + (lord.cha - 50) / 200 + (70 - t.loy) / 150, 0.03, 0.9);
    return SG.clamp(((100 - t.loy) / 100) * (o.cha / 100) * 0.9, 0, 0.8);
  }
  return 0;
};
SG.join = function (target, fid, cid) {
  var t = SG.S.off[target];
  t.s = 'force'; t.f = fid; t.c = cid; t.acted = true;
  t.loy = SG.isKin(target, SG.S.forces[fid].lord) ? 100 : SG.randInt(65, 85);
  t.found = true;
};
SG.cmd.recruit = function (cid, oid, target) {
  if (!SG.ready(cid, oid)) return fail('명령할 수 없는 장수입니다');
  var t = SG.S.off[target];
  if (!t) return fail('대상이 없습니다');
  var fid = SG.S.cities[cid].owner;
  if (t.s === 'free' && !(t.found && t.c === cid)) return fail('이 도시에서 찾은 인재만 등용할 수 있습니다');
  if (t.s === 'force' && t.f === fid) return fail('이미 우리 장수입니다');
  if (t.s !== 'free' && t.s !== 'force') return fail('등용할 수 없는 상태입니다');
  var p = SG.recruitChance(oid, target, fid);
  if (SG.chance(p)) {
    var from = t.s === 'force' ? t.f : null;
    SG.join(target, fid, cid);
    return done(oid, SG.name(target) + '이(가) ' + SG.name(oid) + '의 설득에 응해 ' + SG.forceName(fid) + ' 세력에 들어왔다!' +
      (from ? ' (' + SG.forceName(from) + ' 세력에서 넘어옴)' : ''), { success: true });
  }
  if (t.s === 'force') t.loy = Math.min(100, t.loy + 2);
  return done(oid, SG.name(target) + '은(는) ' + SG.name(oid) + '의 권유를 거절했다.', { success: false });
};
SG.cmd.reward = function (cid, target) {
  var c = SG.S.cities[cid], t = SG.S.off[target];
  if (!t || t.s !== 'force' || t.f !== c.owner || t.c !== cid) return fail('이 도시의 우리 장수만 포상할 수 있습니다');
  if (t.loy >= 100) return fail('충성도가 이미 최고치입니다');
  if (c.gold < SG.COST.reward) return fail('금이 부족합니다 (필요 ' + SG.COST.reward + ')');
  c.gold -= SG.COST.reward;
  var g = SG.randInt(6, 12);
  t.loy = Math.min(100, t.loy + g);
  var msg = SG.name(target) + '에게 금 ' + SG.COST.reward + '을(를) 내렸다. 충성 +' + g;
  if (SG.cmdLog) SG.cmdLog.push({ oid: target, msg: SG.josa(msg), ok: true });
  return { ok: true, msg: msg, gain: g };
};

// ---- 이동: 장수가 병사·금·식량을 가지고 이웃 우리 도시로 옮겨 가 그곳에 머문다
SG.cmd.move = function (cid, oids, dest, soldiers, gold, food) {
  var c = SG.S.cities[cid], d = SG.S.cities[dest];
  if (!d || SG.ADJ[cid].indexOf(dest) < 0) return fail('붙어 있는 도시로만 이동할 수 있습니다');
  if (d.owner !== c.owner) return fail('우리 도시로만 이동할 수 있습니다');
  oids = oids || [];
  if (!oids.length) return fail('이동할 장수를 한 명 이상 고르세요');
  for (var i = 0; i < oids.length; i++) if (!SG.ready(cid, oids[i])) return fail('명령할 수 없는 장수가 있습니다');
  soldiers = SG.clamp(Math.floor(soldiers || 0), 0, c.soldiers);
  gold = SG.clamp(Math.floor(gold || 0), 0, c.gold);
  food = SG.clamp(Math.floor(food || 0), 0, c.food);
  if (soldiers > 0) {
    d.train = Math.round((d.train * d.soldiers + c.train * soldiers) / (d.soldiers + soldiers));
    d.morale = Math.round((d.morale * d.soldiers + c.morale * soldiers) / (d.soldiers + soldiers));
  }
  var mix = SG.mixOf(cid, soldiers);
  SG.takeTroops(c, mix, cid); SG.putTroops(d, mix, dest);
  c.gold -= gold; d.gold += gold;
  c.food -= food; d.food += food;
  oids.forEach(function (o) { SG.S.off[o].c = dest; SG.S.off[o].acted = true; });
  var extra = [];
  if (soldiers) extra.push('병사 ' + SG.fmt(soldiers));
  if (gold) extra.push('금 ' + SG.fmt(gold));
  if (food) extra.push('식량 ' + SG.fmt(food));
  var msg = oids.map(SG.name).join(', ') + '이(가) ' + (soldiers ? '병사 ' + SG.fmt(soldiers) + '을(를) 이끌고 ' : '') + SG.cityName(dest) + '(으)로 이동했다' + (extra.length > (soldiers ? 1 : 0) ? ' (' + extra.slice(soldiers ? 1 : 0).join(', ') + ' 함께)' : '') + '.';
  if (SG.cmdLog) SG.cmdLog.push({ oid: oids[0], msg: SG.josa(msg), ok: true });
  return { ok: true, msg: msg };
};

// ---- 수송: cid 의 장수 oid 가 이웃 우리 도시 src → dest 로 금·식량을 실어 나르고 돌아온다 (장수는 제자리, 이번 달 행동 끝).
// 플레이어 화면은 금·식량만 (병사는 「이동」). 위임 태수가 데려올 때(dest = cid)는 장수가 가서 병사를 이끌고 돌아온다.
SG.cmd.transport = function (cid, oid, src, dest, soldiers, food, gold) {
  var a = SG.S.cities[src], b = SG.S.cities[dest];
  if (src !== cid && dest !== cid) return fail('이 도시와 이웃 도시 사이만 옮길 수 있습니다');
  if (SG.ADJ[src].indexOf(dest) < 0 || a.owner !== b.owner || a.owner !== SG.S.cities[cid].owner) return fail('붙어 있는 우리 도시끼리만 옮길 수 있습니다');
  if (!SG.ready(cid, oid)) return fail('명령할 수 없는 장수입니다');
  soldiers = SG.clamp(Math.floor(soldiers || 0), 0, a.soldiers);
  food = SG.clamp(Math.floor(food || 0), 0, a.food);
  gold = SG.clamp(Math.floor(gold || 0), 0, a.gold);
  if (!soldiers && !food && !gold) return fail('보낼 병사·금·식량을 정하세요');
  if (soldiers > 0) {
    b.train = Math.round((b.train * b.soldiers + a.train * soldiers) / (b.soldiers + soldiers));
    b.morale = Math.round((b.morale * b.soldiers + a.morale * soldiers) / (b.soldiers + soldiers));
  }
  var mix = SG.mixOf(src, soldiers);
  SG.takeTroops(a, mix, src); SG.putTroops(b, mix, dest);
  a.food -= food; b.food += food;
  a.gold -= gold; b.gold += gold;
  var what = [soldiers ? '병사 ' + SG.fmt(soldiers) : '', gold ? '금 ' + SG.fmt(gold) : '', food ? '식량 ' + SG.fmt(food) : ''].filter(Boolean).join('·');
  // 병사는 장수가 이끈다: 데려올 때는 장수가 그 도시에 가서 병사를 이끌고 돌아온다
  var msg = src === cid ? SG.name(oid) + '이(가) ' + what + '을(를) ' + SG.cityName(dest) + '(으)로 실어 보내고 돌아왔다.'
    : soldiers ? SG.name(oid) + '이(가) ' + SG.cityName(src) + '에 가서 ' + what + '을(를) 이끌고 돌아왔다.'
    : SG.name(oid) + '이(가) ' + SG.cityName(src) + '에서 ' + what + '을(를) 실어 왔다.';
  return done(oid, msg, { moved: soldiers, src: src, dest: dest });
};

// ---- 주인 없는 도시 차지 (전투 없이)
SG.occupy = function (cid, oids, dest, soldiers, food) {
  var c = SG.S.cities[cid], d = SG.S.cities[dest];
  if (d.owner) return fail('주인이 있는 도시입니다');
  if (d.soldiers > 0) return fail('도시에 병사가 있습니다');
  for (var i = 0; i < oids.length; i++) if (!SG.ready(cid, oids[i])) return fail('명령할 수 없는 장수가 있습니다');
  soldiers = SG.clamp(Math.floor(soldiers || 0), 0, c.soldiers);
  food = SG.clamp(Math.floor(food || 0), 0, c.food);
  var mix = SG.mixOf(cid, soldiers);
  SG.takeTroops(c, mix, cid); c.food -= food;
  d.owner = c.owner; d.soldiers = 0; d.cav = 0; d.arc = 0; d.tTot = 0; SG.putTroops(d, mix, dest); d.food += food; d.train = c.train; d.morale = c.morale;
  oids.forEach(function (o) { SG.S.off[o].c = dest; SG.S.off[o].acted = true; });
  return { ok: true, msg: SG.forceName(c.owner) + ' 세력이 ' + SG.cityName(dest) + '을(를) 차지했다.' };
};

// 도시 주변에 적(동맹 아님)이 있는지, 가장 큰 적 병력
SG.threat = function (cid) {
  var fid = SG.S.cities[cid].owner, max = 0, front = false;
  SG.ADJ[cid].forEach(function (n) {
    var nc = SG.S.cities[n];
    if (nc.owner !== fid && !SG.isAlly(fid, nc.owner)) {
      front = true;
      if (nc.owner) max = Math.max(max, nc.soldiers);
    }
  });
  return { front: front, max: max };
};
