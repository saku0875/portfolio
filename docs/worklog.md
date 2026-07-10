## 2026-07-10 JWT認証の実装（Step 2〜7）

### やったこと
- `api/app/services/json_web_token.rb` を新規作成（JWTのencode/decodeを担うサービスクラス）
  - `rails runner` で単体検証：トークン発行、decode成功（exp自動付与を確認）、不正トークンで `nil` を確認
- `api/app/controllers/concerns/authenticable.rb` を新規作成（`before_action :authenticate_request` による認証concern）
- `api/app/controllers/application_controller.rb` に `include Authenticable` と `rescue_from ActiveRecord::RecordNotFound` を追加（全コントローラをデフォルト認証必須に）
- `api/config/routes.rb` に `post "/login"` と `get "/me"` を追加（既存のヘルスチェック `/up`・PWAルートは残置）
- `api/app/controllers/authentication_controller.rb` を新規作成（`login` / `me` アクション、`skip_before_action` で login のみ検問解除）
- `api/db/seeds.rb` を実装し、管理者ユーザーと記事2件（published / draft）を投入
- curlで認証フローを全パターン検証し、すべて通過
  - 正しいemail/password → トークン発行成功（`{"token":"eyJ...(マスク)","name":"管理者"}`）
  - 誤ったpassword → 401
  - 偽トークン → 401（プレースホルダを誤って実行した結果だが、署名検証が偽造を弾くことの確認になった）
  - トークンなし → 401
  - 正規トークン → `{"id":1,"name":"管理者","email":"admin@example.com"}`
- 認証機能はこれで完成。コミット・mainへのマージ作業に着手（本ログ出力時点で完了未確認）

### ハマったこと（エラー全文）

#### 1. `/me` アクセスで500：`uninitialized constant Authenticable::JsonWebToken`
※レスポンスJSONのexceptionとApplication Traceを全文記録。Framework Trace（activesupport/actionpack等のスタック約50行）は省略。

```
"exception":"#<NameError: uninitialized constant Authenticable::JsonWebToken>"
"Application Trace":[{"trace":"app/controllers/concerns/authenticable.rb:13:in `authenticate_request'"}]
```

- **原因**: Zeitwerk（オートローダー）はサーバー起動時に `app/` 直下のディレクトリを走査して登録する。`app/services` はサーバー起動後に作成したため、稼働中のサーバープロセスがディレクトリの存在を知らなかった。`rails runner` は毎回新プロセスなので認識でき、runnerでは動くのにサーバー経由では落ちるという症状になった
- **対処**: `docker compose restart backend` で解決

#### 2. 正しいパスワードでもログインが401（ユーザー0件）
エラーメッセージはアプリの正常な401レスポンス（`{"error":"メールアドレスまたはパスワードが正しくありません"}`）のみで、例外は発生していない。

- **原因**: `rails db:seed` は静かに成功していたが `User.count` が 0。`cat api/db/seeds.rb` で確認したところ、**中身がRails初期状態のコメントのみ**だった。前回チャットの引き継ぎメモでは「seeds.rb実装済み」となっていたが、実ファイルに保存されていなかった
- **対処**: seeds.rbを実装して `db:seed` を再実行 → `User.count` が 1 になり解決

#### 3. コントローラで500：`SyntaxError`（`end` 欠落）
※exceptionとApplication Traceを全文記録。Framework Traceは省略。

```
"exception":"#<SyntaxError: /app/app/controllers/authentication_controller.rb:17: syntax error, unexpected end-of-input, expecting `end' or dummy end>"
"Application Trace":[{"trace":"app/controllers/authentication_controller.rb:17: syntax error, unexpected end-of-input, expecting `end' or dummy end"}]
```

- **原因**: `authentication_controller.rb` への貼り付け時に末尾の `end` が欠落（正しくは19行のところ17行で終端）
- **対処**: 全文を貼り直し。`docker compose exec backend ruby -c app/controllers/authentication_controller.rb` で `Syntax OK` を確認する手順を導入

#### 4. curlの `-H` 抜けと変数未セット（操作ミス2件）
```
curl: (3) URL rejected: Malformed input to a URL function
```
- `curl -i http://localhost:3001/me "Authorization: Bearer $TOKEN"` と `-H` を付け忘れ、ヘッダが2つ目のURLとして解釈された
- `TOKEN="eyJhbGciOiJIUzI1NiJ9.xxxxx.yyyyy"` というプレースホルダをそのまま実行し、偽トークンとして401になった（結果的に署名検証の動作確認にはなった）
- **対処**: 検証1の実トークンを `TOKEN=` にセットし、`-H "Authorization: Bearer $TOKEN"` の形式で再実行 → 成功

### 判断したこと・理由
- **ファイル作成順をサービス→concern→ApplicationController→routes→コントローラに固定**: `skip_before_action` は親に該当の `before_action` が存在しないと起動時エラーになるため
- **秘密鍵は `Rails.application.secret_key_base` を流用**: コードに秘密を書かない・環境ごとに異なる鍵になるため
- **decode失敗は例外でなく `nil` に集約**（`rescue JWT::DecodeError`）: 呼び出し側（concern）が「nilなら未認証」の一点判定で済むようにするため
- **`HashWithIndifferentAccess` でペイロードを包む**: JSON経由で文字列キーになるハッシュをシンボルでも参照できるようにするため
- **ログイン失敗時のエラーメッセージを「メールアドレスまたはパスワードが〜」に統一**: emailの存在有無を区別して返すとユーザー列挙攻撃の手がかりになるため
- **`/up`（ヘルスチェック）は残置**: 将来VPSデプロイ時の死活監視に使える。`rails/health#show` は自作ApplicationControllerを継承しないため認証必須化の影響を受けない
- **seedは `find_or_create_by!` で冪等に**: 何度実行しても重複せず、失敗時は `!` で例外を投げて気づけるため

### 未解決・次回やること
- **コミット・マージの完了確認**: `git status` で想定ファイル6件（json_web_token.rb / authenticable.rb / authentication_controller.rb / application_controller.rb / routes.rb / seeds.rb）を確認 → `feature/3-authentication` にコミット → mainへマージ・push
- **次の実装フェーズ: 記事CRUD API**
  - 公開用 `GET /api/v1/posts`（認証不要・publishedのみ・`skip_before_action`）と管理用 `/api/v1/admin/posts`（認証必須・全CRUD）でコントローラ分離
  - `show` も `Post.published` から探し、下書きは直打ちでも404にする
  - `published_at` は `before_save` コールバックで自動記録
- その後: CORS設定（rack-cors）→ フロント連携
- **恒常的な知見への追記候補**:
  - `app/` 直下に新ディレクトリを作ったらサーバー再起動（runnerで動くのにサーバーで `uninitialized constant` が出たらこれを疑う）
  - ファイル貼り付け後は `ruby -c <ファイル>` で構文チェック
  - 引き継ぎメモの「実装済み」は実ファイルを `cat` で確認してから信用する
- Zenn記事ネタ: 「Rails APIにJWT認証を実装した話（Zeitwerkの罠と構文チェックの習慣）」