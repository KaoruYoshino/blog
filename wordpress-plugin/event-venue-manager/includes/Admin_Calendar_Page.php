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
        // Events のサブメニューに「Calendar (Beta)」
        self::$hook_suffix = add_submenu_page(
            'edit.php?post_type=event',
            __('Calendar (Beta)', 'event-venue-manager'),
            __('Calendar (Beta)', 'event-venue-manager'),
            'edit_posts',
            'evm-admin-calendar',
            [__CLASS__, 'render_page']
        );
    }

    public static function enqueue($hook): void {
        if ($hook !== self::$hook_suffix) return;

        // CSS / JS を登録・読み込み
        wp_register_style('evm-admin-calendar', plugins_url('../assets/admin-calendar.css', __FILE__), [], '1.0.0');
        wp_enqueue_style('evm-admin-calendar');

        wp_register_script('evm-admin-calendar', plugins_url('../assets/admin-calendar.js', __FILE__), [], '1.0.0', true);

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

        wp_localize_script('evm-admin-calendar', 'EVM_ADMIN', [
            'ajax'  => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('evm_admin'),
            'i18n'  => [
                'title'   => __('Title', 'event-venue-manager'),
                'start'   => __('Start', 'event-venue-manager'),
                'time'    => __('Time', 'event-venue-manager'),
                'venue'   => __('Venue', 'event-venue-manager'),
                'save'    => __('Save', 'event-venue-manager'),
                'delete'  => __('Delete', 'event-venue-manager'),
                'cancel'  => __('Cancel', 'event-venue-manager'),
                'newOn'   => __('New event on %s', 'event-venue-manager'),
                'edit'    => __('Edit event', 'event-venue-manager'),
                'noVenue' => __('(No venue)', 'event-venue-manager'),
                'saving'  => __('Saving...', 'event-venue-manager'),
            ],
            'venues' => $venue_items,
            'tz'     => wp_timezone_string(),
        ]);
        wp_enqueue_script('evm-admin-calendar');
    }

    public static function render_page(): void {
        echo '<div class="wrap"><h1>' . esc_html__('Event Calendar (Admin)', 'event-venue-manager') . '</h1>';
        echo '<div id="evm-admin-calendar"></div>';
        echo '</div>';
    }

    /** ---- AJAX ---- */

    public static function ajax_get_events(): void {
        check_ajax_referer('evm_admin', 'nonce');
        if (!current_user_can('edit_posts')) wp_send_json_error('forbidden', 403);

        $year  = isset($_POST['year'])  ? (int) $_POST['year']  : (int) current_time('Y');
        $month = isset($_POST['month']) ? (int) $_POST['month'] : (int) current_time('n');

        $start = sprintf('%04d-%02d-01 00:00', $year, $month);
        $endTs = strtotime("+1 month", strtotime(sprintf('%04d-%02d-01', $year, $month)));
        $end   = gmdate('Y-m-d H:i', $endTs);

        $q = new \WP_Query([
            'post_type'      => 'event',
            'posts_per_page' => -1,
            'post_status'    => ['publish','draft','pending'],
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
            $start = (string) get_post_meta($pid, '_evm_start', true);
            $vid   = (int) get_post_meta($pid, '_evm_venue_id', true);
            $vname = (string) get_post_meta($pid, '_evm_venue_name', true);
            if ($vname === '' && $vid) $vname = (string) get_the_title($vid);

            $items[] = [
                'id'    => $pid,
                'title' => get_the_title($pid),
                'date'  => substr($start, 0, 10),
                'time'  => substr($start, 11, 5),
                'venue' => ['id' => $vid, 'name' => $vname],
                'status'=> get_post_status($pid),
                'url'   => get_permalink($pid),
            ];
        }
        wp_reset_postdata();

        wp_send_json_success(['events' => $items]);
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
}
