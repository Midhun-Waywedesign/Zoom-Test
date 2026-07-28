import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const userId = searchParams.get('userId');

    if (type === 'users') {
      const users = await db.getUsers();
      return NextResponse.json(users);
    }
    
    if (type === 'classes' && userId) {
      const classes = await db.getClassesForUser(userId);
      return NextResponse.json(classes);
    }

    if (type === 'live-sessions') {
      // Just returning all live sessions for now, can be filtered by class IDs if needed
      const data = await import('@/lib/db').then(m => m.db); // re-import to avoid caching issues in some cases
      const allSessions = await (await import('fs/promises')).readFile('data.json', 'utf-8').then(JSON.parse).catch(() => ({ liveSessions: [] }));
      return NextResponse.json(allSessions.liveSessions || []);
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err: any) {
    console.error("Data fetch failed:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
