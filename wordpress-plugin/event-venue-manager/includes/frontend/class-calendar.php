<?php
namespace Event_Venue_Manager;

if ( ! defined('ABSPATH') ) exit;

class Calendar {

    /**
     * レンダリング
     * 🔧 修正: メソッドを1本化。$eventsは省略可（未指定 or 空ならプレースホルダ表示）
     *
     * @param array<int, array{date:string,name:string,venue:string,url?:string}>|null $events
     */
    public static function render( $events = null ) {
        echo '<div id="evm-calendar" class="evm-calendar-wrap">';

        // 🔧 何も渡されていない/空配列ならプレースホルダを表示
        if ( empty($events) || ! is_array($events) ) {
            echo '<p>' . esc_html__( 'This is the calendar placeholder.', 'event-venue-manager' ) . '</p>';
            echo '</div>';
            return;
        }

        // 🔧 テーブル表示（i18n + エスケープ + URLリンク対応）
        echo '<table class="evm-calendar-table" style="width:100%;border-collapse:collapse;">';
        echo '<thead><tr>';
        echo '<th style="text-align:left;padding:6px;border-bottom:1px solid #ccc;">' . esc_html__( 'Date', 'event-venue-manager' ) . '</th>';
        echo '<th style="text-align:left;padding:6px;border-bottom:1px solid #ccc;">' . esc_html__( 'Event', 'event-venue-manager' ) . '</th>';
        echo '<th style="text-align:left;padding:6px;border-bottom:1px solid #ccc;">' . esc_html__( 'Venue', 'event-venue-manager' ) . '</th>';
        echo '</tr></thead><tbody>';

        foreach ( $events as $event ) {
            $date  = isset($event['date'])  ? (string) $event['date']  : '';
            $name  = isset($event['name'])  ? (string) $event['name']  : '';
            $venue = isset($event['venue']) ? (string) $event['venue'] : '';
            $url   = isset($event['url'])   ? (string) $event['url']   : '';

            echo '<tr>';
            echo '<td style="padding:6px;border-bottom:1px solid #eee;">' . esc_html( $date ) . '</td>';

            // 🔧 イベント名はURLがあればリンクに（無ければテキスト）
            echo '<td style="padding:6px;border-bottom:1px solid #eee;">';
            if ( $url ) {
                echo '<a href="' . esc_url( $url ) . '">';
                echo esc_html( $name );
                echo '</a>';
            } else {
                echo esc_html( $name );
            }
            echo '</td>';

            echo '<td style="padding:6px;border-bottom:1px solid #eee;">' . esc_html( $venue ) . '</td>';
            echo '</tr>';
        }

        echo '</tbody></table>';
        echo '</div>';
    }
}
