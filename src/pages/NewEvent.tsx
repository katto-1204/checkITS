import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, Clock, MapPin, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { createMeeting } from "@/lib/firestore";
import { toast } from "sonner";

const NewEvent = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [room, setRoom] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setSaving(true);
    try {
      await createMeeting({
        title,
        date,
        time,
        location,
        room,
        description,
        createdBy: userProfile.uid,
        schoolYear: userProfile.schoolYear || "",
      });
      toast.success("Meeting created!");
      navigate("/admin");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create meeting.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-10"
      >
        <div className="flex items-center gap-4 sm:gap-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-secondary/50 border border-border/40 hover:bg-background shrink-0">
            <ArrowLeft size={20} className="sm:size-24" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-[900] tracking-tighter leading-none truncate">
              Create <span className="text-primary italic">Session</span>
            </h1>
            <p className="text-muted-foreground mt-2 font-medium flex items-center gap-2 text-[10px] opacity-70">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary" />
              Schedule Events for important meetings
            </p>
          </div>
        </div>

        <Card className="bg-secondary/20 backdrop-blur-md border-border/40 rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-2xl shadow-background relative">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32" />

          <CardContent className="p-6 md:p-12 relative z-10">
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              <div className="space-y-3">
                <Label htmlFor="title" className="text-[10px] font-bold tracking-wide text-muted-foreground ml-1">Meeting Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. STRATEGIC GENERAL ASSEMBLY"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-12 sm:h-14 bg-background/50 border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 rounded-xl sm:rounded-2xl transition-all font-[900] tracking-tight text-base sm:text-lg placeholder:opacity-30 uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-3">
                  <Label htmlFor="date" className="text-[10px] font-bold tracking-wide text-muted-foreground ml-1">Deployment Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-12 sm:h-14 bg-background/50 border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 rounded-xl sm:rounded-2xl transition-all font-bold"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="time" className="text-[10px] font-bold tracking-wide text-muted-foreground ml-1">Execution Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-12 sm:h-14 bg-background/50 border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 rounded-xl sm:rounded-2xl transition-all font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-3">
                  <Label htmlFor="location" className="text-[10px] font-bold tracking-wide text-muted-foreground ml-1">Primary Sector (Building)</Label>
                  <Input
                    id="location"
                    placeholder="e.g. EXPANSION HALL"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-12 sm:h-14 bg-background/50 border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 rounded-xl sm:rounded-2xl transition-all font-bold uppercase placeholder:opacity-30"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="room" className="text-[10px] font-bold tracking-wide text-muted-foreground ml-1">Specific Unit (Room)</Label>
                  <Input
                    id="room"
                    placeholder="e.g. ROOM 404"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="h-12 sm:h-14 bg-background/50 border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 rounded-xl sm:rounded-2xl transition-all font-bold uppercase placeholder:opacity-30"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="desc" className="text-[10px] font-bold tracking-wide text-muted-foreground ml-1">Briefing Memo</Label>
                <Textarea
                  id="desc"
                  placeholder="Provide essential details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-background/50 border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 rounded-xl sm:rounded-2xl transition-all min-h-[100px] sm:min-h-[120px] font-medium"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <Button type="submit" className="flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl font-[900] tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase text-xs sm:text-sm" disabled={saving}>
                  {saving ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-4 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Create Meeting"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/admin")} className="h-12 sm:h-14 px-10 rounded-xl sm:rounded-2xl font-black border-2 uppercase tracking-widest text-[10px]">
                  CANCEL
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};

export default NewEvent;
