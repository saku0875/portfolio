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

## 2026-07-12（続き） フロントエンド公開画面の実装

### やったこと
- `feature/8-frontend-public` ブランチでNext.js 15の公開画面を実装（既存構成: TypeScript / Tailwind CSS v4 / App Router / Turbopack、create-next-app初期状態から着手）
- **API接続の土台**
  - `frontend/.env.local` を作成: `API_URL_SERVER=http://backend:3000`（Server Component用・コンテナ間通信）と `NEXT_PUBLIC_API_URL=http://localhost:3001`（Client Component用・ブラウザから）
  - `src/lib/api.ts` を作成: `Post` / `Work` の型定義（RailsのレスポンスフィールドとJSONで1対1対応）、ジェネリクスの `fetchAPI<T>`、`next: { revalidate: 60 }` でISRキャッシュ
- **Rails側の修正**: `config/environments/development.rb` に `config.hosts << "backend"` を追加（Host Authorization対策、後述）
- **デザイン基盤の構築**（yui540風の明るい紙色ベース + 太線 + 影の立体感 + 豊富なモーション）
  - `globals.css` を全面書き換え: 独自配色トークン（白+茜色）、フォント（Zen Maru Gothic / Zen Kaku Gothic New / M PLUS 1 Code）、イージング、幕アニメーション、文字分割アニメーション4種、`.btn` / `.card` / `.tag` の共通クラス、猫の会話スタイル、スライドショースタイル、`prefers-reduced-motion` 対応
  - 方針: **Tailwindはレイアウト・余白、素のCSSは色・モーション**という役割分担（複雑なアニメーションはユーティリティで表現しきれないため）
- **アニメーションコンポーネント**
  - `SplitText.tsx`: 文字を `<span class="char" style="--i:N">` に分割（Server Componentのまま。propsから決まるだけなので）
  - `Reveal.tsx`: IntersectionObserverでスクロール到達時に `.play` を付与（`"use client"`、childrenでServer Componentを包める構造）
  - `CatDialog.tsx`: 猫のタイプライター会話（`"use client"`、setIntervalを `useRef` で保持、タイプ中タップで全文スキップ、▼点滅、squash&stretchで跳ねる）
  - `Opening.tsx`: オープニングの幕（1.4秒後にDOMから除去）
  - `VideoSlider.tsx`: 幕ワイプで切り替わるスライドショー
- **1ページ構成に再構成**（当初は `/works` `/posts` の個別ページを作ったが、シングルページ化の方針に変更）
  - 構成: Opening（幕）→ Nav（sticky・アンカーリンク）→ #hero → #cat → #videos → #about → #works → #blog → Footer
  - ナビは `<Link href="/works">` から `<a href="#works">` へ変更、`section[id] { scroll-margin-top: 90px }` で固定ヘッダー分を吸収
  - `rm -rf frontend/src/app/works frontend/src/app/posts` で個別ページを削除
  - タイトル演出をページごとに変える: Hero=pop / About=二重文字 / Works=帯ワイプ / Blog=slide / Videos=pop
- **Videosスライドショー**
  - スライドは同じgridセルに重ね（`grid-area: 1/1`）、`visibility` で切替
  - 幕が覆いきる瞬間（450ms = 0.9s × 50%）に中身を差し替える。`animatingRef` で連打防止、`setWiping(false)` → `requestAnimationFrame` → `setWiping(true)` でアニメ再始動
  - ホバーで現れる半透明の ◁ ▷ ボタン、インジケーター（●○○）
  - 映像の優先順位: `video_url`（`<video autoPlay muted loop playsInline>`）→ `thumbnail_url`（`<img>`）→ プレースホルダー「NO VIDEO YET」
  - スライドクリックで `#work-{id}` へアンカー遷移し、`.card:target` で遷移先カードを一瞬ハイライト
- 動画は外部ホスティング（Cloudinary等）にアップロードしURLをDBに保存する方針を維持（リポジトリ肥大化を避ける）。現状は全件nullなのでプレースホルダー表示

### ハマったこと（エラー全文）

#### 1. Server ComponentからRails APIを叩くと403: Host Authorization

```
{"status":500,"error":"Internal Server Error","exception":"Error: API error: 403 /api/v1/posts"}
frontend-1  |  ⨯ Error: API error: 403 /api/v1/posts
frontend-1  |     at fetchAPI (src/lib/api.ts:30:11)
frontend-1  |     at async PostsPage (src/app/posts/page.tsx:8:17)
```

`docker compose exec frontend curl -s http://backend:3000/api/v1/posts` で直接叩くと、Railsのエラーページが返ってきた:

```
Blocked hosts: backend:3000
To allow requests to these hosts, make sure they are valid hostnames (containing only numbers, letters, dashes and dots), then add the following to your environment configuration:
    config.hosts << "backend:3000"
```

- **原因**: Rails 6以降のHost Authorization（DNSリバインディング攻撃対策）。frontendコンテナから `http://backend:3000` で叩くとHostヘッダが `backend:3000` になり、開発環境の許可リスト（localhost等）にないため403で弾かれる。curlで `localhost:3001` から叩いていたときは問題にならなかった
- **対処**: `config/environments/development.rb` に `config.hosts << "backend"` を追加（ポートは自動で許容される）
- **重要**: CORSとは全く別の仕組み。CORSは「どのオリジンのJSにレスポンスを読ませるか」、Host Authorizationは「どのホスト名宛のリクエストを受け付けるか」。CORS設定済みなのに403が出たらこちらを疑う

#### 2. Tailwindのレイアウトユーティリティが全滅

エラーメッセージなし。症状として `mx-auto max-w-4xl px-6 py-16` `grid gap-6` が一切効かず、全要素が左端に張り付いた。一方で自前クラス（`.btn` `.card` `.tag`）は正常に描画されていた。

- **原因**: globals.cssに書いた `* { margin: 0; padding: 0; box-sizing: border-box; }` が、Tailwind v4のユーティリティを後勝ちで上書きしていた。Tailwind v4はPreflight（独自リセット）を内包しており、その後にレイヤー外の全称セレクタを書くと優先順位が逆転する
- **対処**: `* { ... }` の1行を削除（Preflightが同等のことを既にやっている）

#### 3. TSXの貼り付け事故（本日4件目・5件目）

**posts/page.tsx**: 開きタグ `<a` が消えて空行になっていた。
```
./src/app/posts/page.tsx:25:15
Parsing ecmascript source code failed
> 25 |               >
     |               ^
Unexpected token. Did you mean `{'>'}` or `&gt;`?
```
- JSXの「タグの開き忘れ」はRubyの `end` 欠落と同じくらい起きるが、エラーメッセージが直感的でない。加えて末尾の `}` も欠落していた

**works/page.tsx**: 末尾の `}` が欠落。Turbopackが寛容にコンパイルしたため画面は動いてしまい、`tail -3` で気づいた

- **対処**: `tail -3` での末尾確認をルーチン化。TypeScriptは `docker compose exec frontend npx tsc --noEmit` で構文・型チェック

#### 4. globals.cssへの追記がブラウザに反映されない（Turbopackのキャッシュ）

エラーメッセージなし。症状として、スライドショー用CSSを追記したのに一切適用されず、スライドが3件同時に表示され、◁▷ボタンがテキストとして下に並んだ。

切り分け:
- `grep -c "slider" frontend/src/app/globals.css` → CSSは正しく存在
- `curl -s http://localhost:3000 | grep -o 'class="slide [^"]*"'` → `class="slide is-active"` 等が出力され、HTML側も正常
- つまりCSSがブラウザに届いていない

- **対処**: `docker compose restart frontend` + ブラウザのハードリロード（`Ctrl+Shift+R`）で解決
- **知見**: TurbopackはTSXの変更は即座に反映するが、**CSSの追記が取り残されることがある**。CSSを書いたのに効かないときはまずコンテナ再起動を疑う。それでもダメなら `docker compose exec frontend rm -rf .next` でビルドキャッシュを削除

#### 5. VSCodeで `import "./globals.css"` に型エラー表示

```
'./globals.css' の副作用インポートに対するモジュールまたは型宣言が見つかりません。
```

- **原因**: エディタのTypeScript言語サーバーのキャッシュ。`next-env.d.ts` は存在し、tsconfig.jsonの `include` にも入っており、`tsc --noEmit` は通っていた（＝実害なし）
- **対処**: VSCodeで `TypeScript: Restart TS Server` を実行

### 判断したこと・理由
- **公開画面はServer Components、管理画面はClient Components**: 公開側はSEO・表示速度を優先（採用担当者に見られることが価値）。管理側はログイン状態に応じて変わるためクライアント取得が自然
- **JWTはlocalStorageに保存**（管理画面実装時）: 管理者が自分一人のMVPではXSSリスクが限定的で、実装の単純さが勝る。本格運用時はhttpOnly Cookieに移行
- **Server用とClient用でAPI URLを分ける**: Server Componentのfetchはコンテナ内で実行されるためサービス名（`backend:3000`）、Client Componentはブラウザで実行されるためホストのポート（`localhost:3001`）。`NEXT_PUBLIC_` プレフィックスの有無で使い分ける（内部URLをブラウザに晒さない）
- **`Promise.all` で並列取得**: worksとpostsを逐次awaitすると往復が2回分待たされる
- **`slice(0, 3)` でクライアント側で絞る**: APIに件数制限パラメータを足すより単純。データ量が小さいので問題ない
- **1ページ構成（案A）を採用**: 作品数件・記事数件の規模なら個別ページは不要。スクロールに合わせて演出が発火する体験と相性が良い。作品が20件を超えたら再検討
- **`#videos` と `#works` でIDを分けた**: HTMLのidはページ内で一意でなければならない（重複するとアンカーリンクが不定になる）
- **オープニングは幕を採用**: スライドショーの幕ワイプと演出言語が統一され、`scaleX` + `transform-origin` 切替という同じ技法を使い回せる
- **`SplitText` はServer Componentのまま**: propsから決まるだけなので `"use client"` 不要。SEOにも有利
- **`Reveal` はchildrenを受け取る形**: 「演出だけClient、データはServer」の構造を保つ
- **`animatingRef` は `useRef`**: `useState` だと値変更で再レンダリングが起き、`setTimeout` のタイミングがずれる恐れがある
- **`aria-hidden` / `tabIndex={-1}`**: 非表示スライドをスクリーンリーダーとキーボード操作から除外
- **`<video>` は `muted` 必須**: ブラウザの自動再生制約。`playsInline` はiOSで全画面化させないため

### 未解決・次回やること
- **管理画面の実装**（次の大きなフェーズ）
  - ログイン画面（JWT取得 → localStorage保存）
  - 記事リンクCRUD UI（一覧・新規・編集・削除）
  - 制作物CRUD UI（+ 並び替え。`PATCH /api/v1/admin/works/reorder` を使う）
  - Client Componentsで実装、`NEXT_PUBLIC_API_URL` を使用、CORS設定が効く場面
- **動画・サムネイルの用意**: Cloudinaryにアカウント作成 → アップロード → 管理画面から `video_url` / `thumbnail_url` を登録
- **Aboutの本文を自分の内容に差し替える**（現在は仮のテキスト）
- **seedのダミーURLを実際のQiita/Zenn記事URLに差し替える**
- VPSデプロイ（Xserver VPS + 独自ドメイン）。`FRONTEND_ORIGIN` 環境変数と `config.hosts` の本番設定が必要
- **恒常的な知見への追記候補**:
  - Dockerでフロント⇄APIをサービス名で繋ぐときは、Rails側の `config.hosts` に追加が必要（CORSとは別問題。403が出たらこれを疑う）
  - Tailwind v4使用時、globals.cssに `* { margin: 0; padding: 0 }` を書くとユーティリティが死ぬ
  - Turbopackはcssの追記を取りこぼすことがある。効かないときは `docker compose restart frontend` → ハードリロード → `.next` 削除の順に試す
  - 貼り付けたTSX/TSファイルは `tail -3` で末尾確認 + `npx tsc --noEmit` で型チェック（Rubyの `ruby -c` に相当）
  - JSXのタグ開き忘れはエラーメッセージが直感的でない（「Unexpected token. Did you mean `{'>'}`」が出たら開きタグの欠落を疑う）
- Zenn記事ネタ: 「CORSを設定したのにNext.jsからRails APIが403で弾かれる話（Host Authorizationの罠）」「Tailwind v4に素のCSSを混ぜるときの優先順位」