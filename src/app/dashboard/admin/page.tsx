"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User, ClassDef, LiveSession, EnrollmentRequest } from "@/lib/db";
import { Users, CheckCircle, XCircle, CloudCog, Video, BookOpen, PlusCircle } from "lucide-react";

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [tutors, setTutors] = useState<User[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRequest[]>([]);
  
  const [activeTab, setActiveTab] = useState<'classes' | 'enrollments' | 'recordings'>('classes');
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassTutor, setNewClassTutor] = useState("");

  const router = useRouter();

  const fetchData = async () => {
    try {
      const [classesRes, sessionsRes, enrollmentsRes, usersRes] = await Promise.all([
        fetch(`/api/classes`).then(res => res.json()),
        fetch(`/api/data?type=live-sessions`).then(res => res.json()),
        fetch(`/api/enroll?status=pending`).then(res => res.json()),
        fetch(`/api/data?type=users`).then(res => res.json())
      ]);
      setClasses(classesRes);
      setLiveSessions(sessionsRes);
      setEnrollments(enrollmentsRes);
      setTutors(usersRes.filter((u: User) => u.role === 'tutor'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('academy-user');
    if (!saved) return;
    const parsedUser = JSON.parse(saved);
    if (parsedUser.role !== 'admin') {
      router.push('/');
      return;
    }
    setUser(parsedUser);
    fetchData();
  }, [router]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassTutor) return;
    try {
      await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClassName, teacherId: newClassTutor })
      });
      setNewClassName("");
      setNewClassTutor("");
      setIsCreatingClass(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (reqId: string) => {
    await fetch('/api/enroll/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: reqId })
    });
    fetchData();
  };

  const handleReject = async (reqId: string) => {
    await fetch('/api/enroll/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: reqId })
    });
    fetchData();
  };

  if (!user) return null;

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Manage batches, approve enrollments, and monitor pipelines.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'classes' 
              ? 'border-brand-500 text-brand-600 dark:text-brand-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('classes')}
        >
          <BookOpen className="w-4 h-4" /> Classes & Batches
        </button>
        <button
          className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'enrollments' 
              ? 'border-brand-500 text-brand-600 dark:text-brand-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('enrollments')}
        >
          Approval Gate
          {enrollments.length > 0 && (
            <span className="bg-brand-500 text-white text-[10px] px-2 py-0.5 rounded-full">{enrollments.length}</span>
          )}
        </button>
        <button
          className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'recordings' 
              ? 'border-brand-500 text-brand-600 dark:text-brand-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('recordings')}
        >
          <CloudCog className="w-4 h-4" /> Cloudflare R2 Pipeline
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'classes' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Classes</h2>
            <button 
              onClick={() => setIsCreatingClass(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              New Class
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {classes.map(cls => {
              const liveSession = liveSessions.find(s => s.classId === cls.id);
              const tutor = tutors.find(t => t.id === cls.teacherId);
              return (
                <div key={cls.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col hover:border-brand-500/50 transition-colors p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{cls.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">Assigned Tutor: {tutor?.name || cls.teacherId}</p>
                    </div>
                    {liveSession && (
                      <span className="px-3 py-1 bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                        Live Now
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-auto text-sm text-slate-500 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {cls.studentIds.length} Enrolled</span>
                    <span className="flex items-center gap-1"><Video className="w-4 h-4" /> {cls.pastMeetingNumbers?.length || 0} Sessions</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'enrollments' && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Approval Gate</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {enrollments.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                <CheckCircle className="w-8 h-8 opacity-50 text-green-500" />
                <p>All clear! No pending student requests.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student ID</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Class</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {enrollments.map(req => {
                    const cls = classes.find(c => c.id === req.classId);
                    return (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-medium text-slate-900 dark:text-white">{req.studentId}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">{cls?.name || req.classId}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">{new Date(req.requestDate).toLocaleDateString()}</td>
                        <td className="p-4 flex justify-end gap-2">
                          <button 
                            onClick={() => handleApprove(req.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleReject(req.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'recordings' && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cloudflare R2 Storage Status</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
             <div className="flex flex-col gap-4">
                {classes.flatMap(c => c.recordings.map(r => ({ ...r, className: c.name }))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((rec, i) => {
                  let statusColor = "bg-amber-100 text-amber-700";
                  if (rec.status === 'uploaded') statusColor = "bg-green-100 text-green-700";
                  if (rec.status === 'failed') statusColor = "bg-red-100 text-red-700";

                  return (
                    <div key={i} className="flex justify-between items-center p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{rec.title}</p>
                        <p className="text-xs text-slate-500">{rec.className} • {new Date(rec.date).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                        {rec.status}
                      </span>
                    </div>
                  )
                })}
             </div>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {isCreatingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Batch</h3>
              <button onClick={() => setIsCreatingClass(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateClass} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Batch Name</label>
                <input 
                  type="text" 
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                  placeholder="e.g. Spanish A1"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Assign Tutor</label>
                <select
                  value={newClassTutor}
                  onChange={e => setNewClassTutor(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                >
                  <option value="">Select a tutor...</option>
                  {tutors.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit"
                disabled={!newClassName.trim() || !newClassTutor}
                className="w-full py-3 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-50 transition-all shadow-md shadow-brand-500/20 mt-2"
              >
                Create Batch
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
