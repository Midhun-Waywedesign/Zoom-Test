import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMeetingRecordings } from "@/lib/zoom-api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');

    if (!classId) return NextResponse.json({ error: "Missing classId" }, { status: 400 });

    const cls = await db.getClass(classId);
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const recordingsResult = [];

    if (cls.pastMeetingNumbers && cls.pastMeetingNumbers.length > 0) {
      for (let i = 0; i < cls.pastMeetingNumbers.length; i++) {
        const meetingNumber = cls.pastMeetingNumbers[i];
        let addedZoom = false;
        
        try {
          const report = await getMeetingRecordings(meetingNumber);
          if (report && report.recording_files) {
            const videoFile = report.recording_files.find((f: any) => f.file_type === 'MP4');
            if (videoFile) {
              recordingsResult.push({
                id: videoFile.id,
                title: report.topic || `Class Recording - ${new Date(videoFile.recording_start).toLocaleDateString()}`,
                url: videoFile.play_url,
                date: videoFile.recording_start,
                source: 'zoom',
                password: report.password,
                meetingNumber: meetingNumber
              });
              addedZoom = true;
            }
          }
        } catch (err: any) {
          console.error(`Zoom recording not ready for ${meetingNumber}:`, err.message);
          // Don't break, just fall back to local dummy for this specific meeting
        }

        // If zoom failed for this meeting, fallback to dummy
        if (!addedZoom && cls.recordings && cls.recordings[i]) {
          recordingsResult.push({
            ...cls.recordings[i],
            source: 'local',
            meetingNumber: meetingNumber
          });
        }
      }
    } else if (cls.recordings && cls.recordings.length > 0) {
      // Legacy fallback
      cls.recordings.forEach((r) => {
        recordingsResult.push({
          ...r,
          source: 'local',
          meetingNumber: 'unknown'
        });
      });
    }

    return NextResponse.json(recordingsResult);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch recordings" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const recordingId = searchParams.get('recordingId');
    const meetingNumber = searchParams.get('meetingNumber');

    if (!classId || !recordingId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    await db.deleteRecording(classId, recordingId, meetingNumber || undefined);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete recording" }, { status: 500 });
  }
}
