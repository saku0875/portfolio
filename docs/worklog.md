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

2026-07-12 記事リンクCRUD・制作物CRUD・CORS設定の実装
やったこと

前回残タスクの確認: リモートmainには認証実装がマージ済みだったことをgit pullで確認（fa9d94b..309d620）。ローカルmainを同期
feature/5-posts-crud ブランチで記事リンクCRUD APIを実装

postsテーブル改修マイグレーション ChangePostsForExternalLinks: body(text)・status(integer)を削除、url(string, null: false)・description(text)・published(boolean, default: false, null: false)を追加
Postモデル書き直し: enum :status削除、titleとurlのバリデーション（url形式は%r{\Ahttps?://}）、scope :published、before_save :set_published_at（published_at.nil?のときのみ記録＝初公開日時を保持）
seeds.rbを新スキーマで書き直し（一意判定キーをtitleからurlに変更、公開1件・非公開1件）
ルーティング: namespace :api > :v1 で公開用 resources :posts, only: [:index] と管理用 namespace :admin > resources :posts を分離
Api::V1::PostsController（公開・skip_before_action・publishedのみ・5フィールドに絞る）と Api::V1::Admin::PostsController（認証必須・フルCRUD・Strong Parameters・current_user.posts.build）を実装
curl検証7パターン全通過（401 / 200下書き含む2件 / 201作成+published_at自動記録 / 422バリデーション / 200更新+published_at保持確認 / 204削除 / 404削除済みid）


feature/6-works-crud ブランチで制作物CRUD APIを実装

worksテーブル新規作成: tech_stackはPostgreSQL配列型（string, array: true, default: []）、positionにindex、publishedはdefault: false
Workモデル: title必須、URL系4カラムはallow_blank: true+形式チェック（URL_FORMAT定数で共通化）、scope :published / scope :ordered、before_create :set_default_position（最大position+1の自動採番）
User モデルに has_many :works を追加
seedsに制作物3件（公開2・非公開1）を追加、position自動採番が1,2,3となることを確認
ルーティングにcollection do patch :reorder endで並び替えエンドポイントを追加（計8本）
公開用・管理用コントローラを実装。reorderは{"ids": [...]}を受けてposition振り直し、Work.transaction+update!で全件成功or全ロールバック
curl検証全通過。ids:[4,3,2,1]での並び替え→公開APIへの反映（非公開は除外されたまま）も確認


feature/7-cors ブランチでCORS設定

Gemfileのrack-corsコメントアウト解除、bundle lock --update→bundle install（今回は権限エラーなし、再ビルド不要だった）
config/initializers/cors.rb作成: オリジンはENV.fetch("FRONTEND_ORIGIN", "http://localhost:3000")で環境変数切替可能に、headers: :any、OPTIONSを含む全メソッド許可、max_age: 600
プリフライト検証OK（access-control-allow-headersにAuthorization含む）、不正オリジン（evil.example.com）にはallow-originヘッダが付かないことを確認


コミット: 記事CRUD分・works分（10ファイル、テスト雛形含む）・CORS分をそれぞれの機能ブランチでコミットしmainへマージ

ハマったこと（エラー全文）
1. マイグレーション後のrails runnerで落ちる: モデルに残ったenum :status
/usr/local/bundle/gems/activerecord-7.2.3.1/lib/active_record/enum.rb:261:in `block in _enum': Undeclared attribute type for enum 'status' in Post. Enums must be backed by a database column or declared with an explicit type via `attribute`. (RuntimeError)

原因: DBからstatusカラムを削除したが、Postモデルのenum :status宣言が残っていた。enumは裏付けカラムが必須なので、クラス読み込み時点で例外
対処: モデル書き直し時にenum宣言を削除。「カラムを消すときはモデル側の宣言（enum/バリデーション/コールバック）も同時に見直す」が教訓

2. seeds.rbで構文エラー: 貼り付け時に最終行が切れた
SyntaxError: --> /app/db/seeds.rb
unterminated string; expected a closing delimiter for the interpolated string
> 22  puts "Seed完了: User=#{User.count},
/app/db/seeds.rb:22: unterminated string meets end of file (SyntaxError)

原因: 複数行貼り付けで最終行の文字列が途中で切れてファイル終端に達した
対処: 最終行を貼り直し。ruby -cをモデルには適用したのにseeds.rbには適用していなかった。「貼り付けたRubyファイルはすべてruby -c」に格上げ

3. ログインが401: seedのパスワードが実DBと不一致
{"error":"メールアドレスまたはパスワードが正しくありません"}
（例外なし。server-timingにsql.active_recordとinstantiation.active_recordがあり、ユーザー取得はできている＝パスワード照合で失敗と推定できた）

原因: find_or_create_by!のブロックは新規作成時しか実行されない。管理者は前回seedで作成済みだったため、今回seeds.rbに書いたpassword123は一度も設定されておらず、実パスワードは前回の値のままだった
対処: rails runner 'User.find_by!(email: "admin@example.com").update!(password: "password123")'でリセット
冪等seedの副作用: 「seedファイルに書いてある値＝DBの値」とは限らない

4. routes.rbでend不足による起動不能
/app/config/routes.rb:33: syntax error, unexpected end-of-input, expecting `end' or dummy end (SyntaxError)

原因: resources :works do > collection doの入れ子追加時にendが不足。Rails自体が起動できなくなり、curlは(7) Failed to connectに
対処: endの対応を確認して修正。routes.rbもRubyファイルなのでruby -c config/routes.rbが使える

5. works作成で500: Userモデルにhas_many :worksがない
"exception":"#<NoMethodError: undefined method `works' for an instance of User>"
"Application Trace":[{"trace":"app/controllers/api/v1/admin/works_controller.rb:19:in `create'"}]

原因: Workにbelongs_to :userは書いたが、User側のhas_many :worksを忘れた。関連は双方向に宣言が必要。postsで同エラーが出なかったのは前回セッションでhas_many :postsを書いていたため
連鎖: 作成失敗(500)→バリデーション検証も500→id:4不在でreorderが404→ただしトランザクションのロールバックとrescue_fromの404は正しく機能していた
対処: has_many :works, dependent: :destroyを追加

6. 操作ミス: restart完了前のcurl実行
curl: (56) Recv failure: Connection reset by peer

原因: docker compose restartの完了を待たずに次のコマンドが走った
対処: docker compose restart backend && sleep 5 && curl ...の形式を導入

判断したこと・理由

公開側にshowを作らない: 記事は外部リンクに飛ぶだけで詳細ページを持たないため、ルート自体を生やさない（only: [:index]）
レスポンスフィールドをエンドポイントごとにas_json(only:)で絞る: 公開一覧は5フィールド、管理側はADMIN_FIELDS定数で一元管理。不要な内部情報（user_id等）を公開側に漏らさない
published_atはpublished_at.nil?のときのみ記録: 非公開→再公開しても初公開日時を保持するため
tech_stackはjsonbでなくPostgreSQL配列型: 単純な文字列リストには配列型が素直。オブジェクト化が必要になったらそのときマイグレーションする
positionはbefore_createで自動採番（||=）: 未指定なら末尾に追加、指定があれば尊重
reorderはcollectionルート+id配列受け取り+トランザクション: 複数レコードの一括更新なので特定idに紐づかない。update!で途中失敗時は全ロールバック
URL系バリデーションはallow_blank: true: worksの4URLは任意項目のため「空はOK、入っていれば形式チェック」
CORSのoriginは環境変数FRONTEND_ORIGINで切替: 本番デプロイ時にコード変更不要。origins "*"はJWTを扱うAPIでは採用しない
current_user.posts.build/current_user.works.buildで作成: リクエストからuser_idを受け取らない＝なりすまし登録の余地を作らない

未解決・次回やること

次の実装フェーズ: Next.js 15フロントエンド

公開画面（トップ・制作物一覧・記事一覧・About/Contact）から着手し、その後管理画面（ログイン・CRUD）
App Router、Server Components、JWT の保存方法（cookie vs メモリ）などの設計判断が必要


VPSデプロイ（フロント完成後）
seedのダミーURLを実際のQiita/Zenn記事URLに差し替える（管理APIからでも可）
恒常的な知見への追記候補:

貼り付けたRubyファイルはすべてruby -c（routes.rb含む）
find_or_create_by!のブロックは既存レコードに適用されない（seedの値変更≠DBの値変更）
カラム削除時はモデル側の宣言（enum等）も同時に見直す
belongs_toとhas_manyは双方向セットで書く
docker compose restart backend && sleep 5 && <次コマンド>の形式で完了待ちを挟む


Zenn記事ネタ: 「Rails APIで公開/管理エンドポイントを分離する設計」「find_or_create_by!の冪等seedに潜む罠」

### 判断したこと・理由

- **リデザインStep 3〜6を保留し実データ化を優先**: 翌日提出のため。フォント・トークンはStep 1で切替済みなので、旧スタイルのセクションも互換エイリアスで破綻なく表示される
- **旧トークンをエイリアスとして残す段階移行**: 一括置換はコンポーネント全部を同時に触ることになり、提出前のリスクが大きい
- **タイトル表記は暫定でヒーロー=英字 `tsugumi.`、ナビ=「村田つぐみ」**: 明朝の大型見出しは英字小文字が映えるため(後で変更可能)
- **ヒーローのカード化は境界線でなく背景色差+薄影で表現**: 参考画像(yui540風)の構図に合わせた
- **seedを `find_or_initialize_by` + `assign_attributes` 方式に変更**: `find_or_create_by!` のブロックが既存レコードに効かない罠の恒久対策。ファイルの値=DBの値が常に成立する
- **記事の `published_at` は明示指定**: コールバック任せだと全記事が投入日になるため。実投稿日を保持する
- **動画はYouTubeでなくCloudinary**: 現行の `<video>` タグ実装のままコード修正ゼロで済む。YouTubeはiframe改修が必要な上、プレーヤーUIが乗り演出として損
- **提出形態がリポジトリ提出のためVPS/PaaSデプロイは保留**: READMEに「今後の予定」として明記し、未完成でなく計画中として見せる

### 未解決・次回やること

- README.mdのpushとGitHub上での表示確認
- mainへの最終マージ・push(提出物の確定)
- **リデザインStep 3〜6の再開**(提出後): セクションヘッダ共通化+About / Works・Blog / VideoSlider強化 / Footer。完了時に旧トークンエイリアスを削除
- 管理画面UI(ログイン・記事/制作物CRUD・並び替え)
- VPSデプロイ(Xserver VPS+独自ドメイン)。PaaS(Vercel+Railway)での仮公開も選択肢
- 記事②③が限定共有URL(`/private/`)のまま。Qiita側で公開に変更したらURLが変わるためseeds更新が必要
- bookmark-managerの `demo_url` が `/auth/dashboard` 直リンク。未ログイン閲覧者の挙動を確認し、必要ならトップURLへ変更
- Cloudinaryのpublic_idが日本語ファイル名由来でURLが長い。リネームするならURL変更とseeds更新をセットで
- 管理者パスワードが開発初期値のまま(デプロイ時に必ず変更)
- **恒常的な知見への追記候補**:
  - ブラウザで見るのは3000、curlでAPIは3001
  - `<p>` 内にブロック要素を書くとHydrationエラー("Invalid HTML tag nesting")。改行は `<br />`
  - Cloudinaryの共有URLは埋め込み形式。`<video>` には `res.cloudinary.com/<cloud>/video/upload/<public_id>.mp4` の直URL。拡張子 `.jpg` でサムネイル取得可
- Zenn記事ネタ: 「Next.jsのHydrationエラーの原因がHTMLの入れ子違反だった話」