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
import { useAuth } from "@/contexts/AuthContext";
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

  const presentCount = new Set(
    attendance
      .filter((a) => a.status === "present" && validMeetingIds.has(a.meetingId))
      .map(a => a.meetingId)
  ).size;

  const totalEvents = meetings.length;
  const attendanceRate = totalEvents > 0 ? Math.min(100, Math.round((presentCount / totalEvents) * 100)) : 0;

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

  // Handle scanning a meeting QR
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

      // Check if already registered
      const isRegistered = attendance.some(a => a.meetingId === meeting.id && a.status === "present");
      if (isRegistered) {
        toast.info("You have already registered for this event.");
      }

      loadMeetingDetails(meeting);
      // We do NOT mark attendance here anymore. User must click "Mark as Attended" in the modal.

    } catch (err) {
      console.error(err);
      toast.error("Failed to process QR.");
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
    { label: "Events Missed", value: (totalEvents - presentCount).toString(), icon: XCircle, color: "text-red-500" },
  ];

  // Calendar logic
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

  const upcomingDays = meetings
    .filter((m) => {
      const d = new Date(m.date);
      return d.getMonth() === month && d.getFullYear() === year && d >= now;
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
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        {/* Header Section */}
        <motion.div variants={itemAnim} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Welcome, {userProfile?.displayName?.split(" ")[0]}!</h1>
            <p className="text-muted-foreground">Here is your attendance overview</p>
          </div>
          <div className="flex gap-2">
            {/* My QR Code */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="font-semibold">
                  <QrCode size={16} className="mr-2" />
                  My QR
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-bold text-center">My Officer QR</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <QRCode
                      value={`checkits://officer/${userProfile?.uid}`}
                      size={200}
                    />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Show this to an admin to check in manually
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={() => setScannerOpen(true)} className="font-bold">
              <ScanLine size={16} className="mr-2" />
              Scan Meeting
            </Button>
          </div>
        </motion.div>

        {/* Top Badges & Stats Row */}
        <motion.div variants={itemAnim} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Stats Cards */}
          {stats.map((s) => (
            <Card key={s.label} className="border-l-4 border-l-primary/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl font-black">{s.value}</p>
                </div>
                <s.icon className={`opacity-80 ${s.color}`} size={24} />
              </CardContent>
            </Card>
          ))}

          {/* Featured Badge (Highest Earned) */}
          <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <Trophy size={20} />
              </div>
              <div>
                <p className="text-xs text-primary font-bold uppercase">Current Rank</p>
                <p className="text-lg font-black leading-tight">
                  {badges.slice().reverse().find(b => presentCount >= b.threshold)?.name || "Rookie"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Split View */}
        <motion.div variants={itemAnim} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Events List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CalendarDays size={20} />
                Your Events
              </h2>
            </div>

            <div className="space-y-3">
              {sortedEvents.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                  <p className="text-muted-foreground">No events found.</p>
                </div>
              ) : sortedEvents.map((event) => (
                <motion.div
                  key={event.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => loadMeetingDetails(event)}
                  className={`group relative overflow-hidden rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md bg-card ${event.isPast ? "opacity-75" : "border-primary/50"
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className={`shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold border ${event.isPast ? "bg-muted text-muted-foreground border-transparent" : "bg-primary/10 text-primary border-primary/20"
                        }`}>
                        <span className="text-[10px] uppercase leading-none">{format(new Date(event.date), "MMM")}</span>
                        <span className="text-xl leading-none">{format(new Date(event.date), "d")}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{event.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Clock size={12} /> {event.time}</span>
                          <span className="flex items-center gap-1"><MapPin size={12} /> {event.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {event.status === "present" ? (
                        <span className="bg-green-500/10 text-green-600 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 size={12} /> Present
                        </span>
                      ) : event.status === "absent" ? (
                        <span className="bg-red-500/10 text-red-600 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <XCircle size={12} /> Absent
                        </span>
                      ) : (
                        <span className="bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full text-xs font-bold">
                          Upcoming
                        </span>
                      )}
                      <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Column: Calendar & Badges Widget */}
          <div className="space-y-6">
            {/* Calendar Widget */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  {format(now, "MMMM yyyy")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {["S", "M", "T", "W", "T", "F", "S"].map(d => (
                    <span key={d} className="text-[10px] font-bold text-muted-foreground">{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {calDays.map((day, i) => {
                    const isPresent = day && presentDays.includes(day);
                    const isUpcoming = day && upcomingDays.includes(day);
                    const isToday = day === today;

                    return (
                      <div
                        key={i}
                        className={`aspect-square flex items-center justify-center rounded-md text-sm font-medium
                                            ${day === null ? "" :
                            isToday ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" :
                              isPresent ? "bg-green-500 text-white shadow-sm" :
                                isUpcoming ? "border border-primary text-primary" :
                                  "text-muted-foreground hover:bg-secondary"
                          }
                                        `}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-muted-foreground justify-center">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Present</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full border border-primary" /> Upcoming</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /> Today</span>
                </div>
              </CardContent>
            </Card>

            {/* Badges Collection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Badges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {badges.map(b => {
                    const earned = presentCount >= b.threshold;
                    return (
                      <div key={b.name} className={`flex flex-col items-center p-2 rounded-lg text-center transition-all ${earned ? "opacity-100" : "opacity-30 grayscale"}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${earned ? "bg-yellow-500/10 text-yellow-600" : "bg-secondary"}`}>
                          <b.icon size={14} />
                        </div>
                        <span className="text-[10px] font-bold leading-tight">{b.name}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

        </motion.div>

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
                const isUpcoming = new Date(selectedMeeting.date) >= new Date();

                if (isRegistered) {
                  return (
                    <Button disabled className="bg-green-600/20 text-green-600 border border-green-600/50 cursor-not-allowed hover:bg-green-600/20">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Alrady Registered
                    </Button>
                  );
                }

                if (isUpcoming) {
                  return (
                    <Button onClick={markSelfAttendance} className="bg-primary text-primary-foreground">
                      Mark as Attended
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
