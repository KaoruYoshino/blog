<?php
namespace Event_Venue_Manager;

class CPT_Event {
  public static function register() {
    register_post_type('event', [
      'label' => 'イベント',
      'labels' => [
        'name' => 'イベント',
        'singular_name' => 'イベント',
        'menu_name' => 'イベント',
        'name_admin_bar' => 'イベント',
        'add_new' => '新規追加',
        'add_new_item' => 'イベントを追加',
        'edit_item' => 'イベントを編集',
        'new_item' => '新しいイベント',
        'view_item' => 'イベントを表示',
        'search_items' => 'イベントを検索',
        'not_found' => 'イベントは見つかりませんでした',
        'not_found_in_trash' => 'ゴミ箱にイベントはありません',
        'all_items' => 'すべてのイベント',
        'archives' => 'イベントアーカイブ',
      ],
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
