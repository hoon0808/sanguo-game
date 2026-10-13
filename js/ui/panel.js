// 오른쪽 도시 장부: 도시 배너(실제 지형) → 태수 → 수치 → 명령 → 장수 초상 카드
var SG = SG || {};

// 도시 주변 지형을 배너 배경으로 (지도 그림을 잘라 쓴다)
SG.UI.MAP_IMG = { x0: -280, y0: -200, w: 1580, h: 1260 };
SG.UI.cityBanner = function (cid, bw, bh, zoom) {
  var C = SG.CITIES[cid], M = SG.UI.MAP_IMG;
  zoom = zoom || 2.4; bw = bw || 400; bh = bh || 150;
  var sizeW = M.w * zoom, sizeH = M.h * zoom;
  var px = (C.x - M.x0) * zoom - bw / 2, py = (C.y - M.y0) * zoom - bh / 2;
  return { size: sizeW + 'px ' + sizeH + 'px', pos: (-px) + 'px ' + (-py) + 'px' };
};

// 태수: 군주가 있으면 군주, 아니면 통솔+정치가 가장 높은 장수
SG.UI.governor = function (cid) { return SG.governor(cid); };
// 태수 임명 창
SG.UI.appointGov = async function (cid) {
  var S = SG.S, c = S.cities[cid], offs = SG.officersIn(cid, c.owner), pick = null, cur = SG.governor(cid);
  var body = h('div', null, [
    h('p', { class: 'note', text: '태수의 정치가 높을수록 금 수입·가을걷이가 늘고(정치 60 기준, 100 이면 +10%, 20 이면 −10%), 매력이 80 이상이면 민심이 달마다 1씩 오릅니다. 위임하면 태수가 이 도시를 맡아 다스립니다. 새로 임명된 장수는 충성 +5. 명령 횟수는 쓰지 않습니다.' }),
    h('div', { class: 'pick-list' }, [SG.UI.officerTable(offs, {
      sortBy: { get: function (o) { return SG.O(o).pol * 2 + SG.O(o).cha; } },
      cols: [{ label: '수입', cls: 'n', get: function (o) { var r = Math.round((SG.O(o).pol - 60) / 4); return (r >= 0 ? '+' : '') + r + '%'; } },
        { label: '민심', cls: 'n', get: function (o) { return SG.O(o).cha >= 80 ? '+1' : '·'; } },
        { label: '지금', cls: 'n', get: function (o) { return o === cur ? '태수' : ''; } }],
      onPick: function (o) { pick = o; var b = document.querySelector('#modal-root .back:last-child .modal-f .btn'); if (b) b.click(); }
    })])
  ]);
  await SG.UI.modal({ title: '태수 임명 — ' + SG.cityName(cid) + '을(를) 누구에게 맡길까요?', icon: 'officer', body: body, cancel: true, buttons: [{ label: '닫기', value: true }] });
  if (!pick || pick === cur) return;
  var r = SG.appoint(cid, pick);
  SG.UI.toast(r.msg, !r.ok);
  if (r.ok) SG.UI.sfx('recruit');
  SG.UI.refresh();
};

SG.UI.mood = function (v) {
  return v >= 75 ? ['평온', 'good'] : v >= 50 ? ['보통', ''] : v >= 30 ? ['불안', 'warn'] : ['위험', 'bad'];
};

SG.UI.renderPanel = function (el, cid) {
  el.innerHTML = '';
  var S = SG.S;
  if (!cid) {
    el.appendChild(h('div', { class: 'panel-empty', html:
      '<b style="font-size:16px">지도에서 도시를 누르세요.</b><br><br>' +
      '· <b>우리 도시</b>를 누르면 명령을 내릴 수 있습니다.<br>' +
      '· 장수 한 명은 한 달에 명령 하나를 할 수 있습니다.<br>' +
      '· 명령을 다 내렸으면 위쪽 <b>턴 종료</b>를 누르세요.' }));
    return;
  }
  var c = S.cities[cid], C = SG.CITIES[cid], z = SG.CITY_SIZE[C.size];
  var mine = !!S.player && c.owner === S.player;
  var f = c.owner ? S.forces[c.owner] : null;

  // ---- 배너
  var bn = SG.UI.cityBanner(cid);
  var banner = h('div', { class: 'cb', style: { backgroundSize: bn.size, backgroundPosition: bn.pos } }, [
    h('div', { class: 'cb-shade' }),
    h('div', { class: 'cb-text' }, [
      h('div', { class: 'cb-prov', text: C.prov + ' · ' + C.h + ' · ' + ['', '작은 성', '보통 성', '큰 성'][C.size] }),
      h('h2', { class: 'cb-name', text: C.n }),
      h('div', { class: 'cb-owner' }, [
        f ? h('span', { class: 'chip', style: { background: f.color, color: '#fff' }, text: SG.forceName(c.owner) + ' 세력' }) : h('span', { class: 'chip', text: '공백지' }),
        f && f.capital === cid ? h('span', { class: 'chip gold' }, [SG.UI.icon('star', 12), '본거지']) : null,
        f && !mine && S.player && SG.isAlly(S.player, c.owner) ? h('span', { class: 'chip ally', text: '동맹' }) : null
      ])
    ]),
    f ? h('div', { class: 'cb-flag', style: { background: f.color } }, [SG.O(f.lord).h ? SG.O(f.lord).h.charAt(0) : SG.forceName(c.owner).charAt(0)]) : null
  ]);
  el.appendChild(banner);
  banner.appendChild(h('button', { class: 'drawer-x', type: 'button', title: '닫기', text: '✕', onclick: function (e) { e.stopPropagation(); SG.UI.setDrawer(false); } }));

  // ---- 태수 + 상태
  var gov = SG.UI.governor(cid), md = SG.UI.mood(c.loyal), th = c.owner ? SG.threat(cid) : null;
  var canAppoint = mine && gov && gov !== f.lord && SG.officersIn(cid, c.owner).length > 1;
  var gr = gov ? Math.round((SG.govRate(cid) - 1) * 100) : 0;
  var govRow = h('div', { class: 'gov' }, [
    gov ? SG.UI.portrait(gov, 64) : h('span', { class: 'pt gov-empty', style: { width: '64px', height: '64px', background: '#66706b', fontSize: '28px' } }, ['空']),
    h('div', { class: 'gov-info' }, [
      h('div', { class: 'gov-role', text: gov ? (f && f.lord === gov ? '군주' : '태수') : '태수 없음' }),
      h('div', { class: 'gov-name' }, [gov ? SG.name(gov) : '—', canAppoint ? h('button', { class: 'btn small gov-btn', type: 'button', text: '태수 임명', onclick: function (e) { e.stopPropagation(); SG.UI.appointGov(cid); } }) : null]),
      h('div', { class: 'gov-chips' }, [
        h('span', { class: 'chip ' + md[1], text: '민심 ' + md[0] }),
        mine && SG.convoysTo && (SG.convoysTo(cid).length || SG.marchesTo(cid).length) ? (function () {
          var g = 0, fd = 0, n = 0, offs = [];
          SG.convoysTo(cid).concat(SG.marchesTo(cid)).forEach(function (v) { g += v.gold || 0; fd += v.food || 0; n += v.n || 0; offs = offs.concat(v.oids || []); });
          return h('span', { class: 'chip convoy', title: '이동·수송 중입니다. 턴 종료 뒤(다음 달) 도착합니다' + (offs.length ? ' — ' + offs.map(SG.name).join(', ') : ''),
            text: '오는 중 ' + [offs.length ? '장수 ' + offs.length + '명' : '', n ? '병사 ' + SG.fmt(n) : '', g ? '금 ' + SG.fmt(g) : '', fd ? '식량 ' + SG.fmt(fd) : ''].filter(Boolean).join('·') });
        })() : null,
        gov ? h('span', { class: 'chip ' + (gr > 0 ? 'good' : gr < 0 ? 'warn' : ''), title: '태수의 정치에 따라 금 수입·가을걷이가 달라집니다', text: '다스림 ' + (gr >= 0 ? '+' : '') + gr + '%' + (SG.O(gov).cha >= 80 ? ' · 민심↑' : '') }) : null,
        th && th.front ? h('span', { class: 'chip ' + (th.max > c.soldiers ? 'bad' : 'warn'), text: th.max > c.soldiers ? '적이 더 많음' : '적과 맞닿음' }) : (c.owner ? h('span', { class: 'chip good', text: '후방' }) : null)
      ])
    ])
  ]);
  if (gov) govRow.firstChild.addEventListener('click', function () { SG.UI.officerCard(gov); });
  el.appendChild(govRow);

  // ---- 수치 (이번 달 명령으로 바뀐 양은 +/− 표시, 방금 바뀐 칸은 빛나며 숫자·막대가 움직인다)
  // 이번 달 변화: 우리 도시는 명령 결과, 남의 도시는 우리가 한 일(유언비어·공격 등)
  var D = S.player && SG.UI.deltas ? SG.UI.deltas() : null, dc = D && D.c[cid] || {}, dl = D && D.last[cid] || {};
  // 가운데 결과 카드가 떠 있는 동안은 움직임을 아껴 두었다가, 카드가 닫힐 때(다시 그릴 때) 보여 준다
  if (document.querySelector('.res-float')) dl = {};
  else if (D) delete D.last[cid];
  function badge(f) {
    var n = dc[f];
    return n ? h('span', { class: 'dl ' + ((n > 0) !== !mine ? 'up' : 'down'), text: (n > 0 ? '+' : '−') + SG.fmt(Math.abs(n)) }) : null;
  }
  function countUp(elm, a, b, fmt) {
    var t0 = null;
    elm.textContent = fmt(a);
    requestAnimationFrame(function step(ts) {
      if (!t0) t0 = ts + 150;
      var p = SG.clamp((ts - t0) / 700, 0, 1);
      elm.textContent = fmt(Math.round(a + (b - a) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    });
  }
  function tile(f, icon, label, v, sub) {
    var val = h('div', { class: 'tile-v' }, [h('span', { text: SG.fmt(v) }), badge(f)]);
    if (dl[f]) countUp(val.firstChild, dl[f][0], dl[f][1], SG.fmt);
    return h('div', { class: 'tile' + (dl[f] ? ' just' : '') + (dc[f] ? ' changed' : '') }, [SG.UI.icon(icon, 18), h('div', null, [h('div', { class: 'tile-k', text: label }), val, sub ? h('div', { class: 'tile-s', text: sub }) : null])]);
  }
  el.appendChild(h('div', { class: 'tiles' }, [
    tile('gold', 'gold', '금', c.gold, mine ? '+' + SG.income(cid) + ' / 월' : null),
    tile('food', 'food', '식량', c.food, mine ? '−' + Math.ceil(c.soldiers / 100) + ' / 월' : null),
    tile('soldiers', 'soldier', '병사', c.soldiers, null),
    tile('pop', 'people', '인구', c.pop, null)
  ]));
  // 병종 구성: 보병·기병·궁병 띠
  var tp = SG.cityTroops(cid), ttot = Math.max(1, c.soldiers);
  if (c.soldiers > 0) el.appendChild(h('div', { class: 'troops' }, [
    h('div', { class: 'tr-bar' }, SG.TROOP_KEYS.map(function (t) { return h('i', { class: 't-' + t, style: { width: (tp[t] / ttot * 100) + '%' }, title: SG.TROOPS[t].n + ' ' + SG.fmt(tp[t]) }); })),
    h('div', { class: 'tr-chips' }, SG.TROOP_KEYS.map(function (t) {
      var just = dl[t];
      return h('span', { class: 'tr-c t-' + t + (just ? ' just' : ''), title: SG.TROOPS[t].desc }, [h('i', { text: SG.TROOPS[t].h }), SG.TROOPS[t].n + ' ', h('b', { text: SG.fmt(tp[t]) }), badge(t)]);
    }))
  ]));
  function meter(f, icon, label, v, max, cls) {
    var bar = SG.UI.bar(v, max, cls), num = h('span', { text: v + (max !== 100 ? '/' + max : '') });
    if (dl[f]) {
      var fill = bar.firstChild, from = dl[f][0];
      fill.style.width = SG.clamp(from / max * 100, 0, 100) + '%';
      bar.appendChild(h('b', { class: 'bar-gain' + (v < from ? ' loss' : ''), style: { left: SG.clamp(Math.min(from, v) / max * 100, 0, 100) + '%', width: SG.clamp(Math.abs(v - from) / max * 100, 0, 100) + '%' } }));
      requestAnimationFrame(function () { requestAnimationFrame(function () { fill.style.width = SG.clamp(v / max * 100, 0, 100) + '%'; }); });
      countUp(num, from, v, function (x) { return x + (max !== 100 ? '/' + max : ''); });
    }
    return h('div', { class: 'meter' + (dl[f] ? ' just' : '') + (dc[f] ? ' changed' : '') }, [SG.UI.icon(icon, 15), h('span', { class: 'meter-k', text: label }), bar, h('span', { class: 'meter-v' }, [num, badge(f)])]);
  }
  el.appendChild(h('div', { class: 'meters' }, [
    meter('agri', 'agri', '농업', c.agri, z.agriMax, 'g'), meter('comm', 'comm', '상업', c.comm, z.commMax, ''),
    meter('wall', 'wall', '성벽', c.wall, z.wallMax, 'b'), meter('loyal', 'relief', '민심', c.loyal, 100, 'r'),
    meter('train', 'train', '훈련', c.train, 100, 'b'), meter('morale', 'flag', '사기', c.morale, 100, 'r')
  ]));
  // 이번 달 내정 요약 띠
  var sum = Object.keys(dc).filter(function (f) { return dc[f]; });
  var dp = D && D.p && D.p[cid] || {}, dout = D && D.out && D.out[cid] || [], dpl = D && D.plast && D.plast[cid] || {};
  if (document.querySelector('.res-float')) dpl = {}; else if (D && D.plast) delete D.plast[cid];
  var staff = [];
  Object.keys(dp).forEach(function (oid) {
    var x = dp[oid];
    if (x.joined) staff.push(h('span', { class: 'ms-c up' }, ['등용 ', h('b', { text: SG.name(oid) })]));
    if (x.found && !x.joined) staff.push(h('span', { class: 'ms-c up' }, ['발견 ', h('b', { text: SG.name(oid) })]));
    if (x.arrived) staff.push(h('span', { class: 'ms-c up' }, ['도착 ', h('b', { text: SG.name(oid) })]));
    if (x.loy) staff.push(h('span', { class: 'ms-c ' + (x.loy > 0 ? 'up' : 'down') }, [SG.name(oid) + ' 충성 ', h('b', { text: (x.loy > 0 ? '+' : '−') + Math.abs(x.loy) })]));
  });
  var arr = mine && S.arrived && S.arrived[cid];
  if (arr) staff.push(h('span', { class: 'ms-c up' }, ['도착 ', h('b', { text: [(arr.offs || []).length ? arr.offs.map(SG.name).join(', ') : '', arr.soldiers ? '병사 +' + SG.fmt(arr.soldiers) : '', arr.gold ? '금 +' + SG.fmt(arr.gold) : '', arr.food ? '식량 +' + SG.fmt(arr.food) : ''].filter(Boolean).join(' · ') })]));
  dout.forEach(function (m) { staff.push(h('span', { class: 'ms-c' }, [SG.name(m[0]) + ' → ', h('b', { text: SG.cityName(m[1]) })])); });
  (D && D.acts && D.acts[cid] || []).forEach(function (a) { staff.push(h('span', { class: 'ms-c act ' + (a.good ? 'up' : 'down') }, [h('b', { text: a.text })])); });
  // 남의 도시: 줄어든 것이 우리에게 좋은 일 → 색을 뒤집는다
  var foe = !mine;
  if (sum.length || staff.length) el.appendChild(h('div', { class: 'month-sum' + (foe ? ' foe' : '') }, [h('span', { class: 'ms-h', text: S.month + (foe ? '월 우리가 준 피해' : '월 변화') })].concat(sum.map(function (f) {
    var lab = SG.UI.CITY_FIELDS.filter(function (x) { return x[0] === f; })[0][1], n = dc[f];
    return h('span', { class: 'ms-c ' + ((n > 0) !== foe ? 'up' : 'down') }, [lab + ' ', h('b', { text: (n > 0 ? '+' : '−') + SG.fmt(Math.abs(n)) })]);
  })).concat(staff)));
  // 장수 카드에 붙일 표시
  function staffMark(oid) {
    if (arr && (arr.offs || []).indexOf(oid) >= 0 && !dp[oid]) return { tag: ['着', '도착'], just: false, up: true };
    var x = dp[oid];
    if (!x) return null;
    var tag = x.joined ? ['新', '합류'] : x.found ? ['見', '발견'] : x.arrived ? ['着', SG.cityName(x.arrived) + '에서'] : x.loy ? [mine ? (x.loy > 0 ? '賞' : '−') : '間', '충성 ' + (x.loy > 0 ? '+' : '−') + Math.abs(x.loy)] : null;
    return tag ? { tag: tag, just: !!dpl[oid], up: mine ? (!x.loy || x.loy > 0) : x.loy < 0 } : null;
  }

  if (mine) el.appendChild(SG.UI.commandBox(cid));

  // ---- 장수 초상 카드
  if (c.owner) {
    var offs = SG.officersIn(cid, c.owner).sort(function (a, b) {
      var A = SG.O(a), B = SG.O(b);
      if (f.lord === a) return -1; if (f.lord === b) return 1;
      return (B.lead + B.war + B.int) - (A.lead + A.war + A.int);
    });
    var sec = h('div', { class: 'sec' }, [h('h4', null, ['장수 ' + offs.length + '명', mine ? h('span', { class: 'note', text: '남은 명령 ' + SG.readyOfficers(cid).length }) : null])]);
    if (offs.length) sec.appendChild(SG.UI.officerCards(offs, { showDone: mine, mark: staffMark, onPick: function (o) { SG.UI.officerCard(o); } }));
    else sec.appendChild(h('div', { class: 'note', text: '장수가 없습니다.' }));
    el.appendChild(sec);
  }
  var fr = SG.freeIn(cid, true);
  if (fr.length && (mine || !S.player)) {
    var sec2 = h('div', { class: 'sec' }, [h('h4', { text: '재야 인재 ' + fr.length + '명 · 등용 가능' })]);
    sec2.appendChild(SG.UI.officerCards(fr, { mark: mine ? staffMark : null, onPick: function (o) { SG.UI.officerCard(o); } }));
    el.appendChild(sec2);
  }
};

// 장수 초상 카드 묶음. opt: {showDone, onPick, onHover(oid), stat(oid)→{label, value, hi}, extra(oid)→text, selected:[], dim(oid), big}
SG.UI.officerCards = function (oids, opt) {
  opt = opt || {};
  var wrap = h('div', { class: 'ocards' + (opt.big ? ' big' : '') });
  oids.forEach(function (oid) {
    var so = SG.S.off[oid], o = SG.O(oid);
    var done = opt.showDone && so.acted;
    var dim = opt.dim && opt.dim(oid);
    var sel = opt.selected && opt.selected.indexOf(oid) >= 0;
    var isLord = so.s === 'force' && SG.S.forces[so.f] && SG.S.forces[so.f].lord === oid;
    var st = opt.stat ? opt.stat(oid) : null;
    var mk = opt.mark ? opt.mark(oid) : null;
    var card = h('button', { class: 'ocard' + (done ? ' done' : '') + (dim ? ' dim' : '') + (sel ? ' sel' : '') + (mk ? ' marked' + (mk.just ? ' just' : '') : ''), type: 'button', disabled: dim || null, title: o.n + ' — 통' + o.lead + ' 무' + o.war + ' 지' + o.int + ' 정' + o.pol + ' 매' + o.cha }, [
      h('div', { class: 'oc-face' }, [SG.UI.portrait(oid, opt.big ? 84 : 58), done ? h('span', { class: 'oc-stamp', text: '完' }) : null, isLord ? h('span', { class: 'oc-lord', text: '君' }) : null]),
      mk ? h('span', { class: 'oc-mark' + (mk.up ? '' : ' down'), text: mk.tag[0] }) : null,
      o.items ? h('span', { class: 'oc-item', title: o.items.map(SG.itemName).join(', ') }, [SG.UI.itemImg(o.items[0], 22), o.items.length > 1 ? h('b', { text: o.items.length }) : null]) : null,
      h('div', { class: 'oc-name', text: o.n }),
      mk ? h('div', { class: 'oc-markt' + (mk.up ? '' : ' down'), text: mk.tag[1] }) : null,
      st ? h('div', { class: 'oc-stat' + (st.hi ? ' hi' : '') }, [h('span', { text: st.label }), h('b', { text: st.value })])
        : h('div', { class: 'oc-mini', text: '통' + o.lead + ' 무' + o.war + ' 지' + o.int }),
      opt.extra ? h('div', { class: 'oc-extra', text: opt.extra(oid) }) : (o.sk ? h('div', { class: 'oc-sk', text: o.sk }) : null)
    ]);
    if (!dim && opt.onPick) card.addEventListener('click', function () { opt.onPick(oid, card); });
    if (!dim && opt.onHover) { card.addEventListener('mouseenter', function () { opt.onHover(oid); }); card.addEventListener('focus', function () { opt.onHover(oid); }); }
    wrap.appendChild(card);
  });
  return wrap;
};

// 능력치 오각형 그림 (통·무·지·정·매)
SG.UI.radar = function (vals, size, color) {
  var NS = 'http://www.w3.org/2000/svg', r = size / 2 - 22, c = size / 2;
  function pt(i, k) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [c + Math.cos(a) * r * k, c + Math.sin(a) * r * k]; }
  function poly(k) { return [0, 1, 2, 3, 4].map(function (i) { return pt(i, typeof k === 'number' ? k : k[i]).join(','); }).join(' '); }
  var html = '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" class="radar" aria-hidden="true">';
  [1, 0.75, 0.5, 0.25].forEach(function (k) { html += '<polygon points="' + poly(k) + '" class="rd-grid"/>'; });
  [0, 1, 2, 3, 4].forEach(function (i) { var p = pt(i, 1); html += '<line x1="' + c + '" y1="' + c + '" x2="' + p[0] + '" y2="' + p[1] + '" class="rd-axis"/>'; });
  html += '<polygon points="' + poly(vals.map(function (v) { return Math.max(0.04, v / 100); })) + '" class="rd-val" style="fill:' + color + ';stroke:' + color + '"/>';
  SG.STAT_NAMES.forEach(function (n, i) {
    var p = pt(i, 1.2);
    html += '<text x="' + p[0] + '" y="' + (p[1] + 4) + '" text-anchor="middle" class="rd-lbl">' + n.charAt(0) + '<tspan class="rd-n" dx="3">' + vals[i] + '</tspan></text>';
  });
  return h('div', { class: 'radar-wrap', html: html + '</svg>' });
};

// 장수 상세
SG.UI.officerCard = function (oid) {
  var o = SG.O(oid), so = SG.S.off[oid];
  var status = { force: SG.forceName(so.f) + ' 세력 · ' + SG.cityName(so.c), free: '재야 · ' + SG.cityName(so.c), dead: '사망', unborn: '아직 등장하지 않음', captive: '포로' }[so.s];
  var F = so.s === 'force' && SG.S.forces[so.f] ? SG.S.forces[so.f] : null, col = F ? F.color : '#7a6a4a';
  var vals = [o.lead, o.war, o.int, o.pol, o.cha];
  var icons = ['flag', 'attack', 'scroll', 'comm', 'people'];
  var rows = SG.STAT_NAMES.map(function (n, i) {
    var v = vals[i];
    var bn = o.bonus && o.bonus[SG.STAT_KEYS[i]];
    return h('div', { class: 'meter big' }, [SG.UI.icon(icons[i], 16), h('span', { class: 'meter-k', text: n }), SG.UI.bar(v, 100, ['b', 'r', 'g', '', 'r'][i]), h('span', { class: 'meter-v ' + SG.UI.statClass(v) }, [String(v), bn ? h('small', { class: 'it-plus', title: '보물 덕분', text: '+' + bn }) : null])]);
  });
  var best = vals.indexOf(Math.max.apply(null, vals));
  var role = o.war >= 85 && o.war >= o.int ? '맹장' : o.int >= 85 ? '책사' : o.lead >= 80 ? '장수' : o.pol >= 75 ? '문관' : o.war >= 70 ? '무관' : '관리';
  var isLord = F && F.lord === oid;
  var body = h('div', { class: 'ocard-detail' }, [
    h('div', { class: 'ocard-head' }, [
      h('div', { class: 'oc-big' }, [SG.UI.portrait(oid, 168), isLord ? h('span', { class: 'oc-lord big', text: '君' }) : null]),
      h('div', { class: 'oc-info' }, [
        h('div', { class: 'ocard-name' }, [o.n, h('span', { text: o.h + (o.za ? ' · 자 ' + o.za : '') })]),
        h('div', { class: 'oc-chips' }, [
          h('span', { class: 'chip-b first', text: isLord ? '군주' : role }),
          h('span', { class: 'chip-b', text: status }),
          h('span', { class: 'chip-b', text: SG.age(oid) + '세 (' + SG.born(oid) + '년생)' }),
          so.s === 'force' && !isLord ? h('span', { class: 'chip-b', text: '충성 ' + so.loy }) : null,
          o.home && SG.CITIES[o.home] ? h('span', { class: 'chip-b', text: '고향 ' + SG.cityName(o.home) }) : null
        ]),
        h('div', { class: 'oc-best', text: '가장 뛰어난 능력: ' + SG.STAT_NAMES[best] + ' ' + vals[best] }),
        o.sk ? h('div', { class: 'ocard-sk' }, [h('span', { class: 'tag sk', text: o.sk }), h('span', { class: 'note', text: SG.SKILLS[o.sk] })]) : null,
        o.fa ? h('div', { class: 'note', text: '아버지: ' + SG.name(o.fa) }) : null
      ])
    ]),
    h('div', { class: 'oc-stats' }, [SG.UI.radar(vals, 210, col), h('div', { class: 'meters' }, rows)]),
    SG.UI.officerItems ? SG.UI.officerItems(oid, function () { var b = document.querySelector('#modal-root .back:last-child .modal-f .btn'); if (b) b.click(); }) : null
  ]);
  return SG.UI.modal({ title: '장수 정보 — ' + o.n, icon: 'officer', body: body, cancel: true });
};
