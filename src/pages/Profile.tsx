import { useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
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
        className="max-w-xl mx-auto space-y-6"
      >
        <h1 className="text-3xl font-black">Profile</h1>

        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt=""
                className="w-24 h-24 rounded-full ring-4 ring-primary/30"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-3xl font-black ring-4 ring-primary/30">
                {initials}
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold">Personal Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={userProfile?.email || ""}
                disabled
                className="bg-secondary border-border opacity-60"
              />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>ID Number</Label>
              <Input
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>School Year</Label>
              <Input
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={userProfile?.role || ""}
                disabled
                className="bg-secondary border-border opacity-60 capitalize"
              />
            </div>
            <Button
              className="w-full font-bold"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};

export default Profile;
