// 화면 공통 도구: 요소 만들기, 창(모달), 알림, 초상
var SG = SG || {};
SG.UI = {};

SG.UI.h = function (tag, attrs, children) {
  var e = document.createElement(tag);
  if (attrs) {
    for (var k in attrs) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = SG.josa(String(v));
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
  }
  [].concat(children || []).forEach(function (c) {
    if (c === null || c === undefined || c === false) return;
    e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(SG.josa(String(c))) : c);
  });
  return e;
};
var h = SG.UI.h;

SG.UI.esc = function (s) {
  return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
};

// ---- 창. buttons: [{label, value, cls}] → 누른 버튼의 value로 끝남
SG.UI.modal = function (opt) {
  return new Promise(function (resolve) {
    var root = document.getElementById('modal-root');
    var back = h('div', { class: 'back' });
    // 제목 "농업 개발 — 누구에게 맡길까요?" → 큰 제목 + 작은 물음. 명령 이름이면 그 아이콘을 메달로 단다.
    var tt = String(opt.title || ''), cut = tt.indexOf(' — ');
    var main = cut > 0 ? tt.slice(0, cut) : tt, sub = cut > 0 ? tt.slice(cut + 3) : '';
    var meta = SG.UI.CMD_META && SG.UI.CMD_META[main];
    var ico = typeof opt.icon === 'string' ? opt.icon : (!opt.icon && meta ? meta[0] : null);
    var tone = opt.tone || (main === '출진' ? 'war' : '');
    var box = h('div', { class: 'modal ' + (opt.size || '') + (tone ? ' ' + tone : '') });
    function close(v) {
      if (back.parentNode) root.removeChild(back);
      document.removeEventListener('keydown', onKey);
      resolve(v);
    }
    var body = h('div', { class: 'modal-b' });
    if (typeof opt.body === 'string') body.appendChild(h('p', { text: opt.body }));
    else if (opt.body) body.appendChild(opt.body);
    var foot = h('div', { class: 'modal-f' });
    (opt.buttons || [{ label: '확인', value: true, cls: 'primary' }]).forEach(function (b) {
      var bt = h('button', { class: 'btn ' + (b.cls || ''), text: b.label, onclick: function () {
        if (b.check && !b.check()) return;
        close(typeof b.value === 'function' ? b.value() : b.value);
      } });
      if (b.id) bt.id = b.id;
      foot.appendChild(bt);
    });
    box.appendChild(h('div', { class: 'modal-h' }, [
      ico ? h('span', { class: 'mh-ico' }, [SG.UI.icon(ico, 22)]) : (typeof opt.icon === 'object' ? opt.icon : null),
      h('div', { class: 'mh-t' }, [h('span', { class: 'mh-main', text: main }), sub ? h('span', { class: 'mh-sub', text: sub }) : null])
    ]));
    box.appendChild(body);
    if (!opt.noFoot) box.appendChild(foot);
    back.appendChild(box);
    root.appendChild(back);
    function onKey(e) {
      if (e.key === 'Escape' && opt.cancel !== undefined) close(opt.cancel);
    }
    document.addEventListener('keydown', onKey);
    if (opt.onOpen) opt.onOpen(box, close);
  });
};
SG.UI.alert = function (title, text) { return SG.UI.modal({ title: title, body: text, size: 'narrow', cancel: true }); };
SG.UI.confirm = function (title, text, yes, no) {
  return SG.UI.modal({ title: title, body: text, size: 'narrow', cancel: false,
    buttons: [{ label: no || '아니오', value: false }, { label: yes || '예', value: true, cls: 'primary' }] });
};

SG.UI.toast = function (msg, bad) {
  var root = document.getElementById('toast-root');
  var t = h('div', { class: 'toast' + (bad ? ' bad' : ''), text: msg });
  if (bad) SG.UI.sfx('error');
  root.appendChild(t);
  setTimeout(function () { if (t.parentNode) root.removeChild(t); }, bad ? 3200 : 2400);
};
// 명령 결과 알림 + 효과음 (성공 소리는 명령마다 다르게)
SG.UI.result = function (r, okSound) {
  if (!r) return;
  SG.UI.toast(r.msg, !r.ok);
  if (r.ok) {
    SG.log(SG.S.player, r.msg, 'mine');
    SG.UI.sfx(r.success === false ? 'fail' : (okSound || 'ok'));
  }
};
// 소리 (SG.Audio 가 없거나 꺼져 있으면 조용히 넘어간다)
SG.UI.sfx = function (name) { if (SG.Audio) SG.Audio.sfx(name); };
// 소리 한 번에 켜고 끄기 (위쪽 단추·타이틀)
SG.UI.soundOn = function () { return !!(SG.Audio && (SG.Audio.settings.music || SG.Audio.settings.sfx)); };
SG.UI.toggleSound = function () {
  var A = SG.Audio; if (!A) return;
  var on = !SG.UI.soundOn();
  A.settings.music = on; A.settings.sfx = on; A.save(); A.init(); A.applyVolumes();
  if (on && A.want) A.play(A.want); else A.stopMusic();
  [].forEach.call(document.querySelectorAll('.snd-btn'), function (b) { b.replaceWith(SG.UI.soundBtn(b.classList.contains('compact'))); });
  if (on) SG.UI.sfx('ok');
};
SG.UI.soundBtn = function (compact) {
  var on = SG.UI.soundOn();
  return h('button', { class: 'btn small icon-btn snd-btn' + (on ? ' on' : '') + (compact ? ' compact' : ''), type: 'button', title: on ? '소리 켜짐 — 누르면 끕니다' : '소리 꺼짐 — 누르면 켭니다',
    onclick: function (e) { e.stopPropagation(); SG.UI.toggleSound(); } }, [SG.UI.icon(on ? 'sound' : 'mute', 16), compact ? null : (on ? '소리 켜짐' : '소리 꺼짐')]);
};
SG.UI.music = function (name) {
  if (!SG.Audio) return;
  SG.Audio.want = name;
  if (SG.Audio.ctx && SG.Audio.settings.music) SG.Audio.play(name);
};

SG.UI.busy = function (text) {
  var el = document.getElementById('busy');
  if (!text) { if (el) el.parentNode.removeChild(el); return; }
  if (!el) { el = h('div', { id: 'busy', class: 'busy' }, [h('div')]); document.body.appendChild(el); }
  el.firstChild.textContent = text;
};
SG.UI.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

// ---- 초상: 세력 색 바탕에 이름 첫 글자
// 장수 초상 그림 경로. 작은 크기는 얼굴만 잘라 둔 그림을 쓴다.
SG.UI.portraitSrc = function (oid, small) {
  // 인터넷용 묶음(tools/build-web.py)에서는 얼굴 그림이 한 파일(SG.FACES)에 들어 있다
  if (small && SG.FACES && SG.FACES[oid]) return SG.FACES[oid];
  return 'img/officers/' + (small ? 'face/' : '') + oid + '.jpg';
};
SG.UI.portrait = function (oid, size, fid) {
  size = size || 36;
  var o = SG.O(oid), so = SG.S && SG.S.off[oid];
  fid = fid || (so && so.s === 'force' ? so.f : null);
  var col = fid && SG.S.forces[fid] ? SG.S.forces[fid].color : '#66706b';
  var ch = o ? (o.h ? o.h.charAt(0) : o.n.charAt(0)) : '?';
  var box = h('span', { class: 'pt', title: o ? o.n : '', style: {
    width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.52) + 'px',
    background: 'linear-gradient(145deg,' + col + ',' + SG.UI.shade(col, -35) + ')'
  } }, [ch]);
  if (o) {
    // 그림이 없으면 이름 첫 글자 인장이 그대로 보인다
    var img = h('img', { class: 'pt-img', alt: '', loading: 'lazy', src: SG.UI.portraitSrc(oid, size <= 56) });
    img.addEventListener('error', function () { img.remove(); });
    box.appendChild(img);
    box.appendChild(h('i', { class: 'pt-band', style: { background: col, height: Math.max(2, Math.round(size * 0.07)) + 'px' } }));
  }
  return box;
};
SG.UI.shade = function (hex, amt) {
  var n = parseInt(hex.slice(1), 16);
  var r = SG.clamp((n >> 16) + amt, 0, 255), g = SG.clamp(((n >> 8) & 255) + amt, 0, 255), b = SG.clamp((n & 255) + amt, 0, 255);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};
SG.UI.seal = function (fid, size) {
  var f = SG.S.forces[fid];
  return SG.UI.portrait(f ? f.lord : null, size || 28, fid);
};
SG.UI.bar = function (v, max, cls) {
  return h('div', { class: 'bar ' + (cls || '') }, [h('i', { style: { width: SG.clamp(v / max * 100, 0, 100) + '%' } })]);
};
SG.UI.statCell = function (label, v, max, cls, extra) {
  return h('div', { class: 'stat' }, [
    h('div', { class: 'k' }, [label, h('b', { text: (typeof v === 'number' ? SG.fmt(v) : v) + (max ? ' / ' + SG.fmt(max) : '') + (extra || '') })]),
    max ? SG.UI.bar(v, max, cls) : null
  ]);
};
SG.UI.statClass = function (v) { return v >= 90 ? 'hi' : (v < 40 ? 'lo' : ''); };

// 장수 이름 + 꼬리표
SG.UI.officerName = function (oid) {
  var so = SG.S.off[oid], o = SG.O(oid);
  var parts = [SG.UI.portrait(oid, 24), h('span', { text: o.n })];
  if (so.s === 'force' && SG.S.forces[so.f] && SG.S.forces[so.f].lord === oid) parts.push(h('span', { class: 'tag lord', text: '군주' }));
  if (o.sk) parts.push(h('span', { class: 'tag sk', title: SG.SKILLS[o.sk], text: o.sk }));
  return h('span', { class: 'oname' }, parts);
};

// 장수 표. cols: 추가 열 [{label, get(oid), cls}] / onPick(oid) / opts: {checkbox, selected, sortBy}
SG.UI.officerTable = function (oids, opt) {
  opt = opt || {};
  var sortKey = opt.sortBy || null, sortDir = -1;
  var wrap = h('div');
  var stats = [['lead', '통'], ['war', '무'], ['int', '지'], ['pol', '정'], ['cha', '매']];
  function render() {
    wrap.innerHTML = '';
    var list = oids.slice();
    if (sortKey) {
      list.sort(function (a, b) {
        var va = sortKey.get ? sortKey.get(a) : SG.O(a)[sortKey], vb = sortKey.get ? sortKey.get(b) : SG.O(b)[sortKey];
        return (va > vb ? 1 : va < vb ? -1 : 0) * sortDir;
      });
    }
    var head = h('tr', null, [opt.checkbox ? h('th') : null, h('th', { text: '이름' })]);
    stats.forEach(function (s) {
      head.appendChild(h('th', { class: 'n sortable', text: s[1], title: SG.STAT_NAMES[stats.indexOf(s)], onclick: function () {
        sortDir = sortKey === s[0] ? -sortDir : -1; sortKey = s[0]; render();
      } }));
    });
    (opt.cols || []).forEach(function (c) {
      head.appendChild(h('th', { class: (c.cls || '') + (c.sort !== false ? ' sortable' : ''), text: c.label, onclick: c.sort === false ? null : function () {
        sortDir = sortKey === c ? -sortDir : -1; sortKey = c; render();
      } }));
    });
    var tb = h('tbody');
    list.forEach(function (oid) {
      var o = SG.O(oid);
      var sel = opt.selected && opt.selected.indexOf(oid) >= 0;
      var dim = opt.dim && opt.dim(oid);
      var tr = h('tr', { class: (opt.onPick && !dim ? 'click ' : '') + (sel ? 'on ' : '') + (dim ? 'dim' : '') });
      if (opt.checkbox) {
        tr.appendChild(h('td', null, [h('input', { type: 'checkbox', checked: sel || null, disabled: dim || null })]));
      }
      tr.appendChild(h('td', null, [SG.UI.officerName(oid)]));
      stats.forEach(function (s) { tr.appendChild(h('td', { class: 'n ' + SG.UI.statClass(o[s[0]]), text: o[s[0]] })); });
      (opt.cols || []).forEach(function (c) {
        var v = c.render ? c.render(oid) : c.get(oid);
        tr.appendChild(h('td', { class: c.cls || '' }, [v instanceof Node ? v : String(v)]));
      });
      if (opt.onPick && !dim) tr.addEventListener('click', function () { opt.onPick(oid); render(); });
      tb.appendChild(tr);
    });
    wrap.appendChild(h('table', { class: 't' }, [h('thead', null, [head]), tb]));
  }
  render();
  wrap.refresh = render;
  return wrap;
};
