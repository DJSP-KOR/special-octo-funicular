"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface Keyword {
  id: string;
  text: string;
  createdAt: string;
}

interface Article {
  id: string;
  source: "NAVER" | "REUTERS";
  title: string;
  url: string;
  description: string | null;
  publishedAt: string;
  keywords: Keyword[];
}

const SOURCE_LABEL: Record<Article["source"], string> = {
  NAVER: "네이버",
  REUTERS: "로이터",
};

const SOURCE_BADGE: Record<Article["source"], string> = {
  NAVER: "bg-green-100 text-green-800",
  REUTERS: "bg-orange-100 text-orange-800",
};

export default function Home() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeywords = useCallback(async () => {
    const res = await fetch("/api/keywords");
    const data: Keyword[] = await res.json();
    setKeywords(data);
  }, []);

  const loadArticles = useCallback(async (keyword: string | null) => {
    setLoading(true);
    try {
      const url = keyword ? `/api/news?keyword=${encodeURIComponent(keyword)}` : "/api/news";
      const res = await fetch(url);
      const data = await res.json();
      setArticles(data.articles);
      setLastSyncedAt(data.lastSyncedAt);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeywords();
  }, [loadKeywords]);

  useEffect(() => {
    loadArticles(selectedKeyword);
  }, [selectedKeyword, loadArticles]);

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newKeyword.trim();
    if (!text) return;

    setError(null);
    const res = await fetch("/api/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      setError("키워드 추가에 실패했습니다.");
      return;
    }

    setNewKeyword("");
    await loadKeywords();
  };

  const handleDeleteKeyword = async (id: string, text: string) => {
    await fetch(`/api/keywords/${id}`, { method: "DELETE" });
    const nextSelected = selectedKeyword === text ? null : selectedKeyword;
    setSelectedKeyword(nextSelected);
    await loadKeywords();
    await loadArticles(nextSelected);
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/news/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "업데이트에 실패했습니다.");
        return;
      }
      await loadArticles(selectedKeyword);
    } finally {
      setSyncing(false);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Article[]>();
    for (const article of articles) {
      for (const kw of article.keywords) {
        const list = map.get(kw.text) ?? [];
        list.push(article);
        map.set(kw.text, list);
      }
    }
    return map;
  }, [articles]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">뉴스 키워드 대시보드</h1>
          <p className="text-sm text-gray-500">
            네이버 뉴스 · 로이터 뉴스를 키워드별로 분류합니다.
            {lastSyncedAt && (
              <> 마지막 업데이트: {new Date(lastSyncedAt).toLocaleString("ko-KR")}</>
            )}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {syncing ? "업데이트 중..." : "업데이트"}
        </button>
      </header>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className="flex flex-col gap-3">
        <form onSubmit={handleAddKeyword} className="flex gap-2">
          <input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="새 키워드 입력 (예: 반도체)"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            추가
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedKeyword(null)}
            className={`rounded-full px-3 py-1 text-sm ${
              selectedKeyword === null ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            전체
          </button>
          {keywords.map((kw) => (
            <span
              key={kw.id}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
                selectedKeyword === kw.text ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              <button onClick={() => setSelectedKeyword(kw.text)}>{kw.text}</button>
              <button
                onClick={() => handleDeleteKeyword(kw.id, kw.text)}
                className="text-xs opacity-60 hover:opacity-100"
                title="키워드 삭제"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        {loading && <p className="text-sm text-gray-500">불러오는 중...</p>}

        {!loading && keywords.length === 0 && (
          <p className="text-sm text-gray-500">먼저 키워드를 추가해 주세요.</p>
        )}

        {!loading && selectedKeyword && (
          <ArticleList articles={grouped.get(selectedKeyword) ?? []} />
        )}

        {!loading && !selectedKeyword &&
          keywords.map((kw) => (
            <div key={kw.id} className="flex flex-col gap-2">
              <h2 className="text-lg font-medium">{kw.text}</h2>
              <ArticleList articles={grouped.get(kw.text) ?? []} compact />
            </div>
          ))}
      </section>
    </main>
  );
}

function ArticleList({ articles, compact = false }: { articles: Article[]; compact?: boolean }) {
  if (articles.length === 0) {
    return <p className="text-sm text-gray-400">아직 수집된 기사가 없습니다.</p>;
  }

  const list = compact ? articles.slice(0, 5) : articles;

  return (
    <ul className="flex flex-col divide-y divide-gray-100 rounded-md border border-gray-100">
      {list.map((article) => (
        <li key={article.id} className="flex flex-col gap-1 px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE[article.source]}`}
            >
              {SOURCE_LABEL[article.source]}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(article.publishedAt).toLocaleString("ko-KR")}
            </span>
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-gray-900 hover:underline"
          >
            {article.title}
          </a>
          {article.description && (
            <p className="line-clamp-2 text-sm text-gray-500">{article.description}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
