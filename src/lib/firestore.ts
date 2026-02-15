import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    idNumber: string;
    position: string;
    schoolYear: string;
    role: "admin" | "officer";
    isProfileComplete: boolean;
    createdAt: Timestamp | null;
}

export interface Meeting {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    room: string;
    description: string;
    createdBy: string;
    schoolYear: string;
    createdAt: Timestamp | null;
}

export interface AttendanceRecord {
    id: string;
    meetingId: string;
    userId: string;
    userDisplayName: string;
    status: "present" | "absent";
    markedAt: Timestamp | null;
    markedBy: string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function createUser(
    uid: string,
    data: {
        email: string;
        displayName: string;
        photoURL: string;
        role?: "admin" | "officer";
    }
): Promise<void> {
    await setDoc(doc(db, "users", uid), {
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL || "",
        idNumber: "",
        position: "",
        schoolYear: "",
        role: data.role || "officer",
        isProfileComplete: false,
        createdAt: serverTimestamp(),
    });
}

export async function getUser(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return { uid: snap.id, ...snap.data() } as UserProfile;
}

export async function updateUserProfile(
    uid: string,
    data: Partial<UserProfile>
): Promise<void> {
    await updateDoc(doc(db, "users", uid), data as Record<string, unknown>);
}

export async function getAllUsers(): Promise<UserProfile[]> {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile);
}

export async function isFirstUser(): Promise<boolean> {
    const snap = await getDocs(collection(db, "users"));
    return snap.empty;
}

export async function getUserByIdNumber(idNumber: string): Promise<UserProfile | null> {
    const q = query(collection(db, "users"), where("idNumber", "==", idNumber));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { uid: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile;
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export async function createMeeting(
    data: Omit<Meeting, "id" | "createdAt">
): Promise<string> {
    const ref = await addDoc(collection(db, "meetings"), {
        ...data,
        room: data.room || "",
        createdAt: serverTimestamp(),
    });
    return ref.id;
}

export async function getMeetings(): Promise<Meeting[]> {
    const q = query(collection(db, "meetings"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Meeting);
}

export async function getMeeting(id: string): Promise<Meeting | null> {
    const snap = await getDoc(doc(db, "meetings", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Meeting;
}

export async function updateMeeting(
    id: string,
    data: Partial<Meeting>
): Promise<void> {
    await updateDoc(doc(db, "meetings", id), data as Record<string, unknown>);
}

export async function deleteMeeting(id: string): Promise<void> {
    await deleteDoc(doc(db, "meetings", id));
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function markAttendance(data: {
    meetingId: string;
    userId: string;
    userDisplayName: string;
    status: "present" | "absent";
    markedBy: string;
}): Promise<string> {
    // Check if there's already an attendance record for this user+meeting
    const q = query(
        collection(db, "attendance"),
        where("meetingId", "==", data.meetingId),
        where("userId", "==", data.userId)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
        // Update existing
        const existingDoc = snap.docs[0];
        await updateDoc(existingDoc.ref, {
            status: data.status,
            markedAt: serverTimestamp(),
            markedBy: data.markedBy,
        });
        return existingDoc.id;
    }

    // Create new
    const ref = await addDoc(collection(db, "attendance"), {
        ...data,
        markedAt: serverTimestamp(),
    });
    return ref.id;
}

export async function getAttendanceForMeeting(
    meetingId: string
): Promise<AttendanceRecord[]> {
    const q = query(
        collection(db, "attendance"),
        where("meetingId", "==", meetingId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as AttendanceRecord
    );
}

export async function getAttendanceForUser(
    userId: string
): Promise<AttendanceRecord[]> {
    const q = query(
        collection(db, "attendance"),
        where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as AttendanceRecord
    );
}

export async function deleteAttendance(id: string): Promise<void> {
    await deleteDoc(doc(db, "attendance", id));
}

export async function deleteAttendanceForMeeting(meetingId: string): Promise<void> {
    const records = await getAttendanceForMeeting(meetingId);
    const deletePromises = records.map(r => deleteDoc(doc(db, "attendance", r.id)));
    await Promise.all(deletePromises);
}
