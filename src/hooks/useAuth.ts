import { createContext, useContext } from "react";
import { User } from "firebase/auth";
import { UserProfile } from "@/lib/firestore";

export interface RegisterData {
    fullName: string;
    email: string;
    password: string;
    idNumber: string;
    position: string;
    schoolYear: string;
}

export interface AuthContextValue {
    firebaseUser: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string, verificationEmail?: string) => Promise<void>;
    registerWithEmail: (data: RegisterData & { role: "admin" | "officer" }) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
