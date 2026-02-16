import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, Clock, QrCode, FileDown, ScanLine, Edit, UserX, AlertCircle, MapPin, CalendarDays } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "react-qr-code";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import QrScanner from "@/components/QrScanner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/hooks/useAuth";
import {
  getMeeting,
  getAttendanceForMeeting,
  getAllUsers,
  markAttendance,
  getUser,
  Meeting,
  AttendanceRecord,
} from "@/lib/firestore";
import { toast } from "sonner";
import { OFFICERS_2025_2026 } from "@/lib/officers";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const EventDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { userProfile } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);

  // State for the Master List view
  const [masterList, setMasterList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Timer state
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  const [isStarted, setIsStarted] = useState(false);

  // Map Master List to Users and Attendance
  const mapMasterList = useCallback((attendanceData: AttendanceRecord[], allUsers: any[]) => {
    return OFFICERS_2025_2026.map((def) => {
      // Normalize name for better matching: remove middle initials and dots
      const normalize = (name: string) =>
        name.toLowerCase()
          .replace(/[.\s]/g, " ") // replace dots and spaces with single space
          .replace(/\b[a-z]\s/g, " ") // remove single letter initials followed by space
          .trim()
          .split(/\s+/)
          .filter(word => word.length > 1); // keep only words longer than 1 char

      const defParts = normalize(def.name);

      // 1. Find if they have an account
      const user = allUsers.find(u => {
        const uParts = normalize(u.displayName);
        // Check if all parts of the shorter name are in the longer name
        const [smaller, larger] = defParts.length < uParts.length ? [defParts, uParts] : [uParts, defParts];
        return smaller.every(part => larger.includes(part));
      });

      // 2. Find attendance
      const record = user
        ? attendanceData.find(a => a.userId === user.uid)
        : attendanceData.find(a => normalize(a.userDisplayName).every(p => defParts.includes(p)));

      let status = "not_registered"; // Default: Has account but not checked in
      if (!user) status = "no_account"; // No account
      if (record) status = record.status; // Present or Absent

      return {
        ...def,
        userUid: user?.uid,
        userPhoto: user?.photoURL,
        idNumber: user?.idNumber,
        status, // 'present', 'absent', 'not_registered', 'no_account'
        recordId: record?.id,
        checkInTime: record?.markedAt
          ? new Date(record.markedAt.seconds * 1000).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })
          : null
      };
    });
  }, []);

  useEffect(() => {
    if (!id) return;

    let unsubscribe: () => void;

    const init = async () => {
      try {
        const [meetingData, allUsers] = await Promise.all([
          getMeeting(id),
          getAllUsers(),
        ]);
        setMeeting(meetingData);

        // Real-time attendance listener
        const q = query(collection(db, "attendance"), where("meetingId", "==", id));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const attendanceData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as AttendanceRecord);
          const mapped = mapMasterList(attendanceData, allUsers);
          setMasterList(mapped);
          setLoading(false);
        });

      } catch (err) {
        console.error(err);
        toast.error("Failed to load data.");
        setLoading(false);
      }
    };

    init();
    return () => unsubscribe && unsubscribe();
  }, [id, mapMasterList]);

  // Timer Logic
  useEffect(() => {
    if (!meeting) return;

    const interval = setInterval(() => {
      const start = new Date(`${meeting.date}T${meeting.time}`);
      const now = new Date();
      const diff = now.getTime() - start.getTime();

      if (diff < 0) {
        setElapsedTime("Not Started");
        setIsStarted(false);
      } else {
        setIsStarted(true);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [meeting]);


  const handleScanOfficerQR = async (data: string) => {
    if (!id || !userProfile) return;
    try {
      const match = data.match(/checkits:\/\/officer\/(.+)/);
      const officerUid = match ? match[1] : data;

      const officerProfile = await getUser(officerUid);
      if (!officerProfile) {
        toast.error("Unknown officer QR code.");
        return;
      }

      // Check if already present
      const existing = masterList.find(o => o.userUid === officerUid);
      if (existing && existing.status === "present") {
        toast.info(`${officerProfile.displayName} is already marked present.`);
        return;
      }

      await markAttendance({
        meetingId: id,
        userId: officerUid,
        userDisplayName: officerProfile.displayName,
        status: "present",
        markedBy: userProfile.uid,
      });

      toast.success(`${officerProfile.displayName} marked present!`);
      // loadData() no longer needed due to onSnapshot
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark attendance.");
    }
  };

  const handleMarkAbsent = async () => {
    if (!id || !userProfile) return;
    if (!confirm("Are you sure you want to mark all pending officers as ABSENT? This cannot be easily undone.")) return;

    try {
      setLoading(true);
      const pendingOfficers = masterList.filter(o => o.status === "not_registered" && o.userUid);

      const promises = pendingOfficers.map(o =>
        markAttendance({
          meetingId: id,
          userId: o.userUid,
          userDisplayName: o.name,
          status: "absent",
          markedBy: userProfile.uid,
        })
      );

      await Promise.all(promises);
      toast.success(`Marked ${promises.length} officers as absent.`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to batch mark absent.");
    } finally {
      setLoading(false);
    }
  };

  const presentCount = masterList.filter((o) => o.status === "present").length;

  const exportEventPDF = () => {
    if (!meeting) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${meeting.title} — Attendance`, 14, 22);
    doc.setFontSize(10);
    doc.text(`${meeting.date} · ${meeting.time} · ${meeting.location}`, 14, 30);
    doc.text(`Rate: ${masterList.length > 0 ? Math.round((presentCount / masterList.length) * 100) : 0}%`, 14, 36);

    autoTable(doc, {
      startY: 44,
      head: [["#", "Officer", "ID Number", "Status", "Time"]],
      body: masterList.map((o, i) => [
        (i + 1).toString(),
        o.name, // Use the name from master list def to be consistent
        o.idNumber || "—",
        o.status === "present" ? "Present" : o.status === "absent" ? "Absent" : "Pending",
        o.checkInTime || "—",
      ]),
      theme: "grid",
      headStyles: { fillColor: [220, 38, 38] },
    });

    doc.save(`${meeting.title.toLowerCase().replace(/\s+/g, "-")}-attendance.pdf`);
  };

  const pendingList = masterList.filter(o => o.status !== "present");
  const presentList = masterList.filter(o => o.status === "present");

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!meeting) {
    return (
      <DashboardLayout role="admin">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Meeting not found.</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate("/admin")}>
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 h-[calc(100vh-100px)] flex flex-col">

        {/* Header Section - Intelligence Briefing Style */}
        <motion.div variants={item} className="flex flex-col gap-4 sm:gap-6 bg-secondary/20 backdrop-blur-md border border-border/40 rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-background shrink-0 relative overflow-hidden">
          {/* Background Glow */}
          <div className={`absolute -right-16 -top-16 w-64 h-64 blur-[100px] opacity-20 ${isStarted ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 sm:gap-8 relative z-10">
            {/* Timer & Basic Info */}
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 w-full">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-background/50 hover:bg-background border border-border/40 shrink-0">
                <ArrowLeft size={20} className="sm:size-24" />
              </Button>
              <div className="space-y-2 sm:space-y-3 min-w-0">
                <div className={`inline-flex items-center px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wide uppercase ${isStarted ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(220,38,38,0.2)]" : "bg-secondary text-muted-foreground border border-border/40"}`}>
                  <Clock size={12} className={`mr-2 ${isStarted ? "animate-spin-slow" : ""}`} />
                  {elapsedTime}
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-[900] tracking-tighter leading-none truncate w-full">
                  {meeting.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] sm:text-xs font-medium text-muted-foreground opacity-60">
                  <span className="flex items-center gap-1.5"><CalendarDays size={12} />{meeting.date}</span>
                  <span className="opacity-30">/</span>
                  <span className="flex items-center gap-1.5"><Clock size={12} />{meeting.time}</span>
                  <span className="opacity-30">/</span>
                  <span className="flex items-center gap-1.5"><MapPin size={12} />{meeting.location}</span>
                </div>
              </div>
            </div>

            {/* Actions & QR */}
            <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="icon" variant="outline" className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-background/50 border-2 hover:bg-background transition-all">
                    <QrCode size={24} className="sm:size-28" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm rounded-[32px] overflow-hidden border-none p-0">
                  <div className="bg-gradient-to-br from-primary to-primary-foreground p-8">
                    <DialogHeader className="mb-6">
                      <DialogTitle className="font-black text-white text-2xl text-center uppercase tracking-tighter">Session Key</DialogTitle>
                    </DialogHeader>
                    <div className="bg-white p-6 rounded-[24px] shadow-2xl flex items-center justify-center">
                      <QRCode
                        value={`${window.location.origin}/meeting/${id}/checkin`}
                        size={220}
                        fgColor="#dc2626"
                      />
                    </div>
                    <p className="text-xs text-white/80 text-center font-black uppercase tracking-widest mt-6">
                      Officer Secure Access
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Button onClick={() => setScannerOpen(true)} className="flex-1 md:flex-none h-12 sm:h-14 px-4 sm:px-8 rounded-2xl font-[900] tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-[11px] sm:text-sm uppercase">
                <ScanLine size={18} className="mr-2 sm:mr-3" />
                CAPTURE ID
              </Button>

              <Button variant="outline" onClick={exportEventPDF} className="h-12 w-12 sm:h-14 sm:w-14 p-0 rounded-2xl border-2 hover:bg-secondary/50">
                <FileDown size={20} className="sm:size-24" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Content Split: Pending vs Present */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">

          {/* LEFT: Pending / Absent / No Account */}
          <motion.div variants={item} className="flex flex-col gap-6 bg-secondary/10 rounded-[32px] p-6 border border-border/40 min-h-0 overflow-hidden backdrop-blur-sm">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-lg font-[900] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3 opacity-60">
                <UserX size={20} className="text-primary" />
                EXPECTING · {pendingList.length}
              </h2>
              {pendingList.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleMarkAbsent}
                  className="h-8 px-4 rounded-lg font-black text-[10px] uppercase tracking-widest"
                >
                  BATCH ABSENT
                </Button>
              )}
            </div>

            <div className="overflow-y-auto pr-2 space-y-3 flex-1 scrollbar-hide">
              {pendingList.map(officer => (
                <div key={officer.name} className="flex items-center justify-between bg-background/40 hover:bg-background/80 p-3 sm:p-4 rounded-2xl border border-border/20 transition-all group">
                  <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-secondary flex items-center justify-center text-[10px] sm:text-xs font-black text-muted-foreground border border-border/50 group-hover:border-primary/20 transition-colors shrink-0">
                      {officer.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-[900] text-sm sm:text-base leading-none mb-1 group-hover:text-primary transition-colors truncate">{officer.name}</p>
                      <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground opacity-60 truncate">{officer.position}</p>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    {officer.status === "absent" && (
                      <Badge variant="destructive" className="rounded-lg px-2 sm:px-3 py-1 font-black text-[8px] sm:text-[9px]">ABSENT</Badge>
                    )}
                    {officer.status === "no_account" && (
                      <Badge variant="outline" className="rounded-lg px-2 sm:px-3 py-1 text-muted-foreground border-dashed border-2 font-black text-[8px] sm:text-[9px] opacity-40">PENDING</Badge>
                    )}
                    {officer.status === "not_registered" && (
                      <Badge variant="secondary" className="rounded-lg px-2 sm:px-3 py-1 text-primary font-black text-[8px] sm:text-[9px] bg-primary/5 border border-primary/10">WAITING</Badge>
                    )}
                  </div>
                </div>
              ))}
              {pendingList.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 py-12">
                  <CheckCircle2 size={48} className="mb-4 text-primary opacity-20" />
                  <p className="text-lg font-black tracking-tight">Mission Accomplished</p>
                  <p className="text-xs font-bold uppercase tracking-widest">Everyone is Present</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* RIGHT: Present */}
          <motion.div variants={item} className="flex flex-col gap-6 bg-primary/5 rounded-[32px] p-6 border border-primary/20 min-h-0 overflow-hidden relative backdrop-blur-sm">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32" />

            <div className="flex items-center justify-between shrink-0 relative z-10">
              <h2 className="text-lg font-[900] uppercase tracking-[0.2em] text-primary flex items-center gap-3">
                <CheckCircle2 size={20} />
                CONFIRMED · {presentList.length}
              </h2>
              <div className="text-[10px] font-black text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 tracking-[0.1em] uppercase">
                {Math.round((presentList.length / masterList.length) * 100) || 0}% ARRIVAL RATE
              </div>
            </div>

            <div className="overflow-y-auto pr-2 space-y-3 flex-1 relative z-10 scrollbar-hide">
              {presentList.map(officer => (
                <div key={officer.name} className="flex items-center justify-between bg-background/50 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-primary/10 shadow-lg shadow-primary/5 transition-all hover:scale-[1.01] gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                    {officer.userPhoto ? (
                      <img src={officer.userPhoto} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover ring-2 ring-primary/10 shrink-0" alt="" />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-[10px] sm:text-sm font-[900] border border-primary/20 shadow-inner shrink-0">
                        {officer.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-[900] text-sm sm:text-base leading-none mb-1 truncate">{officer.name}</p>
                      <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground opacity-60 truncate">{officer.position}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-bold text-primary flex items-center gap-1.5 justify-end italic tracking-tighter">
                      <Clock size={10} className="sm:size-12" />
                      {officer.checkInTime}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium opacity-40 mt-1 truncate max-w-[60px] sm:max-w-none">
                      {officer.idNumber || "Check"}
                    </p>
                  </div>
                </div>
              ))}
              {presentList.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 py-12">
                  <AlertCircle size={48} className="mb-4 opacity-20" />
                  <p className="text-lg font-black tracking-tight">System Idle</p>
                  <p className="text-xs font-bold uppercase tracking-widest">No verified check-ins</p>
                </div>
              )}
            </div>
          </motion.div>

        </div>

        {/* Manual ID Check-in Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <div className="hidden" id="manual-trigger"></div>
          </DialogTrigger>
          <DialogContent>
            {/* Re-use existing manual check-in form logic if needed, or trigger via button above */}
          </DialogContent>
        </Dialog>

      </motion.div>

      <QrScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScanOfficerQR}
        title="Scan Officer QR"
      />
    </DashboardLayout>
  );
};

export default EventDetails;
