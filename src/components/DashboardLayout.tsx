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
import { useAuth } from "@/contexts/AuthContext";

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
      <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
        <img src="/itslogo.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
        <div>
          <h1 className="text-2xl font-black tracking-tight leading-none">
            Check<span className="text-gradient">ITS</span>
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest leading-none mt-1">
            {role}
          </p>
        </div>
      </div>

      {/* User Info */}
      {userProfile && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            {userProfile.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt=""
                className="w-9 h-9 rounded-full ring-2 ring-primary/30"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{userProfile.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{userProfile.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav Links */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`
            }
          >
            <link.icon size={18} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Theme Toggle + Logout */}
      <div className="p-4 border-t border-sidebar-border space-y-1">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all w-full"
        >
          {theme === "dark" ? <Sparkles size={18} /> : <Moon size={18} />}
          {theme === "dark" ? "Light Mode " : "Dark Mode"}
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all w-full"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar border-r border-sidebar-border fixed inset-y-0 left-0 z-30">
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
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 lg:px-8 h-16 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </Button>

          <div className="flex items-center gap-3 ml-auto">
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt=""
                className="w-8 h-8 rounded-full ring-2 ring-primary/20"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                {initials}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
