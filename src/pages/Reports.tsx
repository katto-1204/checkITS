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
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-10">
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-[900] tracking-tighter leading-none">
              Intelligence <span className="text-primary italic">Reports</span>
            </h1>
            <p className="text-muted-foreground mt-2 font-medium flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Strategic Data & Performance Insights
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} className="h-10 px-5 rounded-xl font-bold border-2">
              <Download size={16} className="mr-2" />
              CSV Data
            </Button>
            <Button onClick={exportPDF} className="h-10 px-6 rounded-xl font-black shadow-lg shadow-primary/10">
              <Download size={16} className="mr-2" />
              PDF Analytic
            </Button>
          </div>
        </motion.div>

        {/* Summary Grid - High Energy Edition */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="bg-secondary/10 border-none rounded-[24px] overflow-hidden group">
            <CardContent className="p-8 text-center relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary/30 rounded-full group-hover:w-24 transition-all duration-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 opacity-60">Total Sessions</p>
              <p className="text-5xl font-[900] tracking-tighter">{meetings.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-secondary/10 border-none rounded-[24px] overflow-hidden group">
            <CardContent className="p-8 text-center relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary/30 rounded-full group-hover:w-24 transition-all duration-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 opacity-60">Officer Count</p>
              <p className="text-5xl font-[900] tracking-tighter">{officerStats.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-none rounded-[24px] overflow-hidden group border-2 border-primary/10">
            <CardContent className="p-8 text-center relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full group-hover:w-24 transition-all duration-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
              <p className="text-[10px] font-bold tracking-wide text-primary mb-3">Global Average</p>
              <p className="text-5xl font-[900] tracking-tighter text-primary">
                {officerStats.length > 0
                  ? Math.round(officerStats.reduce((a, b) => a + b.rate, 0) / officerStats.length)
                  : 0}
                %
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Analysis Columns */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="bg-secondary/20 border-border/40 rounded-[32px] overflow-hidden shadow-2xl shadow-background">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center text-success">
                  <TrendingUp size={22} />
                </div>
                ELITE PERFORMANCE
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-4">
              {topOfficers.length === 0 ? (
                <p className="text-sm text-muted-foreground opacity-50">Awaiting session data...</p>
              ) : (
                topOfficers.map((o, i) => (
                  <div key={o.name} className="flex items-center justify-between bg-background/40 p-4 rounded-2xl hover:bg-background/60 transition-colors border border-border/20">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-[900] italic text-success/20">#{i + 1}</span>
                      <div>
                        <span className="font-[900] text-lg tracking-tight leading-none mb-1 block">{o.name}</span>
                        <p className="text-[10px] font-bold tracking-wide text-muted-foreground opacity-60">{o.events} Events Completed</p>
                      </div>
                    </div>
                    <span className="text-2xl font-[900] text-success tracking-tighter italic">{o.rate}%</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-secondary/20 border-border/40 rounded-[32px] overflow-hidden shadow-2xl shadow-background">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center text-destructive">
                  <TrendingDown size={22} />
                </div>
                CRITICAL MONITORING
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-4">
              {bottomOfficers.length === 0 ? (
                <p className="text-sm text-muted-foreground opacity-50">Data pipeline inactive.</p>
              ) : (
                bottomOfficers.map((o, i) => (
                  <div key={o.name} className="flex items-center justify-between bg-background/40 p-4 rounded-2xl hover:bg-background/60 transition-colors border border-border/20">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-[900] italic text-destructive/20">#{i + 1}</span>
                      <div>
                        <span className="font-[900] text-lg tracking-tight leading-none mb-1 block">{o.name}</span>
                        <p className="text-[10px] font-bold tracking-wide text-muted-foreground opacity-60">{o.events} Events Completed</p>
                      </div>
                    </div>
                    <span className="text-2xl font-[900] text-destructive tracking-tighter italic">{o.rate}%</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Complete Directory */}
        {officerStats.length > 0 && (
          <motion.div variants={item}>
            <Card className="bg-secondary/10 border-none rounded-[32px] overflow-hidden backdrop-blur-md">
              <CardHeader className="p-6 sm:p-8 border-b border-border/40">
                <CardTitle className="text-xl sm:text-2xl font-black tracking-tighter">Personnel Performance Index</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/20">
                  {officerStats.map((o, i) => (
                    <div key={`${o.name}-${i}`} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 sm:px-8 py-4 sm:py-5 hover:bg-secondary/20 transition-all group gap-2 sm:gap-0">
                      <div className="flex items-center gap-4 sm:gap-5">
                        <span className="text-[10px] sm:text-xs font-bold text-muted-foreground w-4 sm:w-6 opacity-40 group-hover:opacity-100 transition-opacity">{(i + 1).toString().padStart(2, '0')}</span>
                        <span className="font-[900] text-base sm:text-lg tracking-tight group-hover:text-primary transition-colors truncate max-w-[180px] sm:max-w-none">{o.name}</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 ml-8 sm:ml-0">
                        <span className="text-[9px] sm:text-[10px] font-bold tracking-wide text-muted-foreground opacity-60">{o.events} Sessions</span>
                        <div className="w-16 sm:w-24 flex justify-end">
                          <span
                            className={`text-lg sm:text-xl font-black tracking-tighter italic ${o.rate >= 80
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
