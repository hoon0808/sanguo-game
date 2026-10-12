// 매달 일어나는 일: 역사 사건, 재해·풍년, 반란, 동맹 만료
var SG = SG || {};

// 역사 사건. cond가 참이면 한 번만 일어난다.
SG.EVENTS = [
  {
    id: 'lianhuan', title: '연환계',
    cond: function (S) {
      var d = S.off.dongzhuo, l = S.off.lvbu;
      return (S.year > 192 || (S.year === 192 && S.month >= 4)) && d && d.s === 'force' && S.forces[d.f] && S.forces[d.f].lord === 'dongzhuo' &&
        l && l.s === 'force' && l.f === d.f && SG.chance(0.35);
    },
    run: async function (S) {
      var fid = S.off.dongzhuo.f;
      SG.kill('dongzhuo', '여포의 손에 목숨을 잃었다');
      var text = '왕윤이 초선을 앞세운 연환계로 동탁과 여포 사이를 갈라놓았다.\n분노한 여포가 동탁을 죽였다.';
      // 여포는 세력을 떠나 재야가 된다
      SG.makeFree('lvbu', S.off.lvbu.c);
      await SG.succession(fid, null);
      text += '\n여포는 ' + SG.cityName(S.off.lvbu.c) + '에서 떠돌이가 되었다.';
      return text;
    }
  },
  {
    id: 'tianzi', title: '천자를 모시다',
    cond: function (S) {
      if (S.year < 196 || S.year > 200) return false;
      var c = S.off.caocao;
      if (!c || c.s !== 'force' || S.forces[c.f].lord !== 'caocao') return false;
      return S.cities.xuchang.owner === c.f || S.cities.luoyang.owner === c.f;
    },
    run: async function (S) {
      var fid = S.off.caocao.f;
      SG.citiesOf(fid).forEach(function (cid) { var c = S.cities[cid]; c.loyal = Math.min(100, c.loyal + 10); });
      var cap = S.cities[S.forces[fid].capital];
      cap.gold += 1000;
      SG.officersOf(fid).forEach(function (o) { S.off[o].loy = Math.min(100, S.off[o].loy + 5); });
      return '조조가 떠돌던 헌제를 맞아들여 허창으로 모셨다.\n천자의 이름을 등에 업은 조조 세력의 민심과 장수들의 충성이 올랐다. (본거지 금 +1000)';
    }
  },
  {
    id: 'sangu', title: '삼고초려',
    cond: function (S) {
      var z = S.off.zhugeliang, l = S.off.liubei;
      if (S.year < 207 || !z || z.s !== 'free' || !l || l.s !== 'force') return false;
      var f = S.forces[l.f];
      if (!f || f.lord !== 'liubei') return false;
      return SG.chance(SG.citiesOf(l.f).some(function (cid) { return SG.CITIES[cid].prov === '형주'; }) ? 1 : 0.25);
    },
    run: async function (S) {
      var fid = S.off.liubei.f;
      var city = SG.citiesOf(fid).filter(function (cid) { return SG.CITIES[cid].prov === '형주'; })[0] || S.forces[fid].capital;
      SG.join('zhugeliang', fid, city);
      S.off.zhugeliang.loy = 100;
      return '유비가 융중의 초가집을 세 번 찾아간 끝에 제갈량을 만났다.\n제갈량은 천하삼분지계를 말하고 유비를 따르기로 했다. (' + SG.cityName(city) + ')';
    }
  },
  {
    id: 'pangtong', title: '봉추 방통',
    cond: function (S) {
      var p = S.off.pangtong, l = S.off.liubei;
      if (S.year < 209 || !p || p.s !== 'free' || !l || l.s !== 'force' || S.forces[l.f].lord !== 'liubei') return false;
      return S.off.zhugeliang && S.off.zhugeliang.s === 'force' && S.off.zhugeliang.f === l.f && SG.chance(0.3);
    },
    run: async function (S) {
      var fid = S.off.liubei.f;
      SG.join('pangtong', fid, S.off.zhugeliang.c);
      return '제갈량의 소개로 "봉추" 방통이 유비 세력에 들어왔다.\n"와룡과 봉추 중 한 사람만 얻어도 천하를 얻는다"고 했다.';
    }
  },
  {
    id: 'qizong', title: '칠종칠금',
    cond: function (S) {
      // 남만 세력이 무너져 맹획이 떠돌고, 제갈량이 있는 세력이 남중(건녕·운남)을 차지했을 때
      var m = S.off.menghuo, z = S.off.zhugeliang;
      if (!m || m.s !== 'free' || !z || z.s !== 'force') return false;
      return ['jianning', 'yunnan'].some(function (c) { return S.cities[c].owner === z.f; });
    },
    run: async function (S) {
      var fid = S.off.zhugeliang.f;
      var city = ['yunnan', 'jianning'].filter(function (c) { return S.cities[c].owner === fid; })[0];
      SG.join('menghuo', fid, city);
      S.off.menghuo.loy = 100;
      var more = ['zhurong', 'mengyou'].filter(function (o) { return S.off[o] && S.off[o].s === 'free'; });
      more.forEach(function (o) { SG.join(o, fid, city); S.off[o].loy = 95; });
      SG.citiesOf(fid).forEach(function (c) { if (['jianning', 'yunnan'].indexOf(c) >= 0) S.cities[c].loyal = Math.min(100, S.cities[c].loyal + 25); });
      return '제갈량은 맹획을 일곱 번 사로잡고 일곱 번 놓아주었다.\n마침내 맹획이 마음으로 복종하여 ' + SG.forceName(fid) + ' 세력에 들어왔다' +
        (more.length ? ' (' + more.map(SG.name).join(', ') + ' 함께)' : '') + '. 남중의 민심이 크게 올랐다.';
    }
  },
  {
    id: 'taoyuan_bond', title: '천리행',
    cond: function (S) {
      // 관우가 유비가 아닌 세력에 있고 유비가 살아 있는 군주일 때
      var g = S.off.guanyu, l = S.off.liubei;
      if (!g || g.s !== 'force' || !l || l.s !== 'force' || g.f === l.f) return false;
      if (S.forces[l.f].lord !== 'liubei' || S.forces[g.f].lord === 'guanyu') return false;
      return SG.chance(0.25);
    },
    repeat: true,
    run: async function (S) {
      var from = S.off.guanyu.f, to = S.off.liubei.f;
      S.off.guanyu.f = to; S.off.guanyu.c = S.off.liubei.c; S.off.guanyu.loy = 100;
      return '관우가 ' + SG.forceName(from) + '의 은혜를 뒤로하고 다섯 관문을 지나 의형 유비에게 돌아왔다.';
    }
  }
];

// 재해·풍년 (도시마다 낮은 확률)
SG.DISASTERS = [
  { id: 'locust', name: '메뚜기 떼', p: 0.006, months: [5, 6, 7, 8], run: function (c) {
    var f = Math.round(c.food * 0.3); c.food -= f; c.agri = Math.round(c.agri * 0.9);
    return '메뚜기 떼가 덮쳤다. 식량 -' + SG.fmt(f) + ', 농업 -10%';
  } },
  { id: 'plague', name: '역병', p: 0.004, run: function (c) {
    var p = Math.round(c.pop * 0.08), s = Math.round(c.soldiers * 0.08); c.pop -= p; c.soldiers -= s;
    return '역병이 돌았다. 인구 -' + SG.fmt(p) + ', 병사 -' + SG.fmt(s);
  } },
  { id: 'flood', name: '홍수', p: 0.012, months: [6, 7, 8], terrain: 'river', run: function (c, cid) {
    var z = SG.CITY_SIZE[SG.CITIES[cid].size];
    c.agri = Math.round(c.agri * 0.85); c.wall = Math.max(0, c.wall - Math.round(z.wallMax * 0.08));
    return '강물이 넘쳤다. 농업 -15%, 성벽이 무너졌다';
  } },
  { id: 'drought', name: '가뭄', p: 0.006, months: [4, 5, 6, 7], noTerrain: 'river', run: function (c) {
    var f = Math.round(c.food * 0.2); c.food -= f; c.agri = Math.round(c.agri * 0.92); c.loyal = Math.max(0, c.loyal - 5);
    return '비가 오지 않아 논밭이 말라 갈라졌다. 식량 -' + SG.fmt(f) + ', 농업 -8%, 민심 -5';
  } },
  { id: 'quake', name: '지진', p: 0.002, run: function (c, cid) {
    var z = SG.CITY_SIZE[SG.CITIES[cid].size], w = Math.round(z.wallMax * 0.15), p = Math.round(c.pop * 0.03), s = Math.round(c.soldiers * 0.03);
    c.wall = Math.max(0, c.wall - w); c.pop -= p; c.soldiers -= s;
    return '땅이 크게 흔들려 성벽과 집이 무너졌다. 성벽 -' + w + ', 인구 -' + SG.fmt(p) + ', 병사 -' + SG.fmt(s);
  } },
  { id: 'bumper', name: '풍년', p: 0.05, months: [7], run: function (c, cid) {
    var f = Math.round(SG.harvest(cid) * 0.3); c.food += f;
    return '풍년이 들었다. 식량 +' + SG.fmt(f);
  } }
];

SG.runEvents = async function () {
  var S = SG.S;
  S.flags = S.flags || {};
  // 역사 사건
  for (var i = 0; i < (S.noEvents ? 0 : SG.EVENTS.length); i++) {
    var ev = SG.EVENTS[i];
    if (S.flags[ev.id] && !ev.repeat) continue;
    if (!ev.cond(S)) continue;
    S.flags[ev.id] = true;
    var text = await ev.run(S);
    SG.log(null, '【' + ev.title + '】 ' + text.split('\n')[0], 'event');
    if (S.player && SG.ui && SG.ui.story) await SG.ui.story(ev.title, text);
  }
  // 재해·풍년 (우리 도시에 일어난 것은 장면으로 보여 준다)
  var shows = [];
  Object.keys(S.cities).forEach(function (cid) {
    var c = S.cities[cid];
    if (!c.owner) return;
    var mineC = SG.isPlayer(c.owner);
    SG.DISASTERS.forEach(function (d) {
      if (d.months && d.months.indexOf(S.month) < 0) return;
      if (d.terrain && SG.CITIES[cid].terrain !== d.terrain) return;
      if (d.noTerrain && SG.CITIES[cid].terrain === d.noTerrain) return;
      if (!SG.chance(d.p)) return;
      var before = mineC && SG.ui && SG.ui.snap ? SG.ui.snap(cid) : null;
      var msg = d.run(c, cid);
      if (mineC) {
        SG.log(c.owner, SG.cityName(cid) + ': ' + msg, d.id === 'bumper' ? 'sys' : 'warn');
        shows.push({ kind: d.id, name: d.name, cid: cid, msg: msg, before: before, good: d.id === 'bumper' });
      }
    });
    // 민심이 바닥이면 반란
    if (c.loyal < 25 && SG.chance(0.12)) {
      var before2 = mineC && SG.ui && SG.ui.snap ? SG.ui.snap(cid) : null;
      var lost = Math.round(c.soldiers * 0.25);
      c.soldiers -= lost; c.gold = Math.round(c.gold * 0.8); c.loyal = Math.max(0, c.loyal - 3);
      var msg2 = SG.cityName(cid) + '에서 백성들이 들고일어났다! 병사 -' + SG.fmt(lost) + ', 금 -20%';
      SG.log(c.owner, msg2, 'warn');
      if (mineC) shows.push({ kind: 'riot', name: '반란', cid: cid, msg: msg2, before: before2, good: false });
    }
  });
  if (SG.ui && SG.ui.disaster) for (var k = 0; k < shows.length; k++) await SG.ui.disaster(shows[k]);
  // 동맹 만료 알림
  if (S.player) {
    SG.aliveForces().forEach(function (f) {
      if (f === S.player) return;
      var r = SG.rel(S.player, f);
      if (r.ally === 1) SG.log(S.player, SG.forceName(f) + ' 세력과의 동맹이 다음 달에 끝난다.', 'sys');
    });
  }
};
