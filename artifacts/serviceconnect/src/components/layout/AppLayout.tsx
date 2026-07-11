import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useLocation } from "wouter";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  if (location === "/login") {
    return <div className="min-h-screen bg-slate-900">{children}</div>;
  }
  if (location.startsWith("/tech")) {
    return <div className="min-h-screen bg-slate-100">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 w-full overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
      </div>
    </div>
  );
}
