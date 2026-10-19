// 계략·외교 명령 창 (3단계)
var SG = SG || {};

SG.UI.CMD_GROUPS.push(
  { name: '계략', items: [
    { label: '유언비어', run: function (cid) { return SG.UI.cmdRumor(cid); } },
    { label: '이간', run: function (cid) { return SG.UI.cmdSow(cid); } },
    { label: '선동', run: function (cid) { return SG.UI.cmdCityScheme(cid, 'incite'); } },
    { label: '방화', run: function (cid) { return SG.UI.cmdCityScheme(cid, 'arson'); } },
    { label: '내응', run: function (cid) { return SG.UI.cmdPlot(cid); } },
    { label: '매복', run: function (cid) { return SG.UI.cmdAmbush(cid); } }
  ] },
  { name: '외교', items: [
    { label: '친선', run: function (cid) { return SG.UI.cmdDiplo(cid, 'gift'); } },
    { label: '동맹', run: function (cid) { return SG.UI.cmdDiplo(cid, 'ally'); } },
    { label: '항복 권고', run: function (cid) { return SG.UI.cmdDiplo(cid, 'demand'); } },
    { label: '교역', run: function (cid) { return SG.UI.cmdTrade(cid); } }
  ] }
);

SG.UI.cmdRumor = async function (cid) {
  var S = SG.S, c = S.cities[cid];
  var targets = SG.ADJ[cid].filter(function (n) { var o = S.cities[n].owner; return o && o !== c.owner; });
  if (!targets.length) { SG.UI.toast('붙어 있는 다른 세력 도시가 없습니다', true); return; }
  var target = targets[0];
  var sel = SG.UI.targetCards(targets, target, function (n) { target = n; tbl.refresh(); },
    function (n) { var t = S.cities[n]; return '민심 ' + t.loyal + ' · 사기 ' + t.morale; });
  var ready = SG.readyOfficers(cid);
  if (!ready.length) { SG.UI.toast('이번 달에 명령할 수 있는 장수가 없습니다', true); return; }
  var closeFn;
  ready.sort(function (a, b) { return SG.O(b).int - SG.O(a).int; });
  var tbl = h('div');
  tbl.refresh = function () {
    tbl.innerHTML = '';
    tbl.appendChild(SG.UI.officerCards(ready, { big: true,
      stat: function (o) { return { label: '지력', value: SG.O(o).int, hi: SG.O(o).int >= 80 }; },
      extra: function (o) { return '성공률 ' + Math.round(SG.UI.coopCalc(o, function () { return SG.rumorChance(o, target); }) * 100) + '%'; },
      mark: function (o) { return SG.UI.pendingHelpers && SG.UI.pendingHelpers.indexOf(o) >= 0 ? { tag: ['助', '협력'], up: true } : null; },
      onPick: function (o) { closeFn(o); } }));
  };
  var coopR = SG.UI.coopRow(cid, 'int', null, function () { tbl.refresh(); }, '비용 +25%/명');
  tbl.refresh();
  var body = h('div', null, [
    SG.UI.brief('헛소문을 퍼뜨려 상대 도시의 민심과 병사 사기를 떨어뜨립니다 · 금 ' + SG.COST.rumor + ' · 지력이 높을수록 잘 됩니다'),
    h('div', { class: 'step' }, [h('i', { text: '一' }), '목표 도시']), sel,
    coopR,
    h('div', { class: 'step' }, [h('i', { text: '二' }), '실행할 장수 (누르면 바로 실행)']),
    h('div', { class: 'pick-cards' }, [tbl])
  ]);
  var oid = await SG.UI.modal({ title: '유언비어 — 어느 도시에 헛소문을 퍼뜨릴까요?', body: body, size: 'wide', cancel: null, buttons: [{ label: '취소', value: null }], onOpen: function (b, close) { closeFn = close; } });
  if (oid) await SG.UI.doCmd({ kind: 'rumor', cid: cid, oid: oid, cities: [cid, target], run: function () { return SG.cmd.rumor(cid, oid, target); } });
};

SG.UI.cmdSow = async function (cid) {
  var S = SG.S, c = S.cities[cid];
  var ready = SG.readyOfficers(cid);
  if (!ready.length) { SG.UI.toast('이번 달에 명령할 수 있는 장수가 없습니다', true); return; }
  var plotter = ready.slice().sort(function (a, b) { return SG.O(b).int - SG.O(a).int; })[0];
  var closeFn, body = h('div');
  function sowP(o) { return SG.UI.coopCalc(plotter, function () { return SG.sowChance(plotter, o); }); }
  var coopS = SG.UI.coopRow(cid, 'int', function () { return plotter; }, function () { render(); }, '비용 +25%/명');
  function render() {
    body.innerHTML = '';
    var sel = h('select', { class: 'inp', style: { width: '200px' }, onchange: function (e) { plotter = e.target.value; render(); } },
      ready.slice().sort(function (a, b) { return SG.O(b).int - SG.O(a).int; }).map(function (o) { return h('option', { value: o, selected: o === plotter || null, text: SG.name(o) + ' (지력 ' + SG.O(o).int + ')' }); }));
    body.appendChild(h('div', { class: 'field' }, [h('label', { text: '실행할 장수' }), sel]));
    coopS.redraw(); body.appendChild(coopS);
    body.appendChild(SG.UI.brief('다른 세력 장수의 충성을 떨어뜨립니다 · 금 ' + SG.COST.sow + ' · 충성이 낮아지면 「등용」하기 쉬워지고 스스로 떠나기도 합니다'));
    var list = Object.keys(S.off).filter(function (o) { var x = S.off[o]; return x.s === 'force' && x.f !== c.owner && SG.sowChance(plotter, o) > 0; });
    body.appendChild(h('div', { class: 'pick-list' }, [SG.UI.officerTable(list, {
      sortBy: { get: function (o) { return sowP(o); } },
      cols: [{ label: '세력', get: function (o) { return SG.forceName(S.off[o].f); } }, { label: '충성', cls: 'n', get: function (o) { return S.off[o].loy; } },
        { label: '성공률', cls: 'n', get: function (o) { return sowP(o); }, render: function (o) { return Math.round(sowP(o) * 100) + '%'; } }],
      onPick: function (o) { closeFn(o); } })]));
  }
  render();
  var target = await SG.UI.modal({ title: '이간 — 누구의 충성을 흔들까요?', body: body, size: 'wide', cancel: null, buttons: [{ label: '취소', value: null }], onOpen: function (b, close) { closeFn = close; } });
  if (target) await SG.UI.doCmd({ kind: 'sow', cid: cid, oid: plotter, offs: [target], cities: [cid], run: function () { return SG.cmd.sow(cid, plotter, target); } });
};

SG.UI.DIPLO = {
  gift: { title: '친선', note: '금 ' + 300 + '을(를) 보내 우호도를 올립니다. 우호도가 높으면 동맹을 맺기 쉽습니다.', run: 'gift' },
  ally: { title: '동맹', note: SG.ALLY_MONTHS + '개월 동안 서로 공격하지 않습니다. 우호도가 높을수록, 사신의 매력이 높을수록 잘 됩니다.', run: 'ally' },
  demand: { title: '항복 권고', note: '도시 3개 이하이고 병력이 우리의 1/3 이하인 세력에게 항복을 권합니다. 받아들이면 도시와 장수가 모두 우리 것이 됩니다.', run: 'demand' }
};
SG.UI.cmdDiplo = async function (cid, kind) {
  var S = SG.S, c = S.cities[cid], D = SG.UI.DIPLO[kind];
  var others = SG.aliveForces().filter(function (f) { return f !== c.owner; });
  if (kind === 'ally') others = others.filter(function (f) { return !SG.isAlly(c.owner, f); });
  if (!others.length) { SG.UI.toast('상대할 세력이 없습니다', true); return; }
  var ready = SG.readyOfficers(cid);
  if (!ready.length) { SG.UI.toast('이번 달에 명령할 수 있는 장수가 없습니다', true); return; }
  var envoy = ready.slice().sort(function (a, b) { return SG.O(b).cha - SG.O(a).cha; })[0];
  function chance(f) {
    return SG.UI.coopCalc(envoy, function () {
      if (kind === 'ally') return SG.allyChance(envoy, c.owner, f);
      if (kind === 'demand') return SG.surrenderChance(envoy, c.owner, f);
      return 1;
    });
  }
  var closeFn, body = h('div');
  var coopD = SG.UI.coopRow(cid, 'cha', function () { return envoy; }, function () { render(); });
  function render() {
    body.innerHTML = '';
    var sel = h('select', { class: 'inp', style: { width: '200px' }, onchange: function (e) { envoy = e.target.value; render(); } },
      ready.slice().sort(function (a, b) { return SG.O(b).cha - SG.O(a).cha; }).map(function (o) { return h('option', { value: o, selected: o === envoy || null, text: SG.name(o) + ' (매력 ' + SG.O(o).cha + ')' }); }));
    body.appendChild(h('div', { class: 'field' }, [h('label', { text: '사신' }), sel]));
    coopD.redraw(); body.appendChild(coopD);
    body.appendChild(SG.UI.brief(D.note.replace(/\. /g, " · ").replace(/\.$/, "") + ' · 상대 세력을 누르세요'));
    var tb = h('tbody');
    others.slice().sort(function (a, b) { return chance(b) - chance(a) || SG.rel(c.owner, b).fr - SG.rel(c.owner, a).fr; }).forEach(function (f) {
      var t = SG.forceTotals(f), r = SG.rel(c.owner, f), p = chance(f);
      var can = kind === 'gift' || p > 0;
      tb.appendChild(h('tr', { class: can ? 'click' : 'dim', onclick: can ? function () { closeFn(f); } : null }, [
        h('td', null, [h('span', { style: { display: 'inline-flex', gap: '8px', alignItems: 'center' } }, [SG.UI.seal(f, 22), SG.forceName(f)]),
          r.ally > 0 ? h('span', { class: 'tag ally', text: '동맹 ' + r.ally + '개월' }) : null]),
        h('td', { class: 'n', text: t.cities }), h('td', { class: 'n', text: SG.fmt(t.soldiers) }), h('td', { class: 'n' }, [h('span', { class: 'fr' }, [h('i', { style: { width: SG.clamp(r.fr, 0, 100) + '%', background: r.fr >= 70 ? 'var(--good)' : r.fr >= 40 ? 'var(--bronze)' : 'var(--bad)' } })]), String(r.fr)]),
        h('td', { class: 'n', text: kind === 'gift' ? '+' + Math.round(11 + SG.UI.coopCalc(envoy, function () { return SG.O(envoy).cha; }) / 10) : Math.round(p * 100) + '%' })
      ]));
    });
    body.appendChild(h('div', { class: 'pick-list' }, [h('table', { class: 't' }, [h('thead', null, [h('tr', null, [
      h('th', { text: '세력' }), h('th', { class: 'n', text: '도시' }), h('th', { class: 'n', text: '병사' }), h('th', { class: 'n', text: '우호도' }),
      h('th', { class: 'n', text: kind === 'gift' ? '우호도 변화' : '성공률' })])]), tb])]));
  }
  render();
  var f = await SG.UI.modal({ title: D.title + ' — 어느 세력에 사신을 보낼까요?', body: body, size: 'wide', cancel: null, buttons: [{ label: '취소', value: null }], onOpen: function (b, close) { closeFn = close; } });
  if (!f) return;
  await SG.UI.doCmd({ kind: kind, cid: cid, oid: envoy, fid: f, cities: kind === 'demand' ? [cid].concat(SG.citiesOf(f)) : [cid], run: function () { return SG.cmd[D.run](cid, envoy, f); } });
};

// ---- 선동·방화 (이웃 적 도시를 고르고 장수를 누르면 바로 실행)
Object.assign(SG.UI.CMD_META, {
  '선동': ['incite', '금 ' + SG.COST.incite + ' · 지력·매력'], '방화': ['arson', '금 ' + SG.COST.arson + ' · 지력·무력'],
  '내응': ['plot', '금 ' + SG.COST.plot + ' · 지력·매력'], '매복': ['ambush', '금 ' + SG.COST.ambush + ' · 지력·통솔']
});
SG.UI.CITY_SCHEME = {
  incite: { title: '선동 — 어느 도시에 민란을 일으킬까요?', stat: 'int', statL: '지력', chance: function (o, n) { return SG.inciteChance(o, n); },
    brief: '백성을 부추겨 민란을 일으킵니다 — 병사 5~10%·금 10~20%·인구·민심이 줄어듭니다 · 금 ' + SG.COST.incite + ' · 상대 민심이 낮을수록 잘 됩니다 (유언비어로 먼저 민심을 깎으면 좋음)',
    sub: function (t) { return '민심 ' + t.loyal + ' · 병사 ' + SG.fmt(t.soldiers); } },
  arson: { title: '방화 — 어느 도시에 불을 지를까요?', stat: 'int', statL: '지력', chance: function (o, n) { return SG.arsonChance(o, n); },
    brief: '몰래 들어가 곡식 창고와 저잣거리에 불을 지릅니다 — 식량 15~30%·상업이 줄어듭니다 · 금 ' + SG.COST.arson + ' · 지력과 무력이 높을수록 잘 됩니다 · 들키면 우호도가 더 떨어짐',
    sub: function (t) { return '식량 ' + SG.fmt(t.food) + ' · 상업 ' + t.comm; } }
};
SG.UI.cmdCityScheme = async function (cid, kind) {
  var S = SG.S, c = S.cities[cid], K = SG.UI.CITY_SCHEME[kind];
  var targets = SG.ADJ[cid].filter(function (n) { var o = S.cities[n].owner; return o && o !== c.owner; });
  if (!targets.length) { SG.UI.toast('붙어 있는 다른 세력 도시가 없습니다', true); return; }
  var ready = SG.readyOfficers(cid);
  if (!ready.length) { SG.UI.toast('이번 달에 명령할 수 있는 장수가 없습니다', true); return; }
  var target = targets.slice().sort(function (a, b) { return kind === 'incite' ? S.cities[a].loyal - S.cities[b].loyal : S.cities[b].food - S.cities[a].food; })[0];
  var tbl = h('div'), closeFn;
  var sel = SG.UI.targetCards(targets, target, function (n) { target = n; tbl.refresh(); }, function (n) { return K.sub(S.cities[n]); });
  ready.sort(function (a, b) { return K.chance(b, target) - K.chance(a, target); });
  tbl.refresh = function () {
    tbl.innerHTML = '';
    tbl.appendChild(SG.UI.officerCards(ready, { big: true,
      stat: function (o) { return { label: K.statL, value: SG.O(o)[K.stat], hi: SG.O(o)[K.stat] >= 80 }; },
      extra: function (o) { return '성공률 ' + Math.round(SG.UI.coopCalc(o, function () { return K.chance(o, target); }) * 100) + '%'; },
      mark: function (o) { return SG.UI.pendingHelpers && SG.UI.pendingHelpers.indexOf(o) >= 0 ? { tag: ['助', '협력'], up: true } : null; },
      onPick: function (o) { closeFn(o); } }));
  };
  var coopR = SG.UI.coopRow(cid, K.stat, null, function () { tbl.refresh(); }, '비용 +25%/명');
  tbl.refresh();
  var body = h('div', null, [
    SG.UI.brief(K.brief),
    h('div', { class: 'step' }, [h('i', { text: '一' }), '목표 도시']), sel,
    coopR,
    h('div', { class: 'step' }, [h('i', { text: '二' }), '실행할 장수 (누르면 바로 실행)']),
    h('div', { class: 'pick-cards' }, [tbl])
  ]);
  var oid = await SG.UI.modal({ title: K.title, body: body, size: 'wide', cancel: null, buttons: [{ label: '취소', value: null }], onOpen: function (b, close) { closeFn = close; } });
  if (oid) await SG.UI.doCmd({ kind: kind, cid: cid, oid: oid, cities: [cid, target], run: function () { return SG.cmd[kind](cid, oid, target); } });
};

// ---- 내응: 이웃 적 도시 장수에게 밀서를 보낸다
SG.UI.cmdPlot = async function (cid) {
  var S = SG.S, c = S.cities[cid];
  var list = SG.plotTargets(cid);
  if (!list.length) { SG.UI.toast('꾈 만한 이웃 적 장수가 없습니다 (붙어 있는 적 도시의 장수만, 군주·가족 제외)', true); return; }
  var ready = SG.readyOfficers(cid);
  if (!ready.length) { SG.UI.toast('이번 달에 명령할 수 있는 장수가 없습니다', true); return; }
  var plotter = ready.slice().sort(function (a, b) { return (SG.O(b).int + SG.O(b).cha) - (SG.O(a).int + SG.O(a).cha); })[0];
  var closeFn, body = h('div');
  function pp(o) { return SG.UI.coopCalc(plotter, function () { return SG.plotChance(plotter, o); }); }
  var coopP = SG.UI.coopRow(cid, 'int', function () { return plotter; }, function () { render(); }, '비용 +25%/명');
  function render() {
    body.innerHTML = '';
    var sel = h('select', { class: 'inp', style: { width: '220px' }, onchange: function (e) { plotter = e.target.value; render(); } },
      ready.slice().sort(function (a, b) { return (SG.O(b).int + SG.O(b).cha) - (SG.O(a).int + SG.O(a).cha); }).map(function (o) { return h('option', { value: o, selected: o === plotter || null, text: SG.name(o) + ' (지력 ' + SG.O(o).int + ' · 매력 ' + SG.O(o).cha + ')' }); }));
    body.appendChild(h('div', { class: 'field' }, [h('label', { text: '밀서를 쓸 장수' }), sel]));
    coopP.redraw(); body.appendChild(coopP);
    body.appendChild(SG.UI.brief('이웃 적 도시 장수에게 밀서와 금을 보내 내응을 약속받습니다 · ' + SG.PLOT_MONTHS + '개월 안에 그 도시를 치면 싸움이 시작될 때 부대째 우리 편으로 돌아섭니다 · 금 ' + SG.COST.plot + ' · 충성이 낮을수록 잘 됩니다 · 실패하면 그 세력과 사이가 나빠짐'));
    body.appendChild(h('div', { class: 'pick-list' }, [SG.UI.officerTable(list, {
      sortBy: { get: function (o) { return pp(o); } },
      cols: [{ label: '도시', get: function (o) { return SG.cityName(S.off[o].c); } }, { label: '세력', get: function (o) { return SG.forceName(S.off[o].f); } },
        { label: '충성', cls: 'n', get: function (o) { return S.off[o].loy; } },
        { label: '약속', cls: 'n', get: function (o) { var p = SG.plotOf(o); return p && p.f === c.owner ? '내응 중' : ''; } },
        { label: '성공률', cls: 'n', get: function (o) { return pp(o); }, render: function (o) { return Math.round(pp(o) * 100) + '%'; } }],
      onPick: function (o) { closeFn(o); } })]));
  }
  render();
  var target = await SG.UI.modal({ title: '내응 — 누구에게 밀서를 보낼까요?', body: body, size: 'wide', cancel: null, buttons: [{ label: '취소', value: null }], onOpen: function (b, close) { closeFn = close; } });
  if (target) await SG.UI.doCmd({ kind: 'plot', cid: cid, oid: plotter, offs: [target], cities: [cid], run: function () { return SG.cmd.plot(cid, plotter, target); } });
};

// ---- 매복: 우리 도시 둘레에 복병을 숨긴다
SG.UI.cmdAmbush = async function (cid) {
  var S = SG.S, c = S.cities[cid];
  var ready = SG.readyOfficers(cid);
  if (!ready.length) { SG.UI.toast('이번 달에 명령할 수 있는 장수가 없습니다', true); return; }
  var cur = SG.ambushOf(cid), closeFn, tbl = h('div');
  ready.sort(function (a, b) { return (SG.O(b).int + SG.O(b).lead) - (SG.O(a).int + SG.O(a).lead); });
  tbl.refresh = function () {
    tbl.innerHTML = '';
    tbl.appendChild(SG.UI.officerCards(ready, { big: true,
      stat: function (o) { return { label: '지+통', value: SG.O(o).int + SG.O(o).lead, hi: SG.O(o).int + SG.O(o).lead >= 160 }; },
      extra: function (o) { return '적 병사 약 ' + Math.round(SG.UI.coopCalc(o, function () { return SG.ambushPower(o); }) * 100) + '% 피해'; },
      mark: function (o) { return SG.UI.pendingHelpers && SG.UI.pendingHelpers.indexOf(o) >= 0 ? { tag: ['助', '협력'], up: true } : null; },
      onPick: function (o) { closeFn(o); } }));
  };
  var coopA = SG.UI.coopRow(cid, 'int', null, function () { tbl.refresh(); }, '비용 +25%/명');
  tbl.refresh();
  var th = SG.threat(cid);
  var body = h('div', null, [
    SG.UI.brief('성 둘레 길목에 복병을 숨겨 둡니다 · ' + SG.AMBUSH_MONTHS + '개월 안에 적이 이 도시로 쳐들어오면 싸움이 시작될 때 기습해 적 병사를 쓰러뜨리고 사기를 꺾습니다 · 금 ' + SG.COST.ambush + ' · 지력·통솔이 높을수록 피해가 큼 · 한 번 터지면 끝'),
    cur ? h('p', { class: 'note', text: '이미 ' + (S.off[cur.oid] ? SG.name(cur.oid) + '의 ' : '') + '복병이 숨어 있습니다 (' + Math.max(0, cur.until - SG.monthIndex()) + '개월 남음). 새로 숨기면 바뀝니다.' }) : null,
    th && th.front ? null : h('p', { class: 'note', text: '이 도시는 적과 맞닿아 있지 않습니다. 매복은 적이 쳐들어올 만한 전방 도시에서 쓰세요.' }),
    coopA,
    h('div', { class: 'step' }, [h('i', { text: '一' }), '복병을 이끌 장수 (누르면 바로 실행)']),
    h('div', { class: 'pick-cards' }, [tbl])
  ]);
  var oid = await SG.UI.modal({ title: '매복 — 누가 복병을 이끌까요?', body: body, size: 'wide', cancel: null, buttons: [{ label: '취소', value: null }], onOpen: function (b, close) { closeFn = close; } });
  if (oid) await SG.UI.doCmd({ kind: 'ambush', cid: cid, oid: oid, cities: [cid], run: function () { return SG.cmd.ambush(cid, oid); } });
};
