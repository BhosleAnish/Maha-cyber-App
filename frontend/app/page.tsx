"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ShieldAlert, Newspaper, FolderOpen, LogOut, User, Loader2, ExternalLink } from "lucide-react";

interface CaseItem {
  id: string;
  title: string;
  description: string;
  status: string;
}

interface NewsItem {
  title: string;
  url: string;
  publishedAt: string;
  source: string;
}

export default function HomeDashboard() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [isLoadingNews, setIsLoadingNews] = useState(true);

  // Fetch real cases from the database
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/cases");
        if (response.ok) {
          const data = await response.json();
          setCases(data);
        } else {
          console.error("Failed to fetch cases");
        }
      } catch (error) {
        console.error("Error fetching cases:", error);
      } finally {
        setIsLoadingCases(false);
      }
    };
    fetchCases();
  }, []);

  // Fetch live cyber security news
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/news/cyber");
        if (response.ok) {
          const data = await response.json();
          setNews(data.slice(0, 5)); // Show top 5 news items
        } else {
          console.error("Failed to fetch news");
        }
      } catch (error) {
        console.error("Error fetching news:", error);
      } finally {
        setIsLoadingNews(false);
      }
    };
    fetchNews();
  }, []);

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  return (
    <div className="p-8 w-full max-w-7xl mx-auto text-black h-full overflow-y-auto">
      
      {/* Top Header with User Profile and Logout */}
      <div className="flex justify-between items-center bg-gray-100 border border-gray-300 p-4 rounded-xl shadow-sm mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-black p-2 rounded-full">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black">Maha Cyber Portal</h1>
            <p className="text-xs text-gray-600 font-medium">Investigating Officer Dashboard</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm font-bold bg-white px-3 py-1.5 rounded-lg border border-gray-300">
            <User className="w-4 h-4" /> IO-4892
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-2 border border-red-200 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT/CENTER: Real Ongoing Cases */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-black">
              <FolderOpen className="w-6 h-6" /> Ongoing Investigations
            </h2>
            <Link href="/evidence" className="text-sm font-bold text-blue-600 hover:underline">View All / Add New</Link>
          </div>

          {isLoadingCases ? (
            <div className="p-8 bg-gray-50 border border-gray-300 rounded-xl text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-600" />
              <p className="text-gray-600">Loading cases from database...</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="p-8 bg-gray-50 border border-gray-300 rounded-xl text-center">
              <p className="text-gray-600 mb-4">No ongoing cases found in the database.</p>
              <Link href="/evidence" className="inline-block bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800">
                Create First Case
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cases.map((c) => (
                <Link href={`/evidence/${c.id}`} key={c.id} className="block bg-white p-5 border border-gray-300 rounded-xl hover:border-black hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold bg-red-100 text-red-800 px-2 py-1 rounded">{c.status}</span>
                    <span className="text-sm font-bold text-gray-500">{c.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-black">{c.title}</h3>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{c.description}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Live Cyber News Feed */}
        <div className="lg:col-span-1 bg-gray-50 border border-gray-300 rounded-xl p-6 h-fit sticky top-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-black">
            <Newspaper className="w-5 h-5" /> Cyber Security News
          </h2>
          
          {isLoadingNews ? (
            <div className="bg-white border border-gray-300 p-8 rounded-lg text-center shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-600">Loading latest news...</p>
            </div>
          ) : news.length === 0 ? (
            <div className="bg-white border border-gray-300 p-8 rounded-lg text-center shadow-sm">
              <p className="text-sm text-gray-600 font-medium">Unable to load news.</p>
              <p className="text-xs text-gray-400 mt-2">Check your connection to the backend.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {news.map((item, idx) => (
                <a 
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white border border-gray-300 p-4 rounded-lg hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold text-black line-clamp-2 group-hover:text-blue-600">
                      {item.title}
                    </h3>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium">{item.source}</span>
                    <span>{formatDate(item.publishedAt)}</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}