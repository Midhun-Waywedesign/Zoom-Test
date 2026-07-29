"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User, ClassDef, LiveSession, EnrollmentRequest } from "@/lib/db";
import { Users, CheckCircle, XCircle, Play, Video, Clock, BookOpen, Copy, Check, Calendar, Lock } from "lucide-react";

export default function StudentDashboard() {
  const [user, setUser] = useState<User | null>(null);
  
  const [myClass, setMyClass] = useState<ClassDef | null>(null);
  const [allClasses, setAllClasses] = useState<ClassDef[]>([]);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [myRequest, setMyRequest] = useState<EnrollmentRequest | null>(null);
  
  const [recordingsData, setRecordingsData] = useState<any[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [copiedPasscode, setCopiedPasscode] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const router = useRouter();

  const fetchData = async (userId: string) => {
    try {
      const [myClassesRes, allClassesRes, sessionsRes, requestsRes] = await Promise.all([
        fetch(`/api/data?type=classes&userId=${userId}&t=${Date.now()}`).then(res => res.json()),
        fetch(`/api/classes?t=${Date.now()}`).then(res => res.json()),
        fetch(`/api/data?type=live-sessions&t=${Date.now()}`).then(res => res.json()),
        fetch(`/api/enroll?studentId=${userId}&t=${Date.now()}`).then(res => res.json())
      ]);
      
      const enrolledClass = myClassesRes.length > 0 ? myClassesRes[0] : null;
      setMyClass(enrolledClass);
      setAllClasses(allClassesRes);
      setLiveSession(enrolledClass ? (sessionsRes.find((s: LiveSession) => s.classId === enrolledClass.id) || null) : null);
      
      // Find the most relevant request (pending or rejected). If approved, it doesn't matter because they have myClass.
      const pendingReq = requestsRes.find((r: EnrollmentRequest) => r.status === 'pending');
      const rejectedReq = requestsRes.find((r: EnrollmentRequest) => r.status === 'rejected');
      setMyRequest(pendingReq || rejectedReq || null);

      if (enrolledClass) {
        setLoadingRecordings(true);
        fetch(`/api/recordings?classId=${enrolledClass.id}`)
          .then(res => res.json())
          .then(data => setRecordingsData(Array.isArray(data) ? data : []))
          .finally(() => setLoadingRecordings(false));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('academy-user');
    if (!saved) return;
    const parsedUser = JSON.parse(saved);
    setUser(parsedUser);
    fetchData(parsedUser.id);
  }, []);

  const handleRequestJoin = async (classId: string) => {
    if (!user) return;
    try {
      await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: user.id, classId })
      });
      fetchData(user.id);
    } catch (err: any) {
      alert("Error requesting join");
    }
  };

  const handleCopyPasscode = (passcode: string) => {
    if (!passcode) return;
    navigator.clipboard.writeText(passcode);
    setCopiedPasscode(passcode);
    setTimeout(() => setCopiedPasscode(null), 2000);
  };

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-full p-12 text-slate-500 animate-pulse">
        Loading workspace...
      </div>
    );
  }

  // --- VIEW 1: ENROLLMENT HUB (Not enrolled yet) ---
  if (!myClass) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto flex flex-col gap-8 pb-20">
        <div className="text-center max-w-2xl mx-auto mt-8 mb-4">
          <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">Join a Language Batch</h1>
          <p className="text-slate-500 text-lg">You are currently not enrolled in any class. Please select a batch below to request access.</p>
        </div>

        {myRequest && myRequest.status === 'pending' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-4 text-amber-800 dark:text-amber-300">
              <Clock className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-bold text-lg">Enrollment Request Pending</h3>
                <p className="text-sm opacity-80">An admin is reviewing your request. Please check back later.</p>
              </div>
            </div>
          </div>
        )}

        {myRequest && myRequest.status === 'rejected' && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-4 text-red-800 dark:text-red-300">
              <XCircle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-bold text-lg">Request Declined</h3>
                <p className="text-sm opacity-80">Your previous request was declined. You can select another batch below.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {allClasses.map(cls => {
            const isRequested = myRequest?.classId === cls.id && myRequest?.status === 'pending';
            
            return (
              <div key={cls.id} className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 p-8 flex flex-col gap-6 hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-black text-xl shadow-inner">
                    {cls.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{cls.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Tutor ID: {cls.teacherId}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <Users className="w-4 h-4" /> {cls.studentIds.length} Enrolled Students
                </div>

                <button
                  disabled={isRequested || (!!myRequest && myRequest.status === 'pending')}
                  onClick={() => handleRequestJoin(cls.id)}
                  className={`mt-auto w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                    isRequested 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-brand-500/25'
                  }`}
                >
                  {isRequested ? <><Clock className="w-4 h-4" /> Requested</> : 'Request Access'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- VIEW 2: CLASS PORTAL (Enrolled) ---
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto flex flex-col gap-8 pb-20">
      
      {/* Class Header Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-brand-500/5 p-8 sm:p-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="px-3 py-1 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold uppercase tracking-wider rounded-lg w-fit flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Active Enrollment
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {myClass.name}
            </h1>
            <div className="flex items-center gap-4 text-sm font-medium text-slate-500 mt-2">
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-slate-400" /> {myClass.studentIds.length} Students</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> {myClass.pastMeetingNumbers?.length || 0} Total Sessions</span>
            </div>
          </div>
          
          <div className="shrink-0 w-full sm:w-auto">
            {liveSession ? (
              <button
                className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-3 active:scale-95"
                onClick={() => window.location.href = `/meeting/${myClass.id}?role=0`}
              >
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </div>
                Join Live Class
              </button>
            ) : (
              <div className="w-full sm:w-auto px-8 py-4 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-3">
                <Lock className="w-5 h-5 opacity-50" /> Waiting for Tutor
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Past Sessions / Recordings Feed */}
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Play className="w-5 h-5 text-brand-500" /> Session Recordings
        </h2>
        
        {loadingRecordings ? (
          <div className="h-40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 font-medium animate-pulse">
            Loading your recordings...
          </div>
        ) : recordingsData.length === 0 ? (
          <div className="h-40 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-500 font-medium">
            <Video className="w-8 h-8 opacity-40 mb-3" />
            No past sessions recorded yet.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {recordingsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((rec, i) => {
              const dateObj = new Date(rec.date);
              const dateStr = dateObj.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
              const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              return (
                <div key={rec.id || i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md">
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
                  <div className="shrink-0 mt-4 sm:mt-0">
                    <a 
                      href={rec.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="w-full sm:w-auto px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm"
                    >
                      <Play className="w-4 h-4" fill="currentColor" /> Watch Video
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
