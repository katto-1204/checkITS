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

    const signInWithEmail = async (identifier: string, password: string) => {
        try {
            // Check if identifier is an email, otherwise treat as ID number
            const email = identifier.includes("@") ? identifier : `${identifier}@checkits.local`;

            const result = await signInWithEmailAndPassword(auth, email, password);
            const profile = await getUser(result.user.uid);

            if (!profile) {
                await firebaseSignOut(auth);
                // Throw specific error for UI to handle
                throw new Error("NO_PROFILE");
            }

            setUserProfile(profile);
        } catch (error: any) {
            console.error("Sign-in error:", error);
            if (error.message === "NO_PROFILE") {
                throw error; // Propagate to caller
            }

            // If the user definitely doesn't exist (if detectable)
            if (error.code === "auth/user-not-found") {
                throw new Error("NO_ACCOUNT");
            } else if (error.code === "auth/invalid-credential") {
                toast.error("Invalid ID Number or password.");
            } else if (error.code === "auth/wrong-password") {
                toast.error("Incorrect password.");
            } else if (error.code === "permission-denied" || error.message.includes("Missing or insufficient permissions")) {
                toast.error("Database permission denied. Are you an admin?");
            } else {
                toast.error("Sign-in failed. Please try again.");
            }
        }
    };

    const registerWithEmail = async (data: RegisterData & { role: "admin" | "officer" }) => {
        try {
            // 1. Check if ID Number already exists in Firestore (Optional/Resilient)
            try {
                const existingUser = await getUserByIdNumber(data.idNumber);
                if (existingUser) {
                    throw new Error(`The ID Number ${data.idNumber} is already registered.`);
                }
            } catch (err: any) {
                // If it's a permission error, we proceed anyway as the rule might block unauthenticated queries
                // The subsequent profile creation will still fail if there's a real security issue
                if (err.message.includes("permission") || err.code === "permission-denied") {
                    console.warn("Permission denied checking ID uniqueness, proceeding anyway...");
                } else {
                    throw err;
                }
            }

            // 2. Create Auth User with actual email
            const result = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = result.user;

            // Update Firebase Auth display name
            await updateProfile(user, { displayName: data.fullName });

            // 3. Create Firestore User
            await createUser(user.uid, {
                email: data.email,
                displayName: data.fullName,
                photoURL: "",
                role: data.role,
            });

            // 4. Update Profile Details
            await updateUserProfile(user.uid, {
                idNumber: data.idNumber,
                position: data.position,
                schoolYear: data.schoolYear,
                isProfileComplete: true,
            });

            // Sign out after registration so they can sign in
            await firebaseSignOut(auth);
            setFirebaseUser(null);
            setUserProfile(null);

            toast.success("Account created! Please sign in with your ID Number.");
        } catch (error: any) {
            if (error.code === "auth/email-already-in-use") {
                toast.error("An account with this ID Number already exists.");
            } else if (error.code === "auth/weak-password") {
                toast.error("Password must be at least 6 characters.");
            } else {
                toast.error("Registration failed. Please try again.");
                console.error(error);
            }
            throw error; // Re-throw so the form doesn't redirect
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
