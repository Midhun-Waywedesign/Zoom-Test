import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const { meetingNumber, role } = await req.json();

    const sdkKey = process.env.ZOOM_SDK_KEY;
    const sdkSecret = process.env.ZOOM_SDK_SECRET;

    if (!sdkKey || !sdkSecret) {
      return NextResponse.json(
        { error: "Missing ZOOM_SDK_KEY / ZOOM_SDK_SECRET env vars" },
        { status: 500 }
      );
    }

    if (!meetingNumber) {
      return NextResponse.json(
        { error: "meetingNumber is required" },
        { status: 400 }
      );
    }

    const iat = Math.round(Date.now() / 1000) - 30;
    const exp = iat + 60 * 60 * 2; // 2 hours

    const payload = {
      appKey: sdkKey,
      sdkKey: sdkKey,
      mn: Number(meetingNumber),
      role: Number(role ?? 0), // 0 = attendee, 1 = host
      iat,
      exp,
      tokenExp: exp,
    };

    const signature = jwt.sign(payload, sdkSecret, { algorithm: "HS256" });

    return NextResponse.json({ signature, sdkKey });
  } catch (err) {
    console.error("Signature generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate signature" },
      { status: 500 }
    );
  }
}