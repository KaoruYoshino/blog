<?php
namespace Event_Venue_Manager;

class CPT_Event {
  public static function register() {
    register_post_type('event', [
      'label' => 'Events',
      'public' => true,
      'has_archive' => true,
      'menu_position' => 20,
      'supports' => ['title','editor','thumbnail','excerpt'],
      'show_in_rest' => true,
      'rewrite' => ['slug' => 'events'],
    ]);
  }
}
add_action('init', ['Event_Venue_Manager\CPT_Event', 'register']);
