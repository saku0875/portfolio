# Portfolio Site

CS学生の個人ポートフォリオサイト。制作物の紹介と技術記事のリンク集を、1ページ構成で掲載しています。

<!-- ![screenshot](docs/images/screenshot.png) -->

## 特徴

- 幕アニメーション・文字送り・タイプライター演出など、モーションはライブラリを使わず素のCSSで自作
- 制作物の動画は Cloudinary でホスティングし、スライドショーで自動再生
- 記事は Qiita/Zenn 等の外部プラットフォームで執筆し、リンクのみをDBで管理
- 公開画面は Server Components(SEO・表示速度優先)、管理機能は JWT 認証の API を用意

## 技術スタック

| 領域 | 技術 |
|---|---|
| フロントエンド | Next.js 15 / React 19 / TypeScript / Tailwind CSS v4 |
| バックエンド | Ruby on Rails 7.2(APIモード)/ Ruby 3.3 |
| データベース | PostgreSQL 15 |
| 認証 | has_secure_password + JWT |
| 開発環境 | Docker Compose(db / backend / frontend の3コンテナ) |

## アーキテクチャ

- 公開API(`GET /api/v1/works`, `GET /api/v1/posts`)と管理API(`/api/v1/admin/*`、要JWT)をコントローラレベルで分離
- レスポンスはエンドポイントごとに必要なフィールドのみ返却
- Server Component からはコンテナ間通信(`backend:3000`)、ブラウザからは `localhost:3001` でAPIへ到達

## セットアップ

```bash
git clone https://github.com/saku0875/portfolio.git
cd portfolio

# ビルドと起動
docker build --network=host -f api/Dockerfile.dev api
docker compose up -d

# DB作成と初期データ投入
docker compose exec backend rails db:prepare
docker compose exec backend rails db:seed
```

- フロントエンド: http://localhost:3000
- API: http://localhost:3001

## 今後の予定

- 管理画面UI(記事・制作物のCRUD、並び替え)
- VPSへのデプロイ(独自ドメイン)
