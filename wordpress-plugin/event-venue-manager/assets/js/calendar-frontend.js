(function(){
  const S = (sel, el = document) => el.querySelector(sel);
  const C = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
  function venueName(v){ if(!v) return ''; if(typeof v === 'string') return v; if(typeof v === 'object' && v.name) return v.name; return String(v); }

  function fmtDate(y, m, d) { return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
  function monthMeta(y,m){ const first=new Date(y,m-1,1); const days=new Date(y,m,0).getDate(); const startW=first.getDay(); const prevDays=new Date(y,m-1,0).getDate(); const lead=startW; const tail=(7-((startW+days)%7))%7; const gridStart=new Date(y,m-1,1-lead); const gridEnd=new Date(y,m-1,days+tail); const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; return {days,startW,prevDays,lead,tail,gridStartStr:fmt(gridStart),gridEndStr:fmt(gridEnd)} }

  async function fetchEvents(ajaxUrl, nonce, range){ const fd=new FormData(); fd.append('action','evm_get_events'); fd.append('nonce', nonce); if(range?.from && range?.to){ fd.append('from', range.from); fd.append('to', range.to); } else { fd.append('year', window.__evm_front_year); fd.append('month', window.__evm_front_month); } const r=await fetch(ajaxUrl,{method:'POST',body:fd}); const j=await r.json(); return (j && j.success) ? { events: j.data.events||[], holidays: j.data.holidays||{} } : { events: [], holidays: {} }; }

  function renderHolidayPill(hol, mode){ if(!hol) return ''; if(typeof hol==='string') return `<div class="evm-holiday">${hol}</div>`; const ja = hol.ja||''; const en = hol.en||''; const ruby = hol.ruby?`<ruby>${ja}<rt>${hol.ruby}</rt></ruby>`:ja; if(mode==='ruby') return `<div class="evm-holiday">${ruby}</div>`; if(mode==='both') return `<div class="evm-holiday">${ruby}${en?` <span class="en">(${en})</span>`:''}</div>`; return `<div class="evm-holiday">${ja}${en?` <span class="en">(${en})</span>`:''}</div>`; }

  function buildTable(root, y, m, meta, eventsMap, holidays, holidayLabel){ const tbl = C('table','evm-cal-table'); const thead=C('thead'); const trh=C('tr'); ['日','月','火','水','木','金','土'].forEach(w=>{const th=C('th'); th.textContent=w; trh.append(th)}); thead.append(trh); tbl.append(thead); const tbody=C('tbody'); let cell=0, day=1; const {days,startW,prevDays,lead,tail}=meta; // 前月
  if(lead>0){ const py=(m===1?y-1:y); const pm=(m===1?12:m-1); for(let i=0;i<lead;i++,cell++){ const dnum=prevDays-lead+1+i; const dateStr=fmtDate(py,pm,dnum); const td=C('td','evm-cal-empty'); const num=C('div','evm-cal-date'); num.textContent=dnum; td.append(num); const h = holidays[dateStr]; if(h) td.insertAdjacentHTML('beforeend', renderHolidayPill(h, holidayLabel)); const list = eventsMap[dateStr]||[]; for(const ev of list){ const evdiv=C('div','evm-cal-event is-out'); evdiv.textContent = ev.title;
    // add stable identifiers for debugging and selection
    evdiv.dataset.eventId = ev.id || '';
    evdiv.dataset.date = dateStr || (ev.date || '');
    if(ev.lat && ev.lng){ evdiv.classList.add('js-open-map'); evdiv.dataset.lat = ev.lat; evdiv.dataset.lng = ev.lng; evdiv.dataset.zoom = ev.zoom||15; evdiv.dataset.name = venueName(ev.venue) || ''; evdiv.style.cursor = 'pointer'; const btn = C('button','evm-venue-link js-open-map'); btn.type='button'; btn.textContent = ' @ ' + (venueName(ev.venue) || ''); btn.dataset.lat = ev.lat; btn.dataset.lng = ev.lng; btn.dataset.zoom = ev.zoom||15; btn.dataset.name = venueName(ev.venue) || ''; evdiv.append(btn); } else if(ev.venue){ const span = C('span','evm-venue-text'); span.textContent = ' @ ' + venueName(ev.venue); evdiv.append(span); } td.append(evdiv); } tbody.append(td); } }

    // 当月
  while(day<=days){ const td=C('td','evm-cal-day'); const dateStr=fmtDate(y,m,day); const num=C('div','evm-cal-date'); num.textContent=day; td.append(num); const h = holidays[dateStr]; if(h) td.insertAdjacentHTML('beforeend', renderHolidayPill(h, holidayLabel)); const list = eventsMap[dateStr]||[]; for(const ev of list){ const evdiv=C('div','evm-cal-event'); evdiv.textContent = ev.title;
  // add stable identifiers for debugging and selection
  evdiv.dataset.eventId = ev.id || '';
  evdiv.dataset.date = dateStr || (ev.date || '');
  // venue button (map) if coordinates present
  if(ev.lat && ev.lng){ evdiv.classList.add('js-open-map'); evdiv.dataset.lat = ev.lat; evdiv.dataset.lng = ev.lng; evdiv.dataset.zoom = ev.zoom||15; evdiv.dataset.name = venueName(ev.venue) || ''; evdiv.style.cursor = 'pointer'; const btn = C('button','evm-venue-link js-open-map'); btn.type='button'; btn.textContent = ' @ ' + (venueName(ev.venue) || ''); btn.dataset.lat = ev.lat; btn.dataset.lng = ev.lng; btn.dataset.zoom = ev.zoom||15; btn.dataset.name = venueName(ev.venue) || ''; evdiv.append(btn); } else if(ev.venue){ const span = C('span','evm-venue-text'); span.textContent = ' @ ' + venueName(ev.venue); evdiv.append(span); }
    td.append(evdiv);
  }
    tbody.append(td); day++; cell++; if(cell%7===0 && day<=days){ /* new row handled below */ }
    }

    // tail（翌月）
  if(tail>0){ const ny=(m===12?y+1:y); const nm=(m===12?1:m+1); for(let i=1;i<=tail;i++,cell++){ const dateStr=fmtDate(ny,nm,i); const td=C('td','evm-cal-empty'); const num=C('div','evm-cal-date'); num.textContent=i; td.append(num); const h=holidays[dateStr]; if(h) td.insertAdjacentHTML('beforeend', renderHolidayPill(h, holidayLabel)); const list = eventsMap[dateStr]||[]; for(const ev of list){ const evdiv=C('div','evm-cal-event is-out'); evdiv.textContent = ev.title; 
    // add stable identifiers for debugging and selection
    evdiv.dataset.eventId = ev.id || '';
    evdiv.dataset.date = dateStr || (ev.date || '');
    if(ev.lat && ev.lng){ evdiv.classList.add('js-open-map'); evdiv.dataset.lat = ev.lat; evdiv.dataset.lng = ev.lng; evdiv.dataset.zoom = ev.zoom||15; evdiv.dataset.name = venueName(ev.venue) || ''; evdiv.style.cursor = 'pointer'; const btn = C('button','evm-venue-link js-open-map'); btn.type='button'; btn.textContent = ' @ ' + (venueName(ev.venue) || ''); btn.dataset.lat = ev.lat; btn.dataset.lng = ev.lng; btn.dataset.zoom = ev.zoom||15; btn.dataset.name = venueName(ev.venue) || ''; evdiv.append(btn); } else if(ev.venue){ const span = C('span','evm-venue-text'); span.textContent = ' @ ' + venueName(ev.venue); evdiv.append(span); } td.append(evdiv); } tbody.append(td); } }

    // build into grid rows of 7
    const rows = []; const cells = Array.from(tbody.children); for(let i=0;i<cells.length;i+=7){ const tr=C('tr'); for(let j=0;j<7;j++){ const c = cells[i+j] || C('td','evm-cal-empty'); tr.append(c); } rows.push(tr); }
    const finalTbody=C('tbody'); for(const r of rows) finalTbody.append(r);
    tbl.append(finalTbody);
    root.innerHTML = ''; root.append(tbl);
  }

  function eventsByDate(events){ const map={}; for(const e of events){ const d=e.date; if(!map[d]) map[d]=[]; map[d].push(e); } return map; }

  async function initBlock(wrapper, ajaxUrl, nonce, holidayLabel){ const y = parseInt(wrapper.dataset.year,10) || (new Date().getFullYear()); const m = parseInt(wrapper.dataset.month,10) || (new Date().getMonth()+1); window.__evm_front_year = y; window.__evm_front_month = m; const meta = monthMeta(y,m); const res = await fetchEvents(ajaxUrl, nonce, { from: meta.gridStartStr + ' 00:00', to: meta.gridEndStr + ' 23:59' }); const events = res.events || []; const holidays = res.holidays || {}; const evMap = eventsByDate(events);
    buildTable(wrapper, y, m, meta, evMap, holidays, holidayLabel);

    // prev/next handlers
    const prev = wrapper.parentElement.querySelector('.evm-cal-prev'); const next = wrapper.parentElement.querySelector('.evm-cal-next'); const title = wrapper.parentElement.querySelector('.evm-cal-title');
  prev.addEventListener('click', async ()=>{ const dt=new Date(window.__evm_front_year, window.__evm_front_month-2,1); window.__evm_front_year = dt.getFullYear(); window.__evm_front_month = dt.getMonth()+1; const meta2 = monthMeta(window.__evm_front_year, window.__evm_front_month); const res2 = await fetchEvents(ajaxUrl, nonce, { from: meta2.gridStartStr + ' 00:00', to: meta2.gridEndStr + ' 23:59' }); buildTable(wrapper, window.__evm_front_year, window.__evm_front_month, meta2, eventsByDate(res2.events||[]), res2.holidays||{}, holidayLabel); if (title) title.textContent = `${window.__evm_front_year}年 ${window.__evm_front_month}月`; });
  next.addEventListener('click', async ()=>{ const dt=new Date(window.__evm_front_year, window.__evm_front_month,1); window.__evm_front_year = dt.getFullYear(); window.__evm_front_month = dt.getMonth()+1; const meta2 = monthMeta(window.__evm_front_year, window.__evm_front_month); const res2 = await fetchEvents(ajaxUrl, nonce, { from: meta2.gridStartStr + ' 00:00', to: meta2.gridEndStr + ' 23:59' }); buildTable(wrapper, window.__evm_front_year, window.__evm_front_month, meta2, eventsByDate(res2.events||[]), res2.holidays||{}, holidayLabel); if (title) title.textContent = `${window.__evm_front_year}年 ${window.__evm_front_month}月`; });

    // map modal buttons will be handled by evm-map-modal script (js-open-map)
  }

  document.addEventListener('DOMContentLoaded', function(){
    const wrappers = document.querySelectorAll('.evm-cal-wrapper');
    if(wrappers.length===0) return;
    const ajaxUrl = (window.EVM_ADMIN && window.EVM_ADMIN.ajax) ? window.EVM_ADMIN.ajax : '/wp-admin/admin-ajax.php';
    const nonce = (window.EVM_ADMIN && window.EVM_ADMIN.nonce) ? window.EVM_ADMIN.nonce : '';
    const holidayLabel = (window.EVM_ADMIN && window.EVM_ADMIN.holidayLabel) ? window.EVM_ADMIN.holidayLabel : 'en';
    for(const w of wrappers){ initBlock(w, ajaxUrl, nonce, holidayLabel); }
  });
})();
