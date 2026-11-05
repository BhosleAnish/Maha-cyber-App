"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, FileText, Scale, BookOpen, ShieldAlert, ArrowLeftRight, LogOut } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  if (pathname === "/login") return null;

  const name = session?.user?.name ?? "Officer";
  const badge = (session?.user as { badge?: string } | undefined)?.badge;
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="w-64 bg-slate-900 text-white h-full flex flex-col shadow-xl">
      <div className="p-6 flex items-center gap-3 border-b border-slate-700">
        <ShieldAlert className="text-blue-400" size={32} />
        <div>
          <h1 className="font-bold text-lg leading-tight">Maha Cyber</h1>
          <p className="text-xs text-slate-400">Officer Portal</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <Link href="/" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
          <LayoutDashboard size={20} className="text-slate-300" />
          <span>Dashboard</span>
        </Link>
        <Link href="/evidence" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
          <FileText size={20} className="text-slate-300" />
          <span>Evidence Graph</span>
        </Link>
        <Link href="/fir-generator" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
          <Scale size={20} className="text-slate-300" />
          <span>Smart FIR</span>
        </Link>
        <Link href="/ipc-mapper" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
          <ArrowLeftRight size={20} className="text-slate-300" />
          <span>IPC → BNS Mapper</span>
        </Link>
        <Link href="/it-act" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
          <BookOpen size={20} className="text-slate-300" />
          <span>IT Act Search</span>
        </Link>
      </nav>
      
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 p-2 bg-slate-800 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-slate-400">{badge ? `ID: ${badge}` : ""}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-3 w-full flex items-center justify-center gap-2 p-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/10 hover:text-red-200 border border-slate-700 transition-colors"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </div>
  );
}