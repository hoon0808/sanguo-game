// 게임 상태 만들기·조회·저장
var SG = SG || {};

SG.S = null; // 현재 게임 상태

SG.newGame = function (scenarioId, playerLord, seed) {
  SG.buildOfficers();
  var sc = SG.SCENARIOS.filter(function (s) { return s.id === scenarioId; })[0];
  if (!sc) throw new Error('시나리오 없음: ' + scenarioId);
  seed = seed || (Date.now() % 2147483647);
  SG.seedRng(seed);

  var S = {
    ver: SG.VERSION, seed: seed, rng: 0, scen: sc.id, year: sc.year, month: sc.month, noEvents: !!sc.noEvents,
    player: null, forces: {}, cities: {}, off: {}, diplo: {}, log: [], flags: {}, turnCount: 0, over: null
  };

  // 도시 기본값 (주인 없음)
  SG.CITY_LIST.forEach(function (c) {
    var z = SG.CITY_SIZE[c.size];
    S.cities[c.id] = {
      owner: null, gold: 200 + 100 * c.size, food: 1000 + 800 * c.size,
      pop: Math.round(z.pop * SG.randf(0.85, 1.15) / 1000) * 1000,
      agri: Math.round(z.agriMax * SG.randf(0.3, 0.45)), comm: Math.round(z.commMax * SG.randf(0.3, 0.45)),
      wall: Math.round(z.wallMax * SG.randf(0.35, 0.5)), loyal: SG.randInt(45, 65),
      soldiers: 0, train: 40, morale: 50, deleg: false
    };
  });

  // 영웅집결: 모든 장수가 한창 나이(25~35세)로 시작하고, 본래 수명만큼 산다
  if (sc.heroes) {
    S.life = {};
    Object.keys(SG.OFFICERS).forEach(function (id) {
      var o = SG.OFFICERS[id], age = 25 + (id.charCodeAt(0) + id.length) % 11;
      S.life[id] = [sc.year - age, sc.year - age + Math.max(65, o.d - o.b)];
    });
  }
  // 장수 상태
  Object.keys(SG.OFFICERS).forEach(function (id) {
    var st = 'free';
    if (SG.dies(id, S) <= sc.year) st = 'dead';
    else if (SG.born(id, S) + 16 > sc.year) st = 'unborn';
    S.off[id] = { s: st, f: null, c: SG.OFFICERS[id].home, loy: 0, acted: false, found: false, rank: 0 };
  });

  // 세력 배치
  sc.forces.forEach(function (fd) {
    var fid = 'F_' + fd.lord;
    var cityIds = Object.keys(fd.cities);
    S.forces[fid] = { id: fid, lord: fd.lord, color: SG.COLORS[fd.color] || fd.color || '#888', capital: cityIds[0], alive: true };
    cityIds.forEach(function (cid, i) {
      var c = S.cities[cid];
      var size = SG.CITIES[cid].size;
      var list = fd.cities[cid];
      c.owner = fid;
      c.gold = 700 + 300 * size + (i === 0 ? 600 : 0);
      c.food = 3000 + 2000 * size + (i === 0 ? 2000 : 0);
      c.soldiers = 3000 + 1500 * Math.min(list.length, 6) + 1500 * size + (i === 0 ? 3000 : 0);
      SG.initTroops(c, cid);
      c.train = SG.randInt(45, 65);
      c.morale = SG.randInt(55, 70);
      c.loyal = SG.randInt(55, 75);
      list.forEach(function (oid) {
        var so = S.off[oid];
        if (!so) return;
        so.s = 'force'; so.f = fid; so.c = cid;
        so.loy = SG.isKin(oid, fd.lord) ? 100 : SG.randInt(72, 95);
      });
    });
  });
  // 재야 지정 위치
  if (sc.free) {
    Object.keys(sc.free).forEach(function (cid) {
      sc.free[cid].forEach(function (oid) { if (S.off[oid] && S.off[oid].s === 'free') S.off[oid].c = cid; });
    });
  }
  // 세력 사이 우호도
  var fids = Object.keys(S.forces);
  fids.forEach(function (a) {
    fids.forEach(function (b) { if (a < b) S.diplo[a + '|' + b] = { fr: SG.randInt(30, 60), ally: 0 }; });
  });
  if (playerLord) S.player = 'F_' + playerLord;
  SG.initItems(S);
  S.rng = SG.rng.s;
  SG.S = S;
  SG.log('·', sc.year + '년 ' + sc.month + '월, ' + sc.name + ' 시나리오가 시작되었다.', 'sys');
  return S;
};

// ---- 조회
SG.city = function (cid) { return SG.S.cities[cid]; };
SG.force = function (fid) { return SG.S.forces[fid]; };
SG.forceName = function (fid) { var f = SG.S.forces[fid]; return f ? SG.name(f.lord) : '무소속'; };
SG.cityName = function (cid) { return SG.CITIES[cid].n; };
SG.isPlayer = function (fid) { return !!fid && SG.S.player === fid; };

SG.citiesOf = function (fid) {
  return Object.keys(SG.S.cities).filter(function (c) { return SG.S.cities[c].owner === fid; });
};
SG.officersOf = function (fid) {
  return Object.keys(SG.S.off).filter(function (o) { var x = SG.S.off[o]; return x.s === 'force' && x.f === fid; });
};
SG.officersIn = function (cid, fid) {
  return Object.keys(SG.S.off).filter(function (o) {
    var x = SG.S.off[o];
    return x.s === 'force' && x.c === cid && !x.march && (fid === undefined || x.f === fid);
  });
};
SG.freeIn = function (cid, onlyFound) {
  return Object.keys(SG.S.off).filter(function (o) {
    var x = SG.S.off[o];
    return x.s === 'free' && x.c === cid && (!onlyFound || x.found);
  });
};
SG.aliveForces = function () {
  return Object.keys(SG.S.forces).filter(function (f) { return SG.S.forces[f].alive; });
};
SG.forceTotals = function (fid) {
  var t = { cities: 0, officers: 0, soldiers: 0, gold: 0, food: 0 };
  SG.citiesOf(fid).forEach(function (cid) {
    var c = SG.S.cities[cid];
    t.cities++; t.soldiers += c.soldiers; t.gold += c.gold; t.food += c.food;
  });
  t.officers = SG.officersOf(fid).length;
  return t;
};
SG.age = function (oid) { return SG.S.year - SG.born(oid); };

// ---- 외교
SG.dkey = function (a, b) { return a < b ? a + '|' + b : b + '|' + a; };
SG.rel = function (a, b) {
  var k = SG.dkey(a, b);
  if (!SG.S.diplo[k]) SG.S.diplo[k] = { fr: 40, ally: 0 };
  return SG.S.diplo[k];
};
SG.isAlly = function (a, b) { return !!a && !!b && a !== b && SG.rel(a, b).ally > 0; };
SG.isEnemyCity = function (fid, cid) {
  var o = SG.S.cities[cid].owner;
  return o !== fid && !SG.isAlly(fid, o);
};

// ---- 기록
SG.log = function (who, text, type) {
  var S = SG.S;
  S.log.push({ y: S.year, m: S.month, t: SG.josa(text), k: type || '' });
  if (S.log.length > 400) S.log.splice(0, S.log.length - 400);
  if (SG.onLog) SG.onLog(S.log[S.log.length - 1]);
};

// ---- 저장·불러오기 (브라우저 저장소 + 파일)
SG.SAVE_KEY = 'sanguo_save_';
SG.serialize = function () {
  SG.S.rng = SG.rng.s;
  return JSON.stringify(SG.S);
};
SG.deserialize = function (text) {
  var S = JSON.parse(text);
  if (!S || !S.cities || !S.off || !S.forces) throw new Error('저장 파일 형식이 아닙니다');
  SG.buildOfficers();
  SG.S = S;
  SG.seedRng(S.rng);
  if (SG.initItems) SG.initItems(S);
  return S;
};
SG.saveSlot = function (slot) {
  var data = SG.serialize();
  localStorage.setItem(SG.SAVE_KEY + slot, data);
  localStorage.setItem(SG.SAVE_KEY + slot + '_meta', JSON.stringify({
    y: SG.S.year, m: SG.S.month, lord: SG.S.player ? SG.forceName(SG.S.player) : '관전', t: Date.now(),
    lid: SG.S.player ? SG.S.forces[SG.S.player].lord : null, scen: SG.S.scen,
    cities: SG.S.player ? SG.citiesOf(SG.S.player).length : 0, diff: SG.S.diff || 'easy'
  }));
};
SG.loadSlot = function (slot) {
  var data = localStorage.getItem(SG.SAVE_KEY + slot);
  if (!data) throw new Error('저장된 기록이 없습니다');
  return SG.deserialize(data);
};
SG.slotMeta = function (slot) {
  try { return JSON.parse(localStorage.getItem(SG.SAVE_KEY + slot + '_meta')); } catch (e) { return null; }
};
