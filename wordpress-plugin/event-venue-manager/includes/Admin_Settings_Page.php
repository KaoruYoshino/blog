<?php
namespace Event_Venue_Manager;

if (!defined('ABSPATH')) exit;

final class Admin_Settings_Page {
    private static $hook_suffix;

    public static function register(): void {
        add_action('admin_menu', [__CLASS__, 'add_menu']);
        add_action('admin_init', [__CLASS__, 'register_settings']);
    }

    public static function add_menu(): void {
        self::$hook_suffix = add_submenu_page(
            'edit.php?post_type=event',
            __('EVM Settings', 'event-venue-manager'),
            __('EVM Settings', 'event-venue-manager'),
            'manage_options',
            'evm-settings',
            [__CLASS__, 'render_page']
        );
    }

    public static function register_settings(): void {
        register_setting('evm_settings_group', 'evm_google_maps_key', [
            'type' => 'string',
            'sanitize_callback' => function($v) { return sanitize_text_field($v); },
            'default' => ''
        ]);

        add_settings_section('evm_section_main', __('General', 'event-venue-manager'), function(){
            echo '<p>' . esc_html__('General settings for Event & Venue Manager.', 'event-venue-manager') . '</p>';
        }, 'evm_settings');

        add_settings_field('evm_google_maps_key', __('Google Maps API Key', 'event-venue-manager'), [__CLASS__, 'render_field_api_key'], 'evm_settings', 'evm_section_main');
    }

    public static function render_field_api_key(): void {
        $val = get_option('evm_google_maps_key', '');
    // セキュリティのため画面表示ではマスク（type=password）しておく。必要なら「表示」チェックで中身を確認可能。
    printf('<input id="evm_google_maps_key" type="password" name="evm_google_maps_key" value="%s" class="regular-text" />', esc_attr($val));
    echo ' <label style="margin-left:.5em; font-weight:normal;"><input id="evm_google_maps_key_toggle" type="checkbox" /> ' . esc_html__('Show','event-venue-manager') . '</label>';
    echo '<p class="description">' . esc_html__('Enter your Google Maps JavaScript API key. Restrict by HTTP referrer in Google Cloud Console.', 'event-venue-manager') . '</p>';
    // 簡易トグルスクリプト（管理画面だけで動くのでインラインで良い）
    echo '<script>document.addEventListener("DOMContentLoaded", function(){const i=document.getElementById("evm_google_maps_key"),t=document.getElementById("evm_google_maps_key_toggle"); if(!i||!t) return; t.addEventListener("change", function(){ i.type = this.checked ? "text" : "password"; });});</script>';
    }

    public static function render_page(): void {
        if (!current_user_can('manage_options')) return;
        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('Event & Venue Manager Settings', 'event-venue-manager') . '</h1>';
        echo '<form method="post" action="options.php">';
        settings_fields('evm_settings_group');
        do_settings_sections('evm_settings');
        submit_button();
        echo '</form>';
        echo '</div>';
    }
}
