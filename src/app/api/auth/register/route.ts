import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { name, role } = await req.json();
    if (!name || !role) {
      return NextResponse.json({ error: "Missing name or role" }, { status: 400 });
    }
    
    if (role !== 'teacher' && role !== 'student') {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const user = await db.registerUser(name, role);
    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
