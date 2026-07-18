export type NewsSource = "NAVER" | "REUTERS";

export interface NormalizedArticle {
  source: NewsSource;
  title: string;
  url: string;
  description: string;
  publishedAt: Date;
}
