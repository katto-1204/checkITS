import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, UserPlus, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { useAuth } from "@/contexts/AuthContext";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const CATEGORIES = ["Executive", "Creatives", "Logistics"] as const;

const POSITIONS: Record<string, string[]> = {
    Executive: [
        "President",
        "Internal Vice President",
        "External Vice President",
        "Secretary",
        "Assistant Secretary",
        "Treasurer",
        "Assistant Treasurer",
        "Auditor",
        "Assistant Auditor",
        "Business Manager",
        "Assistant Business Manager",
        "Public Information Officer (P.I.O.)",
        "1st Year Representative",
        "2nd Year Representative",
        "3rd Year Representative",
        "4th Year Representative",
    ],
    Creatives: [
        "Creatives Head",
        "Creatives Committee",
        "Documentation Head",
    ],
    Logistics: [
        "Logistics Head",
        "Logistics Committee",
    ],
};

const currentYear = new Date().getFullYear();
const SCHOOL_YEARS = [
    `${currentYear - 1}-${currentYear}`,
    `${currentYear}-${currentYear + 1}`,
    `${currentYear + 1}-${currentYear + 2}`,
];

const Register = () => {
    const navigate = useNavigate();
    const { registerWithEmail } = useAuth();

    const [role, setRole] = useState<"admin" | "officer">("officer");
    const [fullName, setFullName] = useState("");
    const [idNumber, setIdNumber] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [category, setCategory] = useState("");
    const [position, setPosition] = useState("");
    const [schoolYear, setSchoolYear] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const availablePositions = category ? POSITIONS[category] || [] : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        // Only require category/position if role is officer
        if (role === "officer" && (!category || !position)) {
            setError("Please select your category and position.");
            return;
        }

        if (!schoolYear) {
            setError("Please select a school year.");
            return;
        }

        setIsLoading(true);
        try {
            await registerWithEmail({
                fullName,
                idNumber,
                password,
                category: role === "officer" ? category : "",
                position: role === "officer" ? position : "",
                schoolYear,
                role,
            });
            navigate("/login");
        } catch {
            // Error is handled inside registerWithEmail via toast
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-lg"
            >
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                            Check<span className="text-gradient">ITS</span>
                        </h1>
                        <p className="text-muted-foreground mt-2 text-sm tracking-widest uppercase">
                            Create Account
                        </p>
                    </motion.div>
                </div>

                {/* Registration Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="glass-card rounded-lg p-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <button
                            onClick={() => navigate("/login")}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="text-xl font-bold">Register</h2>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-destructive/10 border border-destructive/30 text-destructive rounded-md px-4 py-3 mb-5 text-sm"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Role Selection */}
                        <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border border-border/50">
                            <Label className="text-base font-semibold flex items-center gap-2">
                                <Shield size={16} className="text-primary" />
                                Select Role
                            </Label>
                            <RadioGroup
                                defaultValue="officer"
                                value={role}
                                onValueChange={(v) => setRole(v as "admin" | "officer")}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="officer" id="officer" />
                                    <Label htmlFor="officer" className="cursor-pointer">Officer</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="admin" id="admin" />
                                    <Label htmlFor="admin" className="cursor-pointer">Admin</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Full Name */}
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                placeholder="Juan Dela Cruz"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="bg-secondary border-border"
                                required
                            />
                        </div>

                        {/* ID Number */}
                        <div className="space-y-2">
                            <Label htmlFor="idNumber">ID Number</Label>
                            <Input
                                id="idNumber"
                                placeholder="e.g. 2023-00123"
                                value={idNumber}
                                onChange={(e) => setIdNumber(e.target.value)}
                                className="bg-secondary border-border"
                                required
                            />
                            <p className="text-xs text-muted-foreground">This will be used as your login ID.</p>
                        </div>

                        {/* Password */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="bg-secondary border-border"
                                    required
                                />
                            </div>
                        </div>

                        {/* Category + Position (Conditional for Officers) */}
                        {role === "officer" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                            >
                                <div className="space-y-2">
                                    <Label>Officer Category</Label>
                                    <Select
                                        value={category}
                                        onValueChange={(val) => {
                                            setCategory(val);
                                            setPosition(""); // Reset position when category changes
                                        }}
                                    >
                                        <SelectTrigger className="bg-secondary border-border">
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((cat) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Position</Label>
                                    <Select value={position} onValueChange={setPosition} disabled={!category}>
                                        <SelectTrigger className="bg-secondary border-border">
                                            <SelectValue placeholder={category ? "Select position" : "Select category first"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availablePositions.map((pos) => (
                                                <SelectItem key={pos} value={pos}>
                                                    {pos}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </motion.div>
                        )}

                        {/* School Year */}
                        <div className="space-y-2">
                            <Label>School Year</Label>
                            <Select value={schoolYear} onValueChange={setSchoolYear}>
                                <SelectTrigger className="bg-secondary border-border">
                                    <SelectValue placeholder="Select school year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SCHOOL_YEARS.map((sy) => (
                                        <SelectItem key={sy} value={sy}>
                                            {sy}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-bold mt-2"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                                    className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                                />
                            ) : (
                                <>
                                    <UserPlus size={18} className="mr-2" />
                                    Create Account
                                </>
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-sm text-muted-foreground mt-6">
                        Already have an account?{" "}
                        <button
                            onClick={() => navigate("/login")}
                            className="text-primary font-semibold hover:underline"
                        >
                            Sign In
                        </button>
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default Register;
