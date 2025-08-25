<?php
namespace Event_Venue_Manager;

class Metabox_Event {
  public static function init() {
    add_action('add_meta_boxes', [__CLASS__, 'add']);
    add_action('save_post_event', [__CLASS__, 'save']);
  }
  public static function add() {
    add_meta_box('evm_event_box', 'Event Details', [__CLASS__, 'render'], 'event', 'normal', 'default');
  }
  public static function render($post) {
    wp_nonce_field('evm_event_nonce', 'evm_event_nonce_field');
    $start = get_post_meta($post->ID, '_evm_start', true);
    $end   = get_post_meta($post->ID, '_evm_end', true);
    $venue = get_post_meta($post->ID, '_evm_venue_id', true);
    echo '<p><label>Start (YYYY-MM-DD HH:MM): <input type="text" name="evm_start" value="'.esc_attr($start).'"></label></p>';
    echo '<p><label>End   (YYYY-MM-DD HH:MM): <input type="text" name="evm_end"   value="'.esc_attr($end).'"></label></p>';
    echo '<p><label>Venue Post ID: <input type="number" name="evm_venue_id" value="'.esc_attr($venue).'"></label></p>';
  }
  public static function save($post_id) {
    if (!isset($_POST['evm_event_nonce_field']) || !wp_verify_nonce($_POST['evm_event_nonce_field'],'evm_event_nonce')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;

    update_post_meta($post_id, '_evm_start', sanitize_text_field($_POST['evm_start'] ?? ''));
    update_post_meta($post_id, '_evm_end',   sanitize_text_field($_POST['evm_end'] ?? ''));
    update_post_meta($post_id, '_evm_venue_id', intval($_POST['evm_venue_id'] ?? 0));
  }
}
Metabox_Event::init();
