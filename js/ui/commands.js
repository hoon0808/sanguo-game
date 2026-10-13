// 명령 버튼과 명령 창
var SG = SG || {};

// 명령 묶음. 나중 단계에서 묶음을 더 붙인다 (계략·외교)
SG.UI.CMD_GROUPS = [
  { name: '내정', items: [
    { label: '농업 개발', run: function (cid) { return SG.UI.cmdDevelop(cid, 'agri'); } },
    { label: '상업 개발', run: function (cid) { return SG.UI.cmdDevelop(cid, 'comm'); } },
    { label: '성벽 보수', run: function (cid) { return SG.UI.cmdDevelop(cid, 'wall'); } },
    { label: '민심 안정', run: function (cid) { return SG.UI.cmdRelief(cid); } }
  ] },
  { name: '군사', items: [
    { label: '징병', run: function (cid) { return SG.UI.cmdConscript(cid); } },
    { label: '훈련', run: function (cid) { return SG.UI.cmdTrain(cid); } },
    { label: '수송', run: function (cid) { return SG.UI.cmdTransport(cid); } },
    { label: '출진', cls: 'war', run: function (cid) { return SG.UI.cmdAttack(cid); } }
  ] },
  { name: '인사', items: [
    { label: '인재 탐색', run: function (cid) { return SG.UI.cmdSearch(cid); } },
    { label: '등용', run: function (cid) { return SG.UI.cmdRecruit(cid); } },
    { label: '포상', run: function (cid) { return SG.UI.cmdReward(cid); } },
    { label: '이동', run: function (cid) { return SG.UI.cmdMove(cid); } }
  ] }
];

// 명령 아이콘·도움말
SG.UI.CMD_META = {
  '농업 개발': ['agri', '금 50 · 정치'], '상업 개발': ['comm', '금 50 · 정치'], '성벽 보수': ['wall', '금 50 · 통솔'], '민심 안정': ['relief', '식량 300 · 매력'], '교역': ['trade', '금 ↔ 식량'],
  '징병': ['conscript', '금 · 매력'], '훈련': ['train', '통솔'], '출진': ['attack', '이웃 도시 공격'],
  '인재 탐색': ['search', '지력·매력'], '등용': ['recruit', '매력'], '포상': ['reward', '금 100'], '이동': ['move', '장수·병사·물자'], '수송': ['transport', '금·식량'],
  '유언비어': ['rumor', '금 50 · 지력'], '이간': ['sow', '금 80 · 지력'],
  '친선': ['gift', '금 300 · 매력'], '동맹': ['ally', '매력'], '항복 권고': ['surrender', '매력']
};

SG.UI.commandBox = function (cid) {
  var c = SG.S.cities[cid];
  var sec = h('div', { class: 'sec cmdbox' });
  var tabs = h('div', { class: 'cmd-tabs', role: 'tablist' });
  var grid = h('div', { class: 'cmd-grid' });
  var TAB_ICON = { '내정': 'agri', '군사': 'attack', '인사': 'officer', '계략': 'rumor', '외교': 'ally' };
  function show(name) {
    SG.UI.state.cmdTab = name;
    [].forEach.call(tabs.children, function (b) { b.classList.toggle('on', b.dataset.tab === name); });
    grid.innerHTML = '';
    var g = SG.UI.CMD_GROUPS.filter(function (x) { return x.name === name; })[0];
    g.items.forEach(function (it) {
      var meta = SG.UI.CMD_META[it.label] || ['order', ''];
      grid.appendChild(h('button', { class: 'cmd' + (it.cls ? ' ' + it.cls : ''), type: 'button', 'data-cmd': it.label, onclick: async function () {
        await it.run(cid);
        SG.UI.refresh();
      } }, [SG.UI.icon(meta[0], 22), h('span', { class: 'cmd-l', text: it.label }), h('span', { class: 'cmd-h', text: meta[1] })]));
    });
  }
  SG.UI.CMD_GROUPS.forEach(function (g) {
    tabs.appendChild(h('button', { class: 'cmd-tab', type: 'button', role: 'tab', 'data-tab': g.name, onclick: function () { show(g.name); } }, [SG.UI.icon(TAB_ICON[g.name] || 'order', 16), g.name]));
  });
  sec.appendChild(h('h4', null, ['명령', h('label', { class: 'note', style: { cursor: 'pointer' }, title: '켜면 이 도시의 내정을 컴퓨터가 알아서 합니다 (출진은 하지 않음)' }, [
    h('input', { type: 'checkbox', checked: c.deleg || null, onchange: function (e) { c.deleg = e.target.checked; SG.UI.toast(SG.josa(SG.cityName(cid) + (c.deleg ? '을(를) 태수에게 맡겼습니다 — 턴 종료 때 내정·징병·병력 수송을 알아서 합니다' : ' 위임을 풀었습니다'))); } }),
    ' 위임'
  ])]));
  sec.appendChild(tabs);
  sec.appendChild(grid);
  var known = SG.UI.CMD_GROUPS.some(function (g) { return g.name === SG.UI.state.cmdTab; });
  show(known ? SG.UI.state.cmdTab : SG.UI.CMD_GROUPS[0].name);
  return sec;
};

// 명령 설명 띠: " · " 로 나뉜 설명을 꼬리표로, gauge 가 있으면 지금 값과 예상 변화를 막대로
SG.UI.brief = function (note, gz) {
  var chips = (note || '').split(' · ').filter(Boolean).map(function (t, i) { return h('span', { class: 'chip-b' + (i === 0 ? ' first' : ''), text: t }); });
  return h('div', { class: 'brief' }, [h('div', { class: 'brief-t' }, chips), gz || null]);
};
// g: {label, cur, max, gain(oid)} → 막대. show(gain) 로 예상치를 겹쳐 보인다
SG.UI.gauge = function (g) {
  var fill = h('i', { class: 'g-cur' }), ghost = h('i', { class: 'g-gain' }), num = h('span', { class: 'g-num' });
  var el = h('div', { class: 'gauge' }, [h('div', { class: 'g-top' }, [h('span', { class: 'g-k', text: g.label }), num]), h('div', { class: 'g-bar' }, [fill, ghost])]);
  el.show = function (gain) {
    var cur = g.cur, after = Math.min(g.max, cur + Math.max(0, Math.round(gain || 0)));
    fill.style.width = (cur / g.max * 100) + '%';
    ghost.style.left = (cur / g.max * 100) + '%';
    ghost.style.width = ((after - cur) / g.max * 100) + '%';
    num.innerHTML = '';
    num.appendChild(h('b', { text: SG.fmt(cur) }));
    if (after > cur) { num.appendChild(document.createTextNode(' → ')); num.appendChild(h('b', { class: 'up', text: SG.fmt(after) })); }
    num.appendChild(document.createTextNode(' / ' + SG.fmt(g.max)));
  };
  el.show(0);
  return el;
};

// 명령할 장수 고르기: 초상 카드. sortBy 능력치가 크게 보이고, cols[0]이 있으면 예상 효과로 보인다.
// gauge {label, cur, max, gain(oid)} 를 주면 카드에 마우스를 올릴 때 예상 결과가 막대에 겹쳐 보인다.
SG.UI.STAT_LABEL = { lead: '통솔', war: '무력', int: '지력', pol: '정치', cha: '매력' };
SG.UI.pickOfficer = function (cid, title, sortBy, cols, note, gauge, top) {
  var ready = SG.readyOfficers(cid);
  if (!ready.length) { SG.UI.toast('이번 달에 명령할 수 있는 장수가 없습니다', true); return Promise.resolve(null); }
  var resolveFn, closeFn;
  var p = new Promise(function (r) { resolveFn = r; });
  ready.sort(function (a, b) { return SG.O(b)[sortBy] - SG.O(a)[sortBy]; });
  var col = cols && cols[0];
  var gz = gauge ? SG.UI.gauge(gauge) : null;
  var holder = h('div', { class: 'pick-cards' });
  function build() {
    holder.innerHTML = '';
    holder.appendChild(SG.UI.officerCards(ready, {
      big: true,
      stat: function (o) { var v = SG.O(o)[sortBy]; return { label: SG.UI.STAT_LABEL[sortBy], value: v, hi: v >= 80 }; },
      extra: col ? function (o) { return col.label + ' ' + (col.render ? col.render(o) : col.get(o)); } : null,
      onHover: gz ? function (o) { gz.show(gauge.gain(o)); } : null,
      onPick: function (o) { closeFn(o); }
    }));
    if (gz) gz.show(gauge.gain(ready[0]));
  }
  build();
  // top: 카드 위에 붙는 선택 줄 (예: 징병 병종). top.onChange 가 불리면 카드를 다시 그린다
  if (top) top.rebuild = build;
  var body = h('div', null, [
    note || gz ? SG.UI.brief(note, gz) : null,
    top || null,
    holder
  ]);
  SG.UI.modal({ title: title, body: body, size: 'wide', cancel: null, buttons: [{ label: '취소', value: null }], onOpen: function (box, close) { closeFn = close; } })
    .then(resolveFn);
  return p;
};

// 목표 도시 카드 (도시 둘레 지형 그림 위에 이름·세력). sub(cid) → 아래 작은 글
SG.UI.targetCards = function (list, cur, onPick, sub) {
  var S = SG.S, wrap = h('div', { class: 'tgts' });
  list.forEach(function (n) {
    var t = S.cities[n], f = t.owner ? S.forces[t.owner] : null, bn = SG.UI.cityBanner(n, 200, 92, 1.7);
    var b = h('button', { type: 'button', class: 'tgt' + (n === cur ? ' on' : ''), 'data-city': n, style: { backgroundSize: bn.size, backgroundPosition: bn.pos } }, [
      h('span', { class: 'tgt-shade' }),
      h('span', { class: 'tgt-own', style: { background: f ? f.color : '' }, text: f ? SG.forceName(t.owner) : '공백지' }),
      h('b', { class: 'tgt-n', text: SG.cityName(n) }),
      h('small', { class: 'tgt-s', text: sub(n) })
    ]);
    b.addEventListener('click', function () {
      [].forEach.call(wrap.children, function (x) { x.classList.toggle('on', x === b); });
      SG.UI.sfx('click');
      onPick(n);
    });
    wrap.appendChild(b);
  });
  return wrap;
};

SG.UI.cmdDevelop = async function (cid, kind) {
  var c = SG.S.cities[cid], max = SG.CITY_SIZE[SG.CITIES[cid].size][kind + 'Max'];
  var stat = kind === 'wall' ? 'lead' : 'pol';
  var oid = await SG.UI.pickOfficer(cid, { agri: '농업 개발', comm: '상업 개발', wall: '성벽 보수' }[kind] + ' — 누구에게 맡길까요?', stat,
    [{ label: '예상', cls: 'n', get: function (o) { return '+' + Math.round(SG.devGain(o, kind)); } }],
    '금 ' + SG.COST.develop + ' 사용 · 보유 금 ' + SG.fmt(c.gold) + (kind === 'wall' ? ' · 통솔·정치가 높을수록 효과가 큽니다' : ' · 정치가 높을수록 효과가 큽니다'),
    { label: SG.DEV_KIND[kind], cur: c[kind], max: max, gain: function (o) { return SG.devGain(o, kind); } });
  if (oid) await SG.UI.doCmd({ kind: kind, cid: cid, oid: oid, cities: [cid], run: function () { return SG.cmd.develop(cid, oid, kind); } });
};
SG.UI.cmdRelief = async function (cid) {
  var oid = await SG.UI.pickOfficer(cid, '민심 안정 — 누구에게 맡길까요?', 'cha',
    [{ label: '예상', cls: 'n', get: function (o) { return '+' + Math.round((SG.O(o).cha * 0.15 + 6) * (SG.O(o).sk === '인덕' ? 1.3 : 1)); } }],
    '식량 ' + SG.COST.relief + '을(를) 백성에게 나눕니다 · 보유 식량 ' + SG.fmt(SG.S.cities[cid].food) + ' · 매력이 높을수록 효과가 큽니다',
    { label: '민심', cur: SG.S.cities[cid].loyal, max: 100, gain: function (o) { return (SG.O(o).cha * 0.15 + 6) * (SG.O(o).sk === '인덕' ? 1.3 : 1); } });
  if (oid) await SG.UI.doCmd({ kind: 'relief', cid: cid, oid: oid, cities: [cid], run: function () { return SG.cmd.relief(cid, oid); } });
};
SG.UI.cmdConscript = async function (cid) {
  var c = SG.S.cities[cid];
  var type = SG.UI.state.conType || 'inf';
  // 병종 고르기: 보병·기병·궁병 (값이 다르다)
  var top = h('div', { class: 'tpick' });
  function drawTop() {
    top.innerHTML = '';
    var p = SG.cityTroops(cid);
    SG.TROOP_KEYS.forEach(function (t) {
      var T = SG.TROOPS[t];
      top.appendChild(h('button', { type: 'button', class: 'tcard t-' + t + (type === t ? ' on' : ''), onclick: function () { type = t; SG.UI.state.conType = t; drawTop(); if (top.rebuild) top.rebuild(); } }, [
        h('i', { text: T.h }), h('b', { text: T.n }), h('small', { text: '100명당 금 ' + SG.conscriptCost(100, t) + ' · 지금 ' + SG.fmt(p[t]) }), h('span', { text: T.desc })
      ]));
    });
  }
  drawTop();
  var oid = await SG.UI.pickOfficer(cid, '징병 — 누구에게 맡길까요?', 'cha',
    [{ label: '모집', cls: 'n', get: function (o) { var n = SG.conscriptAmount(cid, o), cost = SG.conscriptCost(n, type); if (c.gold < cost) n = Math.floor(c.gold * 20 / SG.TROOPS[type].cost / 100) * 100; return SG.TROOPS[type].h + ' ' + SG.fmt(n) + ' · 금 ' + SG.conscriptCost(n, type); } }],
    '보유 금 ' + SG.fmt(c.gold) + ' · 매력이 높을수록 많이 모입니다 · 민심이 조금 내려갑니다', null, top);
  if (oid) await SG.UI.doCmd({ kind: 'conscript', cid: cid, oid: oid, cities: [cid], run: function () { return SG.cmd.conscript(cid, oid, null, type); } });
};
// 교역: 시장에서 식량을 사고판다. 값은 철·상업·이달 시세·장수의 정치에 따라 다르다
SG.UI.cmdTrade = async function (cid) {
  var c = SG.S.cities[cid];
  var needF = Math.ceil(c.soldiers / 100);
  var mode = SG.UI.state.tradeMode || (c.food < needF * 6 ? 'buy' : 'sell');
  var R0 = SG.tradeRates(cid, null), amt = 0;
  var tip = R0.since <= 2 ? '수확 직후라 식량이 쌉니다 — 사기 좋은 때' : R0.since >= 9 ? '수확 전이라 식량이 비쌉니다 — 팔기 좋은 때' : '보통 철입니다';
  var top = h('div', { class: 'trade-top' });
  var picks = h('div', { class: 'tpick two' }), sliderBox = h('div'), preview = h('div', { class: 'trade-prev' });
  function maxFor(m) { return m === 'buy' ? Math.min(R0.max, Math.floor(c.gold / R0.buy) * 100) : Math.min(R0.max, Math.floor(c.food / 100) * 100); }
  function upd() {
    var R = R0, g = mode === 'buy' ? -Math.ceil(amt / 100 * R.buy) : Math.floor(amt / 100 * R.sell);
    preview.innerHTML = '';
    preview.appendChild(h('span', { class: 'tp-f ' + (mode === 'buy' ? 'up' : 'down'), text: '식량 ' + (mode === 'buy' ? '+' : '−') + SG.fmt(amt) }));
    preview.appendChild(h('span', { class: 'tp-g ' + (g >= 0 ? 'up' : 'down'), text: '금 ' + (g >= 0 ? '+' : '−') + SG.fmt(Math.abs(g)) }));
    preview.appendChild(h('small', { text: '(정치 높은 장수가 맡으면 조금 더 이득)' }));
  }
  function draw() {
    picks.innerHTML = '';
    [['buy', '買', '식량 사기', '금 → 식량 · 100당 금 ' + R0.buy], ['sell', '賣', '식량 팔기', '식량 → 금 · 100당 금 ' + R0.sell]].forEach(function (x) {
      picks.appendChild(h('button', { type: 'button', class: 'tcard t-' + x[0] + (mode === x[0] ? ' on' : ''), onclick: function () { mode = x[0]; SG.UI.state.tradeMode = mode; draw(); if (top.rebuild) top.rebuild(); } },
        [h('i', { text: x[1] }), h('b', { text: x[2] }), h('small', { text: x[3] })]));
    });
    var mx = maxFor(mode);
    amt = Math.min(amt || Math.min(mx, 2000), mx);
    sliderBox.innerHTML = '';
    var sl = SG.UI.slider(mode === 'buy' ? '살 식량' : '팔 식량', mx, amt, function (v) { amt = v; upd(); });
    sliderBox.appendChild(sl);
    upd();
  }
  top.appendChild(picks); top.appendChild(sliderBox); top.appendChild(preview);
  draw();
  var oid = await SG.UI.pickOfficer(cid, '교역 — 누구에게 맡길까요?', 'pol',
    [{ label: '100당 금', cls: 'n', get: function (o) { var R = SG.tradeRates(cid, o); return mode === 'buy' ? R.buy : R.sell; } }],
    '이달 시세 · 식량 100 = 살 때 금 ' + R0.buy + ' · 팔 때 금 ' + R0.sell + ' · ' + tip + ' · 상업이 클수록 값이 좋고 한 번에 ' + SG.fmt(R0.max) + '까지', null, top);
  if (!oid || !amt) { if (oid && !amt) SG.UI.toast('거래할 식량이 없습니다', true); return; }
  await SG.UI.doCmd({ kind: 'trade', cid: cid, oid: oid, cities: [cid], run: function () { return SG.cmd.trade(cid, oid, mode, amt); } });
};
SG.UI.cmdTrain = async function (cid) {
  var c = SG.S.cities[cid];
  var oid = await SG.UI.pickOfficer(cid, '훈련 — 누구에게 맡길까요?', 'lead', [],
    '사기 ' + c.morale + ' · 통솔이 높을수록 효과가 큽니다 · 훈련·사기가 높으면 전투에서 강합니다',
    { label: '훈련 (대략)', cur: c.train, max: 100, gain: function (o) { return c.soldiers > 0 ? (SG.O(o).lead * 0.22 + 4) * Math.min(1.3, 30000 / (c.soldiers + 15000)) : 0; } });
  if (oid) await SG.UI.doCmd({ kind: 'train', cid: cid, oid: oid, cities: [cid], run: function () { return SG.cmd.train(cid, oid); } });
};
SG.UI.cmdSearch = async function (cid) {
  var oid = await SG.UI.pickOfficer(cid, '인재 탐색 — 누구를 보낼까요?', 'int', [],
    '이 도시에 숨은 재야 인재를 찾습니다. 지력·매력이 높을수록 잘 찾습니다');
  if (!oid) return;
  var r = await SG.UI.doCmd({ kind: 'search', cid: cid, oid: oid, cities: [cid], run: function () { return SG.cmd.search(cid, oid); } });
  if (r.ok && r.found && r.found.length) {
    var go = await SG.UI.confirm('인재 발견', r.found.map(SG.name).join(', ') + '을(를) 찾았습니다.\n지금 등용하러 가시겠습니까?', '등용하기', '나중에');
    if (go) await SG.UI.cmdRecruit(cid, r.found[0]);
  }
};

// 등용: 이 도시의 재야 + 다른 세력 장수
SG.UI.cmdRecruit = async function (cid, preset) {
  var S = SG.S, fid = S.cities[cid].owner;
  var ready = SG.readyOfficers(cid);
  if (!ready.length) { SG.UI.toast('이번 달에 명령할 수 있는 장수가 없습니다', true); return; }
  var recruiter = ready.slice().sort(function (a, b) { return SG.O(b).cha - SG.O(a).cha; })[0];
  var tab = 'free';
  var body = h('div');
  var closeFn;
  function chance(t) { return Math.round(SG.recruitChance(recruiter, t, fid) * 100); }
  function render() {
    body.innerHTML = '';
    var sel = h('select', { class: 'inp', style: { width: '180px' }, onchange: function (e) { recruiter = e.target.value; render(); } });
    ready.slice().sort(function (a, b) { return SG.O(b).cha - SG.O(a).cha; }).forEach(function (o) {
      sel.appendChild(h('option', { value: o, selected: o === recruiter || null, text: SG.name(o) + ' (매력 ' + SG.O(o).cha + ')' }));
    });
    body.appendChild(h('div', { class: 'field' }, [h('label', { text: '설득할 장수' }), sel]));
    body.appendChild(h('div', { class: 'tabs' }, [
      h('button', { class: 'btn small' + (tab === 'free' ? ' on' : ''), text: '이 도시의 재야', onclick: function () { tab = 'free'; render(); } }),
      h('button', { class: 'btn small' + (tab === 'enemy' ? ' on' : ''), text: '다른 세력 장수', onclick: function () { tab = 'enemy'; render(); } })
    ]));
    var list;
    if (tab === 'free') {
      list = SG.freeIn(cid, true);
      if (!list.length) { body.appendChild(h('p', { class: 'note', text: '찾아낸 재야 인재가 없습니다. 먼저 「인재 탐색」을 하세요.' })); return; }
    } else {
      list = Object.keys(S.off).filter(function (o) { var x = S.off[o]; return x.s === 'force' && x.f !== fid; })
        .filter(function (o) { return chance(o) > 0; });
      body.appendChild(SG.UI.brief('충성이 낮은 장수일수록 넘어올 가능성이 높습니다 · 군주와 그 가족은 등용할 수 없습니다'));
    }
    var cols = [{ label: '성공률', cls: 'n', get: function (o) { return chance(o); }, render: function (o) { return chance(o) + '%'; } }];
    if (tab === 'enemy') cols.unshift({ label: '세력', get: function (o) { return SG.forceName(S.off[o].f); } }, { label: '충성', cls: 'n', get: function (o) { return S.off[o].loy; } });
    body.appendChild(h('div', { class: 'pick-list' }, [SG.UI.officerTable(list, { cols: cols, sortBy: cols[cols.length - 1], onPick: function (o) { closeFn(o); } })]));
  }
  render();
  var target = preset || await SG.UI.modal({ title: '등용 — 누구를 데려올까요?', body: body, size: 'wide', cancel: null,
    buttons: [{ label: '취소', value: null }], onOpen: function (b, close) { closeFn = close; } });
  if (!target) return;
  if (preset && !SG.ready(cid, recruiter)) return;
  await SG.UI.doCmd({ kind: 'recruit', cid: cid, oid: recruiter, offs: [target], cities: [cid], run: function () { return SG.cmd.recruit(cid, recruiter, target); } });
};

SG.UI.cmdReward = async function (cid) {
  var S = SG.S, c = S.cities[cid];
  var offs = SG.officersIn(cid, c.owner).filter(function (o) { return S.forces[c.owner].lord !== o; });
  if (!offs.length) { SG.UI.toast('포상할 장수가 없습니다', true); return; }
  var body = h('div'), info = h('p', { class: 'note' });
  var tbl;
  function upd() { info.textContent = '금 ' + SG.COST.reward + '을(를) 내려 충성을 올립니다. 명령 횟수는 쓰지 않습니다. · 남은 금 ' + SG.fmt(c.gold); }
  tbl = SG.UI.officerTable(offs, { sortBy: { get: function (o) { return -S.off[o].loy; } }, cols: [{ label: '충성', cls: 'n', get: function (o) { return S.off[o].loy; } }],
    onPick: async function (o) { await SG.UI.doCmd({ kind: 'reward', cid: cid, oid: o, offs: [o], cities: [cid], run: function () { return SG.cmd.reward(cid, o); } }); upd(); tbl.refresh(); } });
  upd();
  body.appendChild(info);
  body.appendChild(h('div', { class: 'pick-list' }, [tbl]));
  await SG.UI.modal({ title: '포상 — 누구에게 상을 내릴까요?', body: body, cancel: true, buttons: [{ label: '닫기', value: true }] });
};

// 숫자 슬라이더 한 줄
SG.UI.slider = function (label, max, val, onChange) {
  var v = h('span', { class: 'v', text: SG.fmt(val) });
  var inp = h('input', { type: 'range', min: 0, max: max, step: max > 2000 ? 100 : 10, value: val, oninput: function (e) { v.textContent = SG.fmt(+e.target.value); if (onChange) onChange(+e.target.value); } });
  var row = h('div', { class: 'field' }, [h('label', { text: label }), inp, v]);
  row.get = function () { return +inp.value; };
  row.set = function (x) { inp.value = x; v.textContent = SG.fmt(+inp.value); };
  return row;
};

SG.UI.cmdMove = async function (cid) {
  var S = SG.S, c = S.cities[cid];
  var dests = SG.ADJ[cid].filter(function (n) { return S.cities[n].owner === c.owner; });
  if (!dests.length) { SG.UI.toast('붙어 있는 우리 도시가 없습니다', true); return; }
  var ready = SG.readyOfficers(cid);
  if (!ready.length) { SG.UI.toast('이번 달에 명령할 수 있는 장수가 없습니다', true); return; }
  var picked = [];
  var sel = SG.UI.destSelect(dests);
  var tbl = SG.UI.officerCards(ready, { selected: picked, onPick: function (o, card) {
    var i = picked.indexOf(o); if (i >= 0) picked.splice(i, 1); else picked.push(o);
    card.classList.toggle('sel', picked.indexOf(o) >= 0);
  } });
  var sS = SG.UI.slider('데려갈 병사', c.soldiers, 0), sG = SG.UI.slider('가져갈 금', c.gold, 0), sF = SG.UI.slider('가져갈 식량', c.food, 0);
  var body = h('div', null, [
    SG.UI.brief('장수가 병사·금·식량을 가지고 옮겨 가 그 도시에 머뭅니다 · 장수는 그대로 두고 물자만 보내려면 「군사 → 수송」'),
    h('div', { class: 'field' }, [h('label', { text: '목적지' }), sel]),
    sS, sG, sF,
    h('p', { class: 'note', text: '옮겨 갈 장수를 고르세요 (여러 명 가능).' }),
    h('div', { class: 'pick-list' }, [tbl])
  ]);
  var ok = await SG.UI.modal({ title: '이동 — 누가 어디로 갈까요?', body: body, cancel: false, buttons: [{ label: '취소', value: false }, { label: '이동', value: true, cls: 'primary', check: function () {
    if (!picked.length) { SG.UI.toast('장수를 한 명 이상 고르세요', true); return false; } return true;
  } }] });
  if (!ok) return;
  var dest = sel.value, ns = sS.get(), ng = sG.get(), nf = sF.get();
  await SG.UI.doCmd({ kind: 'move', cid: cid, oid: picked[0], offs: picked.slice(), cities: [cid, dest], target: dest, run: function () { return SG.cmd.move(cid, picked, dest, ns, ng, nf); } });
};
// 목적지 고르기 (이웃 우리 도시)
SG.UI.destSelect = function (dests) {
  var S = SG.S;
  return h('select', { class: 'inp', style: { width: '220px', maxWidth: '100%' } }, dests.map(function (d) {
    var t = S.cities[d];
    return h('option', { value: d, text: SG.cityName(d) + ' (병사 ' + SG.fmt(t.soldiers) + ' · 금 ' + SG.fmt(t.gold) + ' · 식량 ' + SG.fmt(t.food) + (SG.threat(d).front ? ' · 전방' : '') + ')' });
  }));
};
// 수송: 장수 한 명이 금·식량을 실어 보내고 돌아온다 (병사는 「이동」으로 장수가 데려간다)
SG.UI.cmdTransport = async function (cid) {
  var S = SG.S, c = S.cities[cid];
  var dests = SG.ADJ[cid].filter(function (n) { return S.cities[n].owner === c.owner; });
  if (!dests.length) { SG.UI.toast('붙어 있는 우리 도시가 없습니다', true); return; }
  var ready = SG.readyOfficers(cid);
  if (!ready.length) { SG.UI.toast('이번 달에 명령할 수 있는 장수가 없습니다', true); return; }
  var picked = null, cards = [];
  var sel = SG.UI.destSelect(dests);
  var tbl = SG.UI.officerCards(ready, { onPick: function (o, card) {
    picked = o; [].forEach.call(tbl.querySelectorAll('.ocard'), function (x) { x.classList.remove('sel'); }); card.classList.add('sel');
  } });
  var sG = SG.UI.slider('금', c.gold, 0), sF = SG.UI.slider('식량', c.food, 0);
  var body = h('div', null, [
    SG.UI.brief('장수가 금·식량을 수레에 싣고 갔다가 돌아옵니다 · 장수는 이 도시에 그대로 남습니다 · 병사는 「인사 → 이동」'),
    h('div', { class: 'field' }, [h('label', { text: '보낼 곳' }), sel]),
    sG, sF,
    h('p', { class: 'note', text: '수레를 몰 장수 한 명을 고르세요 (이번 달 명령을 씁니다).' }),
    h('div', { class: 'pick-list' }, [tbl])
  ]);
  var ok = await SG.UI.modal({ title: '수송 — 무엇을 어디로 보낼까요?', body: body, cancel: false, buttons: [{ label: '취소', value: false }, { label: '수송', value: true, cls: 'primary', check: function () {
    if (!picked) { SG.UI.toast('수레를 몰 장수를 고르세요', true); return false; }
    if (!sG.get() && !sF.get()) { SG.UI.toast('보낼 금·식량을 정하세요', true); return false; }
    return true;
  } }] });
  if (!ok) return;
  var dest = sel.value, ng = sG.get(), nf = sF.get();
  await SG.UI.doCmd({ kind: 'transport', cid: cid, oid: picked, offs: [picked], cities: [cid, dest], target: dest, run: function () { return SG.cmd.transport(cid, picked, cid, dest, 0, nf, ng); } });
};

// 양군 패널: 도시 지형 배경 + 세력 깃발 + 장수 얼굴 + 한 줄 설명. extra 는 맨 아래에 붙는 요소
SG.UI.vsSide = function (city, fid, label, offs, line, cls, extra) {
  var S = SG.S, bn = SG.UI.cityBanner(city, 400, 150, 2.4), F = fid ? S.forces[fid] : null;
  var faces = h('div', { class: 'vs-faces' }, offs.slice(0, 5).map(function (o) { return SG.UI.portrait(o, 36, fid); })
    .concat(offs.length > 5 ? [h('span', { class: 'note', text: '+' + (offs.length - 5) })] : []));
  return h('div', { class: 'side ' + (cls || ''), style: { backgroundSize: bn.size, backgroundPosition: bn.pos, borderTopColor: F ? F.color : '' } }, [
    h('span', { class: 'side-shade' }),
    h('h5', null, [h('span', { class: 'side-flag', style: { background: F ? F.color : '#66706b' }, text: F ? (SG.O(F.lord).h || SG.forceName(fid)).charAt(0) : '空' }), label]),
    faces, h('div', { class: 'side-line', text: line }), extra || null]);
};

// 출진
SG.UI.cmdAttack = async function (cid) {
  var S = SG.S, c = S.cities[cid], fid = c.owner;
  var targets = SG.ADJ[cid].filter(function (n) { var o = S.cities[n].owner; return o !== fid && !SG.isAlly(fid, o); });
  if (!targets.length) { SG.UI.toast('공격할 수 있는 이웃 도시가 없습니다', true); return; }
  var ready = SG.readyOfficers(cid);
  if (!ready.length) { SG.UI.toast('이번 달에 출진할 수 있는 장수가 없습니다', true); return; }
  var picked = [], target = targets[0], pool = SG.cityTroops(cid), alloc = {};
  ready.sort(function (a, b) { return (SG.O(b).lead + SG.O(b).war) - (SG.O(a).lead + SG.O(a).war); });
  var body = h('div'), info = h('div'), formEl = h('div', { class: 'form' });
  // 다른 장수들이 이미 맡은 것을 빼고 남은 병종별 병력
  function remain(except) {
    var r = { inf: pool.inf, cav: pool.cav, arc: pool.arc };
    picked.forEach(function (o) { if (o !== except && alloc[o]) r[alloc[o].t] -= alloc[o].n; });
    return r;
  }
  // 새로 고른 장수: 잘 다루는 병종을, 남은 병력의 적당한 몫만큼 (통솔이 높을수록 많이)
  function autoOne(o) {
    var r = remain(o), t = SG.apt(o);
    if (r[t] < 1000) t = SG.TROOP_KEYS.slice().sort(function (x, y) { return r[y] - r[x]; })[0];
    // 도시 병력의 80% 안에서: 첫 장수는 그 절반, 다음 장수부터는 남은 몫의 절반쯤
    var budget = (pool.inf + pool.cav + pool.arc) * 0.8 - picked.reduce(function (s, x) { return s + (x !== o && alloc[x] ? alloc[x].n : 0); }, 0);
    var share = picked.length <= 1 ? 0.55 : 0.5;
    alloc[o] = { t: t, n: Math.floor(Math.max(0, Math.min(r[t], budget * share)) / 100) * 100 };
  }
  // 「자동 배분」: 전체 병력의 80% 를 통솔 비율로, 병종은 잘 다루는 것부터
  function autoAll() {
    var tot = Math.floor((pool.inf + pool.cav + pool.arc) * 0.8 / 100) * 100;
    var w = picked.reduce(function (s, o) { return s + SG.O(o).lead; }, 0) || 1;
    var plan = SG.assignTypes(cid, picked.map(function (o) { return { oid: o, n: Math.floor(tot * SG.O(o).lead / w / 100) * 100 }; }));
    alloc = {};
    picked.forEach(function (o) { var u = plan.filter(function (x) { return x.oid === o; })[0]; alloc[o] = u ? { t: u.t, n: u.n } : { t: SG.apt(o), n: 0 }; });
  }
  function plan() { return picked.map(function (o) { return { oid: o, n: alloc[o] ? alloc[o].n : 0, t: alloc[o] ? alloc[o].t : 'inf' }; }); }
  picked.push(ready[0]); autoOne(ready[0]);

  // ---- 부대 편성: 장수마다 병종과 병사 수
  function renderForm() {
    formEl.innerHTML = '';
    var r = remain(null);
    formEl.appendChild(h('div', { class: 'pool' }, [h('span', { class: 'pool-h', text: SG.cityName(cid) + '에 남는 병력' })].concat(SG.TROOP_KEYS.map(function (t) {
      return h('span', { class: 'pool-c t-' + t + (r[t] < 0 ? ' over' : '') }, [h('i', { text: SG.TROOPS[t].h }), SG.TROOPS[t].n + ' ', h('b', { text: SG.fmt(r[t]) }), h('small', { text: ' / ' + SG.fmt(pool[t]) })]);
    })).concat([h('button', { class: 'btn small', type: 'button', text: '자동 배분', onclick: function () { autoAll(); renderForm(); renderInfo(); } })])));
    if (!picked.length) { formEl.appendChild(h('p', { class: 'note', text: '위에서 출진할 장수를 고르세요.' })); return; }
    picked.forEach(function (o) {
      var a = alloc[o], ap = SG.apt(o), max = Math.max(0, remain(o)[a.t]);
      var val = h('b', { class: 'fr-n', text: SG.fmt(a.n) });
      var rng = h('input', { type: 'range', min: 0, max: Math.max(100, max), step: 100, value: Math.min(a.n, max), oninput: function (e) {
        a.n = +e.target.value; val.textContent = SG.fmt(a.n); renderInfo(); updPool();
      } });
      var types = h('div', { class: 'tsel' }, SG.TROOP_KEYS.map(function (t) {
        var left = remain(o)[t];
        return h('button', { type: 'button', class: 'tbtn t-' + t + (a.t === t ? ' on' : '') + (ap === t ? ' apt' : ''), title: SG.TROOPS[t].n + ' — ' + SG.TROOPS[t].desc + (ap === t ? ' · 이 장수가 잘 다루는 병종 (+12%)' : ''),
          disabled: left < 100 && a.t !== t ? true : null, onclick: function () {
            a.t = t; a.n = Math.min(a.n || 0, Math.floor(Math.max(0, remain(o)[t]) / 100) * 100);
            if (!a.n) a.n = Math.floor(Math.min(Math.max(0, remain(o)[t]), 5000) / 100) * 100;
            renderForm(); renderInfo();
          } }, [h('i', { text: SG.TROOPS[t].h }), SG.TROOPS[t].n, ap === t ? h('em', { text: '★' }) : null]);
      }));
      formEl.appendChild(h('div', { class: 'frow' }, [
        SG.UI.portrait(o, 40),
        h('div', { class: 'fr-who' }, [h('b', { text: SG.name(o) }), h('small', { text: '통' + SG.O(o).lead + ' 무' + SG.O(o).war + ' · ' + SG.TROOPS[ap].n + '에 능함' })]),
        types, rng, val
      ]));
    });
    function updPool() {
      var r2 = remain(null);
      [].forEach.call(formEl.querySelectorAll('.pool-c'), function (el, i) { var t = SG.TROOP_KEYS[i]; el.querySelector('b').textContent = SG.fmt(r2[t]); el.classList.toggle('over', r2[t] < 0); });
    }
  }

  function renderInfo() {
    info.innerHTML = '';
    var t = S.cities[target];
    var p = plan();
    var dS = t.owner ? SG.mixShare(SG.makeDefense(target).units) : { inf: 1, cav: 0, arc: 0 };
    var myP = p.reduce(function (s, u) { return s + SG.unitPower(u.oid, u.n, c.train, c.morale, u.t) * SG.matchVs(u.t, dS); }, 0);
    var dP = t.owner ? SG.AI.cityDefense(target) : 0;
    var ratio = dP ? myP / dP : 99;
    var verdict = !t.owner && t.soldiers <= 0 ? '빈 도시 — 싸우지 않고 차지합니다' :
      ratio > 2 ? '압도적으로 유리' : ratio > 1.5 ? '유리' : ratio > 1.1 ? '비슷하거나 조금 유리' : ratio > 0.8 ? '불리' : '매우 불리';
    var defOffs = t.owner ? SG.officersIn(target, t.owner).sort(function (a, b) { return (SG.O(b).lead + SG.O(b).war) - (SG.O(a).lead + SG.O(a).war); }) : [];
    var sent = p.reduce(function (s, u) { return s + u.n; }, 0), mm = SG.unitsMix(p), tp = SG.cityTroops(target);
    var share = dP ? Math.round(myP / (myP + dP) * 100) : 100;
    var vcls = !t.owner && t.soldiers <= 0 ? 'good' : ratio > 1.5 ? 'good' : ratio > 1.1 ? 'even' : 'bad';
    function mixLine(m) { return SG.TROOP_KEYS.filter(function (k) { return m[k] > 0; }).map(function (k) { return SG.TROOPS[k].h + ' ' + SG.fmt(m[k]); }).join(' · ') || '없음'; }
    info.appendChild(h('div', { class: 'vs' }, [
      SG.UI.vsSide(cid, c.owner, '우리 군 · ' + SG.cityName(cid), p.map(function (u) { return u.oid; }), '병사 ' + SG.fmt(sent) + ' (' + mixLine(mm) + ') · 군량 ' + SG.fmt(Math.ceil(sent / 100)) + '/' + SG.fmt(c.food), 'me'),
      h('div', { class: 'mid' }, [h('span', { text: '對' })]),
      SG.UI.vsSide(target, t.owner, SG.cityName(target) + ' · ' + (t.owner ? SG.forceName(t.owner) : '공백지'), defOffs, '병사 ' + SG.fmt(t.soldiers) + ' (' + mixLine(tp) + ') · 성벽 ' + t.wall, 'foe')
    ]));
    info.appendChild(h('div', { class: 'verdict-row' }, [
      h('div', { class: 'power' }, [h('i', { class: 'pw-me', style: { width: share + '%' } }, [h('b', { text: '우리 ' + share + '%' })]),
        h('i', { class: 'pw-foe', style: { width: (100 - share) + '%' } }, [100 - share > 12 ? h('b', { text: (100 - share) + '%' }) : null])]),
      h('span', { class: 'verdict ' + vcls, text: verdict })]));
  }
  function render() {
    body.innerHTML = '';
    body.appendChild(h('div', { class: 'step' }, [h('i', { text: '一' }), '공격 목표']));
    body.appendChild(SG.UI.targetCards(targets, target, function (n) { target = n; renderInfo(); },
      function (n) { var t = S.cities[n]; return '병사 ' + SG.fmt(t.soldiers) + ' · 성벽 ' + t.wall; }));
    body.appendChild(h('div', { class: 'step' }, [h('i', { text: '二' }), '출진할 장수', h('small', { text: '최대 ' + SG.MAX_UNITS + '명' })]));
    var tbl = SG.UI.officerCards(ready, { selected: picked,
      stat: function (o) { return { label: '통/무', value: SG.O(o).lead + '/' + SG.O(o).war, hi: SG.O(o).lead + SG.O(o).war >= 170 }; },
      extra: function (o) { var ap = SG.apt(o); return SG.TROOPS[ap].h + ' ' + SG.TROOPS[ap].n + '에 능함'; },
      onPick: function (o, card) {
        var i = picked.indexOf(o);
        if (i >= 0) { picked.splice(i, 1); delete alloc[o]; }
        else if (picked.length < SG.MAX_UNITS) { picked.push(o); autoOne(o); }
        else SG.UI.toast('최대 ' + SG.MAX_UNITS + '명까지입니다', true);
        card.classList.toggle('sel', picked.indexOf(o) >= 0);
        renderForm(); renderInfo();
      } });
    body.appendChild(h('div', { class: 'pick-cards', style: { maxHeight: '180px' } }, [tbl]));
    body.appendChild(h('div', { class: 'step' }, [h('i', { text: '三' }), '부대 편성', h('small', { text: '장수마다 병종과 병사 수를 정합니다 · ★ 잘 다루는 병종(+12%) · 보병>기병>궁병>보병 상성' })]));
    body.appendChild(formEl);
    body.appendChild(info);
    renderForm(); renderInfo();
  }
  render();
  var ok = await SG.UI.modal({ title: '출진 — ' + SG.cityName(cid), body: body, size: 'wide', cancel: false, buttons: [
    { label: '취소', value: false },
    { label: '출진!', value: true, cls: 'primary', check: function () {
      var r = SG.prepareAttack(cid, target, plan());
      if (!r.ok) { SG.UI.toast(r.msg, true); return false; } return true;
    } }] });
  if (!ok) return;
  // 출진 전후를 비교해 도시 장부·가운데 결과 카드·지도에 보인다
  var oc = { kind: 'attack', cid: cid, cities: [cid, target] }, before = SG.UI.snapshot(oc);
  var res = await SG.launchAttack(cid, target, plan());
  if (!res.ok) SG.UI.toast(res.msg, true);
  else SG.UI.showMilitary(oc, before, { success: res.winner === 'atk', msg: res.msg,
    title: res.winner === 'atk' ? SG.cityName(target) + ' 점령!' : SG.cityName(target) + ' 공략 실패' }, target);
  SG.UI.afterAction();
};
