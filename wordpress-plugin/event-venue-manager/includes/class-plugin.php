<?php
namespace Event_Venue_Manager;

if (!defined('ABSPATH')) exit;

class Plugin {
  public static function init() {
    // ←（この require はフロント/管理の通常動作用。残してOK）
    require_once EVM_PATH . 'includes/post-types/class-cpt-event.php';
    require_once EVM_PATH . 'includes/post-types/class-cpt-venue.php';

    if (is_admin()) {
  require_once EVM_PATH . 'includes/admin/class-metabox-event.php';
      require_once EVM_PATH . 'includes/admin/class-metabox-venue.php';
  // ACF -> _evm_* 同期
  require_once EVM_PATH . 'includes/admin/class-acf-sync.php';

      require_once EVM_PATH . 'includes/Admin_Calendar_Page.php';
  \Event_Venue_Manager\Admin_Calendar_Page::register();
  // Settings page for plugin (API key etc.)
  require_once EVM_PATH . 'includes/Admin_Settings_Page.php';
  \Event_Venue_Manager\Admin_Settings_Page::register();
  // 管理画面用スクリプトのフック登録
  add_action('admin_enqueue_scripts', [__CLASS__, 'admin_enqueue']);
    }

    require_once EVM_PATH . 'includes/frontend/class-shortcodes.php';
    require_once EVM_PATH . 'includes/frontend/class-calendar.php';
  require_once EVM_PATH . 'includes/frontend/class-frontend.php';

    add_action('init', [__CLASS__, 'register_assets']);
  // Frontend output (modal markup etc.)
  \Event_Venue_Manager\Frontend\Frontend::register();

    // ★ 有効化/無効化フック
    register_activation_hook(EVM_PATH.'event-venue-manager.php', [__CLASS__, 'on_activate']);
    register_deactivation_hook(EVM_PATH.'event-venue-manager.php', [__CLASS__, 'on_deactivate']);
  }

  public static function on_activate() {
    // ★ 有効化時は必ず自力で読み込む（initは走らない）
    require_once EVM_PATH . 'includes/post-types/class-cpt-event.php';
    require_once EVM_PATH . 'includes/post-types/class-cpt-venue.php';
    \Event_Venue_Manager\CPT_Event::register();
    \Event_Venue_Manager\CPT_Venue::register();

    flush_rewrite_rules();
  }

  public static function on_deactivate() {
    flush_rewrite_rules();
  }

  public static function register_assets() {
  // Legacy handle 'evm-calendar' pointed to non-existing files; map it to frontend assets to avoid 404.
  wp_register_style('evm-calendar', EVM_URL . 'assets/css/calendar-frontend.css', [], EVM_VER);
  wp_register_script('evm-calendar', EVM_URL . 'assets/js/calendar-frontend.js', ['jquery'], EVM_VER, true);
  // NOTE: 'evm-calendar' is used as the single canonical handle for frontend calendar assets.
    // Register map modal script for frontend. Do not automatically enqueue — templates/shortcodes will enqueue when needed.
    wp_register_script('evm-map-modal', EVM_URL . 'assets/js/map-modal.js', [], EVM_VER, true);
    // If plugin has stored API key in option 'evm_google_maps_key', inject it before the script runs.
    $key = get_option('evm_google_maps_key', '');
    if ($key) {
      wp_add_inline_script('evm-map-modal', 'window.GOOGLE_MAPS_API_KEY = ' . wp_json_encode($key) . ';', 'before');
    }
    // 管理画面: 会場編集用の軽いスクリプト（ACF の venue_map 動作を制御）
    wp_register_script('evm-admin-venue', EVM_URL . 'assets/admin-calendar.js', ['wp-api-fetch'], EVM_VER, true);
    if ($key) {
      wp_add_inline_script('evm-admin-venue', 'window.GOOGLE_MAPS_API_KEY = ' . wp_json_encode($key) . ';', 'before');
    }
  }

  // 管理画面でのスクリプト読み込み（会場編集画面のみ）
  public static function admin_enqueue() {
    $screen = get_current_screen();
    if (! $screen) return;
    if ( in_array( $screen->id, ['venue', 'venue_page'], true ) || ($screen->post_type ?? '') === 'venue' ) {
      wp_enqueue_script('evm-admin-venue');
    }
  }

  public static function create_database_tables() {
    global $wpdb;

    $charset_collate = $wpdb->get_charset_collate();

    $tables = [
        "CREATE TABLE {$wpdb->prefix}evm_events (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            date DATE NOT NULL,
            venue_id BIGINT(20) UNSIGNED NOT NULL,
            PRIMARY KEY (id)
        ) $charset_collate;",

        "CREATE TABLE {$wpdb->prefix}evm_venues (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            address TEXT NOT NULL,
            google_map TEXT,
            PRIMARY KEY (id)
        ) $charset_collate;"
    ];

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    foreach ($tables as $table) {
        dbDelta($table);
    }
  }
}