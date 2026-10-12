// 폰·태블릿: 작은 화면 모드(compact)와 손가락 조작. PC 화면은 바뀌지 않는다.
// compact = 손가락 기기이거나 창 너비 1000px 미만. html 에 .compact / .touch 클래스를 붙여 css/mobile.css 가 맞춘다.
var SG = SG || {};

SG.UI.isTouch = function () { return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); };
SG.UI.isCompact = function () { return document.documentElement.classList.contains('compact'); };
SG.UI.applyCompact = function () {
  var el = document.documentElement, touch = SG.UI.isTouch();
  var compact = touch || window.innerWidth < 1000;
  // 세로 화면: 위에 지도, 아래에 도시 장부·명령판 (html.portrait)
  var portrait = compact && window.innerHeight > window.innerWidth;
  el.classList.toggle('touch', touch);
  var was = el.classList.contains('compact') + ':' + el.classList.contains('portrait');
  el.classList.toggle('compact', compact);
  el.classList.toggle('portrait', portrait);
  if (was !== compact + ':' + portrait && SG.UI.state && document.getElementById('topbar')) {
    SG.UI.refresh();
    var m = SG.UI.state.map;
    if (m) requestAnimationFrame(function () { m.home(SG.UI.state.sel); });
  }
};
SG.UI.isPortrait = function () { return document.documentElement.classList.contains('portrait'); };

// 오른쪽 도시 장부 서랍 (작은 화면에서만 열고 닫힘)
SG.UI.setDrawer = function (open) {
  SG.UI.state.drawer = !!open;
  var m = document.querySelector('.game .main');
  if (m) m.classList.toggle('drawer-open', !!open);
};

// 기록창 (작은 화면에서는 숨겨 두고 메뉴에서 연다)
SG.UI.showLog = function () {
  var box = h('div', { class: 'log log-modal' });
  SG.S.log.slice(-150).forEach(function (e) { box.appendChild(SG.UI.logLine(e)); });
  setTimeout(function () { box.scrollTop = box.scrollHeight; }, 0);
  return SG.UI.modal({ title: '기록', icon: 'scroll', body: box, size: 'wide', cancel: true, buttons: [{ label: '닫기', value: true }] });
};

// 전체 화면 (안드로이드 크롬 등에서 주소창을 감춘다. 아이폰 사파리는 지원하지 않음)
SG.UI.isStandalone = function () { return !!((window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) || navigator.standalone); };
SG.UI.canFullscreen = function () { return !SG.UI.isStandalone() && !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen); };
SG.UI.toggleFullscreen = function () {
  var d = document, el = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  else {
    var p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    if (p && p.then) p.then(function () { try { screen.orientation.lock('landscape'); } catch (e) { /* 지원 안 함 */ } }).catch(function () {});
  }
};

window.addEventListener('DOMContentLoaded', function () {
  SG.UI.applyCompact();
  window.addEventListener('resize', SG.UI.applyCompact);
  // 아이폰은 손가락을 뗄 때 소리를 켤 수 있다
  ['touchend', 'click'].forEach(function (ev) {
    document.addEventListener(ev, function () {
      if (!SG.Audio || !SG.Audio.init()) return;
      if (SG.Audio.settings.music && SG.Audio.want && SG.Audio.trackName !== SG.Audio.want) SG.Audio.play(SG.Audio.want);
    }, true);
  });
});
