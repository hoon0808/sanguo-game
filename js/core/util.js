// 공통 도구: 난수(저장 가능), 숫자 정리, 장수 기본 정보
var SG = SG || {};

SG.VERSION = 1;
SG.STAT_NAMES = ['통솔', '무력', '지력', '정치', '매력'];
SG.SKILLS = {
  '신산': '계략 성공률과 화계 위력이 오른다',
  '무쌍': '일기토에서 강하고 공격력이 오른다',
  '돌격': '공격할 때 피해를 더 준다',
  '철벽': '공격받을 때 피해가 줄어든다',
  '궁신': '두 칸 떨어진 적에게 활을 쏠 수 있다',
  '수군': '강·물 지형에서 불리하지 않다',
  '기마': '이동력이 1 늘어난다',
  '인덕': '민심 안정·징병·등용이 잘 된다',
  '치세': '개발 효과가 크다'
};
// 의형제: 군주가 이 중 한 명이면 나머지는 가족처럼 배신하지 않는다
SG.BONDS = [['liubei', 'guanyu', 'zhangfei']];

SG.COLORS = {
  red: '#C0392B', blue: '#2E5FA8', green: '#2E8B57', yellow: '#C9A227', purple: '#7D3C98', orange: '#D9732B',
  teal: '#1F8A8A', brown: '#8B5A2B', pink: '#C2577A', navy: '#2C3E70', olive: '#7A7A2E', lime: '#7CB342',
  maroon: '#7B2431', cyan: '#2AA6C9', gray: '#6E7378', violet: '#9C6ADE', sand: '#B8955A', slate: '#55707F'
};

// ---- 난수: 상태(state.rng)에 저장되어 불러오기 후에도 이어진다
SG.rng = { s: 123456789 };
SG.seedRng = function (seed) { SG.rng.s = (seed >>> 0) || 1; };
SG.rand = function () {
  var t = (SG.rng.s = (SG.rng.s + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
SG.randInt = function (a, b) { return a + Math.floor(SG.rand() * (b - a + 1)); };
SG.randf = function (a, b) { return a + SG.rand() * (b - a); };
SG.chance = function (p) { return SG.rand() < p; };
SG.pick = function (arr) { return arr[Math.floor(SG.rand() * arr.length)]; };
SG.shuffle = function (arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(SG.rand() * (i + 1));
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
};
SG.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
SG.fmt = function (n) { return Math.round(n).toLocaleString('ko-KR'); };

// ---- 조사 고르기: '조조이(가)' → '조조가', '관우을(를)' → '관우를'
SG.JOSA = { '이(가)': ['이', '가'], '을(를)': ['을', '를'], '은(는)': ['은', '는'], '과(와)': ['과', '와'], '와(과)': ['과', '와'], '(으)로': ['으로', '로'] };
// 숫자로 끝나는 말의 받침 (읽는 소리 기준: 13,000 → 만삼천 → ㄴ, 21 → 이십일 → ㄹ). 0 = 받침 없음, 8 = ㄹ
SG.numJong = function (num) {
  var d = num.replace(/,/g, ''), z = d.length - d.replace(/0+$/, '').length;
  if (z > 0) return 1; // 십·백·천·만 모두 받침
  return [0, 8, 0, 1, 0, 0, 1, 8, 8, 0][+d.charAt(d.length - 1)];
};
SG.josa = function (text) {
  if (!text || text.indexOf('(') < 0) return text;
  return String(text).replace(/([가-힣]|[0-9][0-9,]*)(이\(가\)|을\(를\)|은\(는\)|과\(와\)|와\(과\)|\(으\)로|\(이\))/g, function (m, ch, j) {
    var jong = /^[0-9]/.test(ch) ? SG.numJong(ch) : (ch.charCodeAt(0) - 0xAC00) % 28, pair = SG.JOSA[j];
    if (j === '(으)로') return ch + (jong === 0 || jong === 8 ? '로' : '으로');
    if (j === '(이)') return ch + (jong ? '이' : '');
    return ch + (jong ? pair[0] : pair[1]);
  });
};

// ---- 장수 기본 정보 (OFFICER_LIST 배열 → 객체)
SG.OFFICERS = null;
SG.buildOfficers = function () {
  if (SG.OFFICERS) return;
  SG.OFFICERS = {};
  SG.OFFICER_LIST.forEach(function (r) {
    SG.OFFICERS[r[0]] = {
      id: r[0], n: r[1], h: r[2], za: r[3], b: r[4], d: r[5], home: r[6],
      lead: r[7][0], war: r[7][1], int: r[7][2], pol: r[7][3], cha: r[7][4],
      fa: r[8] || null, sk: r[9] || null
    };
  });
};
SG.O = function (id) { return SG.OFFICERS[id]; };
// 태어난 해·죽는 해 (영웅집결처럼 시나리오가 바꿔 둔 값이 있으면 그것)
SG.born = function (id, S) { S = S || SG.S; return S && S.life && S.life[id] ? S.life[id][0] : SG.OFFICERS[id].b; };
SG.dies = function (id, S) { S = S || SG.S; return S && S.life && S.life[id] ? S.life[id][1] : SG.OFFICERS[id].d; };
SG.name = function (id) { var o = SG.OFFICERS[id]; return o ? o.n : '?'; };
SG.hasSkill = function (id, sk) { var o = SG.OFFICERS[id]; return !!(o && o.sk === sk); };

// 두 장수가 가족(부자·형제)이거나 의형제인지
SG.isKin = function (a, b) {
  if (a === b) return true;
  var A = SG.OFFICERS[a], B = SG.OFFICERS[b];
  if (!A || !B) return false;
  if (A.fa === b || B.fa === a) return true;
  if (A.fa && A.fa === B.fa) return true;
  for (var i = 0; i < SG.BONDS.length; i++) {
    if (SG.BONDS[i].indexOf(a) >= 0 && SG.BONDS[i].indexOf(b) >= 0) return true;
  }
  return false;
};
