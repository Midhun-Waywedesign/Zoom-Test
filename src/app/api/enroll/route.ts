import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId') || undefined;
    const studentId = searchParams.get('studentId') || undefined;
    const status = searchParams.get('status') || undefined;

    const requests = await db.getEnrollmentRequests({ classId, studentId, status });
    return NextResponse.json(requests);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { studentId, classId } = await req.json();
    if (!studentId || !classId) {
      return NextResponse.json({ error: "Missing studentId or classId" }, { status: 400 });
    }
    
    const request = await db.requestEnrollment(studentId, classId);
    return NextResponse.json(request);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
