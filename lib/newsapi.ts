import type { NormalizedArticle } from "./types";

interface NewsApiArticle {
  title: string;
  url: string;
  description: string | null;
  publishedAt: string;
}

interface NewsApiResponse {
  status: string;
  articles: NewsApiArticle[];
  message?: string;
}

export async function fetchReutersNews(query: string): Promise<NormalizedArticle[]> {
  const apiKey = process.env.NEWSAPI_KEY;

  if (!apiKey) {
    throw new Error("NEWSAPI_KEY is not configured");
  }

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", query);
  url.searchParams.set("domains", "reuters.com");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "20");
  url.searchParams.set("language", "en");

  const res = await fetch(url, {
    headers: { "X-Api-Key": apiKey },
    cache: "no-store",
  });

  const data: NewsApiResponse = await res.json();

  if (!res.ok || data.status !== "ok") {
    throw new Error(`NewsAPI error: ${res.status} ${data.message ?? ""}`);
  }

  return data.articles
    .filter((a) => a.title && a.url)
    .map((a) => ({
      source: "REUTERS" as const,
      title: a.title,
      url: a.url,
      description: a.description ?? "",
      publishedAt: new Date(a.publishedAt),
    }));
}
