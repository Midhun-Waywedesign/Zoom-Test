"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User, ClassDef, LiveSession } from "@/lib/db";
import { Users, Play, Video, Clock, XCircle } from "lucide-react";

export default function TutorDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  
  const [viewingAttendance, setViewingAttendance] = useState<string | null>(null);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  
  const [viewingRecordings, setViewingRecordings] = useState<string | null>(null);
  const [recordingsData, setRecordingsData] = useState<any[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  
  const router = useRouter();

  const fetchData = async (userId: string) => {
    try {
      const [classesRes, sessionsRes] = await Promise.all([
        fetch(`/api/data?type=classes&userId=${userId}`).then(res => res.json()),
        fetch(`/api/data?type=live-sessions`).then(res => res.json())
      ]);
      setClasses(classesRes);
      setLiveSessions(sessionsRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('academy-user');
    if (!saved) return;
    const parsedUser = JSON.parse(saved);
    if (parsedUser.role !== 'tutor') {
      router.push('/');
      return;
    }
    setUser(parsedUser);
    fetchData(parsedUser.id);
  }, [router]);

  const handleStartLive = async (cls: ClassDef) => {
    if (!user) return;
    try {
      const res = await fetch('/api/start-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: cls.name,
          teacherName: user.name,
          classId: cls.id,
          teacherId: user.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to start class");
      router.push(`/meeting/${cls.id}?role=1`);
    } catch (err: any) {
      alert("Error starting class:\n\n" + err.message);
    }
  };

  const handleViewAttendance = async (classId: string) => {
    setViewingAttendance(classId);
    setLoadingAttendance(true);
    try {
      const res = await fetch(`/api/attendance?classId=${classId}`);
      const data = await res.json();
      setAttendanceData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleViewRecordings = async (classId: string) => {
    setViewingRecordings(classId);
    setLoadingRecordings(true);
    try {
      const res = await fetch(`/api/recordings?classId=${classId}`);
      const data = await res.json();
      setRecordingsData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingRecordings(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tutor Schedule</h1>
        <p className="text-slate-500 mt-1">Manage your assigned batches and launch live sessions.</p>
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Assigned Batches</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {classes.map(cls => {
            const liveSession = liveSessions.find(s => s.classId === cls.id);
            return (
              <div key={cls.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col hover:border-brand-500/50 transition-colors">
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{cls.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {cls.studentIds.length} Enrolled</span>
                        <span className="flex items-center gap-1"><Video className="w-4 h-4" /> {cls.pastMeetingNumbers?.length || 0} Sessions</span>
                      </div>
                    </div>
                    {liveSession && (
                      <span className="px-3 py-1 bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                        Live Now
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-auto pt-6 flex gap-3">
                    {liveSession ? (
                      <button
                        className="flex-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold py-2.5 rounded-xl border border-red-200 dark:border-red-500/20 text-sm flex items-center justify-center gap-2"
                        onClick={() => router.push(`/meeting/${cls.id}?role=1`)}
                      >
                        <Video className="w-4 h-4" /> Join Live
                      </button>
                    ) : (
                      <button
                        className="flex-1 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 font-bold py-2.5 rounded-xl border border-brand-200 dark:border-brand-500/20 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-all text-sm flex items-center justify-center gap-2"
                        onClick={() => handleStartLive(cls)}
                      >
                        <Video className="w-4 h-4" /> Start Class
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between">
                  <button
                    className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2"
                    onClick={() => handleViewAttendance(cls.id)}
                  >
                    <Clock className="w-4 h-4" /> Attendance
                  </button>
                  <button
                    className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2"
                    onClick={() => handleViewRecordings(cls.id)}
                  >
                    <Play className="w-4 h-4" /> Recordings
                  </button>
                </div>
              </div>
            );
          })}
          
          {classes.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center gap-3">
              <p>You haven't been assigned any batches yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Attendance Modal */}
      {viewingAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-500" /> Attendance Report
              </h3>
              <button onClick={() => setViewingAttendance(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {loadingAttendance ? (
                <div className="py-12 text-center text-slate-500 animate-pulse">Loading local attendance data...</div>
              ) : attendanceData.length === 0 ? (
                <div className="py-12 text-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No attendance records found for this class.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {attendanceData.sort((a, b) => b.joinTime - a.joinTime).map((record, i) => {
                    const joinStr = new Date(record.joinTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const leaveStr = record.leaveTime ? new Date(record.leaveTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Present';
                    const dateStr = new Date(record.joinTime).toLocaleDateString();
                    const durationMs = record.leaveTime ? (record.leaveTime - record.joinTime) : (Date.now() - record.joinTime);
                    const durationMins = Math.round(durationMs / 60000);
                    
                    return (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white">{record.studentName}</span>
                          <span className="text-xs text-slate-500">{dateStr}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex flex-col items-end">
                            <span className="text-green-600 font-medium">Joined: {joinStr}</span>
                            <span className={record.leaveTime ? "text-red-500 font-medium" : "text-brand-600 font-medium animate-pulse"}>
                              {record.leaveTime ? `Left: ${leaveStr}` : 'Still in meeting'}
                            </span>
                          </div>
                          <div className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-lg text-xs font-bold min-w-[60px] text-center text-slate-700 dark:text-slate-300">
                            {durationMins} min
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recordings Modal */}
      {viewingRecordings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-brand-500" /> Class Recordings
              </h3>
              <button onClick={() => setViewingRecordings(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {loadingRecordings ? (
                <div className="py-12 text-center text-slate-500 animate-pulse">Fetching recordings...</div>
              ) : recordingsData.length === 0 ? (
                <div className="py-12 text-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No recordings found for this class.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {recordingsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((rec, i) => {
                    const dateStr = new Date(rec.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                    const sourceLabel = rec.source === 'zoom' ? 'Official Zoom Cloud' : 'Local Dummy Demo';
                    return (
                      <div key={rec.id || i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 hover:border-brand-300 transition-colors">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white">{rec.title}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">{dateStr}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 tracking-wider">
                              {sourceLabel}
                            </span>
                          </div>
                        </div>
                        <a 
                          href={rec.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" /> Watch
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
