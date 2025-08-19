# プロダクション環境デプロイ前チェックリスト

## 1. デプロイメント設定

### 必要な要素
- [ ] WSGI サーバー設定
  - gunicorn または uwsgi の設定ファイル
  - ワーカープロセス数の最適化
  - タイムアウト設定

- [ ] Webサーバー設定
  - nginx の設定ファイル
  - 静的ファイルの配信設定
  - プロキシ設定

### 推奨設定例
```nginx
# nginx設定例
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /static/ {
        alias /path/to/your/static/;
        expires 30d;
    }
}
```

## 2. セキュリティ対策

### 必要な要素
- [ ] CSRF保護
  - すべてのフォームにCSRFトークンを実装
  - APIエンドポイントの保護

- [ ] セキュリティヘッダー
  - HSTS
  - X-Frame-Options
  - X-Content-Type-Options
  - Content-Security-Policy

- [ ] 環境変数
  - 本番環境用の.env設定
  - シークレットキーの安全な管理
  - デバッグモードの無効化

### 推奨設定例
```python
# セキュリティヘッダー設定例
from flask_talisman import Talisman

talisman = Talisman(
    app,
    force_https=True,
    frame_options='DENY',
    content_security_policy={
        'default-src': "'self'",
        'img-src': '*',
        'script-src': "'self'"
    }
)
```

## 3. 静的ファイル管理

### 必要なファイル
- [ ] favicon.ico
- [ ] robots.txt
- [ ] sitemap.xml
- [ ] manifest.json（PWA対応の場合）

### サンプル robots.txt
```txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /private/

Sitemap: https://yourdomain.com/sitemap.xml
```

## 4. エラーハンドリング

### 実装すべき要素
- [ ] カスタムエラーページ
  - 404 Not Found
  - 500 Internal Server Error
  - 403 Forbidden
  
- [ ] ロギング設定
  - エラーログの保存
  - アクセスログの記録
  - ログローテーション

### 推奨設定例
```python
# エラーハンドリング設定例
import logging
from logging.handlers import RotatingFileHandler

# ロギング設定
file_handler = RotatingFileHandler('logs/app.log', maxBytes=1024 * 1024, backupCount=10)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)

# カスタムエラーページ
@app.errorhandler(404)
def not_found_error(error):
    return render_template('errors/404.html'), 404
```

## 5. パフォーマンス最適化

### 必要な設定
- [ ] 静的ファイルのキャッシュ設定
  - Cache-Control ヘッダーの設定
  - ETags の設定

- [ ] アセット最適化
  - CSS/JSの圧縮
  - 画像の最適化
  - ブラウザキャッシュの活用

### 推奨設定例
```python
# Flask-Assets設定例
from flask_assets import Environment, Bundle

assets = Environment(app)
js = Bundle('js/*.js', filters='jsmin', output='gen/packed.js')
css = Bundle('css/*.css', filters='cssmin', output='gen/packed.css')
assets.register('js_all', js)
assets.register('css_all', css)
```

## 6. SEO対策

### 実装すべき要素
- [ ] metaタグの最適化
  - title
  - description
  - keywords
  
- [ ] OGP設定
  - og:title
  - og:description
  - og:image
  - og:url

### サンプルコード
```html
<!-- meta tags例 -->
<meta name="description" content="ページの説明">
<meta name="keywords" content="キーワード1, キーワード2">
<meta property="og:title" content="ページタイトル">
<meta property="og:description" content="ページの説明">
<meta property="og:image" content="https://yourdomain.com/images/ogp.jpg">
<meta property="og:url" content="https://yourdomain.com/page">
```

## 7. ドキュメント

### 必要なドキュメント
- [ ] デプロイメント手順
  - 環境構築手順
  - デプロイ手順
  - ロールバック手順

- [ ] メンテナンス手順
  - バックアップ/リストア手順
  - アップデート手順
  - トラブルシューティングガイド

## 8. モニタリング

### 実装すべき要素
- [ ] アプリケーション監視
  - パフォーマンスメトリクス
  - エラー率
  - レスポンスタイム

- [ ] インフラ監視
  - サーバーリソース
  - データベース状態
  - ネットワーク状態

### 推奨ツール
- Prometheus + Grafana
- Sentry（エラー追跡）
- New Relic
- Datadog