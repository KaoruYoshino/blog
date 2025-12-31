# Project README

## 概要
- ローカル開発用ホスト: `icn1997-dev.local`
- 本番ホスト: `icn1997.jp`
- プラグイン本体: `wordpress-plugin/`（エントリ: `wordpress-plugin/index.php`）

## 前提
- ローカルに WordPress が動作していること（MAMP/XAMPP/Docker 等）
- hosts に `icn1997-dev.local` を割り当て済み
- 必要な認証情報は `document_wordpress/password.txt` を参照

## hosts 設定（例）
/etc/hosts を編集し、開発マシンで名前解決する:
```bash
127.0.0.1 icn1997-dev.local
```

## プラグイン配置と有効化
ホストの WordPress インストール先にプラグインを配置する:
```bash
cp -r wordpress-plugin /path/to/wordpress/wp-content/plugins/icn1997-plugin
```
開発中はプラグインフォルダをボリュームマウントまたはシンボリックリンクで配置すると編集が即時反映されます:

WP-CLI で有効化:
```bash
cd /path/to/wordpress
wp plugin activate icn1997-plugin --allow-root
```

## デバッグとログ
WP_DEBUG を有効にする（WP-CLI 例）:
```bash
wp config set WP_DEBUG true --raw --allow-root
wp config set WP_DEBUG_LOG true --raw --allow-root
```
ログ: `/path/to/wordpress/wp-content/debug.log`

## 動作確認
- 管理画面: http://icn1997-dev.local/wp-admin
- フロント: http://icn1997-dev.local/
- プラグインが提供する画面や機能を確認し、エラーログをチェック

## 注意事項
- リポジトリの `docker-compose.yml` は Flask 用構成です。WordPress を Docker で立てる場合は別途 `docker-compose` を用意してください。
- 機密情報の取り扱いに注意（`document_wordpress/password.txt` などを Git に含めない）

## 参照ファイル
- `wordpress-plugin/index.php`
- `document_wordpress/password.txt`

## 連絡先
開発に関する質問はリポジトリの担当者へ。