import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, User, Award, Shield, ChevronDown, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getAllUsers, UserProfile, getAttendanceForUser } from "@/lib/firestore";
import { toast } from "sonner";

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
};

const currentYear = new Date().getFullYear();
const SCHOOL_YEARS = [
    `${currentYear - 1}-${currentYear}`,
    `${currentYear}-${currentYear + 1}`,
    `${currentYear + 1}-${currentYear + 2}`,
];

const OfficersList = () => {
    const navigate = useNavigate();
    const [officers, setOfficers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [schoolYearFilter, setSchoolYearFilter] = useState("2025-2026");

    useEffect(() => {
        const loadOfficers = async () => {
            try {
                const allUsers = await getAllUsers();
                const officerUsers = allUsers.filter((u) => u.role === "officer");
                setOfficers(officerUsers);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load officers.");
            } finally {
                setLoading(false);
            }
        };
        loadOfficers();
    }, []);

    const filteredOfficers = officers.filter((officer) => {
        const matchSearch =
            officer.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (officer.idNumber && officer.idNumber.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchYear = schoolYearFilter === "All" || officer.schoolYear === schoolYearFilter;

        return matchSearch && matchYear;
    });

    if (loading) {
        return (
            <DashboardLayout role="admin">
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="admin">
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black">Officers</h1>
                        <p className="text-muted-foreground">Manage and view officer details</p>
                    </div>
                </div>

                {/* Filters */}
                <motion.div variants={item} className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or ID..."
                            className="pl-9 bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select value={schoolYearFilter} onValueChange={setSchoolYearFilter}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="School Year" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Years</SelectItem>
                                {SCHOOL_YEARS.map((sy) => (
                                    <SelectItem key={sy} value={sy}>{sy}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </motion.div>

                {/* List */}
                <motion.div variants={item} className="grid gap-3">
                    {filteredOfficers.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                                No officers found matching your filters.
                            </CardContent>
                        </Card>
                    ) : (
                        filteredOfficers.map((officer) => (
                            <motion.div
                                key={officer.uid}
                                variants={item}
                                whileHover={{ scale: 1.01 }}
                                className="glass-card rounded-lg p-4 flex items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">
                                        {officer.displayName[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold">{officer.displayName}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="font-mono bg-secondary px-1.5 py-0.5 rounded">
                                                {officer.idNumber || "No ID"}
                                            </span>
                                            <span>•</span>
                                            <span>{officer.position || "Officer"}</span>
                                            <span>•</span>
                                            <span>{officer.schoolYear}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </motion.div>
            </motion.div>
        </DashboardLayout>
    );
};

export default OfficersList;
