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

# 制作物（公開2件・非公開1件）
Work.find_or_create_by!(title: "Pyxelゲーム") do |work|
  work.user          = admin
  work.description   = "PythonのPyxelで作ったレトロ風2Dゲーム"
  work.tech_stack    = ["Python", "Pyxel"]
  work.github_url    = "https://github.com/example/pyxel-game"
  work.published     = true
end

Work.find_or_create_by!(title: "Bookmark App") do |work|
  work.user          = admin
  work.description   = "Next.jsとSupabaseで作ったブックマーク管理アプリ"
  work.tech_stack    = ["Next.js", "Supabase", "TypeScript"]
  work.github_url    = "https://github.com/example/bookmark-app"
  work.demo_url      = "https://bookmark-app.example.com"
  work.published     = true
end

Work.find_or_create_by!(title: "Arduino音楽（非公開）") do |work|
  work.user          = admin
  work.description   = "Arduinoで音楽を鳴らす電子工作"
  work.tech_stack    = ["C", "Arduino"]
  work.published     = false
end

puts "Seed完了: User=#{User.count}, Post=#{Post.count} (published=#{Post.published.count}), Work=#{Work.count} (published=#{Work.published.count})"