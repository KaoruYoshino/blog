<?php
/**
 * Month grid calendar template
 * 期待する変数:
 * - $events: array<array{date:string,name:string,venue:string,url?:string}>
 * - $year  : (optional) int
 * - $month : (optional) int (1-12)
 */
if (!isset($events) || !is_array($events)) $events = [];

// 表示する年月（ショートコード引数が無ければ現在）
$y = isset($year) && (int)$year ? (int)$year : (int) current_time('Y');
$m = isset($month) && (int)$month ? (int)$month : (int) current_time('n');

// 1日と月情報
$firstTs      = strtotime(sprintf('%04d-%02d-01', $y, $m));
$daysInMonth  = (int) date('t', $firstTs);
$firstWeekday = (int) date('w', $firstTs); // 0=Sun
$today        = current_time('Y-m-d');

// 日付→イベントのマップ
$byDate = [];
foreach ($events as $e) {
    if (empty($e['date'])) continue;
    $d = substr((string)$e['date'], 0, 10); // YYYY-MM-DD
    $byDate[$d][] = $e;
}
?>
<div class="evm-calendar">
  <div class="evm-cal-header">
    <button type="button" class="evm-cal-prev" aria-label="Prev month">‹</button>
    <span class="evm-cal-title">
      <?php echo esc_html( sprintf( _x('%1$d年 %2$d月', 'year month', 'event-venue-manager'), $y, $m ) ); ?>
    </span>
    <button type="button" class="evm-cal-next" aria-label="Next month">›</button>
  </div>
  <div class="evm-cal-wrapper" data-year="<?php echo esc_attr($y); ?>" data-month="<?php echo esc_attr($m); ?>">

  <table class="evm-cal-table">
    <thead>
      <tr>
        <?php foreach (['日','月','火','水','木','金','土'] as $w) : ?>
          <th><?php echo esc_html($w); ?></th>
        <?php endforeach; ?>
      </tr>
    </thead>
    <tbody>
      <?php
      $cell = 0;
      $day  = 1;

      echo '<tr>';
      for ($i = 0; $i < $firstWeekday; $i++, $cell++) {
          echo '<td class="evm-cal-empty"></td>';
      }

      while ($day <= $daysInMonth) {
          $dateStr = sprintf('%04d-%02d-%02d', $y, $m, $day);
          $isToday = ($dateStr === $today);

          // ▼ その日の会場一覧（重複除去）を title に
          $venuesForDay = [];
          if (!empty($byDate[$dateStr])) {
              foreach ($byDate[$dateStr] as $ev) {
                  $vn = isset($ev['venue']) ? (string)$ev['venue'] : '';
                  if ($vn !== '') { $venuesForDay[$vn] = true; }
              }
          }
          $dayTitle = count($venuesForDay) ? implode(', ', array_keys($venuesForDay)) : '';

          echo '<td class="evm-cal-day' . ($isToday ? ' is-today' : '') . '">';
          echo '<div class="evm-cal-date"'
             . ( $dayTitle !== '' ? ' title="' . esc_attr($dayTitle) . '"' : '' )
             . '>' . esc_html($day) . '</div>';

          if (!empty($byDate[$dateStr])) {
              foreach ($byDate[$dateStr] as $ev) {
                $name  = isset($ev['name'])  ? (string)$ev['name']  : '';
                $venue = isset($ev['venue']) ? (string)$ev['venue'] : '';
                $url   = isset($ev['url'])   ? (string)$ev['url']   : '';
                $lat    = isset($ev['lat'])   ? (float)$ev['lat']    : 0.0;
                $lng    = isset($ev['lng'])   ? (float)$ev['lng']    : 0.0;
                $zoom   = isset($ev['zoom'])  ? (int)$ev['zoom']     : 15;

                // If venue has coordinates, mark the whole event div as clickable
                if ($venue !== '' && $lat && $lng) {
                  echo '<div class="evm-cal-event js-open-map"'
                    . ' data-lat="'  . esc_attr($lat)  . '"'
                    . ' data-lng="'  . esc_attr($lng)  . '"'
                    . ' data-zoom="' . esc_attr($zoom) . '"'
                    . ' data-name="' . esc_attr($venue) . '"'
                    . ($venue !== '' ? ' data-venue="' . esc_attr($venue) . '"' : '')
                    . '>';
                } else {
                  echo '<div class="evm-cal-event"' . ($venue !== '' ? ' data-venue="' . esc_attr($venue) . '"' : '') . '>';
                }

                // イベント名（リンクがあればリンク）
                if ($url) {
                  echo '<a href="' . esc_url($url) . '">' . esc_html($name) . '</a>';
                } else {
                  echo '<span>' . esc_html($name) . '</span>';
                }

                // 会場情報
                if ($venue !== '' && $lat && $lng) {
                  echo ' <button type="button" class="evm-venue-link js-open-map"'
                    . ' data-lat="'  . esc_attr($lat)  . '"'
                    . ' data-lng="'  . esc_attr($lng)  . '"'
                    . ' data-zoom="' . esc_attr($zoom) . '"'
                    . ' data-name="' . esc_attr($venue) . '"'
                    . '>'
                    . '@ ' . esc_html($venue)
                    . '</button>';
                } elseif ($venue !== '') {
                  // 座標が未登録なら文字だけ（クリック不可）
                  echo ' <span class="evm-venue-text">@ ' . esc_html($venue) . '</span>';
                }

                echo '</div>';
              }
          }

          echo '</td>';

          $day++; $cell++;
          if ($cell % 7 === 0 && $day <= $daysInMonth) {
              echo "</tr>\n<tr>";
          }
      }

      while ($cell % 7 !== 0) {
          echo '<td class="evm-cal-empty"></td>';
          $cell++;
      }
      echo '</tr>';
      ?>
    </tbody>
  </table>
  </div>
</div>

<style>
.evm-cal-table { width:100%; border-collapse:collapse; table-layout:fixed; }
.evm-cal-table th, .evm-cal-table td { border:1px solid #ddd; vertical-align:top; padding:6px; }
.evm-cal-date { font-weight:600; margin-bottom:4px; }
.evm-cal-event { font-size:.9em; line-height:1.3; margin-bottom:2px; word-wrap:break-word; position:relative; }
.evm-cal-empty { background:#fafafa; }
.evm-cal-day { position:relative; overflow:visible; }
.evm-cal-day.is-today { outline:2px solid #4caf50; }
.evm-cal-header { display:flex; justify-content:center; margin:.5rem 0; }
.evm-cal-title { font-weight:700; }

/* ▼ CSSツールチップ（イベント名にホバーで会場名） */
.evm-cal-event[data-venue]:hover::after {
  content: attr(data-venue);
  position: absolute;
  left: 0; top: 100%;
  margin-top: 4px;
  background: #333; color:#fff;
  padding: 4px 6px; border-radius: 4px;
  font-size: .8em; white-space: nowrap;
  z-index: 3;
  pointer-events: none;
  box-shadow: 0 2px 6px rgba(0,0,0,.2);
}
.evm-cal-event[data-venue]:hover::before {
  content: "";
  position: absolute;
  left: 10px; top: calc(100% - 2px);
  border: 6px solid transparent;
  border-bottom-color: #333;
  z-index: 3;
}
/* イベント全体をクリック可能にした場合はカーソルをポインタに */
.evm-cal-event.js-open-map { cursor: pointer; }

/* イベントを祝日風のピルに似せつつ青背景にしてクリック可能にする */
.evm-cal-event.js-open-map {
  background: #e8f1ff;
  color: #063a87;
  padding: 4px 6px;
  border-radius: 6px;
  display: inline-block;
  margin-bottom: 4px;
}

/* 会場リンクはボタン風にしない（見た目はテキスト） */
.evm-cal-event .evm-venue-link {
  background: none;
  border: none;
  padding: 0;
  margin-left: 6px;
  color: inherit;
  font-weight: 600;
  cursor: pointer;
}

/* 内部の a タグ（イベント詳細リンク）がある場合は色を維持 */
.evm-cal-event.js-open-map a { color: inherit; text-decoration: underline; }
</style>