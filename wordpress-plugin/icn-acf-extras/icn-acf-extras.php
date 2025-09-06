<?php

/**
 * Plugin Name: ICN ACF Extras
 * Description: ACFのGoogleマップ用APIキーを設定します。
 * Version: 1.0.0
 */

add_action('acf/init', function () {
  if (defined('GOOGLE_MAPS_API_KEY')) {
    acf_update_setting('google_api_key', GOOGLE_MAPS_API_KEY);
  }
});
