"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User, ClassDef, LiveSession, EnrollmentRequest } from "@/lib/db";
import { Users, CheckCircle, XCircle, Play, Video, Clock, Search, BookOpen } from "lucide-react";

export default function StudentDashboard() {
  const [user, setUser] = useState<User | null>(null);
  
  const [myClasses, setMyClasses] = useState<ClassDef[]>([]);
  const [allClasses, setAllClasses] = useState<ClassDef[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [myRequests, setMyRequests] = useState<EnrollmentRequest[]>([]);
  
  const [activeTab, setActiveTab] = useState<'enrolled' | 'browse'>('enrolled');

  const [viewingRecordings, setViewingRecordings] = useState<string | null>(null);
  const [recordingsData, setRecordingsData] = useState<any[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);

  const router = useRouter();

  const fetchData = async (userId: string) => {
    try {
      const [myClassesRes, allClassesRes, sessionsRes, requestsRes] = await Promise.all([
        fetch(`/api/data?type=classes&userId=${userId}`).then(res => res.json()),
        fetch(`/api/classes`).then(res => res.json()),
        fetch(`/api/data?type=live-sessions`).then(res => res.json()),
        fetch(`/api/enroll?studentId=${userId}`).then(res => res.json())
      ]);
      setMyClasses(myClassesRes);
      setAllClasses(allClassesRes);
      setLiveSessions(sessionsRes);
      setMyRequests(requestsRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('academy-user');
    if (!saved) return;
    const parsedUser = JSON.parse(saved);
    setUser(parsedUser);
    fetchData(parsedUser.id);
  }, []);

  const handleJoinLive = (classId: string) => {
    router.push(`/meeting/${classId}?role=0`);
  };

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
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Axis Student Dashboard</h1>
        <p className="text-slate-500 mt-1">Access your language batches and request to join new ones.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'enrolled' 
              ? 'border-brand-500 text-brand-600 dark:text-brand-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('enrolled')}
        >
          <BookOpen className="w-4 h-4" /> My Classes
        </button>
        <button
          className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'browse' 
              ? 'border-brand-500 text-brand-600 dark:text-brand-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('browse')}
        >
          <Search className="w-4 h-4" /> Browse Classes
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'enrolled' && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Language Batches</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {myClasses.map(cls => {
              const liveSession = liveSessions.find(s => s.classId === cls.id);
              return (
                <div key={cls.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col hover:border-brand-500/50 transition-colors">
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{cls.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">Tutor ID: {cls.teacherId}</p>
                      </div>
                      {liveSession && (
                        <span className="px-3 py-1 bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 animate-pulse">
                          <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                          Live Now
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-6">
                      {liveSession ? (
                        <button
                          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-xl border border-brand-600 transition-all text-sm flex items-center justify-center gap-2 shadow-md shadow-brand-500/20"
                          onClick={() => handleJoinLive(cls.id)}
                        >
                          <Video className="w-4 h-4" /> Join Live Class
                        </button>
                      ) : (
                        <div className="w-full bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm flex items-center justify-center gap-2">
                          <Clock className="w-4 h-4" /> Waiting for tutor
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button
                      className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2"
                      onClick={() => handleViewRecordings(cls.id)}
                    >
                      <Play className="w-4 h-4" /> View Past Recordings
                    </button>
                  </div>
                </div>
              );
            })}
            
            {myClasses.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center gap-3">
                <BookOpen className="w-8 h-8 opacity-50" />
                <p>You haven't been approved for any classes yet.</p>
                <button 
                  onClick={() => setActiveTab('browse')}
                  className="mt-2 text-brand-600 font-semibold text-sm hover:underline"
                >
                  Browse available classes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'browse' && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Browse Available Batches</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {allClasses.map(cls => {
              const isEnrolled = myClasses.some(c => c.id === cls.id);
              const request = myRequests.find(r => r.classId === cls.id);
              
              let buttonState = { text: "Request to Join", disabled: false, color: "bg-brand-600 text-white hover:bg-brand-700" };
              
              if (isEnrolled || request?.status === 'approved') {
                buttonState = { text: "Enrolled", disabled: true, color: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" };
              } else if (request?.status === 'pending') {
                buttonState = { text: "Requested", disabled: true, color: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" };
              } else if (request?.status === 'rejected') {
                buttonState = { text: "Rejected", disabled: true, color: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" };
              }

              return (
                <div key={cls.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-lg">
                      {cls.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{cls.name}</h3>
                      <p className="text-xs text-slate-500">Tutor ID: {cls.teacherId}</p>
                    </div>
                  </div>
                  <button
                    disabled={buttonState.disabled}
                    onClick={() => handleRequestJoin(cls.id)}
                    className={`mt-auto w-full py-2.5 rounded-xl font-bold text-sm transition-all ${buttonState.color}`}
                  >
                    {buttonState.text}
                  </button>
                </div>
              );
            })}
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
