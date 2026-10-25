// 게임 화면 조립과 진행
var SG = SG || {};

SG.UI.state = { sel: null, map: null, busy: false };

SG.UI.startGame = function (loaded) {
  var S = SG.S, app = document.getElementById('app');
  app.innerHTML = '';
  SG.UI.state.sel = S.player && S.forces[S.player] ? S.forces[S.player].capital : null;
  var top = h('div', { class: 'topbar', id: 'topbar' });
  var mapWrap = h('div', { class: 'map-wrap' });
  var log = h('div', { class: 'log', id: 'log' });
  var panel = h('div', { class: 'panel', id: 'panel' });
  app.appendChild(h('div', { class: 'game' }, [top, h('div', { class: 'main' }, [h('div', { class: 'left' }, [mapWrap, log]), panel])]));
  SG.UI.state.map = new SG.UI.Map(mapWrap, {
    onClick: function (cid) { SG.UI.state.sel = cid; SG.UI.state.drawer = true; SG.UI.refresh(); },
    onBlank: function () { if (SG.UI.state.drawer) SG.UI.setDrawer(false); }
  });
  SG.UI.state.drawer = false;
  SG.onLog = SG.UI.appendLog;
  SG.UI.music('map');
  SG.UI.renderLog();
  SG.UI.refresh();
  if (!loaded) {
    var sc = SG.SCENARIOS.filter(function (s) { return s.id === S.scen; })[0];
    var intro = SG.UI.modal({ title: sc.year + '년 ' + sc.name, size: 'narrow', cancel: true, body: h('div', null, [
      h('p', { text: sc.desc }),
      h('p', null, ['당신은 ', h('b', { class: 'hi', text: SG.forceName(S.player) }), '입니다. 본거지는 ', h('b', { text: SG.cityName(S.forces[S.player].capital) }), '.']),
      h('p', { class: 'note', text: '도시를 눌러 장수에게 명령을 내리고, 다 했으면 오른쪽 위 「턴 종료」를 누르세요. 처음이라면 「도움말」을 먼저 보세요.' })
    ]) });
    intro.then(function () { if (SG.UI.briefOn()) SG.UI.briefing(); });
  }
};

SG.UI.refresh = function () {
  var S = SG.S;
  if (!document.getElementById('topbar')) return;
  SG.UI.renderTop();
  SG.UI.state.map.select(SG.UI.state.sel);
  SG.UI.renderPanel(document.getElementById('panel'), SG.UI.state.sel);
  SG.UI.setDrawer(SG.UI.state.drawer);
  SG.UI.renderAdvisor();
  SG.UI.autoSave();
};

// ---- 자동 저장: 명령·임명 등으로 화면이 새로 그려질 때마다 잠시 뒤 저장한다 (턴 진행·전투 중에는 하지 않음).
// 예전에는 턴 종료 때만 저장해서, 달 중간에 창을 닫으면 그달에 한 명령이 사라졌다.
SG.UI.autoSave = function (now) {
  clearTimeout(SG.UI._asT);
  function run() {
    if (!SG.S || !SG.S.player || SG.S.over || SG.UI.state.busy || SG.battling || !document.getElementById('topbar')) return;
    try { SG.saveSlot('auto'); SG.UI._asFail = false; } catch (e) { SG.UI.saveFailed(e); }
  }
  if (now) run(); else SG.UI._asT = setTimeout(run, 500);
};
SG.UI.saveFailed = function (e) {
  if (SG.UI._asFail) return;
  SG.UI._asFail = true;
  SG.UI.toast('자동 저장을 하지 못했습니다' + (e && e.name === 'QuotaExceededError' ? ' (저장 공간이 가득 참)' : ' (이 브라우저는 저장 공간을 쓸 수 없음)') + ' — 메뉴 → 저장 → 「파일로 내보내기」로 보관하세요', true);
};
// 창을 닫거나 다른 앱으로 넘어갈 때도 바로 저장
window.addEventListener('pagehide', function () { SG.UI.autoSave(true); });
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') SG.UI.autoSave(true); });

// ---- 군사의 조언: 매달 상황을 살펴 한마디씩
SG.UI.advice = function () {
  var S = SG.S, fid = S.player, out = [];
  if (!fid || !S.forces[fid] || !S.forces[fid].alive) return out;
  var cities = SG.citiesOf(fid);
  cities.forEach(function (cid) {
    var c = S.cities[cid], need = Math.ceil(c.soldiers / 100);
    var monthsToHarvest = (SG.HARVEST_MONTH - S.month + 12) % 12 || 12;
    if (need > 0 && c.food < need * Math.min(monthsToHarvest, 4)) out.push({ city: cid, w: 9, t: SG.cityName(cid) + '의 식량이 ' + Math.floor(c.food / need) + '개월 치밖에 없습니다. 가을걷이 전에 바닥날 수 있으니 식량을 옮기거나 병사를 줄이십시오.' });
    var th = SG.threat(cid);
    if (th.front && th.max > c.soldiers * 1.3) out.push({ city: cid, w: 8, t: SG.cityName(cid) + ' 가까이에 우리보다 많은 적군(' + SG.fmt(th.max) + ')이 있습니다. 징병·훈련·성벽 보수로 대비하십시오.' });
    if (c.loyal < 35) out.push({ city: cid, w: 7, t: SG.cityName(cid) + '의 민심이 ' + c.loyal + '까지 떨어졌습니다. 반란이 날 수 있으니 「민심 안정」을 하십시오.' });
    var fr = SG.freeIn(cid, true);
    if (fr.length) out.push({ city: cid, w: 6, t: SG.cityName(cid) + '에 재야 인재 ' + fr.map(SG.name).join(', ') + '이(가) 있습니다. 「등용」해 보십시오.' });
    SG.officersIn(cid, fid).forEach(function (o) { if (S.off[o].loy < 50 && S.forces[fid].lord !== o) out.push({ city: cid, w: 5, t: SG.name(o) + '의 충성이 ' + S.off[o].loy + '입니다. 다른 세력에 넘어가기 전에 「포상」을 내리십시오.' }); });
    SG.ADJ[cid].forEach(function (n) {
      var t = S.cities[n];
      if (!t.owner || t.owner === fid || SG.isAlly(fid, t.owner)) return;
      var rdy = SG.readyOfficers(cid).sort(function (a, b) { return SG.O(b).lead - SG.O(a).lead; });
      if (c.soldiers > 6000 && rdy.length && SG.unitPower(rdy[0], c.soldiers * 0.7, c.train, c.morale) > SG.AI.cityDefense(n) * 1.6) out.push({ city: cid, w: 4, t: SG.cityName(n) + '(' + SG.forceName(t.owner) + ')의 수비가 약합니다. ' + SG.cityName(cid) + '에서 출진할 때입니다.' });
    });
    if (c.gold > 2500) out.push({ city: cid, w: 2, t: SG.cityName(cid) + '에 금이 ' + SG.fmt(c.gold) + ' 쌓여 있습니다. 개발이나 징병에 쓰십시오.' });
  });
  var idle = cities.filter(function (c) { return !S.cities[c].deleg; }).reduce(function (s, c) { return s + SG.readyOfficers(c).length; }, 0);
  if (idle) out.push({ city: null, w: 1, t: '아직 명령을 받지 않은 장수가 ' + idle + '명 있습니다.' });
  // 군사의 지력이 높을수록 더 깊이 살핀다
  var adv = SG.advisorOf(fid), ai = adv ? SG.O(adv).int : 50;
  if (ai >= 85) {
    // 적 장수의 약점: 우리와 맞닿은 적 도시에서 충성이 낮은 장수 (등용·매수 기회)
    var seen = {};
    cities.forEach(function (cid) {
      SG.ADJ[cid].forEach(function (n) {
        var t = S.cities[n]; if (!t.owner || t.owner === fid || seen[n]) return; seen[n] = true;
        SG.officersIn(n, t.owner).forEach(function (o) {
          if (S.off[o].loy < 55 && S.forces[t.owner].lord !== o) out.push({ city: n, w: 3, t: SG.cityName(n) + '의 ' + SG.name(o) + '(' + SG.forceName(t.owner) + ')은(는) 충성이 ' + S.off[o].loy + '뿐입니다. 등용하거나 싸움터에서 금으로 매수할 수 있겠습니다.' });
        });
      });
    });
    // 숨은 보물 소문: 우리 땅과 이웃에
    if (SG.hiddenItems) cities.concat(Object.keys(seen)).forEach(function (cid) {
      var hid = SG.hiddenItems(cid);
      if (hid.length) out.push({ city: cid, w: 3, t: SG.cityName(cid) + ' 어딘가에 ' + SG.ITEM_KIND[SG.ITEMS[hid[0]].k] + '이(가) 숨어 있다는 소문이 있습니다. 그곳에서 「인재 탐색」을 해 보십시오.' });
    });
  }
  if (ai >= 90) {
    // 침공 낌새: 이웃 적 도시의 병력이 우리 도시보다 크게 많으면
    cities.forEach(function (cid) {
      var c = S.cities[cid];
      SG.ADJ[cid].forEach(function (n) {
        var t = S.cities[n];
        if (t.owner && t.owner !== fid && !SG.isAlly(fid, t.owner) && t.soldiers > c.soldiers * 1.5 && SG.officersIn(n, t.owner).length >= 2)
          out.push({ city: cid, w: 8, t: SG.forceName(t.owner) + ' 세력이 ' + SG.cityName(n) + '에 병사 ' + SG.fmt(t.soldiers) + '을(를) 모으고 있습니다. ' + SG.cityName(cid) + '을(를) 노리는 듯하니 대비하십시오.' });
      });
    });
  }
  out.sort(function (a, b) { return b.w - a.w; });
  // 지력이 낮은 군사는 큰일 몇 가지만 아뢴다
  return out.slice(0, ai >= 90 ? 10 : ai >= 80 ? 7 : ai >= 65 ? 5 : 3);
};
// 군사의 말은 이제 달마다 「군사 보고」 장면으로 보여 준다 (js/ui/visit.js SG.UI.briefing). 예전 고정 상자는 지운다.
SG.UI.renderAdvisor = function () {
  var box = document.getElementById('advisor');
  if (box) box.remove();
};

SG.UI.renderTop = function () {
  var S = SG.S, top = document.getElementById('topbar');
  top.innerHTML = '';
  var t = S.player ? SG.forceTotals(S.player) : null;
  var season = S.month <= 3 ? '春' : S.month <= 6 ? '夏' : S.month <= 9 ? '秋' : '冬';
  top.appendChild(h('div', { class: 'date' }, [h('span', { class: 'season', text: season }), h('span', { class: 'date-t' }, [h('b', { text: S.year + '년' }), ' ' + S.month + '월'])]));
  if (t) {
    var lord = S.forces[S.player].lord;
    var who = h('button', { class: 'who', type: 'button', title: '군주 정보', onclick: function () { SG.UI.officerCard(lord); } }, [SG.UI.portrait(lord, 38), h('span', null, [h('small', { text: '군주' }), SG.forceName(S.player)])]);
    top.appendChild(who);
    // 위임한 도시는 턴 종료 때 태수가 알아서 하므로 세지 않는다
    var ready = SG.citiesOf(S.player).reduce(function (s, c) { return s + (S.cities[c].deleg ? 0 : SG.readyOfficers(c).length); }, 0);
    function res(icon, label, v, cls) { return h('span', { class: 'res r-' + icon + ' ' + (cls || ''), title: label }, [SG.UI.icon(icon, 16), h('b', { text: v }), h('small', { text: label })]); }
    top.appendChild(h('div', { class: 'tot' }, [
      res('city', '도시', t.cities), res('officer', '장수', t.officers), res('soldier', '병사', SG.fmt(t.soldiers)),
      res('gold', '금', SG.fmt(t.gold)), res('food', '식량', SG.fmt(t.food))
    ]));
    var rb = res('order', SG.UI.isCompact() ? '명령' : '남은 명령', ready, ready ? 'hot go' : '');
    if (ready) { rb.title = '명령할 장수가 있는 다음 도시로 (Tab)'; rb.addEventListener('click', SG.UI.nextReadyCity); }
    top.lastChild.appendChild(rb);
  }
  top.appendChild(h('div', { class: 'sp' }));
  var menuItems = (SG.UI.isCompact() ? [
    ['장수 일람', SG.UI.officerList], ['세력 일람', SG.UI.forceList], ['보물 일람', SG.UI.itemList], ['저장', function () { SG.UI.saveLoad('save'); }], ['기록 보기', SG.UI.showLog]
  ].concat(SG.UI.canFullscreen() ? [['전체 화면 켜기/끄기', SG.UI.toggleFullscreen]] : []) : []).concat([
    ['불러오기', function () { SG.UI.saveLoad('load'); }]
  ]).concat(SG.UI.isCompact() ? [] : [['보물 일람', SG.UI.itemList]]).concat([
    ['내 본거지 보기', function () { SG.UI.state.sel = S.forces[S.player].capital; SG.UI.refresh(); }],
    ['지도 전체 보기', function () { SG.UI.state.map.fit(); }],
    [SG.UI.themeLabel(), function () { SG.UI.cycleTheme(); }],
    ['소리 설정', SG.UI.soundSettings],
    ['군사 임명', function () { SG.UI.appointStrategist(); }],
    ['난이도: ' + SG.DIFFS[SG.diffKey()].n + ' (바꾸기)', SG.UI.changeDiff],
    [SG.UI.scenesOn() ? '명령 장면: 보기 (끄기)' : '명령 장면: 꺼짐 (켜기)', function () { SG.UI.setScenes(!SG.UI.scenesOn()); SG.UI.toast(SG.UI.scenesOn() ? '명령마다 장면을 봅니다' : '명령 장면을 끕니다. 결과는 가운데에 잠깐 보입니다'); SG.UI.refresh(); }],
    [SG.UI.briefOn() ? '군사 보고: 매달 보기 (끄기)' : '군사 보고: 꺼짐 (켜기)', function () { SG.UI.setBrief(!SG.UI.briefOn()); SG.UI.toast(SG.UI.briefOn() ? '달마다 군사 보고를 봅니다' : '군사 보고를 끕니다. 위쪽 「군사」로 언제든 볼 수 있습니다'); SG.UI.refresh(); }],
    ['도움말', SG.UI.help],
    ['타이틀로', async function () {
      if (await SG.UI.confirm('타이틀로', '타이틀 화면으로 돌아갈까요?\n매달 자동 저장되므로 「이어하기」로 돌아올 수 있습니다.')) SG.UI.title();
    }]
  ]);
  var dd = h('div', { class: 'dd', hidden: true }, menuItems.map(function (m) {
    return h('button', { class: 'dd-item', text: m[0], onclick: function () { dd.hidden = true; m[1](); } });
  }));
  var acts = h('div', { class: 'acts' }, [
    h('button', { class: 'btn small icon-btn pc-only', onclick: SG.UI.officerList }, [SG.UI.icon('officer', 16), '장수 일람']),
    h('button', { class: 'btn small icon-btn pc-only', onclick: SG.UI.forceList }, [SG.UI.icon('flag', 16), '세력 일람']),
    h('button', { class: 'btn small icon-btn pc-only', onclick: function () { SG.UI.saveLoad('save'); } }, [SG.UI.icon('save', 16), '저장']),
    S.player && S.forces[S.player].alive ? h('button', { class: 'btn small icon-btn adv-btn', type: 'button', title: '군사 보고 다시 보기', onclick: function () { SG.UI.briefing(true); } }, [SG.UI.icon('scroll', 16), '군사']) : null,
    SG.UI.soundBtn(true),
    h('div', { class: 'dd-wrap' }, [h('button', { class: 'btn small icon-btn', id: 'menu-btn', onclick: function (e) { e.stopPropagation(); dd.hidden = !dd.hidden; } }, [SG.UI.icon('menu', 16), '메뉴']), dd]),
    h('button', { class: 'btn primary end-turn', id: 'end-turn', title: '다음 달로 (Enter)', onclick: SG.UI.endTurn }, ['턴 종료', SG.UI.icon('next', 18)])
  ]);
  if (!SG.UI._ddBound) {
    SG.UI._ddBound = true;
    document.addEventListener('click', function () { var d = document.querySelector('.topbar .dd'); if (d) d.hidden = true; });
  }
  top.appendChild(acts);
};

// ---- 기록
SG.UI.logLine = function (e) {
  return h('div', { class: 'e ' + e.k }, [h('span', { class: 'd', text: e.y + '.' + e.m }), e.t]);
};
SG.UI.renderLog = function () {
  var el = document.getElementById('log');
  el.innerHTML = '';
  SG.S.log.slice(-120).forEach(function (e) { el.appendChild(SG.UI.logLine(e)); });
  el.scrollTop = el.scrollHeight;
};
SG.UI.appendLog = function (e) {
  var el = document.getElementById('log');
  if (!el) return;
  el.appendChild(SG.UI.logLine(e));
  while (el.childNodes.length > 150) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
};

// ---- 턴 종료
SG.UI.endTurn = async function () {
  if (SG.UI.state.busy || SG.S.over) return;
  var S = SG.S;
  var left = SG.citiesOf(S.player).filter(function (c) { return !S.cities[c].deleg; }).reduce(function (s, c) { return s + SG.readyOfficers(c).length; }, 0);
  if (left > 0 && !SG.UI.skipConfirm) {
    var r = await SG.UI.modal({ title: '턴 종료', size: 'narrow', cancel: 'no', body: h('div', null, [
      h('p', { text: '아직 명령하지 않은 장수가 ' + left + '명 있습니다. 이대로 다음 달로 넘어갈까요?' }),
      h('label', { class: 'note' }, [h('input', { type: 'checkbox', id: 'skipc' }), ' 다시 묻지 않기'])
    ]), buttons: [{ label: '돌아가기', value: 'no' }, { label: '넘어가기', value: function () { return document.getElementById('skipc').checked ? 'skip' : 'yes'; }, cls: 'primary' }] });
    if (r === 'no') return;
    if (r === 'skip') SG.UI.skipConfirm = true;
  }
  SG.UI.state.busy = true;
  document.getElementById('end-turn').disabled = true;
  var before = SG.citiesOf(S.player).length;
  try {
    SG.onAIForce = async function (fid) {
      SG.UI.busy(SG.forceName(fid) + ' 세력이 움직이는 중…');
      await SG.UI.sleep(15);
    };
    await SG.endTurn();
    SG.UI.sfx(S.month === SG.HARVEST_MONTH ? 'harvest' : 'turn');
    SG.UI.busy(null);
    if (!S.over) {
      try { SG.rotateAuto(); SG.saveSlot('auto'); } catch (e) { SG.UI.saveFailed(e); }
      SG.log(S.player, S.year + '년 ' + S.month + '월', 'turn');
    }
  } catch (e) {
    console.error(e);
    SG.UI.busy(null);
    SG.UI.alert('오류', '진행 중 문제가 생겼습니다: ' + e.message);
  }
  SG.UI.state.busy = false;
  if (S.player && S.forces[S.player].alive && SG.S.cities[SG.UI.state.sel] === undefined) SG.UI.state.sel = S.forces[S.player].capital;
  SG.UI.refresh();
  if (!S.over && S.forces[S.player].alive) SG.UI.monthBanner(SG.citiesOf(S.player).length - before);
  SG.UI.afterAction();
  if (!S.over && S.forces[S.player].alive && SG.UI.briefOn()) { await SG.UI.sleep(1100); if (!document.querySelector('#modal-root .back')) await SG.UI.briefing(); }
};

// 달이 바뀔 때 지도 위로 지나가는 큰 글씨 (계절 한자 + 날짜 + 이달의 한마디)
SG.UI.monthBanner = function (cityDiff) {
  var S = SG.S, wrap = document.querySelector('.map-wrap');
  if (!wrap) return;
  var old = wrap.querySelector('.month-banner');
  if (old) old.remove();
  var season = '春夏秋冬'.charAt(Math.floor((S.month - 1) / 3));
  var notes = [];
  if (S.month === SG.HARVEST_MONTH) notes.push('가을걷이 — 각 도시에 식량이 들어왔습니다');
  if (cityDiff > 0) notes.push('우리 도시 +' + cityDiff);
  if (cityDiff < 0) notes.push('우리 도시 ' + cityDiff);
  if (S.month === 1) notes.push('새해가 밝았습니다');
  var el = h('div', { class: 'month-banner' + (cityDiff < 0 ? ' bad' : '') }, [
    h('span', { class: 'mb-season', text: season }),
    h('div', { class: 'mb-text' }, [h('b', { text: S.year + '년 ' + S.month + '월' }), notes.length ? h('small', { text: notes.join(' · ') }) : null])
  ]);
  wrap.appendChild(el);
  setTimeout(function () { if (el.parentNode) el.remove(); }, 2600);
};

// 명령할 장수가 남은 다음 우리 도시로 (위임한 도시는 건너뜀)
SG.UI.nextReadyCity = function () {
  var S = SG.S;
  if (!S.player) return;
  var list = SG.CITY_LIST.map(function (c) { return c.id; }).filter(function (cid) {
    return S.cities[cid].owner === S.player && !S.cities[cid].deleg && SG.readyOfficers(cid).length;
  });
  if (!list.length) { SG.UI.toast('이번 달에 명령할 장수가 더 없습니다. 「턴 종료」를 누르세요'); return; }
  var i = list.indexOf(SG.UI.state.sel);
  SG.UI.state.sel = list[(i + 1) % list.length];
  SG.UI.state.drawer = true;
  SG.UI.refresh();
  SG.UI.state.map.focus(SG.UI.state.sel);
};

// 단축키 (창이 열려 있거나 글자를 입력하는 중이면 쓰지 않는다)
SG.UI.onKey = function (e) {
  if (!document.getElementById('topbar') || document.getElementById('battle')) return;
  if (document.querySelector('#modal-root .back') || SG.UI.state.busy) return;
  var tg = e.target && e.target.tagName;
  if (tg === 'INPUT' || tg === 'SELECT' || tg === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
  var m = SG.UI.state.map, k = e.key, done = true;
  if ((k === 'Enter' || k === ' ') && tg === 'BUTTON') return;
  if (k === 'Enter' || k === 'e' || k === 'E') SG.UI.endTurn();
  else if (k === 'Tab' || k === 'n' || k === 'N') SG.UI.nextReadyCity();
  else if (/^[1-5]$/.test(k)) { var t = document.querySelectorAll('#panel .cmd-tab')[+k - 1]; if (t) t.click(); else done = false; }
  else if (k === 'ArrowLeft' || k === 'a' || k === 'A') m.pan(-0.12, 0);
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') m.pan(0.12, 0);
  else if (k === 'ArrowUp' || k === 'w' || k === 'W') m.pan(0, -0.12);
  else if (k === 'ArrowDown' || k === 's' || k === 'S') m.pan(0, 0.12);
  else if (k === '+' || k === '=') m.zoomBy(1 / 1.25);
  else if (k === '-' || k === '_') m.zoomBy(1.25);
  else if (k === '0' || k === 'f' || k === 'F') m.fit();
  else if (k === 'h' || k === 'H' || k === '?') SG.UI.help();
  else done = false;
  if (done) e.preventDefault();
};

SG.UI.afterAction = function () {
  var S = SG.S;
  SG.checkEnd();
  if (!S.over) { SG.UI.refresh(); return; }
  if (SG.UI._endShown) return;
  SG.UI._endShown = true;
  var win = S.over === 'win', f = S.forces[S.player], lord = f.lord;
  SG.UI.sfx(win ? 'win' : 'lose');
  var t = SG.forceTotals(S.player), sc = SG.SCENARIOS.filter(function (x) { return x.id === S.scen; })[0];
  function stat(k, v) { return h('div', { class: 'end-stat' }, [h('b', { text: v }), h('span', { text: k })]); }
  var body = h('div', { class: 'ending ' + (win ? 'win' : 'lose') }, [
    h('div', { class: 'end-hero' }, [SG.UI.portrait(lord, 200, S.player), h('span', { class: 'end-seal', text: win ? '天下\n統一' : '敗' })]),
    h('div', { class: 'end-text' }, [
      h('div', { class: 'end-eyebrow', text: (sc ? sc.name + ' · ' : '') + S.year + '년 ' + S.month + '월' }),
      h('h1', { text: win ? '천하통일' : '난세의 꿈이 지다' }),
      h('p', { text: win ? SG.name(lord) + '이(가) 마침내 천하를 하나로 모았다.\n오랜 난세가 끝나고 새로운 시대가 열린다.'
        : SG.forceName(S.player) + ' 세력은 멸망했다. 난세의 꿈은 여기서 끝났다.' }),
      h('div', { class: 'end-stats' }, [stat('개월', S.turnCount), stat('도시', win ? SG.CITY_LIST.length : t.cities), stat('장수', t.officers), stat('병사', SG.fmt(t.soldiers))])
    ])
  ]);
  // 천하통일이면 엔딩 크레딧 (공신록·후일담·만든 사람들)
  SG.UI.modal({ title: win ? '축하합니다!' : '게임 종료', size: 'wide', tone: win ? 'gold' : 'war', icon: win ? 'star' : 'flag', body: body,
    buttons: win ? [{ label: '타이틀로', value: 'title' }, { label: '엔딩 크레딧', value: 'credits', cls: 'primary' }] : [{ label: '타이틀로', value: true, cls: 'primary' }] })
    .then(async function (v) {
      if (win && v === 'credits' && SG.UI.credits) await SG.UI.credits();
      SG.UI._endShown = false; SG.UI.title();
    });
};

// 전투 양군 비교 (전투 시작 창·자동 전투 결과 창). after 면 남은 병사/처음 병사 막대
SG.UI.battleVs = function (atk, def, after) {
  function oids(side) { return side.units.map(function (u) { return u.oid || u.oidLost; }).filter(Boolean); }
  function line(side) {
    var now = SG.armyTotal(side), max = side.units.reduce(function (s, u) { return s + (u.max || u.n); }, 0);
    return after ? '남은 병사 ' + SG.fmt(now) + ' / ' + SG.fmt(max) + ' (잃은 병사 ' + SG.fmt(max - now) + ')' : '병사 ' + SG.fmt(now) + ' · 훈련 ' + side.train + ' · 사기 ' + side.morale;
  }
  function bar(side) {
    if (!after) return null;
    var now = SG.armyTotal(side), max = side.units.reduce(function (s, u) { return s + (u.max || u.n); }, 0) || 1;
    return h('div', { class: 'hp-bar' }, [h('i', { style: { width: Math.round(now / max * 100) + '%' } })]);
  }
  return h('div', { class: 'vs' }, [
    SG.UI.vsSide(atk.from || def.city, atk.fid, '공격 · ' + SG.forceName(atk.fid), oids(atk), line(atk), 'me', bar(atk)),
    h('div', { class: 'mid' }, [h('span', { text: '對' })]),
    SG.UI.vsSide(def.city, def.fid, '수비 · ' + SG.cityName(def.city) + ' (' + SG.forceName(def.fid) + ')', oids(def), line(def), 'foe', bar(def))
  ]);
};

// ---- 전투·포로 등 게임 엔진이 묻는 것
SG.ui = {
  battleMode: async function (atk, def) {
    SG.UI.sfx('march');
    if (!SG.UI.tactical) return 'auto';
    var mine = SG.isPlayer(atk.fid) ? '공격' : '수비';
    SG.UI.busy(null);
    return SG.UI.modal({ title: SG.cityName(def.city) + ' 전투 — 우리는 ' + mine + ' 쪽입니다', size: 'wide', tone: 'war', icon: 'attack', cancel: 'auto', body: h('div', null, [
      SG.UI.battleVs(atk, def, false),
      h('p', { class: 'note', style: { textAlign: 'center', marginTop: '10px' }, text: '「직접 지휘」는 육각형 전장에서 부대를 하나씩 움직입니다. 「자동 계산」은 바로 결과가 나옵니다.' })
    ]), buttons: [{ label: '자동 계산', value: 'auto' }, { label: '직접 지휘', value: 'tactical', cls: 'primary' }] });
  },
  battleReport: async function (atk, def, res) {
    SG.UI.busy(null);
    var mineAtk = SG.isPlayer(atk.fid), won = (res.winner === 'atk') === mineAtk;
    SG.UI.sfx(won ? 'capture' : 'lose');
    var body = h('div', { class: 'bt-report' }, [
      h('div', { class: 'big-stamp ' + (won ? 'win' : 'lose'), text: won ? '勝' : '敗' }),
      SG.UI.battleVs(atk, def, true),
      h('div', { class: 'report' }, res.log.map(function (l) { return h('div', { class: /일기토/.test(l) ? 'duel-l' : '', text: l }); }))
    ]);
    await SG.UI.modal({ title: (won ? '승리' : '패배') + ' — ' + SG.cityName(def.city) + (res.winner === 'atk' ? ' 함락' : ' 방어'), size: 'wide', tone: won ? 'gold' : 'war', icon: won ? 'flag' : 'attack', body: body, cancel: true });
  },
  captive: async function (oid, captor) {
    SG.UI.sfx('capture');
    SG.UI.busy(null);
    var p = Math.round(SG.recruitChance(SG.S.forces[captor].lord, oid, captor) * 100);
    var so = SG.S.off[oid], isLord = so.f && SG.S.forces[so.f] && SG.S.forces[so.f].lord === oid;
    var o = SG.O(oid);
    var body = h('div', { class: 'captive' }, [
      h('div', { class: 'cap-face' }, [SG.UI.portrait(oid, 132, so.f), h('span', { class: 'cap-rope' }), h('span', { class: 'cap-seal', text: '虜' })]),
      h('div', { class: 'cap-info' }, [
        h('div', { class: 'ocard-name', text: o.n }, [h('span', { text: o.h + (isLord ? ' · 군주' : '') })]),
        h('div', { class: 'cap-stats' }, SG.STAT_NAMES.map(function (n, i) { var v = [o.lead, o.war, o.int, o.pol, o.cha][i]; return h('span', { class: SG.UI.statClass(v) }, [n.charAt(0), h('b', { text: v })]); })),
        o.sk ? h('div', { class: 'note' }, [h('span', { class: 'tag sk', style: { marginLeft: 0 }, text: o.sk }), ' ' + SG.SKILLS[o.sk]]) : null,
        h('p', { text: SG.forceName(so.f) + ' 세력의 ' + o.n + '을(를) 사로잡았습니다. 어떻게 할까요?' }),
        isLord ? h('p', { class: 'note', text: '군주는 항복하지 않습니다.' }) :
          h('div', { class: 'cap-chance' }, [h('span', { text: '항복 권유 성공률' }), h('span', { class: 'fr', style: { width: '120px' } }, [h('i', { style: { width: p + '%', background: p >= 50 ? 'var(--good)' : 'var(--bronze)' } })]), h('b', { text: p + '%' }), h('span', { class: 'note', text: '실패하면 풀어 줍니다' })])
      ])
    ]);
    return SG.UI.modal({ title: '포로 — ' + o.n, body: body, size: 'wide', icon: 'recruit', cancel: 'release', buttons: [
      { label: '처형', value: 'execute', cls: 'war' }, { label: '풀어 주기', value: 'release' },
      { label: '항복 권유', value: 'recruit', cls: 'primary' }] });
  },
  tactical: function (atk, def) { return SG.UI.tactical(atk, def); },
  attackAnim: async function (from, to, fid) {
    var m = SG.UI.state.map;
    if (!m || !document.body.contains(m.svg) || document.hidden) return;
    var mineInvolved = SG.isPlayer(fid) || SG.isPlayer(SG.S.cities[to].owner);
    await m.arrow(from, to, SG.S.forces[fid].color, mineInvolved ? 800 : 380);
  },
  story: async function (title, text) {
    SG.UI.sfx('event');
    SG.UI.busy(null);
    // 글에 나오는 인물의 초상을 위에 늘어놓는다 (처음 나오는 순서대로 4명까지)
    var who = [];
    Object.keys(SG.S.off).forEach(function (oid) {
      var at = text.indexOf(SG.O(oid).n);
      if (at >= 0 && SG.O(oid).n.length >= 2 && SG.S.off[oid].s !== 'unborn') who.push([at, oid]);
    });
    who.sort(function (a, b) { return a[0] - b[0]; });
    who = who.filter(function (x, i) { return !who.slice(0, i).some(function (y) { return SG.O(y[1]).n.indexOf(SG.O(x[1]).n) >= 0; }); }).slice(0, 4);
    var paras = text.split('\n').filter(Boolean);
    await SG.UI.modal({ title: title, size: 'story', tone: 'story', icon: 'scroll', cancel: true, body: h('div', { class: 'story' }, [
      h('div', { class: 'story-date' }, [h('span', { text: SG.S.year + '년 ' + SG.S.month + '월' }), h('i', { text: '史' }), h('span', { text: '역사 사건' })]),
      who.length ? h('div', { class: 'story-cast' }, who.map(function (x, i) {
        return h('div', { class: 'cast', style: { animationDelay: (0.15 + i * 0.12) + 's' } }, [SG.UI.portrait(x[1], 92), h('span', { text: SG.O(x[1]).n })]);
      })) : null,
      h('div', { class: 'story-text' }, paras.map(function (t, i) { return h('p', { style: { animationDelay: (0.35 + i * 0.35) + 's' }, text: t }); }))
    ]), buttons: [{ label: '계속', value: true, cls: 'primary' }] });
  },
  ask: async function (title, text, yes, no) {
    SG.UI.busy(null);
    return SG.UI.confirm(title, text, yes, no);
  },
  notify: async function (text) {
    SG.UI.busy(null);
    await SG.UI.alert('알림', text);
  }
};

// ---- 화면 밝기 (자동·밝게·어둡게). 이 컴퓨터에만 기억된다.
SG.UI.THEMES = ['auto', 'light', 'dark'];
SG.UI.theme = function () { try { return localStorage.getItem('sanguo_theme') || 'auto'; } catch (e) { return 'auto'; } };
SG.UI.applyTheme = function (t) {
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
};
SG.UI.cycleTheme = function () {
  var t = SG.UI.THEMES[(SG.UI.THEMES.indexOf(SG.UI.theme()) + 1) % 3];
  try { localStorage.setItem('sanguo_theme', t); } catch (e) { /* 저장 못 해도 이번 화면에는 적용 */ }
  SG.UI._theme = t;
  SG.UI.applyTheme(t);
};
SG.UI.themeLabel = function () { var t = SG.UI._theme || SG.UI.theme(); return { auto: '밝기: 자동', light: '밝기: 밝게', dark: '밝기: 어둡게' }[t]; };

// ---- 소리 설정 창
SG.UI.soundSettings = function () {
  var A = SG.Audio, st = A.settings;
  A.init();
  function row(label, key, volKey, sample) {
    var chk = h('input', { type: 'checkbox', id: 'snd-' + key, checked: st[key] || null, onchange: function (e) {
      st[key] = e.target.checked; A.applyVolumes(); A.save();
      if (key === 'music') { if (st.music && A.want) A.play(A.want); else A.stopMusic(); }
    } });
    var v = h('span', { class: 'v', text: Math.round(st[volKey] * 100) + '%' });
    var rng = h('input', { type: 'range', id: 'snd-' + volKey, min: 0, max: 100, value: Math.round(st[volKey] * 100), oninput: function (e) {
      st[volKey] = e.target.value / 100; v.textContent = e.target.value + '%'; A.applyVolumes();
    }, onchange: function () { A.save(); if (sample) SG.UI.sfx(sample); } });
    return h('div', { class: 'field' }, [h('label', { for: 'snd-' + key, style: { width: '104px' } }, [chk, ' ' + label]), rng, v]);
  }
  var body = h('div', null, [
    row('배경음악', 'music', 'musicVol', null),
    row('효과음', 'sfx', 'sfxVol', 'clash'),
    h('p', { class: 'note', text: '음악과 효과음은 녹음 파일이 아니라 브라우저가 그 자리에서 연주합니다 (고쟁·피리·이호·북·징). 설정은 이 컴퓨터에 기억됩니다.' })
  ]);
  return SG.UI.modal({ title: '소리 설정', body: body, size: 'narrow', cancel: true, buttons: [{ label: '닫기', value: true }] });
};

window.addEventListener('DOMContentLoaded', function () {
  // 브라우저는 사용자가 한 번 누른 뒤에야 소리를 낼 수 있다
  // pointerdown·click·keydown 어느 것이든 처음 누를 때 소리를 켠다 (터치 노트북·펜은 pointerdown 만으로는 허락이 안 남)
  ['pointerdown', 'click', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, function () {
      if (!SG.Audio || !SG.Audio.init()) return;
      SG.Audio.ensure();
    }, true);
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.btn, .dd-item, .scen-card, .lord-item, tr.click');
    if (b && !b.disabled) SG.UI.sfx('click');
  }, true);
  document.addEventListener('keydown', SG.UI.onKey);
  SG.UI.applyTheme(SG.UI.theme());
  SG.buildOfficers();
  SG.UI.title();
});
