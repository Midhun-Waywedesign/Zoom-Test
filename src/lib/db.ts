import fs from 'fs/promises';
import path from 'path';

export type User = {
  id: string;
  name: string;
  role: 'admin' | 'tutor' | 'student';
};

export type ClassDef = {
  id: string;
  name: string;
  teacherId: string;
  studentIds: string[];
  recordings: { id: string; title: string; url: string; date: string; status: 'pending' | 'uploaded' | 'failed'; password?: string }[];
  pastMeetingNumbers?: string[];
};

export type LiveSession = {
  classId: string;
  meetingNumber: string;
  password: string;
  zak: string;
  joinUrl: string;
  startTime: number;
};

export type AttendanceRecord = {
  classId: string;
  meetingNumber: string;
  studentId: string;
  studentName: string;
  joinTime: number;
  leaveTime: number | null;
};



export type EnrollmentRequest = {
  id: string;
  studentId: string;
  classId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: number;
};

export type DbSchema = {
  users: User[];
  classes: ClassDef[];
  liveSessions: LiveSession[];
  attendance: AttendanceRecord[];
  enrollmentRequests: EnrollmentRequest[];
};

const DB_PATH = path.join(process.cwd(), 'data.json');

const INITIAL_DATA: DbSchema = {
  users: [
    { id: 'a1', name: 'Admin Portal', role: 'admin' },
    { id: 't1', name: 'Maria Garcia', role: 'tutor' },
    { id: 't2', name: 'David Smith', role: 'tutor' },
    { id: 's1', name: 'Emma Johnson', role: 'student' },
    { id: 's2', name: 'Liam Brown', role: 'student' },
  ],
  classes: [
    {
      id: 'c1',
      name: 'Spanish A1 - Batch 1',
      teacherId: 't1',
      studentIds: ['s1', 's2'],
      recordings: [
        { id: 'r1', title: 'Intro to Greetings', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', date: new Date(Date.now() - 86400000).toISOString(), status: 'uploaded', password: 'dummy-passcode-123' }
      ]
    },
    {
      id: 'c2',
      name: 'Business English - Advanced',
      teacherId: 't2',
      studentIds: ['s1'],
      recordings: []
    }
  ],
  liveSessions: [],
  attendance: [],
  enrollmentRequests: [
    { id: 'req_1', studentId: 's2', classId: 'c2', status: 'pending', requestDate: Date.now() - 3600000 }
  ],
};

async function readDb(): Promise<DbSchema> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data) as DbSchema;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      await writeDb(INITIAL_DATA);
      return INITIAL_DATA;
    }
    throw err;
  }
}

async function writeDb(data: DbSchema): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export const db = {
  async getUsers() {
    const data = await readDb();
    return data.users;
  },
  
  async getUser(id: string) {
    const data = await readDb();
    return data.users.find(u => u.id === id);
  },

  async registerUser(name: string, role: 'admin' | 'tutor' | 'student') {
    const data = await readDb();
    const newUser: User = {
      id: `${role.charAt(0)}${Date.now()}`,
      name,
      role
    };
    data.users.push(newUser);
    await writeDb(data);
    return newUser;
  },

  async getAllClasses() {
    const data = await readDb();
    return data.classes;
  },

  async getClassesForUser(userId: string) {
    const data = await readDb();
    const user = data.users.find(u => u.id === userId);
    if (!user) return [];
    
    if (user.role === 'admin') {
      return data.classes;
    } else if (user.role === 'tutor') {
      return data.classes.filter(c => c.teacherId === userId);
    } else {
      return data.classes.filter(c => c.studentIds.includes(userId));
    }
  },

  async getClass(classId: string) {
    const data = await readDb();
    return data.classes.find(c => c.id === classId);
  },

  async getLiveSession(classId: string) {
    const data = await readDb();
    return data.liveSessions.find(s => s.classId === classId);
  },

  async getLiveSessionByMeetingNumber(meetingNumber: string) {
    const data = await readDb();
    return data.liveSessions.find(s => s.meetingNumber === meetingNumber);
  },

  async startLiveSession(session: LiveSession) {
    const data = await readDb();
    data.liveSessions = data.liveSessions.filter(s => s.classId !== session.classId);
    data.liveSessions.push(session);
    await writeDb(data);
  },

  async endLiveSession(classId: string) {
    const data = await readDb();
    const session = data.liveSessions.find(s => s.classId === classId);
    if (session) {
      data.liveSessions = data.liveSessions.filter(s => s.classId !== classId);
      
      const cls = data.classes.find(c => c.id === classId);
      if (cls) {
        cls.recordings.push({
          id: `rec_${Date.now()}`,
          title: `Class Recording - ${new Date().toLocaleDateString()}`,
          url: '#processing',
          date: new Date().toISOString(),
          status: 'pending',
          password: 'processing-passcode'
        });
        if (!cls.pastMeetingNumbers) cls.pastMeetingNumbers = [];
        cls.pastMeetingNumbers.push(session.meetingNumber);
      }
      await writeDb(data);
    }
  },

  async markAttendanceJoin(classId: string, meetingNumber: string, studentId: string, studentName: string) {
    const data = await readDb();
    // See if they already joined and didn't leave
    const existing = data.attendance.find(a => 
      a.meetingNumber === meetingNumber && 
      a.studentId === studentId && 
      a.leaveTime === null
    );
    if (!existing) {
      data.attendance.push({
        classId,
        meetingNumber,
        studentId,
        studentName,
        joinTime: Date.now(),
        leaveTime: null
      });
      await writeDb(data);
    }
  },

  async markAttendanceLeave(classId: string, meetingNumber: string, studentId: string) {
    const data = await readDb();
    // Find the active session for this student
    const record = data.attendance.find(a => 
      a.meetingNumber === meetingNumber && 
      a.studentId === studentId && 
      a.leaveTime === null
    );
    if (record) {
      record.leaveTime = Date.now();
      await writeDb(data);
    }
  },

  async getAttendanceForClass(classId: string) {
    const data = await readDb();
    return data.attendance.filter(a => a.classId === classId);
  },

  async requestEnrollment(studentId: string, classId: string) {
    const data = await readDb();
    
    // Check if already requested or enrolled
    const cls = data.classes.find(c => c.id === classId);
    if (!cls) throw new Error("Class not found");
    if (cls.studentIds.includes(studentId)) throw new Error("Already enrolled");
    
    const existing = (data.enrollmentRequests || []).find(r => r.studentId === studentId && r.classId === classId);
    if (existing) return existing; // Just return it if already exists

    const request: EnrollmentRequest = {
      id: `req_${Date.now()}`,
      studentId,
      classId,
      status: 'pending',
      requestDate: Date.now()
    };
    
    if (!data.enrollmentRequests) data.enrollmentRequests = [];
    data.enrollmentRequests.push(request);
    await writeDb(data);
    return request;
  },

  async getEnrollmentRequests(filter?: { classId?: string, studentId?: string, status?: string }) {
    const data = await readDb();
    let reqs = data.enrollmentRequests || [];
    if (filter?.classId) reqs = reqs.filter(r => r.classId === filter.classId);
    if (filter?.studentId) reqs = reqs.filter(r => r.studentId === filter.studentId);
    if (filter?.status) reqs = reqs.filter(r => r.status === filter.status);
    return reqs;
  },

  async approveEnrollment(requestId: string) {
    const data = await readDb();
    if (!data.enrollmentRequests) return;
    const reqIndex = data.enrollmentRequests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) throw new Error("Request not found");
    
    const request = data.enrollmentRequests[reqIndex];
    if (request.status !== 'pending') throw new Error("Request is not pending");

    // Approve the request
    data.enrollmentRequests[reqIndex].status = 'approved';

    // Add student to class
    const cls = data.classes.find(c => c.id === request.classId);
    if (cls && !cls.studentIds.includes(request.studentId)) {
      cls.studentIds.push(request.studentId);
    }
    
    await writeDb(data);
  },

  async rejectEnrollment(requestId: string) {
    const data = await readDb();
    if (!data.enrollmentRequests) return;
    const req = data.enrollmentRequests.find(r => r.id === requestId);
    if (req) {
      req.status = 'rejected';
      await writeDb(data);
    }
  },
  
  async createClass(name: string, teacherId: string) {
    const data = await readDb();
    const newClass: ClassDef = {
      id: `c_${Date.now()}`,
      name,
      teacherId,
      studentIds: [],
      recordings: []
    };
    data.classes.push(newClass);
    await writeDb(data);
    return newClass;
  }
};
