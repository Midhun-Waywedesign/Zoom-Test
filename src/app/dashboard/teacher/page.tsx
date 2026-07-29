"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User, ClassDef, LiveSession } from "@/lib/db";
import { Users, Video } from "lucide-react";

export default function TutorDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  
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

  if (!user) return null;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto flex flex-col gap-8">
      
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
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <button
                    className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors flex items-center gap-1.5"
                    onClick={() => router.push(`/dashboard/teacher/class/${cls.id}`)}
                  >
                    Enter Class Portal &rarr;
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
    </div>
  );
}
