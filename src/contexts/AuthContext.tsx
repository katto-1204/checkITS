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
import { createUser, getUser, isFirstUser, UserProfile, updateUserProfile, getUserByIdNumber } from "@/lib/firestore";
import { toast } from "sonner";
import { AuthContext, AuthContextValue, RegisterData } from "@/hooks/useAuth";

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

    const signInWithEmail = async (identifier: string, password: string, verificationEmail?: string) => {
        try {
            const email = identifier.includes("@") ? identifier : `${identifier}@checkits.local`;

            const result = await signInWithEmailAndPassword(auth, email, password);
            const profile = await getUser(result.user.uid);

            if (!profile) {
                console.warn("User signed in but has no Firestore profile.");
            } else if (verificationEmail && profile.email.toLowerCase() !== verificationEmail.toLowerCase()) {
                await firebaseSignOut(auth);
                throw new Error("CREDENTIAL_MISMATCH");
            }

            setUserProfile(profile);
        } catch (error: any) {
            console.error("Sign-in error:", error);

            if (error.message === "CREDENTIAL_MISMATCH") {
                toast.error("ID and Email do not match our records.");
                throw error;
            }

            if (error.code === "auth/user-not-found") {
                toast.error("Account not found. Please register first.");
                throw new Error("NO_ACCOUNT");
            } else if (error.code === "auth/invalid-credential") {
                toast.error("Invalid credentials. Please check your ID and Password.");
            } else if (error.code === "auth/wrong-password") {
                toast.error("Incorrect password.");
            } else if (error.code === "permission-denied" || error.message.includes("Missing or insufficient permissions")) {
                toast.error("Database permission denied. Are you an admin?");
            } else {
                toast.error("Sign-in failed. Please try again.");
            }
            throw error;
        }
    };

    const registerWithEmail = async (data: RegisterData & { role: "admin" | "officer" }) => {
        try {
            if (data.idNumber) {
                try {
                    const existingUser = await getUserByIdNumber(data.idNumber);
                    if (existingUser) {
                        throw new Error(`The ID Number ${data.idNumber} is already registered.`);
                    }
                } catch (err: any) {
                    if (err.message.includes("permission") || err.code === "permission-denied") {
                        console.warn("Permission denied checking ID uniqueness, proceeding anyway...");
                    } else {
                        throw err;
                    }
                }
            }

            const authEmail = data.idNumber ? `${data.idNumber.trim()}@checkits.local` : data.email;
            const result = await createUserWithEmailAndPassword(auth, authEmail, data.password);
            const user = result.user;

            await updateProfile(user, { displayName: data.fullName });

            await createUser(user.uid, {
                email: data.email,
                displayName: data.fullName,
                photoURL: "",
                role: data.role,
            });

            await updateUserProfile(user.uid, {
                idNumber: data.idNumber || "",
                position: data.position,
                schoolYear: data.schoolYear,
                isProfileComplete: true,
            });

            await firebaseSignOut(auth);
            setFirebaseUser(null);
            const loginMsg = data.idNumber ? "ID Number" : "Email";
            toast.success(`Account created! Please sign in with your ${loginMsg}.`);
        } catch (error: any) {
            if (error.code === "auth/email-already-in-use") {
                toast.error("An account with this email already exists.");
            } else if (error.code === "auth/weak-password") {
                toast.error("Password must be at least 6 characters.");
            } else {
                toast.error("Registration failed. Please try again.");
                console.error(error);
            }
            throw error;
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
