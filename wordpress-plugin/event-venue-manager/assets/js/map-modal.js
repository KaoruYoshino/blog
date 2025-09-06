(function () {
  // 安全なログ出力ラッパー: console.debug がない環境でも落ちないようにする
  function evmLog(level, ...args) {
    if (typeof console === 'undefined') return;
    const fn = console[level] || console.log || function () {};
    try { fn.apply(console, args); } catch (e) { try { console.log.apply(console, args); } catch (e2) {} }
  }

  evmLog('debug', 'evm: map-modal script loaded');

  // API キーはプラグインかテーマ側でグローバルに `GOOGLE_MAPS_API_KEY` として出すか
  // wp_localize_script / wp_add_inline_script で `window.GOOGLE_MAPS_API_KEY` を設定してください。
  const API_KEY = (typeof GOOGLE_MAPS_API_KEY !== 'undefined') ? GOOGLE_MAPS_API_KEY : (window && window.GOOGLE_MAPS_API_KEY) || null;
  // Debug: do not log the key itself, only whether it's present
  evmLog('debug', 'evm: map-modal init; API key present:', !!API_KEY);

  // Static Maps を使用しない方針に変更。静的URL生成関数を削除。

  let mapsJsPromise = null;
  function loadMapsJs() {
    if (mapsJsPromise) return mapsJsPromise;
    mapsJsPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
      s.defer = true; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
    return mapsJsPromise;
  }

  function init() {
  let modal = document.getElementById('map-modal');
  let createdModal = null;
    // Flag to indicate we inserted the modal next to a calendar and should remove it on close
    let insertedDynamically = false;
    if (!modal) {
      // モーダル HTML が存在しない場合はテンプレート要素として作成する（挿入はクリック時に行う）
      evmLog('warn', 'map-modal element not found; creating modal markup template. It will be inserted next to the calendar on demand.');
      createdModal = document.createElement('div');
      createdModal.id = 'map-modal';
      createdModal.style.display = 'none';
      createdModal.innerHTML = '' +
        '<div id="map-modal-backdrop" class="map-backdrop"></div>' +
        '<div class="map-dialog">' +
          '<button type="button" id="map-close" aria-label="' + (typeof document !== 'undefined' ? 'Close' : '') + '">×</button>' +
          '<h3 id="map-title"></h3>' +
          '<img id="map-static" alt="Map static image" style="display:none; width:100%; height:auto;">' +
          '<div id="map-dynamic" style="display:none; width:640px; height:360px;"></div>' +
        '</div>';
      modal = createdModal;
    }

    const backdrop = document.getElementById('map-modal-backdrop');
    const closeBtn = document.getElementById('map-close');
    function openModal() { modal.style.display = 'block'; }
    function closeModal() {
      modal.style.display = 'none';
      // 動的に挿入した場合は DOM から削除してクリーンアップ
      if (insertedDynamically && modal.parentNode) {
        modal.parentNode.removeChild(modal);
        insertedDynamically = false;
      }
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    document.addEventListener('click', async (e) => {
      const a = e.target.closest('.js-open-map');
      evmLog('debug', 'evm: click detected, closest .js-open-map ->', a);
      if (!a) return;

      e.preventDefault();
      const lat = parseFloat(a.dataset.lat);
      const lng = parseFloat(a.dataset.lng);
      const zoom = parseInt(a.dataset.zoom || '15', 10);
      const name = a.dataset.name || '会場';
      evmLog('debug', 'evm: map button dataset ->', { lat: a.dataset.lat, lng: a.dataset.lng, zoom: a.dataset.zoom, name: a.dataset.name });

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        evmLog('warn', 'evm: map button missing lat/lng, aborting open. dataset=', a.dataset);
        return;
      }

  // ① モーダルを該当カレンダーの直前に挿入してから開く
      try {
        // カレンダー要素を探す（クリック元に近いものを優先）
        const calendarEl = a.closest('.evm-calendar') || document.querySelector('.evm-calendar');
        if (calendarEl) {
          // 既存のモーダルがどこにあってもカレンダー要素内に移動してオーバーレイ表示する
          if (modal.parentNode !== calendarEl) {
            // カレンダーが static の場合は relative にする
            const cs2 = window.getComputedStyle(calendarEl);
            if (cs2.position === 'static') {
              calendarEl.style.position = 'relative';
            }
            // 挿入前にモーダルのスタイルを調整してカレンダー上に被せる
            modal.style.position = 'absolute';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.zIndex = '9999';

            const dialog2 = modal.querySelector('.map-dialog');
            if (dialog2) {
              // ダイアログは小さめのボックス（位置はクリック時に決定）
              dialog2.style.position = 'absolute';
              dialog2.style.width = '420px';
              dialog2.style.maxWidth = '90%';
              dialog2.style.height = '300px';
              dialog2.style.maxHeight = '70%';
              // 初期は非表示位置、クリック時に top/left を計算して置く
              dialog2.style.left = '0px';
              dialog2.style.top = '0px';
              dialog2.style.transform = 'none';
              dialog2.style.display = 'block';
              // ダイアログ本体は白背景にして地図表示の明るさに影響を与えない
              dialog2.style.background = '#ffffff';
              dialog2.style.pointerEvents = 'auto';
              dialog2.style.boxSizing = 'border-box';
              dialog2.style.padding = '0';
              dialog2.style.borderRadius = '6px';
              dialog2.style.overflow = 'hidden';
              // map-dynamic を確実にフィットさせる
              const dyn = dialog2.querySelector('#map-dynamic');
              if (dyn) { dyn.style.width = '100%'; dyn.style.height = '100%'; }
            }
            const backdropEl3 = modal.querySelector('#map-modal-backdrop');
            if (backdropEl3) {
              backdropEl3.style.position = 'absolute';
              backdropEl3.style.inset = '0';
              // バックドロップは完全に透明にして暗さを無くす
              backdropEl3.style.background = 'transparent';
              backdropEl3.style.zIndex = '9998';
            }
            const imgEl2 = modal.querySelector('#map-static');
            const dynEl2 = modal.querySelector('#map-dynamic');
            if (imgEl2) { imgEl2.style.width = '100%'; imgEl2.style.height = '100%'; imgEl2.style.objectFit = 'cover'; }
            if (dynEl2) { dynEl2.style.width = '100%'; dynEl2.style.height = '100%'; }

            // 閉じるボタンを右上に移動
            if (dialog2) {
              const closeBtn = dialog2.querySelector('#map-close');
              if (closeBtn) {
                closeBtn.style.position = 'absolute';
                closeBtn.style.right = '8px';
                closeBtn.style.top = '8px';
                closeBtn.style.zIndex = '10001';
                closeBtn.style.background = 'rgba(255,255,255,0.9)';
                closeBtn.style.border = 'none';
                closeBtn.style.borderRadius = '50%';
                closeBtn.style.width = '36px';
                closeBtn.style.height = '36px';
                closeBtn.style.lineHeight = '36px';
                closeBtn.style.textAlign = 'center';
                closeBtn.style.cursor = 'pointer';
                closeBtn.style.fontSize = '18px';
              }
            }

            calendarEl.appendChild(modal);
            insertedDynamically = true;
            // ここでダイアログの位置をボタン位置に合わせて計算
            try {
              const dialogEl = modal.querySelector('.map-dialog');
              if (dialogEl) {
                const btnRect = a.getBoundingClientRect();
                const calRect = calendarEl.getBoundingClientRect();
                // ダイアログの幅/高さ（ピクセル）
                const dlgW = Math.min(420, Math.max(200, dialogEl.offsetWidth || 420));
                const dlgH = Math.min(400, Math.max(160, dialogEl.offsetHeight || 300));
                // 中央寄せ基準の左位置（カレンダー内座標）
                let left = btnRect.left - calRect.left + (btnRect.width / 2) - (dlgW / 2);
                // clamp
                left = Math.max(8, Math.min(left, calendarEl.clientWidth - dlgW - 8));
                // 上に十分スペースがあれば上に表示、無ければ下に表示
                let top;
                const spaceAbove = btnRect.top - calRect.top;
                if (spaceAbove > dlgH + 12) {
                  top = btnRect.top - calRect.top - dlgH - 8;
                } else {
                  top = btnRect.bottom - calRect.top + 8;
                }
                // clamp top
                top = Math.max(8, Math.min(top, calendarEl.clientHeight - dlgH - 8));
                dialogEl.style.width = dlgW + 'px';
                dialogEl.style.height = dlgH + 'px';
                dialogEl.style.left = left + 'px';
                dialogEl.style.top = top + 'px';
                // ensure map container matches size
                const dyn2 = dialogEl.querySelector('#map-dynamic');
                if (dyn2) { dyn2.style.width = '100%'; dyn2.style.height = '100%'; }
              }
            } catch (e) { evmLog('warn', 'evm: position calc failed', e); }
          }
        } else if (!document.body.contains(modal)) {
          // 最終手段で body に追加
          (document.body || document.documentElement).appendChild(modal);
          insertedDynamically = true;
        }
      } catch (err) {
        evmLog('error', 'evm: error inserting modal near calendar:', err);
        // フォールバック: body に append
        if (!document.body.contains(modal)) {
          (document.body || document.documentElement).appendChild(modal);
          insertedDynamically = true;
        }
      }

      // 挿入後に要素を取得してイベントを結びつける（createdModal の場合は document.getElementById は未返却のため）
      const backdropEl2 = modal.querySelector('#map-modal-backdrop');
      const closeBtn2 = modal.querySelector('#map-close');
      if (backdropEl2) backdropEl2.addEventListener('click', closeModal);
      if (closeBtn2) closeBtn2.addEventListener('click', closeModal);

      openModal();
      const titleEl = document.getElementById('map-title');
      if (titleEl) titleEl.textContent = name;
      // ② 直接動的マップを読み込んで描画する（Static Maps は使わない）
      (async function renderDynamic() {
        evmLog('debug', 'evm: loading dynamic maps JS for immediate render');
        try {
          await loadMapsJs();
        } catch (err) {
          evmLog('error', 'evm: Failed to load Google Maps JS:', err);
          return;
        }
        const box = modal.querySelector('#map-dynamic');
        if (!box) return;
        box.style.display = 'block';
        box.innerHTML = '';
        const map = new google.maps.Map(box, {
          center: { lat, lng },
          zoom,
          disableDefaultUI: true,
          zoomControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          clickableIcons: false,
          gestureHandling: 'auto'
        });
        new google.maps.Marker({ position: { lat, lng }, map });
        evmLog('debug', 'evm: dynamic map created at', { lat, lng, zoom });
      })();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
