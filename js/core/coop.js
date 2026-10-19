// 명령은 도시마다 한 달에 한 번씩 (이동·포상은 빼고). 대신 한 번 명령할 때 장수 여럿이 힘을 모은다 (협력).
// 협력 장수는 능력치의 일부를 주장에게 보탠다 (그 능력이 높은 순서로 25% · 15% · 10%). 협력한 장수도 이번 달 명령을 쓴다.
// 보탠 능력은 100을 넘는 부분이 절반만 치고 120에서 멈춘다 (여럿이 모여도 뛰어난 한 사람 정도까지).
var SG = SG || {};

SG.COOP_W = [0.25, 0.15, 0.1];
SG.COOP_COST = 0.25;   // 협력 1명마다 비용 +25%
SG.COOP_SOFT = 100;    // 이 위로는 보탬이 절반
SG.COOP_CAP = 120;
SG.COOP_MAX = 3;
// 명령 → 한 달 한 번을 세는 이름
SG.CMD_KEY = {
  develop: function (a) { return a[2]; }, relief: 'relief', conscript: 'conscript', train: 'train', search: 'search', recruit: 'recruit',
  transport: 'transport', trade: 'trade', rumor: 'rumor', sow: 'sow', gift: 'gift', ally: 'ally', demand: 'demand',
  incite: 'incite', arson: 'arson', plot: 'plot', ambush: 'ambush'
};
SG.CMD_LABEL = {
  agri: '농업 개발', comm: '상업 개발', wall: '성벽 보수', relief: '민심 안정', conscript: '징병', train: '훈련', search: '인재 탐색', recruit: '등용',
  transport: '수송', trade: '교역', rumor: '유언비어', sow: '이간', gift: '친선', ally: '동맹', demand: '항복 권고', attack: '출진',
  incite: '선동', arson: '방화', plot: '내응', ambush: '매복'
};
// 협력할 수 없는 명령 (한 사람이 하는 일)
SG.NO_COOP = { transport: 1, attack: 1 };

SG.cmdUsed = function (cid, key) { var c = SG.S.cities[cid]; return !!(c && c.used && c.used[key]); };
SG.markCmd = function (cid, key) { var c = SG.S.cities[cid]; (c.used = c.used || {})[key] = 1; };
SG.resetCmds = function () { Object.keys(SG.S.cities).forEach(function (cid) { delete SG.S.cities[cid].used; }); };

// 협력 장수가 주장에게 보태는 능력치
SG.coopBonus = function (helpers) {
  var add = {};
  SG.STAT_KEYS.forEach(function (k) {
    var vals = helpers.map(function (x) { return SG.O(x)[k]; }).sort(function (a, b) { return b - a; });
    add[k] = Math.round(vals.reduce(function (s, v, i) { return s + v * (SG.COOP_W[i] || 0.1); }, 0));
  });
  return add;
};

// 다음 명령에 붙일 협력 장수 (화면·컴퓨터가 명령 직전에 정한다)
SG.helpers = null;
SG.setHelpers = function (main, list) { SG.helpers = list && list.length ? { main: main, list: list.slice(0, SG.COOP_MAX) } : null; };

// 명령 함수를 감싸 한 달 한 번 + 협력을 적용한다
Object.keys(SG.CMD_KEY).forEach(function (name) {
  var orig = SG.cmd[name], kf = SG.CMD_KEY[name];
  if (!orig) return;
  SG.cmd[name] = function (cid, oid) {
    var args = arguments, key = typeof kf === 'function' ? kf(args) : kf;
    var hp = SG.helpers && SG.helpers.main === oid ? SG.helpers.list : [];
    SG.helpers = null;
    if (SG.cmdUsed(cid, key)) return { ok: false, msg: '이번 달 이 도시에서는 「' + SG.CMD_LABEL[key] + '」을(를) 이미 했습니다 (명령마다 한 달에 한 번)' };
    hp = SG.NO_COOP[key] ? [] : hp.filter(function (x) { return x !== oid && SG.ready(cid, x); });
    SG._coop = hp.length ? { oid: oid, add: SG.coopBonus(hp), n: hp.length } : null;
    var r;
    try { r = orig.apply(this, args); } finally { SG._coop = null; }
    if (r && r.ok) {
      SG.markCmd(cid, key);
      if (hp.length) {
        hp.forEach(function (x) { SG.S.off[x].acted = true; if (SG.cmdLog) SG.cmdLog.push({ oid: x, msg: SG.josa(SG.name(x) + '이(가) ' + SG.name(oid) + '을(를) 도와 ' + SG.CMD_LABEL[key] + '에 힘을 보탰다.'), ok: true }); });
        r.helpers = hp;
        r.msg += ' (협력: ' + hp.map(SG.name).join(', ') + ')';
      }
    }
    return r;
  };
});

// 협력 장수 수만큼 늘어나는 비용 (한 사람마다 +25%)
SG.coopCost = function (base) { return Math.round(base * (1 + SG.COOP_COST * (SG._coop ? SG._coop.n : 0))); };

// 원래 능력 v 에 보탬 add 를 더한 값 (100 위로는 절반, 120 상한, 원래보다 낮아지지는 않음)
SG.coopStat = function (v, add) {
  if (!add) return v;
  var t = v + add, soft = SG.COOP_SOFT;
  if (t > soft) t = Math.max(v, soft) + (t - Math.max(v, soft)) * 0.5;
  return Math.max(v, Math.min(SG.COOP_CAP, Math.round(t)));
};

// 협력 중인 주장은 능력치가 보태진 모습으로 계산된다 (명령 계산 동안만)
SG._oPlain = SG.O;
SG.O = function (id) {
  var o = SG._oPlain(id);
  if (!o || !SG._coop || SG._coop.oid !== id) return o;
  var x = {}, add = SG._coop.add;
  for (var p in o) x[p] = o[p];
  SG.STAT_KEYS.forEach(function (k) { x[k] = SG.coopStat(o[k], add[k] || 0); });
  return x;
};
