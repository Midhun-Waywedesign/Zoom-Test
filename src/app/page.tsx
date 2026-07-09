"use client";

import { useState } from "react";
import ZoomMeeting from "@/components/ZoomMeeting";

type ClassSession = {
  meetingNumber: string;
  password: string;
  zak: string;
  signature: string;
  sdkKey: string;
  joinUrl: string;
  topic: string;
  userName: string;
};

export default function Home() {
  const [mode, setMode] = useState<"teacher" | "student">("teacher");

  // Teacher state
  const [topic, setTopic] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [session, setSession] = useState<ClassSession | null>(null);

  // Student state
  const [meetingNumber, setMeetingNumber] = useState("");
  const [password, setPassword] = useState("");
  const [studentName, setStudentName] = useState("");
  const [inMeeting, setInMeeting] = useState(false);

  async function handleStartClass() {
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch("/api/start-class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic || "Online Class",
          teacherName: teacherName || "Teacher",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start class");
      setSession(data);
    } catch (err: any) {
      setStartError(err?.message ?? "Something went wrong");
    } finally {
      setStarting(false);
    }
  }

  // Teacher is live (host)
  if (session) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">{session.topic}</h2>
              <p className="text-sm text-gray-500">
                Meeting ID:{" "}
                <span className="font-mono">{session.meetingNumber}</span>
                {"  ·  "}
                Passcode: <span className="font-mono">{session.password}</span>
              </p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(session.joinUrl)}
              className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
            >
              Copy student join link
            </button>
          </div>

          <ZoomMeeting
            meetingNumber={session.meetingNumber}
            password={session.password}
            userName={session.userName}
            role={1}
            zak={session.zak}
            signature={session.signature}
            sdkKey={session.sdkKey}
            onLeave={() => setSession(null)}
          />
        </div>
      </main>
    );
  }

  // Student is in class
  if (inMeeting) {
    return (
      <ZoomMeeting
        meetingNumber={meetingNumber}
        password={password}
        userName={studentName || "Student"}
        role={0}
        onLeave={() => setInMeeting(false)}
      />
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold">
            🎓
          </div>
          <h1 className="text-xl font-semibold text-blue-600">
            Online Classroom
          </h1>
          <p className="text-sm text-gray-500 text-center">
            Start a live class or join one as a student
          </p>
        </div>

        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setMode("teacher")}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
              mode === "teacher"
                ? "bg-white shadow text-black"
                : "text-gray-500"
            }`}
          >
            I&apos;m a Teacher
          </button>
          <button
            onClick={() => setMode("student")}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
              mode === "student" ? "bg-white shadow" : "text-gray-500"
            }`}
          >
            I&apos;m a Student
          </button>
        </div>

        {mode === "teacher" ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Class Topic</label>
              <input
                className="border rounded px-3 py-2 text-black"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Grade 10 - Algebra Basics"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Your Name</label>
              <input
                className="border rounded px-3 py-2 text-black"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="e.g. Ms. Fernandez"
              />
            </div>

            {startError && <p className="text-sm text-red-600">{startError}</p>}

            <button
              disabled={starting}
              onClick={handleStartClass}
              className="mt-1 bg-blue-600 disabled:bg-gray-300 text-white rounded px-3 py-2.5 font-medium hover:bg-blue-700"
            >
              {starting ? "Starting class..." : "Start Class"}
            </button>

            <p className="text-xs text-gray-400 text-center">
              This creates a new Zoom meeting and starts it instantly as host.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Meeting ID</label>
              <input
                className="border rounded px-3 py-2 text-black"
                value={meetingNumber}
                onChange={(e) => setMeetingNumber(e.target.value.trim())}
                placeholder="e.g. 82123456789"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Passcode</label>
              <input
                className="border rounded px-3 py-2 text-black"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Your Name</label>
              <input
                className="border rounded px-3 py-2 text-black"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Alex"
              />
            </div>

            <button
              disabled={!meetingNumber || !studentName}
              onClick={() => setInMeeting(true)}
              className="mt-1 bg-blue-600 disabled:bg-gray-300 text-white rounded px-3 py-2.5 font-medium hover:bg-blue-700"
            >
              Join Class
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
