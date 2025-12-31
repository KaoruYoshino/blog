# プラグイン一覧と説明

このファイルにはリポジトリ内の独自作成プラグインの説明をまとめます。

- ローカル確認手順は [`README.md`](README.md:1) を参照

## 目次

- Event & Venue Manager
- ICN ACF Extras
- ICN Admin Columns

## Event & Venue Manager

- ファイル: [`wordpress-plugin/event-venue-manager/event-venue-manager.php`](wordpress-plugin/event-venue-manager/event-venue-manager.php:1)
- 説明: カレンダーと会場管理の最小実装。プラグイン初期化はクラス `\Event_Venue_Manager\Plugin::init()` を通じて行われる。
- バージョン: 0.1.0
- テスト/確認: 管理画面で会場投稿タイプ（slug: venue / venues）を作成・編集し、表示や保存を確認。関連ファイルは `wordpress-plugin/event-venue-manager/includes/`。

## ICN ACF Extras

- ファイル: [`wordpress-plugin/icn-acf-extras/icn-acf-extras.php`](wordpress-plugin/icn-acf-extras/icn-acf-extras.php:1)
- 説明: ACF の Google Maps API キーを設定する小さなユーティリティ。`GOOGLE_MAPS_API_KEY` 定数が定義されていれば ACF に設定する。
- バージョン: 1.0.0
- テスト/確認: ACF の Google Map フィールドで地図が表示されるかを確認。`GOOGLE_MAPS_API_KEY` を wp-config.php または環境で定義して動作確認。

## ICN Admin Columns

- ファイル: [`wordpress-plugin/icn-admin-columns/icn-admin-columns.php`](wordpress-plugin/icn-admin-columns/icn-admin-columns.php:1)
- 説明: venue 投稿一覧に「住所」「座標」の管理カラムを追加する。ACF の `venue_map` フィールドを参照する。
- バージョン: 1.0.0
- テスト/確認: 投稿一覧（投稿タイプ: venue / venues）で追加カラムが表示されるか確認。ACF の `venue_map` フィールドが正しく保存されていることを確認。

## 参考: サードパーティ

- Advanced Custom Fields: [`wordpress-plugin/advanced-custom-fields/acf.php`](wordpress-plugin/advanced-custom-fields/acf.php:1)
- ACF は本リポジトリに含まれており、多くの機能は ACF に依存しているため環境に ACF が有効であることを確認してください。

## 追加のメモ

- プラグインのスラッグ名は各ファイルの配置先フォルダ名に依存します。WP-CLI での有効化時はフォルダ名を確認して `wp plugin activate <slug>` を使ってください。
- 追記や修正が必要であればこのファイルを編集してください。