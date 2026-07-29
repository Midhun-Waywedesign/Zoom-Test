import { NextRequest, NextResponse } from "next/server";

import { createInstantMeeting, getHostZak } from "@/lib/zoom-api";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { topic, teacherName, classId, teacherId } = await req.json();

    const sdkKey = process.env.ZOOM_SDK_KEY;
    const sdkSecret = process.env.ZOOM_SDK_SECRET;
    const hostUserId = process.env.ZOOM_HOST_USER_ID;

    if (!sdkKey || !sdkSecret || !hostUserId) {
      return NextResponse.json(
        { error: "Missing Zoom env vars" },
        { status: 500 }
      );
    }

    if (!classId || !teacherId) {
      return NextResponse.json(
        { error: "Missing classId or teacherId" },
        { status: 400 }
      );
    }

    // Check if session already exists
    const existing = await db.getLiveSession(classId);
    if (existing) {
      return NextResponse.json({ ...existing, sdkKey });
    }

    const meeting = await createInstantMeeting(topic || "Online Class", hostUserId);
    const zak = await getHostZak(hostUserId);

    const sessionData = {
      classId,
      meetingNumber: String(meeting.id),
      password: meeting.password,
      zak,
      joinUrl: meeting.join_url,
      startTime: Date.now()
    };

    await db.startLiveSession(sessionData);

    return NextResponse.json({ ...sessionData, sdkKey });
  } catch (err: any) {
    console.error("start-class failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to start class" },
      { status: 500 }
    );
  }
}