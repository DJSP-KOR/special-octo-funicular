import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const keywords = await prisma.keyword.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(keywords);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const searchQuery =
    typeof body?.searchQuery === "string" && body.searchQuery.trim()
      ? body.searchQuery.trim()
      : undefined;

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const keyword = await prisma.keyword.upsert({
    where: { text },
    create: { text, searchQuery },
    update: searchQuery ? { searchQuery } : {},
  });

  return NextResponse.json(keyword, { status: 201 });
}
