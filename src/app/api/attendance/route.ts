import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { action, classId, meetingNumber, studentId, studentName } = await req.json();

    if (action === 'join') {
      await db.markAttendanceJoin(classId, meetingNumber, studentId, studentName);
    } else if (action === 'leave') {
      await db.markAttendanceLeave(classId, meetingNumber, studentId);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("attendance API failed:", err);
    return NextResponse.json({ error: "Failed to mark attendance" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');

    if (!classId) return NextResponse.json({ error: "Missing classId" }, { status: 400 });

    const attendance = await db.getAttendanceForClass(classId);
    return NextResponse.json(attendance);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}
