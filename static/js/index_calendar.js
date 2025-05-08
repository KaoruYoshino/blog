document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.background = '#333';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '5px 10px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.display = 'none';
    tooltip.style.zIndex = '1000';
    document.body.appendChild(tooltip);

    function openModal(event=null, selectionInfo=null, clickEvent=null) {
        // ツールチップは非表示にする
        tooltip.style.display = 'none';
    
        const modal = document.getElementById('eventModal');
        const titleInput = document.getElementById('eventTitle');
    
        if (event) {
            titleInput.value = event.title || '';
            modal.dataset.eventId = event.id || '';
        } else if (selectionInfo) {
            titleInput.value = '';
            modal.dataset.eventId = '';
        } else {
            titleInput.value = '';
            modal.dataset.eventId = '';
        }
    
        modal.style.display = 'block';
    
        // モーダルの位置をクリック位置に設定（簡易的に画面中央固定でも可）
        if (clickEvent) {
            modal.style.top = (clickEvent.pageY) + 'px';
            modal.style.left = (clickEvent.pageX) + 'px';
            modal.style.transform = 'translate(0, 0)';
        } else {
            modal.style.top = '20%';
            modal.style.left = '50%';
            modal.style.transform = 'translateX(-50%)';
        }
    }
    
    // // クリックでツールチップを非表示にする処理を追加
    // document.addEventListener('click', function(e) {
    //     if (tooltip.style.display === 'block') {
    //         // クリックされた要素がツールチップでない場合に非表示にする
    //         if (!tooltip.contains(e.target)) {
    //             tooltip.style.display = 'none';
    //         }
    //     }
    //     // モーダル外クリックでモーダルを閉じる
    //     const modal = document.getElementById('calendarModal');
    //     if (modal.style.display === 'block' && !modal.contains(e.target)) {
    //         modal.style.display = 'none';
    //     }
    // });
    
    // // モーダルの保存・キャンセルボタンのイベントハンドラ
    // document.getElementById('saveEventBtn').addEventListener('click', function() {
    //     const modal = document.getElementById('calendarModal');
    //     const titleInput = document.getElementById('eventTitle');
    //     const eventId = modal.dataset.eventId;
    
    //     // ここで保存処理を実装（例: サーバーに送信など）
    //     alert('保存: ' + titleInput.value + ' (ID: ' + eventId + ')');
    
    //     modal.style.display = 'none';
    // });
    
    // document.getElementById('cancelEventBtn').addEventListener('click', function() {
    //     const modal = document.getElementById('calendarModal');
    //     modal.style.display = 'none';
    // });
    
    // document.getElementById('deleteEventBtn').addEventListener('click', function() {
    //     const modal = document.getElementById('calendarModal');
    //     const eventId = modal.dataset.eventId;
    //     if (!eventId) {
    //         alert('削除する予定が選択されていません。');
    //         return;
    //     }
    //     if (!confirm('本当にこの予定を削除しますか？')) {
    //         return;
    //     }
    //     fetch(`/api/events/${eventId}`, {
    //         method: 'DELETE',
    //         headers: {
    //             'Content-Type': 'application/json'
    //         }
    //     }).then(response => {
    //         if (response.ok) {
    //             alert('予定を削除しました。');
    //             modal.style.display = 'none';
    //             location.reload();
    //         } else {
    //             response.json().then(data => {
    //                 alert('削除に失敗しました: ' + (data.error || '不明なエラー'));
    //             });
    //         }
    //     }).catch(error => {
    //         alert('削除に失敗しました: ' + error);
    //     });
    // });

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ja',
        dayMaxEvents: true,
        height: 'auto',
        nowIndicator: true,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: ''
        },
        events: '/api/events',
        eventMouseEnter: function(info) {
            tooltip.textContent = info.event.title + ' @ ' + (info.event.extendedProps.location || '');
            tooltip.style.display = 'block';
            tooltip.style.left = info.jsEvent.pageX + 10 + 'px';
            tooltip.style.top = info.jsEvent.pageY + 10 + 'px';
        },
        eventMouseLeave: function() {
            tooltip.style.display = 'none';
        },
        eventClick: function(info) {
            if (window.isLoggedIn) {
                // 編集画面に遷移
                window.location.href = '/calendar/manage';
            } else {
                // 未ログインユーザーはツールチップ表示
                tooltip.textContent = info.event.title + ' @ ' + (info.event.extendedProps.location || '');
                tooltip.style.display = 'block';
                tooltip.style.left = info.jsEvent.pageX + 10 + 'px';
                tooltip.style.top = info.jsEvent.pageY + 10 + 'px';
            }
        },
        dateClick: function(info) {
            if (window.isLoggedIn) {
                // 編集画面に遷移
                window.location.href = '/calendar/manage';
            } else {
                // 未ログインユーザーは何もしないか、必要に応じてツールチップ表示など
                tooltip.style.display = 'none';
            }
        },
        dayCellDidMount: function(info) {
            info.el.style.cursor = 'pointer';
            // 日付セルにタスクと会場名を表示するカスタム処理
            const events = calendar.getEvents().filter(event => {
                return event.startStr === info.dateStr;
            });
            if (events.length > 0) {
                const container = document.createElement('div');
                container.style.fontSize = '0.75em';
                container.style.marginTop = '2px';
                events.forEach(event => {
                    const eventDiv = document.createElement('div');
                    eventDiv.textContent = event.title + (event.extendedProps.venue && event.extendedProps.venue.name ? ' @ ' + event.extendedProps.venue.name : '');
                    container.appendChild(eventDiv);
                });
                info.el.appendChild(container);
            }
        }
    });

    calendar.render();
});