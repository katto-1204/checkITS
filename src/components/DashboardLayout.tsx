import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  User,
  LogOut,
  Menu,
  Plus,
  Moon,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";

interface DashboardLayoutProps {
  children: ReactNode;
  role?: "admin" | "officer";
}

const adminLinks = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/events/new", icon: Plus, label: "New Meeting" },
  { to: "/admin/officers", icon: User, label: "Officers" },
  { to: "/admin/reports", icon: BarChart3, label: "Reports" },
  { to: "/profile", icon: User, label: "Profile" },
];

const officerLinks = [
  { to: "/officer", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/profile", icon: User, label: "Profile" },
];

const DashboardLayout = ({ children, role: propRole }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { userProfile, signOut } = useAuth();

  const role = propRole || userProfile?.role || "officer";
  const links = role === "admin" ? adminLinks : officerLinks;
  const initials =
    userProfile?.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || role[0].toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-8 pb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 p-0.5 shadow-lg shadow-primary/20">
          <div className="w-full h-full rounded-[14px] bg-background flex items-center justify-center">
            <img src="/itslogo.png" alt="Logo" className="w-8 h-8 object-contain" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-[900] tracking-tighter leading-none flex items-center gap-1">
            Check<span className="text-primary italic">ITS</span>
          </h1>
          <p className="text-[11px] text-muted-foreground tracking-[0.1em] font-medium mt-1.5 opacity-70">
            {role} Portal
          </p>
        </div>
      </div>

      {/* User Card - Floating style */}
      {userProfile && (
        <div className="px-4 py-6">
          <div className="bg-secondary/30 backdrop-blur-md rounded-2xl p-4 border border-border/50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500" />
            <div className="flex items-center gap-3 relative z-10">
              {userProfile.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt=""
                  className="w-10 h-10 rounded-xl ring-2 ring-primary/20 shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-sm font-black shadow-lg shadow-primary/20">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold truncate leading-none mb-1">{userProfile.displayName}</p>
                <p className="text-[10px] text-muted-foreground truncate opacity-80 tracking-wide font-medium">{userProfile.idNumber || "System Admin"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-2 space-y-1.5 scrollbar-hide overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 relative overflow-hidden ${isActive
                ? "text-primary shadow-sm shadow-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-primary/10 border-l-4 border-primary z-0"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <link.icon
                  size={20}
                  className={`relative z-10 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                />
                <span className="relative z-10 flex-1">{link.label}</span>
                {isActive && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-1.5 h-1.5 rounded-full bg-primary relative z-10" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 mt-auto border-t border-border/50 bg-secondary/10 backdrop-blur-sm space-y-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all w-full group"
        >
          <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center group-hover:border-primary/30 group-hover:text-primary transition-colors">
            {theme === "dark" ? <Sparkles size={16} /> : <Moon size={16} />}
          </div>
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-bold tracking-wide text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all w-full group"
        >
          <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center group-hover:bg-destructive/10 group-hover:border-destructive/30 group-hover:text-destructive transition-colors">
            <LogOut size={16} />
          </div>
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background selection:bg-primary/20">
      {/* Desktop Sidebar - Premium Floating look */}
      <aside className="hidden lg:flex w-72 flex-col bg-background border-r border-border/40 fixed inset-y-0 left-0 z-30 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.05)]">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-md z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-72 bg-background border-r border-border z-50 lg:hidden shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 lg:ml-72 transition-all duration-300">
        {/* Top Bar - Clean & Floating */}
        <header className="sticky top-0 z-20 bg-background/60 backdrop-blur-xl border-b border-border/40 px-4 lg:px-10 h-20 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-secondary/60 rounded-xl w-10 h-10"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </Button>

          <div className="flex items-center gap-3 lg:gap-4 ml-auto">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-[10px] font-bold tracking-wide text-primary leading-none mb-1">Authenticated</span>
              <span className="text-[9px] text-muted-foreground font-medium tracking-tight opacity-70">CheckITS Terminal</span>
            </div>
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt=""
                className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl ring-2 ring-primary/10 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground text-[10px] font-black border border-border">
                {initials}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
