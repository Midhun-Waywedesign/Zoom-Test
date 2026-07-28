"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { GraduationCap, LayoutDashboard, LogOut, Video, Users, CheckSquare, PlusCircle, Search } from "lucide-react";
import type { User } from "@/lib/db";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const saved = sessionStorage.getItem('academy-user');
    if (!saved) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(saved));
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem('academy-user');
    router.push('/');
  };

  if (!user) return <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] flex items-center justify-center">Loading...</div>;

  const navItems = user.role === 'admin' ? [
    { name: "Overview & Classes", icon: LayoutDashboard, href: "/dashboard/admin", active: pathname === '/dashboard/admin' },
  ] : user.role === 'tutor' ? [
    { name: "My Schedule", icon: LayoutDashboard, href: "/dashboard/teacher", active: pathname === '/dashboard/teacher' },
  ] : [
    { name: "My Dashboard", icon: LayoutDashboard, href: "/dashboard/student", active: pathname === '/dashboard/student' },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-[#020617] overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-sm z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center font-semibold shadow-md">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Axis Language</span>
        </div>

        <nav className="flex-1 px-4 py-4 flex flex-col gap-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 px-2">Main Menu</div>
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => router.push(item.href)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${
                item.active 
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.active ? 'text-brand-500' : 'text-slate-400'}`} />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 mb-3 border border-slate-100 dark:border-slate-700/50">
            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">{user.role}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all font-medium text-sm"
          >
            <LogOut className="w-5 h-5 opacity-70" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative custom-scrollbar">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-brand-500/10 rounded-[100%] blur-[80px] pointer-events-none"></div>
        <div className="relative z-10">
          {children}
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(150, 150, 150, 0.4); }
      `}</style>
    </div>
  );
}
