// 보물·명마 화면: 장수 정보의 보물 칸, 보물 일람, 하사
var SG = SG || {};

SG.UI.itemImg = function (id, size) {
  return h('img', { class: 'item-img', alt: '', src: 'img/items/' + id + '.jpg', width: size, height: size, loading: 'lazy' });
};

// 보물 한 개 카드. opt: {owner: true(주인 표시), give: fn}
SG.UI.itemCard = function (id, opt) {
  opt = opt || {};
  var it = SG.ITEMS[id], st = SG.S.items[id];
  var where = st.o ? (SG.S.off[st.o] && SG.S.off[st.o].s === 'force' ? SG.forceName(SG.S.off[st.o].f) + ' · ' : '') + SG.name(st.o) : '행방 모름';
  return h('div', { class: 'item-card k-' + it.k }, [
    SG.UI.itemImg(id, 72),
    h('div', { class: 'it-body' }, [
      h('div', { class: 'it-name' }, [h('span', { class: 'it-kind', text: SG.ITEM_KIND[it.k] }), it.n, h('small', { text: it.h })]),
      h('div', { class: 'it-bonus', text: SG.itemBonusText(id) }),
      h('div', { class: 'it-desc', text: it.d }),
      opt.owner ? h('div', { class: 'it-owner' + (st.o ? '' : ' lost'), text: where }) : null,
      opt.give ? h('button', { class: 'btn small', type: 'button', text: '다른 장수에게 내리기', onclick: function () { opt.give(id); } }) : null
    ])
  ]);
};

// 장수 정보 안의 보물 칸
SG.UI.officerItems = function (oid, onChange) {
  var its = SG.itemsOf(oid);
  if (!its.length) return null;
  var so = SG.S.off[oid], mine = so.s === 'force' && so.f === SG.S.player;
  return h('div', { class: 'oc-items' }, [h('h4', { text: '지닌 보물 ' + its.length + '개' })].concat(its.map(function (id) {
    return SG.UI.itemCard(id, { give: mine ? function (iid) { SG.UI.bestowItem(iid, onChange); } : null });
  })));
};

// 우리 장수에게 보물을 내린다 (명령 횟수는 쓰지 않음)
SG.UI.bestowItem = async function (id, onChange) {
  var S = SG.S, cur = S.items[id].o, fid = S.off[cur].f;
  var list = SG.officersOf(fid).filter(function (o) { return o !== cur; });
  if (!list.length) { SG.UI.toast('보물을 받을 장수가 없습니다', true); return; }
  var it = SG.ITEMS[id], pick = null;
  var body = h('div', null, [
    h('p', { class: 'note', text: SG.josa(SG.itemName(id) + '(' + SG.itemBonusText(id) + ')을(를) 누구에게 내릴까요? 받은 장수는 충성이 오릅니다. 명령 횟수는 쓰지 않습니다.') }),
    h('div', { class: 'pick-list' }, [SG.UI.officerTable(list, {
      sortBy: { get: function (o) { return -S.off[o].loy; } },
      cols: [{ label: '충성', cls: 'n', get: function (o) { return S.forces[fid].lord === o ? '군주' : S.off[o].loy; } },
        { label: it.k === 'book' ? '지력' : it.k === 'treasure' ? '매력' : '무력', cls: 'n', get: function (o) { var x = SG.O(o); return it.k === 'book' ? x.int : it.k === 'treasure' ? x.cha : x.war; } }],
      onPick: function (o) { pick = o; var b = document.querySelector('#modal-root .back:last-child .modal-f .btn'); if (b) b.click(); }
    })])
  ]);
  await SG.UI.modal({ title: '보물 하사 — 누구에게 내릴까요?', icon: 'reward', body: body, cancel: true, buttons: [{ label: '닫기', value: true }] });
  if (!pick) return;
  var r = SG.cmd.bestow(id, pick);
  SG.UI.toast(r.msg, !r.ok);
  if (r.ok) SG.UI.sfx('coin');
  if (onChange) onChange();
  SG.UI.refresh();
};

// 보물 일람: 천하의 보물 15개와 지금 가진 사람
SG.UI.itemList = function () {
  var S = SG.S, kinds = ['horse', 'blade', 'book', 'treasure'];
  var owned = SG.ITEM_IDS.filter(function (id) { return S.items[id].o && S.off[S.items[id].o].f === S.player && S.off[S.items[id].o].s === 'force'; }).length;
  var body = h('div', { class: 'item-list' }, [h('p', { class: 'note', text: '우리 세력이 가진 보물 ' + owned + ' / ' + SG.ITEM_IDS.length + '개 · 「행방 모름」인 보물은 어느 도시에 숨겨져 있습니다. 그 도시에서 「인재 탐색」을 하면 찾을 수 있습니다 (지력·매력이 높을수록 잘 찾음).' })]
    .concat(kinds.map(function (k) {
      return h('div', { class: 'il-group' }, [h('h4', { text: SG.ITEM_KIND[k] }), h('div', { class: 'il-cards' }, SG.ITEM_IDS.filter(function (id) { return SG.ITEMS[id].k === k; }).map(function (id) {
        var c = SG.UI.itemCard(id, { owner: true });
        var o = S.items[id].o;
        if (o) { c.classList.add('click'); c.addEventListener('click', function () { SG.UI.officerCard(o); }); }
        return c;
      }))]);
    })));
  return SG.UI.modal({ title: '보물 일람', icon: 'reward', body: body, size: 'wide', cancel: true, buttons: [{ label: '닫기', value: true }] });
};

// ---- 협력 장수 고르기 (명령 창 위에 붙는 줄). 고른 장수는 SG.UI.pendingHelpers 에 담기고 doCmd 가 명령에 붙인다
SG.UI.CMD_KEY_OF = { '농업 개발': 'agri', '상업 개발': 'comm', '성벽 보수': 'wall', '민심 안정': 'relief', '징병': 'conscript', '훈련': 'train', '수송': 'transport', '출진': 'attack',
  '인재 탐색': 'search', '등용': 'recruit', '유언비어': 'rumor', '이간': 'sow', '친선': 'gift', '동맹': 'ally', '항복 권고': 'demand', '교역': 'trade' };
SG.UI.pendingHelpers = null;
SG.UI.coopRow = function (cid, stat, getMain, onChange, costNote) {
  var sel = SG.UI.pendingHelpers = [];
  var wrap = h('div', { class: 'coop-row' });
  var label = SG.UI.STAT_LABEL && SG.UI.STAT_LABEL[stat] || stat;
  function draw() {
    wrap.innerHTML = '';
    var main = getMain ? getMain() : null;
    var i = sel.indexOf(main); if (i >= 0) sel.splice(i, 1);
    var ready = SG.readyOfficers(cid).filter(function (x) { return x !== main; }).sort(function (a, b) { return SG.O(b)[stat] - SG.O(a)[stat]; });
    if (!ready.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    wrap.appendChild(h('div', { class: 'coop-h' }, [h('b', { text: '협력 장수' }), h('span', { class: 'coop-n', text: sel.length + ' / ' + SG.COOP_MAX }),
      h('small', { text: '고르면 능력의 일부(50·35·25%)를 ' + (main ? SG.name(main) + '에게' : '맡은 장수에게') + ' 보탭니다 · 협력한 장수도 이번 달 명령을 씁니다' + (costNote ? ' · ' + costNote : '') })]));
    wrap.appendChild(h('div', { class: 'coop-chips' }, ready.map(function (o) {
      var on = sel.indexOf(o) >= 0;
      return h('button', { type: 'button', class: 'coop-chip' + (on ? ' on' : ''), disabled: !on && sel.length >= SG.COOP_MAX || null, onclick: function () {
        var k = sel.indexOf(o);
        if (k >= 0) sel.splice(k, 1); else if (sel.length < SG.COOP_MAX) sel.push(o);
        SG.UI.sfx('click');
        draw();
        if (onChange) onChange();
      } }, [SG.UI.portrait(o, 30), h('span', { text: SG.name(o) }), h('b', { text: label.charAt(0) + SG.O(o)[stat] }), on ? h('i', { text: '助' }) : null]);
    })));
  }
  wrap.redraw = draw;
  draw();
  return wrap;
};
// 지금 고른 협력 장수를 붙였을 때의 값 (예상치 표시용)
SG.UI.coopCalc = function (main, fn) {
  var hs = (SG.UI.pendingHelpers || []).filter(function (x) { return x !== main; });
  if (!hs.length) return fn();
  SG._coop = { oid: main, add: SG.coopBonus(hs), n: hs.length };
  try { return fn(); } finally { SG._coop = null; }
};
