'use strict';
/* Parking Point — 브라우저에서만 동작하는 시연용 모바일 앱. 외부 API/실제 인증 없음. */
(() => {
  const MOCK = window.PARKING_DATA || {lots:[],places:[]};
  const KEYS={recent:'pp:recent:v3',favorites:'pp:favorites:v3',accounts:'pp:accounts:v3',session:'pp:session:v3',reservations:'pp:reservations:v3',draft:'pp:draft:v3',search:'pp:search:v3',position:'pp:position:v3',last:'pp:last-reservation:v3'};
  const LOCATION_CHOICE_KEY='pp:location-choice:v1'; // 탭에서 처음 홈 진입 시 위치 사용 여부를 한 번만 확인
  const page=document.body.dataset.page||'home', prefix=document.body.dataset.prefix||'';
  const main=document.querySelector('#main-content');
  const qp=new URLSearchParams(location.search);
  // 카카오 장소 검색 결과는 서버의 실제 예약 가능 정보가 없으므로 시연용 주차장으로만 저장합니다.
  const EXTERNAL_LOTS_KEY='pp:external-demo-lots:v1';
  const PUBLIC_TARGET_IDS = new Set((MOCK.kakaoTargets||[]).map(t=>'external-demo-pub-'+t.id));
  function loadExternalLots(){
    try {
      const records=JSON.parse(localStorage.getItem(EXTERNAL_LOTS_KEY)||'[]');
      if(Array.isArray(records))for(const lot of records){
        if(lot&&typeof lot.id==='string'&&PUBLIC_TARGET_IDS.has(lot.id)&&
            typeof lot.name==='string'&&!MOCK.lots.some(x=>x.id===lot.id))MOCK.lots.push(lot);
      }
      // 예전 버전에서 수집한 공공데이터 외 주차장은 다시 사용하거나 저장하지 않습니다.
      localStorage.setItem(EXTERNAL_LOTS_KEY,JSON.stringify(records.filter(l=>l&&PUBLIC_TARGET_IDS.has(l.id))));
    } catch(e){console.warn('카카오 주차장 시연 데이터 로드 실패',e);}
  }
  loadExternalLots();
  function saveExternalDemoLot(place){
    const id='external-demo-'+place.id;
    if(!PUBLIC_TARGET_IDS.has(id))return null; // 공공데이터에 없는 주차장은 등록 금지
    const lot={id,name:place.name||'카카오 검색 주차장',address:place.address||'주소 정보 없음',
      area:(place.address||'').replace(/^서울특별시\s*/,'').split(' ').slice(0,2).join(' '),
      lat:Number(place.lat),lng:Number(place.lng),total:Number(place.total)>0?Number(place.total):1,occupied:[],fee5:place.feeKnown?place.fee5:0,feeKnown:!!place.feeKnown,
      hours:place.hours||'운영시간 정보 미제공',entry:'진입로 정보 미제공',floor:'시연용 가상 주차면',
      note:'카카오 지도 위치 정보만 제공됩니다. 실제 예약 및 잔여 면수·요금은 확인되지 않습니다.',
      phone:place.phone||'',manager:place.manager||'',externalDemo:true};
    const idx=MOCK.lots.findIndex(x=>x.id===id);
    if(idx===-1)MOCK.lots.push(lot);else MOCK.lots[idx]=lot;
    try{
      const saved=JSON.parse(localStorage.getItem(EXTERNAL_LOTS_KEY)||'[]');
      const list=Array.isArray(saved)?saved.filter(x=>x&&x.id!==id):[];
      list.unshift(lot);
      // 기존 예약 기록과 연결된 주차장은 캐시 정리에서 제외합니다.
      localStorage.setItem(EXTERNAL_LOTS_KEY,JSON.stringify(list.slice(0,150)));
    }catch(e){console.warn('카카오 주차장 시연 데이터 저장 실패',e);}
    return id;
  }
  const lotBy=id=>MOCK.lots.find(l=>l.id===id);
  const link=(route,params={})=>{
    const path=route==='home'?prefix+'index.html':prefix+'pages/'+route+'.html';
    const q=new URLSearchParams(Object.entries(params).filter(([,v])=>v!==undefined&&v!==null&&v!==''));
    return path+(q.size?'?'+q.toString():'');
  };
  const go=(route,params={})=>{location.href=link(route,params);};
  // 저장된 데이터가 손상되거나 예상한 자료형과 다르면 기본값으로 복구합니다.
  const read=(key,defaultValue)=>{
    try{
      const raw=localStorage.getItem(key);
      if(raw===null)return defaultValue;
      const value=JSON.parse(raw);
      if(value===null)return defaultValue;
      if(Array.isArray(defaultValue)&&!Array.isArray(value))return defaultValue;
      if(defaultValue!==null&&typeof defaultValue==='object'&&!Array.isArray(defaultValue)&&
         (typeof value!=='object'||Array.isArray(value)))return defaultValue;
      return value;
    }catch{return defaultValue;}
  };
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast('브라우저 저장 공간을 사용할 수 없습니다.');return false;}};
  const sessionRead=(key,fallback)=>{try{const v=JSON.parse(sessionStorage.getItem(key));return v===null?fallback:v;}catch{return fallback;}};
  const sessionWrite=(key,value)=>{try{sessionStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const session=()=>read(KEYS.session,null);
  // 존재하는 주차장의 문자열 ID만 즐겨찾기로 인식합니다.
  const favorites=()=>read(KEYS.favorites,[]).filter(id=>typeof id==='string'&&!!lotBy(id));
  const reservations=()=>read(KEYS.reservations,[]);
  const pad=n=>String(n).padStart(2,'0');
  const dateString=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const prettyDate=v=>v?`${v.slice(5,7)}.${v.slice(8,10)}`:'—';
  const prettyFullDate=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return '날짜 정보 없음';const [y,m,d]=v.split('-').map(Number);const weekday=['일','월','화','수','목','금','토'][new Date(y,m-1,d).getDay()];return `${m}월 ${d}일 (${weekday})`;};
  const formatTime=t=>String(t||'').slice(0,5);
  const won=n=>Math.round(n).toLocaleString('ko-KR')+'원';
  const icon=(name,size=20)=>{
    const icons={
      home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
      map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
      calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18"/>',
      user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/>',
      menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
      search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
      pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
      heart:'<path d="M20.8 5.5a5.3 5.3 0 0 0-7.5 0L12 6.8l-1.3-1.3a5.3 5.3 0 1 0-7.5 7.5L12 22l8.8-9a5.3 5.3 0 0 0 0-7.5z"/>',
      locate:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
      clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
      arrow:'<path d="m5 12 14 0m-6-6 6 6-6 6"/>',
      back:'<path d="m15 18-6-6 6-6"/>',
      check:'<path d="m4 12 5 5 11-11"/>',
      x:'<path d="M5 5l14 14M19 5 5 19"/>',
      car:'<path d="m5 11 2-6h10l2 6M4 11h16v8H4zM7 19v2M17 19v2"/><circle cx="7" cy="15" r="1"/><circle cx="17" cy="15" r="1"/>',
      info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
      trash:'<path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14M10 11v6M14 11v6"/>',
      edit:'<path d="M4 20h16M6 16l10-10 3 3-10 10-4 1z"/>',
      logout:'<path d="M11 4H4v16h7M15 16l4-4-4-4M19 12H9"/>'
    };
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.info}</svg>`;
  };
  const state={mapSort:'distance',onlyFree:false,searchTerm:'',origin:null,detailId:'',myTab:'reservations',myFilter:'confirmed',myExpanded:false,mapSelected:null,mapZoom:1,reserveStep:1,selectedSpace:'',currentDraft:null};
  let toastTimer;
  let pendingMyCancelId=null, pendingMyCancelTrigger=null;
  function closeMyCancelDialog(){
    toggle('myCancelDialog',false);
    pendingMyCancelId=null;
    pendingMyCancelTrigger?.focus();
    pendingMyCancelTrigger=null;
  }
  function toast(message){const el=document.querySelector('#toast'); if(!el)return;el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true;},3500);}
  function dist(a,b,c,d){const R=6371000,toRad=n=>n*Math.PI/180;const p1=toRad(a),p2=toRad(c),dp=toRad(c-a),dl=toRad(d-b);const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
  const distanceLabel=n=>Number.isFinite(n)?n>=1000?(n/1000).toFixed(1)+'km':Math.round(n/10)*10+'m':'—';
  function slotLabel(i){return 'A-'+pad(i+1);}
  function statusOf(r){if(r.status==='cancelled')return '취소';if(r.status==='completed')return '이용 완료';if(r.status==='active')return '이용 중';if(new Date(r.endAt).getTime()<Date.now())return '이용 완료';return '이용 예정';}
  function bookConflict(lotId,slot,start,end,excludeId){return reservations().some(r=>r.id!==excludeId&&r.lotId===lotId&&r.slot===slot&&r.status!=='cancelled'&&r.status!=='completed'&&new Date(r.startAt)<new Date(end)&&new Date(start)<new Date(r.endAt));}
  function interval(draft){const day=draft?.date||dateString(new Date());return {start:new Date(`${day}T${draft?.start||'14:00'}:00`).toISOString(),end:new Date(`${day}T${draft?.end||'16:00'}:00`).toISOString()};}
  function freeSlots(lot,start,end){const taken=new Set(lot.occupied);for(const r of reservations()){if(r.lotId===lot.id&&r.status!=='cancelled'&&r.status!=='completed'&&new Date(r.startAt)<new Date(end)&&new Date(start)<new Date(r.endAt))taken.add(r.slot);}return Array.from({length:lot.total},(_,i)=>slotLabel(i)).filter(s=>!taken.has(s));}
  const quickAvailable=lot=>{let free=lot.total-lot.occupied.length;const now=new Date();for(const r of reservations()){if(r.lotId===lot.id&&r.status!=='cancelled'&&r.status!=='completed'&&new Date(r.startAt)<=now&&now<new Date(r.endAt)&&!lot.occupied.includes(r.slot))free--;}return Math.max(free,0);};
  const congestion=lot=>'잔여 정보 미제공';
  const money=(lot,start,end)=>Math.ceil((new Date(end)-new Date(start))/300000)*lot.fee5;
  const owned=()=>reservations().filter(r=>session()&&r.owner===session().id);
  function refDate(){const d=new Date();d.setMinutes(0,0,0);d.setHours(d.getHours()+2);if(d.getHours()>20){d.setDate(d.getDate()+1);d.setHours(14);}return {date:dateString(d),start:`${pad(d.getHours())}:00`,end:`${pad(d.getHours()+2)}:00`};}
  function draftFor(lotId){const old=sessionRead(KEYS.draft,null),base=refDate();if(old?.lotId===lotId)return old;return {lotId,...base,slot:''};}
  function persistDraft(d){sessionWrite(KEYS.draft,d);state.currentDraft=d;}
  function selectOrigin(term){const t=term.trim().toLowerCase();const place=MOCK.places.find(p=>[p.name,...p.aliases].some(a=>a.toLowerCase()===t))||MOCK.places.find(p=>[p.name,...p.aliases].some(a=>a.toLowerCase().includes(t)||t.includes(a.toLowerCase())));return place||null;}
  function searchSave(term){const clean=term.trim();if(!clean)return;write(KEYS.recent,[clean,...read(KEYS.recent,[]).filter(v=>v!==clean)].slice(0,5));}
  function searchGo(term){const clean=term.trim();if(!clean){toast('목적지 또는 지역을 입력해 주세요.');return;}searchSave(clean);go('map',{q:clean});}
  function favoritesToggle(id){let list=favorites();list=list.includes(id)?list.filter(v=>v!==id):[id,...list];write(KEYS.favorites,list);toast(list.includes(id)?'즐겨찾기에 저장했어요.':'즐겨찾기를 해제했어요.');return list.includes(id);}

  /* HTML-first 전환: 화면 구조는 index.html 및 pages/*.html에 직접 작성되어 있습니다.
     JS는 반복 데이터(목록/마커/주차면) 및 상태·이벤트만 갱신합니다.
     TODO: 실제 지도/결제/인증 API는 원본 v4에도 없으므로 추가하지 않았습니다. */
  const $=id=>document.getElementById(id);
  function text(id,value){const e=$(id);if(e)e.textContent=String(value??'');}
  function toggle(id,visible){const e=$(id);if(e)e.hidden=!visible;}
  function href(id,url){const e=$(id);if(e)e.href=url;}
  function setActionId(id,value){const e=$(id);if(e)e.dataset.id=value;}
  function notice(){return '<p class="hint">서울시 주차장 표준데이터 기준 · 실시간 잔여 면수 미제공 · 예약은 시연용입니다.</p>';}
  function empty(title,description,route='map',label='지도에서 찾기'){
    return `<div class="empty"><h2>${safe(title)}</h2><p>${safe(description)}</p><a class="btn outline" href="${link(route)}">${safe(label)}</a></div>`;
  }
  /* 예약 화면 검색 결과용 간단 카드: 이용 안내는 운영시간과 기본 요금만 */
  function reserveCard(lot){
    const w=lot.schedule?.weekday||{},hours=w.start&&w.end?(w.start==='00:00'&&/^23:59|^24:00/.test(w.end)?'24시간':`${w.start}~${w.end}`):'정보 없음';
    const fee=baseFeeLabel(lot),liked=favorites().includes(lot.id);
    return `<article class="lot-card"><a class="lot-body" href="${link('detail',{id:lot.id})}"><div class="lot-title"><strong>${safe(lot.name)} <span class="lot-total">(${Number(lot.total)||0}면)</span></strong></div><div class="lot-meta">${safe(lot.address||lot.area)}</div><div class="lot-badges"><span class="badge quiet">운영시간 ${safe(hours)}</span><strong class="price-highlight">${safe(fee)}</strong></div></a><button class="heart-btn ${liked?'on':''}" type="button" data-action="favorite" data-id="${safe(lot.id)}" aria-label="${safe(lot.name)} 즐겨찾기 ${liked?'해제':'추가'}" aria-pressed="${liked}">${icon('heart',22)}</button></article>`;
  }
  function lotCard(lot,options={}){
    const meters=options.meters,liked=favorites().includes(lot.id);
    return `<article class="lot-card"><a class="lot-body" href="${link('detail',{id:lot.id})}"><div class="lot-title"><strong>${safe(lot.name)} <span class="lot-total">(${Number(lot.total)||0}면)</span></strong></div><div class="lot-meta">${safe(lot.area)} · ${Number.isFinite(meters)?distanceLabel(meters):'거리 미계산'}</div><div class="lot-badges"><span class="badge quiet">${safe(lot.hours)}</span><strong class="price-highlight">${safe(baseFeeLabel(lot))}</strong></div></a><button class="heart-btn ${liked?'on':''}" type="button" data-action="favorite" data-id="${safe(lot.id)}" aria-label="${safe(lot.name)} 즐겨찾기 ${liked?'해제':'추가'}" aria-pressed="${liked}">${icon('heart',22)}</button></article>`;
  }
  function renderRecent(){const rec=read(KEYS.recent,[]);toggle('recentArea',rec.length>0);toggle('reserveRecentEmpty',rec.length===0);const target=$('recentChips');if(!target)return;
    target.innerHTML=rec.map(v=>`<div class="recent-chip"><button type="button" data-action="recent" data-term="${safe(v)}">${icon('clock',14)} ${safe(v)}</button><button class="recent-remove" data-action="remove-recent" data-term="${safe(v)}" aria-label="${safe(v)} 삭제" type="button">×</button></div>`).join('');}
  /* 홈 인기 목록 전용: 상세·예약용 297곳(MOCK.lots)과 지도 표시용 186곳(MOCK.kakaoTargets)의 분리는 절대 변경하지 않습니다. */
  function popularityCard(item){
    const lot=item.lot,mapOnly=item.mapOnly,meters=item.meters;
    const detailLink=mapOnly?link('map',{q:lot.name}):link('detail',{id:lot.id});
    const liked=!mapOnly&&favorites().includes(lot.id);
    const heart=mapOnly?'':`<button class="heart-btn ${liked?'on':''}" type="button" data-action="favorite" data-id="${safe(lot.id)}" aria-label="${safe(lot.name)} 즐겨찾기 ${liked?'해제':'추가'}" aria-pressed="${liked}">${icon('heart',22)}</button>`;
    const area=lot.area||String(lot.address||'').replace(/^서울특별시\s*/, '').split(' ').slice(0,2).join(' ');
    const distance=Number.isFinite(meters)?` · 직선거리 ${distanceLabel(meters)}`:'';
    const fee=baseFeeLabel(lot);
    return `<article class="lot-card"><a class="lot-body" href="${detailLink}"><div class="lot-title"><strong>${safe(lot.name)} <span class="lot-total">(${Number(lot.total)||0}면)</span></strong></div><div class="lot-meta">${safe(area)}${distance}${mapOnly?' · 탐색에서 위치 확인':''}</div><div class="lot-badges"><span class="badge quiet">운영시간 ${safe(lot.hours||'정보 없음')}</span><strong class="price-highlight">${safe(fee)}</strong></div></a>${heart}</article>`;
  }
  function renderHome(){
    renderRecent();
    const target=$('homeFavorites');if(!target)return;
    const statistics=window.PARKING_POPULARITY_MOCK?.parkingLots||[];
    const reservable=new Map(MOCK.lots.filter(l=>/^seoul-\d+$/.test(l.id)).map(l=>[l.id,l]));
    const mapOnly=new Map((MOCK.kakaoTargets||[]).map(l=>[l.id,l]));
    const point=sessionRead(LOCATION_CHOICE_KEY,null)==='allowed'?sessionRead(KEYS.position,null):null;
    const hasPosition=!!point&&Number.isFinite(point.lat)&&Number.isFinite(point.lng);
    const entries=statistics.map(stat=>{
      const lot=reservable.get(stat.parkingId)||mapOnly.get(stat.parkingId);
      if(!lot||`${lot.managementId}|${lot.address}`!==stat.uniqueKey||!Number.isFinite(stat.visits30d))return null;
      return {lot,visits30d:stat.visits30d,rankSeoul:stat.rankSeoul,mapOnly:mapOnly.has(lot.id),meters:hasPosition?dist(point.lat,point.lng,lot.lat,lot.lng):Infinity};
    }).filter(Boolean);
    const popular=(a,b)=>b.visits30d-a.visits30d||a.rankSeoul-b.rankSeoul||a.lot.id.localeCompare(b.lot.id);
    const count=6;
    let selected=[],scope='서울 전체';
    if(hasPosition){
      // 3km → 5km → 그보다 가까운 시설 순서로 넓히되, 6곳을 채울 때까지 검색합니다.
      const three=entries.filter(p=>p.meters<=3000).sort(popular);
      const five=entries.filter(p=>p.meters>3000&&p.meters<=5000).sort(popular);
      const outer=entries.filter(p=>p.meters>5000).sort((a,b)=>a.meters-b.meters||popular(a,b));
      selected=[...three,...five,...outer].slice(0,count);
      const farthest=selected.length?Math.max(...selected.map(p=>p.meters)):0;
      scope=farthest<=3000?'내 주변 3km 이내':farthest<=5000?'내 주변 5km 이내':`내 주변 · 가장 가까운 ${selected.length}곳`;
    }else selected=entries.sort(popular).slice(0,count);
    text('homePopularityScope',scope);
    text('homePopularityNotice',hasPosition?'현재 위치 주변의 추천 순위입니다. 실제 방문 횟수 집계는 아닙니다.':'서울 전체 추천 순위입니다. 실제 방문 횟수 집계는 아닙니다.');
    target.innerHTML=selected.length?selected.map(popularityCard).join(''):'<p class="hint">주차장 목록을 표시할 수 없습니다. 데이터 연결을 확인해 주세요.</p>';
  }
  function initHome(){
    renderHome();
    // 홈에 처음 들어오면 돋보기를 누르기 전에 위치 사용 여부를 묻습니다.
    if(!sessionRead(LOCATION_CHOICE_KEY,null)){
      toggle('locateDialog',true);
      document.querySelector('[data-action="locate-yes"]')?.focus();
    }
  }

  /* ── 목적지 검색 (홈·지도 공통: 홈 검색은 지도 화면으로 이동해 같은 로직을 사용) ──
     ① 등록 주차장 이름과 정확히 일치 → 그 주차장 위치를 기준으로 / ② 아니면 카카오 키워드 검색(keywordSearch)으로 좌표 조회
     → 기준 위치로 지도 이동 → 기준 위치 4.3km 이내 + 이름·주소가 일치하는 주차장을 거리순 표시.
     카카오를 쓸 수 없으면 기존처럼 이름·주소·지역 문자열로만 검색합니다. (임의 좌표·임의 거리 생성 없음) */
  const SEARCH_RADIUS=4300;
  const normName=s=>String(s||'').replace(/\s+/g,'').toLowerCase();
  const isAllTerm=()=>{const t=(state.searchTerm||'').trim();return !t||t==='전체';};
  const isKeywordTerm=()=>!isAllTerm()&&state.searchTerm!=='내 위치';
  const feeOf=l=>l.feeKnown?l.fee5:Infinity;
  const feeLabel=l=>l.feeKnown?`5분당 ${won(l.fee5)}`:'요금 정보 없음';
  function setMapStatus(msg){const el=$('mapStatus');if(!el)return;el.textContent=msg||'';el.hidden=!msg;}
  function setMapContext(){state.searchTerm=qp.get('q')||sessionRead(KEYS.search,'전체');state.onlyFree=qp.get('free')==='1';state.mapSort=qp.get('sort')==='fee'?'fee':'distance';state.origin=state.searchTerm==='내 위치'?sessionRead(KEYS.position,null):selectOrigin(state.searchTerm);state.searchState='idle';
    if(state.searchTerm==='내 위치'){const pos=sessionRead(KEYS.position,null);if(pos)state.origin={name:'내 위치',...pos};}
    else if(isKeywordTerm()&&!state.origin){const exact=MOCK.lots.find(l=>normName(l.name)===normName(state.searchTerm));if(exact){state.origin={name:exact.name,lat:exact.lat,lng:exact.lng};state.mapSelected=exact.id;state.searchState='done';}else state.searchState='pending';}
    sessionWrite(KEYS.search,state.searchTerm);}
  let searchSeq=0;
  /* 카카오 장소 검색 실패 시: 알려진 지역 기준점 또는 서울시 표준데이터의 주소/이름으로만 보완 검색.
     새 주차장은 추가하지 않으며, 297곳(lots) / 186곳(kakaoTargets) 구분도 유지합니다. */
  function offlineSearchOrigin(term){
    const name=String(term||'').trim(),key=normName(name);
    if(!key)return null;
    // 명동은 원본 주차장 이름/주소에 없는 검색어라 명동역 주변 기준 좌표를 사용합니다.
    // 기준점은 역 부근의 참고 위치이며 실시간 검색 API의 검색 결과가 아닙니다.
    if(key==='명동'||key==='명동역')return {name:'명동역 주변',lat:37.56099,lng:126.98632,source:'기준 좌표'};
    const entries=[...MOCK.lots.filter(l=>!l.externalDemo),...TARGETS].filter(l=>
      Number.isFinite(l.lat)&&Number.isFinite(l.lng)&&
      (normName(l.name).includes(key)||normName(l.address).includes(key)||normName(l.area||'').includes(key)));
    if(!entries.length)return null;
    const exact=entries.find(l=>normName(l.name)===key);
    if(exact)return {name:exact.name,lat:exact.lat,lng:exact.lng,source:'등록 주차장 좌표'};
    const lat=entries.reduce((sum,l)=>sum+l.lat,0)/entries.length;
    const lng=entries.reduce((sum,l)=>sum+l.lng,0)/entries.length;
    return {name,lat,lng,source:'등록 주차장 주소·이름 기준 좌표'};
  }
  function searchFallback(kind){
    const t=state.searchTerm,offline=offlineSearchOrigin(t);
    if(offline){
      state.searchState='done';
      state.origin={name:offline.name,lat:offline.lat,lng:offline.lng};
      state.mapSelected=null;kakaoState.focused='';
      setMapStatus(`카카오 장소 검색을 이용할 수 없어 ‘${t}’의 ${offline.source}를 기준으로 주변 주차장을 표시해요. 정확한 장소 검색 결과는 아니에요.`);
      text('mapOrigin',`⌖ ${offline.name}`);kakaoFocus();updateMap();return;
    }
    state.searchState=kind;
    setMapStatus(kind==='notfound'?`‘${t}’에 해당하는 장소를 찾지 못했어요. 등록 주차장 이름·주소로 검색해 보세요.`:kind==='error'?'카카오 장소 검색 요청이 실패했어요. 지도는 사용 가능하지만 일반 장소 검색에는 카카오 API 설정 확인이 필요해요.':'카카오 장소 검색을 이용할 수 없어요. 등록 주차장 이름·주소로 검색해 주세요.');
    text('mapOrigin',kakaoState.map?'⌖ 지도 중심':'⌖ 기준 위치');kakaoFocus();updateMap();
  }
  function resolveKeyword(skipTarget){if(state.searchState!=='pending')return;const k=window.kakao,seq=++searchSeq,term=state.searchTerm;
    if(!k||!k.maps||!k.maps.services){searchFallback('unavailable');return;}
    setMapStatus(`‘${term}’ 위치를 찾는 중이에요…`);
    const tg=!skipTarget&&TARGETS.find(t=>normName(t.name)===normName(term));
    if(tg){geocodeOne(tg,v=>{if(seq!==searchSeq||state.searchState!=='pending')return;if(v){pubState.geo.set(tg.id,v);state.origin={name:tg.name,lat:v.lat,lng:v.lng};state.searchState='done';kakaoState.extSel='pub-'+tg.id;setMapStatus(`‘${tg.name}’은(는) 엑셀에 등록된 주차장입니다. 예약은 시연용입니다.`);text('mapOrigin',`⌖ ${tg.name}`);kakaoFocus();updateMap();updateExtCard();return;}resolveKeyword(true);});return;}
    setTimeout(()=>{if(seq===searchSeq&&state.searchState==='pending'){searchSeq++;searchFallback('error');}},8000);
    new k.maps.services.Places().keywordSearch(term,(data,status)=>{
      if(seq!==searchSeq||term!==state.searchTerm||state.searchState!=='pending')return; /* 늦게 도착한 이전 요청은 무시 */
      const S=k.maps.services.Status,d=status===S.OK&&data&&data[0],lat=d&&Number(d.y),lng=d&&Number(d.x);
      if(d&&Number.isFinite(lat)&&Number.isFinite(lng)){state.origin={name:d.place_name,lat,lng};state.searchState='done';setMapStatus('');text('mapOrigin',`⌖ ${d.place_name}`);kakaoFocus();updateMap();return;}
      searchFallback(status===S.ZERO_RESULT||status===S.OK?'notfound':'error');
    },{location:new k.maps.LatLng(SEOUL_HALL.lat,SEOUL_HALL.lng)});}
  function searchResults(){const t=state.searchTerm.toLowerCase().trim(),nt=normName(t),origin=state.origin,all=!t||t==='전체'||t==='내 위치';let list=MOCK.lots.filter(l=>!l.externalDemo).filter(l=>all||normName(l.name).includes(nt)||l.area.toLowerCase().includes(t)||l.address.toLowerCase().includes(t)||(origin&&dist(origin.lat,origin.lng,l.lat,l.lng)<=SEARCH_RADIUS));/* 원본에 잔여 면수가 없어 '여유만' 필터는 적용하지 않습니다. */return list.map(l=>({...l,meters:origin?dist(origin.lat,origin.lng,l.lat,l.lng):Infinity})).sort((a,b)=>state.mapSort==='fee'?feeOf(a)-feeOf(b)||a.meters-b.meters:a.meters-b.meters||feeOf(a)-feeOf(b));}
  function mapPosition(lot,list){const org=state.origin||{lat:37.5665,lng:126.978,name:'서울'};const points=[...list,org],xs=points.map(p=>p.lng*Math.cos(org.lat*Math.PI/180)),ys=points.map(p=>p.lat),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),x=(lot.lng*Math.cos(org.lat*Math.PI/180)-minX)/Math.max(.008,maxX-minX),y=(lot.lat-minY)/Math.max(.007,maxY-minY);return {x:Math.max(13,Math.min(87,13+74*x)),y:Math.max(15,Math.min(84,84-69*y))};}
  /* 카카오 지도: SDK가 로드되면 실제 지도를 쓰고, 실패하면(file:// 실행, 미등록 도메인 등) 기존 시연용 SVG 지도를 그대로 사용합니다. */
  const kakaoState={map:null,overlays:[],extSel:null,focused:''};
  const SEOUL_HALL={lat:37.5665,lng:126.978};
  const PIN_MAX=7; /* 지도 핀: 엑셀 원본 주차장만 최대 7개 */
  /* ── 서울시 공공데이터 중 예약 시연에서 제외한 186곳(노상·정보 누락 노외) ──
     엑셀에 기록된 도로명/지번 주소만 카카오 주소 검색(Geocoder.addressSearch)에 전달합니다.
     주소를 찾지 못하면 엑셀 원본 좌표가 유효한 경우에만 그 좌표를 사용합니다.
     불러온 좌표는 이 탭의 sessionStorage에만 잠시 보관하고(탭을 닫으면 삭제) 원본 데이터에는 저장하지 않습니다. */
  const TARGETS=MOCK.kakaoTargets||[], GEO_KEY='pp:kakao-geo:address-only:v2';
  const pubState={geo:new Map(),started:false,done:0,failed:0};
  const cleanAddr=a=>String(a||'').replace(/\s*\(.*$/,'').trim();
  const kakaoLink=(name,lat,lng)=>`https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`;
  function geoCacheRead(){try{return JSON.parse(sessionStorage.getItem(GEO_KEY)||'{}')||{};}catch{return {};}}
  function geoCacheWrite(){try{sessionStorage.setItem(GEO_KEY,JSON.stringify(Object.fromEntries(pubState.geo)));}catch{}}
  function geocodeOne(t,cb){
    const k=window.kakao,S=k.maps.services.Status;
    const geocoder=typeof k.maps.services.Geocoder==='function'?new k.maps.services.Geocoder():null;
    const addrs=[cleanAddr(t.address),cleanAddr(t.jibun)].filter((a,i,arr)=>a&&arr.indexOf(a)===i);
    const fallback=()=>cb(Number.isFinite(t.lat)&&Number.isFinite(t.lng)&&t.lat>=33&&t.lat<=39&&t.lng>=124&&t.lng<=132?
      {lat:t.lat,lng:t.lng,via:'엑셀 원본 좌표'}:null);
    const byAddr=i=>{
      if(!geocoder||i>=addrs.length)return fallback();
      geocoder.addressSearch(addrs[i],(r,status)=>{
        const hit=status===S.OK&&r&&r[0];
        const lat=hit&&Number(hit.y),lng=hit&&Number(hit.x);
        if(Number.isFinite(lat)&&Number.isFinite(lng))cb({lat,lng,via:i===0?'엑셀 도로명주소 검색':'엑셀 지번주소 검색'});
        else byAddr(i+1);
      });
    };
    byAddr(0);
  }
  function geocodeTargets(){const k=window.kakao;if(pubState.started||!k||!k.maps||!k.maps.services||!TARGETS.length)return;pubState.started=true;
    const cache=geoCacheRead();const queue=TARGETS.filter(t=>{if(t.id in cache){pubState.geo.set(t.id,cache[t.id]);return false;}return true;});
    let idx=0,active=0,sinceDraw=0;const finish=()=>{geoCacheWrite();renderPins();updateExtCard();};
    const next=()=>{while(active<4&&idx<queue.length){const t=queue[idx++];active++;geocodeOne(t,v=>{pubState.geo.set(t.id,v);v?pubState.done++:pubState.failed++;active--;if(++sinceDraw>=12){sinceDraw=0;finish();}if(idx>=queue.length&&active===0)finish();else next();});}};
    if(queue.length)next();else finish();}
  function pubList(){const out=[];for(const t of TARGETS){const g=pubState.geo.get(t.id);if(g&&Number.isFinite(g.lat)&&Number.isFinite(g.lng))out.push({id:'pub-'+t.id,kind:'pub',name:t.name,type:t.type,feeKnown:!!t.feeKnown&&t.fee5>0,fee5:t.fee5,hours:t.hours,address:t.address,phone:t.phone,manager:t.manager,total:t.total,via:g.via,url:g.url||kakaoLink(t.name,g.lat,g.lng),lat:g.lat,lng:g.lng});}return out;}
  /* 엑셀 483건에 들어 있는 주차장만 표시합니다. 카카오 주변 주차장(PK6)은 수집하지 않습니다. */
  function extAll(){return pubList();}
  function kakaoInit(){const k=window.kakao;if(!k||!k.maps||typeof k.maps.load!=='function')return;k.maps.load(()=>{const el=$('kakaoMap');if(!el)return;el.hidden=false;const scene=$('mapScene');if(scene)scene.hidden=true;const label=document.querySelector('.map-label');if(label)label.textContent='P · 서울시 엑셀 등록 주차장 (상세·예약용 / 지도 표시용)' ;kakaoState.map=new k.maps.Map(el,{center:new k.maps.LatLng(SEOUL_HALL.lat,SEOUL_HALL.lng),level:5});
    /* 지도 이동·확대·축소 시 엑셀에 등록된 주차장만 최대 7개 표시 */
    k.maps.event.addListener(kakaoState.map,'idle',()=>{renderPins();});
    document.querySelectorAll('[data-ext-close]').forEach(close=>close.addEventListener('click',()=>{kakaoState.extSel=null;updateExtCard();renderPins();}));
    if(isAllTerm())text('mapOrigin','⌖ 지도 중심');kakaoFocus();updateMap();resolveKeyword();geocodeTargets();});}
  /* 검색 위치로 이동: 목적지(또는 내 위치)를 중심으로, 가까운 주차장 최대 7곳이 보이도록 맞추되 너무 멀리 축소하지 않음(레벨 3~6) */
  function kakaoFocus(){const m=kakaoState.map,k=window.kakao;if(!m)return;const o=state.origin;
    if(o){const key='o|'+o.lat+','+o.lng;if(key===kakaoState.focused)return;kakaoState.focused=key;const near=searchResults().filter(l=>Number.isFinite(l.meters)).sort((a,b)=>a.meters-b.meters).slice(0,PIN_MAX),c=new k.maps.LatLng(o.lat,o.lng);
      if(!near.length){m.setCenter(c);m.setLevel(4);return;}const b=new k.maps.LatLngBounds();b.extend(c);near.forEach(l=>b.extend(new k.maps.LatLng(l.lat,l.lng)));m.setBounds(b,50,50,50,50);if(m.getLevel()>6){m.setLevel(6);m.setCenter(c);}else if(m.getLevel()<3)m.setLevel(3);return;}
    if(!isAllTerm()&&state.searchState!=='pending'){const first=searchResults()[0],key='t|'+state.searchTerm;if(!first||key===kakaoState.focused)return;kakaoState.focused=key;m.setCenter(new k.maps.LatLng(first.lat,first.lng));m.setLevel(5);}}
  function ownOverlay(l){const k=window.kakao,on=state.mapSelected===l.id,b=document.createElement('button');b.type='button';b.className='map-pin'+(on?' selected':'');b.setAttribute('aria-label',`${l.name} · 전체 ${l.total}면 · 잔여 정보 미제공`);b.setAttribute('aria-pressed',on);b.textContent='P';b.addEventListener('click',e=>{e.stopPropagation();state.mapSelected=l.id;kakaoState.extSel=null;updateExtCard();updateMap();});return new k.maps.CustomOverlay({position:new k.maps.LatLng(l.lat,l.lng),content:b,xAnchor:.5,yAnchor:.5,zIndex:on?5:3,map:kakaoState.map});}
  function extOverlay(d){const k=window.kakao,on=kakaoState.extSel===d.id,b=document.createElement('button');b.type='button';b.className='map-pin-ext'+(on?' selected':'');b.textContent='P';b.setAttribute('aria-label',`${d.name} · 엑셀 등록 ${d.type} 주차장 · 예약 시연`);b.setAttribute('aria-pressed',on);b.addEventListener('click',e=>{e.stopPropagation();kakaoState.extSel=d.id;state.mapSelected=null;updateExtCard();updateMap();});return new k.maps.CustomOverlay({position:new k.maps.LatLng(d.lat,d.lng),content:b,xAnchor:.5,yAnchor:.5,zIndex:on?4:2,map:kakaoState.map});}
  /* 자체 주차장(검색 결과)과 카카오 주차장을 합쳐 지도 가운데에서 가까운 순으로 최대 7개만 표시. 선택한 주차장은 항상 포함 */
  function renderPins(){const m=kakaoState.map;if(!m)return false;const c=m.getCenter(),la=c.getLat(),ln=c.getLng();
    const own=searchResults().map(l=>({kind:'own',item:l,d:dist(la,ln,l.lat,l.lng)})),ext=extAll().map(x=>({kind:'ext',item:x,d:dist(la,ln,x.lat,x.lng)})).sort((a,b)=>a.d-b.d);
    let picks=[...own,...ext].sort((a,b)=>a.d-b.d).slice(0,PIN_MAX);
    const selExt=kakaoState.extSel&&(ext.find(p=>p.item.id===kakaoState.extSel)||extAll().filter(x=>x.id===kakaoState.extSel).map(x=>({kind:'ext',item:x,d:dist(la,ln,x.lat,x.lng)}))[0]);
    const keep=[own.find(p=>p.item.id===state.mapSelected),selExt].filter(p=>p&&!picks.includes(p));
    if(keep.length)picks=[...picks.slice(0,PIN_MAX-keep.length),...keep];
    kakaoState.overlays.forEach(o=>o.setMap(null));kakaoState.overlays=picks.map(p=>p.kind==='own'?ownOverlay(p.item):extOverlay(p.item));return true;}
  /* 정보 창: 현재 자리(시연 예약 기준 남은 면 / 전체 면), 기본 요금 */
  const seatsLabel=(avail,total)=>total>0?`<span class="parking-fraction" aria-label="예약 가능 ${Math.max(0,Number(avail)||0)}면, 전체 ${total}면">${Math.max(0,Number(avail)||0)}/${total}</span>`:'정보 없음';
  const baseFeeLabel=l=>l.baseTime>0&&l.baseFee>0?`${l.baseTime}분당 ${won(l.baseFee)}`:(l.feeKnown&&l.fee5>0?`5분당 ${won(l.fee5)}`:'요금 정보 없음');
  function updateExtCard(){const sel=extAll().find(d=>d.id===kakaoState.extSel),card=$('mapExt');if(!card)return;card.hidden=!sel;if(!sel)return;
    text('mapExtBadge',`${sel.type} · 서울시 엑셀 등록 · 예약 시연`);
    text('mapExtName',sel.name);text('mapExtMeta',sel.address||'주소 정보 없음');
    const detail=$('mapExtDetail');if(detail)detail.href=kakaoLink(sel.name,sel.lat,sel.lng);
    const saved=lotBy('external-demo-'+sel.id);$('mapExtSeats').innerHTML=seatsLabel(saved?quickAvailable(saved):sel.total,sel.total);text('mapExtFee',baseFeeLabel(sel));
    const reserve=$('mapExtLink');if(reserve){reserve.href='#';reserve.onclick=e=>{e.preventDefault();const id=saveExternalDemoLot(sel);if(!id){toast('이 주차장은 예약 시연을 지원하지 않습니다.');return;}go('reserve',{id});};}}
  function initMap(){setMapContext();if(qp.get('lot'))state.mapSelected=qp.get('lot');kakaoInit();{const mq=$('mapQuery');if(mq)mq.value=(state.searchTerm==='내 위치'||state.searchTerm==='전체')?'':state.searchTerm;} text('mapOrigin',state.searchState==='pending'?'⌖ 위치 찾는 중':`⌖ ${state.origin?.name||'기준 위치'}`);updateMap();
    const k=window.kakao;if(!(k&&k.maps&&typeof k.maps.load==='function'))resolveKeyword(); /* SDK 자체를 못 불러온 경우: 문자열 검색으로 */
    setTimeout(()=>{if(state.searchState==='pending'&&!kakaoState.map){searchSeq++;searchFallback('unavailable');}},8000);}
  function updateMap(){const list=searchResults(),shown=list.slice(0,5);/* 주변 주차장 목록은 정렬 기준(거리순·요금순) 상위 5곳만 표시 */text('mapCount',shown.length+'곳');if($('mapList'))$('mapList').innerHTML=list.length?shown.map(l=>lotCard(l,{meters:l.meters})).join(''):(state.searchState==='pending'?empty('위치를 찾는 중이에요','잠시만 기다려 주세요.'):empty('검색 결과가 없어요',state.origin&&state.searchState==='done'?`‘${state.origin.name}’ 주변 4.3km 안에 등록된 주차장이 없어요. 지도에는 엑셀에 등록된 주차장만 표시돼요.`:'다른 목적지·역 이름·주차장 이름으로 검색해 보세요.'));
    document.querySelectorAll('[data-action="sort"]').forEach(b=>{const yes=b.dataset.sort===state.mapSort;b.classList.toggle('on',yes);b.setAttribute('aria-pressed',yes);});
    const free=document.querySelector('[data-action="free"]');if(free){free.classList.toggle('on',state.onlyFree);free.setAttribute('aria-pressed',state.onlyFree);free.textContent='잔여 정보 없음';free.disabled=true;}
    if(state.mapSelected&&!list.some(l=>l.id===state.mapSelected))state.mapSelected=null;
    if(!renderPins())$('mapPins').innerHTML=list.slice(0,7).map(l=>{const p=mapPosition(l,list.slice(0,7));return `<button class="map-pin ${state.mapSelected===l.id?'selected':''} ${''}" type="button" data-action="map-pin" data-id="${safe(l.id)}" aria-label="${safe(l.name)} · 전체 ${l.total}면 · 잔여 정보 미제공" aria-pressed="${state.mapSelected===l.id}" style="left:${p.x}%;top:${p.y}%"><span>P</span></button>`;}).join('');
    $('mapScene').style.transform=`scale(${state.mapZoom})`;const lot=list.find(l=>l.id===state.mapSelected);toggle('mapSelection',!!lot);if(lot){text('mapSelectedCongestion',congestion(lot));text('mapSelectedName',lot.name);text('mapSelectedMeta',lot.address||'주소 정보 없음');$('mapSelectedSeats').innerHTML=seatsLabel(quickAvailable(lot),lot.total);text('mapSelectedFee',baseFeeLabel(lot));href('mapSelectedDetail',link('detail',{id:lot.id}));href('mapSelectedReserve',link('reserve',{id:lot.id}));text('mapSelectedReserve',quickAvailable(lot)?'예약하기':'시간대 확인');}
  }

  /* 원본 할인 정책 문구는 변경하지 않고 '+'로 연결된 항목을 보기 좋게만 분리합니다. */
  function renderDetailNote(note){ return ''; }
  function initDetail(){
    const lot=lotBy(qp.get('id'));toggle('detailView',!!lot);toggle('detailMissing',!lot);if(!lot)return;state.detailId=lot.id;
    text('detailName',lot.name);text('detailAddress',lot.address||'주소 정보 없음');
    text('detailTotal',`${Number(lot.total)||0}면`);
    const sched=lot.schedule||{},days=String(lot.hours||'');
    const showHours=(obj,enabled)=>{if(!obj?.start||!obj?.end)return '운영시간 정보 없음';if(!enabled||obj.start==='00:00'&&obj.end==='00:00')return '운영 안 함';return `${obj.start}~${obj.end}`;};
    text('detailHours',sched.weekday?showHours(sched.weekday,true):(lot.hours||'정보 없음'));
    text('detailSaturday',showHours(sched.saturday,days.includes('토요일')));
    text('detailHoliday',showHours(sched.holiday,days.includes('공휴일')));
    text('detailPrice',baseFeeLabel(lot));
    const detailNote=$('detailNote');if(detailNote){detailNote.innerHTML='';detailNote.hidden=true;}
    const image=$('detailImage');if(image){const meta=parkingImageMeta(lot);image.src=prefix+'assets/'+meta.filename;image.alt=meta.alt||'주차장 대표 이미지';}
    const f=$('detailFavorite');f.dataset.id=lot.id;const liked=favorites().includes(lot.id);f.classList.toggle('on',liked);f.setAttribute('aria-pressed',liked);f.setAttribute('aria-label',liked?'즐겨찾기 해제':'즐겨찾기 추가');
    const nearest=sessionRead('pp:nearest',null);toggle('nearestResult',nearest?.lotId===lot.id);if(nearest?.lotId===lot.id)text('nearestResult','내 위치에서 가장 가까운 등록 주차장 · 직선거리 '+distanceLabel(nearest.meters));
    const a=$('detailBook');a.href=link('reserve',{id:lot.id});a.setAttribute('aria-disabled',false);a.innerHTML=`예약하기 ${icon('arrow',19)}`;
    a.onclick=null;
  }

  async function digest(text){if(window.crypto?.subtle){const bytes=new TextEncoder().encode(text),hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');}let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return 'demo-'+(h>>>0).toString(16);}
  function checkPhone(s){return /^01[016789]-?\d{3,4}-?\d{4}$/.test(s.replace(/\s/g,''));}
  function restoreReturn(){const back=sessionRead('pp:after-login',null);if(back){sessionStorage.removeItem('pp:after-login');if(back.type==='reserve')go('reserve',{id:back.lotId,step:2});else if(back.type==='route')go(back.route);return;}go('my');}
  /* STEP 3: 가입 필드를 이메일 / 비밀번호 / 비밀번호 확인 / 닉네임으로 변경.
     기존 예약 소유자 판별(owner === account.id)을 유지하기 위해 id에는 이메일을 저장합니다.
     phone은 신규 회원가입에서 받지 않으며 예약 과정에서 별도 입력받습니다.
     TODO: 이메일 인증/계정 복구는 서버 없이 구현하지 않습니다. */
  async function onSignup(form){
    const f=new FormData(form);
    const email=String(f.get('email')||'').trim().toLowerCase();
    const password=String(f.get('password')||''),confirm=String(f.get('confirm')||'');
    const nickname=String(f.get('nickname')||'').trim();
    const err=document.querySelector('#signupError');
    err.textContent='';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254){err.textContent='올바른 이메일 주소를 입력해 주세요.';return;}
    if(read(KEYS.accounts,[]).some(a=>String(a.id).toLowerCase()===email)){err.textContent='이미 가입된 이메일입니다.';return;}
    if(password.length<8||!/[A-Za-z]/.test(password)||!/\d/.test(password)||!/[!@#$%^&*()_+\-=?.:,;~]/.test(password)){err.textContent='비밀번호는 8자 이상, 영문자·숫자·특수문자를 각각 1개 이상 포함해야 합니다.';return;}
    if(password!==confirm){err.textContent='비밀번호 확인이 일치하지 않습니다.';return;}
    if(nickname.length<2||nickname.length>20){err.textContent='닉네임을 2~20자로 입력해 주세요.';return;}
    if(!f.get('consent')){err.textContent='필수 약관에 동의해 주세요.';return;}
    const salt=Math.random().toString(36).slice(2),passwordHash=await digest(salt+password);
    const account={id:email,email,nickname,name:nickname,phone:'',salt,passwordHash};
    if(!write(KEYS.accounts,[...read(KEYS.accounts,[]),account]))return;
    write(KEYS.session,{id:email,name:nickname,phone:''});
    toast('시연용 계정이 만들어졌습니다.');restoreReturn();
  }
  async function onLogin(form){
    const f=new FormData(form),id=String(f.get('username')||'').trim(),pw=String(f.get('password')||'');
    const acc=read(KEYS.accounts,[]).find(a=>String(a.id).toLowerCase()===id.toLowerCase());
    const e=document.querySelector('#loginError');
    if(!acc||await digest(acc.salt+pw)!==acc.passwordHash){e.textContent='이메일(또는 기존 아이디)이나 비밀번호가 올바르지 않습니다.';return;}
    write(KEYS.session,{id:acc.id,name:acc.name,phone:acc.phone||''});restoreReturn();
  }

  function reserveDateValidate(draft,show=true){try{const start=new Date(`${draft.date}T${draft.start}:00`),end=new Date(`${draft.date}T${draft.end}:00`);if(!draft.date||Number.isNaN(+start)||Number.isNaN(+end)||start<Date.now()-60000||end<=start||end-start>24*3600000){if(show)toast('오늘 이후 날짜와 올바른 시작·종료 시간을 선택해 주세요. (최대 24시간)');return false;}return true;}catch{return false;}}
  function reserveSearch(term){
    const q=term.trim();if(!q){toast('목적지 또는 주차장명을 입력해 주세요.');return;}
    searchSave(q);renderRecent();
    const target=$('reserveSearchResults');if(!target)return;
    const normalized=q.toLowerCase().replace(/\s/g,'');
    const found=MOCK.lots.filter(l=>[l.name,l.address,l.area].some(s=>String(s||'').toLowerCase().replace(/\s/g,'').includes(normalized))).slice(0,20);
    target.innerHTML=found.length?'<p class="hint">등록 주차장 검색 결과 '+found.length+'건 (최대 20개 표시)</p>'+found.map(l=>`<div class="quick-book-row">${reserveCard(l)}<a class="small-btn" href="${link('reserve',{id:l.id})}">이 주차장 예약하기 →</a></div>`).join(''):'<p class="hint">일치하는 등록 주차장이 없습니다. 지도의 목적지 검색으로 주변 주차장을 찾아보세요.</p><a class="btn outline full" href="'+link('map',{q})+'">지도에서 주변 검색 →</a>';
  }
  function initReserve(){const lotId=qp.has('search')?null:qp.get('id'),lot=lotBy(lotId); /* 주차장 id가 있을 때만 주차면 선택, 없으면 검색 화면 */toggle('reserveChoose',!lot);toggle('reserveFlow',!!lot);
    if(!lot){renderRecent();return;}
    if(lot.externalDemo){
      const heading=$('reserveLotName');
      if(heading&&!document.getElementById('externalDemoNotice')){
        const note=document.createElement('p');note.id='externalDemoNotice';note.className='hint';
        note.textContent='카카오 검색 주차장은 실제 예약 정보를 제공하지 않습니다. 화면의 1개 주차면은 기능 체험용이며 현장 예약·빈자리·요금을 보장하지 않습니다.';
        heading.insertAdjacentElement('afterend',note);
      }
    }
    state.currentDraft=draftFor(lot.id);state.selectedSpace=state.currentDraft.slot||'';state.reserveStep=Number(qp.get('step'))===2?2:1;
    href('pageBack',link('detail',{id:lot.id}));text('reserveLotName',lot.name);updateReserve();}
  function updateReserve(){const lot=lotBy(state.currentDraft?.lotId);if(!lot)return;const second=state.reserveStep===2;
    if(second&&!state.currentDraft.slot)state.reserveStep=1;const info=state.reserveStep===2;toggle('slotStep',!info);toggle('infoStep',info);
    if($('reserveStage1'))$('reserveStage1').classList.toggle('current',!info);if($('reserveStage2'))$('reserveStage2').classList.toggle('current',info);
    text('reserveTitle',info?'예약자 정보를 입력해 주세요':(state.selectedSpace?'선택한 주차면을 확인하세요':'날짜·시간과 주차면을 선택하세요'));
    const title=document.querySelector('.pagebar strong');if(title)title.textContent=info?'예약 · 정보 입력':'예약 · 주차면 선택';
    if(info)updateInfo();else updateSlots();}
  function updateSlots(){const lot=lotBy(state.currentDraft.lotId),draft=state.currentDraft;
    const form=$('reservationTime');form.elements.date.value=draft.date;form.elements.date.min=dateString(new Date());form.elements.start.value=draft.start;form.elements.end.value=draft.end;
    const valid=reserveDateValidate(draft,false),a=new Date(`${draft.date}T${draft.start}:00`),b=new Date(`${draft.date}T${draft.end}:00`),free=valid?freeSlots(lot,a,b):[],freeSet=new Set(free);
    if(state.selectedSpace&&!freeSet.has(state.selectedSpace)){state.selectedSpace='';draft.slot='';persistDraft(draft);}
    // 주차면 수 설명을 보여주지 않고 영수증에서 선택·시간·금액을 확인합니다.
    $('slotGrid').innerHTML=Array.from({length:lot.total},(_,i)=>{const slot=slotLabel(i),okay=freeSet.has(slot);return `<button type="button" class="slot ${okay?'':'disabled'} ${state.selectedSpace===slot?'chosen':''}" data-action="select-slot" data-slot="${slot}" ${okay?'':'disabled'} aria-pressed="${state.selectedSpace===slot}">${icon('car',16)}<span>${slot}</span></button>`;}).join('');
    text('selectedSlot',state.selectedSpace||'선택 전');text('reserveTitle',state.selectedSpace?'선택한 주차면을 확인하세요':'날짜·시간과 주차면을 선택하세요');$('reservationNext').disabled=!state.selectedSpace||!valid;
    const receipt=$('reserveReceipt');if(receipt){receipt.hidden=!(valid&&state.selectedSpace);if(!receipt.hidden){
      const duration=Math.round((b-a)/60000);text('receiptLotName',lot.name);text('receiptWhen',`${prettyDate(draft.date)} ${draft.start}~${draft.end}`);text('receiptDuration',`${Math.floor(duration/60)}시간 ${duration%60}분`);
      text('receiptPrice',!lot.feeKnown?'요금 정보 없음':won(money(lot,a,b)));
    }}
  }
  function updateInfo(){const d=state.currentDraft,lot=lotBy(d.lotId),account=session(),form=$('bookingForm');if(!d.slot){state.reserveStep=1;updateReserve();return;}
    text('bookingLotName',lot.name);text('bookingSlot',d.slot);text('bookingWhen',`${prettyDate(d.date)} · ${d.start}~${d.end}`);text('bookingFee',lot.externalDemo&&!lot.feeKnown?'요금 정보 미제공 (시연용)':won(money(lot,new Date(`${d.date}T${d.start}:00`),new Date(`${d.date}T${d.end}:00`))));
    form.elements.phone.value=d.phone||account?.phone||'';form.elements.plate.value=d.plate||'';}
  function onBooking(form){const f=new FormData(form),d=state.currentDraft,l=lotBy(d?.lotId);if(!d||!l)return;d.name=session()?.name||d.name||'예약자';d.phone=String(f.get('phone')).trim();d.plate=String(f.get('plate')).trim();persistDraft(d);
    const err=$('bookingError');if(!checkPhone(d.phone)||d.plate.replace(/\s/g,'').length<5){err.textContent='연락처와 차량번호를 올바르게 입력해 주세요.';return;}if(!reserveDateValidate(d))return;
    const start=new Date(`${d.date}T${d.start}:00`),end=new Date(`${d.date}T${d.end}:00`);if(!freeSlots(l,start,end).includes(d.slot)){err.textContent='선택한 시간에 이미 예약된 주차면입니다. 다른 주차면을 선택해 주세요.';return;}
    if(!session()){sessionWrite('pp:after-login',{type:'reserve',lotId:d.lotId});toast('예약 확정을 위해 로그인해 주세요. 입력한 정보는 유지됩니다.');go('login',{next:'reserve'});return;}
    const now=Date.now(),id='PK-'+dateString(new Date()).replace(/-/g,'').slice(2)+'-'+String(now).slice(-7),booking={id,owner:session().id,lotId:l.id,slot:d.slot,name:d.name,phone:d.phone,plate:d.plate,date:d.date,startTime:d.start,endTime:d.end,startAt:start.toISOString(),endAt:end.toISOString(),price:l.externalDemo&&!l.feeKnown?null:money(l,start,end),createdAt:new Date().toISOString(),status:'confirmed'};
    if(!write(KEYS.reservations,[booking,...reservations()]))return;sessionWrite(KEYS.last,id);sessionStorage.removeItem(KEYS.draft);go('completed',{rid:id});}

  function initCompleted(){const id=qp.get('rid')||sessionRead(KEYS.last,null),r=reservations().find(v=>v.id===id),lot=r&&lotBy(r.lotId);toggle('completedView',!!lot);toggle('completedMissing',!lot);if(!lot)return;
    text('completedId',r.id);text('completedLot',lot.name);text('completedSlot',r.slot);text('completedTime',`${prettyDate(r.date)} ${r.startTime}~${r.endTime}`);text('completedStatus',statusOf(r));text('completedPrice',r.price===null||r.price===undefined?'요금 정보 없음':won(r.price));setActionId('completedFavorite',lot.id);text('completedFavoriteText',favorites().includes(lot.id)?'즐겨찾기 해제':'이 주차장 즐겨찾기');href('completedDetailLink',link('reservation-detail',{rid:r.id}));}
  const PARKING_IMAGE_POOL=[{"filename": "parking_01.webp", "alt": "나무와 도심 건물 사이에 차량이 양옆으로 주차된 야외 주차장"}, {"filename": "parking_02.webp", "alt": "외부 풍경이 보이는 개방형 주차층과 양쪽 주차 차량"}, {"filename": "parking_03.webp", "alt": "조명이 켜진 실내 주차장 중앙 통로와 양쪽 주차된 차량"}, {"filename": "parking_04.webp", "alt": "나무 그림자가 도로에 드리운 도심 야외 주차장"}, {"filename": "parking_05.webp", "alt": "도시 건물과 먼 산을 바라보는 옥상 주차장과 주차 차량"}, {"filename": "parking_06.webp", "alt": "천창으로 햇살이 들어오는 철골식 주차장의 차량과 차로"}, {"filename": "parking_07.webp", "alt": "일반 차량 옆에 파란 장애인 전용 주차 공간이 있는 야외 주차장"}, {"filename": "parking_08.webp", "alt": "낮은 주택을 배경으로 승용차가 양옆에 놓인 동네 주차장"}, {"filename": "parking_09.webp", "alt": "초록색 전기차 충전 구역과 충전기가 양쪽에 있는 야외 주차장"}, {"filename": "parking_10.webp", "alt": "해 질 녘 가로등 불빛이 켜진 도심 야외 주차장"}, {"filename": "parking_11.webp", "alt": "유리 계단실이 붙어 있는 여러 층의 현대식 주차장 건물"}, {"filename": "parking_12.webp", "alt": "차량용 차단기와 정산기가 설치된 주차 건물 입구"}, {"filename": "parking_13.webp", "alt": "노을이 반사된 비어 있는 옥상 주차 공간과 도심 전경"}, {"filename": "parking_14.webp", "alt": "유리 외벽 오피스 옆에 주차면이 배열된 야외 주차장"}, {"filename": "parking_15.webp", "alt": "나무 그늘의 빈 주차면과 건물 옆에 선 차량들"}, {"filename": "parking_16.webp", "alt": "천장 배관 아래 긴 주행 통로를 따라 차량이 늘어선 지하주차장"}, {"filename": "parking_17.webp", "alt": "앞쪽 주행 화살표와 정면 벽이 보이는 환한 실내 주차장"}, {"filename": "parking_18.webp", "alt": "차단기와 과속방지턱 뒤로 주차면이 보이는 야외 주차장"}, {"filename": "parking_19.webp", "alt": "지붕 달린 정산 설비 옆으로 차량이 늘어선 야외 주차장"}, {"filename": "parking_20.webp", "alt": "큰 흰색 기둥과 자동차가 전경에 있는 실내 주차장"}, {"filename": "parking_21.webp", "alt": "녹지와 작은 시설 건물을 배경으로 차들이 놓인 넓은 야외 주차장"}, {"filename": "parking_22.webp", "alt": "주차 차량 사이로 2층 주차시설 입구가 보이는 도심 주차장"}, {"filename": "parking_23.webp", "alt": "주차된 차와 멀리 도시 전망이 보이는 옥상 주차장"}, {"filename": "parking_24.webp", "alt": "꽃과 나무로 둘러싸인 주차장 중앙 통로와 주차 차량"}, {"filename": "parking_25.webp", "alt": "건물 측벽과 주차 차량 너머로 도심이 펼쳐지는 옥상 주차장"}, {"filename": "parking_26.webp", "alt": "건물과 나무 사이에 빈 주차면이 있는 한산한 도심 주차장"}, {"filename": "parking_27.webp", "alt": "안쪽 출입문까지 차량 통로가 뻗어 있는 지하주차장"}, {"filename": "parking_28.webp", "alt": "전경 차량과 하얀 진행 화살표가 보이는 넓은 지하주차장"}, {"filename": "parking_29.webp", "alt": "가로수 아래 도로변에 승용차가 길게 늘어선 노상주차 구역"}, {"filename": "parking_30.webp", "alt": "천막으로 된 시장 가게 앞에 차량이 주차된 주차 구획"}, {"filename": "parking_31.webp", "alt": "노을이 지는 강변에 주차된 차량과 멀리 보이는 다리"}, {"filename": "parking_32.webp", "alt": "비에 젖은 야외 주차장 바닥에 가로등이 반사되는 밤 풍경"}, {"filename": "parking_33.webp", "alt": "파란 벽면과 안전무늬를 따라 굽어 내려가는 지하주차장 램프"}, {"filename": "parking_34.webp", "alt": "차량이 여러 층 철제 플랫폼에 적재된 기계식 주차시설"}, {"filename": "parking_35.webp", "alt": "고층 아파트 앞 도로 양편에 승용차가 주차된 단지 주차장"}, {"filename": "parking_36.webp", "alt": "축구장 바로 옆 여러 줄로 자동차가 선 대형 주차장"}, {"filename": "parking_37.webp", "alt": "낡은 건물 벽 앞에 차량 몇 대가 세워진 작은 주차장"}, {"filename": "parking_38.webp", "alt": "파란 전기차 전용 주차면과 옆에 설치된 두 대의 충전기"}, {"filename": "parking_39.webp", "alt": "주차장 관리실 앞 차량 차단기와 정산 단말기가 있는 입구"}, {"filename": "parking_40.webp", "alt": "차량과 주차선이 바둑판처럼 배열된 주차장을 위에서 내려다본 풍경"}];

  function parkingImageMeta(lot){
    const key=String(lot?.name||lot?.id||'parking-point');
    let hash=0;
    for(let i=0;i<key.length;i++) hash=((hash<<5)-hash+key.charCodeAt(i))|0;
    const idx=Math.abs(hash)%PARKING_IMAGE_POOL.length;
    return PARKING_IMAGE_POOL[idx]||{filename:'parking_01.webp',alt:'주차장 대표 이미지'};
  }
  function parkingImage(lot){
    const meta=parkingImageMeta(lot);
    return prefix+'assets/'+meta.filename;
  }

  function bookingCard(r){
    const lot=lotBy(r.lotId),status=statusOf(r),showBadge=status!=='이용 예정';
    const price=r.price===null||r.price===undefined?'요금 정보 없음':won(r.price);
    return `<article class="booking-card my-booking-card"><div class="my-booking-main"><img class="my-booking-image" src="${parkingImage(lot)}" alt="${safe(parkingImageMeta(lot).alt||'주차장 대표 이미지')}" loading="lazy"/><div class="my-booking-info">${showBadge?`<span class="badge">${safe(status)}</span>`:''}<h3>${safe(lot?.name||'주차장')}</h3><div class="booking-secondary">${safe(lot?.address||'주소 정보 없음')}</div><div class="booking-secondary">${safe(r.slot)} · ${safe(r.plate)}</div></div></div><div class="my-booking-highlights"><div><span>예약 시간</span><strong class="my-booking-day">${safe(prettyFullDate(r.date))}</strong><strong class="my-booking-time">${safe(r.startTime)}~${safe(r.endTime)}</strong></div><div><span>예상 금액</span><strong class="price-highlight">${safe(price)}</strong></div></div>${r.status==='confirmed'&&new Date(r.endAt)>new Date()?`<div class="my-booking-actions"><button class="my-booking-cancel" data-action="cancel" data-id="${safe(r.id)}" type="button">예약 취소</button></div>`:''}<a class="my-booking-link" href="${link('reservation-detail',{rid:r.id})}" aria-label="${safe(lot?.name||'주차장')} 예약 상세 보기"></a></article>`;
  }
  function initMy(){
    state.myFilter='all';state.myExpanded=false;
    for(const id of ['myDateFilter','myDateSort','myAddressQuery']){
      $(id).addEventListener(id==='myAddressQuery'?'input':'change',()=>{state.myExpanded=false;updateMy();});
    }
    updateMy();
  }
  function updateMy(){
    const user=session();text('myName',user?user.name+'님':'방문자님');text('myGreeting',user?'내 주차를 한 곳에서 관리하세요.':'로그인하면 내 예약을 확인할 수 있어요.');toggle('myLogout',!!user);
    const fav=favorites().map(lotBy).filter(Boolean);text('myFavoriteCount',fav.length+'곳');
    $('myFavoriteCards').innerHTML=fav.length?fav.map(l=>lotCard(l)).join(''):empty('저장한 주차장이 없습니다','지도에서 주차장을 즐겨찾기에 추가해 보세요.');
    $('myFilters').hidden=!user;
    $('myAlwaysFilters').hidden=!user;
    $('myReservationFilters').hidden=!user;
    if(!user){$('myReservationCards').innerHTML='<div class="empty"><h2>로그인이 필요합니다</h2><p>로그인 후 예약 내역을 확인할 수 있어요.</p></div>';text('myCount','전체 0건');toggle('myMoreButton',false);return;}
    const all=owned().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const date=$('myDateFilter').value;
    const address=$('myAddressQuery').value.trim().toLocaleLowerCase('ko-KR').replace(/\s+/g,'');
    const order=$('myDateSort').value;
    const filtered=all.filter(r=>{
      const matchesStatus=state.myFilter==='all'||(state.myFilter==='confirmed'&&statusOf(r)==='이용 예정')||(state.myFilter==='active'&&statusOf(r)==='이용 중')||(state.myFilter==='past'&&['이용 완료','취소'].includes(statusOf(r)));
      const matchesDate=!date||r.date===date;
      const lot=lotBy(r.lotId);
      const matchesAddress=!address||String(lot?.address||lot?.area||'').toLocaleLowerCase('ko-KR').replace(/\s+/g,'').includes(address);
      return matchesStatus&&matchesDate&&matchesAddress;
    }).sort((a,b)=>{
      const aDate=(a.date||'')+' '+(a.startTime||'');
      const bDate=(b.date||'')+' '+(b.startTime||'');
      const dateDiff=aDate.localeCompare(bDate);
      return (order==='oldest'?dateDiff:-dateDiff)||(new Date(b.createdAt)-new Date(a.createdAt));
    });
    const shown=state.myExpanded?filtered:filtered.slice(0,2);
    const searching=!!date||!!address;
    toggle('mySearchSummary',searching);text('mySearchSummary',`검색 결과 ${filtered.length}건`);
    text('myCount',`${state.myFilter==='active'?'이용 중 ':state.myFilter==='past'?'완료·취소 ':'전체 '}${filtered.length}건`);document.querySelectorAll('[data-action="my-filter"]').forEach(b=>b.classList.toggle('on',b.dataset.filter===state.myFilter));
    $('myReservationCards').innerHTML=shown.length?shown.map(bookingCard).join(''):searching?'<div class="empty"><h2>검색 결과가 없습니다</h2><p>예약 날짜나 주차장 주소를 다시 확인해 주세요.</p></div>':empty('해당 예약이 없습니다','다른 상태를 선택하거나 새 주차장을 찾아보세요.');
    toggle('myMoreButton',filtered.length>2);text('myMoreButton',state.myExpanded?'접기 ↑':`더 보기 (${filtered.length-2}건) ↓`);
  }

  function updateFavorites(){const fav=favorites().map(lotBy).filter(Boolean);text('favoriteCount',fav.length+'곳');$('favoriteCards').innerHTML=fav.length?fav.map(l=>`<div>${lotCard(l)}<a class="small-btn align-right" href="${link('reserve',{id:l.id})}">바로 예약하기 ${icon('arrow',15)}</a></div>`).join(''):empty('저장한 주차장이 없습니다','마음에 드는 주차장을 즐겨찾기에 저장해 보세요.');}
  function ownReservation(r){return r&&session()&&r.owner===session().id;}
  function initReservationDetail(){const r=reservations().find(v=>v.id===qp.get('rid')),lot=r&&lotBy(r.lotId);if(!session()&&r){go('login',{next:'my'});return;}
    const valid=!!lot&&ownReservation(r);toggle('reservationDetailView',valid);toggle('reservationDetailMissing',!valid);if(!valid)return;
    const status=statusOf(r);text('reservationStatus',status);text('reservationUpcoming',status==='이용 예정'?`입차 예정 ${prettyDate(r.date)} ${r.startTime}`:'');text('reservationId',r.id);text('reservationLot',lot.name);text('reservationSlot',r.slot);text('reservationWhen',`${prettyDate(r.date)} · ${r.startTime}~${r.endTime}`);text('reservationPlate',r.plate);text('reservationFee',r.price===null?'요금 정보 미제공 (시연용)':won(r.price));text('reservationEntry',`${lot.entry}로 진입하세요.`);text('reservationCarHint',`${r.plate} · 시연용 안내로 실제 자동 인식은 지원하지 않습니다.`);text('reservationSlotHint',r.slot+' 주차면 이용');text('reservationFloor',`${lot.floor} 표지를 따라가세요.`);
    setActionId('reservationNavigate',lot.id);setActionId('reservationCheckin',r.id);setActionId('reservationCancel',r.id);href('reservationActiveLink',link('active',{rid:r.id}));const canStart=r.status==='confirmed'&&new Date(r.endAt)>new Date();toggle('reservationCheckin',canStart);toggle('reservationCancel',canStart);toggle('reservationActiveLink',r.status==='active');}
  function initActive(){const r=reservations().find(v=>v.id===qp.get('rid')),lot=r&&lotBy(r.lotId),valid=!!lot&&ownReservation(r);toggle('activeView',valid);toggle('activeMissing',!valid);if(!valid)return;const left=Math.max(0,new Date(r.endAt)-Date.now());text('remainingTime',`${pad(Math.floor(left/3600000))}:${pad(Math.floor((left%3600000)/60000))}`);text('activeStart',r.startTime+' 입차');text('activeEnd',r.endTime+' 종료');text('activeSlot',r.slot);text('activeFloor',lot.floor);text('activeFee',r.price===null?'요금 정보 미제공 (시연용)':won(r.price));text('activePlate',r.plate);for(const id of ['activeNavigation','activeExtend','activeCheckout'])setActionId(id,id==='activeNavigation'?lot.id:r.id);}

  function requestCurrentPosition(onSuccess,onDenied){
    if(!navigator.geolocation||!window.isSecureContext){onDenied();return;}
    navigator.geolocation.getCurrentPosition(pos=>onSuccess({lat:pos.coords.latitude,lng:pos.coords.longitude}),()=>onDenied(),{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
  }
  function goNearestFromPosition(point){
    const nearest=MOCK.lots.filter(l=>Number.isFinite(l.lat)&&Number.isFinite(l.lng)).map(l=>({lot:l,meters:dist(point.lat,point.lng,l.lat,l.lng)})).sort((a,b)=>a.meters-b.meters)[0];
    if(!nearest){go('reserve',{search:'1'});return;}
    sessionWrite(KEYS.search,'내 위치');sessionWrite('pp:nearest',{lotId:nearest.lot.id,meters:nearest.meters});
    go('map',{q:'내 위치',lot:nearest.lot.id});
  }
  function nearby(){
    // 이전 와이어프레임의 위치 버튼용 동작은 유지합니다.
    requestCurrentPosition(point=>{sessionWrite(KEYS.position,point);goNearestFromPosition(point);},()=>go('reserve',{search:'1'}));
  }
  function homeLocate(){
    // 돋보기에서는 위치 권한을 다시 요청하지 않고, 첫 진입에서 저장한 결정만 사용합니다.
    const point=sessionRead(KEYS.position,null);
    if(sessionRead(LOCATION_CHOICE_KEY,null)==='allowed'&&point&&Number.isFinite(point.lat)&&Number.isFinite(point.lng)){
      goNearestFromPosition(point);
    }else go('reserve',{search:'1'});
  }
  function homeLocationChoice(allow){
    toggle('locateDialog',false);
    if(!allow){
      sessionWrite(LOCATION_CHOICE_KEY,'denied');
      sessionStorage.removeItem(KEYS.position);
      renderHome(); // 위치 거부 시 서울 전체 인기 목록을 즉시 표시
      return;
    }
    // '네' 선택 순간에만 브라우저의 실제 위치 권한을 요청합니다.
    requestCurrentPosition(point=>{
      sessionWrite(KEYS.position,point);
      sessionWrite(LOCATION_CHOICE_KEY,'allowed');
      renderHome(); // 현재 위치 기준 주변 목록 갱신
      toast('위치 사용이 허용되었어요. 돋보기를 눌러 가까운 주차장을 찾아보세요.');
    },()=>{
      sessionStorage.removeItem(KEYS.position);
      sessionWrite(LOCATION_CHOICE_KEY,'denied');
      renderHome(); // 브라우저 위치 권한 거부 시 서울 전체 인기 목록 유지
      toast('위치를 사용할 수 없어요. 돋보기를 누르면 검색 화면으로 이동합니다.');
    });
  }
  function mapMyLocation(){
    requestCurrentPosition(point=>{
      sessionWrite(KEYS.position,point);state.origin={name:'내 위치',...point};state.searchTerm='내 위치';state.searchState='done';state.mapSelected=null;
      const m=kakaoState.map,k=window.kakao;
      if(m&&k?.maps){m.setCenter(new k.maps.LatLng(point.lat,point.lng));m.setLevel(4);}
      text('mapOrigin','⌖ 내 위치');setMapStatus('현재 위치를 기준으로 등록 주차장을 표시합니다.');updateMap();
    },()=>toast('위치 정보 권한이 없거나 확인할 수 없습니다. 브라우저 설정을 확인해 주세요.'));
  }

  async function onRecover(form){const f=new FormData(form),name=String(f.get('name')).trim(),phone=String(f.get('phone')).replace(/\D/g,''),kind=f.get('kind'),acc=read(KEYS.accounts,[]).find(a=>a.name===name&&a.phone.replace(/\D/g,'')===phone),err=$('recoverError');if(!acc){err.textContent='일치하는 시연용 계정이 없습니다.';return;}if(kind==='account-find'){err.textContent='가입 아이디: '+acc.id;return;}if(acc.id!==f.get('username')){err.textContent='아이디가 일치하지 않습니다.';return;}const password=String(f.get('password'));if(password.length<8){err.textContent='8자 이상 입력해 주세요.';return;}const hash=await digest(acc.salt+password);write(KEYS.accounts,read(KEYS.accounts,[]).map(a=>a.id===acc.id?{...a,passwordHash:hash}:a));err.textContent='비밀번호가 변경되었습니다. 다시 로그인해 주세요.';}

  // STEP 2: 숨긴 메뉴를 화면 오른쪽에서 밀어 넣고 닫을 때 포커스를 복귀시킵니다.
  let menuCloseTimer;
  function setMenuOpen(open){
    const overlay=$('menuOverlay'),button=document.querySelector('[data-action="menu"]');
    if(!overlay)return;
    clearTimeout(menuCloseTimer);
    if(open){
      overlay.hidden=false;
      document.body.classList.add('menu-open');
      button?.setAttribute('aria-expanded','true');
      requestAnimationFrame(()=>overlay.classList.add('is-open'));
      $('menuCloseButton')?.focus();
    }else{
      overlay.classList.remove('is-open');
      document.body.classList.remove('menu-open');
      button?.setAttribute('aria-expanded','false');
      button?.focus();
      const duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:250;
      menuCloseTimer=setTimeout(()=>{overlay.hidden=true;},duration);
    }
  }
  function actionClick(el){const action=el.dataset.action,id=el.dataset.id;
    if(action==='menu'||action==='close-menu'){setMenuOpen(action==='menu');return;}
    if(action==='favorite'){favoritesToggle(id);if(page==='home')renderHome();if(page==='map')updateMap();if(page==='detail')initDetail();if(page==='favorites')updateFavorites();if(page==='my')updateMy();if(page==='completed')initCompleted();return;}
    if(action==='recent'){if(page==='reserve'&&$('reserveChoose')&&!$('reserveChoose').hidden)reserveSearch(el.dataset.term);else searchGo(el.dataset.term);return;}
    if(action==='remove-recent'){write(KEYS.recent,read(KEYS.recent,[]).filter(v=>v!==el.dataset.term));renderRecent();return;}
    if(action==='clear-recent'){write(KEYS.recent,[]);renderRecent();return;}
    if(action==='home-locate'){homeLocate();return;}
    if(action==='locate-close'||action==='locate-no'){homeLocationChoice(false);return;}
    if(action==='locate-yes'){homeLocationChoice(true);return;}
    if(action==='nearest'){nearby();return;}
    if(action==='map-my-location'){mapMyLocation();return;}
    if(action==='my-more'){state.myExpanded=!state.myExpanded;updateMy();return;}
    if(action==='my-clear-search'){$('myDateFilter').value='';$('myAddressQuery').value='';$('myDateSort').value='newest';state.myExpanded=false;updateMy();return;}
    if(action==='clear-map'){$('mapQuery').value='';$('mapQuery').focus();return;}
    if(action==='sort'){go('map',{q:state.searchTerm,sort:el.dataset.sort,free:state.onlyFree?'1':''});return;}
    if(action==='free'){go('map',{q:state.searchTerm,sort:state.mapSort,free:state.onlyFree?'':'1'});return;}
    if(action==='map-pin'){state.mapSelected=id;updateMap();return;}
    if(action==='map-dismiss'){state.mapSelected=null;updateMap();return;}
    if(['map-zoom-in','map-zoom-out','map-reset'].includes(action)&&kakaoState.map){const m=kakaoState.map;if(action==='map-reset'){kakaoState.focused='';if(state.origin||!isAllTerm())kakaoFocus();else{m.setCenter(new window.kakao.maps.LatLng(SEOUL_HALL.lat,SEOUL_HALL.lng));m.setLevel(5);}}else m.setLevel(m.getLevel()+(action==='map-zoom-in'?-1:1),{animate:true});return;}
    if(['map-zoom-in','map-zoom-out','map-reset'].includes(action)){state.mapZoom=action==='map-reset'?1:Math.max(1,Math.min(1.8,Number((state.mapZoom+(action==='map-zoom-in'?.2:-.2)).toFixed(2))));updateMap();return;}
    if(action==='select-slot'){state.selectedSpace=el.dataset.slot;state.currentDraft.slot=state.selectedSpace;persistDraft(state.currentDraft);updateSlots();return;}
    if(action==='reservation-next'){if(!state.selectedSpace||!reserveDateValidate(state.currentDraft))return;state.reserveStep=2;updateReserve();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(action==='back-to-slots'){state.reserveStep=1;updateReserve();return;}
    if(action==='my-tab'){state.myTab=el.dataset.tab;updateMy();history.replaceState({},'',link('my',{tab:state.myTab}));return;}
    if(action==='my-filter'){state.myFilter=state.myFilter===el.dataset.filter?'all':el.dataset.filter;state.myExpanded=false;updateMy();return;}
    if(action==='logout'){localStorage.removeItem(KEYS.session);toast('로그아웃했습니다.');go('home');return;}
    if(action==='my-cancel-no'){closeMyCancelDialog();return;}
    if(action==='my-cancel-yes'){
      const cancelId=pendingMyCancelId;
      closeMyCancelDialog();
      const r=reservations().find(v=>v.id===cancelId);
      if(!r||r.owner!==session()?.id||r.status!=='confirmed'){toast('취소할 수 없는 예약입니다.');return;}
      write(KEYS.reservations,reservations().map(v=>v.id===cancelId?{...v,status:'cancelled'}:v));
      toast('예약을 취소했습니다.');updateMy();return;
    }
    if(action==='cancel'){
      const r=reservations().find(v=>v.id===id);
      if(!r||r.owner!==session()?.id||r.status!=='confirmed'){toast('취소할 수 없는 예약입니다.');return;}
      if(page==='my'){
        pendingMyCancelId=r.id;
        pendingMyCancelTrigger=el;
        text('myCancelReservationInfo',`${lotBy(r.lotId)?.name||'주차장'} · ${prettyDate(r.date)} ${r.startTime}~${r.endTime}`);
        toggle('myCancelDialog',true);
        $('myCancelYes')?.focus();
        return;
      }
      if(!confirm('이 예약을 취소할까요?'))return;
      write(KEYS.reservations,reservations().map(v=>v.id===id?{...v,status:'cancelled'}:v));
      toast('예약을 취소했습니다.');initReservationDetail();return;
    }
    if(action==='checkin'){const r=reservations().find(v=>v.id===id);if(!r||r.owner!==session()?.id||r.status!=='confirmed')return;write(KEYS.reservations,reservations().map(v=>v.id===id?{...v,status:'active',checkedInAt:new Date().toISOString()}:v));go('active',{rid:id});return;}
    if(action==='checkout'){const r=reservations().find(v=>v.id===id);if(!r||r.owner!==session()?.id)return;if(!confirm('시연용 이용 종료를 진행할까요?'))return;write(KEYS.reservations,reservations().map(v=>v.id===id?{...v,status:'completed'}:v));go('my');return;}
    if(action==='extend'){const r=reservations().find(v=>v.id===id);if(!r||r.status!=='active')return;const next=new Date(new Date(r.endAt).getTime()+1800000);if(bookConflict(r.lotId,r.slot,r.endAt,next.toISOString(),r.id)){toast('뒤 시간대에 예약이 있어 연장할 수 없습니다.');return;}if(next.toDateString()!==new Date(r.endAt).toDateString()){toast('이 시연에서는 자정을 넘어가는 시간 연장을 지원하지 않습니다.');return;}if(!confirm('이용 시간을 30분 연장할까요? (시연용)'))return;write(KEYS.reservations,reservations().map(v=>v.id===id?{...v,endAt:next.toISOString(),endTime:pad(next.getHours())+':'+pad(next.getMinutes()),price:v.price===null?null:v.price+lotBy(v.lotId).fee5*6}:v));initActive();toast('30분 연장했습니다.');return;}
    if(action==='navigation'){const l=lotBy(id);if(l)alert(`${l.name}\n${l.address}\n입구: ${l.entry}\n※ 실제 길찾기가 아닌 시연용 가상 안내입니다.`);return;}
    if(action==='usage-notes'){alert('표준데이터 기반 주차장입니다. 실제 예약·실시간 빈자리·차량번호 인식은 지원하지 않습니다.');return;}
    if(action==='account-find'||action==='account-reset'){const reset=action==='account-reset';toggle('accountHelp',true);text('recoverHeading',(reset?'비밀번호 재설정':'아이디 찾기')+' (시연)');$('recoverForm').elements.kind.value=action;toggle('resetFields',reset);$('recoverForm').elements.username.required=reset;$('recoverForm').elements.password.required=reset;return;}
  }
  document.addEventListener('click',e=>{const a=e.target.closest('[data-action]');if(a){e.preventDefault();actionClick(a);}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('menuOverlay')?.hidden)setMenuOpen(false);if(e.key==='Escape'&&!$('locateDialog')?.hidden)homeLocationChoice(false);if(e.key==='Escape'&&!$('myCancelDialog')?.hidden)closeMyCancelDialog();});
  document.addEventListener('submit',async e=>{const f=e.target;if(!['homeSearch','mapSearch','reserveSearch','loginForm','signupForm','bookingForm','recoverForm'].includes(f.id))return;e.preventDefault();
    if(f.id==='homeSearch'||f.id==='mapSearch'){searchGo(f.elements.q.value);return;}
    if(f.id==='reserveSearch'){reserveSearch(f.elements.q.value);return;}
    if(f.id==='loginForm')await onLogin(f);if(f.id==='signupForm')await onSignup(f);if(f.id==='bookingForm')onBooking(f);if(f.id==='recoverForm')await onRecover(f);
  });
  // 마이페이지 예약 카드에서 왼쪽으로 밀면 동일한 예약 취소 확인창을 엽니다.
  let bookingSwipe=null;
  document.addEventListener('touchstart',e=>{
    if(page!=='my'||e.touches.length!==1)return;
    const card=e.target.closest('.my-booking-card');
    bookingSwipe=card?{card,x:e.touches[0].clientX,y:e.touches[0].clientY}:null;
  },{passive:true});
  document.addEventListener('touchend',e=>{
    if(!bookingSwipe||e.changedTouches.length!==1)return;
    const {card,x,y}=bookingSwipe;bookingSwipe=null;
    const dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;
    const cancel=card.querySelector('[data-action="cancel"]');
    if(dx<-90&&Math.abs(dy)<55&&cancel){e.preventDefault();actionClick(cancel);}
  },{passive:false});
  // 연락처 입력 시 숫자만 정리해 자동 하이픈을 적용합니다.
  document.addEventListener('input',e=>{if(e.target.name==='phone'&&e.target.closest('#bookingForm')){const digits=e.target.value.replace(/\D/g,'').slice(0,11);e.target.value=digits.length<=3?digits:digits.length<=7?digits.slice(0,3)+'-'+digits.slice(3):digits.slice(0,3)+'-'+digits.slice(3,digits.length===10?6:7)+'-'+digits.slice(digits.length===10?6:7);}});
  document.addEventListener('change',e=>{if(e.target.closest('#reservationTime')&&state.currentDraft){const form=$('reservationTime'),d=state.currentDraft;d.date=form.elements.date.value;d.start=form.elements.start.value;d.end=form.elements.end.value;persistDraft(d);updateSlots();}});
  // 이전 버전의 체험 사용자 세션은 자동 해제합니다. 예약 기록은 변경하지 않습니다.
  if(session()?.id==='demo-user')localStorage.removeItem(KEYS.session);
  const currentUser=session();toggle('menuLogin',!currentUser);toggle('menuSignup',!currentUser);toggle('menuLogout',!!currentUser);
  toggle('headerLogin',!currentUser);toggle('headerSignup',!currentUser);toggle('headerLogout',!!currentUser);
  const init={home:initHome,map:initMap,detail:initDetail,reserve:initReserve,login:()=>{},signup:()=>{},completed:initCompleted,my:initMy,favorites:updateFavorites,'reservation-detail':initReservationDetail,active:initActive};
  (init[page]||renderHome)();
})();
