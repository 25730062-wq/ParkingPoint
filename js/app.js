'use strict';
// 모바일 홈 시연용 로직. 실제 주차장 현황/예약 서버 없이 Mock Data를 사용합니다.
const fallbackLots = [
  { id: 'ss-01', name: '성수 공영주차장', area: '성수동', distance: '450m', fee: '5분당 200원', available: 18, lat: 37.5445, lng: 127.0560 },
  { id: 'sf-02', name: '서울숲 공영주차장', area: '서울숲', distance: '760m', fee: '5분당 200원', available: 32, lat: 37.5446, lng: 127.0429 },
  { id: 'gd-03', name: '건대입구 공영주차장', area: '건대입구', distance: '610m', fee: '5분당 250원', available: 11, lat: 37.5404, lng: 127.0707 },
  { id: 'ws-04', name: '왕십리 공영주차장', area: '왕십리', distance: '520m', fee: '5분당 200원', available: 7, lat: 37.5610, lng: 127.0376 }
];
const RECENT_KEY = 'parking-recent-searches';
const FAVORITES_KEY = 'parking-favorites';
const RECENT_LIMIT = 5;
let lots = fallbackLots;

const cards = document.querySelector('#parkingCards');
const note = document.querySelector('#saveNote');
const status = document.querySelector('#statusMessage');
const input = document.querySelector('#destination');
const sectionTitle = document.querySelector('#saved-title');
const recentArea = document.querySelector('#recentSearches');
const recentList = document.querySelector('#recentList');
const findNearestButton = document.querySelector('#findNearest');
const nearestButtonLabel = document.querySelector('#nearestButtonLabel');

function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
  } catch { return []; }
}
function writeList(key, items) {
  try { localStorage.setItem(key, JSON.stringify(items)); return true; }
  catch { status.textContent = '브라우저 저장소를 사용할 수 없어 검색 내역이 저장되지 않았습니다.'; return false; }
}
function scrollToResults() {
  document.querySelector('#resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function showLots(list, { title = '검색 결과', description = '', distances = null } = {}) {
  sectionTitle.textContent = title;
  cards.replaceChildren();
  list.forEach(lot => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'parking-card';
    const left = document.createElement('span');
    const name = document.createElement('span');
    name.className = 'parking-name';
    name.textContent = lot.name;
    const info = document.createElement('div');
    info.className = 'parking-info';
    const distanceText = distances?.get(lot.id) ?? lot.distance;
    info.textContent = `${distanceText} · ${lot.fee}`;
    left.append(name, info);
    const right = document.createElement('span');
    right.className = 'space-count';
    right.textContent = `${lot.available}면`;
    button.append(left, right);
    button.addEventListener('click', () => {
      status.textContent = `${lot.name}: 잔여 ${lot.available}면 · ${lot.fee} (상세 페이지는 다음 단계에서 제작)`;
    });
    cards.append(button);
  });
  note.textContent = description;
}
function renderFavorites(showAll = false) {
  const favoriteIds = readList(FAVORITES_KEY);
  const favorites = lots.filter(lot => favoriteIds.includes(lot.id));
  const shown = favorites.length ? favorites : (showAll ? lots : lots.slice(0, 2));
  showLots(shown, {
    title: '즐겨찾기',
    description: favorites.length
      ? '즐겨찾기 정보는 이 브라우저에 저장되어 있습니다.'
      : '즐겨찾기가 없어 추천 주차장을 표시합니다.'
  });
}
function renderRecent() {
  const terms = readList(RECENT_KEY).slice(0, RECENT_LIMIT);
  recentList.replaceChildren();
  recentArea.hidden = terms.length === 0;
  terms.forEach(term => {
    const item = document.createElement('li');
    item.className = 'recent-item';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'recent-term';
    const clock = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    clock.setAttribute('viewBox', '0 0 24 24');
    clock.setAttribute('aria-hidden', 'true');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '9');
    const hand = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hand.setAttribute('d', 'M12 6v6l4 2');
    clock.append(circle, hand);
    const text = document.createElement('span');
    text.textContent = term;
    button.append(clock, text);
    button.addEventListener('click', () => { input.value = term; searchParking(term); });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'recent-delete';
    remove.setAttribute('aria-label', `최근 검색어 ${term} 삭제`);
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      writeList(RECENT_KEY, readList(RECENT_KEY).filter(item => item !== term));
      renderRecent();
    });
    item.append(button, remove);
    recentList.append(item);
  });
}
function saveRecent(query) {
  const terms = readList(RECENT_KEY).filter(term => term !== query);
  terms.unshift(query);
  writeList(RECENT_KEY, terms.slice(0, RECENT_LIMIT));
  renderRecent();
}
function searchParking(raw) {
  const query = raw.trim();
  if (!query) { status.textContent = '목적지 또는 지역을 입력해 주세요.'; input.focus(); return; }
  saveRecent(query);
  const found = lots.filter(lot => lot.name.includes(query) || lot.area.includes(query));
  showLots(found, {
    title: '검색 결과',
    description: found.length
      ? `‘${query}’ 검색 결과 ${found.length}곳 (Mock Data)`
      : `‘${query}’에 해당하는 시연용 주차장 데이터가 없습니다. 다른 지역으로 검색해 주세요.`
  });
  status.textContent = '';
  scrollToResults();
}
function distanceMeters(lat1, lng1, lat2, lng2) {
  const rad = angle => angle * Math.PI / 180;
  const latDiff = rad(lat2 - lat1);
  const lngDiff = rad(lng2 - lng1);
  const a = Math.sin(latDiff / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(lngDiff / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function formatDistance(meters) {
  return meters < 1000 ? `약 ${Math.round(meters)}m` : `약 ${(meters / 1000).toFixed(1)}km`;
}
function locationErrorMessage(error) {
  if (error.code === 1) return '위치 접근이 거부되었습니다. 브라우저의 위치 권한을 허용한 후 다시 시도해 주세요.';
  if (error.code === 2) return '현재 위치를 확인할 수 없습니다. GPS 또는 위치 서비스를 확인해 주세요.';
  if (error.code === 3) return '위치 확인 시간이 초과되었습니다. 다시 시도해 주세요.';
  return '현재 위치를 가져오는 중 문제가 발생했습니다. 다시 시도해 주세요.';
}
function findNearest() {
  if (!navigator.geolocation || !window.isSecureContext) {
    status.textContent = '위치 기능을 사용하려면 HTTPS 또는 localhost 환경에서 페이지를 열어 주세요.';
    status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
  findNearestButton.disabled = true;
  nearestButtonLabel.textContent = '현재 위치 확인 중…';
  navigator.geolocation.getCurrentPosition(position => {
    findNearestButton.disabled = false;
    nearestButtonLabel.textContent = '내 위치에서 가장 가까운 주차장 찾기';
    const usable = lots
      .filter(lot => lot.available > 0 && Number.isFinite(lot.lat) && Number.isFinite(lot.lng))
      .map(lot => ({ lot, meters: distanceMeters(position.coords.latitude, position.coords.longitude, lot.lat, lot.lng) }))
      .sort((a, b) => a.meters - b.meters);
    if (usable.length === 0) {
      status.textContent = '현재 예약 가능한 시연용 주차장이 없습니다.';
      return;
    }
    const nearest = usable[0];
    showLots([nearest.lot], {
      title: '내 위치에서 가장 가까운 주차장',
      description: `현재 위치 기준 직선거리 ${formatDistance(nearest.meters)} · 시연용 가상 위치 및 잔여 면수 기준`,
      distances: new Map([[nearest.lot.id, formatDistance(nearest.meters)]])
    });
    status.textContent = '가장 가까운 예약 가능 주차장을 찾았습니다.';
    scrollToResults();
  }, error => {
    findNearestButton.disabled = false;
    nearestButtonLabel.textContent = '내 위치에서 가장 가까운 주차장 찾기';
    status.textContent = locationErrorMessage(error);
    status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}

// 검색, 최근 검색어, 위치 기반 한 번 찾기
const searchForm = document.querySelector('#searchForm');
searchForm.addEventListener('submit', event => { event.preventDefault(); searchParking(input.value); });
document.querySelector('#clearRecent').addEventListener('click', () => { writeList(RECENT_KEY, []); renderRecent(); });
findNearestButton.addEventListener('click', findNearest);
document.querySelector('#viewSaved').addEventListener('click', () => {
  renderFavorites(true);
  status.textContent = '저장된 즐겨찾기 및 추천 주차장을 확인하세요.';
});
document.querySelectorAll('[data-pending]').forEach(button => button.addEventListener('click', () => {
  status.textContent = `${button.dataset.pending} 페이지는 아직 제작하지 않았습니다. 현재는 홈 화면만 구현되어 있습니다.`;
  status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}));
document.querySelector('#headerMenu').addEventListener('click', () => { status.textContent = '메뉴 화면은 다음 개발 단계에서 추가합니다.'; });

fetch('data/parking-lots.json')
  .then(response => { if (!response.ok) throw Error('Mock Data를 불러올 수 없습니다.'); return response.json(); })
  .then(data => {
    if (Array.isArray(data) && data.every(lot => typeof lot.name === 'string')) {
      lots = data;
      renderFavorites();
    }
  })
  .catch(() => { /* file:// 접근 시 기본 Mock Data 사용 */ });
renderFavorites();
renderRecent();
