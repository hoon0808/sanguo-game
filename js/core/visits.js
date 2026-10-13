// 찾아오는 사람들: 플레이어 세력에 인재·상인·사신이 찾아오는 장면 (규칙 쪽). 화면은 SG.ui.visit 이 그린다.
var SG = SG || {};

// opt: {visitor: 장수 id (없으면 figure·name), from: 보낸 세력, kind, title, text, note, choices: [{label, value, cls}], auto: 화면이 없을 때 값}
SG.visit = async function (opt) {
  if (SG.S.player && SG.ui && SG.ui.visit) return SG.ui.visit(opt);
  return opt.auto;
};
SG.statLine = function (oid) {
  var o = SG.O(oid);
  return '통솔 ' + o.lead + ' · 무력 ' + o.war + ' · 지력 ' + o.int + ' · 정치 ' + o.pol + ' · 매력 ' + o.cha + (o.sk ? ' · 특기 ' + o.sk : '');
};

// 매달 끝에 한 번 (사건 뒤)
SG.runVisits = async function () {
  var S = SG.S, P = S.player;
  if (!P || !S.forces[P] || !S.forces[P].alive) return;
  var mine = SG.citiesOf(P), lord = S.forces[P].lord;

  // 1) 재야 인재가 소문을 듣고 스스로 찾아온다 (우리 도시나 그 이웃에 있는 재야)
  if (SG.chance(0.1)) {
    var near = {};
    mine.forEach(function (c) { near[c] = c; });
    mine.forEach(function (c) { SG.ADJ[c].forEach(function (n) { if (!near[n]) near[n] = c; }); });
    var cands = Object.keys(S.off).filter(function (o) {
      var x = S.off[o], m = SG.O(o);
      return x.s === 'free' && near[x.c] && SG.age(o) >= 16 && m.lead + m.war + m.int + m.pol + m.cha >= 250;
    });
    if (cands.length) {
      var oid = SG.pick(cands), dest = near[S.off[oid].c];
      var ans = await SG.visit({ visitor: oid, kind: 'talent', title: '인재 방문',
        text: '저는 ' + SG.name(oid) + '(이)라 합니다. ' + SG.name(lord) + ' 님의 이름을 듣고 ' + SG.cityName(dest) + '까지 찾아왔습니다.\n부디 저를 거두어 주십시오. 힘을 다해 섬기겠습니다.',
        note: SG.statLine(oid),
        choices: [{ label: '돌려보낸다', value: false }, { label: '맞이한다', value: true, cls: 'primary' }], auto: false });
      if (ans) {
        SG.join(oid, P, dest);
        SG.log(P, SG.name(oid) + '이(가) 스스로 찾아와 ' + SG.forceName(P) + ' 세력에 들어왔다 (' + SG.cityName(dest) + ').', 'person');
      } else S.off[oid].found = true;
    }
  }

  // 2) 떠돌이 상인: 식량을 팔거나 사 간다 (본거지 기준)
  if (SG.chance(0.08)) {
    var cap = S.forces[P].capital, c = S.cities[cap], amt = 2000;
    var sell = c.food < Math.ceil(c.soldiers / 100) * 8 || SG.chance(0.5);
    var price = sell ? Math.round(amt * SG.randf(0.2, 0.3) / 10) * 10 : Math.round(amt * SG.randf(0.12, 0.18) / 10) * 10;
    var can = sell ? c.gold >= price : c.food >= amt * 2;
    if (can) {
      var who = SG.chance(0.5) ? { figure: 'merchant', name: '떠돌이 상인', sub: '서역에서 온 장사꾼' } : { figure: 'merchant2', name: '곡물 상인', sub: '곡식을 사고파는 거상' };
      var yes = await SG.visit({ figure: who.figure, name: who.name, sub: who.sub, kind: 'merchant', title: '상인 방문',
        text: sell ? '나리, 좋은 곡식을 싣고 왔습니다요. 식량 ' + SG.fmt(amt) + '을 금 ' + SG.fmt(price) + '에 넘겨 드리겠습니다.\n이만한 값은 다시 없을 겁니다요.'
          : '나리, 창고에 곡식이 넉넉하시다고 들었습니다요. 식량 ' + SG.fmt(amt) + '을 금 ' + SG.fmt(price) + '에 사 가고 싶습니다만.',
        note: SG.cityName(cap) + ' · 금 ' + SG.fmt(c.gold) + ' · 식량 ' + SG.fmt(c.food),
        choices: [{ label: '거절한다', value: false }, { label: sell ? '식량을 산다' : '식량을 판다', value: true, cls: 'primary' }], auto: false });
      if (yes) {
        if (sell) { c.gold -= price; c.food += amt; } else { c.food -= amt; c.gold += price; }
        SG.log(P, '상인과 거래했다: 식량 ' + (sell ? '+' : '−') + SG.fmt(amt) + ', 금 ' + (sell ? '−' : '+') + SG.fmt(price) + ' (' + SG.cityName(cap) + ')', 'mine');
      }
    }
  }
};

// 우리 장수가 떠나려 할 때: 붙잡을지 묻는다. 붙잡았으면 true
SG.farewell = async function (oid) {
  var S = SG.S, P = S.player, so = S.off[oid], c = S.cities[so.c];
  if (!P || so.f !== P || !SG.ui || !SG.ui.visit) return false;
  var cost = 200, lord = S.forces[P].lord, p = SG.clamp(0.35 + SG.O(lord).cha / 250, 0, 0.85);
  var choices = [{ label: '보내 준다', value: false }];
  if (c.gold >= cost) choices.push({ label: '금 ' + cost + '을 주며 붙잡는다 (' + Math.round(p * 100) + '%)', value: true, cls: 'primary' });
  var keep = await SG.visit({ visitor: oid, kind: 'farewell', title: '작별 인사',
    text: '주공, 그동안 보살펴 주신 은혜는 잊지 않겠습니다.\n허나 제 뜻을 펼 곳이 따로 있는 듯하여… 이만 떠나고자 합니다.',
    note: '충성 ' + so.loy + ' · ' + SG.statLine(oid), choices: choices, auto: false });
  if (!keep) return false;
  c.gold -= cost;
  if (SG.chance(p)) {
    so.loy = Math.min(100, so.loy + 25);
    SG.log(P, SG.name(oid) + '이(가) 마음을 돌려 남기로 했다.', 'person');
    return true;
  }
  SG.log(P, SG.name(oid) + '은(는) 금을 받지 않고 끝내 떠났다.', 'person');
  return false;
};
