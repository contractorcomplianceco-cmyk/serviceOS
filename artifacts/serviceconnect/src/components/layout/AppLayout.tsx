import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useLocation } from "wouter";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  if (location === "/login") {
    return <div className="min-h-screen" style={{ background: "var(--sc-bg)" }}>{children}</div>;
  }
  if (location.startsWith("/tech")) {
    return <div className="min-h-screen" style={{ background: "var(--sc-bg)" }}>{children}</div>;
  }

  return (
    <div className="flex min-h-screen w-full overflow-hidden" style={{ background: "var(--sc-bg)" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto scrollbar-thin" style={{ background: "var(--sc-bg)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
