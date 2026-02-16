import { motion } from "framer-motion";
import {
  Users, CalendarDays, TrendingUp, Plus, Search, Edit, Trash2,
  QrCode, FileDown, ScanLine,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import QRCode from "react-qr-code";
import QrScanner from "@/components/QrScanner";
import AttendanceChart from "@/components/AttendanceChart";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/hooks/useAuth";
import {
  getMeetings,
  getAttendanceForMeeting,
  deleteMeeting,
  markAttendance,
  getUser,
  getAllUsers,
  Meeting,
  deleteAttendanceForMeeting,
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
      await deleteAttendanceForMeeting(id);
      await deleteMeeting(id);
      toast.success("Meeting deleted.");
      loadData();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  /* ... inside component ... */
  const [scannedOfficer, setScannedOfficer] = useState<any | null>(null); // Quick fix for type, ideally UserProfile
  const [showOfficerModal, setShowOfficerModal] = useState(false);

  /* ... */

  // Handle QR scan — expecting officer UID, OPEN ID CARD
  const handleScanOfficerQR = async (data: string) => {
    if (!scanMeetingId) {
      toast.error("No meeting selected for scanning.");
      return;
    }
    try {
      // Support both deep link (checkits://officer/{uid}) and web URL ({origin}/officer/{uid})
      const match = data.match(/officer\/(.+)/);
      const officerUid = match ? match[1].split('/')[0] : data;

      const officerProfile = await getUser(officerUid);
      if (!officerProfile) {
        toast.error("Unknown officer QR code.");
        return;
      }

      setScannedOfficer(officerProfile);

      // Check if already present for this meeting
      const existingAttendance = await getAttendanceForMeeting(scanMeetingId);
      const isPresent = existingAttendance.some(a => a.userId === officerUid && a.status === "present");

      if (isPresent) {
        toast.info(`${officerProfile.displayName} is already marked present.`);
        // We can still show the modal but maybe change the button, or just return.
        // User requested: "it should say 'officer allraedy present'"
        // If we return here, we can set scanner open again immediately
        setScannerOpen(true);
        return;
      }

      setScannerOpen(false); // Close scanner
      setShowOfficerModal(true); // Open ID Card

    } catch (err) {
      console.error(err);
      toast.error("Failed to process QR.");
      setScannerOpen(true); // Re-open on error
    }
  };

  const handleConfirmAttendance = async () => {
    if (!scannedOfficer || !scanMeetingId) return;
    try {
      await markAttendance({
        meetingId: scanMeetingId,
        userId: scannedOfficer.uid,
        userDisplayName: scannedOfficer.displayName,
        status: "present",
        markedBy: userProfile?.uid || "",
      });
      toast.success(`${scannedOfficer.displayName} marked present!`);
      setShowOfficerModal(false);
      setScannedOfficer(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark.");
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
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-[900] tracking-tighter leading-none">
              Admin <span className="text-primary italic">Dashboard</span>
            </h1>
            <p className="text-muted-foreground mt-2 font-medium flex items-center gap-2 text-sm sm:text-base">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary" />
              Operational Overview · {userProfile?.displayName}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={exportPDF} className="h-12 px-6 rounded-xl font-bold border-2 hover:bg-secondary/50 transition-all">
              <FileDown size={18} className="mr-2" />
              Analytics
            </Button>
            <Button onClick={() => navigate("/admin/events/new")} className="h-12 px-8 rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Plus size={20} className="mr-2" />
              NEW SESSION
            </Button>
          </div>
        </motion.div>

        {/* Stats - Premium Glow Edition */}
        <motion.div variants={item} className="grid grid-cols-3 gap-4 lg:gap-6">
          {statCards.map((stat) => (
            <Card key={stat.label} className={`group overflow-hidden border-none shadow-none bg-transparent relative`}>
              <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-500 opacity-10 group-hover:opacity-20 ${stat.accent ? "from-primary/40 to-primary/0" : "from-secondary/40 to-secondary/0"}`} />
              <CardContent className="p-0 flex items-stretch">
                <div className="w-full bg-secondary/20 backdrop-blur-md rounded-2xl p-6 border border-border/50 flex items-center gap-5 group-hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
                  {/* Background Glow */}
                  <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-20 transition-all duration-500 group-hover:scale-150 ${stat.accent ? "bg-primary" : "bg-muted-foreground"}`} />

                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${stat.accent ? "bg-primary text-primary-foreground shadow-primary/20" : "bg-secondary text-muted-foreground"}`}>
                    <stat.icon size={28} className={`${stat.accent ? "animate-pulse" : ""}`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-wide text-muted-foreground leading-none mb-1.5 opacity-60">{stat.label}</p>
                    <p className="text-3xl md:text-4xl font-[900] tracking-tighter">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Main Intelligence Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* LEFT: Session Hub - High Density Edition */}
          <motion.div variants={item} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black flex items-center gap-2">
                <CalendarDays className="text-primary" size={24} />
                Session Hub
              </h2>
              <div className="relative w-48 group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Filter..."
                  className="pl-9 h-10 bg-secondary/30 border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 rounded-xl transition-all font-medium text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredMeetings.length === 0 ? (
              <Card className="bg-secondary/10 border-dashed border-2 border-border/50 rounded-2xl">
                <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                    <Plus size={32} className="opacity-20" />
                  </div>
                  <p className="font-bold tracking-tight">No active sessions found.</p>
                  <Button variant="outline" onClick={() => navigate("/admin/events/new")} className="rounded-xl">Create Meeting</Button>
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
                      whileHover={{ x: 4 }}
                      className="bg-secondary/20 hover:bg-secondary/30 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4 cursor-pointer border border-border/40 hover:border-primary/20 transition-all group overflow-hidden relative"
                      onClick={() => navigate(`/admin/event/${meeting.id}`)}
                    >
                      {/* Status Glow Overlay */}
                      <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] -mr-16 -mt-16 opacity-0 group-hover:opacity-40 transition-opacity duration-700 ${isPast ? "bg-muted-foreground" : "bg-primary"}`} />

                      <div className="w-12 h-12 rounded-xl bg-background border border-border/50 flex flex-col items-center justify-center shrink-0 shadow-sm transition-transform">
                        <span className="text-[9px] text-muted-foreground font-bold tracking-wide opacity-60">
                          {new Date(meeting.date).toLocaleDateString("en", { month: "short" })}
                        </span>
                        <span className="text-base font-[900] tracking-tighter leading-none mt-0.5">
                          {new Date(meeting.date).getDate()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-[900] text-base truncate tracking-tight">{meeting.title}</h3>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5 opacity-70">
                          {meeting.location} · {meeting.time}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                        {isPast ? (
                          <div className="px-2.5 py-1 rounded-lg bg-secondary/50 border border-border/50">
                            <span className="text-[10px] font-black text-primary">
                              {presentCount} PRES
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-black uppercase tracking-widest animate-pulse border border-primary/20">
                            LIVE
                          </span>
                        )}

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 bg-background border border-border/50 rounded-md hover:text-primary scale-90"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <QrCode size={14} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-sm rounded-[32px] overflow-hidden border-none p-0" onClick={(e) => e.stopPropagation()}>
                              <div className="bg-gradient-to-br from-primary to-primary-foreground p-8">
                                <DialogHeader className="mb-6">
                                  <DialogTitle className="font-black text-white text-2xl text-center">SESSION KEY</DialogTitle>
                                </DialogHeader>
                                <div className="bg-white p-6 rounded-[24px] shadow-2xl flex items-center justify-center">
                                  <QRCode
                                    value={`${window.location.origin}/admin/event/${meeting.id}/checkin`}
                                    size={220}
                                    fgColor="#dc2626"
                                  />
                                </div>
                                <p className="text-xs text-white/80 text-center font-black uppercase tracking-widest mt-6">
                                  {meeting.title}
                                </p>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 bg-background border border-border/50 rounded-md hover:text-primary scale-90"
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
                            className="h-7 w-7 bg-background border border-border/50 rounded-md text-destructive hover:bg-destructive/5 scale-90"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMeeting(meeting.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* RIGHT: Attendance Trends */}
          <motion.div variants={item} className="space-y-6">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <TrendingUp className="text-primary" size={24} />
              Attendance Trends
            </h2>
            <AttendanceChart meetings={meetings} attendanceCounts={attendanceCounts} />
          </motion.div>

        </div>
      </motion.div>

      {/* Officer ID Card Modal */}
      <Dialog open={showOfficerModal} onOpenChange={setShowOfficerModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Officer Identity</DialogTitle>
          </DialogHeader>
          {scannedOfficer && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center text-3xl font-black text-primary overflow-hidden">
                {scannedOfficer.photoURL ? (
                  <img src={scannedOfficer.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  scannedOfficer.displayName.substring(0, 2).toUpperCase()
                )}
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-2xl font-[900] tracking-tight">{scannedOfficer.displayName}</h2>
                <div className="bg-secondary px-3 py-1 rounded-full inline-block">
                  <p className="text-sm font-bold font-mono tracking-widest">{scannedOfficer.idNumber || "No ID"}</p>
                </div>
                <p className="text-sm text-muted-foreground font-bold mt-2">{scannedOfficer.position || "Officer"}</p>
                {scannedOfficer.schoolYear && (
                  <p className="text-xs text-muted-foreground font-medium">{scannedOfficer.schoolYear}</p>
                )}
              </div>

              <Button onClick={handleConfirmAttendance} className="w-full h-12 text-lg font-bold mt-4" size="lg">
                MARK PRESENT
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
