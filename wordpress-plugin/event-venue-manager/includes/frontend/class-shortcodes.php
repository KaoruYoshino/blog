<?php
namespace Event_Venue_Manager;

if ( ! defined('ABSPATH') ) exit;

class Shortcodes {

    /**
     * ショートコード登録
     * 例: [evm_calendar]
     */
    public static function register() {
        add_shortcode('evm_calendar', [__CLASS__, 'render_calendar']);
    }

    /**
     * カレンダー描画
     * - 独自テーブル (wp_evm_events / wp_evm_venues) があれば優先
     * - なければ CPT 'event' から取得（meta: _evm_start, _evm_venue_name を想定）
     */
    public static function render_calendar( $atts = [] ) {
        // 必要ならここでCSS/JSを読み込み（事前にwp_register_style/scriptしておく想定）
        if ( wp_style_is('evm-calendar', 'registered') ) {
            wp_enqueue_style('evm-calendar');
        }
        if ( wp_script_is('evm-calendar', 'registered') ) {
            wp_enqueue_script('evm-calendar');
        }

        $events = self::get_events_normalized();

        ob_start();
        // テンプレートは $events を参照して描画する想定
        // 例: templates/calendar.php
        // 各要素: ['date' => 'YYYY-MM-DD', 'name' => 'タイトル', 'venue' => '会場名', 'url' => '詳細URL(optional)']
        include EVM_PATH . 'templates/calendar.php';
        return ob_get_clean();
    }

    /**
     * イベント取得(正規化)
     * @return array<array{date:string,name:string,venue:string,url?:string}>
     */
    private static function get_events_normalized() {
        global $wpdb;

        $table_events = $wpdb->prefix . 'evm_events';
        $table_venues = $wpdb->prefix . 'evm_venues';

        // 独自テーブルが両方存在するか確認
        $has_events = self::table_exists( $table_events );
        $has_venues = self::table_exists( $table_venues );

        if ( $has_events && $has_venues ) {
            // --- 独自テーブルから取得 ---
            // ユーザー入力を含まない固定SQLのため prepare 不要（可読性優先）
            $rows = $wpdb->get_results("
                SELECT e.date AS event_date,
                       e.name AS event_name,
                       v.name AS venue_name,
                       e.url  AS event_url
                  FROM {$table_events} e
                  JOIN {$table_venues} v ON e.venue_id = v.id
                 ORDER BY e.date ASC, e.id ASC
            ", ARRAY_A);

            $events = [];
            foreach ( (array) $rows as $r ) {
                $events[] = [
                    'date'  => isset($r['event_date']) ? (string)$r['event_date'] : '',
                    'name'  => isset($r['event_name']) ? (string)$r['event_name'] : '',
                    'venue' => isset($r['venue_name']) ? (string)$r['venue_name'] : '',
                    'url'   => ! empty($r['event_url']) ? (string)$r['event_url'] : '',
                ];
            }
            return $events;
        }

        // --- CPT 'event' から取得（フォールバック）---
        // _evm_start(YYYY-MM-DD or Y-m-d H:i:s) を昇順、_evm_venue_name を会場名として想定
        $q = new \WP_Query([
    'post_type'      => 'event',
    'posts_per_page' => -1,
    'meta_key'       => '_evm_start',
    'orderby'        => 'meta_value',
    'order'          => 'ASC',
    'post_status'    => ['publish'],
    'no_found_rows'  => true,
]);

$events = [];
if ( $q->have_posts() ) {
    while ( $q->have_posts() ) {
        $q->the_post();
        $post_id = get_the_ID();

        $start_raw   = get_post_meta($post_id, '_evm_start', true);

        // 互換: _evm_venue_id / evm_venue_id のどちらも拾う
        $venue_id    = (int) get_post_meta($post_id, '_evm_venue_id', true);
        if ( ! $venue_id ) {
            $venue_id = (int) get_post_meta($post_id, 'evm_venue_id', true);
        }

        // まず _evm_venue_name を試す
        $venue_name  = get_post_meta($post_id, '_evm_venue_name', true);

        // 空なら ID→タイトルで補完（公開されていなくても get_the_title() は取れます）
        if ( $venue_name === '' && $venue_id ) {
            $title = get_the_title($venue_id);
            if ( is_string($title) ) {
                $venue_name = $title;
            }
        }

        $events[] = [
            'date'  => self::normalize_date_string($start_raw),
            'name'  => get_the_title(),
            'venue' => is_string($venue_name) ? $venue_name : '',
            'url'   => get_permalink($post_id),
        ];
    }
    wp_reset_postdata();
}
return $events;
    }

    /**
     * テーブル存在チェック（wpdb 互換）
     */
    private static function table_exists( $table_name ) {
        global $wpdb;
        // SHOW TABLES LIKE は prepare で %s を使えないためエスケープして利用
        $like = $wpdb->esc_like( $table_name );
        $sql  = "SHOW TABLES LIKE '{$like}'";
        $res  = $wpdb->get_var( $sql );
        return ( $res === $table_name );
    }

    /**
     * 日付正規化: 'YYYY-MM-DD' へ
     * - 'Y-m-d H:i:s' なども受け付ける
     * - 失敗したら空文字
     */
    private static function normalize_date_string( $raw ) {
        if ( empty($raw) || ! is_string($raw) ) {
            return '';
        }
        $ts = strtotime( $raw );
        return $ts ? gmdate('Y-m-d', $ts) : '';
    }
}

// 二重定義の原因だった重複コードを削除し、呼び出しを一つに統一
Shortcodes::register();
