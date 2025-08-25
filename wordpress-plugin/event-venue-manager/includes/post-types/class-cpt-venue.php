<?php
namespace Event_Venue_Manager;

class CPT_Venue {
  public static function register() {
    register_post_type('venue', [
      'label' => 'Venues',
      'public' => true,
      'has_archive' => true,
      'menu_position' => 21,
      'supports' => ['title','editor','thumbnail','excerpt'],
      'show_in_rest' => true,
      'rewrite' => ['slug' => 'venues'],
    ]);
  }
}
add_action('init', ['Event_Venue_Manager\CPT_Venue', 'register']);
