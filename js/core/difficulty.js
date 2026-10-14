// 난이도: 컴퓨터 세력의 덤(수입·시작 물자·병력·전투력), 공격 성향, 우리 쪽 등용·충성
// 쉬움 = 예전 그대로. 저장 파일에 난이도가 없으면 쉬움.
var SG = SG || {};

SG.DIFF_KEYS = ['easy', 'normal', 'hard', 'hell'];
SG.DIFFS = {
  easy: { n: '쉬움', h: '易', d: '컴퓨터가 덤 없이 신중하게 움직입니다. 처음 해 보는 분께.',
    inc: 1, start: 1, army: 1, power: 1, need: 0, hunt: 0.95, recruit: 1, loyDrop: 0, scheme: 0 },
  normal: { n: '보통', h: '常', d: '컴퓨터 수입 +20%·시작 물자 +15%·전투력 +5%. 더 과감하게 공격하고 우리를 노립니다.',
    inc: 1.2, start: 1.15, army: 1.15, power: 1.05, need: -0.1, hunt: 1.1, recruit: 0.9, loyDrop: 0, scheme: 0.3 },
  hard: { n: '어려움', h: '難', d: '컴퓨터 수입 +45%·시작 물자 +35%·전투력 +12%. 적 장수를 데려오기 어렵고, 우리 장수 충성이 조금씩 떨어집니다.',
    inc: 1.45, start: 1.35, army: 1.3, power: 1.12, need: -0.2, hunt: 1.3, recruit: 0.75, loyDrop: 0.3, scheme: 1 },
  hell: { n: '지옥', h: '獄', d: '컴퓨터 수입 +80%·시작 물자 +60%·전투력 +20%. 천하가 우리를 노립니다. 충성도 빨리 떨어집니다.',
    inc: 1.8, start: 1.6, army: 1.5, power: 1.2, need: -0.3, hunt: 1.6, recruit: 0.6, loyDrop: 0.6, scheme: 1.3 }
};
SG.diffKey = function () { return SG.S && SG.DIFFS[SG.S.diff] ? SG.S.diff : 'easy'; };
SG.diff = function () { return SG.DIFFS[SG.diffKey()]; };
// 플레이어가 아닌 세력인지 (관전 중에는 모두 같게)
SG.isAI = function (fid) { return !!(fid && SG.S && SG.S.player && fid !== SG.S.player); };
SG.aiMul = function (fid, key) { return SG.isAI(fid) ? SG.diff()[key] : 1; };

// 우리 세력이 등용할 때 성공률이 낮아진다 (가족 등 반드시 오는 경우는 그대로)
SG._recruitPlain = SG.recruitChance;
SG.recruitChance = function (oid, target, fid) {
  var p = SG._recruitPlain(oid, target, fid);
  return SG.S && fid === SG.S.player && p > 0 && p < 1 ? p * SG.diff().recruit : p;
};

// 새 게임에 난이도를 정하고 컴퓨터 도시에 시작 덤을 준다
SG.setDifficulty = function (key, fresh) {
  var S = SG.S;
  S.diff = SG.DIFFS[key] ? key : 'easy';
  if (!fresh) return;
  var m = SG.diff().start;
  if (m === 1) return;
  Object.keys(S.cities).forEach(function (cid) {
    var c = S.cities[cid];
    if (!SG.isAI(c.owner)) return;
    c.gold = Math.round(c.gold * m); c.food = Math.round(c.food * m);
    // 병종 비율은 그대로 두고 병사만 늘린다
    var k = m;
    c.soldiers = Math.round(c.soldiers * k);
    if (c.cav) c.cav = Math.round(c.cav * k);
    if (c.arc) c.arc = Math.round(c.arc * k);
    if (c.tTot) c.tTot = c.soldiers;
  });
};
