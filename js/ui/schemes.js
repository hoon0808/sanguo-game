// 계략·외교 명령 창 (3단계)
var SG = SG || {};

SG.UI.CMD_GROUPS.push(
  { name: '계략', items: [
    { label: '유언비어', run: function (cid) { return SG.UI.cmdRumor(cid); } },
    { label: '이간', run: function (cid) { return SG.UI.cmdSow(cid); } }
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
      extra: function (o) { return '성공률 ' + Math.round(SG.rumorChance(o, target) * 100) + '%'; },
      onPick: function (o) { closeFn(o); } }));
  };
  tbl.refresh();
  var body = h('div', null, [
    SG.UI.brief('헛소문을 퍼뜨려 상대 도시의 민심과 병사 사기를 떨어뜨립니다 · 금 ' + SG.COST.rumor + ' · 지력이 높을수록 잘 됩니다'),
    h('div', { class: 'step' }, [h('i', { text: '一' }), '목표 도시']), sel,
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
  function render() {
    body.innerHTML = '';
    var sel = h('select', { class: 'inp', style: { width: '200px' }, onchange: function (e) { plotter = e.target.value; render(); } },
      ready.slice().sort(function (a, b) { return SG.O(b).int - SG.O(a).int; }).map(function (o) { return h('option', { value: o, selected: o === plotter || null, text: SG.name(o) + ' (지력 ' + SG.O(o).int + ')' }); }));
    body.appendChild(h('div', { class: 'field' }, [h('label', { text: '실행할 장수' }), sel]));
    body.appendChild(SG.UI.brief('다른 세력 장수의 충성을 떨어뜨립니다 · 금 ' + SG.COST.sow + ' · 충성이 낮아지면 「등용」하기 쉬워지고 스스로 떠나기도 합니다'));
    var list = Object.keys(S.off).filter(function (o) { var x = S.off[o]; return x.s === 'force' && x.f !== c.owner && SG.sowChance(plotter, o) > 0; });
    body.appendChild(h('div', { class: 'pick-list' }, [SG.UI.officerTable(list, {
      sortBy: { get: function (o) { return SG.sowChance(plotter, o); } },
      cols: [{ label: '세력', get: function (o) { return SG.forceName(S.off[o].f); } }, { label: '충성', cls: 'n', get: function (o) { return S.off[o].loy; } },
        { label: '성공률', cls: 'n', get: function (o) { return SG.sowChance(plotter, o); }, render: function (o) { return Math.round(SG.sowChance(plotter, o) * 100) + '%'; } }],
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
    if (kind === 'ally') return SG.allyChance(envoy, c.owner, f);
    if (kind === 'demand') return SG.surrenderChance(envoy, c.owner, f);
    return 1;
  }
  var closeFn, body = h('div');
  function render() {
    body.innerHTML = '';
    var sel = h('select', { class: 'inp', style: { width: '200px' }, onchange: function (e) { envoy = e.target.value; render(); } },
      ready.slice().sort(function (a, b) { return SG.O(b).cha - SG.O(a).cha; }).map(function (o) { return h('option', { value: o, selected: o === envoy || null, text: SG.name(o) + ' (매력 ' + SG.O(o).cha + ')' }); }));
    body.appendChild(h('div', { class: 'field' }, [h('label', { text: '사신' }), sel]));
    body.appendChild(SG.UI.brief(D.note.replace(/\. /g, " · ").replace(/\.$/, "") + ' · 상대 세력을 누르세요'));
    var tb = h('tbody');
    others.slice().sort(function (a, b) { return chance(b) - chance(a) || SG.rel(c.owner, b).fr - SG.rel(c.owner, a).fr; }).forEach(function (f) {
      var t = SG.forceTotals(f), r = SG.rel(c.owner, f), p = chance(f);
      var can = kind === 'gift' || p > 0;
      tb.appendChild(h('tr', { class: can ? 'click' : 'dim', onclick: can ? function () { closeFn(f); } : null }, [
        h('td', null, [h('span', { style: { display: 'inline-flex', gap: '8px', alignItems: 'center' } }, [SG.UI.seal(f, 22), SG.forceName(f)]),
          r.ally > 0 ? h('span', { class: 'tag ally', text: '동맹 ' + r.ally + '개월' }) : null]),
        h('td', { class: 'n', text: t.cities }), h('td', { class: 'n', text: SG.fmt(t.soldiers) }), h('td', { class: 'n' }, [h('span', { class: 'fr' }, [h('i', { style: { width: SG.clamp(r.fr, 0, 100) + '%', background: r.fr >= 70 ? 'var(--good)' : r.fr >= 40 ? 'var(--bronze)' : 'var(--bad)' } })]), String(r.fr)]),
        h('td', { class: 'n', text: kind === 'gift' ? '+' + Math.round(11 + SG.O(envoy).cha / 10) : Math.round(p * 100) + '%' })
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
