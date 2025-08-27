(function () {
  const S = (sel, el = document) => el.querySelector(sel);
  const C = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

  const state = {
    y: new Date().getFullYear(),
    m: new Date().getMonth() + 1, // 1-12
    events: [],
    venues: (window.EVM_ADMIN && Array.isArray(EVM_ADMIN.venues)) ? EVM_ADMIN.venues : [],
  };

  function fmtDate(y, m, d) { return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` }

  async function fetchEvents() {
    const fd = new FormData();
    fd.append('action', 'evm_get_events');
    fd.append('nonce', EVM_ADMIN.nonce);
    fd.append('year', state.y);
    fd.append('month', state.m);
    const r = await fetch(EVM_ADMIN.ajax, { method: 'POST', body: fd });
    const j = await r.json();
    state.events = (j && j.success) ? (j.data.events || []) : [];
  }

  function eventsByDate() {
    const map = {};
    for (const e of state.events) {
      const d = e.date;
      if (!map[d]) map[d] = [];
      map[d].push(e);
    }
    return map;
  }

  function render() {
    const root = S('#evm-admin-calendar');
    root.innerHTML = '';

    const head = C('div', 'evm-admin-head');
    const prev = C('button'); prev.textContent = '‹';
    const next = C('button'); next.textContent = '›';
    const title = C('div'); title.style.minWidth = '160px'; title.style.textAlign = 'center';
    title.textContent = `${state.y}年 ${state.m}月`;
    prev.onclick = () => { const dt = new Date(state.y, state.m - 2, 1); state.y = dt.getFullYear(); state.m = dt.getMonth() + 1; init(); };
    next.onclick = () => { const dt = new Date(state.y, state.m, 1); state.y = dt.getFullYear(); state.m = dt.getMonth() + 1; init(); };
    head.append(prev, title, next);
    root.append(head);

    const tbl = C('table', 'evm-admin-cal');
    const thead = C('thead');
    const trh = C('tr');
    ['日', '月', '火', '水', '木', '金', '土'].forEach(w => {
      const th = C('th'); th.textContent = w; trh.append(th);
    });
    thead.append(trh);
    tbl.append(thead);

    const tbody = C('tbody');
    const first = new Date(state.y, state.m - 1, 1);
    const days = new Date(state.y, state.m, 0).getDate();
    const startW = first.getDay();
    const byDate = eventsByDate();

    let cell = 0, day = 1;
    let tr = C('tr');

    for (let i = 0; i < startW; i++, cell++) {
      const td = C('td', 'evm-empty'); tr.append(td);
    }

    while (day <= days) {
      const td = C('td', 'evm-cell');
      const dateStr = fmtDate(state.y, state.m, day);
      const num = C('div', 'evm-daynum'); num.textContent = day;
      td.append(num);

      // 既存イベント
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
    while (cell % 7 !== 0) { tr.append(C('td', 'evm-empty')); cell++; }
    tbody.append(tr);
    tbl.append(tbody);
    root.append(tbl);

    ensureModal(root);
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
    await fetchEvents();
    render();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
