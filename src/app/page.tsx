"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/db";
import { GraduationCap, ArrowRight, UserPlus, LogIn, Mail, ShieldAlert } from "lucide-react";

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regRole, setRegRole] = useState<'student' | 'tutor' | 'admin'>('student');
  const [regLoading, setRegLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const router = useRouter();

  const fetchUsers = () => {
    fetch('/api/data?type=users')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleLogin = (user: User) => {
    sessionStorage.setItem('academy-user', JSON.stringify(user));
    if (user.role === 'admin') {
      router.push('/dashboard/admin');
    } else if (user.role === 'tutor') {
      router.push('/dashboard/teacher');
    } else {
      router.push('/dashboard/student');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!users.length) return;
    
    // Mock authentication logic based on email
    let userToLogin = users.find(u => u.role === 'student');
    
    if (loginEmail.toLowerCase().includes('admin')) {
      userToLogin = users.find(u => u.role === 'admin');
    } else if (loginEmail.toLowerCase().includes('tutor')) {
      userToLogin = users.find(u => u.role === 'tutor');
    }

    if (userToLogin) {
      handleLogin(userToLogin);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;
    setRegLoading(true);
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, role: regRole })
      });
      const newUser = await res.json();
      
      // Auto login after registration
      handleLogin(newUser);
    } catch (err) {
      console.error(err);
      setRegLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#020617] p-6 font-sans relative overflow-hidden">
      {/* SaaS Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-brand-500/10 to-transparent"></div>
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
      
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-center relative z-10">
        
        {/* Left Side: Branding & Pitch */}
        <div className="flex flex-col gap-6 text-center md:text-left order-2 md:order-1">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-sm font-semibold w-max mx-auto md:mx-0">
            <ShieldAlert className="w-4 h-4" />
            Axis Language School Demo
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-tight">
            The modern way to <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600">master languages.</span>
          </h1>
          <p className="text-lg text-foreground/60 max-w-lg mx-auto md:mx-0">
            Join live classes seamlessly directly in your browser. No extra apps, no extra accounts. Experience education reinvented.
          </p>
          <div className="hidden md:flex gap-4 items-center text-sm font-medium text-foreground/50 mt-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div> Instant Join
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div> Cloud Recordings
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div> Automated Tracking
            </div>
          </div>
        </div>

        {/* Right Side: Auth Module */}
        <div className="glass rounded-3xl shadow-2xl border border-foreground/10 p-8 order-1 md:order-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
          
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center text-3xl font-semibold shadow-lg shadow-brand-500/30">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Axis Portal</h2>
          </div>

          {/* Toggle Tabs */}
          <div className="flex p-1 bg-foreground/5 rounded-xl mb-6">
            <button 
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isRegistering ? 'bg-white dark:bg-slate-800 shadow-sm text-foreground' : 'text-foreground/60 hover:text-foreground'}`}
              onClick={() => setIsRegistering(false)}
            >
              <span className="hidden sm:inline">Sign In</span>
              <span className="sm:hidden">Login</span>
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isRegistering ? 'bg-white dark:bg-slate-800 shadow-sm text-foreground' : 'text-foreground/60 hover:text-foreground'}`}
              onClick={() => setIsRegistering(true)}
            >
              Create Account
            </button>
          </div>

          {isRegistering ? (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2">Full Name</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <input 
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Emma Smith"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-foreground/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2">I am a...</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('student')}
                    className={`py-2 text-sm rounded-xl border font-semibold transition-all ${regRole === 'student' ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-900/30 dark:border-brand-500 dark:text-brand-400' : 'bg-background border-foreground/10 text-foreground/60 hover:border-foreground/20'}`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('tutor')}
                    className={`py-2 text-sm rounded-xl border font-semibold transition-all ${regRole === 'tutor' ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-900/30 dark:border-brand-500 dark:text-brand-400' : 'bg-background border-foreground/10 text-foreground/60 hover:border-foreground/20'}`}
                  >
                    Tutor
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('admin')}
                    className={`py-2 text-sm rounded-xl border font-semibold transition-all ${regRole === 'admin' ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-900/30 dark:border-brand-500 dark:text-brand-400' : 'bg-background border-foreground/10 text-foreground/60 hover:border-foreground/20'}`}
                  >
                    Admin
                  </button>
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={regLoading || !regName.trim()}
                className="w-full mt-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
              >
                {regLoading ? 'Creating Account...' : (
                  <>Create Account <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div className="bg-brand-50 dark:bg-brand-500/10 p-3 rounded-lg border border-brand-200 dark:border-brand-500/20 text-brand-700 dark:text-brand-300 text-xs text-center mb-2">
                <strong>Demo Accounts:</strong><br/>
                admin@axis.edu | tutor@axis.edu | student@axis.edu<br/>
                (Password can be anything)
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <input 
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="student@axis.edu"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-foreground/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all font-medium"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <input 
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-foreground/10 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading || !loginEmail || !loginPassword}
                className="w-full mt-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
              >
                {loading ? 'Loading Database...' : (
                  <>Sign In <LogIn className="w-5 h-5" /></>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(150, 150, 150, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(150, 150, 150, 0.4);
        }
      `}</style>
    </main>
  );
}