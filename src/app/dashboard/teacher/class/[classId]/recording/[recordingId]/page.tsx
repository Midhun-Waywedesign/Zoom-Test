"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Play, ChevronLeft, Calendar, Copy, Check, Users, Clock, AlertCircle } from "lucide-react";
import type { User } from "@/lib/db";

export default function TeacherRecordingViewer() {
  const params = useParams();
  const classId = params.classId as string;
  const recordingId = params.recordingId as string;
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [recording, setRecording] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [isProcessingAttendance, setIsProcessingAttendance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedPasscode, setCopiedPasscode] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('academy-user');
    if (!saved) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(saved);
    if (parsedUser.role !== 'tutor') {
      router.push('/');
      return;
    }
    setUser(parsedUser);
    
    const fetchData = async () => {
      try {
        const recsRes = await fetch(`/api/recordings?classId=${classId}`);
        const recs = await recsRes.json();
        
        const rec = recs.find((r: any) => r.id === recordingId);
        if (!rec) {
          alert("Recording not found");
          router.push(`/dashboard/teacher/class/${classId}`);
          return;
        }
        setRecording(rec);

        // Fetch attendance for this specific meeting
        if (rec.meetingNumber) {
          const attRes = await fetch(`/api/attendance?classId=${classId}&meetingNumber=${rec.meetingNumber}`);
          const attData = await attRes.json();
          setAttendance(attData.attendance || attData);
          setIsProcessingAttendance(attData.isProcessing || false);
        }
        
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchData();
  }, [classId, recordingId, router]);

  const handleWatch = () => {
    if (recording?.password) {
      navigator.clipboard.writeText(recording.password);
      setCopiedPasscode(true);
      setTimeout(() => setCopiedPasscode(false), 3000);
    }
    
    // Open Zoom Video Player in a clean popup window hovering over the app
    const width = Math.min(1200, window.screen.width * 0.9);
    const height = Math.min(800, window.screen.height * 0.9);
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    window.open(
      recording.url,
      'ZoomVideoPlayer',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );
  };

  if (loading || !recording) {
    return (
      <div className="flex items-center justify-center h-full p-12 text-slate-500 animate-pulse">
        Loading recording details...
      </div>
    );
  }

  const dateObj = new Date(recording.date);
  const dateStr = dateObj.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto flex flex-col gap-8 pb-20">
      
      <button 
        onClick={() => router.push(`/dashboard/teacher/class/${classId}`)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors w-fit"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Class Portal
      </button>

      {/* Main Video Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Cover Graphic */}
        <div className="h-48 sm:h-64 bg-slate-900 relative overflow-hidden flex flex-col items-center justify-center border-b border-slate-800">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 to-purple-600/20 mix-blend-overlay"></div>
          <Play className="w-16 h-16 text-white/50 mb-4" />
          <p className="text-white/70 font-semibold tracking-widest uppercase text-sm">Cloud Recording</p>
        </div>

        <div className="p-8 sm:p-10 flex flex-col gap-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
              {recording.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-500 font-medium">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {dateStr}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {timeStr}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Access Passcode</label>
              {recording.password ? (
                <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white tracking-widest">
                  {recording.password}
                </div>
              ) : (
                <div className="text-lg font-medium text-slate-500 italic">No passcode required</div>
              )}
            </div>
            
            <div className="sm:w-1/2 flex items-center">
              <button 
                onClick={handleWatch}
                className="w-full py-4 px-6 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-3 active:scale-95"
              >
                {copiedPasscode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copiedPasscode ? "Passcode Copied!" : "Copy Passcode & Watch Zoom Video"}
              </button>
            </div>
          </div>
          
          <p className="text-sm text-slate-500 text-center">
            Clicking the button above will securely copy the passcode to your clipboard and open the Zoom player in a floating window.
          </p>
        </div>
      </div>

      {/* Attendance Stats */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 sm:p-10">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-brand-500" /> Session Attendance
        </h2>
        
        {isProcessingAttendance && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl text-amber-800 dark:text-amber-300 text-sm flex items-start gap-3 shadow-sm mb-6">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
            <p><strong>Processing:</strong> Zoom is still generating the official attendance report for this session. The data below may be incomplete. Please check back later.</p>
          </div>
        )}

        {attendance.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-medium border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center gap-3">
            <Users className="w-8 h-8 opacity-40" />
            No attendees recorded for this session.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-xs">Student Name</th>
                  <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-xs hidden sm:table-cell">Join Time</th>
                  <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-xs hidden sm:table-cell">Leave Time</th>
                  <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-xs text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                {attendance.sort((a, b) => b.joinTime - a.joinTime).map((record, idx) => {
                  const joinStr = new Date(record.joinTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                  const leaveStr = record.leaveTime ? new Date(record.leaveTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Present';
                  
                  const durationMs = record.leaveTime ? (record.leaveTime - record.joinTime) : (Date.now() - record.joinTime);
                  const durationMins = record.duration !== undefined ? Math.round(record.duration / 60) : Math.round(durationMs / 60000);
                  
                  return (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{record.studentName}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium hidden sm:table-cell">{joinStr}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium hidden sm:table-cell">{leaveStr}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                          {durationMins} min
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
