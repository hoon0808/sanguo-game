// 보물·명마 (인재 탐색으로 찾고, 가진 장수의 능력치가 오른다)
var SG = SG || {};

// k: horse 명마 / blade 명검 / book 서적 / treasure 보물
// b: 능력치 보너스, mv: 직접 지휘 전투에서 더 움직이는 칸
// own: [장수, 이 해부터, 이 해까지] — 시나리오 해에 살아 있는 첫 장수가 처음부터 가진다. 없으면 어느 도시에 숨겨진다
SG.ITEMS = {
  chitu:     { n: '적토마', h: '赤兎馬', k: 'horse', b: { war: 2, lead: 2 }, mv: 2, own: [['lvbu', 0, 198], ['guanyu', 200, 219]], d: '하루에 천 리를 달린다는 붉은 명마. 사람 중에 여포, 말 중에 적토.' },
  dilu:      { n: '적로', h: '的盧', k: 'horse', b: { lead: 1 }, mv: 1, own: [['liubei', 201, 214]], d: '이마에 흰 점이 있는 말. 단계를 뛰어넘어 주인을 구했다.' },
  jueying:   { n: '절영', h: '絶影', k: 'horse', b: { lead: 2 }, mv: 1, own: [['caocao', 190, 196]], d: '그림자도 따라오지 못한다는 조조의 준마.' },
  zhuahuang: { n: '조황비전', h: '爪黃飛電', k: 'horse', b: { war: 1, lead: 1 }, mv: 1, own: [['caocao', 197, 220]], d: '발굽이 누런 흰 말. 번개처럼 달린다.' },
  yitian:    { n: '의천검', h: '倚天劍', k: 'blade', b: { war: 4 }, own: [['caocao', 190, 220]], d: '조조가 몸에 지니던 보검. 하늘에 기댈 만큼 길다.' },
  qinggang:  { n: '청강검', h: '靑釭劍', k: 'blade', b: { war: 3 }, own: [['caocao', 190, 207], ['zhaoyun', 208, 229]], d: '쇠를 진흙처럼 벤다는 명검. 장판파에서 조운이 빼앗았다.' },
  qixing:    { n: '칠성보도', h: '七星寶刀', k: 'blade', b: { war: 2, int: 1 }, own: [['wangyun', 0, 189]], d: '일곱 보석이 박힌 칼. 조조가 동탁을 찌르려 품었다.' },
  gudingdao: { n: '고정도', h: '古錠刀', k: 'blade', b: { war: 3 }, own: [['sunjian', 0, 191], ['sunce', 192, 200], ['sunquan', 201, 252]], d: '손견이 쓰던 큰 칼. 손씨 집안에 대대로 전해졌다.' },
  sunzi:     { n: '손자병법', h: '孫子兵法', k: 'book', b: { lead: 3, int: 3 }, own: [], d: '병법의 으뜸. 싸우지 않고 이기는 것이 최선이라 했다.' },
  mengde:    { n: '맹덕신서', h: '孟德新書', k: 'book', b: { lead: 2, int: 2 }, own: [['caocao', 200, 220]], d: '조조가 손자병법에 주를 달아 엮은 병서.' },
  taiping:   { n: '태평요술서', h: '太平要術', k: 'book', b: { int: 4 }, own: [['zhangjiao', 0, 184]], d: '남화노선이 장각에게 주었다는 도술서.' },
  liutao:    { n: '육도', h: '六韜', k: 'book', b: { lead: 3, int: 1 }, own: [], d: '태공망이 지었다는 병서. 문·무·용·호·표·견의 여섯 권.' },
  chunqiu:   { n: '춘추좌씨전', h: '春秋左氏傳', k: 'book', b: { pol: 3, int: 2 }, own: [['guanyu', 0, 219]], d: '관우가 늘 곁에 두고 읽었다는 역사책.' },
  yuxi:      { n: '전국옥새', h: '傳國玉璽', k: 'treasure', b: { cha: 6, pol: 2 }, own: [['sunjian', 191, 191], ['yuanshu', 192, 199]], d: '진시황 때 만든 황제의 도장. 가진 자에게 천명이 있다 했다.' },
  yeming:    { n: '야명주', h: '夜明珠', k: 'treasure', b: { cha: 3 }, own: [], d: '어둠 속에서 스스로 빛나는 구슬.' }
};
SG.ITEM_KIND = { horse: '명마', blade: '명검', book: '서적', treasure: '보물' };
SG.ITEM_IDS = Object.keys(SG.ITEMS);
SG.STAT_KEYS = ['lead', 'war', 'int', 'pol', 'cha'];

// 새 게임·옛 저장 파일: 주인 정하기, 나머지는 도시에 숨긴다
SG.initItems = function (S) {
  S = S || SG.S;
  if (S.items) return;
  S.items = {};
  var cids = Object.keys(S.cities);
  SG.ITEM_IDS.forEach(function (id) {
    var it = SG.ITEMS[id], who = null;
    it.own.some(function (w) {
      var so = S.off[w[0]];
      if (so && (so.s === 'force' || so.s === 'free') && S.year >= w[1] && S.year <= w[2]) { who = w[0]; return true; }
      return false;
    });
    // 숨길 도시는 시드에 따라 정하되 게임 난수는 건드리지 않는다
    var h = (S.seed || 7) % 9973, k = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100003;
    k = h % cids.length;
    S.items[id] = who ? { o: who, c: null } : { o: null, c: cids[k] };
  });
  // 전국옥새는 주인이 없으면 낙양 우물 속
  if (!S.items.yuxi.o && S.cities.luoyang && S.year <= 191) S.items.yuxi.c = 'luoyang';
};

SG.itemsOf = function (oid) {
  var S = SG.S, out = [];
  if (!S || !S.items) return out;
  for (var i = 0; i < SG.ITEM_IDS.length; i++) if (S.items[SG.ITEM_IDS[i]].o === oid) out.push(SG.ITEM_IDS[i]);
  return out;
};
SG.hiddenItems = function (cid) {
  var S = SG.S;
  if (!S || !S.items) return [];
  return SG.ITEM_IDS.filter(function (id) { return !S.items[id].o && S.items[id].c === cid; });
};
SG.itemMove = function (oid) {
  return oid ? SG.itemsOf(oid).reduce(function (a, id) { return a + (SG.ITEMS[id].mv || 0); }, 0) : 0;
};
SG.itemName = function (id) { var it = SG.ITEMS[id]; return SG.ITEM_KIND[it.k] + ' ' + it.n; };
SG.itemBonusText = function (id) {
  var it = SG.ITEMS[id], out = [];
  SG.STAT_KEYS.forEach(function (k, i) { if (it.b[k]) out.push(SG.STAT_NAMES[i] + ' +' + it.b[k]); });
  if (it.mv) out.push('이동 +' + it.mv);
  return out.join(' · ');
};

// 보물을 가진 장수는 능력치가 오른 모습으로 보인다 (최대 100)
SG._oBase = SG.O;
SG._oCache = {};
SG.O = function (id) {
  var o = SG.OFFICERS[id];
  if (!o || !SG.S || !SG.S.items) return o;
  var its = SG.itemsOf(id);
  if (!its.length) return o;
  var key = its.join(','), hit = SG._oCache[id];
  if (hit && hit.key === key && hit.base === o) return hit.o;
  var x = {};
  for (var p in o) x[p] = o[p];
  x.bonus = {};
  its.forEach(function (iid) {
    var b = SG.ITEMS[iid].b;
    SG.STAT_KEYS.forEach(function (k) { if (b[k]) x.bonus[k] = (x.bonus[k] || 0) + b[k]; });
  });
  SG.STAT_KEYS.forEach(function (k) { if (x.bonus[k]) x[k] = Math.min(100, o[k] + x.bonus[k]); });
  x.items = its;
  SG._oCache[id] = { key: key, base: o, o: x };
  return x;
};

// 장수가 죽으면 지니던 보물은 그 도시에 떨어진다
SG.dropItems = function (oid) {
  var S = SG.S, so = S.off[oid], out = SG.itemsOf(oid);
  out.forEach(function (id) { S.items[id] = { o: null, c: so ? so.c : null }; });
  return out;
};
SG.giveItem = function (id, oid) {
  var S = SG.S;
  S.items[id] = { o: oid, c: null };
};

// 포로로 잡으면 지니던 보물은 잡은 쪽 군주가 거둔다
SG.seizeItems = function (oid, captor) {
  var S = SG.S, F = S.forces[captor], got = SG.itemsOf(oid);
  if (!F || !got.length) return [];
  got.forEach(function (id) { SG.giveItem(id, F.lord); });
  SG.log(captor, SG.name(oid) + '에게서 ' + got.map(SG.itemName).join(', ') + '을(를) 거두어 ' + SG.name(F.lord) + '에게 바쳤다.', 'person');
  return got;
};

// 우리 장수끼리 보물을 건넨다 (명령 횟수는 쓰지 않는다)
SG.cmd = SG.cmd || {};
SG.cmd.bestow = function (id, to, quiet) {
  var S = SG.S, cur = S.items[id] && S.items[id].o, t = S.off[to];
  if (!cur || !t || t.s !== 'force') return { ok: false, msg: '줄 수 없습니다' };
  var from = S.off[cur];
  if (!from || from.f !== t.f || cur === to) return { ok: false, msg: '같은 세력 장수에게만 줄 수 있습니다' };
  var lord = S.forces[t.f].lord;
  SG.giveItem(id, to);
  var g = 0, l = 0;
  if (to !== lord) { g = Math.min(100 - t.loy, 10 + (SG.ITEMS[id].k === 'treasure' ? 5 : 0)); t.loy += g; }
  if (cur !== lord) { l = Math.min(from.loy, 5); from.loy -= l; }
  var msg = SG.name(to) + '에게 ' + SG.itemName(id) + '을(를) 내렸다.' + (g ? ' 충성 +' + g : '') + (l ? ' (' + SG.name(cur) + ' 충성 −' + l + ')' : '');
  if (!quiet) SG.log(t.f, msg, 'staff');
  return { ok: true, msg: SG.josa(msg), gain: g };
};
