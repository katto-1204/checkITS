import { motion } from "framer-motion";
import {
  CalendarDays, CheckCircle2, XCircle, Flame, TrendingUp,
  Award, Star, Zap, Trophy, Shield, QrCode, ScanLine,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import QrScanner from "@/components/QrScanner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAttendanceForUser,
  getMeetings,
  markAttendance,
  Meeting,
  AttendanceRecord,
} from "@/lib/firestore";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const badges = [
  { name: "First Check-in", icon: Star, threshold: 1, description: "Attended your first event" },
  { name: "On Fire", icon: Flame, threshold: 3, description: "3 events attended" },
  { name: "Ironclad", icon: Shield, threshold: 5, description: "5 events attended" },
  { name: "Perfect Week", icon: Trophy, threshold: 7, description: "7 events attended" },
  { name: "Lightning", icon: Zap, threshold: 10, description: "10 events attended" },
  { name: "Legend", icon: Award, threshold: 20, description: "20 events attended" },
];

const OfficerDashboard = () => {
  const { userProfile } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!userProfile) return;
    try {
      const [userAttendance, allMeetings] = await Promise.all([
        getAttendanceForUser(userProfile.uid),
        getMeetings(),
      ]);
      setAttendance(userAttendance);
      setMeetings(allMeetings);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;
  const totalEvents = meetings.length;
  const attendanceRate = totalEvents > 0 ? Math.round((presentCount / totalEvents) * 100) : 0;

  // Calculate streak
  const calculateStreak = () => {
    const sortedMeetings = [...meetings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let streak = 0;
    for (const m of sortedMeetings) {
      const record = attendance.find((a) => a.meetingId === m.id);
      if (record && record.status === "present") {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  // Combine meetings with attendance status
  const recentEvents = meetings
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map((m) => {
      const record = attendance.find((a) => a.meetingId === m.id);
      return {
        ...m,
        status: record?.status || null,
      };
    });

  // Handle scanning a meeting QR to self-mark attendance
  const handleScanMeetingQR = async (data: string) => {
    if (!userProfile) return;
    try {
      // data format: checkits://meeting/{meetingId}/checkin
      const match = data.match(/checkits:\/\/meeting\/(.+)\/checkin/);
      const meetingId = match ? match[1] : data;

      const meeting = meetings.find((m) => m.id === meetingId);
      if (!meeting) {
        toast.error("Unknown meeting QR code.");
        return;
      }

      await markAttendance({
        meetingId,
        userId: userProfile.uid,
        userDisplayName: userProfile.displayName,
        status: "present",
        markedBy: userProfile.uid,
      });

      toast.success(`Marked present for "${meeting.title}"!`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark attendance.");
    }
  };

  const stats = [
    { label: "Attendance", value: `${attendanceRate}%`, icon: TrendingUp },
    { label: "Streak", value: calculateStreak().toString(), icon: Flame },
    { label: "Missed", value: (totalEvents - presentCount).toString(), icon: XCircle },
  ];

  // Calendar logic for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const calDays: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i);

  const presentDays = meetings
    .filter((m) => {
      const d = new Date(m.date);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .filter((m) => {
      const record = attendance.find((a) => a.meetingId === m.id);
      return record && record.status === "present";
    })
    .map((m) => new Date(m.date).getDate());

  const absentDays = meetings
    .filter((m) => {
      const d = new Date(m.date);
      return d.getMonth() === month && d.getFullYear() === year && new Date(m.date) < now;
    })
    .filter((m) => {
      const record = attendance.find((a) => a.meetingId === m.id);
      return !record || record.status === "absent";
    })
    .map((m) => new Date(m.date).getDate());

  const today = now.getDate();

  if (loading) {
    return (
      <DashboardLayout role="officer">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="officer">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        {/* Header */}
        <motion.div variants={itemAnim} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black">My Attendance</h1>
            <p className="text-muted-foreground mt-1">Track your event participation</p>
          </div>
          <div className="flex gap-2">
            {/* My QR Code */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="font-semibold">
                  <QrCode size={16} className="mr-2" />
                  My QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-bold">My QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="bg-foreground p-4 rounded-xl">
                    <QRCodeSVG
                      value={`checkits://officer/${userProfile?.uid}`}
                      size={200}
                      bgColor="hsl(0, 0%, 96%)"
                      fgColor="hsl(0, 0%, 5%)"
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{userProfile?.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      Show this to the admin to mark your attendance
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Scan Meeting QR */}
            <Button onClick={() => setScannerOpen(true)} className="font-bold">
              <ScanLine size={16} className="mr-2" />
              Scan Meeting
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemAnim} className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5 text-center">
                <s.icon size={24} className="mx-auto mb-2 text-primary" />
                <p className="text-2xl md:text-3xl font-black">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Badges */}
        <motion.div variants={itemAnim}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Award size={18} className="text-primary" />
                Badges & Streaks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {badges.map((badge) => {
                  const earned = presentCount >= badge.threshold;
                  return (
                    <motion.div
                      key={badge.name}
                      whileHover={{ scale: 1.08 }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg text-center transition-colors ${earned
                          ? "bg-primary/10 border border-primary/30"
                          : "bg-secondary/50 opacity-40"
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${earned ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                        <badge.icon size={18} />
                      </div>
                      <span className="text-[10px] font-bold leading-tight">{badge.name}</span>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Calendar */}
        <motion.div variants={itemAnim}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                {now.toLocaleDateString("en", { month: "long", year: "numeric" })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <span key={d} className="text-xs text-muted-foreground py-1">{d}</span>
                ))}
                {calDays.map((day, i) => (
                  <div
                    key={i}
                    className={`aspect-square flex items-center justify-center rounded-md text-sm font-medium transition-colors ${day === null
                        ? ""
                        : presentDays.includes(day)
                          ? "bg-success/20 text-success"
                          : absentDays.includes(day)
                            ? "bg-destructive/20 text-destructive"
                            : day === today
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-secondary"
                      }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-success/20" /> Present
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-destructive/20" /> Absent
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-primary" /> Today
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Events */}
        <motion.div variants={itemAnim}>
          <h2 className="text-xl font-bold mb-4">Recent Events</h2>
          {recentEvents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No meetings yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((a) => (
                <motion.div
                  key={a.id}
                  variants={itemAnim}
                  className="glass-card rounded-lg p-4 flex items-center gap-4"
                >
                  {a.status === "present" ? (
                    <CheckCircle2 size={22} className="text-success shrink-0" />
                  ) : a.status === "absent" ? (
                    <XCircle size={22} className="text-destructive shrink-0" />
                  ) : (
                    <CalendarDays size={22} className="text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{a.title}</p>
                    <p className="text-sm text-muted-foreground">{a.date}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${a.status === "present"
                        ? "bg-success/20 text-success"
                        : a.status === "absent"
                          ? "bg-destructive/20 text-destructive"
                          : "bg-secondary text-muted-foreground"
                      }`}
                  >
                    {a.status === "present" ? "Present" : a.status === "absent" ? "Absent" : "Pending"}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Meeting QR Scanner */}
      <QrScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScanMeetingQR}
        title="Scan Meeting QR"
      />
    </DashboardLayout>
  );
};

export default OfficerDashboard;
