// 엔딩 크레딧: 천하통일 뒤 화면 가득 천천히 올라가는 두루마리.
// 통일 기록 → 후일담(공신들이 맡은 자리) → 공신록(우리 장수 전부, 초상) → 만든 사람들 → 終
var SG = SG || {};

SG.UI.credits = function () {
  return new Promise(function (resolve) {
    var h = SG.UI.h, S = SG.S, fid = S.player, f = S.forces[fid], lord = f.lord;
    var sc = SG.SCENARIOS.filter(function (x) { return x.id === S.scen; })[0];
    var offs = SG.officersOf(fid).filter(function (o) { return o !== lord; });
    function sum(o) { var x = SG.O(o); return x.lead + x.war + x.int + x.pol + x.cha; }
    function best(k, skip) { return offs.filter(function (o) { return (skip || []).indexOf(o) < 0; }).sort(function (a, b) { return SG.O(b)[k] - SG.O(a)[k]; })[0]; }
    var years = Math.floor(S.turnCount / 12), months = S.turnCount % 12;
    var dk = SG.DIFFS && SG.DIFFS[SG.diffKey()] ? SG.DIFFS[SG.diffKey()].n : '';

    // 후일담: 가장 뛰어난 장수들이 새 나라에서 맡은 자리
    var used = [], epi = [];
    function role(k, line) { var o = best(k, used); if (!o) return; used.push(o); epi.push({ oid: o, text: SG.josa(line.replace('{n}', SG.name(o))) }); }
    var strat = f.strat && offs.indexOf(f.strat) >= 0 ? f.strat : null;
    if (strat) { used.push(strat); epi.push({ oid: strat, text: SG.josa(SG.name(strat) + '은(는) 승상이 되어 새 나라의 법도와 제도를 세웠다.') }); }
    else role('int', '{n}은(는) 승상이 되어 새 나라의 법도와 제도를 세웠다.');
    role('war', '{n}은(는) 대장군에 올라 북방의 변경을 굳게 지켰다.');
    role('lead', '{n}은(는) 표기장군이 되어 천하의 군사를 다시 다듬었다.');
    role('pol', '{n}은(는) 사도가 되어 둔전을 넓히고 백성의 살림을 돌보았다.');
    role('cha', '{n}은(는) 사신이 되어 먼 나라들과 오랜 화친을 맺었다.');

    function sec(title, kids, cls) { return h('section', { class: 'cr-sec ' + (cls || '') }, [title ? h('h2', { text: title }) : null].concat(kids)); }
    function line(a, b) { return h('div', { class: 'cr-line' }, [h('span', { text: a }), h('b', { text: b })]); }

    var roll = h('div', { class: 'cr-roll' }, [
      sec(null, [
        h('div', { class: 'cr-seal', text: '天下\n統一' }),
        h('h1', { text: '천하통일' }),
        h('p', { class: 'cr-lead', text: S.year + '년 ' + S.month + '월, ' + SG.josa(SG.name(lord) + '이(가) 마침내 천하를 하나로 모았다.') }),
        SG.UI.portrait(lord, 150, fid)
      ], 'cr-open'),
      sec('통일의 기록', [
        line('시나리오', sc ? sc.name : '—'),
        line('난이도', dk || '—'),
        line('걸린 세월', (years ? years + '년 ' : '') + months + '개월'),
        line('다스린 도시', SG.CITY_LIST.length + '곳'),
        line('따르는 장수', (offs.length + 1) + '명'),
        line('거느린 병사', SG.fmt(SG.forceTotals(fid).soldiers) + '명')
      ]),
      sec('그 뒤의 이야기', [h('p', { class: 'cr-story', text: '오랜 난세가 끝나자 들판에는 다시 곡식이 자라고, 끊겼던 길에는 상인들의 수레가 오갔다. 사람들은 ' + SG.name(lord) + '의 이름을 오래도록 기억했다.' })]
        .concat(epi.map(function (e) { return h('div', { class: 'cr-epi' }, [SG.UI.portrait(e.oid, 64, fid), h('p', { text: e.text })]); }))),
      sec('공신록 功臣錄', [h('div', { class: 'cr-grid' }, offs.slice().sort(function (a, b) { return sum(b) - sum(a); }).map(function (o) {
        var x = SG.O(o);
        return h('div', { class: 'cr-off' }, [SG.UI.portrait(o, 72, fid), h('b', { text: SG.name(o) }), h('small', { text: '통' + x.lead + ' 무' + x.war + ' 지' + x.int })]);
      }))]),
      sec('만든 사람들', [
        line('기획·감수', '디지탈이강'),
        line('프로그램·작곡·연주', 'Claude Code'),
        line('장수 초상·배경 그림', 'Higgsfield AI 그림'),
        line('글꼴', 'Song Myung · IBM Plex Sans KR'),
        line('인물과 사건', '《삼국지》 정사와 연의'),
        h('p', { class: 'cr-thanks', text: '그리고 이 난세를 함께 건넌 모든 장수들께' })
      ]),
      sec(null, [h('div', { class: 'cr-end', text: '終' }), h('p', { class: 'cr-lead', text: '플레이해 주셔서 감사합니다' })], 'cr-close')
    ]);

    var art = SG.UI.TITLE_ART ? SG.UI.TITLE_ART[S.turnCount % SG.UI.TITLE_ART.length] : null;
    var root = h('div', { class: 'credits', style: art ? { backgroundImage: 'url(' + art + ')' } : null }, [
      h('div', { class: 'cr-shade' }),
      h('div', { class: 'cr-view' }, [roll]),
      h('div', { class: 'cr-bar' }, [
        h('button', { class: 'btn small', type: 'button', text: '빠르게', onclick: function (e) { speed = speed > 1 ? 1 : 4; e.target.textContent = speed > 1 ? '보통 빠르기' : '빠르게'; } }),
        h('button', { class: 'btn small primary', type: 'button', text: '타이틀로', onclick: function () { finish(); } })
      ])
    ]);
    document.body.appendChild(root);
    SG.UI.music('ending');
    // 천천히 올리기 (휠·끌기로 직접 넘겨도 된다)
    var view = root.querySelector('.cr-view'), y = 0, speed = 1, last = performance.now(), done = false, raf;
    view.addEventListener('wheel', function (e) { y = Math.max(0, y + e.deltaY); e.preventDefault(); }, { passive: false });
    function step(now) {
      if (done) return;
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      var max = Math.max(0, roll.offsetHeight - view.clientHeight * 0.55);
      y = Math.min(max, y + dt * 34 * speed);
      roll.style.transform = 'translateY(' + (view.clientHeight - y) + 'px)';
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    function onKey(e) { if (e.key === 'Escape') finish(); }
    document.addEventListener('keydown', onKey);
    function finish() {
      if (done) return;
      done = true; cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      root.classList.add('out');
      setTimeout(function () { root.remove(); resolve(); }, 500);
    }
    SG.UI._creditsTest = { finish: finish, skipTo: function (v) { y = v; } };
  });
};
