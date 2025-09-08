<?php
namespace Event_Venue_Manager;

class CPT_Venue {
  public static function register() {
    register_post_type('venue', [
      'label' => '会場',
      'labels' => [
        'name' => '会場',
        'singular_name' => '会場',
        'menu_name' => '会場',
        'name_admin_bar' => '会場',
        'add_new' => '新規追加',
        'add_new_item' => '会場を追加',
        'edit_item' => '会場を編集',
        'new_item' => '新しい会場',
        'view_item' => '会場を表示',
        'search_items' => '会場を検索',
        'not_found' => '会場は見つかりませんでした',
        'not_found_in_trash' => 'ゴミ箱に会場はありません',
        'all_items' => 'すべての会場',
        'archives' => '会場アーカイブ',
      ],
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
