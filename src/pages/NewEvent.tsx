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
import { useAuth } from "@/contexts/AuthContext";
import { createMeeting } from "@/lib/firestore";
import { toast } from "sonner";

const NewEvent = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
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
        className="max-w-2xl mx-auto space-y-6"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl md:text-3xl font-black">New Meeting</h1>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. General Assembly"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-secondary border-border"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-secondary border-border"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="bg-secondary border-border"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Main Hall"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  placeholder="Meeting details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-secondary border-border min-h-[100px]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 font-bold" disabled={saving}>
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Create Meeting"
                  )}
                </Button>
                <Button type="button" variant="secondary" onClick={() => navigate("/admin")}>
                  Cancel
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
