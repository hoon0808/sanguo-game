// 도시·길·지도 데이터
// 좌표는 실제 위도·경도(lat, lon)를 SG.project()로 화면 좌표로 바꾼다. dx/dy는 겹치는 도시 보정.
var SG = SG || {};

SG.MAP_W = 1020;
SG.MAP_H = 840;

SG.project = function (lat, lon) {
  return { x: Math.round((lon - 99) * 40 + 20), y: Math.round((42.6 - lat) * 46 + 20) };
};

// size: 1 작은 도시, 2 보통, 3 큰 도시 / terrain: 전투 지형 (plain 평지, hill 구릉, mountain 산지, river 강)
SG.CITY_LIST = [
  // 유주
  { id: 'xiangping', n: '양평', h: '襄平', prov: '유주', lat: 41.3, lon: 123.2, size: 1, terrain: 'hill' },
  { id: 'beiping', n: '북평', h: '北平', prov: '유주', lat: 40.0, lon: 118.6, size: 1, terrain: 'plain' },
  { id: 'ji', n: '계', h: '薊', prov: '유주', lat: 39.9, lon: 116.4, size: 2, terrain: 'plain' },
  // 기주
  { id: 'nanpi', n: '남피', h: '南皮', prov: '기주', lat: 38.1, lon: 116.8, size: 2, terrain: 'plain' },
  { id: 'pingyuan', n: '평원', h: '平原', prov: '청주', lat: 36.9, lon: 116.0, size: 1, terrain: 'plain' },
  { id: 'ye', n: '업', h: '鄴', prov: '기주', lat: 36.3, lon: 114.4, size: 3, terrain: 'plain' },
  // 병주
  { id: 'jinyang', n: '진양', h: '晉陽', prov: '병주', lat: 37.8, lon: 112.5, size: 2, terrain: 'mountain' },
  // 청주·연주·서주
  { id: 'beihai', n: '북해', h: '北海', prov: '청주', lat: 36.7, lon: 119.1, size: 2, terrain: 'hill' },
  { id: 'puyang', n: '복양', h: '濮陽', prov: '연주', lat: 35.7, lon: 115.0, size: 2, terrain: 'river', dx: 18, dy: 4 },
  { id: 'chenliu', n: '진류', h: '陳留', prov: '연주', lat: 34.8, lon: 114.4, size: 2, terrain: 'plain', dx: 8, dy: -6 },
  { id: 'xiaopei', n: '소패', h: '小沛', prov: '서주', lat: 34.8, lon: 116.6, size: 1, terrain: 'plain' },
  { id: 'xiapi', n: '하비', h: '下邳', prov: '서주', lat: 34.1, lon: 118.1, size: 2, terrain: 'river' },
  // 예주
  { id: 'xuchang', n: '허창', h: '許昌', prov: '예주', lat: 34.0, lon: 113.8, size: 3, terrain: 'plain', dx: -8, dy: 6 },
  { id: 'qiao', n: '초', h: '譙', prov: '예주', lat: 33.8, lon: 115.8, size: 1, terrain: 'plain' },
  { id: 'runan', n: '여남', h: '汝南', prov: '예주', lat: 33.0, lon: 114.4, size: 2, terrain: 'plain' },
  // 사례
  { id: 'luoyang', n: '낙양', h: '洛陽', prov: '사례', lat: 34.7, lon: 112.4, size: 3, terrain: 'hill' },
  { id: 'changan', n: '장안', h: '長安', prov: '사례', lat: 34.3, lon: 108.9, size: 3, terrain: 'plain' },
  // 양주(涼州)
  { id: 'anding', n: '안정', h: '安定', prov: '양주', lat: 35.6, lon: 106.7, size: 1, terrain: 'hill' },
  { id: 'tianshui', n: '천수', h: '天水', prov: '양주', lat: 34.6, lon: 105.7, size: 1, terrain: 'mountain' },
  { id: 'wuwei', n: '무위', h: '武威', prov: '양주', lat: 37.9, lon: 102.6, size: 2, terrain: 'plain' },
  { id: 'wudu', n: '무도', h: '武都', prov: '양주', lat: 33.3, lon: 105.3, size: 1, terrain: 'mountain', dx: 0, dy: 4 },
  // 형주
  { id: 'wan', n: '완', h: '宛', prov: '형주', lat: 33.2, lon: 112.6, size: 2, terrain: 'plain', dx: 6, dy: -6 },
  { id: 'xinye', n: '신야', h: '新野', prov: '형주', lat: 32.6, lon: 112.3, size: 1, terrain: 'plain', dx: -30, dy: 2 },
  { id: 'xiangyang', n: '양양', h: '襄陽', prov: '형주', lat: 31.9, lon: 112.1, size: 3, terrain: 'river', dx: 4, dy: 12 },
  { id: 'shangyong', n: '상용', h: '上庸', prov: '형주', lat: 32.3, lon: 110.2, size: 1, terrain: 'mountain' },
  { id: 'jiangling', n: '강릉', h: '江陵', prov: '형주', lat: 30.3, lon: 112.2, size: 2, terrain: 'river' },
  { id: 'jiangxia', n: '강하', h: '江夏', prov: '형주', lat: 30.6, lon: 114.3, size: 2, terrain: 'river' },
  { id: 'wuling', n: '무릉', h: '武陵', prov: '형주', lat: 29.0, lon: 111.7, size: 1, terrain: 'mountain' },
  { id: 'changsha', n: '장사', h: '長沙', prov: '형주', lat: 28.2, lon: 112.9, size: 2, terrain: 'river' },
  { id: 'lingling', n: '영릉', h: '零陵', prov: '형주', lat: 26.4, lon: 111.6, size: 1, terrain: 'hill' },
  { id: 'guiyang', n: '계양', h: '桂陽', prov: '형주', lat: 26.0, lon: 113.1, size: 1, terrain: 'hill' },
  // 양주(揚州)
  { id: 'shouchun', n: '수춘', h: '壽春', prov: '양주', lat: 32.6, lon: 116.8, size: 2, terrain: 'river' },
  { id: 'lujiang', n: '여강', h: '廬江', prov: '양주', lat: 31.3, lon: 117.2, size: 1, terrain: 'river' },
  { id: 'jianye', n: '건업', h: '建業', prov: '양주', lat: 32.0, lon: 118.8, size: 3, terrain: 'river' },
  { id: 'wu', n: '오', h: '吳', prov: '양주', lat: 31.3, lon: 120.6, size: 2, terrain: 'river' },
  { id: 'kuaiji', n: '회계', h: '會稽', prov: '양주', lat: 30.0, lon: 120.6, size: 2, terrain: 'hill' },
  { id: 'chaisang', n: '시상', h: '柴桑', prov: '양주', lat: 29.7, lon: 116.0, size: 1, terrain: 'river' },
  // 익주
  { id: 'hanzhong', n: '한중', h: '漢中', prov: '익주', lat: 33.1, lon: 107.0, size: 2, terrain: 'mountain' },
  { id: 'zitong', n: '자동', h: '梓潼', prov: '익주', lat: 31.6, lon: 105.2, size: 1, terrain: 'mountain' },
  { id: 'chengdu', n: '성도', h: '成都', prov: '익주', lat: 30.7, lon: 104.1, size: 3, terrain: 'plain' },
  { id: 'jiangzhou', n: '강주', h: '江州', prov: '익주', lat: 29.6, lon: 106.5, size: 2, terrain: 'river' },
  { id: 'yongan', n: '영안', h: '永安', prov: '익주', lat: 31.0, lon: 109.5, size: 1, terrain: 'mountain' },
  { id: 'jianning', n: '건녕', h: '建寧', prov: '익주', lat: 25.6, lon: 103.8, size: 1, terrain: 'mountain', dy: -6 },
  { id: 'yunnan', n: '운남', h: '雲南', prov: '익주', lat: 25.6, lon: 100.4, size: 1, terrain: 'mountain', dy: -6 }
];

// 길 (양쪽 모두 이동 가능)
SG.ROADS = [
  ['xiangping', 'beiping'], ['beiping', 'ji'], ['ji', 'nanpi'], ['ji', 'jinyang'],
  ['nanpi', 'pingyuan'], ['nanpi', 'ye'], ['pingyuan', 'ye'], ['pingyuan', 'beihai'], ['pingyuan', 'puyang'],
  ['ye', 'jinyang'], ['ye', 'puyang'], ['ye', 'luoyang'], ['jinyang', 'luoyang'],
  ['beihai', 'xiapi'], ['puyang', 'chenliu'], ['puyang', 'xiaopei'],
  ['chenliu', 'luoyang'], ['chenliu', 'xuchang'], ['chenliu', 'qiao'],
  ['xiaopei', 'xiapi'], ['xiaopei', 'qiao'], ['xiapi', 'shouchun'], ['xiapi', 'jianye'],
  ['xuchang', 'luoyang'], ['xuchang', 'wan'], ['xuchang', 'runan'], ['xuchang', 'qiao'],
  ['qiao', 'runan'], ['qiao', 'shouchun'], ['runan', 'wan'], ['runan', 'shouchun'], ['runan', 'jiangxia'],
  ['luoyang', 'changan'], ['luoyang', 'wan'],
  ['changan', 'anding'], ['changan', 'tianshui'], ['changan', 'hanzhong'], ['changan', 'wan'],
  ['anding', 'tianshui'], ['anding', 'wuwei'], ['tianshui', 'wuwei'], ['tianshui', 'wudu'],
  ['wudu', 'hanzhong'], ['wudu', 'zitong'], ['hanzhong', 'zitong'], ['hanzhong', 'shangyong'],
  ['shangyong', 'xinye'], ['shangyong', 'yongan'],
  ['wan', 'xinye'], ['xinye', 'xiangyang'], ['xiangyang', 'jiangling'], ['xiangyang', 'jiangxia'],
  ['jiangling', 'jiangxia'], ['jiangling', 'wuling'], ['jiangling', 'yongan'],
  ['jiangxia', 'chaisang'], ['jiangxia', 'changsha'], ['jiangxia', 'lujiang'],
  ['changsha', 'wuling'], ['changsha', 'lingling'], ['changsha', 'guiyang'], ['changsha', 'chaisang'],
  ['wuling', 'lingling'], ['lingling', 'guiyang'],
  ['shouchun', 'lujiang'], ['shouchun', 'jianye'], ['lujiang', 'chaisang'], ['lujiang', 'jianye'],
  ['jianye', 'chaisang'], ['jianye', 'wu'], ['wu', 'kuaiji'], ['kuaiji', 'chaisang'],
  ['zitong', 'chengdu'], ['chengdu', 'jiangzhou'], ['chengdu', 'jianning'],
  ['jiangzhou', 'yongan'], ['jiangzhou', 'jianning'], ['jianning', 'yunnan']
];

// 도시 크기별 기본 수치
SG.CITY_SIZE = {
  1: { pop: 160000, agriMax: 600, commMax: 600, wallMax: 600 },
  2: { pop: 300000, agriMax: 800, commMax: 800, wallMax: 800 },
  3: { pop: 500000, agriMax: 1000, commMax: 1000, wallMax: 1000 }
};

SG.CITIES = {};
SG.ADJ = {};
SG.CITY_LIST.forEach(function (c) {
  var p = SG.project(c.lat, c.lon);
  c.x = p.x + (c.dx || 0);
  c.y = p.y + (c.dy || 0);
  SG.CITIES[c.id] = c;
  SG.ADJ[c.id] = [];
});
SG.ROADS.forEach(function (r) {
  SG.ADJ[r[0]].push(r[1]);
  SG.ADJ[r[1]].push(r[0]);
});
// 지도 그림용 해안선·강·호수는 js/data/geo.js (tools/build-map.py 로 만든다)
