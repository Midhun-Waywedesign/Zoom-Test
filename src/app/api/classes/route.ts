import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const classes = await db.getAllClasses();
    return NextResponse.json(classes);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, teacherId } = await req.json();
    if (!name || !teacherId) {
      return NextResponse.json({ error: "Missing name or teacherId" }, { status: 400 });
    }
    
    const newClass = await db.createClass(name, teacherId);
    return NextResponse.json(newClass);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
