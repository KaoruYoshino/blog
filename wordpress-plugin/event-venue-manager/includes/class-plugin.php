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

      require_once EVM_PATH . 'includes/Admin_Calendar_Page.php';
      \Event_Venue_Manager\Admin_Calendar_Page::register();
    }

    require_once EVM_PATH . 'includes/frontend/class-shortcodes.php';
    require_once EVM_PATH . 'includes/frontend/class-calendar.php';

    add_action('init', [__CLASS__, 'register_assets']);

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
    wp_register_style('evm-calendar', EVM_URL . 'assets/css/calendar.css', [], EVM_VER);
    wp_register_script('evm-calendar', EVM_URL . 'assets/js/calendar.js', ['jquery'], EVM_VER, true);
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