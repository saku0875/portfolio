# 管理者ユーザー
admin = User.find_or_create_by!(email: "admin@example.com") do |user|
  user.name = "管理者"
  user.password = "password123"
end

# 外部記事リンク（公開1件・非公開1件）
Post.find_or_create_by!(url: "https://zenn.dev/example/articles/rails-jwt-auth") do |post|
  post.user        = admin
  post.title       = "Rails APIにJWT認証を実装した話"
  post.description = "Zeitwerkの罠と構文チェックの習慣について"
  post.published   = true
end

Post.find_or_create_by!(url: "https://qiita.com/example/items/docker-rails-nextjs") do |post|
  post.user        = admin
  post.title       = "DockerでRails × Next.jsを構築する（下書き）"
  post.description = "docker-compose.ymlのネットワーク設定とCORS対応"
  post.published   = false
end

puts "Seed完了: User=#{User.count}, Post=#{Post.count} (published=#{Post.published.count})"