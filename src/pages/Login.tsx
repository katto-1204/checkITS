import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { getUserByIdNumber } from "@/lib/firestore";

const Login = () => {
  const navigate = useNavigate();
  const { firebaseUser, userProfile, loading, signInWithGoogle, signInWithEmail } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && firebaseUser && userProfile) {
      navigate(userProfile.role === "admin" ? "/admin" : "/officer", { replace: true });
    }
  }, [loading, firebaseUser, userProfile, navigate]);

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    await signInWithGoogle();
    setIsSigningIn(false);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);

    try {
      let loginEmail = email;

      // 1. If using ID Number (no @), check Firestore first
      if (!email.includes("@")) {
        try {
          const user = await getUserByIdNumber(email);

          if (!user) {
            // User does ONLY exist if they have a Firestore profile
            // If checking by ID and no profile found -> Show "No Account" modal immediately
            setNoAccountOpen(true);
            setIsSigningIn(false);
            return;
          }

          // User found, proceed to auth with their email
          loginEmail = user.email;

        } catch (idErr) {
          // Check failed (likely network or permissions), might be risky to show "No Account" 
          // but we'll fall through to normal auth as backup
          console.warn("ID lookup failed:", idErr);
          // Default construct email if lookup fails
          loginEmail = `${email}@checkits.local`;
        }
      }

      // 2. Attempt Sign In
      // At this point, we either have a valid email from Firestore OR we are trying a direct email login
      await signInWithEmail(loginEmail, password);

    } catch (err: any) {
      console.error("Login flow caught error:", err);
      // AuthContext handles most toasts, but we can verify if simple retry needed
    } finally {
      setIsSigningIn(false);
    }
  };

  const [noAccountOpen, setNoAccountOpen] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Logo / Brand */}
        <div className="text-center mb-10 flex flex-col items-center">
          <motion.img
            src="/itslogo.png"
            alt="ITS Logo"
            className="w-24 h-24 mb-4 object-contain drop-shadow-lg"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0, duration: 0.4 }}
          />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <h1 className="text-5xl md:text-6xl font-black tracking-tight">
              Check<span className="text-gradient">ITS</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm tracking-widest uppercase">
              Attendance Tracker
            </p>
          </motion.div>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="glass-card rounded-lg p-8 relative overflow-hidden"
        >
          {/* Admin Indicator/Banner */}
          {isAdminLogin && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
          )}

          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold">{isAdminLogin ? "Admin Login" : "Officer Login"}</h2>
              <p className="text-sm text-muted-foreground">
                {isAdminLogin ? "Enter Admin Credentials" : "Enter your ID Number"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAdminLogin(!isAdminLogin)}
              className={isAdminLogin ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-muted-foreground"}
            >
              {isAdminLogin ? "Switch to Officer" : "Admin?"}
            </Button>
          </div>

          {/* ID Number + Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4 mb-5">
            <div className="space-y-2">
              <Label htmlFor="email">{isAdminLogin ? "Username" : "ID Number"}</Label>
              <Input
                id="email"
                type="text"
                placeholder={isAdminLogin ? "admin" : "e.g. 59800000"}
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                className="bg-secondary border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary border-border pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className={`w-full h-11 font-bold ${isAdminLogin ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700" : ""}`}
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                  className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                />
              ) : (
                isAdminLogin ? "Login as Admin" : "Sign In"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google Sign-in */}
          <Button
            variant="secondary"
            className="w-full h-11 font-semibold"
            onClick={handleGoogleLogin}
            disabled={isSigningIn}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Log in with your <span className="font-bold">ID Number</span> or <span className="font-bold">School Email</span>.
          </p>

          {/* Create Account Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-primary font-semibold hover:underline"
            >
              Create Account
            </Link>
          </p>
        </motion.div>
      </motion.div>

      {/* No Account Found Modal */}
      {noAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card w-full max-w-sm rounded-xl shadow-xl border p-6 text-center"
          >
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <EyeOff size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">No Account Found</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Use your ID Number to create an account first.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setNoAccountOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => navigate("/register")}>
                Create Account
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Login;
