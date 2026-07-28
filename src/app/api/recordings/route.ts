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
    let zoomFailed = false;

    // Try to fetch official recordings from Zoom
    if (cls.pastMeetingNumbers && cls.pastMeetingNumbers.length > 0) {
      for (const meetingNumber of cls.pastMeetingNumbers) {
        try {
          const report = await getMeetingRecordings(meetingNumber);
          if (report && report.recording_files) {
            // Zoom returns multiple files (audio, video, etc.). We find the MP4/video one.
            const videoFile = report.recording_files.find((f: any) => f.file_type === 'MP4');
            if (videoFile) {
              recordingsResult.push({
                id: videoFile.id,
                title: report.topic || `Class Recording - ${new Date(videoFile.recording_start).toLocaleDateString()}`,
                url: videoFile.play_url,
                date: videoFile.recording_start,
                source: 'zoom'
              });
            }
          }
        } catch (err: any) {
          console.error(`Failed to fetch recordings for meeting ${meetingNumber}:`, err.message);
          zoomFailed = true;
          // If we hit a 400/401 because it's a free account or missing scopes, we break early to trigger fallback
          break;
        }
      }
    }

    // FALLBACK: If Zoom failed (e.g. free account), or if there are no Zoom recordings,
    // we return the dummy local recordings stored in data.json.
    if (zoomFailed || recordingsResult.length === 0) {
      const fallbackRecordings = (cls.recordings || []).map(r => ({
        ...r,
        source: 'local'
      }));
      return NextResponse.json(fallbackRecordings);
    }

    return NextResponse.json(recordingsResult);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch recordings" }, { status: 500 });
  }
}
