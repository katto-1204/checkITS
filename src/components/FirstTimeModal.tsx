import { useState } from "react";
import { motion } from "framer-motion";
import { IdCard, Briefcase, GraduationCap } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { updateUserProfile } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FirstTimeModalProps {
    open: boolean;
    onComplete: () => void;
}

const currentYear = new Date().getFullYear();
const schoolYears = [
    `${currentYear - 1}-${currentYear}`,
    `${currentYear}-${currentYear + 1}`,
    `${currentYear + 1}-${currentYear + 2}`,
];

const FirstTimeModal = ({ open, onComplete }: FirstTimeModalProps) => {
    const { firebaseUser, refreshProfile } = useAuth();
    const [idNumber, setIdNumber] = useState("");
    const [position, setPosition] = useState("");
    const [schoolYear, setSchoolYear] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firebaseUser) return;
        if (!idNumber.trim() || !position.trim() || !schoolYear) {
            toast.error("Please fill in all fields.");
            return;
        }

        setSaving(true);
        try {
            await updateUserProfile(firebaseUser.uid, {
                idNumber: idNumber.trim(),
                position: position.trim(),
                schoolYear,
                isProfileComplete: true,
            });
            await refreshProfile();
            toast.success("Profile completed!");
            onComplete();
        } catch (err) {
            toast.error("Failed to save. Please try again.");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open}>
            <DialogContent
                className="sm:max-w-md"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="text-xl font-black flex items-center gap-2">
                        <span className="text-gradient">Welcome!</span>
                    </DialogTitle>
                    <DialogDescription>
                        Complete your profile to get started with CheckITS.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-2"
                    >
                        <Label htmlFor="idNumber" className="flex items-center gap-2">
                            <IdCard size={14} className="text-primary" />
                            ID Number
                        </Label>
                        <Input
                            id="idNumber"
                            placeholder="59800000"
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            className="bg-secondary border-border"
                            required
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-2"
                    >
                        <Label htmlFor="position" className="flex items-center gap-2">
                            <Briefcase size={14} className="text-primary" />
                            Position
                        </Label>
                        <Input
                            id="position"
                            placeholder="e.g. President, Secretary, Member"
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            className="bg-secondary border-border"
                            required
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-2"
                    >
                        <Label className="flex items-center gap-2">
                            <GraduationCap size={14} className="text-primary" />
                            School Year
                        </Label>
                        <Select value={schoolYear} onValueChange={setSchoolYear} required>
                            <SelectTrigger className="bg-secondary border-border">
                                <SelectValue placeholder="Select school year" />
                            </SelectTrigger>
                            <SelectContent>
                                {schoolYears.map((sy) => (
                                    <SelectItem key={sy} value={sy}>
                                        {sy}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </motion.div>

                    <Button
                        type="submit"
                        className="w-full h-12 text-base font-bold"
                        disabled={saving}
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                            "Complete Profile"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default FirstTimeModal;
