// 계략(유언비어·이간)과 외교(친선·동맹·항복 권고·동맹 파기)
var SG = SG || {};

SG.ALLY_MONTHS = 24;

// ---- 계략
SG.rumorChance = function (oid, cid) {
  var c = SG.S.cities[cid], best = 30;
  if (c.owner) SG.officersIn(cid, c.owner).forEach(function (o) { best = Math.max(best, SG.O(o).int); });
  var o = SG.O(oid);
  return SG.clamp(0.45 + (o.int - best) / 80 + (o.sk === '신산' ? 0.15 : 0), 0.08, 0.9);
};
SG.cmd.rumor = function (cid, oid, target) {
  if (!SG.ready(cid, oid)) return { ok: false, msg: '명령할 수 없는 장수입니다' };
  var c = SG.S.cities[cid], t = SG.S.cities[target];
  if (SG.ADJ[cid].indexOf(target) < 0 || !t.owner || t.owner === c.owner) return { ok: false, msg: '붙어 있는 다른 세력 도시만 고를 수 있습니다' };
  if (c.gold < SG.COST.rumor) return { ok: false, msg: '금이 부족합니다 (필요 ' + SG.COST.rumor + ')' };
  c.gold -= SG.COST.rumor;
  SG.S.off[oid].acted = true;
  var r = SG.rel(c.owner, t.owner); r.fr = Math.max(0, r.fr - 5);
  if (SG.chance(SG.rumorChance(oid, target))) {
    var dl = SG.randInt(8, 16), dm = SG.randInt(5, 10);
    t.loyal = Math.max(0, t.loyal - dl);
    t.morale = Math.max(0, t.morale - dm);
    return { ok: true, success: true, msg: SG.name(oid) + '이(가) ' + SG.cityName(target) + '에 헛소문을 퍼뜨렸다. 민심 -' + dl + ', 사기 -' + dm };
  }
  return { ok: true, success: false, msg: SG.name(oid) + '의 유언비어는 ' + SG.cityName(target) + '에서 통하지 않았다.' };
};
SG.sowChance = function (oid, target) {
  var t = SG.S.off[target], o = SG.O(oid), T = SG.O(target);
  if (!t || t.s !== 'force') return 0;
  var f = SG.S.forces[t.f];
  if (f.lord === target || SG.isKin(target, f.lord)) return 0;
  return SG.clamp(0.35 + (o.int - T.int) / 90 + (90 - t.loy) / 120 + (o.sk === '신산' ? 0.12 : 0), 0.05, 0.85);
};
SG.cmd.sow = function (cid, oid, target) {
  if (!SG.ready(cid, oid)) return { ok: false, msg: '명령할 수 없는 장수입니다' };
  var c = SG.S.cities[cid], t = SG.S.off[target];
  if (!t || t.s !== 'force' || t.f === c.owner) return { ok: false, msg: '다른 세력 장수만 고를 수 있습니다' };
  var p = SG.sowChance(oid, target);
  if (p <= 0) return { ok: false, msg: '군주와 그 가족은 이간할 수 없습니다' };
  if (c.gold < SG.COST.sow) return { ok: false, msg: '금이 부족합니다 (필요 ' + SG.COST.sow + ')' };
  c.gold -= SG.COST.sow;
  SG.S.off[oid].acted = true;
  if (SG.chance(p)) {
    var d = SG.randInt(10, 20);
    t.loy = Math.max(0, t.loy - d);
    return { ok: true, success: true, msg: SG.name(oid) + '의 이간계로 ' + SG.name(target) + '의 충성이 ' + d + ' 떨어졌다 (지금 ' + t.loy + ').' };
  }
  return { ok: true, success: false, msg: SG.name(target) + '은(는) ' + SG.name(oid) + '의 이간에 넘어가지 않았다.' };
};

// ---- 외교
SG.cmd.gift = function (cid, oid, fid) {
  if (!SG.ready(cid, oid)) return { ok: false, msg: '명령할 수 없는 장수입니다' };
  var c = SG.S.cities[cid];
  if (!SG.S.forces[fid] || !SG.S.forces[fid].alive || fid === c.owner) return { ok: false, msg: '상대 세력을 고르세요' };
  if (c.gold < SG.COST.gift) return { ok: false, msg: '금이 부족합니다 (필요 ' + SG.COST.gift + ')' };
  c.gold -= SG.COST.gift;
  SG.S.off[oid].acted = true;
  var r = SG.rel(c.owner, fid), g = Math.round(SG.randInt(8, 14) + SG.O(oid).cha / 10);
  r.fr = Math.min(100, r.fr + g);
  var cap = SG.S.cities[SG.S.forces[fid].capital];
  if (cap) cap.gold += SG.COST.gift;
  return { ok: true, msg: SG.name(oid) + '이(가) ' + SG.forceName(fid) + '에게 금 ' + SG.COST.gift + '을(를) 보냈다. 우호도 +' + g + ' (지금 ' + r.fr + ')' };
};
SG.allyChance = function (oid, from, to) {
  var r = SG.rel(from, to), o = SG.O(oid);
  var p = (r.fr - 45) / 50 + (o.cha - 60) / 200;
  // 너무 강한 상대와는 동맹을 꺼린다
  var a = SG.forceTotals(from).cities, b = SG.forceTotals(to).cities;
  if (a > b * 2.5 && a >= 6) p -= 0.25;
  return SG.clamp(p, 0, 0.92);
};
SG.makeAlly = function (a, b, months) {
  var r = SG.rel(a, b);
  r.ally = months || SG.ALLY_MONTHS;
  r.fr = Math.min(100, r.fr + 10);
};
SG.cmd.ally = function (cid, oid, fid) {
  if (!SG.ready(cid, oid)) return { ok: false, msg: '명령할 수 없는 장수입니다' };
  var c = SG.S.cities[cid];
  if (!SG.S.forces[fid] || !SG.S.forces[fid].alive || fid === c.owner) return { ok: false, msg: '상대 세력을 고르세요' };
  if (SG.isAlly(c.owner, fid)) return { ok: false, msg: '이미 동맹입니다' };
  SG.S.off[oid].acted = true;
  if (SG.chance(SG.allyChance(oid, c.owner, fid))) {
    SG.makeAlly(c.owner, fid);
    SG.log(c.owner, SG.forceName(c.owner) + ' 세력과 ' + SG.forceName(fid) + ' 세력이 동맹을 맺었다 (' + SG.ALLY_MONTHS + '개월).', 'sys');
    return { ok: true, success: true, msg: SG.forceName(fid) + '이(가) 동맹을 받아들였다! (' + SG.ALLY_MONTHS + '개월)' };
  }
  var r = SG.rel(c.owner, fid); r.fr = Math.max(0, r.fr - 3);
  return { ok: true, success: false, msg: SG.forceName(fid) + '이(가) 동맹을 거절했다.' };
};
SG.breakAlly = function (a, b) {
  var r = SG.rel(a, b);
  r.ally = 0; r.fr = Math.max(0, r.fr - 40);
  // 약속을 깬 세력은 다른 세력에게도 신용을 잃는다
  SG.aliveForces().forEach(function (f) { if (f !== a && f !== b) { var x = SG.rel(a, f); x.fr = Math.max(0, x.fr - 5); } });
  SG.log(a, SG.forceName(a) + ' 세력이 ' + SG.forceName(b) + ' 세력과의 동맹을 깼다.', 'war');
};
SG.surrenderChance = function (oid, from, to) {
  var A = SG.forceTotals(from), B = SG.forceTotals(to);
  if (B.cities > 3) return 0;
  var ratio = A.soldiers / Math.max(1, B.soldiers);
  if (ratio < 3) return 0;
  var p = (ratio - 3) / 12 + (SG.rel(from, to).fr - 50) / 150 + (SG.O(oid).cha - 70) / 200 - (B.cities - 1) * 0.08;
  return SG.clamp(p, 0, 0.7);
};
SG.absorb = function (winner, loser) {
  var lf = SG.S.forces[loser];
  SG.citiesOf(loser).forEach(function (cid) { SG.S.cities[cid].owner = winner; SG.S.cities[cid].deleg = false; });
  SG.officersOf(loser).forEach(function (o) {
    var so = SG.S.off[o];
    so.f = winner; so.loy = SG.isKin(o, SG.S.forces[winner].lord) ? 100 : SG.randInt(60, 80);
  });
  lf.alive = false;
  SG.log(winner, SG.name(lf.lord) + ' 세력이 ' + SG.forceName(winner) + ' 세력에 항복해 합쳐졌다.', 'war');
  if (SG.isPlayer(loser)) SG.S.over = 'lose';
};
SG.cmd.demand = function (cid, oid, fid) {
  if (!SG.ready(cid, oid)) return { ok: false, msg: '명령할 수 없는 장수입니다' };
  var c = SG.S.cities[cid];
  if (!SG.S.forces[fid] || !SG.S.forces[fid].alive || fid === c.owner) return { ok: false, msg: '상대 세력을 고르세요' };
  var p = SG.surrenderChance(oid, c.owner, fid);
  if (p <= 0) return { ok: false, msg: '상대가 항복을 생각할 만큼 약하지 않습니다 (도시 3개 이하, 병력 3배 이상 차이 필요)' };
  SG.S.off[oid].acted = true;
  if (SG.chance(p)) {
    SG.absorb(c.owner, fid);
    return { ok: true, success: true, msg: SG.forceName(c.owner) + '의 권유에 ' + SG.name(SG.S.forces[fid].lord) + '이(가) 항복했다! 도시와 장수가 모두 우리 것이 되었다.' };
  }
  var r = SG.rel(c.owner, fid); r.fr = Math.max(0, r.fr - 10);
  return { ok: true, success: false, msg: SG.forceName(fid) + '이(가) 항복 권유를 거절했다.' };
};

// ---- 컴퓨터의 외교·계략 (세력마다 한 달에 한 번)
SG.AI.diplomacy = async function (fid) {
  var S = SG.S, me = SG.forceTotals(fid);
  var others = SG.aliveForces().filter(function (f) { return f !== fid; });
  // 이웃 세력
  var nb = {};
  SG.citiesOf(fid).forEach(function (cid) {
    SG.ADJ[cid].forEach(function (n) { var o = S.cities[n].owner; if (o && o !== fid) nb[o] = true; });
  });
  // 1) 동맹: 우호도가 높고 더 강한 공동의 적이 있을 때
  var envoyCity = S.forces[fid].capital;
  var envoy = SG.readyOfficers(envoyCity).sort(function (a, b) { return SG.O(b).cha - SG.O(a).cha; })[0];
  if (envoy && SG.chance(0.15)) {
    var strongest = others.slice().sort(function (a, b) { return SG.citiesOf(b).length - SG.citiesOf(a).length; })[0];
    var cand = others.filter(function (f) {
      return f !== strongest && !SG.isAlly(fid, f) && SG.rel(fid, f).fr >= 55 && SG.citiesOf(strongest).length > me.cities;
    })[0];
    if (cand) {
      if (SG.isPlayer(cand)) {
        if (SG.ui && SG.ui.visit) {
          var yes = await SG.visit({ visitor: envoy, from: fid, kind: 'envoy', title: '동맹 제의',
            text: SG.forceName(fid) + ' 님의 명을 받고 온 ' + SG.name(envoy) + '(이)라 합니다.\n지금 ' + SG.forceName(strongest) + '의 세력이 날로 커지고 있습니다. 우리 두 집안이 손을 잡고 ' + SG.ALLY_MONTHS + '개월 동안 서로 돕는 것이 어떻겠습니까?',
            note: SG.forceName(fid) + ' 세력 · 도시 ' + me.cities + ' · 병사 ' + SG.fmt(me.soldiers) + ' · 우호도 ' + SG.rel(fid, cand).fr,
            choices: [{ label: '거절한다', value: false }, { label: '동맹을 맺는다', value: true, cls: 'primary' }], auto: false });
          SG.S.off[envoy].acted = true;
          if (yes) { SG.makeAlly(fid, cand); SG.log(cand, SG.forceName(fid) + ' 세력과 동맹을 맺었다 (' + SG.ALLY_MONTHS + '개월).', 'sys'); }
          else { var rr = SG.rel(fid, cand); rr.fr = Math.max(0, rr.fr - 8); }
        }
      } else if (SG.chance(SG.allyChance(envoy, fid, cand))) {
        SG.S.off[envoy].acted = true;
        SG.makeAlly(fid, cand);
        SG.log(fid, SG.forceName(fid) + ' 세력과 ' + SG.forceName(cand) + ' 세력이 동맹을 맺었다.', 'sys');
      }
    }
  }
  // 2) 친선: 이웃 중 강한 세력에게 가끔 선물
  envoy = SG.readyOfficers(envoyCity).sort(function (a, b) { return SG.O(b).cha - SG.O(a).cha; })[0];
  if (envoy && S.cities[envoyCity].gold > 1500 && SG.chance(0.12)) {
    var big = Object.keys(nb).filter(function (f) { return SG.forceTotals(f).soldiers > me.soldiers && SG.rel(fid, f).fr < 70; })[0];
    if (big) {
      var gr = SG.cmd.gift(envoyCity, envoy, big);
      if (gr.ok && SG.isPlayer(big) && SG.visit) await SG.visit({ visitor: envoy, from: fid, kind: 'gift', title: '사신 방문',
        text: SG.forceName(fid) + ' 님께서 보내신 ' + SG.name(envoy) + '입니다.\n작은 정성이나마 금 ' + SG.COST.gift + '을 바치오니, 앞으로도 좋은 이웃으로 지내 주십시오.',
        note: '금 ' + SG.COST.gift + '이(가) 본거지에 들어왔습니다 · 우호도 ' + SG.rel(fid, big).fr, choices: [{ label: '고맙게 받는다', value: true, cls: 'primary' }], auto: true });
    }
  }
  // 3) 항복 권고: 아주 약한 이웃 (플레이어에게는 하지 않음)
  envoy = SG.readyOfficers(envoyCity).sort(function (a, b) { return SG.O(b).cha - SG.O(a).cha; })[0];
  if (envoy && SG.chance(0.2)) {
    var weak = Object.keys(nb).filter(function (f) { return !SG.isPlayer(f) && !SG.isAlly(fid, f) && SG.surrenderChance(envoy, fid, f) > 0.15; })[0];
    if (weak) {
      var r = SG.cmd.demand(envoyCity, envoy, weak);
      if (r.ok && r.success) SG.log(fid, r.msg, 'war');
    }
  }
  // 4) 계략: 앞쪽 도시에서 지력 높은 장수가 가끔
  SG.citiesOf(fid).forEach(function (cid) {
    if (!SG.chance(0.18)) return;
    var c = S.cities[cid];
    var plotter = SG.readyOfficers(cid).filter(function (o) { return SG.O(o).int >= 75; }).sort(function (a, b) { return SG.O(b).int - SG.O(a).int; })[0];
    if (!plotter || c.gold < 300) return;
    var tgts = SG.ADJ[cid].filter(function (n) { var o = S.cities[n].owner; return o && o !== fid && !SG.isAlly(fid, o); });
    if (!tgts.length) return;
    if (SG.chance(0.5)) {
      var tc = tgts.sort(function (a, b) { return S.cities[b].soldiers - S.cities[a].soldiers; })[0];
      SG.cmd.rumor(cid, plotter, tc);
    } else {
      var enemyOffs = SG.officersIn(SG.pick(tgts)).filter(function (o) { return SG.sowChance(plotter, o) > 0.35; });
      if (enemyOffs.length) SG.cmd.sow(cid, plotter, enemyOffs[0]);
    }
  });
};
