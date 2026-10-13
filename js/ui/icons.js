// 선 그림 아이콘 (24×24, 선 굵기는 CSS). 명령·자원 표시에 쓴다.
var SG = SG || {};
SG.ICONS = {
  sound: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  mute: 'M4 9h4l5-4v14l-5-4H4zM16 9l5 6M21 9l-5 6',
  // 자원
  gold: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM9 9h6v6H9z',
  food: 'M6 9h12l-1.5 10a2 2 0 0 1-2 1.7h-5a2 2 0 0 1-2-1.7zM8 9c0-3 1.8-5 4-5s4 2 4 5M12 4v3',
  soldier: 'M12 2l2 4h-4zM12 6v15M8 21h8M7 10h10l-1 4H8z',
  city: 'M3 21h18M5 21V10l3-2 3 2v11M13 21V6l3-2 3 2v15M7 13h2M15 9h2M15 13h2M7 17h2M15 17h2',
  people: 'M8 11a3 3 0 1 0 0-6a3 3 0 1 0 0 6zM16 11a3 3 0 1 0 0-6a3 3 0 1 0 0 6zM2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M12 20c0-3.3 1.8-6 4-6s6 2.7 6 6',
  officer: 'M12 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8zM4 21c0-4.4 3.6-8 8-8s8 3.6 8 8M9 3l3-1.5L15 3',
  order: 'M5 3h11l3 3v15H5zM9 9h6M9 13h6M9 17h4',
  // 내정
  agri: 'M12 21V9M12 13c-4 0-6-3-6-6c4 0 6 3 6 6zM12 9c0-3 2-6 6-6c0 3-2 6-6 6zM12 17c-3 0-5-2-5-4c3 0 5 2 5 4zM12 17c0-2 2-4 5-4c0 2-2 4-5 4z',
  comm: 'M4 7h16v12H4zM8 7V5a4 4 0 0 1 8 0v2M9 12h6M12 10v4',
  wall: 'M3 21V9h3V6h3v3h2V6h2v3h2V6h3v3h3v12zM10 21v-5a2 2 0 0 1 4 0v5',
  relief: 'M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z',
  // 군사
  conscript: 'M5 21L19 3M15 3h4v4M9 13l-4 4M3 21l2-2M14 21L4 11',
  train: 'M6 21V3M6 4h11l-3 4 3 4H6',
  attack: 'M4 4l10 10M4 4h4M4 4v4M20 4L10 14M20 4h-4M20 4v4M8 16l-4 4M16 16l4 4M7 13l4 4M17 13l-4 4',
  // 인사
  search: 'M10 17a7 7 0 1 0 0-14a7 7 0 1 0 0 14zM15 15l6 6',
  recruit: 'M3 12l4-4 4 3 3-3 7 6-4 4-5-4M7 8l5 5M8 16l2 2M11 15l2 2',
  reward: 'M4 10h16v4H4zM5 14h14v7H5zM12 10v11M12 10c-2 0-5-1-5-3.5S10 5 12 10zM12 10c2 0 5-1 5-3.5S14 5 12 10z',
  move: 'M4 12h14M14 7l5 5-5 5M4 5h6M4 19h6',
  transport: 'M2 14h12V6H2zM14 9h4l3 3.5V14h-7M6 19a2 2 0 1 0 0-4a2 2 0 1 0 0 4zM17 19a2 2 0 1 0 0-4a2 2 0 1 0 0 4z',
  // 계략·외교
  rumor: 'M4 5h16v10H9l-5 4zM8 9h8M8 12h5',
  sow: 'M9 15l-2 2a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0M15 9l2-2a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0M8 4l1 2M4 8l2 1M16 20l-1-2M20 16l-2-1',
  gift: 'M4 9h16v4H4zM6 13h12v8H6zM12 9v12M9 9c-2 0-3-1-3-2.5S8 5 12 9c4-4 6-4 6-2.5S17 9 15 9',
  ally: 'M8 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8zM16 20a4 4 0 1 0 0-8a4 4 0 1 0 0 8zM11 7l5 5M13 17l-5-5',
  surrender: 'M6 21V3M6 4h12v8H6',
  // 기타
  menu: 'M4 7h16M4 12h16M4 17h16',
  save: 'M5 3h12l2 2v16H5zM8 3v6h8V3M8 21v-7h8v7',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  flag: 'M5 21V4M5 4h13l-3 4 3 4H5',
  next: 'M5 12h12M12 6l6 6-6 6',
  scroll: 'M7 4h11a2 2 0 0 1 0 4H7zM7 4a2 2 0 0 0 0 4v10a2 2 0 0 0 2 2h9a2 2 0 0 0 0-4H9',
  check: 'M5 12l5 5 9-10',
  star: 'M12 3l2.6 6 6.4.6-4.8 4.3 1.4 6.3L12 17l-5.6 3.2 1.4-6.3L3 9.6 9.4 9z'
};
SG.UI.icon = function (name, size, cls) {
  var NSx = 'http://www.w3.org/2000/svg';
  var s = document.createElementNS(NSx, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', size || 18); s.setAttribute('height', size || 18);
  s.setAttribute('class', 'ico' + (cls ? ' ' + cls : ''));
  s.setAttribute('aria-hidden', 'true');
  var p = document.createElementNS(NSx, 'path');
  p.setAttribute('d', SG.ICONS[name] || SG.ICONS.order);
  s.appendChild(p);
  return s;
};
