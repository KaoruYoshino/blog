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
    // Legacy Venue Details metabox is disabled. To re-enable, restore calls here.
    return;
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
        $lat = get_post_meta($post->ID, '_evm_lat', true);
        $lng = get_post_meta($post->ID, '_evm_lng', true);
        $zoom = get_post_meta($post->ID, '_evm_zoom', true) ?: 15;

        // 住所入力フィールド + 検索ボタン（即時検索を防ぐため、ここで明示的に検索を実行します）
        echo '<p><label for="venue_address"><strong>' . esc_html__('Address', 'event-venue-manager') . '</strong></label><br />';
        echo '<input type="text" id="venue_address" name="venue_address" value="' . esc_attr($address) . '" class="widefat" autocomplete="off" />';
        echo ' <button type="button" id="venue_address_search" class="button" style="margin-top:8px;">' . esc_html__('Search', 'event-venue-manager') . '</button></p>';

        // 地図プレビューボックス（検索ボタン押下でここに表示する）
        // プレビュー領域（Static Maps を使わず動的に Maps JS で描画します）
        echo '<div id="venue_map_preview" style="margin-top:8px; width:100%; height:300px;">';
        if ( $lat && $lng ) {
            // 空のプレースホルダを用意。検索ボタンで動的に描画されます。
            echo '<div id="venue_map_canvas" style="width:100%;height:100%;"></div>';
            // 初回は JS 側で座標がある場合に地図を表示します
        } else {
            echo '<div id="venue_map_canvas" style="width:100%;height:100%;"></div>';
        }
        echo '</div>';

        // hidden inputs: ボタンクリックで得た座標を post として送れるようにする
        echo '<input type="hidden" name="_evm_lat" id="_evm_lat" value="' . esc_attr($lat) . '" />';
        echo '<input type="hidden" name="_evm_lng" id="_evm_lng" value="' . esc_attr($lng) . '" />';
        echo '<input type="hidden" name="_evm_zoom" id="_evm_zoom" value="' . esc_attr($zoom) . '" />';

        // 管理画面用のインラインスクリプト: 既存の即時検索リスナを除去するために input をクローンして置換し、検索ボタン押下でのみジオコーディング→プレビュー表示
                $inline_key = esc_js( get_option('evm_google_maps_key', '') );
                $script = <<<JS
<script>
(function(){
    document.addEventListener('DOMContentLoaded', function(){
        try {
            var old = document.getElementById('venue_address');
            if (old) {
                var clone = old.cloneNode(true);
                old.parentNode.replaceChild(clone, old);
            }
            var btn = document.getElementById('venue_address_search');
            if (!btn) return;
                btn.addEventListener('click', async function(){
                var addr = document.getElementById('venue_address').value.trim();
                if (!addr) { alert('住所を入力してください'); return; }
                var key = window.GOOGLE_MAPS_API_KEY || '{$inline_key}';
                if (!key) { alert('Google Maps API key is not set in EVM settings'); return; }
                try {
                    // ブラウザでのジオコーディングは Maps JS の Geocoder を利用
                    function loadMapsAndGeocode(address, key) {
                        return new Promise(function(resolve, reject) {
                            function run() {
                                if (window.google && google.maps && google.maps.Geocoder) {
                                    var geocoder = new google.maps.Geocoder();
                                    geocoder.geocode({ address: address }, function(results, status) {
                                        resolve({ status: status, results: results });
                                    });
                                    return;
                                }
                                var script = document.createElement('script');
                                script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key);
                                script.async = true; script.defer = true;
                                script.onload = function() { run(); };
                                script.onerror = function() { reject(new Error('Failed to load Google Maps JS')); };
                                document.head.appendChild(script);
                            }
                            run();
                        });
                    }

                    var j = await loadMapsAndGeocode(addr, key);
                    if (j && (j.status === 'OK' || (window.google && google.maps && j.status === google.maps.GeocoderStatus.OK)) && j.results && j.results.length) {
                        var loc = j.results[0].geometry.location;
                        var lat = (typeof loc.lat === 'function') ? loc.lat() : loc.lat;
                        var lng = (typeof loc.lng === 'function') ? loc.lng() : loc.lng;
                        var zoom = 15;
                        document.getElementById('_evm_lat').value = lat;
                        document.getElementById('_evm_lng').value = lng;
                        document.getElementById('_evm_zoom').value = zoom;
                        // 動的に地図を表示
                        try {
                            var canvas = document.getElementById('venue_map_canvas');
                            if (window.google && google.maps) {
                                canvas.innerHTML = '<div class="evm-map-canvas" style="width:100%;height:100%;"></div>';
                                var mapDiv = canvas.querySelector('.evm-map-canvas');
                                var center = { lat: parseFloat(lat), lng: parseFloat(lng) };
                                var map = new google.maps.Map(mapDiv, {
                                    center: center,
                                    zoom: parseInt(zoom, 10),
                                    disableDefaultUI: true,
                                    zoomControl: false,
                                    fullscreenControl: false,
                                    streetViewControl: false,
                                    mapTypeControl: false,
                                    clickableIcons: false,
                                    gestureHandling: 'auto'
                                });
                                try { new google.maps.Marker({ position: center, map: map }); } catch (e) {}
                            }
                        } catch (e) {}
                    } else {
                        alert('場所が見つかりませんでした');
                    }
                } catch (e) {
                    console.error(e);
                    alert('ジオコーディングに失敗しました');
                }
            });
        } catch (e) {}
    });
})();
</script>
JS;
                echo $script;
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

            // 住所の保存と（住所が変わったら）ジオコーディングで緯度経度を取得して保存
            if ( isset($_POST['venue_address']) ) {
                $old_address = get_post_meta($post_id, '_venue_address', true);
                $address = sanitize_text_field( wp_unslash($_POST['venue_address']) ); // 🔧 修正: wp_unslash を使用
                update_post_meta($post_id, '_venue_address', $address);

                // まずフォームから送られた座標があるかを確認し、あればそれを優先して保存
                if ( isset($_POST['_evm_lat']) && isset($_POST['_evm_lng']) ) {
                    $lat = floatval( wp_unslash( $_POST['_evm_lat'] ) );
                    $lng = floatval( wp_unslash( $_POST['_evm_lng'] ) );
                    $zoom = isset($_POST['_evm_zoom']) ? intval( wp_unslash( $_POST['_evm_zoom'] ) ) : 15;
                    update_post_meta( $post_id, '_evm_lat', $lat );
                    update_post_meta( $post_id, '_evm_lng', $lng );
                    update_post_meta( $post_id, '_evm_zoom', $zoom );
                } else {
                    // フォームに座標がない場合は、住所が変わったときのみ自動ジオコーディングを実行
                    if ( $address && $address !== $old_address ) {
                        $api_key = get_option('evm_google_maps_key', '');
                        if ( $api_key ) {
                            // 安全なリクエストを作成
                            $url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' . rawurlencode($address) . '&key=' . rawurlencode($api_key);
                            $response = wp_remote_get( $url, [ 'timeout' => 5 ] );
                            if ( ! is_wp_error( $response ) && wp_remote_retrieve_response_code( $response ) === 200 ) {
                                $body = wp_remote_retrieve_body( $response );
                                $json = json_decode( $body, true );
                                if ( ! empty( $json['results'][0]['geometry']['location'] ) ) {
                                    $loc = $json['results'][0]['geometry']['location'];
                                    $lat = isset($loc['lat']) ? floatval( $loc['lat'] ) : 0.0;
                                    $lng = isset($loc['lng']) ? floatval( $loc['lng'] ) : 0.0;
                                    // デフォルトのズームを設定（必要なら後で調整可能）
                                    $zoom = 15;
                                    update_post_meta( $post_id, '_evm_lat', $lat );
                                    update_post_meta( $post_id, '_evm_lng', $lng );
                                    update_post_meta( $post_id, '_evm_zoom', $zoom );
                                }
                            }
                        }
                    }
                }
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

        // --- 補助: 投稿タイトルが空の場合、ACF の 'venue' フィールドから自動でタイトルを設定する ---
        // 理由: ユーザーが ACF の会場名フィールドに入力することが多く、投稿タイトルを別に入力する必要が分かりにくいため。
        try {
            $post = get_post($post_id);
            if ( $post && ! trim( $post->post_title ) ) {
                // 優先して ACF の get_field を使う（ACF が有効な場合）
                if ( function_exists('get_field') ) {
                    $acf_name = get_field('venue', $post_id);
                    if ( $acf_name ) {
                        // recursion を防ぐため一時的にフックを外して更新
                        remove_action('save_post', [__CLASS__, 'save_metabox']);
                        wp_update_post([ 'ID' => $post_id, 'post_title' => sanitize_text_field( $acf_name ) ]);
                        add_action('save_post', [__CLASS__, 'save_metabox']);
                    }
                } else {
                    // ACF が存在しない場合は、投稿フォームの通常フィールドを探す（保守的なフォールバック）
                    if ( isset($_POST['venue_name']) && $_POST['venue_name'] ) {
                        $name = sanitize_text_field( wp_unslash($_POST['venue_name']) );
                        remove_action('save_post', [__CLASS__, 'save_metabox']);
                        wp_update_post([ 'ID' => $post_id, 'post_title' => $name ]);
                        add_action('save_post', [__CLASS__, 'save_metabox']);
                    }
                }
            }
    } catch (\Throwable $e) { /* noop */ }
    }
}

// 🔧 修正: クラス外に余計なメソッド定義や閉じカッコがあった問題を解消
Metabox_Venue::register();
