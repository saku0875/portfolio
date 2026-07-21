admin = User.find_or_create_by!(email: "admin@example.com") do |u|
  u.name = "管理者"
  u.password = "password123"
end

# ===== 制作物 =====
works_data = [
  {
    title: "bookmark-manager",
    description: "初めて出たハッカソン「KCLHack」で作った一作品目のプロダクト。各アプリに保存したブックマークをまとめて、1つのアプリで管理できるサイトです。",
    tech_stack: ["Next.js", "Supabase"],
    github_url: "https://github.com/saku0875/kclhack_2025_project4",
    demo_url: "https://bookmark.saku.cool/auth/dashboard",
    video_url: "https://res.cloudinary.com/zzyw1qmt/video/upload/%E7%94%BB%E9%9D%A2%E9%8C%B2%E7%94%BB_2026-07-22_024023_xtwss0.mp4",
    thumbnail_url: "https://res.cloudinary.com/zzyw1qmt/video/upload/%E7%94%BB%E9%9D%A2%E9%8C%B2%E7%94%BB_2026-07-22_024023_xtwss0.jpg",
    position: 1,
    published: true
  },
  {
    title: "Daily gallery",
    description: "n8nを使って、Claudeが生成したアニメーションを毎日0時にサイトへ自動更新するサイト。コードも閲覧できるため、CSSアニメーションのアイデア出しにも使えます。",
    tech_stack: ["n8n", "Claude", "HTML"],
    github_url: "https://github.com/saku0875/animation-galleryl",
    demo_url: "https://saku0875.github.io/animation-gallery/",
    video_url: "https://res.cloudinary.com/zzyw1qmt/video/upload/%E7%94%BB%E9%9D%A2%E9%8C%B2%E7%94%BB_2026-07-22_023604_fbistn.mp4",
    thumbnail_url: "https://res.cloudinary.com/zzyw1qmt/video/upload/%E7%94%BB%E9%9D%A2%E9%8C%B2%E7%94%BB_2026-07-22_023604_fbistn.jpg",
    position: 2,
    published: true
  }
]

works_data.each do |attrs|
  work = Work.find_or_initialize_by(title: attrs[:title])
  work.user = admin
  work.assign_attributes(attrs)
  work.save!
end

# ===== 記事リンク =====
posts_data = [
  {
    url: "https://qiita.com/tsugumic5/items/89b97fb0d030b679a94a",
    title: "supabaseの無料枠を維持する方法",
    description: nil,
    published: true,
    published_at: Time.zone.parse("2026-07-16")
  },
  {
    url: "https://qiita.com/tsugumic5/private/8df81ded160a559367ea",
    title: "画面設計・画面遷移・Figmaの基礎について",
    description: nil,
    published: true,
    published_at: Time.zone.parse("2026-06-30")
  },
  {
    url: "https://qiita.com/tsugumic5/private/a5265841e13eac46f565",
    title: "Figmaの学生認証の仕方について",
    description: nil,
    published: true,
    published_at: Time.zone.parse("2026-06-24")
  }
]

posts_data.each do |attrs|
  post = Post.find_or_initialize_by(url: attrs[:url])
  post.user = admin
  post.assign_attributes(attrs)
  post.save!
end