(function(){
  const fmtDate = (y,m,d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const monthMeta = (y,m) => {
    const first = new Date(y,m-1,1);
    const days = new Date(y,m,0).getDate();
    const startW = first.getDay();
    const prevDays = new Date(y,m-1,0).getDate();
    const lead = startW;
    const tail = (7 - ((startW + days) % 7)) % 7;
    const gridStart = new Date(y, m - 1, 1 - lead);
    const gridEnd = new Date(y, m - 1, days + tail);
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return { days, startW, prevDays, lead, tail, gridStartStr: fmt(gridStart), gridEndStr: fmt(gridEnd) };
  };

  const eventsByDate = (events) => {
    const map = {};
    for (const e of events || []) {
      const d = e.date || '';
      if (!map[d]) map[d] = [];
      map[d].push(e);
    }
    return map;
  };

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const renderHolidayHtml = (hol, mode) => {
    if (!hol) return '';
    if (typeof hol === 'string') return `<div class="evm-holiday">${escapeHtml(hol)}</div>`;
    const ja = escapeHtml(hol.ja || '');
    const en = escapeHtml(hol.en || '');
    const ruby = hol.ruby ? `<ruby>${ja}<rt>${escapeHtml(hol.ruby)}</rt></ruby>` : ja;
    if (mode === 'ruby') return `<div class="evm-holiday">${ruby}</div>`;
    if (mode === 'both') return `<div class="evm-holiday">${ruby}${en ? ` <span class="en">(${en})</span>` : ''}</div>`;
    return `<div class="evm-holiday">${ja}${en ? ` <span class="en">(${en})</span>` : ''}</div>`;
  };

  const sprintf = (fmt, a) => String(fmt).replace('%s', a);
  const venueName = (v) => { if (!v) return ''; if (typeof v === 'string') return v; if (typeof v === 'object' && v.name) return v.name; return String(v); };

  window.EVM_UTILS = {
    fmtDate, monthMeta, eventsByDate, escapeHtml, renderHolidayHtml, sprintf, venueName
  };
})();
