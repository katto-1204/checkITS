import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import FirstTimeModal from "@/components/FirstTimeModal";

const Login = () => {
  const navigate = useNavigate();
  const { firebaseUser, userProfile, loading, signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showFirstTime, setShowFirstTime] = useState(false);

  // Redirect if already logged in and profile complete
  useEffect(() => {
    if (!loading && firebaseUser && userProfile) {
      if (!userProfile.isProfileComplete) {
        setShowFirstTime(true);
      } else {
        navigate(userProfile.role === "admin" ? "/admin" : "/officer", { replace: true });
      }
    }
  }, [loading, firebaseUser, userProfile, navigate]);

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    await signInWithGoogle();
    setIsSigningIn(false);
  };

  const handleFirstTimeComplete = () => {
    setShowFirstTime(false);
    if (userProfile) {
      navigate(userProfile.role === "admin" ? "/admin" : "/officer", { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Logo / Brand */}
        <div className="text-center mb-10">
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
          className="glass-card rounded-lg p-8"
        >
          <h2 className="text-xl font-bold mb-2">Sign In</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Use your <strong>@hcdc.edu.ph</strong> Google account to continue.
          </p>

          <Button
            className="w-full h-12 font-bold text-base"
            onClick={handleGoogleLogin}
            disabled={isSigningIn}
          >
            {isSigningIn ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
              />
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Only <strong>@hcdc.edu.ph</strong> emails are accepted.
          </p>
        </motion.div>
      </motion.div>

      {/* First-time profile modal */}
      <FirstTimeModal open={showFirstTime} onComplete={handleFirstTimeComplete} />
    </div>
  );
};

export default Login;
