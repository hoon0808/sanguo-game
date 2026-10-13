// 전장 장면: 전투가 벌어지면 화면이 들판과 성으로 바뀐다 (알현 장면과 같은 틀).
// 시작: 양쪽 대장이 마주 서서 한마디씩 → 자동 계산 / 직접 지휘
// 자동 전투 결과: 날짜가 흐르며 병력 막대가 줄고, 일기토가 나오면 두 장수가 맞붙고, 끝에 勝/敗 도장
var SG = SG || {};

// 들판·먼 산·수비 성·양쪽 군대 그림 (SVG 글자)
// 전장 그림 (Higgsfield): 성을 치는 싸움 / 들판 싸움. 그림 위에 양쪽 세력 빛깔 깃발과 화살비·흙먼지만 덧그린다
SG.UI.FIELD_IMG = true;
SG.UI.fieldBackdrop = function (atkColor, defColor, walled) {
  if (SG.UI.FIELD_IMG) {
    var q = '<svg class="fs-bg painted" viewBox="0 0 1100 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<image href="img/scene/' + (walled ? 'battle-siege' : 'battle-field') + '.jpg" x="0" y="0" width="1100" height="500" preserveAspectRatio="xMidYMid slice"/>';
    function flag(x, y, col, big) {
      var w = big ? 46 : 30, hh = big ? 22 : 15;
      return '<line x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y + (big ? 80 : 46)) + '" stroke="#2a1d10" stroke-width="' + (big ? 3 : 2) + '"/>' +
        '<path class="fs-flag" d="M' + x + ' ' + y + ' q' + (w / 2) + ' -5 ' + w + ' 4 l-7 ' + (hh / 2) + ' l7 ' + (hh / 2) + ' q-' + (w / 2) + ' -8 -' + w + ' -4z" fill="' + col + '" stroke="rgba(0,0,0,.4)"/>';
    }
    q += '<g class="fs-army atk">' + [[70, 250, 1], [200, 262, 1], [330, 274, 1], [140, 300, 0], [270, 310, 0]].map(function (f) { return flag(f[0], f[1], atkColor, f[2]); }).join('') + '</g>';
    var dF = walled ? [[700, 118, 0], [800, 112, 0], [905, 100, 0], [1010, 92, 0], [760, 170, 1]] : [[760, 250, 1], [880, 258, 1], [990, 266, 1], [820, 300, 0], [940, 306, 0]];
    q += '<g class="fs-city">' + dF.map(function (f) { return flag(f[0], f[1], defColor, f[2]); }).join('') + '</g>';
    q += '<g class="fs-arrows">';
    for (var a2 = 0; a2 < 14; a2++) { var ax2 = 380 + (a2 * 47) % 260, ay2 = 140 + (a2 * 31) % 90; q += '<line x1="' + ax2 + '" y1="' + ay2 + '" x2="' + (ax2 + 26) + '" y2="' + (ay2 + 12) + '" style="animation-delay:' + (a2 * 0.09).toFixed(2) + 's"/>'; }
    q += '</g><g class="fs-dust"><ellipse cx="420" cy="350" rx="120" ry="24"/><ellipse cx="580" cy="310" rx="90" ry="16"/></g>';
    return q + '</svg>';
  }
  var s = '<svg class="fs-bg" viewBox="0 0 1100 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
    '<defs><linearGradient id="fs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3a52"/><stop offset=".45" stop-color="#c8744a"/><stop offset=".62" stop-color="#f0c27e"/></linearGradient>' +
    '<linearGradient id="fs-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d7445"/><stop offset="1" stop-color="#2e2a18"/></linearGradient>' +
    '<radialGradient id="fs-sun"><stop offset="0" stop-color="#fff2c4"/><stop offset=".4" stop-color="#ffd27a" stop-opacity=".8"/><stop offset="1" stop-color="#ffb060" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="1100" height="500" fill="url(#fs-sky)"/>' +
    '<circle cx="250" cy="250" r="120" fill="url(#fs-sun)"/>' +
    '<path d="M0 270 L90 205 L170 240 L260 180 L360 235 L450 195 L560 245 L660 200 L760 236 L860 190 L980 240 L1100 210 L1100 320 L0 320Z" fill="#6c5a6a" opacity=".55"/>' +
    '<path d="M0 300 L120 250 L230 285 L330 245 L470 290 L600 255 L720 288 L850 250 L1000 285 L1100 262 L1100 330 L0 330Z" fill="#5a4a4a" opacity=".75"/>';
  // 수비 성
  var wx = 600, ww = 420, wy = walled ? 236 : 262, wh = walled ? 64 : 34;
  s += '<g class="fs-city">';
  s += '<rect x="' + wx + '" y="' + wy + '" width="' + ww + '" height="' + wh + '" fill="#8f8064" stroke="#3a3122" stroke-width="2"/>';
  for (var i = 0; i < 26; i++) s += '<rect x="' + (wx + 4 + i * 16) + '" y="' + (wy - 9) + '" width="9" height="9" fill="#7f7056" stroke="#3a3122"/>';
  s += '<rect x="' + (wx + 182) + '" y="' + (wy - 44) + '" width="56" height="' + (44 + wh) + '" fill="#9a8a6c" stroke="#3a3122" stroke-width="2"/>' +
    '<path d="M' + (wx + 168) + ' ' + (wy - 42) + ' L' + (wx + 184) + ' ' + (wy - 66) + ' L' + (wx + 236) + ' ' + (wy - 66) + ' L' + (wx + 252) + ' ' + (wy - 42) + 'Z" fill="' + defColor + '" stroke="#2a2014" stroke-width="2"/>' +
    '<path d="M' + (wx + 196) + ' ' + (wy + wh) + ' v-22 q14 -14 28 0 v22z" fill="#2a2014"/>';
  [30, 110, 300, 380].forEach(function (x) {
    s += '<line x1="' + (wx + x) + '" y1="' + (wy - 9) + '" x2="' + (wx + x) + '" y2="' + (wy - 46) + '" stroke="#3a2a18" stroke-width="2"/>' +
      '<path class="fs-flag" d="M' + (wx + x) + ' ' + (wy - 46) + ' q12 -3 22 2 l-4 6 l4 6 q-10 -5 -22 -2z" fill="' + defColor + '"/>';
  });
  for (var j = 0; j < 18; j++) s += '<circle cx="' + (wx + 12 + j * 23) + '" cy="' + (wy - 12) + '" r="4" fill="' + defColor + '" opacity=".9"/>';
  s += '</g>';
  // 땅
  s += '<path d="M0 300 Q300 284 600 298 T1100 294 L1100 500 L0 500Z" fill="url(#fs-ground)"/>';
  for (var g = 0; g < 40; g++) { var gx = (g * 137) % 1100, gy = 310 + (g * 53) % 150; s += '<path d="M' + gx + ' ' + gy + ' l3 -8 l3 8" stroke="#9c9358" stroke-width="1.4" fill="none" opacity=".6"/>'; }
  // 공격군: 창병 줄
  s += '<g class="fs-army atk">';
  for (var r = 0; r < 5; r++) {
    for (var k = 0; k < 13 - r; k++) {
      var x = 40 + k * 34 + r * 18 + ((k * 7 + r * 3) % 9), y = 312 + r * 17;
      var sc = 0.62 + r * 0.1;
      s += '<g transform="translate(' + x + ' ' + y + ') scale(' + sc + ')"><line x1="6" y1="-34" x2="6" y2="2" stroke="#3a2a18" stroke-width="2"/><path d="M6 -40 l3 7 h-6z" fill="#cfcfcf"/>' +
        '<rect x="-6" y="-18" width="12" height="20" rx="3" fill="' + atkColor + '"/><circle cx="0" cy="-23" r="5.5" fill="#d9b48a"/><path d="M-6 -26 q6 -8 12 0z" fill="#3a3326"/></g>';
    }
  }
  [80, 250, 420].forEach(function (x, i) {
    s += '<line x1="' + x + '" y1="' + (252 + i * 6) + '" x2="' + x + '" y2="' + (330 + i * 6) + '" stroke="#3a2a18" stroke-width="3"/>' +
      '<path class="fs-flag" d="M' + x + ' ' + (252 + i * 6) + ' q24 -5 46 4 l-7 11 l7 11 q-22 -8 -46 -4z" fill="' + atkColor + '" stroke="rgba(0,0,0,.35)"/>';
  });
  s += '</g>';
  // 화살비 (싸우는 동안만 보임)
  s += '<g class="fs-arrows">';
  for (var a = 0; a < 14; a++) { var ax = 380 + (a * 47) % 260, ay = 140 + (a * 31) % 90; s += '<line x1="' + ax + '" y1="' + ay + '" x2="' + (ax + 26) + '" y2="' + (ay + 12) + '" style="animation-delay:' + (a * 0.09).toFixed(2) + 's"/>'; }
  s += '</g>';
  s += '<g class="fs-dust"><ellipse cx="420" cy="350" rx="120" ry="24"/><ellipse cx="580" cy="310" rx="90" ry="16"/></g>';
  return s + '</svg>';
};

SG.UI.warCry = function (oid, defending) {
  if (!oid) return defending ? '성을 굳게 지켜라! 한 발짝도 물러서지 마라!' : '전군, 진격하라!';
  var o = SG.O(oid);
  if (defending) return o.war >= 85 ? '감히 이 성을 넘보다니! 내가 나가서 단번에 쓸어 주마!' : o.int >= 85 ? '서두를 것 없다. 성벽에 기대어 적이 지치기를 기다려라.' : '성문을 닫고 활을 걸어라! 한 놈도 들이지 마라!';
  return o.war >= 85 ? '내 창을 받을 자 누구냐! 성문을 열어라!' : o.int >= 85 ? '계책은 이미 서 있다. 북을 울려 진군하라!' : o.lead >= 80 ? '대열을 갖추고 앞으로! 오늘 이 성을 손에 넣는다!' : '전군, 돌격하라!';
};

// 한쪽 대장 패널 (초상·이름·세력·병력 막대)
SG.UI.fsSide = function (side, cls) {
  var S = SG.S, F = S.forces[side.fid], lead = (side.units.filter(function (u) { return u.oid; })[0] || {}).oid;
  var max = side.units.reduce(function (s, u) { return s + (u.max || u.n); }, 0) || 1;
  var bar = h('i', { style: { width: Math.round(SG.armyTotal(side) / max * 100) + '%', background: F ? F.color : '#888' } });
  var num = h('b', { text: SG.fmt(SG.armyTotal(side)) });
  var el = h('div', { class: 'fs-side ' + cls }, [
    h('div', { class: 'fs-face' }, [lead ? SG.UI.portrait(lead, 168, side.fid) : SG.UI.figure('soldier', 168),
      F ? h('span', { class: 'fs-flagtag', style: { background: F.color }, text: (SG.O(F.lord).h || SG.forceName(side.fid)).charAt(0) }) : null]),
    h('div', { class: 'fs-name' }, [lead ? SG.O(lead).n : '수비병', h('small', { text: (cls === 'atk' ? '공격 · ' : '수비 · ') + SG.forceName(side.fid) })]),
    h('div', { class: 'fs-troop' }, [h('span', { class: 'fs-bar' }, [bar]), num]),
    h('div', { class: 'fs-mix' }, SG.TROOP_KEYS.map(function (t) { var m = SG.unitsMix(side.units)[t]; return m > 0 ? h('span', { class: 't-' + t }, [h('i', { text: SG.TROOPS[t].h }), SG.fmt(m)]) : null; })),
    h('div', { class: 'fs-subs' }, side.units.slice(1, 5).map(function (u) { return u.oid ? SG.UI.portrait(u.oid, 34, side.fid) : null; }))
  ]);
  el._set = function (n) { bar.style.width = Math.max(0, Math.round(n / max * 100)) + '%'; num.textContent = SG.fmt(n); };
  el._lead = lead;
  return el;
};

SG.UI.fieldScene = function (atk, def, opt) {
  var S = SG.S, Fa = S.forces[atk.fid], Fd = S.forces[def.fid];
  var walled = S.cities[def.city] ? S.cities[def.city].wall > 150 : true;
  var A = SG.UI.fsSide(atk, 'atk'), D = SG.UI.fsSide(def, 'def');
  var who = h('div', { class: 'dlg-who' }), txt = h('div', { class: 'dlg-t' }), note = h('div', { class: 'dlg-note' });
  var dlg = h('div', { class: 'dlg' }, [who, txt, note, h('i', { class: 'dlg-more' })]);
  var day = h('span', { class: 'fs-day', text: opt.dayText || '' });
  var stage = h('div', { class: 'field-scene' }, [
    h('div', { class: 'fs-sky', html: SG.UI.fieldBackdrop(Fa ? Fa.color : '#888', Fd ? Fd.color : '#888', walled) }),
    h('div', { class: 'fs-plate' }, [h('b', { text: SG.cityName(def.city) + (walled ? ' 공방전' : ' 들판 싸움') }), day]),
    A, h('div', { class: 'fs-vs', text: '對' }), D, dlg
  ]);
  return { stage: stage, A: A, D: D, dlg: dlg, who: who, txt: txt, note: note, day: day };
};

// 대사 한 줄을 한 글자씩. 끝나면 resolve
SG.UI.typeLine = function (sc, speaker, sub, text, ms) {
  sc.who.innerHTML = '';
  sc.who.appendChild(document.createTextNode(speaker));
  if (sub) sc.who.appendChild(h('small', { text: sub }));
  sc.dlg.classList.remove('done');
  var full = SG.josa(text), i = 0;
  return new Promise(function (res) {
    if (sc.skip) { sc.txt.textContent = full; sc.dlg.classList.add('done'); return res(); }
    var t = setInterval(function () {
      i += 2; sc.txt.textContent = full.slice(0, i);
      if (i >= full.length || sc.skip) { clearInterval(t); sc.txt.textContent = full; sc.dlg.classList.add('done'); setTimeout(res, sc.skip ? 0 : (ms || 500)); }
    }, 26);
  });
};

SG.ui.battleMode = async function (atk, def) {
  SG.UI.sfx('march');
  if (!SG.UI.tactical) return 'auto';
  SG.UI.busy(null);
  var mine = SG.isPlayer(atk.fid) ? '공격' : '수비';
  var sc = SG.UI.fieldScene(atk, def, { dayText: '우리는 ' + mine + ' 쪽' });
  sc.note.textContent = '공격군 ' + SG.fmt(SG.armyTotal(atk)) + ' 대 수비군 ' + SG.fmt(SG.armyTotal(def)) + ' · 「직접 지휘」는 육각형 전장에서 부대를 하나씩 움직이고, 「자동 계산」은 바로 결과가 나옵니다.';
  sc.stage.addEventListener('click', function () { sc.skip = true; });
  var p = SG.UI.modal({ title: SG.cityName(def.city) + ' 전투 — ' + SG.forceName(atk.fid) + ' 대 ' + SG.forceName(def.fid), size: 'scene', tone: 'scene war', icon: 'attack', cancel: 'auto', body: sc.stage,
    buttons: [{ label: '자동 계산', value: 'auto' }, { label: '직접 지휘', value: 'tactical', cls: 'primary' }] });
  (async function () {
    sc.A.classList.add('speak');
    await SG.UI.typeLine(sc, sc.A._lead ? SG.O(sc.A._lead).n : '공격군', SG.forceName(atk.fid), SG.UI.warCry(sc.A._lead, false), 700);
    sc.A.classList.remove('speak'); sc.D.classList.add('speak');
    await SG.UI.typeLine(sc, sc.D._lead ? SG.O(sc.D._lead).n : '수비병', SG.forceName(def.fid), SG.UI.warCry(sc.D._lead, true), 0);
    sc.D.classList.remove('speak');
  })();
  return p;
};

SG.ui.battleReport = async function (atk, def, res) {
  SG.UI.busy(null);
  var mineAtk = SG.isPlayer(atk.fid), won = (res.winner === 'atk') === mineAtk;
  var aMax = atk.units.reduce(function (s, u) { return s + (u.max || u.n); }, 0), dMax = def.units.reduce(function (s, u) { return s + (u.max || u.n); }, 0);
  var sc = SG.UI.fieldScene(atk, def, { dayText: '1일째' });
  sc.A._set(aMax); sc.D._set(dMax);
  sc.stage.classList.add('fighting');
  sc.stage.addEventListener('click', function () { sc.skip = true; });
  var stamp = h('div', { class: 'big-stamp fs-stamp ' + (won ? 'win' : 'lose'), text: won ? '勝' : '敗' });
  var ended = false;
  async function finish() {
    if (ended) return; ended = true;
    sc.stage.classList.remove('fighting');
    sc.A._set(SG.armyTotal(atk)); sc.D._set(SG.armyTotal(def));
    sc.stage.appendChild(stamp);
    SG.UI.sfx(won ? 'capture' : 'lose');
    sc.note.textContent = '공격군 남은 병사 ' + SG.fmt(SG.armyTotal(atk)) + ' / ' + SG.fmt(aMax) + ' · 수비군 남은 병사 ' + SG.fmt(SG.armyTotal(def)) + ' / ' + SG.fmt(dMax);
    sc.skip = true;
    await SG.UI.typeLine(sc, won ? '승리' : '패배', SG.cityName(def.city),
      res.winner === 'atk' ? SG.forceName(atk.fid) + ' 군이 ' + SG.cityName(def.city) + '을(를) 함락했다!' : SG.forceName(def.fid) + ' 군이 ' + SG.cityName(def.city) + '을(를) 지켜 냈다!', 0);
  }
  var how = res.winner === 'atk' ? (mineAtk ? ' 함락' : ' 함락당함') : (mineAtk ? ' 공략 실패' : ' 방어 성공');
  var p = SG.UI.modal({ title: (won ? '승리' : '패배') + ' — ' + SG.cityName(def.city) + how, size: 'scene', tone: 'scene ' + (won ? 'gold' : 'war'), icon: won ? 'flag' : 'attack', body: sc.stage, cancel: true,
    buttons: [{ label: '확인', value: true, cls: 'primary' }] });
  (async function () {
    SG.UI.sfx('clash');
    for (var i = 0; i < res.log.length && !sc.skip; i++) {
      var l = res.log[i], m = l.match(/^(\d+)일째: 공격군 ([\d,]+) \/ 수비군 ([\d,]+)/);
      if (m) {
        sc.day.textContent = m[1] + '일째';
        sc.A._set(+m[2].replace(/,/g, '')); sc.D._set(+m[3].replace(/,/g, ''));
        SG.UI.sfx(i % 2 ? 'arrow' : 'clash');
        await SG.UI.typeLine(sc, '전황', m[1] + '일째', '공격군 ' + m[2] + ' · 수비군 ' + m[3], 450);
      } else if (/일기토/.test(l)) {
        sc.stage.classList.add('duel'); SG.UI.sfx('duel');
        await SG.UI.typeLine(sc, '일기토!', '', l.replace(/^일기토!\s*/, ''), 1100);
        sc.stage.classList.remove('duel');
      } else {
        await SG.UI.typeLine(sc, '전황', '', l, 600);
      }
    }
    finish();
  })();
  var v = await p;
  sc.skip = true;
  return v;
};
