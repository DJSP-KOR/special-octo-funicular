import { NextRequest, NextResponse } from "next/server";
import { syncNews } from "@/lib/sync";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured (local dev)
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

// Manual trigger from the dashboard's "업데이트" button. No auth required —
// it's a same-site action anyone visiting the page can already take.
export async function POST() {
  try {
    const result = await syncNews();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "sync failed" },
      { status: 500 }
    );
  }
}

// Vercel Cron calls this via GET with an auto-attached CRON_SECRET header.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncNews();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "sync failed" },
      { status: 500 }
    );
  }
}
