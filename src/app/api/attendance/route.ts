import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMeetingParticipantsReport } from "@/lib/zoom-api";

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
    const meetingNumberFilter = searchParams.get('meetingNumber');

    if (!classId) return NextResponse.json({ error: "Missing classId" }, { status: 400 });

    const cls = await db.getClass(classId);
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    let localAttendance = await db.getAttendanceForClass(classId);
    if (meetingNumberFilter) {
      localAttendance = localAttendance.filter(a => a.meetingNumber === meetingNumberFilter);
    }
    
    let zoomAttendance: any[] = [];
    let isProcessing = false;

    const targetMeetings = meetingNumberFilter ? [meetingNumberFilter] : (cls.pastMeetingNumbers || []);

    if (targetMeetings.length > 0) {
      for (const meetingNumber of targetMeetings) {
        try {
          const report = await getMeetingParticipantsReport(meetingNumber);
          if (report && report.participants) {
            report.participants.forEach((p: any) => {
              zoomAttendance.push({
                classId,
                meetingNumber,
                studentId: p.user_email || p.id || 'unknown',
                studentName: p.name,
                joinTime: new Date(p.join_time).getTime(),
                leaveTime: p.leave_time ? new Date(p.leave_time).getTime() : null,
                duration: p.duration // in seconds
              });
            });
          }
        } catch (err: any) {
          console.error(`Failed to fetch report for meeting ${meetingNumber}:`, err.message);
          isProcessing = true; // Flag that at least one meeting report is still processing
        }
      }
    }

    // We'll prefer Zoom's official attendance. If Zoom's attendance is empty but we have local, we use local as fallback.
    return NextResponse.json({
      attendance: zoomAttendance.length > 0 ? zoomAttendance : localAttendance,
      isProcessing
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}
