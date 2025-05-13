# 日本語教室ボランティア活動ブログ

## 概要
地域の日本語教室ボランティア活動のブログサイト。Flaskを使ったシンプルなブログアプリケーション。

## 開発方針
- Flask (Python) をバックエンドに使用
- フロントエンドはシンプルなJinja2テンプレートで開始、後にVue.js導入検討
- Dockerで環境構築
- SQLiteをデータベースに使用
- ローカル開発後にAWS等にデプロイ予定

## 機能
- 記事一覧表示
- 記事詳細表示
- 記事投稿（Markdown対応）
- 記事編集・削除
- ログイン・ログアウト（シンプル認証）
- カレンダー（予定設定）
- ヘッダー背景に画像を設定可能
- 英語切り替え（多言語対応）
- 記事のカテゴリ機能
- モバイル対応（レスポンシブデザイン）
- 問い合わせフォーム

## フォルダ構成
```
/blog
├── app.py                # Flaskアプリケーション本体
├── requirements.txt      # Python依存パッケージ
├── Dockerfile            # Dockerイメージ定義
├── docker-compose.yml    # Docker Compose設定
├── /templates            # HTMLテンプレート
│   ├── base.html
│   ├── index.html
│   ├── post_detail.html
│   ├── post_form.html
│   └── login.html
├── /static               # CSSやJSなどの静的ファイル
│   └── style.css
└── /instance             # SQLiteデータベースファイル配置（git管理外）
    └── blog.db
```

## 開発手順
1. Docker環境構築
2. Flaskアプリの基本機能実装
3. ログイン認証実装
4. Markdown対応記事投稿
5. フロントエンド改善（Vue.js導入検討）
6. 発展機能追加（カレンダー予定設定、ヘッダー背景画像設定、英語切り替え、記事カテゴリ、モバイル対応、問い合わせフォーム）
