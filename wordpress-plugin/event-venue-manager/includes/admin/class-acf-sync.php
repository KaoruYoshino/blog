<?php
namespace Event_Venue_Manager\Admin;

if ( ! defined('ABSPATH') ) exit;

class ACF_Sync {
    public static function register() {
        // ACF の save_post アクションを利用して venue_map フィールドを検知・同期
        add_action('acf/save_post', [__CLASS__, 'on_acf_save'], 20);
    }

    public static function on_acf_save($post_id) {
        // 対象は venue ポストのみ
        $post = get_post($post_id);
        if ( ! $post || $post->post_type !== 'venue' ) return;

        // ACF の venue_map フィールドがあれば JSON から lat/lng を取り出して _evm_* に同期
        if ( function_exists('get_field') ) {
            $map = get_field('venue_map', $post_id);
            if ( $map && is_array($map) ) {
                $lat = isset($map['lat']) ? floatval($map['lat']) : 0.0;
                $lng = isset($map['lng']) ? floatval($map['lng']) : 0.0;
                $zoom = isset($map['zoom']) ? intval($map['zoom']) : 15;
                if ( $lat && $lng ) {
                    update_post_meta($post_id, '_evm_lat', $lat);
                    update_post_meta($post_id, '_evm_lng', $lng);
                    update_post_meta($post_id, '_evm_zoom', $zoom);
                }
            } else {
                // ACF の保存形式が文字列（JSON）で来る場合もある
                $raw = get_post_meta($post_id, 'acf_field_venue_map', true);
                if ( $raw ) {
                    $json = json_decode($raw, true);
                    if ( $json && isset($json['lat']) && isset($json['lng']) ) {
                        update_post_meta($post_id, '_evm_lat', floatval($json['lat']));
                        update_post_meta($post_id, '_evm_lng', floatval($json['lng']));
                        update_post_meta($post_id, '_evm_zoom', isset($json['zoom']) ? intval($json['zoom']) : 15);
                    }
                }
            }
        }
    }
}

// register automatically
ACF_Sync::register();
