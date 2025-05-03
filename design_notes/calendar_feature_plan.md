# カレンダー機能実装計画（詳細版）

## 概要
- 会場情報をテーブル化し、イベントに紐づける形で管理
- Google Mapの情報はログインユーザーが会場管理画面で設定・確認
- トップページのカレンダーでは未ログインユーザーも会場情報（地図）を閲覧可能

## DB設計
- Venueテーブル（会場）
  - id (PK)
  - name (必須)
  - placeId (Google Map用ID)
  - address (任意)
  - lat (任意)
  - lng (任意)
- Eventテーブル
  - id (PK)
  - title (必須)
  - start (必須)
  - end (任意)
  - user_id (FK, 必須)
  - description (任意)
  - recurrence_rule (任意)
  - venue_id (FK, 会場テーブルの外部キー)
  - created_at (必須)
  - updated_at (必須)

## バックエンドAPI
- GET /api/venues : 会場一覧取得
- GET /api/venues/<id> : 会場詳細取得
- POST, PUT, DELETE /api/venues : 会場管理（追加・編集・削除）
- GET /api/events : イベント一覧取得（venue情報含む）
- POST, PUT /api/events : イベント追加・編集（venue_id対応）

## フロントエンド
- カレンダー管理画面
  - 予定追加・編集モーダルの会場入力をプルダウンに変更
  - 会場一覧はAPIから取得
- 会場管理画面（新規作成）
  - 会場情報の追加・編集・削除
  - Google Map表示・確認機能
- トップページカレンダー
  - イベントクリック時に会場情報とGoogle Mapをモーダル表示

## セキュリティ・UI/UX
- 編集画面・会場管理画面はログインユーザー限定
- トップページは閲覧のみ
- UIの使いやすさ向上を図る

```mermaid
flowchart TD
  subgraph DB
    Venue[会場テーブル(Venue): id, name, placeId, address?, lat?, lng?]
    Event[イベントテーブル(Event): id, title, start, end, user_id, description, recurrence_rule, venue_id, created_at, updated_at]
    Venue -->|外部キーvenue_id| Event
  end

  subgraph Backend
    API_VenueList[GET /api/venues 会場一覧取得API]
    API_EventList[GET /api/events イベント一覧取得API]
    API_VenueDetail[GET /api/venues/<id> 会場詳細API]
    API_EventCreate[POST /api/events 予定追加API]
    API_EventUpdate[PUT /api/events/<id> 予定更新API]
    API_EventDelete[DELETE /api/events/<id> 予定削除API]
    API_VenueManage[会場管理API(追加・編集・削除)]
  end

  subgraph Frontend
    CalendarManage[カレンダー管理画面]
    VenueManage[会場管理画面]
    TopPageCalendar[トップページカレンダー]
    EventModal[予定追加・編集モーダル]
    VenueSelect[会場プルダウン選択]
    GoogleMap[Google Map表示]
    EventModal --> VenueSelect
    VenueSelect --> GoogleMap
    TopPageCalendar -->|イベントクリック| GoogleMap
  end

  DB --> Backend
  Backend --> Frontend

  CalendarManage --> API_EventList
  CalendarManage --> API_VenueList
  VenueManage --> API_VenueManage
  TopPageCalendar --> API_EventList
  TopPageCalendar --> API_VenueDetail
```

この計画に基づき実装を進めます。