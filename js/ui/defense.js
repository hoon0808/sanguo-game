// 수비 배치: 우리 도시가 공격받으면 싸우기 전에 장수마다 병종·병사 수·부장을 정한다
// (한 장수가 거느릴 수 있는 병사는 통솔 × 300, 장수에게 맡기지 않은 병사는 장수 없는 「수비병」으로 약하게 싸운다)
var SG = SG || {};
SG.ui = SG.ui || {};

SG.ui.defenseSetup = async function (atk, def) {
  if (!SG.UI || !SG.UI.modal) return null;
  var h = SG.UI.h, S = SG.S, cid = def.city, c = S.cities[cid];
  var offs = def.units.filter(function (u) { return u.oid; }).map(function (u) { return u.oid; });
  if (!offs.length) return null;   // 장수가 없으면 고를 것이 없다
  SG.UI.busy(null);
  var pool = { inf: 0, cav: 0, arc: 0 };
  def.units.forEach(function (u) { pool[u.t] += u.n; });
  var alloc = {};
  function fromUnits(units) { alloc = {}; units.forEach(function (u) { if (u.oid) alloc[u.oid] = { t: u.t, n: u.n, dep: u.dep || null }; }); }
  // 부장: 성 안에 머무는(0명) 장수를 병사를 맡은 장수에게 붙인다
  function depOf(x) { for (var i = 0; i < offs.length; i++) if (alloc[offs[i]].dep === x) return offs[i]; return null; }
  function depFree(o) { return offs.filter(function (x) { return x !== o && alloc[x].n === 0 && !alloc[x].dep && (!depOf(x) || depOf(x) === o); }); }
  function autoDeps() {
    var free = offs.filter(function (x) { return alloc[x].n === 0 && !alloc[x].dep && !depOf(x); })
      .sort(function (a, b) { var A = SG._oNoDep(a), B = SG._oNoDep(b); return (B.lead + B.war) - (A.lead + A.war); });
    if (!free.length) { SG.UI.toast('성 안에 머무는(0명) 장수가 없습니다. 병사를 0명으로 줄인 장수가 부장이 될 수 있습니다', true); return; }
    offs.filter(function (o) { return alloc[o].n > 0 && !alloc[o].dep; }).sort(function (a, b) { return alloc[b].n - alloc[a].n; })
      .forEach(function (o) { if (free.length) alloc[o].dep = free.shift(); });
  }
  fromUnits(def.units);
  var auto = SG.makeDefense(cid).units;   // 「자동 배치」로 되돌릴 때 쓴다
  function remain(except) {
    var r = { inf: pool.inf, cav: pool.cav, arc: pool.arc };
    offs.forEach(function (o) { if (o !== except) r[alloc[o].t] -= alloc[o].n; });
    return r;
  }
  function units() {
    var r = remain(null), out = offs.filter(function (o) { return !depOf(o); }).map(function (o) {
      var a = alloc[o]; return { oid: o, n: a.n, max: a.n, t: a.t, dep: a.n > 0 ? a.dep : null };
    });
    SG.TROOP_KEYS.forEach(function (t) { if (r[t] > 0) out.push({ oid: null, n: r[t], max: r[t], t: t }); });
    return out;
  }
  function mixLine(m) { return SG.TROOP_KEYS.filter(function (k) { return m[k] > 0; }).map(function (k) { return SG.TROOPS[k].h + ' ' + SG.fmt(m[k]); }).join(' · ') || '없음'; }
  function power(side, list) { return list.reduce(function (s, u) { return s + (u.n > 0 ? SG.unitPower(u.oid, u.n, side.train, side.morale, u.t) : 0); }, 0); }

  var body = h('div', { class: 'defset' }), info = h('div'), formEl = h('div', { class: 'form' });
  var am = SG.unitsMix(atk.units), wallMax = SG.CITY_SIZE[SG.CITIES[cid].size].wallMax;
  var wallB = 1 + 0.3 * c.wall / wallMax;

  function renderInfo() {
    info.innerHTML = '';
    var us = units(), aP = power(atk, atk.units), dP = SG.withDeps(us, function () { return power(def, us); }) * wallB;
    var share = Math.round(dP / (aP + dP) * 100);
    var g = us.filter(function (u) { return !u.oid; }).reduce(function (s, u) { return s + u.n; }, 0);
    info.appendChild(h('div', { class: 'vs' }, [
      SG.UI.vsSide(cid, c.owner, '우리 수비군 · ' + SG.cityName(cid), offs.filter(function (o) { return alloc[o].n > 0 || depOf(o); }),
        '병사 ' + SG.fmt(pool.inf + pool.cav + pool.arc) + ' (' + mixLine(pool) + ') · 성벽 ' + c.wall, 'me'),
      h('div', { class: 'mid' }, [h('span', { text: '對' })]),
      SG.UI.vsSide(atk.from, atk.fid, SG.forceName(atk.fid) + ' 공격군 · ' + SG.cityName(atk.from) + '에서', atk.units.map(function (u) { return u.oid; }),
        '병사 ' + SG.fmt(SG.armyTotal(atk)) + ' (' + mixLine(am) + ')', 'foe')
    ]));
    var vcls = share >= 55 ? 'good' : share >= 45 ? 'even' : 'bad';
    info.appendChild(h('div', { class: 'verdict-row' }, [
      h('div', { class: 'power' }, [h('i', { class: 'pw-me', style: { width: share + '%' } }, [h('b', { text: '우리 ' + share + '%' })]),
        h('i', { class: 'pw-foe', style: { width: (100 - share) + '%' } }, [100 - share > 12 ? h('b', { text: (100 - share) + '%' }) : null])]),
      h('span', { class: 'verdict ' + vcls, text: share >= 55 ? '지킬 만합니다' : share >= 45 ? '팽팽합니다' : '위험합니다' })]));
    if (g > 0) info.appendChild(h('p', { class: 'note defset-g', text: '장수에게 맡기지 않은 병사 ' + SG.fmt(g) + '명은 장수 없는 「수비병」으로 싸웁니다 (통솔·무력 50 정도로, 뛰어난 장수가 맡는 것보다 약함).' }));
  }

  function renderForm() {
    formEl.innerHTML = '';
    var r = remain(null);
    formEl.appendChild(h('div', { class: 'pool' }, [h('span', { class: 'pool-h', text: '장수 없이 남는 병사' })].concat(SG.TROOP_KEYS.map(function (t) {
      return h('span', { class: 'pool-c t-' + t + (r[t] < 0 ? ' over' : '') }, [h('i', { text: SG.TROOPS[t].h }), SG.TROOPS[t].n + ' ', h('b', { text: SG.fmt(r[t]) }), h('small', { text: ' / ' + SG.fmt(pool[t]) })]);
    })).concat([
      h('button', { class: 'btn small', type: 'button', text: '부장 자동', title: '성 안에 머무는(0명) 장수를 병사가 많은 부대부터 부장으로 붙입니다', onclick: function () { autoDeps(); renderForm(); renderInfo(); } }),
      h('button', { class: 'btn small', type: 'button', text: '모두 맡기기', title: '남는 병사를 여유 있는 장수에게 통솔 순서로 채웁니다', onclick: function () { fillAll(); renderForm(); renderInfo(); } }),
      h('button', { class: 'btn small', type: 'button', text: '자동 배치', onclick: function () { fromUnits(auto); renderForm(); renderInfo(); } })
    ])));
    offs.forEach(function (o) {
      var boss = depOf(o);
      if (boss) {   // 부장으로 나간 장수
        formEl.appendChild(h('div', { class: 'frow is-dep' }, [
          SG.UI.portrait(o, 40),
          h('div', { class: 'fr-who' }, [h('b', { text: SG.name(o) }), h('small', { text: '통' + SG._oNoDep(o).lead + ' 무' + SG._oNoDep(o).war })]),
          h('div', { class: 'fr-depnote' }, [h('i', { text: '副' }), SG.name(boss) + '의 부장']),
          h('div', null, [h('button', { class: 'btn small', type: 'button', text: '부장 해제', onclick: function () { alloc[boss].dep = null; renderForm(); renderInfo(); } })]),
          h('b', { class: 'fr-n', text: '부장' })]));
        return;
      }
      var a = alloc[o], ap = SG.apt(o), cap = SG.unitCap(o, a.n > 0 ? a.dep : null), max = Math.max(0, Math.min(cap, a.n + remain(null)[a.t]));
      var st = SG.depStats(o, a.n > 0 ? a.dep : null), st0 = SG.depStats(o), hasDep = a.n > 0 && a.dep;
      var val = h('b', { class: 'fr-n', text: a.n ? SG.fmt(a.n) : '성 안' });
      var rng = h('input', { type: 'range', min: 0, max: Math.max(100, Math.floor(max / 100) * 100), step: 100, value: a.n, oninput: function (e) {
        var was = a.n; a.n = Math.min(+e.target.value, max); val.textContent = a.n ? SG.fmt(a.n) : '성 안';
        if (!was !== !a.n) { if (!a.n) a.dep = null; renderForm(); renderInfo(); return; }   // 0명이 되거나 0명에서 벗어나면 부장 고르기가 바뀐다
        renderInfo(); updPool();
      } });
      var types = h('div', { class: 'tsel' }, SG.TROOP_KEYS.map(function (t) {
        var left = remain(o)[t];
        return h('button', { type: 'button', class: 'tbtn t-' + t + (a.t === t ? ' on' : '') + (ap === t ? ' apt' : ''), title: SG.TROOPS[t].n + ' — ' + SG.TROOPS[t].desc + (ap === t ? ' · 이 장수가 잘 다루는 병종 (+12%)' : ''),
          disabled: left < 100 && a.t !== t ? true : null, onclick: function () {
            if (a.t === t) return;
            a.n = Math.floor(Math.max(0, Math.min(cap, remain(o)[t], a.n || cap)) / 100) * 100; a.t = t;
            renderForm(); renderInfo();
          } }, [h('i', { text: SG.TROOPS[t].h }), SG.TROOPS[t].n, ap === t ? h('em', { text: '★' }) : null]);
      }));
      formEl.appendChild(h('div', { class: 'frow' }, [
        SG.UI.portrait(o, 40),
        h('div', { class: 'fr-who' }, [h('b', { text: SG.name(o) }),
          h('small', { class: hasDep ? 'fr-up' : '', text: '통' + st.lead + ' 무' + st.war + (hasDep ? ' (부장 +' + (st.lead - st0.lead) + '/+' + (st.war - st0.war) + ')' : '') + ' · ' + SG.TROOPS[ap].n + '에 능함' }),
          h('small', { class: 'fr-cap', text: '최대 ' + SG.fmt(cap) + '명' }),
          a.n > 0 ? h('select', { class: 'fr-dep', title: '부장: 능력(통솔·무력·지력)의 ' + Math.round(SG.DEP_RATE * 100) + '%를 보태고, 주장이 일기토에서 잡히거나 죽으면 대신 부대를 이끕니다 · 성 안에 머무는(0명) 장수만 부장이 될 수 있습니다', onchange: function (e) {
            a.dep = e.target.value || null; renderForm(); renderInfo();
          } }, [h('option', { value: '', text: '부장 없음' })].concat(depFree(o).map(function (x) {
            var xo = SG._oNoDep(x);
            return h('option', { value: x, selected: a.dep === x ? true : null, text: '副 ' + SG.name(x) + ' 통' + xo.lead + '·무' + xo.war });
          }))) : null]),
        types, rng, val
      ]));
    });
    function updPool() {
      var r2 = remain(null);
      [].forEach.call(formEl.querySelectorAll('.pool-c'), function (el, i) { var t = SG.TROOP_KEYS[i]; el.querySelector('b').textContent = SG.fmt(r2[t]); el.classList.toggle('over', r2[t] < 0); });
    }
  }
  // 남는 병사를 같은 병종 장수의 여유만큼 채운다 (통솔 높은 장수부터)
  function fillAll() {
    var list = offs.slice().sort(function (x, y) { return SG.O(y).lead - SG.O(x).lead; });
    list.forEach(function (o) {
      if (depOf(o)) return;   // 부장은 병사를 맡지 않는다
      var a = alloc[o], r = remain(null);
      if (a.n === 0) { var t = r[SG.apt(o)] >= 100 ? SG.apt(o) : SG.TROOP_KEYS.slice().sort(function (x, y) { return r[y] - r[x]; })[0]; a.t = t; }
      a.n += Math.floor(Math.max(0, Math.min(SG.unitCap(o, a.dep) - a.n, remain(null)[a.t])) / 100) * 100;
    });
  }

  body.appendChild(h('div', { class: 'step' }, [h('i', { text: '守' }), '수비 배치', h('small', { text: '병종·병사 수·부장 · 한도 통솔 × ' + SG.UNIT_PER_LEAD + ' · 0명이면 성 안에 머물고, 그런 장수는 다른 부대의 부장이 될 수 있습니다' })]));
  body.appendChild(info);
  body.appendChild(formEl);
  renderForm(); renderInfo();
  SG.UI.sfx('march');
  var ok = await SG.UI.modal({ title: SG.cityName(cid) + ' 수비 — ' + SG.forceName(atk.fid) + ' 세력이 쳐들어왔습니다', body: body, size: 'wide', tone: 'war', icon: 'attack', cancel: true,
    buttons: [{ label: '이대로 싸운다', value: true, cls: 'primary', check: function () {
      var r = remain(null);
      if (SG.TROOP_KEYS.some(function (t) { return r[t] < 0; })) { SG.UI.toast('병종별 병사보다 많이 맡겼습니다', true); return false; }
      return true;
    } }] });
  return ok ? { units: units() } : null;
};
