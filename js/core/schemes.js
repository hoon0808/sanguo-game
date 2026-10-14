// 계략 더하기: 선동(민란)·방화(창고 불)·내응(싸울 때 적 장수가 넘어옴)·매복(쳐들어오는 적을 기습)
// 유언비어·이간은 diplomacy.js
var SG = SG || {};

SG.COST.incite = 100;
SG.COST.arson = 80;
SG.COST.plot = 150;
SG.COST.ambush = 60;
SG.PLOT_MONTHS = 6;      // 내응 약속이 유지되는 달 수
SG.AMBUSH_MONTHS = 3;    // 매복이 기다리는 달 수

SG.monthIndex = function () { return SG.S.year * 12 + SG.S.month; };
// 상대 도시에서 가장 높은 지력 (계략을 꿰뚫어 보는 사람)
SG.bestInt = function (cid) {
  var c = SG.S.cities[cid], best = 30;
  if (c.owner) SG.officersIn(cid, c.owner).forEach(function (o) { best = Math.max(best, SG.O(o).int); });
  return best;
};
function schemeCheck(cid, oid, target, cost) {
  if (!SG.ready(cid, oid)) return '명령할 수 없는 장수입니다';
  var c = SG.S.cities[cid], t = SG.S.cities[target];
  if (!t || SG.ADJ[cid].indexOf(target) < 0 || !t.owner || t.owner === c.owner) return '붙어 있는 다른 세력 도시만 고를 수 있습니다';
  if (c.gold < cost) return '금이 부족합니다 (필요 ' + cost + ')';
  return null;
}
function schemeCost(k) { return SG.coopCost ? SG.coopCost(SG.COST[k]) : SG.COST[k]; }

// ---- 선동: 백성을 부추겨 민란을 일으킨다. 민심이 낮은 도시일수록 잘 된다 (유언비어로 민심을 깎은 뒤 하면 좋다)
SG.inciteChance = function (oid, cid) {
  var o = SG.O(oid), t = SG.S.cities[cid];
  return SG.clamp(0.3 + (o.int - SG.bestInt(cid)) / 100 + (o.cha - 60) / 200 + (60 - t.loyal) / 90 + (o.sk === '신산' ? 0.12 : 0), 0.05, 0.85);
};
SG.cmd.incite = function (cid, oid, target) {
  var cost = schemeCost('incite'), err = schemeCheck(cid, oid, target, cost);
  if (err) return { ok: false, msg: err };
  var c = SG.S.cities[cid], t = SG.S.cities[target];
  c.gold -= cost;
  SG.S.off[oid].acted = true;
  var r = SG.rel(c.owner, t.owner); r.fr = Math.max(0, r.fr - 5);
  if (SG.chance(SG.inciteChance(oid, target))) {
    var ks = SG.randf(0.05, 0.1), kg = SG.randf(0.1, 0.2);
    var ls = Math.round(t.soldiers * ks), lg = Math.round(t.gold * kg), lp = Math.round(t.pop * 0.02), dl = SG.randInt(4, 8);
    t.soldiers -= ls; t.gold -= lg; t.pop -= lp; t.loyal = Math.max(0, t.loyal - dl);
    SG.troops(t, target);
    SG.log(t.owner, SG.cityName(target) + '에서 민란이 일어났다! 병사 ' + SG.fmt(ls) + '이(가) 흩어지고 관아 창고가 털렸다.', 'warn');
    return { ok: true, success: true, msg: SG.name(oid) + '의 선동으로 ' + SG.cityName(target) + '에 민란이 일어났다! 병사 -' + SG.fmt(ls) + ', 금 -' + SG.fmt(lg) + ', 민심 -' + dl };
  }
  return { ok: true, success: false, msg: SG.cityName(target) + ' 백성들은 ' + SG.name(oid) + '의 선동에 따르지 않았다.' };
};

// ---- 방화: 몰래 들어가 창고와 저잣거리에 불을 지른다. 지력과 무력이 함께 필요하다
SG.arsonChance = function (oid, cid) {
  var o = SG.O(oid);
  return SG.clamp(0.4 + (o.int - SG.bestInt(cid)) / 100 + (o.war - 60) / 250 + (o.sk === '신산' ? 0.1 : 0), 0.05, 0.8);
};
SG.cmd.arson = function (cid, oid, target) {
  var cost = schemeCost('arson'), err = schemeCheck(cid, oid, target, cost);
  if (err) return { ok: false, msg: err };
  var c = SG.S.cities[cid], t = SG.S.cities[target];
  c.gold -= cost;
  SG.S.off[oid].acted = true;
  var r = SG.rel(c.owner, t.owner); r.fr = Math.max(0, r.fr - 5);
  if (SG.chance(SG.arsonChance(oid, target))) {
    var lf = Math.round(t.food * SG.randf(0.15, 0.3)), lc = Math.round(t.comm * SG.randf(0.05, 0.1));
    t.food -= lf; t.comm -= lc;
    SG.log(t.owner, SG.cityName(target) + '의 곡식 창고에 불이 났다! 식량 ' + SG.fmt(lf) + '이(가) 타 버렸다.', 'warn');
    return { ok: true, success: true, msg: SG.name(oid) + '이(가) ' + SG.cityName(target) + '에 불을 질렀다! 식량 -' + SG.fmt(lf) + ', 상업 -' + lc };
  }
  // 들키면 다치거나 쫓겨 오며 우호도가 더 떨어진다
  r.fr = Math.max(0, r.fr - 5);
  return { ok: true, success: false, msg: SG.name(oid) + '은(는) ' + SG.cityName(target) + ' 경비병에게 들켜 불도 못 지르고 달아났다.' };
};

// ---- 내응: 이웃 적 도시의 장수와 몰래 약속한다. 그 도시를 칠 때(직접 지휘·자동 모두) 싸움이 시작되면 우리 편으로 돌아선다
SG.plotChance = function (oid, target) {
  var t = SG.S.off[target], o = SG.O(oid), T = SG.O(target);
  if (!t || t.s !== 'force') return 0;
  var f = SG.S.forces[t.f];
  if (f.lord === target || SG.isKin(target, f.lord)) return 0;
  return SG.clamp(0.15 + (o.int - T.int) / 120 + (o.cha - 60) / 200 + (85 - t.loy) / 80 + (o.sk === '신산' ? 0.1 : 0), 0.03, 0.8);
};
// 꾈 수 있는 장수: 붙어 있는 적 도시의 장수 (군주·가족 빼고)
SG.plotTargets = function (cid) {
  var S = SG.S, c = S.cities[cid], out = [];
  SG.ADJ[cid].forEach(function (n) {
    var t = S.cities[n];
    if (!t.owner || t.owner === c.owner) return;
    var lord = S.forces[t.owner].lord;
    SG.officersIn(n, t.owner).forEach(function (o) { if (o !== lord && !SG.isKin(o, lord)) out.push(o); });
  });
  return out;
};
SG.plotOf = function (oid) {
  var so = SG.S.off[oid], p = so && so.plot;
  if (!p) return null;
  if (so.s !== 'force' || p.of !== so.f || SG.monthIndex() > p.until) { delete so.plot; return null; }
  return p;
};
SG.cmd.plot = function (cid, oid, target) {
  if (!SG.ready(cid, oid)) return { ok: false, msg: '명령할 수 없는 장수입니다' };
  var S = SG.S, c = S.cities[cid], t = S.off[target];
  if (!t || t.s !== 'force' || t.f === c.owner || SG.ADJ[cid].indexOf(t.c) < 0) return { ok: false, msg: '붙어 있는 적 도시의 장수만 고를 수 있습니다' };
  var p = SG.plotChance(oid, target);
  if (p <= 0) return { ok: false, msg: '군주와 그 가족은 꾈 수 없습니다' };
  var cost = schemeCost('plot');
  if (c.gold < cost) return { ok: false, msg: '금이 부족합니다 (필요 ' + cost + ')' };
  c.gold -= cost;
  S.off[oid].acted = true;
  if (SG.chance(p)) {
    t.plot = { f: c.owner, of: t.f, until: SG.monthIndex() + SG.PLOT_MONTHS };
    return { ok: true, success: true, msg: SG.name(target) + '이(가) ' + SG.name(oid) + '의 밀서를 받고 내응을 약속했다. ' + SG.PLOT_MONTHS + '개월 안에 ' + SG.cityName(t.c) + '을(를) 치면 싸움이 시작될 때 우리 편으로 돌아선다.' };
  }
  // 실패: 충성을 다지고, 약속을 들킨 상대 세력과 사이가 나빠진다
  var r = SG.rel(c.owner, t.f); r.fr = Math.max(0, r.fr - 8);
  return { ok: true, success: false, msg: SG.name(target) + '은(는) ' + SG.name(oid) + '의 밀서를 불태우고 주군에게 알렸다.' };
};

// ---- 매복: 우리 도시 둘레에 군사를 숨겨 둔다. 몇 달 안에 적이 쳐들어오면 싸움 시작 때 기습해 피해를 준다
SG.ambushPower = function (oid) { var o = SG.O(oid); return SG.clamp(0.05 + (o.int + o.lead - 100) / 1000, 0.05, 0.16); };
SG.cmd.ambush = function (cid, oid) {
  if (!SG.ready(cid, oid)) return { ok: false, msg: '명령할 수 없는 장수입니다' };
  var c = SG.S.cities[cid], cost = schemeCost('ambush');
  if (c.soldiers < 500) return { ok: false, msg: '숨겨 둘 병사가 모자랍니다 (500명 이상)' };
  if (c.gold < cost) return { ok: false, msg: '금이 부족합니다 (필요 ' + cost + ')' };
  c.gold -= cost;
  SG.S.off[oid].acted = true;
  var pw = SG.ambushPower(oid);
  c.ambush = { f: c.owner, oid: oid, pw: pw, until: SG.monthIndex() + SG.AMBUSH_MONTHS };
  return { ok: true, success: true, msg: SG.name(oid) + '이(가) ' + SG.cityName(cid) + ' 둘레에 복병을 숨겼다. ' + SG.AMBUSH_MONTHS + '개월 안에 적이 쳐들어오면 기습한다 (적 병사 약 ' + Math.round(pw * 100) + '% 피해).' };
};
SG.ambushOf = function (cid) {
  var c = SG.S.cities[cid], a = c.ambush;
  if (!a) return null;
  if (a.f !== c.owner || SG.monthIndex() > a.until) { delete c.ambush; return null; }
  return a;
};

// ---- 싸움이 시작되기 직전: 내응·매복을 적용한다 (직접 지휘·자동 전투 모두). 일어난 일은 pre.log, 돌아선 장수는 pre.turned
SG.preBattle = function (atk, def) {
  var S = SG.S, pre = { log: [], turned: [] };
  // 내응: 수비 장수가 약속대로 돌아선다 (그새 충성이 많이 올랐으면 망설인다)
  def.units.slice().forEach(function (u) {
    if (!u.oid || u.n <= 0) return;
    var p = SG.plotOf(u.oid);
    if (!p || p.f !== atk.fid) return;
    delete S.off[u.oid].plot;
    if (!SG.chance(S.off[u.oid].loy >= 90 ? 0.4 : 0.85)) { pre.log.push(SG.name(u.oid) + '은(는) 마지막에 마음을 바꾸어 내응하지 않았다.'); return; }
    def.units.splice(def.units.indexOf(u), 1); atk.units.push(u); u.max = u.n;
    pre.turned.push({ oid: u.oid, to: 'atk' });
    pre.log.push('내응! ' + SG.name(u.oid) + '이(가) 약속대로 성문 안에서 들고일어나 ' + SG.forceName(atk.fid) + ' 쪽으로 돌아섰다!');
  });
  // 매복: 쳐들어오는 군대를 숨은 병사가 덮친다
  var a = SG.ambushOf(def.city);
  if (a && a.f === def.fid && pre.turned.some(function (x) { return x.oid === a.oid; })) {
    delete S.cities[def.city].ambush;
    pre.log.push('복병을 이끌던 ' + SG.name(a.oid) + '이(가) 돌아서는 바람에 매복은 일어나지 않았다.');
  } else if (a && a.f === def.fid) {
    delete S.cities[def.city].ambush;
    var lost = 0;
    atk.units.forEach(function (u) {
      if (u.n <= 0 || pre.turned.some(function (x) { return x.oid === u.oid; })) return;
      var d = Math.round(u.n * a.pw * SG.randf(0.8, 1.2) * (u.t === 'cav' ? 0.8 : 1));
      u.n -= d; lost += d;
    });
    atk.morale = Math.max(0, (atk.morale || 50) - 10);
    pre.ambush = { oid: a.oid, lost: lost };
    pre.log.push('매복! ' + (S.off[a.oid] ? SG.name(a.oid) + '이(가) 숨겨 둔 ' : '숨어 있던 ') + '복병이 들이닥쳐 공격군 병사 ' + SG.fmt(lost) + '이(가) 쓰러지고 사기가 꺾였다!');
  }
  return pre;
};
