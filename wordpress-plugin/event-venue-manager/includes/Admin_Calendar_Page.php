<?php
namespace Event_Venue_Manager;

if (!defined('ABSPATH')) exit;

final class Admin_Calendar_Page {
    private static $hook_suffix;

    public static function register(): void {
        add_action('admin_menu', [__CLASS__, 'add_menu']);
        add_action('admin_enqueue_scripts', [__CLASS__, 'enqueue']);
        // AJAX
        add_action('wp_ajax_evm_get_events',  [__CLASS__, 'ajax_get_events']);
        add_action('wp_ajax_evm_save_event',  [__CLASS__, 'ajax_save_event']);
        add_action('wp_ajax_evm_delete_event',[__CLASS__, 'ajax_delete_event']);
    }

    public static function add_menu(): void {
    // トップレベルメニューとして「カレンダー」を追加
    self::$hook_suffix = add_menu_page(
      __('カレンダー', 'event-venue-manager'),
      __('カレンダー', 'event-venue-manager'),
      'edit_posts',
      'evm-admin-calendar',
      [__CLASS__, 'render_page'],
      'dashicons-calendar',
      26
    );
    }

    public static function enqueue($hook): void {
      // 柔軟にフック判定: トップレベルページの hook_suffix は環境によって微妙に変わることがあるため
      // スラグを含むかどうかで判定して資産を確実に読み込む
      if (strpos((string)$hook, 'evm-admin-calendar') === false) return;

      // CSS / JS を登録・読み込み
      wp_register_style(
        'evm-admin-calendar',
        EVM_URL . 'assets/admin-calendar.css',
        [],
        filemtime(EVM_PATH . 'assets/admin-calendar.css')
      );
      wp_enqueue_style('evm-admin-calendar');

  // 会場一覧をローカライズ（公開済みVenues）
        $venues = get_posts([
          'post_type'      => 'venue',
          'numberposts'    => -1,
          'post_status'    => 'publish',
          'orderby'        => 'title',
          'order'          => 'ASC',
          'suppress_filters' => true,
        ]);
        $venue_items = array_map(function($p){
            return ['id' => (int)$p->ID, 'name' => get_the_title($p)];
        }, $venues);

  // Use centralized admin script handle registered in Plugin::register_assets()
  // ('evm-admin-venue' -> assets/admin-calendar.js). Localize that handle here.
  wp_localize_script('evm-admin-venue', 'EVM_ADMIN', [
            'ajax'  => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('evm_admin'),
            'i18n'  => [
              'title'   => __('タイトル', 'event-venue-manager'),
              'start'   => __('開始日', 'event-venue-manager'),
              'time'    => __('時間', 'event-venue-manager'),
              'venue'   => __('会場', 'event-venue-manager'),
              'save'    => __('保存', 'event-venue-manager'),
              'delete'  => __('削除', 'event-venue-manager'),
              'cancel'  => __('キャンセル', 'event-venue-manager'),
              'newOn'   => __('%s の新規イベント', 'event-venue-manager'),
              'edit'    => __('イベントを編集', 'event-venue-manager'),
              'noVenue' => __('(会場なし)', 'event-venue-manager'),
              'saving'  => __('保存中...', 'event-venue-manager'),
            ],
            'holidayLabel' => 'both', // 'en' | 'ruby' | 'both'
            'venues' => $venue_items,
            'tz'     => wp_timezone_string(),
        ]);
  wp_enqueue_script('evm-admin-venue');
    }

    public static function render_page(): void {
  echo '<div class="wrap"><h1>' . esc_html__('イベントカレンダー', 'event-venue-manager') . '</h1>';
        echo '<div id="evm-admin-calendar"></div>';
        echo '</div>';
    }

    /** ---- AJAX ---- */

  public static function ajax_get_events(): void
  {
    check_ajax_referer('evm_admin', 'nonce');
    if (!current_user_can('edit_posts')) wp_send_json_error('forbidden', 403);

    $from = isset($_POST['from']) ? sanitize_text_field(wp_unslash($_POST['from'])) : '';
    $to   = isset($_POST['to'])   ? sanitize_text_field(wp_unslash($_POST['to']))   : '';

    if ($from && $to && preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $from) && preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $to)) {
      $start = $from;
      $end   = $to;
    } else {
      $year  = isset($_POST['year'])  ? (int) $_POST['year']  : (int) current_time('Y');
      $month = isset($_POST['month']) ? (int) $_POST['month'] : (int) current_time('n');
      $start = sprintf('%04d-%02d-01 00:00', $year, $month);
      $endTs = strtotime("+1 month", strtotime(sprintf('%04d-%02d-01', $year, $month)));
      $end   = gmdate('Y-m-d H:i', $endTs);
    }

    $q = new \WP_Query([
      'post_type'      => 'event',
      'posts_per_page' => -1,
      'post_status'    => ['publish', 'draft', 'pending'],
      'meta_query'     => [[
        'key'     => '_evm_start',
        'value'   => [$start, $end],
        'compare' => 'BETWEEN',
        'type'    => 'CHAR',
      ]],
      'orderby'        => 'meta_value',
      'meta_key'       => '_evm_start',
      'order'          => 'ASC',
      'no_found_rows'  => true,
    ]);

    $items = [];
    while ($q->have_posts()) {
        $q->the_post();
        $pid   = get_the_ID();
        $start_meta = (string) get_post_meta($pid, '_evm_start', true);
          $vid   = (int) get_post_meta($pid, '_evm_venue_id', true);
          $vname = (string) get_post_meta($pid, '_evm_venue_name', true);
          if ($vname === '' && $vid) $vname = (string) get_the_title($vid);

          // 会場の緯度経度・ズーム（ある場合）を追加
          $lat  = $vid ? (float) get_post_meta($vid, '_evm_lat', true) : 0.0;
          $lng  = $vid ? (float) get_post_meta($vid, '_evm_lng', true) : 0.0;
          $zoom = $vid ? (int)   get_post_meta($vid, '_evm_zoom', true) : 0;
          if (! $zoom) $zoom = 15;

          $items[] = [
            'id'    => $pid,
            'title' => get_the_title($pid),
            'date'  => substr($start_meta, 0, 10),
            'time'  => substr($start_meta, 11, 5),
            'venue' => ['id' => $vid, 'name' => $vname],
            'status'=> get_post_status($pid),
            'url'   => get_permalink($pid),
            'lat'   => $lat,
            'lng'   => $lng,
            'zoom'  => $zoom,
          ];
        }
        wp_reset_postdata();
        $holidays = self::get_holidays_map($start, $end);
        wp_send_json_success([
          'events'   => $items,
          'holidays' => $holidays,
        ]);
    }

    public static function ajax_save_event(): void {
        check_ajax_referer('evm_admin', 'nonce');
        if (!current_user_can('edit_posts')) wp_send_json_error('forbidden', 403);

        $id    = isset($_POST['id']) ? (int) $_POST['id'] : 0;
        $title = sanitize_text_field( wp_unslash($_POST['title'] ?? '') );
        $date  = sanitize_text_field( wp_unslash($_POST['date']  ?? '') ); // YYYY-MM-DD
        $time  = sanitize_text_field( wp_unslash($_POST['time']  ?? '') ); // HH:MM
        $vid   = absint($_POST['venue_id'] ?? 0);

        if ($title === '' || $date === '') wp_send_json_error('invalid');

        $start = trim($date . ' ' . ($time ?: '10:00'));

        $postarr = [
            'post_type'   => 'event',
            'post_title'  => $title,
            'post_status' => 'publish',
        ];
        if ($id > 0) {
            $postarr['ID'] = $id;
            $pid = wp_update_post($postarr, true);
        } else {
            $pid = wp_insert_post($postarr, true);
        }
        if (is_wp_error($pid)) wp_send_json_error($pid->get_error_message());

        update_post_meta($pid, '_evm_start', $start);
        update_post_meta($pid, '_evm_venue_id', $vid);
        $vname = $vid ? get_the_title($vid) : '';
        update_post_meta($pid, '_evm_venue_name', sanitize_text_field($vname));

        wp_send_json_success(['id' => $pid]);
    }

    public static function ajax_delete_event(): void {
        check_ajax_referer('evm_admin', 'nonce');
        if (!current_user_can('delete_posts')) wp_send_json_error('forbidden', 403);

        $id = isset($_POST['id']) ? (int) $_POST['id'] : 0;
        if ($id <= 0) wp_send_json_error('invalid');

        $res = wp_trash_post($id);
        if (!$res) wp_send_json_error('failed');
        wp_send_json_success();
    }

  private static function get_holidays_map(string $from, string $to): array
  {
    $from_d = substr($from, 0, 10);
    $to_d   = substr($to,   0, 10);

    $ics_url = 'https://calendar.google.com/calendar/ical/ja.japanese%23holiday%40group.v.calendar.google.com/public/basic.ics';
    $key = 'evm_holidays_v2_' . md5($from_d . '|' . $to_d);
    if (is_array($cached = get_transient($key))) return $cached;

    $res = wp_remote_get($ics_url, ['timeout' => 8]);
    if (is_wp_error($res)) return [];
    $body = (string) wp_remote_retrieve_body($res);
    if ($body === '') return [];

    // カレンダーから除外する祝日（部分一致）
    $hide_contains = [
      '銀行休業日',
      '節分',
      '七五三',
      '七夕',
      '母の日',
      '雛祭り'
    ];

    // 日本の代表的な祝日 → 英訳/よみ
    $dict = [
      '元日' => ['en' => "New Year’s Day", 'ruby' => 'がんじつ'],
      '成人の日' => ['en' => "Coming of Age Day", 'ruby' => 'せいじんのひ'],
      '建国記念の日' => ['en' => "National Foundation Day", 'ruby' => 'けんこくきねんのひ'],
      '天皇誕生日' => ['en' => "Emperor’s Birthday", 'ruby' => 'てんのうたんじょうび'],
      '春分の日' => ['en' => "Vernal Equinox Day", 'ruby' => 'しゅんぶんのひ'],
      '昭和の日' => ['en' => "Shōwa Day", 'ruby' => 'しょうわのひ'],
      '憲法記念日' => ['en' => "Constitution Memorial Day", 'ruby' => 'けんぽうきねんび'],
      'みどりの日' => ['en' => "Greenery Day", 'ruby' => 'みどりのひ'],
      'こどもの日' => ['en' => "Children’s Day", 'ruby' => 'こどものひ'],
      '海の日' => ['en' => "Marine Day", 'ruby' => 'うみのひ'],
      '山の日' => ['en' => "Mountain Day", 'ruby' => 'やまのひ'],
      '敬老の日' => ['en' => "Respect for the Aged Day", 'ruby' => 'けいろうのひ'],
      '秋分の日' => ['en' => "Autumnal Equinox Day", 'ruby' => 'しゅうぶんのひ'],
      'スポーツの日' => ['en' => "Sports Day", 'ruby' => 'すぽーつのひ'],
      '文化の日' => ['en' => "Culture Day", 'ruby' => 'ぶんかのひ'],
      '勤労感謝の日' => ['en' => "Labor Thanksgiving Day", 'ruby' => 'きんろうかんしゃのひ'],
      '国民の休日' => ['en' => "Citizen’s Holiday", 'ruby' => 'こくみんのきゅうじつ'],
      '振替休日' => ['en' => "Substitute Holiday", 'ruby' => 'ふりかえきゅうじつ'],
      '大晦日' => ['en' => "New Year’s Eve", 'ruby' => 'おおみそか'],
      'クリスマス' => ['en' => "Christmas", 'ruby' => 'くりすます'],
    ];

    $map = [];
    $blocks = preg_split('/BEGIN:VEVENT\r?\n/', $body);
    foreach ($blocks as $blk) {
      if (strpos($blk, 'END:VEVENT') === false) continue;

      if (
        preg_match('/^DTSTART(?:;[^:]+)?:\s*(\d{8})/m', $blk, $m1) &&
        preg_match('/^SUMMARY(?:;[^:]+)?:\s*(.+)$/m', $blk, $m2)
      ) {

        $yyyymmdd = trim($m1[1]);
        $name_raw = trim($m2[1]);
        $name = preg_replace(["/\\\\n/", "/\\\\([,;])/"], [' ', '$1'], $name_raw);
        
        // 除外（部分一致）
        foreach ($hide_contains as $ng) {
          if ($ng !== '' && mb_strpos($name, $ng) !== false) {
            continue 2; // ← この VEVENT をスキップ
          }
        }

        // 例: "山の日 振替休日" を処理
        $base = $name;
        $observed = false;
        if (mb_strpos($name, '振替休日') !== false && $name !== '振替休日') {
          $base = trim(str_replace('振替休日', '', $name));
          $observed = true;
        }

        $y = substr($yyyymmdd, 0, 4);
        $m = substr($yyyymmdd, 4, 2);
        $d = substr($yyyymmdd, 6, 2);
        $date = sprintf('%04d-%02d-%02d', $y, $m, $d);
        if ($date < $from_d || $date > $to_d) continue;

        $en   = $dict[$base]['en']  ?? $dict[$name]['en']  ?? '';
        $ruby = $dict[$base]['ruby'] ?? $dict[$name]['ruby'] ?? '';

        if ($observed && $en) $en .= ' (Observed)';
        $label = ['ja' => $name, 'en' => $en, 'ruby' => $ruby];

        // 開発者がテーマ側で調整できるようフックを用意（任意）
        $visible = apply_filters('evm_holiday_should_display', true, $base, $name, $date);
        if (!$visible) continue;
        $label = apply_filters('evm_holiday_label', $label, $base, $name, $date);

        $map[$date] = $label;
      }
    }

    set_transient($key, $map, 12 * HOUR_IN_SECONDS);
    return $map;
  }
}
