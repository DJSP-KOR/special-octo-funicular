import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerId, withOwnerCookie } from "@/lib/owner";

export async function GET(req: NextRequest) {
  const { ownerId, isNew } = getOwnerId(req);
  const keywords = isNew
    ? []
    : await prisma.keyword.findMany({ where: { ownerId }, orderBy: { createdAt: "asc" } });
  return withOwnerCookie(NextResponse.json(keywords), ownerId, isNew);
}

export async function POST(req: NextRequest) {
  const { ownerId, isNew } = getOwnerId(req);
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const searchQuery =
    typeof body?.searchQuery === "string" && body.searchQuery.trim()
      ? body.searchQuery.trim()
      : undefined;

  if (!text) {
    return withOwnerCookie(
      NextResponse.json({ error: "text is required" }, { status: 400 }),
      ownerId,
      isNew
    );
  }

  const keyword = await prisma.keyword.upsert({
    where: { ownerId_text: { ownerId, text } },
    create: { ownerId, text, searchQuery },
    update: searchQuery ? { searchQuery } : {},
  });

  return withOwnerCookie(NextResponse.json(keyword, { status: 201 }), ownerId, isNew);
}
