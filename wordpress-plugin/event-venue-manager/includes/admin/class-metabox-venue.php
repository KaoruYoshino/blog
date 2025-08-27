<?php
namespace Event_Venue_Manager;

if ( ! defined('ABSPATH') ) exit;

class Metabox_Venue {

    /**
     * フック登録
     * - 管理画面でメタボックス追加
     * - 投稿保存時にメタ保存
     */
    public static function register() {
        add_action('add_meta_boxes', [__CLASS__, 'add_metabox']);
        add_action('save_post', [__CLASS__, 'save_metabox']);
    }

    /**
     * メタボックス追加
     * 投稿タイプ 'venue' に表示
     */
    public static function add_metabox() {
        add_meta_box(
            'venue_details',
            __('Venue Details', 'event-venue-manager'),
            [__CLASS__, 'render_metabox'],
            'venue',
            'normal',
            'default'
        );
    }

    /**
     * メタボックス描画
     */
    public static function render_metabox( $post ) {
        // 🔧 修正: nonce 名を統一
        wp_nonce_field('venue_details_nonce', 'venue_details_nonce_field');

        $address    = get_post_meta($post->ID, '_venue_address', true);
        $google_map = get_post_meta($post->ID, '_venue_google_map', true);

        echo '<p><label for="venue_address"><strong>' . esc_html__('Address', 'event-venue-manager') . '</strong></label><br />';
        echo '<input type="text" id="venue_address" name="venue_address" value="' . esc_attr($address) . '" class="widefat" /></p>';

        echo '<p><label for="venue_google_map"><strong>' . esc_html__('Google Map Embed Code', 'event-venue-manager') . '</strong></label><br />';
        echo '<textarea id="venue_google_map" name="venue_google_map" rows="5" class="widefat" placeholder="' . esc_attr__('<iframe ...></iframe>', 'event-venue-manager') . '">' . esc_textarea($google_map) . '</textarea>';
        echo '<small>' . esc_html__('Paste the Google Maps embed iframe. Only safe attributes are allowed.', 'event-venue-manager') . '</small></p>';
    }

    /**
     * メタ保存
     */
    public static function save_metabox( $post_id ) {
        // 🔒 nonce チェック
        if ( ! isset($_POST['venue_details_nonce_field']) || ! wp_verify_nonce($_POST['venue_details_nonce_field'], 'venue_details_nonce') ) {
            return;
        }

        // 自動保存/リビジョンは無視
        if ( wp_is_post_autosave($post_id) || wp_is_post_revision($post_id) ) {
            return;
        }

        // 投稿タイプ確認（他の投稿保存で誤作動しないように）
        $post_type = isset($_POST['post_type']) ? sanitize_key($_POST['post_type']) : get_post_type($post_id);
        if ( $post_type !== 'venue' ) {
            return;
        }

        // 権限チェック
        if ( ! current_user_can('edit_post', $post_id) ) {
            return;
        }

        // 住所の保存
        if ( isset($_POST['venue_address']) ) {
            $address = sanitize_text_field( wp_unslash($_POST['venue_address']) ); // 🔧 修正: wp_unslash 追加
            update_post_meta($post_id, '_venue_address', $address);
        }

        // Google Map 埋め込みコードの保存（<iframe> を限定的に許可）
        if ( isset($_POST['venue_google_map']) ) {
            $raw = wp_unslash($_POST['venue_google_map']); // 🔧 修正: 直接配列から使わない
            $allowed = [
                'iframe' => [
                    'src'             => true,
                    'width'           => true,
                    'height'          => true,
                    'style'           => true,
                    'loading'         => true,
                    'referrerpolicy'  => true,
                    'allowfullscreen' => true,
                    'aria-hidden'     => true,
                    'tabindex'        => true,
                ],
            ];
            // 必要最小限の属性のみ通す
            $clean = wp_kses( $raw, $allowed );
            update_post_meta($post_id, '_venue_google_map', $clean);
        }
    }
}

// 🔧 修正: クラス外に余計なメソッド定義や閉じカッコがあった問題を解消
Metabox_Venue::register();
