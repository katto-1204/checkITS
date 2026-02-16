import { useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { updateUserProfile } from "@/lib/firestore";
import { toast } from "sonner";

const Profile = () => {
  const { userProfile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || "");
  const [idNumber, setIdNumber] = useState(userProfile?.idNumber || "");
  const [position, setPosition] = useState(userProfile?.position || "");
  const [schoolYear, setSchoolYear] = useState(userProfile?.schoolYear || "");
  const [saving, setSaving] = useState(false);

  const role = userProfile?.role || "officer";
  const initials = displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const handleSave = async () => {
    if (!userProfile) return;
    setSaving(true);
    try {
      await updateUserProfile(userProfile.uid, {
        displayName,
        idNumber,
        position,
        schoolYear,
      });
      await refreshProfile();
      toast.success("Profile updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout role={role}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-8 pb-10"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>

        {/* Profile Header / Avatar Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20 rounded-2xl p-8 flex flex-col items-center gap-4 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt=""
                className="relative w-32 h-32 rounded-full ring-4 ring-white/20 shadow-xl object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-4xl font-black text-white ring-4 ring-white/20 shadow-xl">
                {initials}
              </div>
            )}
          </div>

          <div className="text-center relative z-10">
            <h2 className="text-2xl font-bold">{userProfile?.displayName || "User"}</h2>
            <p className="text-primary font-medium">{userProfile?.role === 'admin' ? 'Administrator' : userProfile?.position || 'Officer'}</p>
          </div>
        </motion.div>

        {/* Form Section */}
        <Card className="glass-card border-none bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-lg">
          <CardHeader>
            <CardTitle className="font-bold flex items-center gap-2">
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Full Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-background/50 border-border/50 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">ID Number</Label>
                <Input
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="bg-background/50 border-border/50 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Position</Label>
                <Input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="bg-background/50 border-border/50 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">School Year</Label>
                <Input
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  className="bg-background/50 border-border/50 h-11"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/10">
              <Label className="text-muted-foreground">Email Address (Read Only)</Label>
              <Input
                value={userProfile?.email || ""}
                disabled
                className="bg-secondary/30 border-transparent opacity-70"
              />
            </div>

            <div className="pt-4">
              <Button
                className="w-full h-12 font-bold text-lg shadow-lg shadow-primary/25"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};

export default Profile;
