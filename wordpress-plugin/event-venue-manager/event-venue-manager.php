<?php
/**
 * Plugin Name: Event & Venue Manager
 * Description: カレンダーと会場管理の最小実装
 * Version: 0.1.0
 * Author: Kaoru Yoshino
 * License: GPL2
 */
if (!defined('ABSPATH')) exit;

define('EVM_PATH', plugin_dir_path(__FILE__));
define('EVM_URL',  plugin_dir_url(__FILE__));
define('EVM_VER',  '0.1.0');

require_once EVM_PATH . 'includes/class-plugin.php';
add_action('plugins_loaded', function () {
    \Event_Venue_Manager\Plugin::init();
});
