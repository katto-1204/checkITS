import { motion } from "framer-motion";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useState, useEffect, useCallback } from "react";
import {
  getMeetings,
  getAttendanceForMeeting,
  getAllUsers,
  Meeting,
  UserProfile,
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

interface OfficerStat {
  name: string;
  rate: number;
  events: number;
}

const Reports = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [officerStats, setOfficerStats] = useState<OfficerStat[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [allMeetings, allUsers] = await Promise.all([
        getMeetings(),
        getAllUsers(),
      ]);

      setMeetings(allMeetings);

      // Calculate per-officer stats
      const officers = allUsers.filter((u) => u.role === "officer");
      const stats: OfficerStat[] = [];

      for (const officer of officers) {
        let presentCount = 0;
        for (const meeting of allMeetings) {
          const attendance = await getAttendanceForMeeting(meeting.id);
          const record = attendance.find((a) => a.userId === officer.uid);
          if (record && record.status === "present") presentCount++;
        }

        stats.push({
          name: officer.displayName,
          rate: allMeetings.length > 0 ? Math.round((presentCount / allMeetings.length) * 100) : 0,
          events: presentCount,
        });
      }

      stats.sort((a, b) => b.rate - a.rate);
      setOfficerStats(stats);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const topOfficers = officerStats.slice(0, 3);
  const bottomOfficers = [...officerStats].sort((a, b) => a.rate - b.rate).slice(0, 3);

  const exportCSV = () => {
    const headers = ["Officer", "Attendance Rate", "Events Attended"];
    const rows = officerStats.map((o) => `${o.name},${o.rate}%,${o.events}`);
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "checkits-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("CheckITS — Analytics Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total Meetings: ${meetings.length}`, 14, 36);

    if (officerStats.length > 0) {
      autoTable(doc, {
        startY: 44,
        head: [["Officer", "Attendance Rate", "Events Attended"]],
        body: officerStats.map((o) => [o.name, `${o.rate}%`, o.events.toString()]),
        theme: "grid",
        headStyles: { fillColor: [220, 38, 38] },
      });
    }

    doc.save("checkits-analytics-report.pdf");
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

  return (
    <DashboardLayout role="admin">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black">Reports</h1>
            <p className="text-muted-foreground mt-1">Analytics & performance insights</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportCSV} className="font-semibold">
              <Download size={16} className="mr-2" />
              CSV
            </Button>
            <Button onClick={exportPDF} className="font-semibold">
              <Download size={16} className="mr-2" />
              PDF
            </Button>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Total Meetings</p>
              <p className="text-3xl font-black">{meetings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Total Officers</p>
              <p className="text-3xl font-black">{officerStats.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Avg Attendance</p>
              <p className="text-3xl font-black">
                {officerStats.length > 0
                  ? Math.round(officerStats.reduce((a, b) => a + b.rate, 0) / officerStats.length)
                  : 0}
                %
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top / Bottom Officers */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp size={18} className="text-success" />
                Most Punctual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topOfficers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                topOfficers.map((o, i) => (
                  <div key={o.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-success/20 text-success text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <span className="font-medium text-sm">{o.name}</span>
                        <p className="text-xs text-muted-foreground">{o.events} events</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-success">{o.rate}%</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingDown size={18} className="text-destructive" />
                Needs Improvement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bottomOfficers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                bottomOfficers.map((o, i) => (
                  <div key={o.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-destructive/20 text-destructive text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <span className="font-medium text-sm">{o.name}</span>
                        <p className="text-xs text-muted-foreground">{o.events} events</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-destructive">{o.rate}%</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* All Officers */}
        {officerStats.length > 0 && (
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">All Officers</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {officerStats.map((o, i) => (
                    <div key={o.name} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-6">{i + 1}</span>
                        <span className="font-medium text-sm">{o.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">{o.events} events</span>
                        <span
                          className={`text-sm font-bold ${o.rate >= 80
                              ? "text-success"
                              : o.rate >= 50
                                ? "text-warning"
                                : "text-destructive"
                            }`}
                        >
                          {o.rate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default Reports;
