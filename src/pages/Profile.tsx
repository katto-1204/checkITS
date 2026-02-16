import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, IdCard, Briefcase, Calendar, Mail, Save,
  MapPin, ShieldCheck, Award, Zap, TrendingUp,
  Camera, CheckCircle2, AlertCircle
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { updateUserProfile, createUser } from "@/lib/firestore";
import { toast } from "sonner";

const Profile = () => {
  const { firebaseUser, userProfile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || firebaseUser?.displayName || "");
  const [idNumber, setIdNumber] = useState(userProfile?.idNumber || "");
  const [position, setPosition] = useState(userProfile?.position || "");
  const [schoolYear, setSchoolYear] = useState(userProfile?.schoolYear || "");
  const [email, setEmail] = useState(userProfile?.email || "");
  const [saving, setSaving] = useState(false);

  // Sync state if userProfile loads later
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || "");
      setIdNumber(userProfile.idNumber || "");
      setPosition(userProfile.position || "");
      setSchoolYear(userProfile.schoolYear || "");
      setEmail(userProfile.email || "");
    }
  }, [userProfile]);

  const role = userProfile?.role || "officer";
  const isNewUser = !userProfile;
  const isDeterministicEmail = email.endsWith("@checkits.local") || (!email && firebaseUser?.email?.endsWith("@checkits.local"));

  const initials = (displayName || email || firebaseUser?.email || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSave = async () => {
    if (!firebaseUser) return;

    // Validation for email if it was previously deterministic or missing
    if (isDeterministicEmail && !email.endsWith("@hcdc.edu.ph")) {
      toast.error("Please provide a valid @hcdc.edu.ph email address.");
      return;
    }

    setSaving(true);
    try {
      if (isNewUser) {
        // Create initial profile if missing
        await createUser(firebaseUser.uid, {
          email: email || firebaseUser.email || "",
          displayName,
          photoURL: firebaseUser.photoURL || "",
          role: "officer",
        });
      }

      await updateUserProfile(firebaseUser.uid, {
        email, // Store the real email in Firestore
        displayName,
        idNumber,
        position,
        schoolYear,
        isProfileComplete: true,
      });

      await refreshProfile();
      toast.success(isNewUser ? "Profile created!" : "Profile updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile. Check permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout role={role}>
      <div className="max-w-5xl mx-auto space-y-8 pb-20">

        {/* Header / Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-card border shadow-2xl"
        >
          {/* Abstract Background Decor */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-3xl -mr-20 -mt-20 rounded-full" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 blur-3xl -ml-20 -mb-20 rounded-full" />

          <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
            {/* Avatar Section */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
              {firebaseUser?.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt=""
                  className="relative w-32 h-32 md:w-40 md:h-40 rounded-full ring-4 ring-background shadow-2xl object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-5xl font-black text-white ring-4 ring-background shadow-2xl">
                  {initials}
                </div>
              )}
              <button className="absolute bottom-2 right-2 p-2 bg-background border rounded-full shadow-lg hover:bg-secondary transition-colors">
                <Camera size={18} className="text-muted-foreground" />
              </button>
            </div>

            {/* Info Section */}
            <div className="text-center md:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                  {displayName || "Complete your Profile"}
                </h1>
                {userProfile?.isProfileComplete && (
                  <div className="flex items-center gap-1.5 bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">
                    <ShieldCheck size={14} /> Verified
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-muted-foreground font-medium">
                <div className="flex items-center gap-1.5">
                  <Briefcase size={16} className="text-primary" />
                  {userProfile?.role === 'admin' ? 'Administrator' : position || 'Officer'}
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-primary" />
                  HCDC - Davao
                </div>
                <div className="flex items-center gap-1.5 text-primary font-bold">
                  <IdCard size={16} />
                  {idNumber || "NO ID SET"}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {isNewUser && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4 text-amber-600"
          >
            <AlertCircle size={24} className="shrink-0" />
            <p className="text-sm font-semibold">
              Your profile record hasn't been created yet. Please fill out your details below to activate your account features.
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Settings Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card border-none bg-card/60 backdrop-blur-md shadow-xl overflow-hidden">
              <CardHeader className="border-b border-border/10 bg-white/5">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <User className="text-primary" size={20} />
                  Account Settings
                </CardTitle>
                <CardDescription>Update your personal and organizational identity</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground/80">Full Name</Label>
                    <div className="relative">
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Juan Dela Cruz"
                        className="bg-background/50 border-border/50 h-12 rounded-xl focus:ring-2 focus:ring-primary pl-10"
                      />
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground/80">ID Number</Label>
                    <div className="relative">
                      <Input
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        placeholder="e.g. 59800000"
                        className="bg-background/50 border-border/50 h-12 rounded-xl focus:ring-2 focus:ring-primary pl-10 font-mono"
                      />
                      <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground/80">Position</Label>
                    <div className="relative">
                      <Input
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        placeholder="e.g. Secretary"
                        className="bg-background/50 border-border/50 h-12 rounded-xl focus:ring-2 focus:ring-primary pl-10"
                      />
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground/80">School Year</Label>
                    <div className="relative">
                      <Input
                        value={schoolYear}
                        onChange={(e) => setSchoolYear(e.target.value)}
                        placeholder="e.g. 2024-2025"
                        className="bg-background/50 border-border/50 h-12 rounded-xl focus:ring-2 focus:ring-primary pl-10"
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Label className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                    <Mail size={14} /> Email Address
                  </Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!isDeterministicEmail && !!email}
                    placeholder="your.name@hcdc.edu.ph"
                    className={`h-12 rounded-xl transition-all ${!isDeterministicEmail && !!email
                      ? "bg-secondary/40 border-transparent opacity-80 cursor-not-allowed"
                      : "bg-background/50 border-primary/30 ring-2 ring-primary/10"
                      }`}
                  />
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <ShieldCheck size={10} />
                    {isDeterministicEmail
                      ? "Please enter your official @hcdc.edu.ph email address."
                      : "Account email managed by ITS Organization"}
                  </p>
                </div>

                <div className="pt-6">
                  <Button
                    className="w-full h-14 font-black text-xl rounded-2xl shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all group"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <div className="w-7 h-7 border-3 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save size={22} className="group-hover:rotate-12 transition-transform" />
                        {isNewUser ? "CREATE ACCOUNT" : "SYNC PROFILE"}
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity / Info Cards */}
          <div className="space-y-6">
            {/* Quick Stats Card */}
            <Card className="glass-card bg-primary shadow-xl shadow-primary/20 text-primary-foreground border-none">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Zap size={20} />
                  </div>
                  <h3 className="font-bold uppercase tracking-widest text-sm">Quick Insights</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-white/10 pb-3">
                    <span className="text-white/60 text-sm">Account Age</span>
                    <span className="font-bold">Active Student</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-white/10 pb-3">
                    <span className="text-white/60 text-sm">Auth Status</span>
                    <span className="flex items-center gap-1 font-bold">
                      <CheckCircle2 size={14} /> Secure
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-white/60 text-sm">Permissions</span>
                    <span className="font-bold">{role.toUpperCase()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievement Card */}
            <Card className="glass-card bg-card/60 border-none shadow-xl">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-4">
                  <Award size={32} />
                </div>
                <h4 className="font-bold text-lg">ITS Contributor</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Your contributions actively shape the digital growth of our local HCDC chapter.
                </p>
                <div className="w-full mt-6 space-y-2">
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "75%" }}
                      className="h-full bg-primary"
                    />
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground flex justify-between">
                    <span>PROFILE COMPLETION</span>
                    <span>75%</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
