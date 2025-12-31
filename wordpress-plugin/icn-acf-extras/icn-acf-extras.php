<?php

/**
 * Plugin Name: ICN ACF Extras
 * Description: ACFのGoogleマップ用APIキーを設定します。
 * Version: 1.0.0
 */

add_action('acf/init', function () {
  $key = '';
  if (defined('GOOGLE_MAPS_API_KEY')) {
    $key = trim((string) GOOGLE_MAPS_API_KEY);
  }
  if ($key === '') {
    $key = trim((string) get_option('evm_google_maps_key', ''));
  }
  if ($key !== '') {
    acf_update_setting('google_api_key', $key);
  }
});
