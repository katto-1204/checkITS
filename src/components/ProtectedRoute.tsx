import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole?: "admin" | "officer";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
    const { firebaseUser, userProfile, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!firebaseUser || !userProfile) {
        return <Navigate to="/login" replace />;
    }

    // If profile is incomplete, let them stay — the Login page shows the modal
    if (!userProfile.isProfileComplete) {
        return <Navigate to="/login" replace />;
    }

    // Role check
    if (requiredRole && userProfile.role !== requiredRole) {
        const redirect = userProfile.role === "admin" ? "/admin" : "/officer";
        return <Navigate to={redirect} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
