user = User.find_or_create_by!(email: "admin@example.com") do |u|
  u.name = "管理者"
  u.password = "password"
end

Post.find_or_create_by!(title: "はじめての記事") do |p|
  p.user = user
  p.body = "これは最初の記事です。"
  p.status = :published
  p.published_at = Time.current
end

Post.find_or_create_by!(title: "下書きの記事") do |p|
  p.user = user
  p.body = "これは下書きです。"
  p.status = :draft
end