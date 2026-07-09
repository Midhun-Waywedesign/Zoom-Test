import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createInstantMeeting, getHostZak } from "@/lib/zoom-api";

export async function POST(req: NextRequest) {
  try {
    const { topic, teacherName } = await req.json();

    const sdkKey = process.env.ZOOM_SDK_KEY;
    const sdkSecret = process.env.ZOOM_SDK_SECRET;
    const hostUserId = process.env.ZOOM_HOST_USER_ID;

    if (!sdkKey || !sdkSecret) {
      return NextResponse.json(
        { error: "Missing ZOOM_SDK_KEY / ZOOM_SDK_SECRET env vars" },
        { status: 500 }
      );
    }
    if (!hostUserId) {
      return NextResponse.json(
        { error: "Missing ZOOM_HOST_USER_ID env var" },
        { status: 500 }
      );
    }

    const meeting = await createInstantMeeting(topic || "Online Class", hostUserId);
    const zak = await getHostZak(hostUserId);

    const iat = Math.round(Date.now() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;

    const signature = jwt.sign(
      {
        appKey: sdkKey,
        sdkKey,
        mn: meeting.id,
        role: 1, // host
        iat,
        exp,
        tokenExp: exp,
      },
      sdkSecret,
      { algorithm: "HS256" }
    );

    return NextResponse.json({
      sdkKey,
      signature,
      zak,
      meetingNumber: String(meeting.id),
      password: meeting.password,
      joinUrl: meeting.join_url,
      topic: meeting.topic,
      userName: teacherName || "Teacher",
    });
  } catch (err: any) {
    console.error("start-class failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to start class" },
      { status: 500 }
    );
  }
}