import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, CheckCircle2, XCircle, Flame, TrendingUp,
  Award, Star, Zap, Trophy, Shield, QrCode, ScanLine, MapPin, Clock, Users,
  ChevronRight
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import QRCode from "react-qr-code";
import QrScanner from "@/components/QrScanner";
import { useAuth } from "@/hooks/useAuth";
import {
  getAttendanceForUser,
  getMeetings,
  markAttendance,
  getAttendanceForMeeting,
  Meeting,
  AttendanceRecord,
} from "@/lib/firestore";
import { toast } from "sonner";
import { format } from "date-fns";
import LeaderboardWidget from "@/components/LeaderboardWidget";
import NextEventCountdown from "@/components/NextEventCountdown";
import ActivityFeed from "@/components/ActivityFeed";

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

  // Event Details Modal State
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedMeetingAttendance, setSelectedMeetingAttendance] = useState<AttendanceRecord[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  const loadMeetingDetails = async (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setDetailsOpen(true);
    setLoadingDetails(true);
    try {
      const records = await getAttendanceForMeeting(meeting.id);
      // Filter only present records
      const presentRecords = records.filter(r => r.status === "present");
      setSelectedMeetingAttendance(presentRecords);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load attendees.");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Calculate Status - Only consider meetings that strictly exist in the meetings array
  const validMeetingIds = new Set(meetings.map(m => m.id));

  // Filter for PAST meetings only to calculate stats fairly
  const now = new Date();
  const pastMeetings = meetings.filter(m => {
    // Combine date and time for precision, fallback to end of day if time missing
    const dateTimeStr = m.time ? `${m.date}T${m.time}` : `${m.date}T23:59:00`;
    return new Date(dateTimeStr) < now && validMeetingIds.has(m.id);
  });

  const totalPastEvents = pastMeetings.length;

  // Count check-ins ONLY for past meetings
  const presentInPastIds = new Set(
    attendance
      .filter((a) => a.status === "present" && pastMeetings.some(m => m.id === a.meetingId))
      .map(a => a.meetingId)
  );

  const presentCountPast = presentInPastIds.size;

  // Rate logic: If no past events have occurred, rate is 0 (as requested by user)
  const attendanceRate = totalPastEvents > 0
    ? Math.round((presentCountPast / totalPastEvents) * 100)
    : 0;

  // Missed logic: Total Past Events - Attended Past Events
  // This ensures we don't count future events as "missed", avoiding confusion/negatives
  const eventsMissed = Math.max(0, totalPastEvents - presentCountPast);

  // Calculate streak - sorting meetings descending
  const calculateStreak = () => {
    const sortedMeetings = [...meetings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let streak = 0;

    // Find the index of the first past meeting
    const pastMeetings = sortedMeetings.filter(m => new Date(m.date) < new Date());

    for (const m of pastMeetings) {
      const record = attendance.find(a => a.meetingId === m.id);
      if (record && record.status === "present") {
        streak++;
      } else {
        break; // Streak broken
      }
    }
    return streak;
  };

  // Streak calculation (moved up or independent)
  // ...

  // Combine meetings with attendance status
  const sortedEvents = meetings
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((m) => {
      const record = attendance.find((a) => a.meetingId === m.id);
      return {
        ...m,
        status: record?.status || null,
        isPast: new Date(m.date) < new Date()
      };
    });

  // Alias presentCountPast to presentCount for badges/compatibility
  const presentCount = presentCountPast;

  // Handle scanning a meeting QR
  const handleScanMeetingQR = async (data: string) => {
    if (!userProfile) return;
    try {
      // Support both deep link (checkits://meeting/{id}/checkin) and web URL ({origin}/admin/event/{id}/checkin)
      const match = data.match(/meeting\/(.+)\/checkin/);
      const meetingId = match ? match[1].split('/')[0] : data;

      const meeting = meetings.find((m) => m.id === meetingId);
      if (!meeting) {
        toast.error("Unknown meeting QR code.");
        setScannerOpen(false); // Close scanner on error so user isn't stuck
        return;
      }

      setScannerOpen(false); // Close scanner immediately upon success

      // Check if already registered
      const isRegistered = attendance.some(a => a.meetingId === meeting.id && a.status === "present");
      if (isRegistered) {
        toast.info("You have already registered for this event.");
      }

      // Open details modal to confirm
      loadMeetingDetails(meeting);

    } catch (err) {
      console.error(err);
      toast.error("Failed to process QR.");
      setScannerOpen(false);
    }
  };

  const markSelfAttendance = async () => {
    if (!selectedMeeting || !userProfile) return;
    try {
      // Check again for safety (optional but good)
      const isRegistered = attendance.some(a => a.meetingId === selectedMeeting.id && a.status === "present");
      if (isRegistered) {
        toast.info("Already registered.");
        return;
      }

      setLoadingDetails(true);
      await markAttendance({
        meetingId: selectedMeeting.id,
        userId: userProfile.uid,
        userDisplayName: userProfile.displayName,
        status: "present",
        markedBy: userProfile.uid,
      });

      toast.success(`Marked present for "${selectedMeeting.title}"!`);
      loadData(); // Reload to update state

      // Update local attendance list in modal
      await loadMeetingDetails(selectedMeeting);

    } catch (err) {
      console.error(err);
      toast.error("Failed to mark attendance.");
      setLoadingDetails(false);
    }
  };

  const stats = [
    { label: "Attendance Rate", value: `${attendanceRate}%`, icon: TrendingUp, color: "text-blue-500" },
    { label: "Active Streak", value: calculateStreak().toString(), icon: Flame, color: "text-orange-500" },
    { label: "Events Missed", value: eventsMissed.toString(), icon: XCircle, color: "text-red-500" },
  ];

  // Calendar logic
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

  const upcomingDays = meetings
    .filter((m) => {
      const d = new Date(m.date);
      // Robust "is future or today" check: if event is today but after 'now', it's upcoming
      const dateTimeStr = m.time ? `${m.date}T${m.time}` : `${m.date}T00:00:00`;
      const isFutureOrToday = new Date(dateTimeStr) >= now;
      return d.getMonth() === month && d.getFullYear() === year && isFutureOrToday;
    })
    .filter((m) => {
      // Only "upcoming" if not already checked in
      const record = attendance.find((a) => a.meetingId === m.id);
      return !record || record.status !== "present";
    })
    .map((m) => new Date(m.date).getDate());

  const absentDays = meetings
    .filter((m) => {
      const d = new Date(m.date);
      const dateTimeStr = m.time ? `${m.date}T${m.time}` : `${m.date}T23:59:00`;
      const isPast = new Date(dateTimeStr) < now;
      return d.getMonth() === month && d.getFullYear() === year && isPast;
    })
    .filter((m) => {
      const record = attendance.find((a) => a.meetingId === m.id);
      return !record || record.status !== "present";
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
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-10">

        {/* --- MAIN CONTENT (3 Columns) --- */}
        <div className="lg:col-span-3 space-y-8">

          {/* 1. Hero / Welcome Section + Next Event Countdown */}
          <motion.div variants={itemAnim} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                  Hi, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">{userProfile?.displayName?.split(" ")[0]}</span>
                </h1>
                <p className="text-lg text-muted-foreground mt-2 font-medium">
                  Ready to make an impact today?
                </p>
              </div>
              <div className="flex gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-12 px-6 rounded-full font-bold border-2 hover:bg-secondary/50">
                      <QrCode size={18} className="mr-2" />
                      My ID
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm backdrop-blur-xl bg-black/40 border-white/10">
                    <DialogHeader>
                      <DialogTitle className="font-bold text-center text-white">My Officer QR</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-8 py-10 px-4">
                      <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-primary/20">
                        <QRCode
                          value={`${window.location.origin}/officer/${userProfile?.uid}`}
                          size={240}
                        />
                      </div>
                      <p className="text-base text-center text-white/80 font-medium">
                        Show this to an admin to check in manually
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  onClick={() => setScannerOpen(true)}
                  className="h-12 px-8 rounded-full font-bold shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 transition-all hover:scale-105"
                >
                  <ScanLine size={18} className="mr-2" />
                  Scan Event
                </Button>
              </div>
            </div>

            <NextEventCountdown meetings={meetings} />
          </motion.div>

          {/* 2. Stats Grid */}
          <motion.div variants={itemAnim} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s) => (
              <Card key={s.label} className="glass-card border-l-2 border-l-primary/50 hover:bg-secondary/20 transition-colors">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{s.label}</p>
                    <p className="text-xl font-black">{s.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-secondary/30 ${s.color}`}>
                    <s.icon size={16} />
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="glass-card bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                  <Trophy size={16} />
                </div>
                <div>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-1">Rank</p>
                  <p className="text-base font-black leading-tight">
                    {badges.slice().reverse().find(b => presentCount >= b.threshold)?.name || "Rookie"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 3. Your Agenda Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <CalendarDays className="text-primary" size={24} />
              Meetings
            </h2>
            <div className="space-y-4">
              {sortedEvents.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                  <p className="text-muted-foreground font-medium">No events found yet.</p>
                </div>
              ) : sortedEvents.map((event) => (
                <motion.div
                  key={event.id}
                  whileHover={{ scale: 1.01, x: 4 }}
                  onClick={() => loadMeetingDetails(event)}
                  className={`group relative overflow-hidden rounded-2xl border-none cursor-pointer transition-all bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg ${event.isPast ? "opacity-60" : ""}`}
                >
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <CalendarDays size={120} />
                  </div>

                  <div className="p-8 relative z-10 flex items-center gap-8">
                    <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold shrink-0 ${event.isPast ? "bg-white/10" : "bg-white/20"}`}>
                      <span className="text-xs uppercase leading-none opacity-80">{format(new Date(event.date), "MMM")}</span>
                      <span className="text-4xl leading-none mt-1">{format(new Date(event.date), "d")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-2xl leading-snug truncate group-hover:text-white/90 transition-colors uppercase tracking-tight">{event.title}</h3>
                      <div className="flex gap-6 text-sm text-blue-100 mt-2 font-medium">
                        <span className="flex items-center gap-2"><Clock size={16} /> {event.time}</span>
                        <span className="flex items-center gap-2"><MapPin size={16} /> {event.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {event.status === "present" && <CheckCircle2 className="text-green-400 shrink-0" size={24} />}
                      <ChevronRight className="text-white/30 group-hover:translate-x-1 transition-transform" size={24} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* --- SIDEBAR (1 Column) --- */}
        <div className="lg:col-span-1 space-y-6">
          <LeaderboardWidget />

          <Card className="glass-card bg-black/20 border-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                {format(now, "MMMM yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["S", "M", "T", "W", "T", "F", "S"].map(d => (
                  <span key={d} className="text-[9px] font-bold text-muted-foreground/50">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {calDays.map((day, i) => {
                  const isPresent = day && presentDays.includes(day);
                  const isUpcoming = day && upcomingDays.includes(day);
                  const isAbsent = day && absentDays.includes(day);
                  const isToday = day === today;

                  let dayStyles = "text-muted-foreground/30";
                  if (isPresent) dayStyles = "bg-green-500 text-white shadow-lg shadow-green-500/20";
                  else if (isAbsent) dayStyles = "bg-red-500 text-white shadow-lg shadow-red-500/20";
                  else if (isUpcoming) dayStyles = "border-2 border-red-500/50 text-red-500";
                  else if (isToday) dayStyles = "bg-primary text-white shadow-lg shadow-primary/20";

                  return (
                    <div key={i} className={`h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all ${dayStyles}`}>
                      {day}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card bg-black/20 border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Badges</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              {badges.map(b => (
                <div key={b.name} className={`flex flex-col items-center p-2 rounded-xl text-center ${presentCount >= b.threshold ? "opacity-100" : "opacity-20 grayscale"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${presentCount >= b.threshold ? "bg-primary/20 text-primary" : "bg-white/5"}`}>
                    <b.icon size={14} />
                  </div>
                  <span className="text-[8px] font-bold uppercase truncate w-full">{b.name}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Recent Activity</h3>
            <ActivityFeed attendance={attendance} meetings={meetings} />
          </div>
        </div>
      </motion.div>

      {/* Event Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{selectedMeeting?.title}</DialogTitle>
            <DialogDescription className="text-base flex flex-col gap-1 mt-2">
              <span className="flex items-center gap-2"><CalendarDays size={16} /> {selectedMeeting && format(new Date(selectedMeeting.date), "EEEE, MMMM d, yyyy")}</span>
              <span className="flex items-center gap-2"><Clock size={16} /> {selectedMeeting?.time}</span>
              <span className="flex items-center gap-2"><MapPin size={16} /> {selectedMeeting?.location}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center justify-between">
              <span>Attendees</span>
              <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-foreground normal-case">
                {loadingDetails ? "..." : selectedMeetingAttendance.length} Checked In
              </span>
            </h3>

            {loadingDetails ? (
              <div className="flex justify-center py-4"><span className="loading-spinner" />Loading...</div>
            ) : (
              <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                {selectedMeetingAttendance.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-4">No one has checked in yet.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedMeetingAttendance.map((record) => (
                      <div key={record.userId} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 text-[10px] text-white flex items-center justify-center font-bold">
                          {record.userDisplayName.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{record.userDisplayName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>

            {selectedMeeting && (
              (() => {
                const isRegistered = attendance.some(a => a.meetingId === selectedMeeting.id && a.status === "present");

                // Fix: Compare dates without time to allow check-in on the day of the meeting
                const meetingDate = new Date(selectedMeeting.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isTodayOrFuture = meetingDate >= today;

                if (isRegistered) {
                  return (
                    <Button disabled className="bg-green-600/20 text-green-600 border border-green-600/50 cursor-not-allowed hover:bg-green-600/20">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Already Registered
                    </Button>
                  );
                }

                if (isTodayOrFuture) {
                  return (
                    <Button
                      onClick={markSelfAttendance}
                      variant="outline"
                      className="h-10 px-8 rounded-xl font-bold transition-all"
                    >
                      Check In
                    </Button>
                  )
                }

                return null;
              })()
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
