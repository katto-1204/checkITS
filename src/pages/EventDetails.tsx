import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, Clock, QrCode, FileDown, ScanLine, Edit, UserX, AlertCircle } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import {
  getMeeting,
  getAttendanceForMeeting,
  getAllUsers,
  markAttendance,
  getUser,
  Meeting,
} from "@/lib/firestore";
import { toast } from "sonner";
import { OFFICERS_2025_2026 } from "@/lib/officers";

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

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [meetingData, attendanceData, allUsers] = await Promise.all([
        getMeeting(id),
        getAttendanceForMeeting(id),
        getAllUsers(),
      ]);

      setMeeting(meetingData);

      // Map Master List to Users and Attendance
      const mapped = OFFICERS_2025_2026.map((def) => {
        // 1. Find if they have an account (fuzzy match name)
        const user = allUsers.find(u =>
          u.displayName.toLowerCase().includes(def.name.toLowerCase()) ||
          def.name.toLowerCase().includes(u.displayName.toLowerCase())
        );

        // 2. Find attendance
        const record = user
          ? attendanceData.find(a => a.userId === user.uid)
          : attendanceData.find(a => a.userDisplayName.toLowerCase() === def.name.toLowerCase());

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

      setMasterList(mapped);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      loadData();
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
      loadData();
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

        {/* Header Section */}
        <motion.div variants={item} className="flex flex-col gap-4 bg-card border rounded-xl p-6 shadow-sm shrink-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

            {/* Timer & Basic Info */}
            <div className="flex items-start gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="-ml-2">
                <ArrowLeft size={24} />
              </Button>
              <div className="space-y-1">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-inconsolata font-bold tracking-widest ${isStarted ? "bg-red-500/10 text-red-600 animate-pulse" : "bg-secondary text-muted-foreground"}`}>
                  <Clock size={16} className="mr-2" />
                  {elapsedTime}
                </div>
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-none text-primary">
                  {meeting.title}
                </h1>
                <p className="text-lg text-muted-foreground font-medium flex flex-wrap gap-4">
                  <span>{meeting.date}</span>
                  <span className="opacity-30">•</span>
                  <span>{meeting.time}</span>
                  <span className="opacity-30">•</span>
                  <span>{meeting.location}</span>
                </p>
              </div>
            </div>

            {/* Actions & QR */}
            <div className="flex items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="icon" variant="outline" className="w-12 h-12 rounded-xl">
                    <QrCode size={24} />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-center font-bold">Event QR Code</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col items-center p-4">
                    <div className="bg-white p-4 rounded-xl shadow-lg">
                      <QRCode value={`checkits://meeting/${id}/checkin`} size={250} />
                    </div>
                    <p className="mt-4 text-center text-sm text-muted-foreground">Officer Check-in</p>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="secondary" onClick={() => setScannerOpen(true)} className="h-12 px-6 font-bold text-base">
                <ScanLine size={18} className="mr-2" />
                Scan ID
              </Button>

              <Button variant="outline" onClick={exportEventPDF} className="h-12 w-12 p-0 rounded-xl">
                <FileDown size={20} />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Content Split: Pending vs Present */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">

          {/* LEFT: Pending / Absent / No Account */}
          <motion.div variants={item} className="flex flex-col gap-4 bg-muted/30 rounded-xl p-4 border min-h-0 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-lg font-black uppercase text-muted-foreground flex items-center gap-2">
                <UserX size={18} />
                Expecting ({pendingList.length})
              </h2>
              {pendingList.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleMarkAbsent}
                  className="text-xs font-bold"
                >
                  Mark All Absent
                </Button>
              )}
            </div>

            <div className="overflow-y-auto pr-2 space-y-2 flex-1">
              {pendingList.map(officer => (
                <div key={officer.name} className="flex items-center justify-between bg-card p-3 rounded-lg border shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {officer.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight">{officer.name}</p>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">{officer.position}</p>
                    </div>
                  </div>
                  <div>
                    {officer.status === "absent" && (
                      <Badge variant="destructive">Absent</Badge>
                    )}
                    {officer.status === "no_account" && (
                      <Badge variant="outline" className="text-muted-foreground border-dashed">No Account</Badge>
                    )}
                    {officer.status === "not_registered" && (
                      <Badge variant="secondary" className="text-orange-500 bg-orange-500/10 hover:bg-orange-500/20">Pending</Badge>
                    )}
                  </div>
                </div>
              ))}
              {pendingList.length === 0 && (
                <div className="h-32 flex flex-col items-center justify-center text-muted-foreground/50">
                  <CheckCircle2 size={32} />
                  <p className="text-sm font-medium mt-2">Everyone is here!</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* RIGHT: Present */}
          <motion.div variants={item} className="flex flex-col gap-4 bg-green-500/5 rounded-xl p-4 border border-green-500/20 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-lg font-black uppercase text-green-700 flex items-center gap-2">
                <CheckCircle2 size={18} />
                Present ({presentList.length})
              </h2>
              <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded-full">
                {Math.round((presentList.length / masterList.length) * 100) || 0}% Rate
              </span>
            </div>

            <div className="overflow-y-auto pr-2 space-y-2 flex-1">
              {presentList.map(officer => (
                <div key={officer.name} className="flex items-center justify-between bg-card p-3 rounded-lg border-l-4 border-l-green-500 shadow-sm">
                  <div className="flex items-center gap-3">
                    {officer.userPhoto ? (
                      <img src={officer.userPhoto} className="w-10 h-10 rounded-full object-cover bg-secondary" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                        {officer.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm leading-tight text-foreground">{officer.name}</p>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">{officer.position}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-green-600 flex items-center gap-1 justify-end">
                      <Clock size={10} />
                      {officer.checkInTime}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {officer.idNumber || "NO ID"}
                    </p>
                  </div>
                </div>
              ))}
              {presentList.length === 0 && (
                <div className="h-32 flex flex-col items-center justify-center text-muted-foreground/50">
                  <AlertCircle size={32} />
                  <p className="text-sm font-medium mt-2">No check-ins yet.</p>
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
