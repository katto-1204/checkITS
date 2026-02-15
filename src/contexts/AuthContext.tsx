import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import {
    User,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { createUser, getUser, isFirstUser, UserProfile, updateUserProfile } from "@/lib/firestore";
import { toast } from "sonner";

interface RegisterData {
    fullName: string;
    email: string;
    password: string;
    idNumber: string;
    category: string;
    position: string;
    schoolYear: string;
}

interface AuthContextValue {
    firebaseUser: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    registerWithEmail: (data: RegisterData) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Listen to auth state
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            setFirebaseUser(user);
            if (user) {
                try {
                    const profile = await getUser(user.uid);
                    setUserProfile(profile);
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    // If we can't read the profile (e.g. permissions or doesn't exist), 
                    // we'll treat them as having no profile yet.
                    setUserProfile(null);
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });
        return unsub;
    }, []);

    const refreshProfile = async () => {
        if (firebaseUser) {
            const profile = await getUser(firebaseUser.uid);
            setUserProfile(profile);
        }
    };

    const signInWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const email = user.email || "";

            if (!email.endsWith("@hcdc.edu.ph")) {
                await firebaseSignOut(auth);
                setFirebaseUser(null);
                setUserProfile(null);
                toast.error("Only @hcdc.edu.ph emails are allowed.");
                return;
            }

            let profile = await getUser(user.uid);
            if (!profile) {
                const first = await isFirstUser();
                await createUser(user.uid, {
                    email,
                    displayName: user.displayName || "",
                    photoURL: user.photoURL || "",
                    role: first ? "admin" : "officer",
                });
                profile = await getUser(user.uid);
            }

            setUserProfile(profile);
        } catch (error: any) {
            console.error("Google sign-in error:", error);
            if (error.code === "permission-denied" || error.message.includes("Missing or insufficient permissions")) {
                toast.error("Database permission denied. Please check your Firestore Security Rules.");
            } else if (error.code !== "auth/popup-closed-by-user") {
                toast.error("Sign-in failed. Please try again.");
            }
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        try {
            if (!email.endsWith("@hcdc.edu.ph")) {
                toast.error("Only @hcdc.edu.ph emails are allowed.");
                return;
            }

            const result = await signInWithEmailAndPassword(auth, email, password);
            const profile = await getUser(result.user.uid);

            if (!profile) {
                await firebaseSignOut(auth);
                toast.error("Account not found. Please create an account first.");
                return;
            }

            setUserProfile(profile);
        } catch (error: any) {
            console.error("Sign-in error:", error);
            if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
                toast.error("Invalid email or password.");
            } else if (error.code === "auth/wrong-password") {
                toast.error("Incorrect password.");
            } else if (error.code === "permission-denied" || error.message.includes("Missing or insufficient permissions")) {
                toast.error("Database permission denied. Please check your Firestore Security Rules.");
            } else {
                toast.error("Sign-in failed. Please try again.");
            }
        }
    };

    const registerWithEmail = async (data: RegisterData) => {
        try {
            if (!data.email.endsWith("@hcdc.edu.ph")) {
                toast.error("Only @hcdc.edu.ph emails are allowed.");
                return;
            }

            const result = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = result.user;

            // Update Firebase Auth display name
            await updateProfile(user, { displayName: data.fullName });

            // Check if first user → admin
            const first = await isFirstUser();

            // Create Firestore user doc with all the registration data
            await createUser(user.uid, {
                email: data.email,
                displayName: data.fullName,
                photoURL: "",
                role: first ? "admin" : "officer",
            });

            // Update with extra fields
            await updateUserProfile(user.uid, {
                idNumber: data.idNumber,
                position: `${data.category} - ${data.position}`,
                schoolYear: data.schoolYear,
                isProfileComplete: true,
            });

            // Sign out after registration so they can sign in
            await firebaseSignOut(auth);
            setFirebaseUser(null);
            setUserProfile(null);

            toast.success("Account created! Please sign in.");
        } catch (error: any) {
            if (error.code === "auth/email-already-in-use") {
                toast.error("An account with this email already exists.");
            } else if (error.code === "auth/weak-password") {
                toast.error("Password must be at least 6 characters.");
            } else {
                toast.error("Registration failed. Please try again.");
                console.error(error);
            }
        }
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        setFirebaseUser(null);
        setUserProfile(null);
    };

    return (
        <AuthContext.Provider
            value={{
                firebaseUser,
                userProfile,
                loading,
                signInWithGoogle,
                signInWithEmail,
                registerWithEmail,
                signOut,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
