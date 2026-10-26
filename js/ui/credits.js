// 엔딩: 천하통일을 이루면 바로 넘어가는 화면. 그림 장면을 한 장씩 넘긴다.
// 천하통일 → 새 나라 → 공신들이 맡은 자리(한 사람에 한 장면) → 마지막 장(통일의 기록·공신록·만든 사람들·終)
// 누르거나 Space·Enter 로 다음 장면, 가만히 두면 저절로 넘어간다. 「건너뛰기」는 마지막 장으로.
var SG = SG || {};

SG.UI.ending = function () {
  return new Promise(function (resolve) {
    var h = SG.UI.h, S = SG.S, fid = S.player, f = S.forces[fid], lord = f.lord;
    var sc = SG.SCENARIOS.filter(function (x) { return x.id === S.scen; })[0];
    var offs = SG.officersOf(fid).filter(function (o) { return o !== lord; });
    function sum(o) { var x = SG.O(o); return x.lead + x.war + x.int + x.pol + x.cha; }
    function best(k, skip) { return offs.filter(function (o) { return skip.indexOf(o) < 0; }).sort(function (a, b) { return SG.O(b)[k] - SG.O(a)[k]; })[0]; }
    var years = Math.floor(S.turnCount / 12), months = S.turnCount % 12;
    var dk = SG.DIFFS && SG.DIFFS[SG.diffKey()] ? SG.DIFFS[SG.diffKey()].n : '';

    // 공신들이 새 나라에서 맡은 자리: [능력, 관직, 한자, 배경 그림, 글]
    var used = [], roles = [];
    var ROLE = [
      ['int', '승상', '丞相', 'hall2', '{n}은(는) 승상이 되어 새 나라의 법도와 제도를 세웠다.'],
      ['war', '대장군', '大將軍', 'wall', '{n}은(는) 대장군에 올라 북방의 변경을 굳게 지켰다.'],
      ['lead', '표기장군', '驃騎將軍', 'drill', '{n}은(는) 표기장군이 되어 천하의 군사를 다시 다듬었다.'],
      ['pol', '사도', '司徒', 'field', '{n}은(는) 사도가 되어 둔전을 넓히고 백성의 살림을 돌보았다.'],
      ['cha', '사신', '使臣', 'road', '{n}은(는) 사신이 되어 먼 나라들과 오랜 화친을 맺었다.']
    ];
    ROLE.forEach(function (r, i) {
      var o = i === 0 && f.strat && offs.indexOf(f.strat) >= 0 ? f.strat : best(r[0], used);
      if (!o) return;
      used.push(o);
      roles.push({ oid: o, title: r[1], han: r[2], img: r[3], text: SG.josa(r[4].replace('{n}', SG.name(o))) });
    });

    function img(n) { return 'img/scene/' + n + '.jpg'; }
    function line(a, b) { return h('div', { class: 'cr-line' }, [h('span', { text: a }), h('b', { text: b })]); }
    var scenes = [];
    // 1. 천하통일
    scenes.push({ bg: SG.UI.TITLE_ART ? SG.UI.TITLE_ART[0] : img('title-a'), body: h('div', { class: 'ed-open' }, [
      h('div', { class: 'cr-seal', text: '天下\n統一' }),
      h('h1', { text: '천하통일' }),
      h('p', { class: 'cr-lead', text: S.year + '년 ' + S.month + '월\n' + SG.josa(SG.name(lord) + '이(가) 마침내 천하를 하나로 모았다.') }),
      SG.UI.portrait(lord, 170, fid)
    ]) });
    // 2. 새 나라
    scenes.push({ bg: img('hall'), body: h('div', { class: 'ed-story' }, [
      h('p', { text: '오랜 난세가 끝났다.\n' + SG.josa(SG.name(lord) + '은(는) 도읍에서 새 나라를 열고, 흩어졌던 백성을 불러 모았다.') }),
      h('p', { text: '들판에는 다시 곡식이 자라고, 끊겼던 길에는 상인들의 수레가 오갔다.' })
    ]) });
    // 3. 공신들
    roles.forEach(function (r) {
      scenes.push({ bg: img(r.img), body: h('div', { class: 'ed-role' }, [
        SG.UI.portrait(r.oid, 190, fid),
        h('div', { class: 'ed-role-t' }, [h('div', { class: 'ed-han', text: r.han }), h('h2', { text: r.title + ' · ' + SG.name(r.oid) }), h('p', { text: r.text })])
      ]) });
    });
    // 4. 마지막 장: 기록 · 공신록 · 만든 사람들 · 終 (넘쳐서 스크롤)
    scenes.push({ bg: SG.UI.TITLE_ART ? SG.UI.TITLE_ART[1] || SG.UI.TITLE_ART[0] : img('title-b'), last: true, body: h('div', { class: 'ed-last' }, [
      h('h2', { text: '통일의 기록' }),
      h('div', { class: 'ed-rec' }, [
        line('시나리오', sc ? sc.name : '—'), line('난이도', dk || '—'),
        line('걸린 세월', (years ? years + '년 ' : '') + months + '개월'), line('다스린 도시', SG.CITY_LIST.length + '곳'),
        line('따르는 장수', (offs.length + 1) + '명'), line('거느린 병사', SG.fmt(SG.forceTotals(fid).soldiers) + '명')
      ]),
      h('h2', { text: '공신록 功臣錄' }),
      h('div', { class: 'cr-grid' }, offs.slice().sort(function (a, b) { return sum(b) - sum(a); }).map(function (o) {
        var x = SG.O(o);
        return h('div', { class: 'cr-off' }, [SG.UI.portrait(o, 64, fid), h('b', { text: SG.name(o) }), h('small', { text: '통' + x.lead + ' 무' + x.war + ' 지' + x.int })]);
      })),
      h('h2', { text: '만든 사람들' }),
      h('div', { class: 'ed-rec' }, [
        line('기획·감수', '디지탈이강'), line('프로그램·작곡·연주', 'Claude Code'), line('장수 초상·배경 그림', 'Higgsfield AI 그림'),
        line('글꼴', 'Song Myung · IBM Plex Sans KR'), line('인물과 사건', '《삼국지》 정사와 연의')
      ]),
      h('div', { class: 'cr-end', text: '終' }),
      h('p', { class: 'cr-lead', text: '플레이해 주셔서 감사합니다' })
    ]) });

    var stage = h('div', { class: 'ed-stage' }), dots = h('div', { class: 'ed-dots' });
    var nextBtn = h('button', { class: 'btn small', type: 'button', text: '다음 ▸', onclick: function (e) { e.stopPropagation(); go(cur + 1); } });
    var skipBtn = h('button', { class: 'btn small', type: 'button', text: '건너뛰기 ▸▸', onclick: function (e) { e.stopPropagation(); go(scenes.length - 1); } });
    var homeBtn = h('button', { class: 'btn small primary', type: 'button', text: '타이틀로', onclick: function (e) { e.stopPropagation(); finish(); } });
    var root = h('div', { class: 'credits ending-screen' }, [stage, h('div', { class: 'cr-bar' }, [dots, skipBtn, nextBtn, homeBtn])]);
    scenes.forEach(function () { dots.appendChild(h('i')); });
    document.body.appendChild(root);
    SG.UI.music('ending');

    var cur = -1, timer = null, done = false;
    function go(i) {
      if (done || i < 0 || i >= scenes.length || i === cur) return;
      cur = i;
      var s = scenes[i];
      var el = h('div', { class: 'ed-scene' + (s.last ? ' last' : ''), style: { backgroundImage: 'url(' + s.bg + ')' } }, [h('div', { class: 'ed-shade' }), h('div', { class: 'ed-body' }, [s.body])]);
      [].forEach.call(stage.children, function (old) { old.classList.add('out'); setTimeout(function () { old.remove(); }, 900); });
      stage.appendChild(el);
      [].forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === i); });
      nextBtn.style.display = s.last ? 'none' : ''; skipBtn.style.display = s.last ? 'none' : '';
      clearTimeout(timer);
      if (!s.last) timer = setTimeout(function () { go(cur + 1); }, i === 0 ? 7500 : 6500);
      if (i === 0) SG.UI.sfx('win');
    }
    root.addEventListener('click', function (e) { if (!scenes[cur].last && !e.target.closest('button')) go(cur + 1); });
    function onKey(e) {
      e.stopPropagation();   // 엔딩 동안은 지도 단축키(Enter = 턴 종료 등)가 먹지 않게
      if (e.key === 'Escape') finish();
      else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); if (scenes[cur].last) finish(); else go(cur + 1); }
    }
    document.addEventListener('keydown', onKey, true);
    function finish() {
      if (done) return;
      done = true; clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      root.classList.add('out');
      setTimeout(function () { root.remove(); resolve(); }, 500);
    }
    go(0);
    SG.UI._endingTest = { go: go, finish: finish, count: scenes.length };
  });
};
SG.UI.credits = SG.UI.ending;
