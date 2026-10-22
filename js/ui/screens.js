// 타이틀·시나리오·군주 선택·일람·저장 화면
var SG = SG || {};

SG.UI.HEROES = [['caocao', '난세의 간웅'], ['liubei', '인의의 군주'], ['sunquan', '강동의 주인'], ['zhugeliang', '와룡'], ['guanyu', '미염공'], ['lvbu', '비장']];

SG.UI.title = function () {
  var app = document.getElementById('app');
  app.innerHTML = '';
  SG.buildOfficers();
  var last = SG.slotMeta('auto');
  var cont = null;
  if (last) {
    var sc0 = SG.SCENARIOS.filter(function (x) { return x.id === last.scen; })[0];
    cont = h('button', { class: 'continue', type: 'button', onclick: function () { SG.UI.loadFrom('auto'); } }, [
      last.lid && SG.OFFICERS[last.lid] ? h('img', { class: 'continue-face', alt: '', src: SG.UI.portraitSrc(last.lid, true) }) : h('span', { class: 'continue-face' }),
      h('span', { class: 'continue-t' }, [h('small', { text: '이어하기' }), h('b', { text: last.lord }),
        h('span', { text: last.y + '년 ' + last.m + '월' + (sc0 ? ' · ' + sc0.name : '') + (last.cities ? ' · 도시 ' + last.cities : '') + ' · ' + (SG.DIFFS[last.diff] || SG.DIFFS.easy).n })]),
      SG.UI.icon('next', 22)
    ]);
  }
  function item(icon, label, fn, cls) { return h('button', { class: 'tmenu-i' + (cls ? ' ' + cls : ''), type: 'button', onclick: fn }, [SG.UI.icon(icon, 20), h('span', { text: label })]); }
  var menu = h('div', { class: 'tmenu' }, [
    cont,
    item('flag', '새로 시작', SG.UI.scenarioSelect, last ? '' : 'primary'),
    item('save', '불러오기', function () { SG.UI.saveLoad('load'); }),
    item('scroll', '도움말', SG.UI.help),
    item('people', '소리 설정', SG.UI.soundSettings)
  ]);
  var diffBox = h('div', { class: 't-diff' }, [h('div', { class: 't-diff-h' }, [h('b', { text: '난이도' }), h('small', { text: '새로 시작할 때 적용 · 게임 중에도 메뉴에서 바꿀 수 있음' })]),
    SG.UI.diffPicker(SG.UI.diffPref(), function (k) { SG.UI.setDiffPref(k); })]);
  var gallery = h('div', { class: 'heroes' }, SG.UI.HEROES.map(function (x, i) {
    var o = SG.O(x[0]);
    return h('figure', { class: 'hero', style: { animationDelay: (i * 0.12) + 's' } }, [
      h('img', { alt: o.n, src: SG.UI.portraitSrc(x[0]) }),
      h('figcaption', null, [h('b', { text: o.n }), h('span', { text: x[1] })])
    ]);
  }));
  // 타이틀 그림 두 장 중 하나 (Higgsfield)
  var art = SG.UI.TITLE_ART[Math.floor(Math.random() * SG.UI.TITLE_ART.length)];
  app.appendChild(h('div', { class: 'title2 painted' }, [
    h('div', { class: 't-bg', style: { backgroundImage: 'url(' + art + ')' } }), h('div', { class: 't-fade' }),
    h('div', { class: 't-body' }, [
      h('div', { class: 't-left' }, [
        h('div', { class: 'eyebrow', text: '184 – 280 · 13주 44성 · 장수 ' + SG.OFFICER_LIST.length + '명 · 시나리오 ' + SG.SCENARIOS.length + '개' }),
        h('h1', null, ['천하쟁패', h('span', { class: 'seal', text: '漢' })]),
        h('p', { class: 'lede', text: '한나라가 무너진 난세. 군주 한 명을 골라 장수를 모으고, 땅을 일구고, 이웃 성을 쳐서 천하를 하나로 만드세요.' }),
        menu,
        diffBox,
        h('div', { class: 'title-snd' }, [SG.UI.soundBtn(), h('span', { text: '♪ 배경음악·효과음이 있습니다. 화면을 한 번 누르면 음악이 시작됩니다' })]),
        h('div', { class: 'title-foot', text: '인터넷 없이도 실행됩니다 · 진행 기록은 이 컴퓨터의 브라우저에 저장됩니다' })
      ]),
      gallery
    ])
  ]));
  SG.UI.music('title');
};

SG.UI.TITLE_ART = ['img/scene/title-a.jpg', 'img/scene/title-b.jpg'];

// 난이도: 타이틀에서 고르고(이 브라우저에 기억), 새 게임을 시작할 때 쓴다
SG.UI.diffPref = function () { try { var k = localStorage.getItem('sanguo_diff'); if (SG.DIFFS[k]) return k; } catch (e) { /* 기본값 */ } return 'normal'; };
SG.UI.setDiffPref = function (k) { try { localStorage.setItem('sanguo_diff', k); } catch (e) { /* 무시 */ } };
// 난이도 고르는 줄. cur: 지금 값, onPick(k)
SG.UI.diffPicker = function (cur, onPick) {
  var wrap = h('div', { class: 'diff-pick' }), desc = h('p', { class: 'diff-desc' });
  function draw() {
    wrap.innerHTML = '';
    wrap.appendChild(h('div', { class: 'diff-row', role: 'radiogroup', 'aria-label': '난이도' }, SG.DIFF_KEYS.map(function (k) {
      var D = SG.DIFFS[k];
      return h('button', { type: 'button', class: 'diff-b d-' + k + (k === cur ? ' on' : ''), role: 'radio', 'aria-checked': k === cur ? 'true' : 'false', 'data-diff': k, onclick: function () {
        cur = k; SG.UI.sfx('click'); draw(); if (onPick) onPick(k);
      } }, [h('i', { text: D.h }), h('span', { text: D.n })]);
    })));
    desc.textContent = SG.DIFFS[cur].d;
    wrap.appendChild(desc);
  }
  draw();
  return wrap;
};
// 게임 중에 난이도 바꾸기 (시작 덤은 다시 주지 않음)
SG.UI.changeDiff = async function () {
  var cur = SG.diffKey(), pick = cur;
  var body = h('div', null, [
    h('p', { class: 'note', text: '지금부터 컴퓨터 세력의 수입·전투력·공격 성향이 바뀝니다. 처음에 주는 물자 덤은 다시 주지 않습니다.' }),
    SG.UI.diffPicker(cur, function (k) { pick = k; })
  ]);
  var ok = await SG.UI.modal({ title: '난이도 — 지금 게임의 난이도', icon: 'flag', body: body, cancel: false, buttons: [{ label: '취소', value: false }, { label: '바꾸기', value: true, cls: 'primary' }] });
  if (!ok || pick === cur) return;
  SG.setDifficulty(pick, false);
  SG.UI.setDiffPref(pick);
  SG.log(SG.S.player, '난이도를 「' + SG.DIFFS[pick].n + '」(으)로 바꾸었다.', 'sys');
  SG.UI.toast(SG.josa('난이도를 「' + SG.DIFFS[pick].n + '」(으)로 바꾸었습니다'));
  SG.UI.refresh();
};

// 시나리오 미니 지도: 지형 그림 위에 세력 색 점
SG.UI.miniMap = function (sc) {
  var NSx = 'http://www.w3.org/2000/svg';
  function el(tag, a, p) { var e = document.createElementNS(NSx, tag); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  var root = el('svg', { viewBox: '40 50 980 790', class: 'minimap', preserveAspectRatio: 'xMidYMid meet' });
  [['img/map-terrain.jpg', 'l'], ['img/map-terrain-dark.jpg', 'd']].forEach(function (t) {
    var im = el('image', { x: -280, y: -200, width: 1580, height: 1260, preserveAspectRatio: 'none', class: 'm-terrain ' + t[1] }, root);
    im.setAttribute('href', t[0]);
  });
  var owner = {}, cap = {};
  sc.forces.forEach(function (f) {
    var keys = Object.keys(f.cities);
    keys.forEach(function (c) { owner[c] = SG.COLORS[f.color] || f.color; });
    cap[keys[0]] = true;
  });
  SG.CITY_LIST.forEach(function (c) {
    if (owner[c.id]) el('circle', { cx: c.x, cy: c.y, r: cap[c.id] ? 24 : 17, class: 'mm-city' + (cap[c.id] ? ' cap' : ''), style: 'fill:' + owner[c.id] }, root);
    else el('circle', { cx: c.x, cy: c.y, r: 9, class: 'mm-empty' }, root);
  });
  return root;
};

SG.UI.scenarioSelect = function () {
  var app = document.getElementById('app');
  app.innerHTML = '';
  SG.buildOfficers();
  var grid = h('div', { class: 'scen-grid2' });
  SG.SCENARIOS.slice().sort(function (a, b) { return (a.heroes ? 9999 : a.year) - (b.heroes ? 9999 : b.year); }).forEach(function (sc) {
    var forces = sc.forces.slice().sort(function (a, b) { return Object.keys(b.cities).length - Object.keys(a.cities).length; });
    var nOff = sc.forces.reduce(function (s, f) { return s + Object.keys(f.cities).reduce(function (t, c) { return t + f.cities[c].length; }, 0); }, 0);
    var faces = h('div', { class: 'sc-faces' }, forces.slice(0, 6).map(function (f) {
      var o = SG.O(f.lord);
      return h('span', { class: 'sc-face', title: o.n + ' · 도시 ' + Object.keys(f.cities).length, style: { borderColor: SG.COLORS[f.color] || f.color } }, [h('img', { alt: '', src: SG.UI.portraitSrc(f.lord, true) })]);
    }).concat(forces.length > 6 ? [h('span', { class: 'sc-more', text: '+' + (forces.length - 6) })] : []));
    grid.appendChild(h('button', { class: 'sc-card', type: 'button', onclick: function () { SG.UI.lordSelect(sc.id); } }, [
      h('div', { class: 'sc-map arted', style: { backgroundImage: 'url(img/scenario/' + sc.id + '.jpg)' } }, [h('div', { class: 'sc-mini' }, [SG.UI.miniMap(sc)]), h('span', { class: 'sc-year' + (sc.heroes ? ' hero' : ''), text: sc.heroes ? '假' : String(sc.year) })]),
      h('div', { class: 'sc-info' }, [
        h('div', { class: 'sc-when', text: sc.heroes ? '가상 시나리오' : sc.year + '년 ' + sc.month + '월' }),
        h('h3', { text: sc.name }),
        h('p', { text: sc.desc }),
        faces,
        h('div', { class: 'sc-meta', text: '세력 ' + sc.forces.length + ' · 장수 ' + nOff + '명 배치' })
      ])
    ]));
  });
  app.appendChild(h('div', { class: 'setup setup2' }, [
    h('div', { class: 'setup-head' }, [h('button', { class: 'btn icon-btn', onclick: SG.UI.title }, [SG.UI.icon('next', 16, 'flip'), '처음으로']), h('h2', { text: '시나리오 선택' }),
      h('span', { class: 'note', text: '시대를 고르세요. 카드의 지도는 시작할 때 세력 판도입니다.' })]),
    h('div', { class: 'setup-body' }, [grid])
  ]));
};

SG.UI.difficulty = function (t) {
  var d = t.cities >= 8 ? 1 : t.cities >= 4 ? 2 : t.cities >= 2 ? 3 : t.officers >= 6 ? 4 : 5;
  return { stars: d, label: ['', '쉬움', '보통', '어려움', '매우 어려움', '극악'][d] };
};

SG.UI.lordSelect = function (scId) {
  var sc = SG.SCENARIOS.filter(function (s) { return s.id === scId; })[0];
  SG.newGame(scId, null, Date.now() % 2147483647);
  var app = document.getElementById('app');
  app.innerHTML = '';
  var chosen = null;
  var mapBox = h('div', { class: 'lord-map' });
  var detail = h('div', { class: 'lord-detail' });
  var list = h('div', { class: 'lord-list2' });
  var map;
  function start() {
    if (!chosen) return;
    SG.newGame(scId, SG.S.forces[chosen].lord, Date.now() % 2147483647);
    SG.setDifficulty(SG.UI.diffPref(), true);
    SG.UI.startGame();
  }
  function choose(fid) {
    chosen = fid; map.select(SG.S.forces[fid].capital); render();
  }
  function stars(n) { var s = h('span', { class: 'stars', title: '세력 형편 (별이 많을수록 어려운 출발)' }); for (var i = 1; i <= 5; i++) s.appendChild(h('i', { class: i <= n ? 'on' : '' })); return s; }
  function render() {
    // 선택한 군주 자세히
    detail.innerHTML = '';
    if (!chosen) {
      detail.appendChild(h('div', { class: 'ld-empty' }, [h('b', { text: '군주를 고르세요' }), h('span', { text: '아래 목록이나 지도의 도시를 누르면 그 세력의 군주와 장수들을 볼 수 있습니다.' })]));
    } else {
      var f = SG.S.forces[chosen], lo = SG.O(f.lord), t = SG.forceTotals(chosen), df = SG.UI.difficulty(t);
      var offs = SG.officersOf(chosen).filter(function (o) { return o !== f.lord; })
        .sort(function (a, b) { var A = SG.O(a), B = SG.O(b); return Math.max(B.lead, B.war, B.int, B.pol) - Math.max(A.lead, A.war, A.int, A.pol); });
      detail.appendChild(h('div', { class: 'ld-top' }, [
        h('div', { class: 'ld-face', style: { borderColor: f.color } }, [h('img', { alt: lo.n, src: SG.UI.portraitSrc(f.lord) })]),
        h('div', { class: 'ld-info' }, [
          h('div', { class: 'ld-flag', style: { background: f.color } }, [lo.n + ' 세력']),
          h('div', { class: 'ld-name' }, [lo.n, h('span', { text: lo.h + (lo.za ? ' · ' + lo.za : '') })]),
          h('div', { class: 'ld-stats' }, [['통솔', lo.lead], ['무력', lo.war], ['지력', lo.int], ['정치', lo.pol], ['매력', lo.cha]].map(function (x) {
            return h('span', null, [h('small', { text: x[0] }), h('b', { class: SG.UI.statClass(x[1]), text: x[1] })]);
          })),
          h('div', { class: 'ld-tot' }, [h('span', { text: '본거지 ' + SG.cityName(f.capital) }), h('span', { text: '도시 ' + t.cities }), h('span', { text: '장수 ' + t.officers }), h('span', { text: '병사 ' + SG.fmt(t.soldiers) })]),
          h('div', { class: 'ld-diff' }, ['세력 형편 ', stars(df.stars), h('b', { text: df.label }), h('span', { class: 'ld-gdiff', title: '타이틀 화면에서 바꿀 수 있습니다', text: '게임 난이도 ' + SG.DIFFS[SG.UI.diffPref()].h + ' ' + SG.DIFFS[SG.UI.diffPref()].n })])
        ])
      ]));
      if (offs.length) detail.appendChild(h('div', { class: 'ld-offs' }, offs.slice(0, 9).map(function (o) {
        return h('span', { class: 'ld-off', title: SG.name(o) }, [h('img', { alt: '', src: SG.UI.portraitSrc(o, true) }), h('small', { text: SG.name(o) })]);
      }).concat(offs.length > 9 ? [h('span', { class: 'ld-more', text: '외 ' + (offs.length - 9) + '명' })] : [])));
      detail.appendChild(h('button', { class: 'btn primary big ld-start', id: 'start-lord', onclick: start }, [lo.n + '(으)로 천하를 노린다', SG.UI.icon('next', 20)]));
    }
    // 목록
    list.innerHTML = '';
    Object.keys(SG.S.forces).sort(function (a, b) { return SG.citiesOf(b).length - SG.citiesOf(a).length || SG.officersOf(b).length - SG.officersOf(a).length; }).forEach(function (fid) {
      var t = SG.forceTotals(fid), f = SG.S.forces[fid], lo = SG.O(f.lord), df = SG.UI.difficulty(t);
      list.appendChild(h('button', { class: 'lord-item2' + (chosen === fid ? ' on' : ''), type: 'button', 'data-lord': lo.n, onclick: function () { choose(fid); } }, [
        h('span', { class: 'li-face', style: { borderColor: f.color } }, [h('img', { alt: '', src: SG.UI.portraitSrc(f.lord, true) })]),
        h('span', { class: 'li-meta' }, [h('b', { text: lo.n }), h('span', { text: SG.cityName(f.capital) + ' · 도시 ' + t.cities + ' · 장수 ' + t.officers })]),
        stars(df.stars)
      ]));
    });
  }
  app.appendChild(h('div', { class: 'setup setup2' }, [
    h('div', { class: 'setup-head' }, [
      h('button', { class: 'btn icon-btn', onclick: SG.UI.scenarioSelect }, [SG.UI.icon('next', 16, 'flip'), '시나리오']),
      h('h2', { text: (sc.heroes ? '가상 · ' : sc.year + '년 · ') + sc.name }),
      h('span', { class: 'note', text: '군주 선택' })
    ]),
    h('div', { class: 'lord-wrap2' }, [mapBox, h('div', { class: 'lord-side' }, [
      // 시나리오 그림 (Higgsfield, img/scenario/<id>.jpg)
      h('div', { class: 'ld-art', style: { backgroundImage: 'url(img/scenario/' + sc.id + '.jpg)' } }, [
        h('div', { class: 'ld-art-cap' }, [h('b', { text: sc.name }), h('span', { text: sc.heroes ? '가상 시나리오' : sc.year + '년 ' + sc.month + '월' })])
      ]),
      detail, list])])
  ]));
  map = new SG.UI.Map(mapBox, { onClick: function (cid) { var o = SG.S.cities[cid].owner; if (o) choose(o); } });
  render();
};

// 내 장수 전체 / 모든 장수
SG.UI.officerList = function () {
  var S = SG.S, tab = 'mine', q = '';
  var body = h('div');
  function render() {
    body.innerHTML = '';
    body.appendChild(h('div', { class: 'tabs' }, [
      h('button', { class: 'btn small' + (tab === 'mine' ? ' on' : ''), text: '우리 장수', onclick: function () { tab = 'mine'; render(); } }),
      h('button', { class: 'btn small' + (tab === 'all' ? ' on' : ''), text: '모든 장수', onclick: function () { tab = 'all'; render(); } }),
      h('button', { class: 'btn small' + (tab === 'free' ? ' on' : ''), text: '찾아낸 재야', onclick: function () { tab = 'free'; render(); } }),
      h('input', { class: 'inp', placeholder: '이름 검색', value: q, style: { marginLeft: 'auto', width: '160px' }, oninput: function (e) { q = e.target.value; var p = e.target.selectionStart; render(); var i = body.querySelector('input.inp'); i.focus(); i.setSelectionRange(p, p); } })
    ]));
    var list = Object.keys(S.off).filter(function (o) {
      var x = S.off[o];
      if (q && SG.O(o).n.indexOf(q) < 0) return false;
      if (tab === 'mine') return x.s === 'force' && x.f === S.player;
      if (tab === 'free') return x.s === 'free' && x.found;
      return x.s === 'force' || (x.s === 'free' && x.found);
    });
    var cols = [
      { label: '소속', get: function (o) { return S.off[o].s === 'force' ? SG.forceName(S.off[o].f) : '재야'; } },
      { label: '위치', get: function (o) { return SG.cityName(S.off[o].c); } },
      { label: '나이', cls: 'n', get: function (o) { return SG.age(o); } },
      { label: '충성', cls: 'n', get: function (o) { return S.off[o].s === 'force' ? S.off[o].loy : '-'; } }
    ];
    if (tab === 'mine') cols.push({ label: '', sort: false, render: function (o) { return S.off[o].acted ? h('span', { class: 'tag done', text: '완료' }) : ''; } });
    body.appendChild(h('p', { class: 'note', text: list.length + '명 · 줄을 누르면 자세히 봅니다 · 머리글을 누르면 정렬됩니다' }));
    body.appendChild(h('div', { class: 'pick-list', style: { maxHeight: '58vh' } }, [SG.UI.officerTable(list, { cols: cols, sortBy: 'lead', onPick: function (o) { SG.UI.officerCard(o); } })]));
  }
  render();
  return SG.UI.modal({ title: '장수 일람', icon: 'officer', body: body, size: 'wide', cancel: true, buttons: [{ label: '닫기', value: true }] });
};

SG.UI.forceList = function () {
  var S = SG.S;
  var rows = SG.aliveForces().map(function (fid) { return { fid: fid, t: SG.forceTotals(fid) }; })
    .sort(function (a, b) { return b.t.cities - a.t.cities || b.t.soldiers - a.t.soldiers; });
  var tb = h('tbody');
  var maxC = Math.max.apply(null, rows.map(function (r) { return r.t.cities; }).concat([1]));
  var maxS = Math.max.apply(null, rows.map(function (r) { return r.t.soldiers; }).concat([1]));
  rows.forEach(function (r) {
    var f = S.forces[r.fid], rel = S.player && r.fid !== S.player ? SG.rel(S.player, r.fid) : null;
    tb.appendChild(h('tr', { class: r.fid === S.player ? 'on' : '' }, [
      h('td', null, [h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '8px' } }, [SG.UI.seal(r.fid, 28), SG.forceName(r.fid) + (r.fid === S.player ? ' (나)' : '')])]),
      h('td', { text: SG.cityName(f.capital) }),
      h('td', { class: 'n' }, [h('span', { class: 'fr' }, [h('i', { style: { width: Math.round(r.t.cities / maxC * 100) + '%', background: f.color } })]), String(r.t.cities)]),
      h('td', { class: 'n', text: r.t.officers }),
      h('td', { class: 'n' }, [h('span', { class: 'fr' }, [h('i', { style: { width: Math.round(r.t.soldiers / maxS * 100) + '%', background: f.color } })]), SG.fmt(r.t.soldiers)]),
      h('td', { class: 'n', text: SG.fmt(r.t.gold) }),
      h('td', { class: 'n', text: SG.fmt(r.t.food) }),
      h('td', { class: 'n', text: rel ? rel.fr : '-' }),
      h('td', null, rel && rel.ally > 0 ? [h('span', { class: 'tag ally', text: '동맹 ' + rel.ally + '개월' }), h('button', { class: 'btn small', style: { marginLeft: '8px' }, text: '동맹 파기', onclick: async function () {
        if (await SG.UI.confirm('동맹 파기', SG.forceName(r.fid) + ' 세력과의 동맹을 깰까요?\n상대 우호도가 크게 떨어지고, 다른 세력들의 신용도 조금 잃습니다.', '깬다', '그만둔다')) {
          SG.breakAlly(S.player, r.fid); SG.UI.refresh(); SG.UI.toast('동맹을 깼습니다');
        }
      } })] : [])
    ]));
  });
  var tbl = h('table', { class: 't' }, [h('thead', null, [h('tr', null, ['군주', '본거지', '도시', '장수', '병사', '금', '식량', '우호도', '관계'].map(function (x, i) {
    return h('th', { class: i >= 2 && i <= 7 ? 'n' : '', text: x });
  }))]), tb]);
  // 천하 판도: 도시 수 비율 띠
  var total = SG.CITY_LIST.length, empty = total - rows.reduce(function (s, r) { return s + r.t.cities; }, 0);
  var strip = h('div', { class: 'realm' }, rows.map(function (r) {
    var f = S.forces[r.fid];
    return h('i', { title: SG.forceName(r.fid) + ' ' + r.t.cities + '개', class: r.fid === S.player ? 'me' : '', style: { flex: String(r.t.cities), background: f.color } }, [r.t.cities / total > 0.06 ? SG.forceName(r.fid) : '']);
  }).concat(empty > 0 ? [h('i', { class: 'void', style: { flex: String(empty) }, title: '공백지 ' + empty + '개' })] : []));
  var body = h('div', null, [
    h('div', { class: 'step' }, [h('i', { text: '勢' }), '천하 판도', h('small', { text: '도시 ' + total + '개 중 · 군웅 ' + rows.length })]),
    strip,
    h('div', { class: 'pick-list', style: { maxHeight: '52vh', marginTop: '12px' } }, [tbl])
  ]);
  return SG.UI.modal({ title: '세력 일람', icon: 'flag', body: body, size: 'wide', cancel: true, buttons: [{ label: '닫기', value: true }] });
};

// 저장·불러오기
SG.UI.saveLoad = async function (mode) {
  var slots = ['1', '2', '3', '4', '5'];
  var body = h('div');
  var closeFn;
  function render() {
    body.innerHTML = '';
    body.appendChild(h('p', { class: 'note', style: { marginTop: 0 }, text: '게임은 명령을 내릴 때마다, 턴이 끝날 때마다, 창을 닫을 때 자동으로 저장됩니다 (타이틀의 「이어하기」). 기록 1~5는 따로 남겨 두는 저장입니다.' }));
    if (mode === 'load') {
      body.appendChild(slotRow('auto', '자동 저장 (마지막으로 한 것)', SG.slotMeta('auto')));
      var pm = SG.slotMeta('prev');
      if (pm) body.appendChild(slotRow('prev', '자동 저장 (지난달 끝)', pm));
    }
    slots.forEach(function (s) { body.appendChild(slotRow(s, '기록 ' + s, SG.slotMeta(s))); });
    body.appendChild(h('div', { style: { display: 'flex', gap: '8px', marginTop: '14px' } }, [
      mode === 'save' ? h('button', { class: 'btn', text: '파일로 내보내기', onclick: SG.UI.exportFile }) : null,
      mode === 'load' ? h('button', { class: 'btn', text: '파일에서 불러오기', onclick: function () { SG.UI.importFile(function () { closeFn(true); }); } }) : null,
      h('span', { class: 'note', style: { alignSelf: 'center' }, text: mode === 'save' ? '파일로 내보내면 다른 컴퓨터로 옮기거나 따로 보관할 수 있습니다.' : '' })
    ]));
  }
  function slotRow(s, label, m) {
    return h('div', { class: 'lord-item', onclick: function () {
      if (mode === 'save') {
        try { SG.saveSlot(s); SG.UI.toast(label + '에 저장했습니다'); render(); } catch (e) { SG.UI.toast('저장 실패: ' + e.message, true); }
      } else if (m) { closeFn(false); SG.UI.loadFrom(s); }
    } }, [
      h('div', { class: 'meta' }, [h('b', { text: label }), h('div', { text: m ? m.lord + ' · ' + m.y + '년 ' + m.m + '월 · ' + new Date(m.t).toLocaleString('ko-KR') : '비어 있음' })]),
      h('span', { class: 'note', text: mode === 'save' ? '여기에 저장' : (m ? '불러오기' : '') })
    ]);
  }
  render();
  await SG.UI.modal({ title: mode === 'save' ? '저장하기' : '불러오기', body: body, size: 'narrow', cancel: false,
    buttons: [{ label: '닫기', value: false }], onOpen: function (b, close) { closeFn = close; } });
};
SG.UI.loadFrom = function (slot) {
  try { SG.loadSlot(slot); SG.UI.startGame(true); SG.UI.toast('불러왔습니다: ' + SG.S.year + '년 ' + SG.S.month + '월'); }
  catch (e) { SG.UI.toast('불러오기 실패: ' + e.message, true); }
};
SG.UI.exportFile = function () {
  var blob = new Blob([SG.serialize()], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '삼국지_' + SG.forceName(SG.S.player) + '_' + SG.S.year + '년' + SG.S.month + '월.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
};
SG.UI.importFile = function (after) {
  var inp = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
  inp.addEventListener('change', function () {
    var f = inp.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try { SG.deserialize(rd.result); if (after) after(); SG.UI.startGame(true); SG.UI.toast('파일에서 불러왔습니다'); }
      catch (e) { SG.UI.toast('불러오기 실패: ' + e.message, true); }
    };
    rd.readAsText(f);
  });
  document.body.appendChild(inp); inp.click(); inp.remove();
};

SG.UI.help = function () {
  var body = h('div', { html:
    '<p><b>목표</b>: 중국의 모든 도시를 차지해 천하를 통일하세요.</p>' +
    '<p><b>한 달의 흐름</b>: 내 도시를 눌러 장수에게 명령 → <b>턴 종료</b> → 다른 군주들이 움직임 → 다음 달.<br>장수 한 명은 한 달에 명령 하나를 할 수 있습니다. <b>같은 명령은 도시마다 한 달에 한 번</b>만 할 수 있습니다 (이동·포상은 제외, 한 번 한 명령 단추에는 「完」이 찍힙니다).</p>' +
    '<p><b>난이도</b>: 타이틀 화면에서 고릅니다 (쉬움·보통·어려움·지옥). 어려울수록 컴퓨터 세력의 수입·시작 물자·병력·전투력이 늘고, 더 과감하게 우리를 노리며, 적 장수 등용이 어려워지고 우리 장수 충성이 조금씩 떨어집니다. 게임 중에도 메뉴 「난이도」에서 바꿀 수 있습니다 (시작 물자 덤은 다시 주지 않음).</p>' +
    '<p><b>협력</b>: 명령 창의 「협력 장수」에서 최대 3명을 고르면, 맡은 장수에게 능력의 일부(높은 순서로 25%·15%·10%)를 보태 효과가 커집니다. 보탠 능력은 100을 넘으면 절반만 치고 120에서 멈춥니다. 협력한 장수도 이번 달 명령을 씁니다. 개발·민심 안정·계략은 협력 1명마다 비용이 25% 늘어납니다. 컴퓨터 세력도 같은 규칙을 따릅니다.</p>' +
    '<p><b>포상</b>: 내릴 금을 정할 수 있고(많이 줄수록 충성이 더 오름), 우리 장수가 가진 보물을 함께 내릴 수도 있습니다.</p>' +
    '<p><b>돈과 식량</b>: 금은 매달 상업에서, 식량은 7월 가을걷이에 농업에서 들어옵니다. 병사는 매달 100명당 식량 1을 먹습니다. 식량이 떨어지면 병사가 달아납니다.</p>' +
    '<p><b>능력치</b>: 통솔(군대 지휘·훈련) · 무력(싸움·일기토) · 지력(계략·탐색) · 정치(개발) · 매력(징병·등용·민심)</p>' +
    '<p><b>전쟁</b>: 「출진」으로 이웃 도시를 공격합니다. 성벽이 높은 도시는 지키는 쪽이 유리하므로 1.5배 이상의 병력으로 가는 것이 좋습니다. 이긴 쪽은 상대 장수를 사로잡을 수 있습니다.</p>' +
    '<p><b>보급</b>: 출진할 때 「四 군량·군자금」에서 식량과 금을 챙겨 갑니다. 군량은 하루에 병사 1,000명당 1씩 먹고 10일치 이상 있어야 출진할 수 있습니다. 군량이 떨어지거나, 직접 지휘 전장 왼쪽의 <b>보급대(粮)</b> 칸에 적이 들어오면 공격군이 집니다 (적 기병이 지키는 부대 없는 보급대를 노리니 한 부대는 곁에 두세요). 남은 군량·금은 이기면 차지한 도시로, 지면 집으로 돌아오고, 보급대를 빼앗기면 적의 것이 됩니다.</p>' +
    '<p><b>부장</b>: 출진 창 「三 부대 편성」에서 부대마다 남는 장수 한 명을 부장으로 붙일 수 있습니다(「부장 자동」 단추). 부장은 통솔·무력·지력의 ' + Math.round(SG.DEP_RATE * 100) + '%를 주장에게 보태고(100까지, 거느릴 병사 한도도 늘어남), 주장이 일기토에서 잡히거나 죽으면 대신 부대를 이끕니다. 부대가 무너지면 부장도 잡힐 수 있습니다. 컴퓨터 세력도 출진 때 부장을 씁니다. <b>수비</b> 때도 수비 배치 창에서 병사를 0명으로 둔(성 안에 머무는) 장수를 다른 부대의 부장으로 붙일 수 있습니다.</p>' +
    '<p><b>성안 식량</b>: 싸우는 동안 수비군도 하루에 병사 1,000명당 식량 1씩 성안 식량을 먹습니다. 식량이 떨어지면 날마다 병사가 달아나고 사기가 꺾이며, 굶은 채 며칠을 버티지 못하고 항복합니다(직접 지휘는 닷새, 자동 계산은 엿새). 출진 창의 적 도시 정보에 식량이 나옵니다.</p>' +
    '<p><b>매수</b>: 직접 지휘 중 「매수」로 3칸 안의 적 장수에게 금을 건네 편을 바꾸게 합니다. 충성이 낮을수록, 매력이 높을수록 잘 넘어오고, 군주와 그 가족은 넘어오지 않습니다. 넘어온 장수는 싸움이 끝나면 우리 세력에 들어옵니다. 실패하면 금 절반을 잃습니다. 수비할 때는 도시 금으로 매수합니다. 자동 전투에서도 싸우기 전에 한 번 시도합니다.</p>' +
    '<p><b>직접 지휘</b>: 전투가 벌어지면 「직접 지휘」를 골라 육각형 전장에서 부대를 움직일 수 있습니다. 공격군은 성 가운데 「本」 칸을 차지하면 이기고, 수비군은 30일을 버티면 이깁니다. 성벽은 막혀 있고 「門」으로만 들어갈 수 있습니다. 화계·혼란은 지력, 일기토는 무력이 중요합니다.</p>' +
    '<p><b>공격 형태</b>: 「공격」을 누르면 형태를 고릅니다 — 攻 보통 공격 · 突 돌격(피해 크지만 반격도 셈, 궁병 불가) · 連 연속 공격(무력 80 이상, 두 번 침) · 射 일제 사격(궁병, 옆 적까지 맞힘, 반격 없음) · 挾 협공(목표 옆에 아군이 있을 때, 아군 수만큼 강해짐). 병종 전법(금빛): <b>破 돌파</b>(기병, 적을 꿰뚫고 뒤 칸으로 빠져나감, 적이 혼란에 빠질 수 있음) · <b>推 밀어내기</b>(보병, 적을 한 칸 밀고 그 자리로 들어감, 막혀 있으면 짓눌러 피해 큼) · <b>火 불화살</b>(궁병, 불이 붙으면 더 타고 하루 혼란, 숲에서 잘 붙음). 본성(本) 칸으로는 돌파·밀어내기로 뛰어들 수 없고, 성안 수비군은 좀처럼 밀리지 않으며 본성을 지키는 부대는 아예 밀리지 않습니다.</p>' +
    '<p><b>병종</b>: 보병(步)·기병(騎)·궁병(弓). <b>보병은 기병에, 기병은 궁병에, 궁병은 보병에 강합니다</b>(피해 1.3배, 반대는 0.8배). 기병은 빠르고(이동 +2) 움직인 뒤 치면 더 세지만 숲·산과 성 공격에 약하고, 궁병은 두 칸 떨어져 쏘며 성 위에서 강합니다. 「징병」에서 병종을 고르고(기병이 가장 비쌈), 「출진」의 부대 편성에서 장수마다 병종과 병사 수를 정합니다. 장수마다 잘 다루는 병종(★)이 있어 맡기면 힘이 12% 오릅니다.</p>' +
    '<p><b>거느릴 수 있는 병사</b>: 장수 한 명은 <b>통솔 × ' + SG.UNIT_PER_LEAD + '</b>명까지 거느립니다(통솔 80이면 ' + SG.fmt(80 * SG.UNIT_PER_LEAD) + '명). 출진·수비 모두 같고, 수비 때 장수에게 맡기지 못한 병사는 장수 없는 「수비병」(통솔·무력 50 정도)으로 싸웁니다. 우리 도시가 공격받으면 <b>수비 배치</b> 창에서 장수마다 병종과 병사 수를 정합니다(0명이면 싸우지 않고 성 안에 머묾).</p>' +
    '<p><b>계략</b>: 「유언비어」는 이웃 적 도시의 민심·사기를, 「이간」은 적 장수의 충성을 떨어뜨립니다. 「선동」은 민란을 일으켜 병사·금을 줄이고(민심이 낮은 도시일수록 잘 됨), 「방화」는 창고에 불을 질러 식량·상업을 태웁니다. 「내응」은 이웃 적 장수와 몰래 약속해 6개월 안에 그 도시를 치면 싸움이 시작될 때 우리 편으로 돌아서게 하고, 「매복」은 우리 도시 둘레에 복병을 숨겨 3개월 안에 쳐들어오는 적을 기습합니다. 지력이 중요합니다.</p>' +
    '<p><b>외교</b>: 「친선」으로 금을 보내 우호도를 올리고, 「동맹」을 맺으면 24개월 동안 서로 공격하지 않습니다. 아주 약한 세력에게는 「항복 권고」를 할 수 있습니다. 「교역」은 시장에서 식량을 사고팝니다. 동맹은 「세력 일람」에서 깰 수 있습니다.</p>' +
    '<p><b>사건</b>: 연환계·삼고초려 같은 역사 사건이 조건이 맞으면 일어납니다. 천재지변(메뚜기 떼·홍수·가뭄·역병·지진)과 풍년도 있고, 민심이 25 아래면 반란이 날 수 있습니다. 우리 도시에 일어나면 태수가 와서 아뢰는 장면과 함께 피해가 가운데에 크게 보입니다.</p>' +
    '<p><b>인재</b>: 「인재 탐색」으로 재야 인물을 찾아 「등용」하세요. 충성이 낮은 다른 세력 장수도 데려올 수 있습니다.</p>' +
    '<p><b>태수</b>: 인사 명령 「태수 임명」(또는 도시 화면 위쪽 태수 이름 옆 단추)으로 그 도시를 맡길 장수를 고릅니다. 군주가 머무는 도시도 태수를 둘 수 있고, 임명하지 않으면 군주가 다스립니다. 태수의 정치가 높을수록 금 수입·가을걷이가 늘고(정치 60 기준 ±), 매력이 80 이상이면 민심이 달마다 1씩 오릅니다. 임명하지 않으면 통솔+정치가 가장 높은 장수가 맡습니다.</p>' +
    '<p><b>보물·명마</b>: 적토마·청강검·손자병법·전국옥새 같은 보물 15개가 있습니다. 가진 장수는 능력치가 오르고(최대 100), 명마는 직접 지휘 전투에서 더 멀리 움직입니다. 주인 없는 보물은 어느 도시에 숨겨져 있어, 그 도시에서 「인재 탐색」을 하면 찾을 수 있고 다른 도시에 숨은 보물의 소문을 듣기도 합니다. 장수 정보에서 다른 장수에게 내리면 충성이 오릅니다. 장수가 죽으면 보물은 그 도시에 떨어지고, 포로로 잡으면 잡은 쪽 군주가 거둡니다. 메뉴 「보물 일람」에서 행방을 볼 수 있습니다.</p>' +
    '<p><b>이동과 수송</b>: 「인사 → 이동」은 장수가 병사·금·식량을 가지고 우리 도시로 옮겨 가 그곳에 머뭅니다 (가는 동안은 어느 도시에도 없음). 「군사 → 수송」은 장수 한 명이 금·식량을 실어 보내고 돌아옵니다 (장수는 그대로, 이번 달 명령만 씀). 우리 땅으로 이어진 곳이면 멀리도 갈 수 있고, <b>도시 하나 건널 때마다 한 달</b> 걸립니다 (붙은 도시는 다음 달, 두 도시 건너면 2달 뒤 도착). 그 사이 받을 도시를 잃으면 보낸 도시로 되돌아옵니다.</p>' +
    '<p><b>위임</b>: 도시 명령 칸의 「위임」을 켜면 턴 종료 때 태수가 그 도시의 남은 장수에게 명령합니다 — 개발·징병·훈련·등용, 그리고 병력 조정(전방 도시면 장수가 이웃 후방 도시에 가서 남는 병사를 이끌고 돌아오고, 후방 도시면 장수가 남는 병사를 이끌고 이웃 전방 도시로 옮겨 감). 한 일은 「위임 보고」로 보여 줍니다. 위임하지 않은 도시의 장수는 움직이지 않습니다.</p>' +
    '<p><b>저장</b>: 매달 자동 저장되며, 위쪽 「저장」으로 따로 저장하거나 파일로 내보낼 수 있습니다.</p>' +
    '<p><b>단축키</b> (지도 화면에서)</p><div class="keys">' +
    [['Enter / E', '턴 종료'], ['Tab / N', '명령할 장수가 남은 다음 도시'], ['1 ~ 5', '명령 탭 (내정·군사·인사·계략·외교)'], ['방향키 / W A S D', '지도 움직이기'],
     ['+ / −', '지도 확대·축소'], ['0 / F', '지도 전체 보기'], ['H / ?', '도움말'], ['Esc', '창 닫기']]
      .map(function (k) { return '<span><kbd>' + k[0] + '</kbd>' + k[1] + '</span>'; }).join('') + '</div>' +
    '<p class="note">위쪽 「남은 명령」을 눌러도 명령할 장수가 남은 도시로 바로 갑니다.</p>' });
  return SG.UI.modal({ title: '도움말', icon: 'scroll', body: body, size: 'wide', cancel: true });
};
