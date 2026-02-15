import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, Clock, QrCode, FileDown, ScanLine } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import QRCode from "react-qr-code";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  AttendanceRecord,
  UserProfile,
} from "@/lib/firestore";
import { toast } from "sonner";

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
  const [officers, setOfficers] = useState<(UserProfile & { attendanceStatus: boolean; attendanceTime: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [meetingData, attendanceData, allUsers] = await Promise.all([
        getMeeting(id),
        getAttendanceForMeeting(id),
        getAllUsers(),
      ]);

      setMeeting(meetingData);

      // Map officers with their attendance status
      const officerUsers = allUsers.filter((u) => u.role === "officer");
      const mapped = officerUsers.map((officer) => {
        const record = attendanceData.find((a) => a.userId === officer.uid);
        return {
          ...officer,
          attendanceStatus: record?.status === "present",
          attendanceTime: record?.markedAt
            ? new Date(record.markedAt.seconds * 1000).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })
            : null,
        };
      });
      setOfficers(mapped);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load meeting details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleAttendance = async (officer: typeof officers[0]) => {
    if (!id || !userProfile) return;
    try {
      await markAttendance({
        meetingId: id,
        userId: officer.uid,
        userDisplayName: officer.displayName,
        status: officer.attendanceStatus ? "absent" : "present",
        markedBy: userProfile.uid,
      });
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update attendance.");
    }
  };

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

  const presentCount = officers.filter((o) => o.attendanceStatus).length;

  const exportEventPDF = () => {
    if (!meeting) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${meeting.title} — Attendance`, 14, 22);
    doc.setFontSize(10);
    doc.text(`${meeting.date} · ${meeting.time} · ${meeting.location}`, 14, 30);
    doc.text(`Rate: ${officers.length > 0 ? Math.round((presentCount / officers.length) * 100) : 0}%`, 14, 36);

    autoTable(doc, {
      startY: 44,
      head: [["#", "Officer", "ID Number", "Status", "Time"]],
      body: officers.map((o, i) => [
        (i + 1).toString(),
        o.displayName,
        o.idNumber || "—",
        o.attendanceStatus ? "Present" : "Absent",
        o.attendanceTime || "—",
      ]),
      theme: "grid",
      headStyles: { fillColor: [220, 38, 38] },
    });

    doc.save(`${meeting.title.toLowerCase().replace(/\s+/g, "-")}-attendance.pdf`);
  };

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
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Back + Title */}
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black">{meeting.title}</h1>
              <p className="text-sm text-muted-foreground">
                {meeting.date} · {meeting.time} · {meeting.location}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="font-semibold">
                  <QrCode size={16} className="mr-2" />
                  QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-bold">Meeting QR</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="bg-white p-4 rounded-xl">
                    <QRCode
                      value={`checkits://meeting/${id}/checkin`}
                      size={220}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Officers scan this code to check in
                  </p>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="secondary"
              className="font-semibold"
              onClick={() => setScannerOpen(true)}
            >
              <ScanLine size={16} className="mr-2" />
              Scan Officer
            </Button>

            {/* Manual ID Check-in */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="font-semibold">
                  <Edit size={16} className="mr-2" />
                  Manual ID
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manual Check-in</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const idNum = formData.get("idNumber") as string;
                    if (!idNum) return;

                    try {
                      const allUsers = await getAllUsers();
                      const officer = allUsers.find(u => u.idNumber === idNum);

                      if (!officer) {
                        toast.error("Officer with this ID not found.");
                        return;
                      }

                      await markAttendance({
                        meetingId: id!,
                        userId: officer.uid,
                        userDisplayName: officer.displayName,
                        status: "present",
                        markedBy: userProfile!.uid,
                      });
                      toast.success(`${officer.displayName} marked present.`);
                      loadData();
                      (e.target as HTMLFormElement).reset();
                    } catch (err) {
                      toast.error("Failed to mark attendance.");
                    }
                  }}
                  className="space-y-4 pt-4"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Officer ID Number</label>
                    <Input name="idNumber" placeholder="e.g. 2023-00123" required />
                  </div>
                  <Button type="submit" className="w-full">Mark Present</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button variant="secondary" onClick={exportEventPDF} className="font-semibold">
              <FileDown size={16} className="mr-2" />
              Export PDF
            </Button>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="mx-auto mb-1 text-success" size={20} />
              <p className="text-2xl font-black">{presentCount}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="mx-auto mb-1 text-destructive" size={20} />
              <p className="text-2xl font-black">{officers.length - presentCount}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-4 text-center">
              <Clock className="mx-auto mb-1 text-primary" size={20} />
              <p className="text-2xl font-black">
                {officers.length > 0 ? Math.round((presentCount / officers.length) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Rate</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Officers Table */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Officers</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {officers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No officers found.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {officers.map((officer) => (
                    <motion.div
                      key={officer.uid}
                      variants={item}
                      className="flex items-center justify-between px-6 py-4 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {officer.photoURL ? (
                          <img
                            src={officer.photoURL}
                            alt=""
                            className="w-8 h-8 rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                            {officer.displayName?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm">{officer.displayName}</p>
                          {officer.attendanceTime && (
                            <p className="text-xs text-muted-foreground">{officer.attendanceTime}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-semibold ${officer.attendanceStatus ? "text-success" : "text-destructive"
                            }`}
                        >
                          {officer.attendanceStatus ? "Present" : "Absent"}
                        </span>
                        <Switch
                          checked={officer.attendanceStatus}
                          onCheckedChange={() => toggleAttendance(officer)}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
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
