(function(){

  const S = (sel, el = document) => el.querySelector(sel);
  const C = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
  const EVMU = (window.EVM_UTILS || {});
  const fmtDate = EVMU.fmtDate || ((y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  const monthMeta = EVMU.monthMeta || function(y, m) {
    const first = new Date(y, m - 1, 1);
    const days = new Date(y, m, 0).getDate();
    const startW = first.getDay();
    const prevDays = new Date(y, m - 1, 0).getDate();
    const lead = startW;
    const tail = (7 - ((startW + days) % 7)) % 7;
    const gridStart = new Date(y, m - 1, 1 - lead);
    const gridEnd = new Date(y, m - 1, days + tail);
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { days, startW, prevDays, lead, tail, gridStartStr: fmt(gridStart), gridEndStr: fmt(gridEnd) };
  };
  const venueName = EVMU.venueName || (v => (v && v.name) ? v.name : '');
  const sprintf = EVMU.sprintf || ((fmt, a) => fmt.replace('%s', a));
  const escapeHtml = EVMU.escapeHtml || (s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

  async function fetchEvents(ajaxUrl, nonce, range){ const fd=new FormData(); fd.append('action','evm_get_events'); fd.append('nonce', nonce); if(range?.from && range?.to){ fd.append('from', range.from); fd.append('to', range.to); } else { fd.append('year', window.__evm_front_year); fd.append('month', window.__evm_front_month); } const r=await fetch(ajaxUrl,{method:'POST',body:fd}); const j=await r.json(); return (j && j.success) ? { events: j.data.events||[], holidays: j.data.holidays||{} } : { events: [], holidays: {} }; }

  function renderHolidayPill(hol, mode){ return (window.EVM_UTILS && window.EVM_UTILS.renderHolidayHtml) ? window.EVM_UTILS.renderHolidayHtml(hol, mode) : (function(){ if(!hol) return ''; if(typeof hol==='string') return `<div class="evm-holiday">${hol}</div>`; const ja = hol.ja||''; const en = hol.en||''; const ruby = hol.ruby?`<ruby>${ja}<rt>${hol.ruby}</rt></ruby>`:ja; if(mode==='ruby') return `<div class="evm-holiday">${ruby}</div>`; if(mode==='both') return `<div class="evm-holiday">${ruby}${en?` <span class="en">(${en})</span>`:''}</div>`; return `<div class="evm-holiday">${ja}${en?` <span class="en">(${en})</span>`:''}</div>`; })(); }

  function buildTable(root, y, m, meta, eventsMap, holidays, holidayLabel){
    // create container that holds both views
    const views = C('div', 'evm-cal-views');
    const monthView = C('div', 'month-view');
    const listView = C('div', 'list-view');

    // MONTH GRID (existing behavior)
    const tbl = C('table','evm-cal-table');
    const thead = C('thead'); const trh = C('tr');
    ['日','月','火','水','木','金','土'].forEach(w=>{const th=C('th'); th.textContent=w; trh.append(th)});
    thead.append(trh); tbl.append(thead);
    const tbody = C('tbody'); let cell=0, day=1; const {days,startW,prevDays,lead,tail}=meta;

    // prev month
    if (lead > 0) {
      const { y: py, m: pm } = (function(){ return { y: m===1 ? y-1 : y, m: m===1 ? 12 : m-1 }; })();
      for (let i=0;i<lead;i++,cell++){
        const dnum = prevDays - lead + 1 + i;
        const dateStr = fmtDate(py, pm, dnum);
        const td = C('td','evm-cal-empty');
        const num = C('div','evm-cal-date'); num.textContent = dnum; td.append(num);
        const h = holidays[dateStr]; if (h) td.insertAdjacentHTML('beforeend', renderHolidayPill(h, holidayLabel));
        const list = eventsMap[dateStr] || [];
        for (const ev of list) {
          const evdiv = C('div','evm-cal-event is-out'); evdiv.textContent = ev.title;
          evdiv.dataset.eventId = ev.id || ''; evdiv.dataset.date = dateStr || (ev.date || '');
          if (ev.lat && ev.lng) {
            evdiv.classList.add('js-open-map'); evdiv.dataset.lat = ev.lat; evdiv.dataset.lng = ev.lng; evdiv.dataset.zoom = ev.zoom||15; evdiv.dataset.name = venueName(ev.venue) || '';
            evdiv.style.cursor = 'pointer'; const btn = C('button','evm-venue-link js-open-map'); btn.type='button'; btn.textContent = ' @ ' + (venueName(ev.venue) || ''); btn.dataset.lat = ev.lat; btn.dataset.lng = ev.lng; btn.dataset.zoom = ev.zoom||15; btn.dataset.name = venueName(ev.venue) || ''; evdiv.append(btn);
          } else if (ev.venue) { const span = C('span','evm-venue-text'); span.textContent = ' @ ' + venueName(ev.venue); evdiv.append(span); }
          td.append(evdiv);
        }
        tbody.append(td);
      }
    }

    // current month
    while (day <= days) {
      const td = C('td','evm-cal-day');
      const dateStr = fmtDate(y, m, day);
      const num = C('div','evm-cal-date'); num.textContent = day; td.append(num);
      const h = holidays[dateStr]; if (h) td.insertAdjacentHTML('beforeend', renderHolidayPill(h, holidayLabel));
      const list = eventsMap[dateStr] || [];
      for (const ev of list) {
        const evdiv = C('div','evm-cal-event'); evdiv.textContent = ev.title;
        evdiv.dataset.eventId = ev.id || ''; evdiv.dataset.date = dateStr || (ev.date || '');
        if (ev.lat && ev.lng) {
          evdiv.classList.add('js-open-map'); evdiv.dataset.lat = ev.lat; evdiv.dataset.lng = ev.lng; evdiv.dataset.zoom = ev.zoom||15; evdiv.dataset.name = venueName(ev.venue) || '';
          evdiv.style.cursor = 'pointer'; const btn = C('button','evm-venue-link js-open-map'); btn.type='button'; btn.textContent = ' @ ' + (venueName(ev.venue) || ''); btn.dataset.lat = ev.lat; btn.dataset.lng = ev.lng; btn.dataset.zoom = ev.zoom||15; btn.dataset.name = venueName(ev.venue) || ''; evdiv.append(btn);
        } else if (ev.venue) { const span = C('span','evm-venue-text'); span.textContent = ' @ ' + venueName(ev.venue); evdiv.append(span); }
        td.append(evdiv);
      }
      tbody.append(td);
      day++; cell++;
    }

    // next month tail
    if (tail > 0) {
      const { y: ny, m: nm } = (function(){ return { y: m===12 ? y+1 : y, m: m===12 ? 1 : m+1 }; })();
      for (let i=1;i<=tail;i++,cell++){
        const dateStr = fmtDate(ny, nm, i);
        const td = C('td','evm-cal-empty'); const num = C('div','evm-cal-date'); num.textContent = i; td.append(num);
        const h = holidays[dateStr]; if (h) td.insertAdjacentHTML('beforeend', renderHolidayPill(h, holidayLabel));
        const list = eventsMap[dateStr] || [];
        for (const ev of list) {
          const evdiv = C('div','evm-cal-event is-out'); evdiv.textContent = ev.title;
          evdiv.dataset.eventId = ev.id || ''; evdiv.dataset.date = dateStr || (ev.date || '');
          if (ev.lat && ev.lng) { evdiv.classList.add('js-open-map'); evdiv.dataset.lat = ev.lat; evdiv.dataset.lng = ev.lng; evdiv.dataset.zoom = ev.zoom||15; evdiv.dataset.name = venueName(ev.venue) || ''; evdiv.style.cursor = 'pointer'; const btn = C('button','evm-venue-link js-open-map'); btn.type='button'; btn.textContent = ' @ ' + (venueName(ev.venue) || ''); btn.dataset.lat = ev.lat; btn.dataset.lng = ev.lng; btn.dataset.zoom = ev.zoom||15; btn.dataset.name = venueName(ev.venue) || ''; evdiv.append(btn); } else if (ev.venue) { const span = C('span','evm-venue-text'); span.textContent = ' @ ' + venueName(ev.venue); evdiv.append(span); }
          td.append(evdiv);
        }
        tbody.append(td);
      }
    }

    // build into rows of 7
    const rows = []; const cells = Array.from(tbody.children);
    for (let i=0;i<cells.length;i+=7){ const tr = C('tr'); for (let j=0;j<7;j++){ const c = cells[i+j] || C('td','evm-cal-empty'); tr.append(c); } rows.push(tr); }
    const finalTbody = C('tbody'); for (const r of rows) finalTbody.append(r);
    tbl.append(finalTbody);
    monthView.append(tbl);

    // LIST VIEW
    const listContainer = C('div','evm-list');
    // eventsMap -> flatten dates in order
    const dates = Object.keys(eventsMap).slice().sort();
    if (dates.length === 0) {
      const empty = C('div','evm-list-empty'); empty.textContent = '予定がありません'; listContainer.append(empty);
    } else {
      for (const d of dates) {
        const items = eventsMap[d] || [];
  const row = C('div','evm-list-row');
  const left = C('div','evm-list-date'); left.textContent = d; // could format
  // weekday class for weekend coloring
  try { const [yy, mm, dd] = String(d).split('-').map(s => parseInt(s,10)); const dow = new Date(yy, (mm||1)-1, dd||1).getDay(); if (dow===0) row.classList.add('is-sun'); if (dow===6) row.classList.add('is-sat'); } catch(e) {}
        const right = C('div','evm-list-info');
        const count = C('span','evm-list-count'); count.textContent = String(items.length) + '件';
        const title = C('div','evm-list-title'); title.textContent = items[0]?.title || '';
        right.append(count, title);
        row.append(left, right);
        // expand details on click
        row.addEventListener('click', function(){
          if (row.classList.contains('open')) { row.classList.remove('open'); row.querySelector('.evm-list-details')?.remove(); return; }
          row.classList.add('open');
          const details = C('div','evm-list-details');
          for (const ev of items) {
            const r2 = C('div','evm-list-item');
            r2.textContent = (ev.time ? ev.time + ' ' : '') + ev.title + (ev.venue?.name ? ' @ ' + ev.venue.name : '');
            details.append(r2);
          }
          row.append(details);
        });
        listContainer.append(row);
      }
    }
    listView.append(listContainer);

    views.append(monthView, listView);
    root.innerHTML = ''; root.append(views);

    // Auto-switch view based on viewport width (no manual toggle)
    const mql = (window.matchMedia) ? window.matchMedia('(max-width:640px)') : null;
    function applyModeByMedia(){
      if (mql && mql.matches) { monthView.style.display = 'none'; listView.style.display = 'block'; }
      else { monthView.style.display = 'block'; listView.style.display = 'none'; }
    }
    applyModeByMedia();
    try { if (mql && mql.addEventListener) mql.addEventListener('change', applyModeByMedia); else if (mql && mql.addListener) mql.addListener(applyModeByMedia); } catch(e){}
  }

  const eventsByDate = EVMU.eventsByDate || (events => { const map = {}; for (const e of (events || [])) { const d = e.date || ''; if (!map[d]) map[d] = []; map[d].push(e); } return map; });

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
