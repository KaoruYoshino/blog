<?php
namespace Event_Venue_Manager\Frontend;

if (!defined('ABSPATH')) exit;

final class Frontend {
    public static function register(): void {
        add_action('wp_footer', [__CLASS__, 'print_modal']);
    }

    public static function print_modal(): void {
        // Modal markup for map display. Kept minimal and matching JS expectations.
        echo '<div id="map-modal" style="display:none">';
        echo '<div id="map-modal-backdrop" class="map-backdrop"></div>';
        echo '<div class="map-dialog">';
        echo '<button type="button" id="map-close" aria-label="' . esc_attr__('Close', 'event-venue-manager') . '">×</button>';
        echo '<h3 id="map-title"></h3>';
        echo '<img id="map-static" alt="' . esc_attr__('Map static image', 'event-venue-manager') . '" style="display:none; width:100%; height:auto;">';
        echo '<div id="map-dynamic" style="display:none; width:640px; height:360px;"></div>';
        echo '</div></div>';
    }
}
