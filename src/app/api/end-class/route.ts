import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { endZoomMeeting } from "@/lib/zoom-api";

export async function POST(req: NextRequest) {
  try {
    const { classId } = await req.json();

    if (!classId) {
      return NextResponse.json(
        { error: "Missing classId" },
        { status: 400 }
      );
    }

    const session = await db.getLiveSession(classId);
    if (session) {
      await endZoomMeeting(session.meetingNumber);
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
