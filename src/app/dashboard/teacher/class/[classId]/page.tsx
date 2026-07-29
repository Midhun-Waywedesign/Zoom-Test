"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { User, ClassDef, LiveSession } from "@/lib/db";
import { Users, Play, Video, Clock, ChevronLeft, Calendar, Check, Copy, AlertCircle, FileText, Trash2 } from "lucide-react";

export default function TutorClassPage() {
  const { classId } = useParams();
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [classData, setClassData] = useState<ClassDef | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  
  const [recordingsData, setRecordingsData] = useState<any[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(true);
  
  const [attendanceDataMap, setAttendanceDataMap] = useState<Record<string, { data: any[], loading: boolean, error?: string, isProcessing?: boolean }>>({});
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  
  const [copiedPasscode, setCopiedPasscode] = useState<string | null>(null);

  const [dateFilter, setDateFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter]);

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
    
    // Fetch initial data
    const fetchClassData = async () => {
      try {
        const [classesRes, sessionsRes, recsRes] = await Promise.all([
          fetch(`/api/data?type=classes&userId=${parsedUser.id}`).then(res => res.json()),
          fetch(`/api/data?type=live-sessions`).then(res => res.json()),
          fetch(`/api/recordings?classId=${classId}`).then(res => res.json())
        ]);
        
        const cls = classesRes.find((c: ClassDef) => c.id === classId);
        if (!cls) {
          router.push('/dashboard/teacher');
          return;
        }
        
        setClassData(cls);
        setLiveSession(sessionsRes.find((s: LiveSession) => s.classId === classId) || null);
        setRecordingsData(Array.isArray(recsRes) ? recsRes : []);
        setLoadingRecordings(false);
      } catch (err) {
        console.error("Failed to fetch class data", err);
      }
    };
    
    fetchClassData();
  }, [classId, router]);

  const handleStartLive = async () => {
    if (!user || !classData) return;
    try {
      const res = await fetch('/api/start-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: classData.name,
          teacherName: user.name,
          classId: classData.id,
          teacherId: user.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to start class");
      window.location.href = `/meeting/${classData.id}?role=1`;
    } catch (err: any) {
      alert("Error starting class:\n\n" + err.message);
    }
  };

  const toggleAttendance = async (meetingNumber: string) => {
    if (expandedSession === meetingNumber) {
      setExpandedSession(null);
      return;
    }
    setExpandedSession(meetingNumber);
    
    // Fetch if not already loaded
    if (!attendanceDataMap[meetingNumber]) {
      setAttendanceDataMap(prev => ({
        ...prev,
        [meetingNumber]: { data: [], loading: true }
      }));
      
      try {
        const res = await fetch(`/api/attendance?classId=${classId}&meetingNumber=${meetingNumber}`);
        const result = await res.json();
        
        setAttendanceDataMap(prev => ({
          ...prev,
          [meetingNumber]: { 
            data: result.attendance || result, 
            loading: false,
            isProcessing: result.isProcessing || false
          }
        }));
      } catch (err) {
        setAttendanceDataMap(prev => ({
          ...prev,
          [meetingNumber]: { data: [], loading: false, error: "Failed to load attendance" }
        }));
      }
    }
  };

  const handleCopyPasscode = (passcode: string) => {
    if (!passcode) return;
    navigator.clipboard.writeText(passcode);
    setCopiedPasscode(passcode);
    setTimeout(() => setCopiedPasscode(null), 2000);
  };

  const handleDeleteRecording = async (recordingId: string, meetingNumber: string) => {
    if (!confirm("Are you sure you want to delete this recording? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/recordings?classId=${classId}&recordingId=${recordingId}&meetingNumber=${meetingNumber}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Failed to delete");
      setRecordingsData(prev => prev.filter(r => r.id !== recordingId));
      
      // If we deleted the last item on this page, go back one page
      const newTotalItems = recordingsData.length - 1;
      const newTotalPages = Math.ceil(newTotalItems / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!user || !classData) {
    return (
      <div className="flex items-center justify-center h-full p-12 text-slate-500 animate-pulse">
        Loading workspace...
      </div>
    );
  }

  const filteredRecordings = recordingsData
    .filter(rec => {
      if (!dateFilter) return true;
      const recDate = new Date(rec.date).toISOString().split('T')[0];
      return recDate === dateFilter;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(filteredRecordings.length / itemsPerPage);
  const paginatedRecordings = filteredRecordings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto flex flex-col gap-8 pb-20">
      
      {/* Top Nav */}
      <button 
        onClick={() => router.push('/dashboard/teacher')}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors w-fit"
      >
        <ChevronLeft className="w-4 h-4" /> Back to My Schedule
      </button>

      {/* Class Header Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-brand-500/5 p-8 sm:p-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="px-3 py-1 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider rounded-lg w-fit">
              Assigned Batch
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {classData.name}
            </h1>
            <div className="flex items-center gap-4 text-sm font-medium text-slate-500 mt-2">
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-slate-400" /> {classData.studentIds.length} Students</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> {classData.pastMeetingNumbers?.length || 0} Total Sessions</span>
            </div>
          </div>
          
          <div className="shrink-0">
            {liveSession ? (
              <button
                className="w-full sm:w-auto px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-3 active:scale-95"
                onClick={() => window.location.href = `/meeting/${classData.id}?role=1`}
              >
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </div>
                Join Live Now
              </button>
            ) : (
              <button
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-3 active:scale-95"
                onClick={handleStartLive}
              >
                <Video className="w-5 h-5" /> Start New Session
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Past Sessions Feed */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-500" /> Past Sessions
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-slate-500">Filter by Date:</label>
            <input 
              type="date" 
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-brand-500 text-slate-700 dark:text-slate-300"
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter('')}
                className="text-xs text-slate-400 hover:text-slate-600 underline font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        
        {loadingRecordings ? (
          <div className="h-40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 font-medium">
            Loading sessions...
          </div>
        ) : filteredRecordings.length === 0 ? (
          <div className="h-40 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-500 font-medium">
            <Video className="w-8 h-8 opacity-40 mb-3" />
            No recordings match this date.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {paginatedRecordings.map((rec, i) => {
              const dateObj = new Date(rec.date);
              const dateStr = dateObj.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
              const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isExpanded = expandedSession === rec.meetingNumber;
              const attData = attendanceDataMap[rec.meetingNumber];
              
              return (
                <div key={rec.id || i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  {/* Session Header */}
                  <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{rec.title}</h3>
                      <p className="text-sm font-medium text-slate-500">
                        {dateStr} at {timeStr}
                      </p>
                      {rec.password && (
                        <div 
                          onClick={() => handleCopyPasscode(rec.password)}
                          className="mt-3 text-[11px] font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 w-fit cursor-pointer flex items-center gap-2 group/pass hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
                          title="Click to copy passcode"
                        >
                          <span className="text-slate-500 font-sans font-semibold">Passcode:</span> 
                          <span className="font-bold tracking-wider">{rec.password}</span>
                          {copiedPasscode === rec.password ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400 group-hover/pass:text-brand-500 transition-colors" />}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button 
                        onClick={() => toggleAttendance(rec.meetingNumber)}
                        className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all border flex items-center gap-2 ${
                          isExpanded 
                            ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <FileText className="w-4 h-4" /> Attendance
                      </button>
                      <button 
                        onClick={() => router.push(`/dashboard/teacher/class/${classId}/recording/${rec.id}`)}
                        className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 flex items-center gap-2 text-sm"
                      >
                        <Play className="w-4 h-4" fill="currentColor" /> Watch
                      </button>
                      <button 
                        onClick={() => handleDeleteRecording(rec.id, rec.meetingNumber)}
                        className="p-2.5 rounded-xl transition-all bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 flex items-center justify-center ml-2"
                        title="Delete Recording"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Attendance Section */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-6">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand-500" /> Session Attendance
                      </h4>
                      
                      {!attData || attData.loading ? (
                        <div className="py-8 text-center text-slate-500 text-sm animate-pulse font-medium">Loading attendance report...</div>
                      ) : attData.error ? (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold">{attData.error}</div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {attData.isProcessing && (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl text-amber-800 dark:text-amber-300 text-sm flex items-start gap-3 shadow-sm">
                              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                              <p><strong>Processing:</strong> Zoom is still generating the official attendance report for this session. The data below may be incomplete. Please check back later.</p>
                            </div>
                          )}
                          
                          {attData.data.length === 0 ? (
                            <div className="py-8 text-center text-slate-500 text-sm font-medium border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                              No attendees recorded for this session.
                            </div>
                          ) : (
                            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                              <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                  <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Student Name</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 hidden sm:table-cell">Join Time</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 hidden sm:table-cell">Leave Time</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-right">Duration</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {attData.data.sort((a, b) => b.joinTime - a.joinTime).map((record, idx) => {
                                    const joinStr = new Date(record.joinTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                    const leaveStr = record.leaveTime ? new Date(record.leaveTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Present';
                                    
                                    const durationMs = record.leaveTime ? (record.leaveTime - record.joinTime) : (Date.now() - record.joinTime);
                                    const durationMins = record.duration !== undefined ? Math.round(record.duration / 60) : Math.round(durationMs / 60000);
                                    
                                    return (
                                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{record.studentName}</td>
                                        <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{joinStr}</td>
                                        <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                                          {record.leaveTime ? leaveStr : <span className="text-brand-500 font-semibold animate-pulse">In Meeting</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
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
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm font-semibold text-slate-500">Page {currentPage} of {totalPages}</span>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
