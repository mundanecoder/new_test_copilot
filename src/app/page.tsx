"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";
import Link from "next/link";

export default function Home() {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isLoggedIn) {
      router.push("/chat");
    }
  }, [isLoggedIn, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-8 text-indigo-600">
        AI Chat Application
      </h1>
      <div className="flex gap-4">
        <Link
          href="/chat"
          className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
        >
          Start Chatting
        </Link>
        <Link
          href="/login"
          className="px-6 py-3 bg-white text-indigo-600 border border-indigo-600 rounded-md hover:bg-gray-50 transition"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
