import { motion } from "framer-motion";
import {
  Users, CalendarDays, TrendingUp, Plus, Search, Edit, Trash2,
  QrCode, FileDown, Bell, ScanLine,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import QrScanner from "@/components/QrScanner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMeetings,
  getAttendanceForMeeting,
  deleteMeeting,
  markAttendance,
  getUser,
  Meeting,
  AttendanceRecord,
} from "@/lib/firestore";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMeetingId, setScanMeetingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const allMeetings = await getMeetings();
      setMeetings(allMeetings);

      // Load attendance counts for each meeting
      const counts: Record<string, number> = {};
      for (const m of allMeetings) {
        const attendance = await getAttendanceForMeeting(m.id);
        counts[m.id] = attendance.filter((a) => a.status === "present").length;
      }
      setAttendanceCounts(counts);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredMeetings = meetings.filter(
    (e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPresent = Object.values(attendanceCounts).reduce((a, b) => a + b, 0);
  const upcomingCount = meetings.filter((m) => new Date(m.date) >= new Date()).length;

  const handleDeleteMeeting = async (id: string) => {
    if (!confirm("Delete this meeting?")) return;
    try {
      await deleteMeeting(id);
      toast.success("Meeting deleted.");
      loadData();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  // Handle QR scan — expecting officer UID, marks them present
  const handleScanOfficerQR = async (data: string) => {
    if (!scanMeetingId) {
      toast.error("No meeting selected for scanning.");
      return;
    }
    try {
      // data should be like: checkits://officer/{uid}
      const match = data.match(/checkits:\/\/officer\/(.+)/);
      const officerUid = match ? match[1] : data;

      const officerProfile = await getUser(officerUid);
      if (!officerProfile) {
        toast.error("Unknown officer QR code.");
        return;
      }

      await markAttendance({
        meetingId: scanMeetingId,
        userId: officerUid,
        userDisplayName: officerProfile.displayName,
        status: "present",
        markedBy: userProfile?.uid || "",
      });

      toast.success(`${officerProfile.displayName} marked present!`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark attendance.");
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("CheckITS Attendance Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    autoTable(doc, {
      startY: 38,
      head: [["Meeting", "Date", "Time", "Location", "Present"]],
      body: meetings.map((e) => [
        e.title,
        e.date,
        e.time,
        e.location,
        (attendanceCounts[e.id] || 0).toString(),
      ]),
      theme: "grid",
      headStyles: { fillColor: [220, 38, 38] },
    });

    doc.save("checkits-attendance-report.pdf");
  };

  const statCards = [
    { label: "Total Present", value: totalPresent.toString(), icon: Users, accent: true },
    { label: "Upcoming", value: upcomingCount.toString(), icon: CalendarDays, accent: false },
    { label: "Meetings", value: meetings.length.toString(), icon: TrendingUp, accent: false },
  ];

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {userProfile?.displayName || "Admin"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportPDF} className="font-semibold">
              <FileDown size={16} className="mr-2" />
              Export PDF
            </Button>
            <Button onClick={() => navigate("/admin/events/new")} className="font-bold">
              <Plus size={18} className="mr-2" />
              New Meeting
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className={`${stat.accent ? "stat-glow border-primary/30" : ""}`}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.accent ? "bg-primary" : "bg-secondary"}`}>
                  <stat.icon size={22} className={stat.accent ? "text-primary-foreground" : "text-muted-foreground"} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-black">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Meetings List */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Meetings</h2>
            <div className="relative w-64 hidden sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search meetings..."
                className="pl-9 bg-secondary border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredMeetings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No meetings yet. Create your first meeting!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredMeetings.map((meeting) => {
                const isPast = new Date(meeting.date) < new Date();
                const presentCount = attendanceCounts[meeting.id] || 0;

                return (
                  <motion.div
                    key={meeting.id}
                    variants={item}
                    whileHover={{ scale: 1.01 }}
                    className="glass-card rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer"
                    onClick={() => navigate(`/admin/event/${meeting.id}`)}
                  >
                    <div className="w-14 h-14 rounded-lg bg-secondary flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs text-muted-foreground uppercase">
                        {new Date(meeting.date).toLocaleDateString("en", { month: "short" })}
                      </span>
                      <span className="text-lg font-black leading-none">
                        {new Date(meeting.date).getDate()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate">{meeting.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {meeting.time} · {meeting.location}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {isPast ? (
                        <div className="text-right">
                          <span className="text-sm font-bold text-primary">
                            {presentCount}
                          </span>
                          <p className="text-xs text-muted-foreground">present</p>
                        </div>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-semibold">
                          Upcoming
                        </span>
                      )}

                      {/* QR Code Display */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <QrCode size={14} />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
                          <DialogHeader>
                            <DialogTitle className="font-bold">Meeting QR</DialogTitle>
                          </DialogHeader>
                          <div className="flex flex-col items-center gap-4 py-4">
                            <div className="bg-foreground p-4 rounded-xl">
                              <QRCodeSVG
                                value={`checkits://meeting/${meeting.id}/checkin`}
                                size={200}
                                bgColor="hsl(0, 0%, 96%)"
                                fgColor="hsl(0, 0%, 5%)"
                              />
                            </div>
                            <p className="text-sm text-muted-foreground text-center">
                              Officers scan this QR code to mark attendance for <strong>{meeting.title}</strong>
                            </p>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Scan Officer QR */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScanMeetingId(meeting.id);
                          setScannerOpen(true);
                        }}
                      >
                        <ScanLine size={14} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMeeting(meeting.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* QR Scanner for scanning officer QRs */}
      <QrScanner
        open={scannerOpen}
        onClose={() => {
          setScannerOpen(false);
          setScanMeetingId(null);
        }}
        onScan={handleScanOfficerQR}
        title="Scan Officer QR"
      />
    </DashboardLayout>
  );
};

export default AdminDashboard;
