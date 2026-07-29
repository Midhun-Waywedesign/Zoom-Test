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
      const sessions = await db.getAllLiveSessions();
      return NextResponse.json(sessions);
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err: any) {
    console.error("Data fetch failed:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
