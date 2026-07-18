import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STATEMENTS = [
  `CREATE SCHEMA IF NOT EXISTS "public"`,
  `CREATE TYPE "Source" AS ENUM ('NAVER', 'REUTERS')`,
  `CREATE TABLE IF NOT EXISTS "Keyword" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "Article" (
    "id" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "_ArticleToKeyword" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ArticleToKeyword_AB_pkey" PRIMARY KEY ("A", "B")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Keyword_text_key" ON "Keyword"("text")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Article_url_key" ON "Article"("url")`,
  `CREATE INDEX IF NOT EXISTS "Article_publishedAt_idx" ON "Article"("publishedAt")`,
  `CREATE INDEX IF NOT EXISTS "_ArticleToKeyword_B_index" ON "_ArticleToKeyword"("B")`,
  `ALTER TABLE "_ArticleToKeyword" ADD CONSTRAINT "_ArticleToKeyword_A_fkey" FOREIGN KEY ("A") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "_ArticleToKeyword" ADD CONSTRAINT "_ArticleToKeyword_B_fkey" FOREIGN KEY ("B") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
];

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: { statement: string; ok: boolean; error?: string }[] = [];

  for (const statement of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(statement);
      results.push({ statement: statement.slice(0, 40), ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const alreadyExists = /already exists/i.test(message);
      results.push({ statement: statement.slice(0, 40), ok: alreadyExists, error: alreadyExists ? undefined : message });
      if (!alreadyExists) {
        return NextResponse.json({ error: message, results }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
