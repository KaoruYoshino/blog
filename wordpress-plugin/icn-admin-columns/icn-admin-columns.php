<?php

/**
 * Plugin Name: ICN Admin Columns
 * Description: Venues 一覧に「住所」と「座標」を表示する管理カラムを追加します。
 * Version: 1.0.0
 */

add_action('plugins_loaded', function () {
  // あなたの投稿タイプスラッグを列挙（片方しか無いなら削ってOK）
  $post_types = ['venue', 'venues'];

  foreach ($post_types as $pt) {
    // 1) カラムを追加
    add_filter("manage_{$pt}_posts_columns", function ($columns) {
      $columns['venue_address'] = '住所';
      $columns['venue_latlng']  = '座標';
      return $columns;
    });

    // 2) カラムの内容を出力
    add_action("manage_{$pt}_posts_custom_column", function ($column, $post_id) {
      if (!in_array($column, ['venue_address', 'venue_latlng'], true)) return;

      // venue_map は ACF の Googleマップフィールド名
      if (function_exists('get_field')) {
        $map = get_field('venue_map', $post_id);
      } else {
        $map = get_post_meta($post_id, 'venue_map', true); // ACF無しでも配列が返る想定
      }

      $address = is_array($map) && isset($map['address']) ? $map['address'] : '';
      $lat     = is_array($map) && isset($map['lat'])     ? $map['lat']     : '';
      $lng     = is_array($map) && isset($map['lng'])     ? $map['lng']     : '';

      if ($column === 'venue_address') {
        echo $address ? esc_html($address) : '—';
      }

      if ($column === 'venue_latlng') {
        echo ($lat && $lng) ? esc_html($lat . ', ' . $lng) : '—';
      }
    }, 10, 2);
  }
});
