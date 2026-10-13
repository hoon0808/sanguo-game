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
