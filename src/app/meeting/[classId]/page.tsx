"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ZoomMeeting from "@/components/ZoomMeeting";
import type { User, LiveSession, ClassDef } from "@/lib/db";

export default function MeetingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const classId = params.classId as string;
  const role = Number(searchParams.get('role')) || 0; // 1 for host, 0 for student

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [classInfo, setClassInfo] = useState<ClassDef | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem('academy-user');
    if (!saved) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(saved);
    setUser(parsedUser);

    // Fetch class & session data
    Promise.all([
      fetch(`/api/data?type=classes&userId=${parsedUser.id}&t=${Date.now()}`).then(res => res.json()),
      fetch(`/api/data?type=live-sessions&t=${Date.now()}`).then(res => res.json())
    ]).then(([classes, sessions]) => {
      const cls = classes.find((c: ClassDef) => c.id === classId);
      if (!cls) {
        alert("Class not found or unauthorized");
        router.push('/');
        return;
      }
      setClassInfo(cls);

      const live = sessions.find((s: LiveSession) => s.classId === classId);
      if (!live) {
        if (role === 1) {
          // Vercel Blob is still propagating the new meeting, retry in 1 second
          setTimeout(() => {
            window.location.reload();
          }, 1500);
          return;
        }
        const dashPath = parsedUser.role === 'tutor' ? 'teacher' : parsedUser.role;
        router.push(`/dashboard/${dashPath}`);
        return;
      }
      setSession(live);
      setLoading(false);
    });
  }, [classId, router]);

  const handleJoin = async () => {
    if (role === 0 && user && session) {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          classId: session.classId,
          meetingNumber: session.meetingNumber,
          studentId: user.id,
          studentName: user.name
        })
      });
    }
  };

  const handleLeave = async () => {
    if (role === 1) {
      // Teacher left - end the class
      await fetch('/api/end-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId })
      });
      window.location.href = '/dashboard/teacher';
    } else {
      // Student left - mark leave
      if (user && session) {
        await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'leave',
            classId: session.classId,
            meetingNumber: session.meetingNumber,
            studentId: user.id
          })
        });
      }
      window.location.href = '/dashboard/student';
    }
  };

  if (loading || !session || !user) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading meeting details...</div>;

  return (
    <div className="w-full h-screen bg-black">
      <ZoomMeeting
        meetingNumber={session.meetingNumber}
        password={session.password}
        userName={user.name}
        role={role}
        zak={role === 1 ? session.zak : undefined}
        onJoin={handleJoin}
        onLeave={handleLeave}
      />
    </div>
  );
}
