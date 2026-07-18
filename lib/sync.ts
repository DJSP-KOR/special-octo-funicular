import { prisma } from "./prisma";
import { fetchNaverNews } from "./naver";
import { fetchReutersNews } from "./newsapi";
import { matchKeywords } from "./classify";
import type { NormalizedArticle } from "./types";

export interface SyncResult {
  keywordCount: number;
  fetched: number;
  saved: number;
  errors: string[];
}

export async function syncNews(): Promise<SyncResult> {
  const keywords = await prisma.keyword.findMany();
  const keywordTexts = keywords.map((k: { text: string }) => k.text);

  const errors: string[] = [];
  const fetchedArticles = new Map<string, NormalizedArticle>();

  const fetchJobs = keywordTexts.flatMap((keyword: string) => [
    { keyword, source: "Naver" as const, run: () => fetchNaverNews(keyword) },
    { keyword, source: "Reuters" as const, run: () => fetchReutersNews(keyword) },
  ]);

  const results = await Promise.allSettled(fetchJobs.map((job) => job.run()));

  results.forEach((result, i) => {
    const { keyword, source } = fetchJobs[i];
    if (result.status === "fulfilled") {
      for (const article of result.value) fetchedArticles.set(article.url, article);
    } else {
      errors.push(`${source}(${keyword}): ${result.reason}`);
    }
  });

  const toSave = [...fetchedArticles.values()]
    .map((article) => ({ article, matched: matchKeywords(article, keywordTexts) }))
    .filter(({ matched }) => matched.length > 0);

  await Promise.all(
    toSave.map(({ article, matched }) =>
      prisma.article.upsert({
        where: { url: article.url },
        create: {
          source: article.source,
          title: article.title,
          url: article.url,
          description: article.description,
          publishedAt: article.publishedAt,
          keywords: { connect: matched.map((text) => ({ text })) },
        },
        update: {
          title: article.title,
          description: article.description,
          keywords: { connect: matched.map((text) => ({ text })) },
        },
      })
    )
  );

  const saved = toSave.length;

  return {
    keywordCount: keywordTexts.length,
    fetched: fetchedArticles.size,
    saved,
    errors,
  };
}
