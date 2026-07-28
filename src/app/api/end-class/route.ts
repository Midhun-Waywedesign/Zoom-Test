import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { classId } = await req.json();

    if (!classId) {
      return NextResponse.json(
        { error: "Missing classId" },
        { status: 400 }
      );
    }

    await db.endLiveSession(classId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("end-class failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to end class" },
      { status: 500 }
    );
  }
}
