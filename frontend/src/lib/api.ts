// APIレスポンスの型定義（Railsのas_json(only:)と対応させる）
export type Post = {
  id: number;
  title: string;
  url: string;
  description: string | null;
  published_at: string;
};

export type Work = {
  id: number;
  title: string;
  description: string | null;
  tech_stack: string[];
  video_url: string | null;
  thumbnail_url: string | null;
  github_url: string | null;
  demo_url: string | null;
};

// Server Components用のベースURL（コンテナ間通信）
const API_URL_SERVER = process.env.API_URL_SERVER ?? "http://localhost:3001";

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL_SERVER}${path}`, {
    next: { revalidate: 60 }, // 60秒キャッシュ（ISR）
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${path}`);
  }

  return res.json();
}

export function getPosts(): Promise<Post[]> {
  return fetchAPI<Post[]>("/api/v1/posts");
}

export function getWorks(): Promise<Work[]> {
  return fetchAPI<Work[]>("/api/v1/works");
}