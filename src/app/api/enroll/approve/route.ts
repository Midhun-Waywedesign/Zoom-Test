import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { requestId } = await req.json();
    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }
    
    await db.approveEnrollment(requestId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
