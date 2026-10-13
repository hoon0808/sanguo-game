// 명령 장면: 어떤 명령을 내리든 그 일을 하는 장면(논밭·시장·성벽·마을·연병장·길·밤거리·대전)이 나오고,
// 장수가 한마디 한 뒤 바뀐 수치가 가운데에 크게 뜬다 (전→후, 늘고 준 만큼).
// 메뉴에서 장면을 끄면 장면 없이 결과 카드만 가운데에 잠깐 뜬다.
var SG = SG || {};

SG.UI.scenesOn = function () { try { return localStorage.getItem('sanguo_scenes') !== 'off'; } catch (e) { return true; } };
SG.UI.setScenes = function (on) { try { localStorage.setItem('sanguo_scenes', on ? 'on' : 'off'); } catch (e) { /* 무시 */ } };

SG.UI.CITY_FIELDS = [['gold', '금'], ['food', '식량'], ['soldiers', '병사'], ['inf', '보병'], ['cav', '기병'], ['arc', '궁병'], ['agri', '농업'], ['comm', '상업'], ['wall', '성벽'], ['loyal', '민심'], ['train', '훈련'], ['morale', '사기'], ['pop', '인구']];

// 명령별 장면: 배경, 장수 대사(능력에 따라 둘 중 하나), 효과음
SG.UI.CMD_SCENES = {
  agri: { bg: 'field', lines: ['논밭을 넓히고 물길을 정비하겠습니다. 올가을엔 곳간이 넘칠 것입니다.', '백성들과 함께 황무지를 일구겠습니다!'], sfx: 'harvest' },
  comm: { bg: 'market', lines: ['시장을 열고 먼 곳의 상인들까지 불러 모으겠습니다.', '길을 닦고 세금을 가볍게 하면 장사꾼이 모여듭니다.'], sfx: 'coin' },
  trade: { bg: 'market', lines: ['좋은 값에 거래하고 오겠습니다. 장사꾼들과 흥정이라면 자신 있습니다.', '저울을 속이는 자는 없는지 잘 살피며 사고팔겠습니다.'], sfx: 'coin' },
  wall: { bg: 'wall', lines: ['무너진 곳을 메우고 성벽을 한 자 더 높이겠습니다.', '돌을 나르고 흙을 다져라! 적이 넘보지 못하게!'], sfx: 'drum' },
  relief: { bg: 'village', lines: ['곳간을 열어 굶주린 백성부터 돌보겠습니다.', '백성이 편안해야 나라가 섭니다. 다녀오겠습니다.'], sfx: 'harvest' },
  conscript: { bg: 'drill', lines: ['용감한 젊은이들을 모아 오겠습니다!', '나라를 지킬 장정들이여, 깃발 아래로 모여라!'], sfx: 'drum' },
  train: { bg: 'drill', lines: ['오늘부터 혹독하게 훈련시키겠습니다!', '창을 들어라! 대열을 맞춰라! 다시!'], sfx: 'drum' },
  search: { bg: 'road', lines: ['숨은 인재를 찾아 길을 나서겠습니다.', '산속 초가까지 샅샅이 찾아보겠습니다.'], sfx: 'found' },
  recruit: { bg: 'road', lines: ['제가 직접 찾아가 설득해 보겠습니다.', '진심을 다하면 마음이 움직일 것입니다.'], sfx: 'recruit' },
  reward: { bg: 'hall', lines: ['이 은혜, 목숨을 바쳐 갚겠습니다!', '황공하옵니다. 더욱 힘써 섬기겠습니다.'], sfx: 'coin', speaker: 'target' },
  move: { bg: 'road', lines: ['짐을 꾸려 곧 출발하겠습니다. 그곳에서 주공을 위해 힘쓰겠습니다.', '말을 내라! 해 지기 전에 닿아야 한다.'], sfx: 'march' },
  transport: { bg: 'road', lines: ['수레를 몰아 실어다 주고 곧 돌아오겠습니다.', '짐을 단단히 묶어라! 한 톨도 흘리지 말고 전하고 오자.'], sfx: 'march' },
  rumor: { bg: 'night', lines: ['밤을 틈타 저잣거리에 헛소문을 퍼뜨리고 오겠습니다.', '말 한마디가 칼보다 무섭지요. 흐흐.'], sfx: 'confuse' },
  sow: { bg: 'night', lines: ['적의 마음에 의심의 씨앗을 심어 두지요.', '그자의 주군이 그를 의심하게 만들겠습니다.'], sfx: 'confuse' },
  gift: { bg: 'hall', lines: ['예물을 갖추어 사신으로 다녀오겠습니다.', '좋은 이웃이 되자고 잘 전하겠습니다.'], sfx: 'coin' },
  ally: { bg: 'hall', lines: ['동맹을 맺고 돌아오겠습니다.', '공동의 적 앞에서 손을 잡자고 설득하겠습니다.'], sfx: 'found' },
  demand: { bg: 'hall', lines: ['항복하는 것이 살 길임을 깨우쳐 주고 오겠습니다.', '싸우지 않고 이기는 것이 으뜸이지요.'], sfx: 'win' }
};
// 재해: 태수가 와서 아뢴다
Object.assign(SG.UI.CMD_SCENES, {
  locust: { bg: 'locust', lines: ['주공, 메뚜기 떼가 하늘을 덮었습니다! 논밭이 남아나질 않습니다…'], sfx: 'fail' },
  plague: { bg: 'plague', lines: ['역병이 돌아 백성과 병사들이 쓰러지고 있습니다. 의원을 모으고 있습니다만…'], sfx: 'lose' },
  flood: { bg: 'flood', lines: ['큰비에 강둑이 터졌습니다! 논밭이 물에 잠기고 성벽 한쪽이 무너졌습니다.'], sfx: 'broken' },
  drought: { bg: 'drought', lines: ['몇 달째 비 한 방울 오지 않습니다. 땅이 쩍쩍 갈라졌습니다.'], sfx: 'fail' },
  quake: { bg: 'quake', lines: ['땅이 울부짖듯 흔들렸습니다! 성벽과 집들이 무너졌습니다.'], sfx: 'broken' },
  bumper: { bg: 'bumper', lines: ['주공, 경사입니다! 올해는 이삭이 고개를 못 들 만큼 풍년입니다.'], sfx: 'harvest' },
  riot: { bg: 'riot', lines: ['백성들이 횃불을 들고 관아로 몰려왔습니다! 민심을 돌보지 않으면 또 일어날 것입니다.'], sfx: 'fire' }
});
SG.UI.CMD_TITLE = { locust: '메뚜기 떼', plague: '역병', flood: '홍수', drought: '가뭄', quake: '지진', bumper: '풍년', riot: '반란', attack: '출진', agri: '농업 개발', comm: '상업 개발', wall: '성벽 보수', relief: '민심 안정', conscript: '징병', train: '훈련', search: '인재 탐색', recruit: '등용', reward: '포상',
  move: '이동', transport: '수송', trade: '교역', rumor: '유언비어', sow: '이간', gift: '친선', ally: '동맹', demand: '항복 권고' };

// ---- 배경 그림
SG.UI.DISASTER_BASE = { locust: 'field', bumper: 'field', flood: 'field', drought: 'field', plague: 'village', riot: 'village', quake: 'wall' };
// 그린 배경 그림이 있는 장면 (img/scene/<이름>.jpg, Higgsfield 로 그림). 없으면 아래 SVG 로 그린다
SG.UI.SCENE_IMG = { field: 1, market: 1, wall: 1, village: 1, drill: 1, road: 1, night: 1,
  field2: 1, field3: 1, market2: 1, market3: 1, trade1: 1, trade2: 1, wall2: 1, wall3: 1, village2: 1, village3: 1,
  drill2: 1, drill3: 1, drill4: 1, road2: 1, road3: 1, road4: 1, road5: 1, road6: 1, night2: 1, night3: 1 };
// 명령마다 그림 여러 장을 돌아가며 보여 준다 (같은 명령을 연달아 내려도 다른 그림)
SG.UI.CMD_IMGS = {
  agri: ['field', 'field2', 'field3'], comm: ['market', 'market2', 'market3'], trade: ['trade1', 'trade2', 'market2'],
  wall: ['wall', 'wall2', 'wall3'], relief: ['village', 'village2', 'village3'],
  conscript: ['drill2', 'drill', 'drill4'], train: ['drill', 'drill3', 'drill4'],
  search: ['road', 'road2', 'road3'], recruit: ['road4', 'road2', 'road3'], move: ['road', 'road5'], transport: ['road6', 'road5'],
  rumor: ['night', 'night2', 'night3'], sow: ['night2', 'night3', 'night'],
  reward: ['hall', 'hall2'], gift: ['hall2', 'hall3', 'hall'], ally: ['hall3', 'hall'], demand: ['hall', 'hall2']
};
SG.UI._imgNext = {};
function sceneNext(kind) {
  var L = SG.UI.CMD_IMGS[kind];
  if (SG.UI._imgNext[kind] == null) SG.UI._imgNext[kind] = Math.floor(Math.random() * L.length);
  return L[SG.UI._imgNext[kind] % L.length];
}
function preloadScene(k) { (new Image()).src = 'img/scene/' + k + '.jpg'; }
// 이번에 쓸 그림을 고르고, 다음 그림을 미리 받아 둔다
SG.UI.sceneImg = function (kind, bg) {
  if (!SG.UI.CMD_IMGS[kind]) return bg;
  var k = sceneNext(kind);
  SG.UI._imgNext[kind]++;
  preloadScene(sceneNext(kind));
  return k;
};
// 처음 장면이 열릴 때 그림이 늦게 뜨지 않도록 명령마다 첫 그림을 미리 받아 둔다
window.addEventListener('load', function () {
  setTimeout(function () {
    var seen = { audience: 1 };
    Object.keys(SG.UI.CMD_IMGS).forEach(function (kind) { seen[sceneNext(kind)] = 1; });
    Object.keys(seen).forEach(preloadScene);
  }, 1500);
});
SG.UI.sceneBackdrop = function (bg0, color) {
  var bg = SG.UI.DISASTER_BASE[bg0] || bg0;
  if (SG.UI.SCENE_IMG[bg]) {
    return '<svg class="cs-bg" viewBox="0 0 1100 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<image href="img/scene/' + bg + '.jpg" x="0" y="0" width="1100" height="500" preserveAspectRatio="xMidYMid slice"/>' +
      SG.UI.disasterOverlay(bg0) + '</svg>';
  }
  var night = bg === 'night' || bg0 === 'riot', s = '<svg class="cs-bg" viewBox="0 0 1100 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>' +
    '<linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1">' + (night ? '<stop offset="0" stop-color="#0d1430"/><stop offset=".7" stop-color="#2a3358"/>' : '<stop offset="0" stop-color="#8fb7d8"/><stop offset=".7" stop-color="#f3e2b8"/>') + '</linearGradient></defs>' +
    '<rect width="1100" height="500" fill="url(#cs-sky)"/>';
  if (night) {
    s += '<circle cx="860" cy="90" r="38" fill="#f6efcf"/><circle cx="846" cy="82" r="38" fill="#2a3358" opacity=".25"/>';
    for (var st = 0; st < 40; st++) s += '<circle cx="' + ((st * 197) % 1100) + '" cy="' + ((st * 61) % 200) + '" r="' + (1 + st % 2) + '" fill="#fff" opacity=".7"/>';
  } else s += '<circle cx="200" cy="90" r="46" fill="#fff6d8" opacity=".9"/><ellipse cx="520" cy="80" rx="120" ry="18" fill="#fff" opacity=".6"/><ellipse cx="860" cy="120" rx="90" ry="14" fill="#fff" opacity=".5"/>';
  s += '<path d="M0 250 L120 190 L240 230 L360 170 L480 220 L620 180 L760 225 L900 175 L1100 230 L1100 300 L0 300Z" fill="' + (night ? '#1c2440' : '#7d93a6') + '" opacity=".7"/>';
  var ground = night ? '#1a1c22' : '#9aa56a';
  if (bg === 'field') {
    s += '<rect y="270" width="1100" height="230" fill="#7fa04e"/>';
    for (var r = 0; r < 9; r++) s += '<path d="M0 ' + (282 + r * 26) + ' Q550 ' + (272 + r * 26) + ' 1100 ' + (282 + r * 26) + '" stroke="' + (r % 2 ? '#5f8a3a' : '#a8c46a') + '" stroke-width="' + (6 + r * 2) + '" fill="none"/>';
    [[700, 330], [820, 360], [930, 320], [610, 400]].forEach(function (p) { s += SG.UI.figSvg(p[0], p[1], 1, '#6a5a3a', 'hat'); });
    s += '<g transform="translate(980 250)"><circle r="40" fill="none" stroke="#6b4a2a" stroke-width="6"/><path d="M-40 0H40M0 -40V40M-28 -28L28 28M28 -28L-28 28" stroke="#6b4a2a" stroke-width="4"/></g>';
  } else if (bg === 'market') {
    s += '<rect y="290" width="1100" height="210" fill="#b9a27a"/>';
    for (var m = 0; m < 6; m++) {
      var x = 40 + m * 175, col = ['#b2382c', '#2c6b5e', '#c08a2a'][m % 3];
      s += '<rect x="' + x + '" y="240" width="140" height="70" fill="#8a6a42" stroke="#4a3520" stroke-width="2"/>' +
        '<path d="M' + (x - 12) + ' 240 L' + (x + 70) + ' 205 L' + (x + 152) + ' 240Z" fill="' + col + '"/>' +
        '<path d="M' + (x - 12) + ' 240 h164" stroke="#fff" stroke-width="3" stroke-dasharray="14 10"/>' +
        '<circle cx="' + (x + 20) + '" cy="258" r="9" fill="#e0502e"/><circle cx="' + (x + 120) + '" cy="258" r="9" fill="#e0502e"/>' +
        '<rect x="' + (x + 30) + '" y="285" width="80" height="16" fill="#d8b46a"/>';
    }
    [[150, 380], [330, 400], [520, 370], [690, 410], [880, 385], [1000, 420]].forEach(function (p, i) { s += SG.UI.figSvg(p[0], p[1], 1.1, ['#4a5a7a', '#7a4a3a', '#5a6a3a'][i % 3]); });
  } else if (bg === 'wall') {
    s += '<rect y="330" width="1100" height="170" fill="' + ground + '"/>';
    s += '<rect x="80" y="150" width="940" height="190" fill="#a8977a" stroke="#4a3e2a" stroke-width="3"/>';
    for (var b = 0; b < 32; b++) s += '<rect x="' + (84 + b * 29.3) + '" y="128" width="18" height="22" fill="#9a8a6c" stroke="#4a3e2a"/>';
    for (var y = 0; y < 6; y++) for (var x2 = 0; x2 < 16; x2++) s += '<rect x="' + (80 + x2 * 59 + (y % 2) * 29) + '" y="' + (150 + y * 32) + '" width="59" height="32" fill="none" stroke="#7a6a50" stroke-width="1"/>';
    s += '<path d="M640 340 V170 M700 340 V170 M640 220 H700 M640 280 H700" stroke="#6b4a2a" stroke-width="6"/><path d="M380 150 l40 0 l-10 60 l-30 0z" fill="#7a6a50"/>';
    [[560, 380], [760, 400], [880, 370], [660, 210]].forEach(function (p) { s += SG.UI.figSvg(p[0], p[1], 1.1, '#6a5a3a', 'hat'); });
  } else if (bg === 'village') {
    s += '<rect y="290" width="1100" height="210" fill="' + ground + '"/>';
    [[90, 230], [330, 250], [800, 235]].forEach(function (p) {
      s += '<rect x="' + p[0] + '" y="' + p[1] + '" width="170" height="80" fill="#c8b48a" stroke="#5a4a30" stroke-width="2"/>' +
        '<path d="M' + (p[0] - 20) + ' ' + p[1] + ' L' + (p[0] + 85) + ' ' + (p[1] - 55) + ' L' + (p[0] + 190) + ' ' + p[1] + 'Z" fill="#8a6a3a" stroke="#5a4a30" stroke-width="2"/>' +
        '<rect x="' + (p[0] + 70) + '" y="' + (p[1] + 34) + '" width="30" height="46" fill="#4a3a28"/>';
    });
    for (var k = 0; k < 6; k++) s += '<ellipse cx="' + (560 + k * 34) + '" cy="' + (360 - (k % 2) * 16) + '" rx="22" ry="17" fill="#d8c08a" stroke="#8a6a3a"/>';
    [[560, 420], [640, 430], [720, 415], [480, 410], [940, 420]].forEach(function (p, i) { s += SG.UI.figSvg(p[0], p[1], 1, ['#7a6a4a', '#5a6a5a', '#8a5a4a'][i % 3]); });
  } else if (bg === 'drill') {
    s += '<rect y="290" width="1100" height="210" fill="#b8a578"/>';
    for (var rr = 0; rr < 4; rr++) for (var kk = 0; kk < 14; kk++) {
      var sx = 330 + kk * 50 + rr * 12, sy = 330 + rr * 34, sc = 0.9 + rr * 0.15;
      s += '<g transform="translate(' + sx + ' ' + sy + ') scale(' + sc + ')"><line x1="7" y1="-40" x2="7" y2="2" stroke="#3a2a18" stroke-width="2"/><path d="M7 -46 l3 7 h-6z" fill="#ddd"/>' +
        '<rect x="-7" y="-20" width="14" height="22" rx="3" fill="' + color + '"/><circle cx="0" cy="-26" r="6" fill="#d9b48a"/><path d="M-7 -29 q7 -9 14 0z" fill="#3a3326"/></g>';
    }
    s += '<g transform="translate(180 360)"><rect x="-46" y="-40" width="92" height="70" rx="10" fill="#9a2a1e" stroke="#4a1a10" stroke-width="4"/><ellipse cx="0" cy="-40" rx="46" ry="12" fill="#e8d6b0" stroke="#4a1a10" stroke-width="3"/><line x1="-60" y1="-90" x2="-20" y2="-48" stroke="#5a3a20" stroke-width="5"/></g>';
    [300, 1040].forEach(function (x) { s += '<line x1="' + x + '" y1="190" x2="' + x + '" y2="320" stroke="#3a2a18" stroke-width="4"/><path class="fs-flag" d="M' + x + ' 190 q34 -6 62 6 l-9 14 l9 14 q-30 -10 -62 -4z" fill="' + color + '"/>'; });
  } else if (bg === 'road') {
    s += '<rect y="280" width="1100" height="220" fill="#8ea05e"/><path d="M420 500 Q520 380 600 300 T720 270 L760 270 Q690 320 640 380 T560 500Z" fill="#cdb98a"/>';
    [[120, 300], [230, 330], [880, 290], [980, 320], [320, 280]].forEach(function (p) { s += '<rect x="' + (p[0] - 5) + '" y="' + (p[1] - 10) + '" width="10" height="40" fill="#5a4028"/><circle cx="' + p[0] + '" cy="' + (p[1] - 30) + '" r="34" fill="#4f7a3e"/><circle cx="' + (p[0] + 18) + '" cy="' + (p[1] - 18) + '" r="24" fill="#5f8a4a"/>'; });
    s += '<g transform="translate(700 330)"><rect x="-50" y="-30" width="100" height="40" fill="#8a6a3a" stroke="#4a3520" stroke-width="3"/><circle cx="-30" cy="14" r="16" fill="none" stroke="#3a2a18" stroke-width="5"/><circle cx="30" cy="14" r="16" fill="none" stroke="#3a2a18" stroke-width="5"/><rect x="-40" y="-52" width="80" height="22" fill="#c8a46a"/></g>';
    s += '<path d="M760 268 l14 -30 l14 30z" fill="#9a8a6c"/>';
  } else if (bg === 'night') {
    s += '<rect y="300" width="1100" height="200" fill="#14161c"/>';
    for (var n = 0; n < 7; n++) {
      var hx = 20 + n * 160, hh = 90 + (n * 37) % 60;
      s += '<rect x="' + hx + '" y="' + (300 - hh) + '" width="140" height="' + hh + '" fill="#22252f"/><path d="M' + (hx - 14) + ' ' + (300 - hh) + ' L' + (hx + 70) + ' ' + (300 - hh - 40) + ' L' + (hx + 154) + ' ' + (300 - hh) + 'Z" fill="#191b23"/>' +
        '<rect x="' + (hx + 30) + '" y="' + (320 - hh) + '" width="22" height="18" fill="' + (n % 2 ? '#f0b85a' : '#2f3240') + '" opacity=".9"/><rect x="' + (hx + 88) + '" y="' + (320 - hh) + '" width="22" height="18" fill="' + (n % 3 ? '#2f3240' : '#f0b85a') + '" opacity=".9"/>';
    }
    s += '<circle cx="640" cy="300" r="10" fill="#e0502e"/><circle cx="640" cy="300" r="40" fill="#e0502e" opacity=".15"/>';
    [[600, 410], [690, 420], [760, 400]].forEach(function (p) { s += SG.UI.figSvg(p[0], p[1], 1.1, '#0e0f14'); });
  }
  s += SG.UI.disasterOverlay(bg0);
  return s + '</svg>';
};
SG.UI.disasterOverlay = function (k) {
  var s = '', i;
  if (k === 'locust') {
    s += '<rect width="1100" height="500" fill="#3a3010" opacity=".25"/><g class="cs-swarm">';
    for (i = 0; i < 260; i++) { var x = (i * 89) % 1100, y = 40 + (i * 53) % 330; s += '<ellipse cx="' + x + '" cy="' + y + '" rx="3.2" ry="1.4" fill="#2a2208" transform="rotate(' + ((i * 37) % 180) + ' ' + x + ' ' + y + ')"/>'; }
    s += '</g>';
  } else if (k === 'bumper') {
    s += '<rect y="270" width="1100" height="230" fill="#e2b84a" opacity=".55"/>';
    for (i = 0; i < 70; i++) { var bx = (i * 61) % 1100, by = 300 + (i * 29) % 190; s += '<path d="M' + bx + ' ' + by + ' q4 -18 0 -30 M' + bx + ' ' + (by - 30) + ' q8 4 6 14" stroke="#b8862a" stroke-width="2.5" fill="none"/>'; }
    s += '<circle cx="200" cy="90" r="70" fill="#fff2b0" opacity=".45"/>';
  } else if (k === 'flood') {
    s += '<rect width="1100" height="500" fill="#4a5a6a" opacity=".35"/><g class="cs-water"><path d="M0 300 Q140 285 280 300 T560 300 T840 300 T1120 300 L1120 500 L0 500Z" fill="#6f8fa3" opacity=".9"/>' +
      '<path d="M0 330 Q140 318 280 330 T560 330 T840 330 T1120 330" stroke="#c8dbe6" stroke-width="3" fill="none" opacity=".7"/><path d="M0 380 Q140 368 280 380 T560 380 T840 380 T1120 380" stroke="#c8dbe6" stroke-width="3" fill="none" opacity=".5"/></g>';
    for (i = 0; i < 50; i++) s += '<line x1="' + ((i * 97) % 1100) + '" y1="' + ((i * 41) % 260) + '" x2="' + ((i * 97) % 1100 - 8) + '" y2="' + ((i * 41) % 260 + 26) + '" stroke="#c8dbe6" stroke-width="1.5" opacity=".6"/>';
  } else if (k === 'drought') {
    s += '<rect y="270" width="1100" height="230" fill="#c9a66b"/><rect width="1100" height="270" fill="#f0c070" opacity=".35"/><circle cx="200" cy="90" r="80" fill="#fff0b0" opacity=".6"/>';
    for (i = 0; i < 40; i++) { var cx = (i * 113) % 1100, cy = 290 + (i * 47) % 200; s += '<path d="M' + cx + ' ' + cy + ' l18 8 l-6 14 l22 6 M' + (cx + 18) + ' ' + (cy + 8) + ' l14 -10" stroke="#7a5a30" stroke-width="2" fill="none"/>'; }
  } else if (k === 'plague') {
    s += '<rect width="1100" height="500" fill="#3a4a3a" opacity=".35"/><ellipse cx="550" cy="330" rx="620" ry="120" fill="#a8b89a" opacity=".35"/>';
  } else if (k === 'quake') {
    s += '<path d="M300 150 l30 60 l-20 40 l40 50 l-10 40 M700 150 l-20 50 l30 40 l-30 60 M520 340 l60 40 l80 -10 l60 50" stroke="#2a2014" stroke-width="5" fill="none"/>';
    for (i = 0; i < 14; i++) s += '<rect x="' + (300 + (i * 53) % 500) + '" y="' + (350 + (i * 17) % 60) + '" width="' + (16 + i % 3 * 8) + '" height="12" fill="#9a8a6c" stroke="#4a3e2a" transform="rotate(' + (i * 23 % 40 - 20) + ')"/>';
  } else if (k === 'riot') {
    s += '<rect width="1100" height="500" fill="#1a1020" opacity=".55"/>';
    [[480, 400], [560, 420], [640, 395], [720, 425], [800, 405]].forEach(function (p) {
      s += '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + (p[0] + 6) + '" y2="' + (p[1] - 70) + '" stroke="#5a3a20" stroke-width="4"/><path class="cs-fire" d="M' + (p[0] + 6) + ' ' + (p[1] - 70) + ' q-12 -14 0 -34 q12 20 0 34z" fill="#f08a2e"/><circle cx="' + (p[0] + 6) + '" cy="' + (p[1] - 82) + '" r="26" fill="#f0a040" opacity=".25"/>';
    });
  }
  return s;
};
// 작은 사람 그림 (일하는 백성·병사)
SG.UI.figSvg = function (x, y, k, col, hat) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><path d="M-12 20 q12 -40 24 0z" fill="' + col + '"/><circle cx="0" cy="-26" r="8" fill="#d9b48a"/>' +
    (hat ? '<path d="M-16 -28 L0 -40 L16 -28z" fill="#c8a45a"/>' : '<path d="M-8 -30 q8 -10 16 0z" fill="#2a2018"/>') + '</g>';
};

// ---- 바뀐 수치 모으기
SG.UI.snapshot = function (o) {
  var S = SG.S, snap = { c: {}, loy: {}, fr: null, st: {} };
  (o.cities || []).forEach(function (cid) {
    var c = S.cities[cid], tp = SG.troops(c, cid); snap.c[cid] = {};
    SG.UI.CITY_FIELDS.forEach(function (f) { snap.c[cid][f[0]] = f[0] in tp ? tp[f[0]] : c[f[0]]; });
    snap.c[cid].owner = c.owner;
  });
  snap.at = {};
  (o.offs || []).forEach(function (oid) { snap.loy[oid] = S.off[oid].loy; snap.st[oid] = S.off[oid].s + '/' + S.off[oid].f; snap.at[oid] = S.off[oid].c; });
  if (o.fid && S.player) snap.fr = SG.rel(S.cities[o.cid].owner, o.fid).fr;
  return snap;
};
SG.UI.diff = function (o, a) {
  var S = SG.S, b = SG.UI.snapshot(o), rows = [], multi = (o.cities || []).length > 1;
  (o.cities || []).forEach(function (cid) {
    SG.UI.CITY_FIELDS.forEach(function (f) {
      var x = a.c[cid][f[0]], y = b.c[cid][f[0]];
      if (x !== y) rows.push({ label: (multi || cid !== o.cid ? SG.cityName(cid) + ' ' : '') + f[1], from: x, to: y, enemy: !!S.player && b.c[cid].owner !== S.player });
    });
    if (a.c[cid].owner !== b.c[cid].owner) rows.push({ label: SG.cityName(cid), text: SG.forceName(b.c[cid].owner) + ' 세력의 땅이 되었다' });
  });
  (o.offs || []).forEach(function (oid) {
    if (a.loy[oid] !== b.loy[oid] && S.off[oid].s === 'force') rows.push({ label: SG.name(oid) + ' 충성', from: a.loy[oid], to: b.loy[oid], oid: oid });
    if (a.st[oid] !== b.st[oid] && S.off[oid].s === 'force' && S.off[oid].f === S.player) rows.push({ label: '새 장수', text: SG.name(oid) + ' 합류!', oid: oid });
    else if (a.at[oid] !== S.off[oid].c && S.off[oid].s === 'force') rows.push({ label: SG.name(oid), text: SG.cityName(a.at[oid]) + ' → ' + SG.cityName(S.off[oid].c), oid: oid });
  });
  if (a.fr !== null) { var fr = SG.rel(S.cities[o.cid].owner, o.fid).fr; if (fr !== a.fr) rows.push({ label: SG.forceName(o.fid) + ' 우호도', from: a.fr, to: fr }); }
  if (o.fid && S.player && SG.isAlly(S.player, o.fid) && o.kind === 'ally') rows.push({ label: '동맹', text: SG.forceName(o.fid) + ' 세력과 ' + SG.rel(S.player, o.fid).ally + '개월 동맹' });
  return rows;
};

// ---- 결과 카드 (가운데에 크게)
SG.UI.resultCard = function (o, r, rows) {
  var ok = r.success !== false;
  var card = h('div', { class: 'res-card ' + (ok ? 'ok' : 'ng') }, [
    h('div', { class: 'rc-head' }, [h('span', { class: 'rc-stamp', text: r.stamp || (r.item ? '寶' : '') || (o.kind === 'attack' ? (ok ? '勝' : '敗') : (ok ? '成' : '敗')) }), h('div', null, [h('b', { text: r.title || (r.item ? SG.ITEM_KIND[SG.ITEMS[r.item].k] + ' 발견!' : '') || ((SG.UI.CMD_TITLE[o.kind] || '명령') + (ok ? ' 완료' : ' 실패')) }), h('small', { text: r.msg })])]),
    rows.length ? h('div', { class: 'rc-rows' }, rows.slice(0, 7).map(function (x, i) {
      var row = h('div', { class: 'rc-row', style: { animationDelay: (0.15 + i * 0.1) + 's' } }, [
        x.oid ? SG.UI.portrait(x.oid, 30) : null, h('span', { class: 'rc-k', text: x.label })]);
      if (x.text) row.appendChild(h('span', { class: 'rc-text', text: x.text }));
      else {
        var d = x.to - x.from, to = h('b', { class: 'rc-to', text: SG.fmt(x.from) });
        row.appendChild(h('span', { class: 'rc-v' }, [h('span', { class: 'rc-from', text: SG.fmt(x.from) }), h('i', { text: '→' }), to]));
        row.appendChild(h('span', { class: 'rc-d ' + ((d > 0) !== !!x.enemy ? 'up' : 'down'), text: (d > 0 ? '+' : '−') + SG.fmt(Math.abs(d)) }));
        // 숫자가 차오르듯
        var t0 = null, from = x.from;
        requestAnimationFrame(function step(ts) {
          if (!t0) t0 = ts + 250 + i * 100;
          var p = SG.clamp((ts - t0) / 650, 0, 1);
          to.textContent = SG.fmt(Math.round(from + d * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(step);
        });
      }
      return row;
    })) : null,
    r.helpers && r.helpers.length ? h('div', { class: 'rc-help' }, [h('span', { text: '협력' })].concat(r.helpers.map(function (x) { return h('span', { class: 'rc-hp' }, [SG.UI.portrait(x, 30), SG.name(x)]); }))) : null,
    r.item ? h('div', { class: 'rc-item k-' + SG.ITEMS[r.item].k }, [SG.UI.itemImg(r.item, 96), h('div', null, [h('b', null, [h('span', { class: 'it-kind', text: SG.ITEM_KIND[SG.ITEMS[r.item].k] }), SG.ITEMS[r.item].n, h('small', { text: ' ' + SG.ITEMS[r.item].h })]), h('span', { class: 'it-bonus', text: SG.itemBonusText(r.item) }), h('span', { class: 'it-desc', text: SG.ITEMS[r.item].d })])]) : null,
    (r.found && r.found.length) ? h('div', { class: 'rc-found' }, r.found.map(function (oid) { return h('div', null, [SG.UI.portrait(oid, 64), h('span', { text: SG.name(oid) })]); })) : null
  ]);
  return card;
};

// ---- 명령 실행 + 장면. o: {kind, cid, oid, run: () => r, cities, offs, fid, target(목표 도시 등 대사용)}
SG.UI.doCmd = async function (o) {
  var before = SG.UI.snapshot(o);
  var hp = (SG.UI.pendingHelpers || []).filter(function (x) { return x !== o.oid; });
  SG.UI.pendingHelpers = null;
  if (hp.length) SG.setHelpers(o.oid, hp);
  var r;
  try { r = o.run(); } finally { SG.helpers = null; }
  if (!r) return r;
  if (!r.ok) { SG.UI.toast(r.msg, true); return r; }
  SG.log(SG.S.player, r.msg, 'mine');
  var rows = SG.UI.diff(o, before);
  SG.UI.noteDelta(o, before);
  SG.UI.noteStaff(o, before, r);
  SG.UI.noteAct(o, r, rows);
  var meta = SG.UI.CMD_SCENES[o.kind] || { bg: 'hall', lines: ['다녀오겠습니다.'], sfx: 'ok' };
  // 지도의 그 도시 위로도 한 줄 (돈·식량 말고 가장 중요한 변화)
  function floatIt() {
    if (r.found && r.found.length && SG.UI.state.map) return SG.UI.state.map.floatText(o.cid, '인재 발견: ' + r.found.map(SG.name).join(', '), true);
    var main = rows.filter(function (x) { return x.text; })[0] || rows.filter(function (x) { return !x.text && !/금$|식량$/.test(x.label); })[0] || rows[0];
    if (!main || !SG.UI.state.map) return;
    SG.UI.state.map.floatText(o.cid, main.text ? main.text : main.label + ' ' + (main.to > main.from ? '+' : '−') + SG.fmt(Math.abs(main.to - main.from)),
      main.text ? true : (main.to > main.from) !== !!main.enemy);
  }
  if (!SG.UI.scenesOn()) {
    SG.UI.sfx(r.success === false ? 'fail' : meta.sfx);
    SG.UI.bigResult(SG.UI.resultCard(o, r, rows), null, floatIt);
  } else {
    await SG.UI.cmdScene(o, r, rows, meta);
    setTimeout(floatIt, 150);
  }
  return r;
};

// 장면 없이 가운데 결과 카드만 잠깐
SG.UI.bigResult = function (card, ms, onClose) {
  var old = document.querySelector('.res-float');
  if (old) old.remove();
  var wrap = h('div', { class: 'res-float' }, [card]), done = false;
  function close() {
    if (done) return; done = true;
    wrap.classList.add('out');
    setTimeout(function () { wrap.remove(); if (document.getElementById('topbar')) SG.UI.refresh(); if (onClose) onClose(); }, 300);
  }
  wrap.addEventListener('click', close);
  document.body.appendChild(wrap);
  setTimeout(close, ms || 2600);
}

SG.UI.cmdScene = function (o, r, rows, meta) {
  var S = SG.S, P = S.player, F = S.forces[P];
  var speaker = meta.speaker === 'target' && o.offs && o.offs[0] ? o.offs[0] : o.oid;
  var o2 = SG.O(speaker), line = meta.lines[(o2.int + o2.war) % meta.lines.length];
  var txt = h('div', { class: 'dlg-t' });
  var dlg = h('div', { class: 'dlg' }, [h('div', { class: 'dlg-who' }, [o2.n, h('small', { text: SG.forceName(P) + ' · ' + SG.cityName(o.cid) })]), txt, h('i', { class: 'dlg-more' })]);
  var bgEl, pic = SG.UI.sceneImg(o.kind, meta.bg);
  if (meta.bg === 'hall') {
    var curtain = h('div', { class: 'hall-curtain' }); curtain.style.setProperty('--host', F.color);
    bgEl = h('div', { class: 'cs-hall' }, [h('div', { class: 'hall-bg', style: { backgroundImage: 'url(img/scene/' + pic + '.jpg)' } }), curtain]);
  } else bgEl = h('div', { class: 'cs-sky', html: SG.UI.sceneBackdrop(pic, F.color) });
  var card = SG.UI.resultCard(o, r, rows);
  var stage = h('div', { class: 'cmd-scene bg-' + meta.bg }, [bgEl,
    h('div', { class: 'cs-who' }, [SG.UI.portrait(speaker, 210, P), h('div', { class: 'v-name' }, [o2.n, h('small', { text: SG.UI.CMD_TITLE[o.kind] })])]),
    h('div', { class: 'cs-card' }, [card]), dlg]);
  var full = SG.josa(line), i = 0, timer = null, shown = false;
  function showCard() {
    if (shown) return; shown = true;
    if (timer) { clearInterval(timer); timer = null; }
    txt.textContent = full; dlg.classList.add('done');
    stage.classList.add('show-card');
    SG.UI.sfx(r.success === false ? 'fail' : meta.sfx);
  }
  stage.addEventListener('click', showCard);
  return SG.UI.modal({ title: SG.UI.CMD_TITLE[o.kind] + ' — ' + o2.n, size: 'scene', tone: 'cmdscene', icon: (SG.UI.CMD_META[SG.UI.CMD_TITLE[o.kind]] || ['order'])[0], body: stage, cancel: true,
    buttons: [{ label: '확인', value: true, cls: 'primary' }],
    onOpen: function () {
      timer = setInterval(function () {
        i += 2; txt.textContent = full.slice(0, i);
        if (i >= full.length) { clearInterval(timer); timer = null; setTimeout(showCard, 350); }
      }, 26);
    } }).then(function (v) { if (timer) clearInterval(timer); return v; });
};

// ---- 도시 장부에 바로 보이게: 이번 달에 명령으로 바뀐 양을 도시·항목별로 모아 둔다
// deltas.c[cid][field] = 이번 달 합계, deltas.last[cid][field] = [전, 후] (방금 바뀐 것: 장부에서 한 번 움직여 보인다)
SG.UI.deltas = function () {
  var S = SG.S, key = S.year * 12 + S.month, d = SG.UI.state.deltas;
  if (!d || d.key !== key) d = SG.UI.state.deltas = { key: key, c: {}, last: {} };
  return d;
};
// 인사: p[cid][oid] = {joined, found, arrived, loy}, out[cid] = [[oid, 간 곳]], plast[cid][oid] = 방금 바뀜
SG.UI.noteStaff = function (o, before, r) {
  var S = SG.S, d = SG.UI.deltas();
  d.p = d.p || {}; d.out = d.out || {}; d.plast = d.plast || {};
  function mark(cid, oid, k, v) {
    var x = ((d.p[cid] = d.p[cid] || {})[oid] = d.p[cid][oid] || {});
    x[k] = k === 'loy' ? (x.loy || 0) + v : v;
    (d.plast[cid] = d.plast[cid] || {})[oid] = true;
  }
  (o.offs || []).forEach(function (oid) {
    var so = S.off[oid];
    if (so.s === 'force' && so.f !== S.player) { if (before.loy[oid] !== so.loy) mark(so.c, oid, 'loy', so.loy - before.loy[oid]); return; }
    if (so.s !== 'force') return;
    if (before.st[oid] !== so.s + '/' + so.f) mark(so.c, oid, 'joined', true);
    else {
      if (before.loy[oid] !== so.loy) mark(so.c, oid, 'loy', so.loy - before.loy[oid]);
      if (before.at[oid] !== so.c) {
        mark(so.c, oid, 'arrived', before.at[oid]);
        (d.out[before.at[oid]] = d.out[before.at[oid]] || []).push([oid, so.c]);
        if (d.p[before.at[oid]]) delete d.p[before.at[oid]][oid];
      }
    }
  });
  (r && r.found || []).forEach(function (oid) { mark(o.cid, oid, 'found', true); });
};
SG.UI.noteDelta = function (o, before) {
  var S = SG.S, d = SG.UI.deltas();
  (o.cities || []).forEach(function (cid) {
    var tp = SG.troops(S.cities[cid], cid);
    SG.UI.CITY_FIELDS.forEach(function (f) {
      var a = before.c[cid][f[0]], b = f[0] in tp ? tp[f[0]] : S.cities[cid][f[0]];
      if (a === b) return;
      (d.c[cid] = d.c[cid] || {})[f[0]] = (d.c[cid][f[0]] || 0) + (b - a);
      (d.last[cid] = d.last[cid] || {})[f[0]] = [a, b];
    });
  });
};

// 군사(출진) 결과: 장면은 이미 전투로 보았으니 결과 카드만 가운데에 크게, 도시 장부·지도에도 표시
SG.UI.showMilitary = function (o, before, r, target) {
  SG.UI.noteDelta(o, before);
  var rows = SG.UI.diff(o, before);
  SG.UI.sfx(r.success ? 'win' : 'fail');
  SG.UI.bigResult(SG.UI.resultCard(o, r, rows), 3600, function () {
    var m = SG.UI.state.map;
    if (!m) return;
    var src = rows.filter(function (x) { return x.label === SG.cityName(o.cid) + ' 병사'; })[0];
    if (src) m.floatText(o.cid, '병사 −' + SG.fmt(src.from - src.to), false);
    m.floatText(target, r.success ? '점령!' : '공략 실패', r.success);
  });
};

// 계략·외교: 명령을 낸 도시의 「○월 변화」에 한 줄씩 (acts[cid] = [{text, good}])
SG.UI.noteAct = function (o, r, rows) {
  if (['rumor', 'sow', 'gift', 'ally', 'demand'].indexOf(o.kind) < 0) return;
  var d = SG.UI.deltas(), ok = r.success !== false, text;
  if (o.kind === 'rumor') text = '유언비어 → ' + SG.cityName(o.cities[1]) + (ok ? ' 성공' : ' 실패');
  else if (o.kind === 'sow') {
    var lr = rows.filter(function (x) { return / 충성$/.test(x.label); })[0];
    text = '이간 → ' + SG.name(o.offs[0]) + (lr ? ' 충성 −' + Math.abs(lr.to - lr.from) : ' 실패');
    ok = !!lr;
  } else if (o.kind === 'gift') {
    var fr = rows.filter(function (x) { return / 우호도$/.test(x.label); })[0];
    text = '친선 → ' + SG.forceName(o.fid) + (fr ? ' 우호도 +' + (fr.to - fr.from) : '');
  } else if (o.kind === 'ally') text = '동맹 → ' + SG.forceName(o.fid) + (ok ? ' 성공 (' + SG.rel(SG.S.player, o.fid).ally + '개월)' : ' 거절');
  else text = '항복 권고 → ' + SG.forceName(o.fid) + (ok ? ' 항복!' : ' 거절');
  ((d.acts = d.acts || {})[o.cid] = d.acts[o.cid] || []).push({ text: text, good: ok });
};

// ---- 위임 보고: 턴 종료 때 위임한 도시마다 태수가 무엇을 했는지 (바뀐 수치 + 장수별 한 일)
SG.ui.delegReport = function (reps) {
  var cards = reps.map(function (rp) {
    var rows = SG.UI.CITY_FIELDS.filter(function (f) { return f[0] in rp.before && rp.before[f[0]] !== rp.after[f[0]]; })
      .map(function (f) { return { label: f[1], from: rp.before[f[0]], to: rp.after[f[0]] }; });
    var who = {}; rp.acts.forEach(function (a) { who[a.oid] = 1; });
    var gov = SG.UI.governor(rp.cid);
    var card = SG.UI.resultCard({ kind: 'deleg', cid: rp.cid }, {
      stamp: '任', success: rp.acts.length > 0, title: SG.cityName(rp.cid) + (gov ? ' — 태수 ' + SG.name(gov) : ''),
      msg: rp.acts.length ? '장수 ' + Object.keys(who).length + '명에게 ' + rp.acts.length + '가지 일을 맡겼습니다' : rp.why
    }, rows);
    if (rp.acts.length) card.appendChild(h('div', { class: 'dr-acts' }, rp.acts.map(function (a) {
      return h('div', { class: 'dr-act' + (a.ok ? '' : ' ng') }, [SG.UI.portrait(a.oid, 28), h('span', { text: a.msg })]);
    })));
    return card;
  });
  SG.UI.sfx(reps.some(function (rp) { return rp.acts.length; }) ? 'ok' : 'click');
  return SG.UI.modal({ title: '위임 보고 — 태수들이 이번 달 한 일', icon: 'scroll', size: 'narrow', body: h('div', { class: 'deleg-rep' }, cards),
    buttons: [{ label: '확인', value: true, cls: 'primary' }] });
};

// ---- 재해 장면 (규칙 쪽 SG.runEvents 가 부른다)
SG.ui.snap = function (cid) { return SG.UI.snapshot({ cities: [cid] }); };
SG.ui.disaster = async function (ev) {
  var S = SG.S, o = { kind: ev.kind, cid: ev.cid, cities: [ev.cid] };
  o.oid = SG.UI.governor(ev.cid) || S.forces[S.player].lord;
  var r = { ok: true, success: ev.good, msg: ev.msg.replace(/^[^:]*: /, ''), title: SG.cityName(ev.cid) + ' — ' + ev.name, stamp: ev.good ? '豐' : '災' };
  var rows = ev.before ? SG.UI.diff(o, ev.before) : [];
  if (ev.before) SG.UI.noteDelta(o, ev.before);
  SG.UI.busy(null);
  if (!document.getElementById('topbar')) return;
  SG.UI.state.sel = ev.cid;
  if (SG.UI.state.map) SG.UI.state.map.focus(ev.cid);
  await SG.UI.cmdScene(o, r, rows, SG.UI.CMD_SCENES[ev.kind]);
  SG.UI.refresh();
};
