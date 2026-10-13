// 알현 장면: 누군가 찾아오면 궁전 대전으로 화면이 바뀐다 (사신·인재·상인·작별·포로·새 군주)
var SG = SG || {};

// 장수가 아닌 방문자 그림 (상인 등). 단순한 실루엣
SG.UI.FIGURES = {
  soldier: { bg: ['#5a5a4a', '#2a2a20'], svg:
    '<path d="M24 150c6-40 20-56 36-56s30 16 36 56z" fill="#6a5a3a"/><rect x="40" y="96" width="40" height="40" rx="6" fill="#8a7a5a"/>' +
    '<circle cx="60" cy="72" r="20" fill="#d9b48a"/><path d="M38 70q22-34 44 0z" fill="#4a4a40"/><line x1="96" y1="20" x2="96" y2="150" stroke="#3a2a18" stroke-width="4"/><path d="M96 10l6 14h-12z" fill="#cfcfcf"/>' },
  merchant: { bg: ['#7a5a2e', '#3e2c14'], svg:
    '<ellipse cx="60" cy="128" rx="46" ry="30" fill="#5b3a1e"/>' +
    '<path d="M22 132c4-30 20-44 38-44s34 14 38 44z" fill="#8a5a2a"/><path d="M60 88l-10 44h20z" fill="#c9a35a"/>' +
    '<circle cx="60" cy="62" r="20" fill="#e4c39a"/><path d="M40 60c2-16 12-24 20-24s18 8 20 24c-6-6-12-8-20-8s-14 2-20 8z" fill="#3a2a18"/>' +
    '<path d="M30 46h60l-8-14H38z" fill="#2d2014"/><path d="M52 70q8 6 16 0" stroke="#7a4a2a" stroke-width="2" fill="none"/>' +
    '<circle cx="53" cy="62" r="2" fill="#2d2014"/><circle cx="67" cy="62" r="2" fill="#2d2014"/>' +
    '<path d="M50 76q10 10 20 0v6q-10 8-20 0z" fill="#3a2a18"/>' +
    '<rect x="76" y="104" width="22" height="16" rx="3" fill="#c9a35a" stroke="#6b4a20"/><path d="M80 104v-4h14v4" stroke="#6b4a20" fill="none" stroke-width="2"/>' }
};
// 그린 초상이 있는 방문자 (Higgsfield 로 그림, img/figures/)
SG.UI.FIGURE_IMG = { merchant: 'img/figures/merchant.jpg', merchant2: 'img/figures/merchant2.jpg' };
SG.UI.figure = function (kind, size) {
  if (SG.UI.FIGURE_IMG[kind]) return h('span', { class: 'pt fig', style: { width: size + 'px', height: size + 'px' } }, [h('img', { src: SG.UI.FIGURE_IMG[kind], alt: '', style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } })]);
  var f = SG.UI.FIGURES[kind] || SG.UI.FIGURES.merchant;
  return h('span', { class: 'pt fig', style: { width: size + 'px', height: size + 'px', background: 'linear-gradient(160deg,' + f.bg[0] + ',' + f.bg[1] + ')' },
    html: '<svg viewBox="0 0 120 150" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">' + f.svg + '</svg>' });
};

SG.UI.VISIT_SFX = { advisor: 'ok', talent: 'found', merchant: 'coin', farewell: 'fail', envoy: 'event', gift: 'coin', grown: 'recruit', succession: 'event', captive: 'capture' };

// opt: SG.visit 과 같음 + bound(포로: 밧줄)
SG.UI.audience = function (opt) {
  var S = SG.S, P = S.player, lord = P && S.forces[P] ? S.forces[P].lord : null;
  var so = opt.visitor ? S.off[opt.visitor] : null;
  var fid = opt.from || (so && (so.s === 'force' || so.s === 'captive') ? so.f : null);
  var F = fid && S.forces[fid] ? S.forces[fid] : null;
  var name = opt.visitor ? SG.O(opt.visitor).n : (opt.name || '손님');
  var sub = opt.visitor ? (F ? SG.forceName(fid) + ' 세력' + (opt.kind === 'envoy' || opt.kind === 'gift' ? '의 사신' : '') : (so && so.s === 'free' ? '재야' : '')) : (opt.sub || '');
  var face = opt.visitor ? SG.UI.portrait(opt.visitor, 236, fid) : SG.UI.figure(opt.figure, 236);
  var host = P && S.forces[P] ? S.forces[P] : null;
  var full = SG.josa(opt.text || '');
  var txt = h('div', { class: 'dlg-t' });
  var dlg = h('div', { class: 'dlg' }, [h('div', { class: 'dlg-who' }, [name, sub ? h('small', { text: sub }) : null]), txt,
    opt.note ? h('div', { class: 'dlg-note', text: opt.note }) : null, h('i', { class: 'dlg-more' })]);
  var curtain = h('div', { class: 'hall-curtain' });
  curtain.style.setProperty('--host', host ? host.color : '#7d1f17');
  var stage = h('div', { class: 'hall' + (opt.kind ? ' k-' + opt.kind : '') }, [
    // 대전 그림 (Higgsfield) 위에 손님 세력 빛깔의 휘장 끝단만 살짝
    h('div', { class: 'hall-bg', style: { backgroundImage: 'url(img/scene/audience.jpg)' } }),
    curtain,
    opt.extra || null,
    !opt.noHost && host && lord && lord !== opt.visitor ? h('div', { class: 'host' }, [h('div', { class: 'throne' }), SG.UI.portrait(lord, 104, P), h('span', { text: SG.name(lord) })]) : null,
    h('div', { class: 'visitor' }, [
      F ? h('div', { class: 'v-flag', style: { background: F.color }, text: (SG.O(F.lord).h || SG.forceName(fid)).charAt(0) }) : null,
      h('div', { class: 'v-frame' }, [face, opt.bound ? h('span', { class: 'cap-rope' }) : null, opt.bound ? h('span', { class: 'cap-seal', text: '虜' }) : null]),
      h('div', { class: 'v-name' }, [name, sub ? h('small', { text: sub }) : null])
    ]),
    dlg
  ]);
  var timer = null;
  function finish() { if (timer) { clearInterval(timer); timer = null; } txt.textContent = full; dlg.classList.add('done'); }
  stage.addEventListener('click', finish);
  SG.UI.sfx(SG.UI.VISIT_SFX[opt.kind] || 'event');
  SG.UI.busy(null);
  var choices = opt.choices || [{ label: '확인', value: true, cls: 'primary' }];
  return SG.UI.modal({ title: opt.title + ' — ' + name, size: 'scene', tone: 'scene', icon: opt.icon || 'people', body: stage,
    cancel: opt.cancel !== undefined ? opt.cancel : (opt.auto !== undefined ? opt.auto : choices[0].value), buttons: choices,
    onOpen: function (box, close) {
      if (opt.onOpen) opt.onOpen(box, close);
      var i = 0;
      timer = setInterval(function () {
        i += 2;
        txt.textContent = full.slice(0, i);
        if (i >= full.length) finish();
      }, 28);
    } }).then(function (v) { finish(); return v; });
};

SG.ui.visit = function (opt) { return SG.UI.audience(opt); };

// 포로도 대전으로 끌려온다
SG.ui.captive = async function (oid, captor) {
  var S = SG.S, so = S.off[oid], o = SG.O(oid);
  var isLord = so.f && S.forces[so.f] && S.forces[so.f].lord === oid;
  var p = Math.round(SG.recruitChance(S.forces[captor].lord, oid, captor) * 100);
  var line = isLord ? '…패장이 무슨 말을 하겠소. 목을 치든 풀어 주든 마음대로 하시오.'
    : o.war >= 85 ? '흥, 싸움에 졌을 뿐 마음까지 꺾인 것은 아니오!' : o.int >= 85 ? '이 몸을 어찌하실 생각이십니까. 쓰실 뜻이 있다면 들어 보지요.' : '…목숨만은 살려 주십시오.';
  return SG.UI.audience({ visitor: oid, from: so.f, kind: 'captive', bound: true, title: '포로', icon: 'recruit',
    text: SG.forceName(so.f) + '의 ' + o.n + '을(를) 끌고 왔습니다.\n' + o.n + ': "' + line + '"',
    note: SG.statLine(oid) + (isLord ? ' · 군주는 항복하지 않습니다' : ' · 항복 권유 성공률 약 ' + p + '% (실패하면 풀어 줌)'),
    cancel: 'release',
    choices: [{ label: '처형', value: 'execute', cls: 'war' }, { label: '풀어 주기', value: 'release' }, { label: '항복 권유', value: 'recruit', cls: 'primary' }] });
};

// ---- 참모 보고: 달이 바뀌면 참모가 찾아와 이달에 살필 일을 아뢴다 (닫으면 그달은 끝, 위쪽 「참모」로 다시 볼 수 있음)
SG.UI.briefOn = function () { try { return localStorage.getItem('sanguo_brief') !== 'off'; } catch (e) { return true; } };
SG.UI.setBrief = function (on) { try { localStorage.setItem('sanguo_brief', on ? 'on' : 'off'); } catch (e) { /* 무시 */ } };
SG.UI.advisorOf = function () {
  var S = SG.S, offs = SG.officersOf(S.player).filter(function (o) { return o !== S.forces[S.player].lord; });
  return (offs.length ? offs : [S.forces[S.player].lord]).sort(function (a, b) { return SG.O(b).int - SG.O(a).int; })[0];
};
SG.UI.briefing = function (force) {
  var S = SG.S;
  if (!S.player || !S.forces[S.player] || !S.forces[S.player].alive || S.over) return Promise.resolve();
  var list = SG.UI.advice();
  if (!force && !list.length) return Promise.resolve();
  var adv = SG.UI.advisorOf(), closeFn = null;
  var panel = h('div', { class: 'brief-list' }, [
    h('div', { class: 'bl-h' }, [h('i', { text: '奏' }), '이달의 보고', h('small', { text: S.year + '년 ' + S.month + '월 · ' + list.length + '건' })]),
    list.length ? h('div', { class: 'bl-items' }, list.slice(0, 8).map(function (it, i) {
      return h('div', { class: 'bl-item' + (it.w >= 7 ? ' hi' : it.w >= 4 ? ' mid' : ''), style: { animationDelay: (0.25 + i * 0.08) + 's' } }, [
        h('span', { class: 'bl-n', text: String(i + 1) }), h('span', { class: 'bl-t', text: it.t }),
        it.city ? h('button', { class: 'btn small', type: 'button', text: SG.cityName(it.city) + ' 보기', onclick: function (e) {
          e.stopPropagation(); SG.UI.state.sel = it.city; SG.UI.state.drawer = true; if (closeFn) closeFn(true); SG.UI.refresh(); SG.UI.state.map.focus(it.city);
        } }) : null]);
    })) : h('p', { class: 'note', text: '살필 일이 없습니다.' })
  ]);
  var first = list[0];
  var text = first && first.w > 1 ? '주공, 이달에 살피실 일이 ' + list.length + '가지 있습니다.\n가장 급한 것은 — ' + first.t
    : '주공, 이달은 별다른 걱정이 없습니다.\n차근차근 나라를 키우십시오.';
  return SG.UI.audience({ visitor: adv, kind: 'advisor', title: '참모 보고', icon: 'scroll', text: text, extra: panel, noHost: true,
    choices: [{ label: '닫기', value: true, cls: 'primary' }], auto: true, onOpen: function (box, close) { closeFn = close; } });
};
