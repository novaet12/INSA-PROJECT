"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Risk Register", href: "/risks" },
    { name: "Reports", href: "/reports" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header with Logo Space */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              {/* Logo - 240px × 80px */}
              <div className="w-10 h-5 flex items-center justify-center">
                <Image
                  src="/logo2.png"
                  alt="CSRARS Logo"
                  width={240}
                  height={80}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            {/* header no longer contains sign out; it's moved to the sidebar bottom */}
            <div />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation (sticky, non-scrollable) */}
        <aside className="w-64 bg-slate-800 border-r border-slate-700 h-[calc(100vh-5rem)] sticky top-20 flex flex-col">
          <nav className="p-4 flex-1">
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`block px-4 py-2 rounded-md transition ${
                        isActive
                          ? "bg-slate-700 text-white"
                          : "text-slate-300 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Bottom area: Sign Out */}
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition"
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

