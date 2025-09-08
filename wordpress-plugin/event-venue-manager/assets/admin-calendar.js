(function () {
  const S = (sel, el = document) => el.querySelector(sel);
  const C = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

  // カレンダーの状態を管理するオブジェクト
  const state = {
    y: new Date().getFullYear(),
    m: new Date().getMonth() + 1,
    events: [],
    venues: (window.EVM_ADMIN && Array.isArray(EVM_ADMIN.venues)) ? EVM_ADMIN.venues : [],
    meta: null,
    holidays: {}
  };

  const EVMU = (window.EVM_UTILS || {});
  const fmtDate = EVMU.fmtDate || ((y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

  // 月のメタ情報を取得
  // if EVM_UTILS.monthMeta is present it will be used by callers; fallback handled elsewhere
  function monthMeta(y, m) {
    const first = new Date(y, m - 1, 1);
    const days = new Date(y, m, 0).getDate();
    const startW = first.getDay();                 // 0=Sun
    const prevDays = new Date(y, m - 1, 0).getDate(); // 前月の日数
    const lead = startW;                           // 先頭に必要な前月セル数
    const tail = (7 - ((startW + days) % 7)) % 7;  // 末尾に必要な翌月セル数

    const gridStart = new Date(y, m - 1, 1 - lead);
    const gridEnd = new Date(y, m - 1, days + tail);
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      days, startW, prevDays, lead, tail,
      gridStartStr: fmt(gridStart),
      gridEndStr: fmt(gridEnd)
    };
  }
  function prevYM(y, m) { return m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }; }
  function nextYM(y, m) { return m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }; }

  async function fetchEvents(range) {
    const fd = new FormData();
    fd.append('action', 'evm_get_events');
    fd.append('nonce', EVM_ADMIN.nonce);
    // これまでは year/month だけでしたが、from/to を優先して送ります
    if (range?.from && range?.to) {
      fd.append('from', range.from); // 'YYYY-MM-DD 00:00'
      fd.append('to', range.to);   // 'YYYY-MM-DD 23:59'
    } else {
      fd.append('year', state.y);
      fd.append('month', state.m);
    }
    const r = await fetch(EVM_ADMIN.ajax, { method: 'POST', body: fd });
    const j = await r.json();
    state.events = (j && j.success) ? (j.data.events || []) : [];
    state.holidays = (j && j.success) ? (j.data.holidays || {}) : {};
  }
  // h は string（後方互換）または {ja,en,ruby}
  function renderHolidayPill(dateStr, td) {
    const h = state.holidays[dateStr];
    if (!h) return;
    const mode = (EVM_ADMIN.holidayLabel || 'en');
    const html = (window.EVM_UTILS && window.EVM_UTILS.renderHolidayHtml) ? window.EVM_UTILS.renderHolidayHtml(h, mode) : (function(){
      if (typeof h === 'string') return `<div class="evm-holiday">${escapeHtml(h)}</div>`;
      const ja = escapeHtml(h.ja || ''); const en = escapeHtml(h.en || ''); const ruby = h.ruby ? `<ruby>${ja}<rt>${escapeHtml(h.ruby)}</rt></ruby>` : ja;
      if (mode === 'ruby') return `<div class="evm-holiday">${ruby}</div>`;
      if (mode === 'both') return `<div class="evm-holiday">${ruby}${en ? ` <span class="en">(${en})</span>` : ''}</div>`;
      return `<div class="evm-holiday">${ja}${en ? ` <span class="en">(${en})</span>` : ''}</div>`;
    })();
    td.insertAdjacentHTML('beforeend', html);
  }

  // state.events を日付キーでまとめたマップを返す
  function eventsByDate() {
    const map = {};
    for (const e of state.events || []) {
      const d = e.date || '';
      if (!map[d]) map[d] = [];
      map[d].push(e);
    }
    return map;
  }


  function render() {
    const root = S('#evm-admin-calendar'); root.innerHTML = '';
  const head = C('div', 'evm-admin-head');
    const prev = C('button'); prev.textContent = '‹';
    const next = C('button'); next.textContent = '›';
    const title = C('div'); title.style.minWidth = '160px'; title.style.textAlign = 'center';
    title.textContent = `${state.y}年 ${state.m}月`;
    prev.onclick = () => {
      const dt = new Date(state.y, state.m - 2, 1);
      state.y = dt.getFullYear(); state.m = dt.getMonth() + 1; init();
    };
    next.onclick = () => {
      const dt = new Date(state.y, state.m, 1);
      state.y = dt.getFullYear(); state.m = dt.getMonth() + 1; init();
    };
    head.append(prev, title, next); root.append(head);
    // build a container that holds both month grid and list view (auto-switch by width)
    const views = C('div', 'evm-cal-views');
    const monthView = C('div', 'month-view');
    const listView = C('div', 'list-view');

    const tbl = C('table', 'evm-admin-cal');
    const thead = C('thead'); const trh = C('tr');
    ['日', '月', '火', '水', '木', '金', '土'].forEach(w => { const th = C('th'); th.textContent = w; trh.append(th); });
    thead.append(trh); tbl.append(thead);

    const tbody = C('tbody');
  const { days, startW, prevDays, lead, tail } = state.meta;
  const byDate = (window.EVM_UTILS && window.EVM_UTILS.eventsByDate) ? window.EVM_UTILS.eventsByDate(state.events) : (function(){ const map = {}; for(const e of state.events || []){ const d = e.date || ''; if(!map[d]) map[d]=[]; map[d].push(e);} return map; })();

    let cell = 0, day = 1; let tr = C('tr');

    // 先頭：前月セルを薄色で
    if (lead > 0) {
      const { y: py, m: pm } = prevYM(state.y, state.m);
      for (let i = 0; i < lead; i++, cell++) {
        const dnum = prevDays - lead + 1 + i;
        const dateStr = fmtDate(py, pm, dnum);
        const td = C('td', 'evm-cell is-out');         // ← is-out で薄色に
        const num = C('div', 'evm-daynum'); num.textContent = dnum; td.append(num);
        renderHolidayPill(dateStr, td);
        const list = byDate[dateStr] || [];
        for (const ev of list) {
          const div = C('div', 'evm-event is-out');      // ← 薄色イベント
          div.textContent = ev.title + (ev.venue?.name ? ` @ ${ev.venue.name}` : '');
          div.onclick = (e) => { e.stopPropagation(); openModal({ mode: 'edit', date: dateStr, event: ev }); };
          td.append(div);
        }
        td.onclick = () => openModal({ mode: 'new', date: dateStr });
        tr.append(td);
      }
    }

    // 当月セル
    while (day <= days) {
      const td = C('td', 'evm-cell');
      const dateStr = fmtDate(state.y, state.m, day);
      const num = C('div', 'evm-daynum'); num.textContent = day; td.append(num);
      renderHolidayPill(dateStr, td);
      const list = byDate[dateStr] || [];
      for (const ev of list) {
        const div = C('div', 'evm-event');
        div.textContent = ev.title + (ev.venue?.name ? ` @ ${ev.venue.name}` : '');
        div.onclick = (e) => { e.stopPropagation(); openModal({ mode: 'edit', date: dateStr, event: ev }); };
        td.append(div);
      }
      td.onclick = () => openModal({ mode: 'new', date: dateStr });
      tr.append(td);
      day++; cell++;
      if (cell % 7 === 0 && day <= days) { tbody.append(tr); tr = C('tr'); }
    }

    // 末尾：翌月セルを薄色で
    if (tail > 0) {
      const { y: ny, m: nm } = nextYM(state.y, state.m);
      for (let i = 1; i <= tail; i++, cell++) {
        const dateStr = fmtDate(ny, nm, i);
        const td = C('td', 'evm-cell is-out');
        const num = C('div', 'evm-daynum'); num.textContent = i; td.append(num);
        renderHolidayPill(dateStr, td);
        const list = byDate[dateStr] || [];
        for (const ev of list) {
          const div = C('div', 'evm-event is-out');
          div.textContent = ev.title + (ev.venue?.name ? ` @ ${ev.venue.name}` : '');
          div.onclick = (e) => { e.stopPropagation(); openModal({ mode: 'edit', date: dateStr, event: ev }); };
          td.append(div);
        }
        td.onclick = () => openModal({ mode: 'new', date: dateStr });
        tr.append(td);
      }
    }

    if (cell % 7 !== 0) { while (cell % 7 !== 0) { tr.append(C('td', 'evm-empty')); cell++; } }
    tbody.append(tr);
    tbl.append(tbody);
    monthView.append(tbl);

    // LIST VIEW: show every day in the current month (admin needs to be able to add events to any date)
    const listContainer = C('div', 'evm-list');
    for (let d = 1; d <= state.meta.days; d++) {
      const dateStr = fmtDate(state.y, state.m, d);
      const items = byDate[dateStr] || [];
      const row = C('div', 'evm-list-row');
      const left = C('div', 'evm-list-date'); left.textContent = dateStr;
      // weekday class for weekend coloring (0=Sun,6=Sat)
      try {
        const [yy, mm, dd] = String(dateStr).split('-').map(s => parseInt(s, 10));
        const dow = new Date(yy, (mm || 1) - 1, dd || 1).getDay();
        if (dow === 0) row.classList.add('is-sun');
        if (dow === 6) row.classList.add('is-sat');
      } catch (e) {}
      const right = C('div', 'evm-list-info');
      const count = C('span', 'evm-list-count'); count.textContent = String(items.length) + '件';
  const titleEl = C('div', 'evm-list-title'); titleEl.textContent = items[0]?.title || '';
      right.append(count, titleEl);
      row.append(left, right);
      // click to expand details or open modal to add
      row.addEventListener('click', function (e) {
        // If there are no items, open new-event modal for that date
        if ((items || []).length === 0) { openModal({ mode: 'new', date: dateStr }); return; }
        if (row.classList.contains('open')) { row.classList.remove('open'); row.querySelector('.evm-list-details')?.remove(); return; }
        row.classList.add('open');
        const details = C('div', 'evm-list-details');
        for (const ev of items) {
          const r2 = C('div', 'evm-list-item');
          r2.textContent = (ev.time ? ev.time + ' ' : '') + ev.title + (ev.venue?.name ? ' @ ' + ev.venue.name : '');
          // clicking an item opens edit modal
          r2.addEventListener('click', function (evclick) { evclick.stopPropagation(); openModal({ mode: 'edit', date: dateStr, event: ev }); });
          details.append(r2);
        }
        row.append(details);
      });
      listContainer.append(row);
    }
    listView.append(listContainer);

    views.append(monthView, listView);
    root.append(views);

    ensureModal(root);

    // Auto-switch view based on viewport width (no manual toggle)
    const mql = (window.matchMedia) ? window.matchMedia('(max-width:640px)') : null;
    function applyModeByMedia() {
      if (mql && mql.matches) { monthView.style.display = 'none'; listView.style.display = 'block'; }
      else { monthView.style.display = 'block'; listView.style.display = 'none'; }
    }
    applyModeByMedia();
    try { if (mql && mql.addEventListener) mql.addEventListener('change', applyModeByMedia); else if (mql && mql.addListener) mql.addListener(applyModeByMedia); } catch (e) {}
  }


  function ensureModal(root) {
    if (S('.evm-modal')) return;
    const back = C('div', 'evm-modal-backdrop');
    const modal = C('div', 'evm-modal');
    modal.innerHTML = `
      <header></header>
      <div class="inner">
        <label>${EVM_ADMIN.i18n.title}</label>
        <input type="text" id="evm-f-title" />
        <label>${EVM_ADMIN.i18n.start}</label>
        <input type="text" id="evm-f-date" placeholder="YYYY-MM-DD" />
        <label>${EVM_ADMIN.i18n.time}</label>
        <input type="time" id="evm-f-time" value="10:00" />
        <label>${EVM_ADMIN.i18n.venue}</label>
        <select id="evm-f-venue"></select>
      </div>
      <footer>
        <button id="evm-btn-delete" class="button button-link-delete" style="margin-right:auto; display:none;">${EVM_ADMIN.i18n.delete}</button>
        <button id="evm-btn-cancel" class="button">${EVM_ADMIN.i18n.cancel}</button>
        <button id="evm-btn-save" class="button button-primary">${EVM_ADMIN.i18n.save}</button>
      </footer>
    `;
    document.body.append(back, modal);

    S('#evm-btn-cancel').onclick = closeModal;
    document.addEventListener('keydown', function (e) {
      const modal = S('.evm-modal');
      if (modal && modal.style.display === 'block') {
        if (e.key === 'Escape') { e.preventDefault(); window.evmCloseModal(); }
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault(); S('#evm-btn-save')?.click();
        }
      }
    });
    S('#evm-btn-delete').onclick = async function () {
      if (!this.dataset.id) return closeModal();
      if (!confirm('イベントを削除しますか？')) return;
      const fd = new FormData();
      fd.append('action', 'evm_delete_event');
      fd.append('nonce', EVM_ADMIN.nonce);
      fd.append('id', this.dataset.id);
      const res = await fetch(EVM_ADMIN.ajax, { method: 'POST', body: fd });
      const json = await res.json();
      if (!json || !json.success) { alert('削除に失敗しました'); return; }
      closeModal(); init();

    };

    function closeModal() {
      back.style.display = 'none'; modal.style.display = 'none';
      document.body.classList.remove('evm-modal-open');
    }
    window.evmCloseModal = closeModal;

    // 会場プルダウン
    const sel = S('#evm-f-venue');
    sel.innerHTML = `<option value="0">${EVM_ADMIN.i18n.noVenue}</option>` +
      state.venues.map(v => `<option value="${v.id}">${escapeHtml(v.name)}</option>`).join('');
  }

  function openModal({ mode, date, event }) {
    const back = S('.evm-modal-backdrop');
    const modal = S('.evm-modal');
    const head = modal.querySelector('header');
    const fTitle = S('#evm-f-title');
    const fDate = S('#evm-f-date');
    const fTime = S('#evm-f-time');
    const fVenue = S('#evm-f-venue');
    const btnDel = S('#evm-btn-delete');
    const btnSave = S('#evm-btn-save');

    if (mode === 'new') {
      head.textContent = sprintf(EVM_ADMIN.i18n.newOn, date);
      fTitle.value = ''; fDate.value = date; fTime.value = '10:00'; fVenue.value = '0';
      btnDel.style.display = 'none'; btnDel.dataset.id = '';
    } else {
      head.textContent = EVM_ADMIN.i18n.edit;
      fTitle.value = event.title || '';
      fDate.value = event.date || date;
      fTime.value = event.time || '10:00';
      fVenue.value = event.venue?.id ? String(event.venue.id) : '0';
      btnDel.style.display = 'inline-block';
      btnDel.dataset.id = event.id;
    }

    btnSave.onclick = async () => {

      // ▼ 追加: 必須チェック（タイトル・日付）
      if (!fTitle.value.trim()) { alert('タイトルを入力してください'); fTitle.focus(); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fDate.value)) { alert('日付を YYYY-MM-DD で入力してください'); fDate.focus(); return; }

      // ▼ 追加: 保存中はボタン無効化
      btnSave.disabled = true;
      btnSave.textContent = EVM_ADMIN.i18n.saving;

      const fd = new FormData();
      fd.append('action', 'evm_save_event');
      fd.append('nonce', EVM_ADMIN.nonce);
      if (event?.id) fd.append('id', event.id);
      fd.append('title', fTitle.value);
      fd.append('date', fDate.value);
      fd.append('time', fTime.value);
      fd.append('venue_id', fVenue.value);

      try {
        const r = await fetch(EVM_ADMIN.ajax, { method: 'POST', body: fd });
        const j = await r.json();
        if (!j || !j.success) { throw new Error('Save failed'); }
        window.evmCloseModal(); init();
      } catch (err) {
        alert('保存に失敗しました。もう一度お試しください。');
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = EVM_ADMIN.i18n.save;
      }
    };

    back.style.display = 'block';
    modal.style.display = 'block';
    document.body.classList.add('evm-modal-open');
    setTimeout(() => S('#evm-f-title')?.focus(), 0);
  }

  function sprintf(fmt, a) { return fmt.replace('%s', a); }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  async function init() {
    state.meta = (EVMU.monthMeta || monthMeta)(state.y, state.m);
    await fetchEvents({ from: state.meta.gridStartStr + ' 00:00', to: state.meta.gridEndStr + ' 23:59' });
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    try {
      if (typeof EVM_ADMIN !== 'undefined' && document.getElementById('evm-admin-calendar')) {
        init();
      }
    } catch (e) {}
  });
  // --- ACF: venue_map field: prevent immediate search, add explicit Search button ---
  document.addEventListener('DOMContentLoaded', function () {
    try {
      // Ensure ACF venue_map preview is hidden by default and only shown when we add .evm-show
      (function(){
        // hide only the map canvas by default, keep the title/controls (search button) visible
        var css = '.acf-field[data-name="venue_map"] .acf-google-map .canvas, .acf-field[data-name="venue_map"] .acf-map { display: none !important; }\n' +
                  '.acf-field[data-name="venue_map"].evm-show .acf-google-map .canvas, .acf-field[data-name="venue_map"].evm-show .acf-map { display: block !important; }';
        var id = 'evm-acf-venue-map-style';
        if (!document.getElementById(id)) {
          var s = document.createElement('style'); s.id = id; s.appendChild(document.createTextNode(css));
          (document.head || document.documentElement).appendChild(s);
        }
      })();

      var field = document.querySelector('.acf-field[data-name="venue_map"]');
      if (!field) return;
      // ACF の住所入力（テキスト）を探す
      var addrInput = field.querySelector('input[type="text"]');
      if (!addrInput) return;
      // イベントリスナを確実に撤去するために clone
      var clone = addrInput.cloneNode(true);
      addrInput.parentNode.replaceChild(clone, addrInput);

      // 検索ボタンを追加
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'button evm-acf-search';
      btn.style.marginLeft = '6px';
      btn.textContent = 'Search';
      clone.after(btn);

      // 緯度・経度の隠しフィールドを探す（ACF の出力名はテーマによるが、name に [lat] / [lng] を含むことが多い）
  var latInput = field.querySelector('input[name*="[lat]"], input.acf-google-map-lat');
  var lngInput = field.querySelector('input[name*="[lng]"], input.acf-google-map-lng');
  // target the internal canvas where the map is rendered so controls (title/search) remain visible
  var canvas = field.querySelector('.acf-google-map .canvas') || field.querySelector('.acf-map') || field.querySelector('.field');

      // 初期表示で座標が無ければ ACF の地図プレビューを非表示にする
      try {
  var hasLat = latInput && String(latInput.value || '').trim() !== '';
  var hasLng = lngInput && String(lngInput.value || '').trim() !== '';
  // remove visible class if coords are missing so our CSS keeps the canvas hidden
  if (!hasLat || !hasLng) field.classList.remove('evm-show');
      } catch (e) {}

      btn.addEventListener('click', async function () {
        var addr = clone.value.trim();
        if (!addr) { alert('住所を入力してください'); return; }
        var key = (typeof GOOGLE_MAPS_API_KEY !== 'undefined') ? GOOGLE_MAPS_API_KEY : (window && window.GOOGLE_MAPS_API_KEY) || '';
        if (!key) { alert('Google Maps API key is not set'); return; }
        // Use Google Maps JS API geocoder so referer-restricted keys work in-browser
        try {
          var geocodeWithMapsJs = function(address, key) {
            return new Promise(function(resolve, reject) {
              function run() {
                if (window.google && google.maps && google.maps.Geocoder) {
                  var geocoder = new google.maps.Geocoder();
                  geocoder.geocode({ address: address }, function(results, status) {
                    resolve({ status: status, results: results });
                  });
                  return;
                }
                var script = document.createElement('script');
                script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key);
                script.async = true; script.defer = true;
                script.onload = function() { run(); };
                script.onerror = function() { reject(new Error('Failed to load Google Maps JS')); };
                document.head.appendChild(script);
              }
              run();
            });
          };

          console.log('[EVM] Geocode via Maps JS, address:', addr);
          var j = await geocodeWithMapsJs(addr, key);
          console.log('[EVM] Geocode result:', j);
          if (j && (j.status === 'OK' || (window.google && google.maps && j.status === google.maps.GeocoderStatus.OK)) && j.results && j.results.length) {
            var loc = j.results[0].geometry.location;
            var lat = (typeof loc.lat === 'function') ? loc.lat() : loc.lat;
            var lng = (typeof loc.lng === 'function') ? loc.lng() : loc.lng;
            var zoom = 15;
            if (latInput) latInput.value = lat;
            if (lngInput) lngInput.value = lng;
            // Prefer rendering a dynamic map using Maps JS (avoids Static Maps key restrictions).
            if (canvas) {
              field.classList.add('evm-show');
              try {
                if (window.google && google.maps) {
                  // create container for map
                  canvas.innerHTML = '<div class="evm-map-canvas" style="height:100%;width:100%;"></div>';
                  var mapDiv = canvas.querySelector('.evm-map-canvas');
                  var center = { lat: parseFloat(lat), lng: parseFloat(lng) };
                  var map = new google.maps.Map(mapDiv, {
                    center: center,
                    zoom: parseInt(zoom, 10),
                    disableDefaultUI: true,
                    zoomControl: false,
                    fullscreenControl: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                    clickableIcons: false,
                    gestureHandling: 'auto'
                  });
                  // Marker: use recommended AdvancedMarkerElement if available, fallback to Marker
                  try {
                    if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
                      new google.maps.marker.AdvancedMarkerElement({ map: map, position: center });
                    } else {
                      new google.maps.Marker({ position: center, map: map });
                    }
                  } catch (e) {
                    // ignore marker errors
                  }
                } else {
                  // fallback: try to load Maps JS and render dynamic map
                  try {
                    var s = document.createElement('script');
                    s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key);
                    s.async = true; s.defer = true;
                    s.onload = function() {
                      canvas.innerHTML = '<div class="evm-map-canvas" style="height:100%;width:100%;"></div>';
                      var mapDiv = canvas.querySelector('.evm-map-canvas');
                      var center = { lat: parseFloat(lat), lng: parseFloat(lng) };
                      var map = new google.maps.Map(mapDiv, {
                        center: center,
                        zoom: parseInt(zoom, 10),
                        disableDefaultUI: true,
                        zoomControl: false,
                        fullscreenControl: false,
                        streetViewControl: false,
                        mapTypeControl: false,
                        clickableIcons: false,
                        gestureHandling: 'auto'
                      });
                      try { new google.maps.Marker({ position: center, map: map }); } catch (e) {}
                    };
                    s.onerror = function() { canvas.innerHTML = '<div style="color:#666">地図を読み込めません</div>'; };
                    document.head.appendChild(s);
                  } catch (e) {
                    canvas.innerHTML = '<div style="color:#666">地図を読み込めません</div>';
                  }
                }
              } catch (e) {
                // on any error, try Maps JS or show friendly message
                try {
                  var s2 = document.createElement('script');
                  s2.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key);
                  s2.async = true; s2.defer = true;
                  s2.onload = function() {
                    canvas.innerHTML = '<div class="evm-map-canvas" style="height:100%;width:100%;"></div>';
                    var mapDiv2 = canvas.querySelector('.evm-map-canvas');
                    var center2 = { lat: parseFloat(lat), lng: parseFloat(lng) };
                    var map2 = new google.maps.Map(mapDiv2, {
                      center: center2,
                      zoom: parseInt(zoom, 10),
                      disableDefaultUI: true,
                      zoomControl: false,
                      fullscreenControl: false,
                      streetViewControl: false,
                      mapTypeControl: false,
                      clickableIcons: false,
                      gestureHandling: 'auto'
                    });
                    try { new google.maps.Marker({ position: center2, map: map2 }); } catch (e) {}
                  };
                  s2.onerror = function() { canvas.innerHTML = '<div style="color:#666">地図を読み込めません</div>'; };
                  document.head.appendChild(s2);
                } catch (e2) {
                  canvas.innerHTML = '<div style="color:#666">地図を読み込めません</div>';
                }
              }
            }
          } else {
            alert('場所が見つかりませんでした');
          }
        } catch (e) {
          console.error('[EVM] Geocode error', e);
          alert('ジオコーディングに失敗しました');
        }
      });
    } catch (e) {}
  });
})();
