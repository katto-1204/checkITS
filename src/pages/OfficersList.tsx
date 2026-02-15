import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, UserPlus, UserX, CheckCircle2, Filter } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getAllUsers } from "@/lib/firestore";
import { toast } from "sonner";
import { OFFICERS_2025_2026 } from "@/lib/officers";

// Define an extended type for our merged view
interface MergedOfficer {
    name: string;
    position: string;
    role: string;
    userProfile?: any; // The Firestore user document, if found
    status: "active" | "no_account";
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
};

const currentYear = new Date().getFullYear();
// Dynamic range of school years
const SCHOOL_YEARS = [
    `${currentYear - 1}-${currentYear}`,
    `${currentYear}-${currentYear + 1}`,
    `${currentYear + 1}-${currentYear + 2}`,
];

const OfficersList = () => {
    const [officers, setOfficers] = useState<MergedOfficer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Filters
    const [schoolYearFilter, setSchoolYearFilter] = useState("2025-2026");
    const [roleFilter, setRoleFilter] = useState("All");

    useEffect(() => {
        const loadOfficers = async () => {
            try {
                const allUsers = await getAllUsers();

                // Merge Master List with Firestore Users
                const mergedList: MergedOfficer[] = OFFICERS_2025_2026.map(def => {
                    // Fuzzy match logic
                    const user = allUsers.find(u =>
                        u.displayName.toLowerCase().includes(def.name.toLowerCase()) ||
                        def.name.toLowerCase().includes(u.displayName.toLowerCase())
                    );

                    return {
                        name: def.name,
                        position: def.position,
                        role: def.role,
                        userProfile: user || undefined,
                        status: user ? "active" : "no_account"
                    };
                });

                setOfficers(mergedList);
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
        const search = searchQuery.toLowerCase();

        // 1. Search Filter
        const matchSearch = (
            officer.name.toLowerCase().includes(search) ||
            (officer.userProfile?.idNumber && officer.userProfile.idNumber.toLowerCase().includes(search)) ||
            (officer.position && officer.position.toLowerCase().includes(search))
        );

        // 2. Role Filter
        let matchRole = true;
        if (roleFilter !== "All") {
            // Map UI format to internal role data
            // "Executives" -> "executive"
            // "Creatives" -> "creative"
            // "Logistics" -> "logistics"
            const targetRole = roleFilter.toLowerCase().slice(0, -1); // remove 's'
            // Special handling if singular/plural doesn't match perfectly or just inclusive check
            matchRole = officer.role.toLowerCase().includes(targetRole);
        }

        // 3. School Year Filter
        // Since OFFICERS_2025_2026 is inherently 2025-2026, we primarily filter by that.
        // If a user profile has a different school year, we might check that too, 
        // but for now we treat the static list as 2025-2026.
        const matchYear = schoolYearFilter === "All" || schoolYearFilter === "2025-2026";

        return matchSearch && matchRole && matchYear;
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
                <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 items-center">
                    {/* Search */}
                    <div className="relative flex-1 w-full">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, ID, or position..."
                            className="pl-9 bg-secondary border-transparent focus:bg-background transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* School Year Filter */}
                    <div className="w-full sm:w-48">
                        <Select value={schoolYearFilter} onValueChange={setSchoolYearFilter}>
                            <SelectTrigger className="bg-secondary border-transparent text-foreground">
                                <Filter size={14} className="mr-2 text-muted-foreground" />
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

                    {/* Role Filter */}
                    <div className="w-full sm:w-48">
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="bg-secondary border-transparent text-foreground">
                                <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Roles</SelectItem>
                                <SelectItem value="Executives">Executives</SelectItem>
                                <SelectItem value="Creatives">Creatives</SelectItem>
                                <SelectItem value="Logistics">Logistics</SelectItem>
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
                        filteredOfficers.map((officer, index) => (
                            <motion.div
                                key={index}
                                variants={item}
                                whileHover={{ scale: 1.01 }}
                                className={`glass-card rounded-xl p-4 flex items-center justify-between gap-4 border-l-4 ${officer.status === "active" ? "border-l-primary" : "border-l-muted"
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${officer.userProfile?.photoURL ? "" : "bg-primary/10 text-primary"
                                        }`}>
                                        {officer.userProfile?.photoURL ? (
                                            <img
                                                src={officer.userProfile.photoURL}
                                                alt={officer.name}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            officer.name.substring(0, 2).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-lg leading-none">{officer.name}</p>
                                            {officer.status === "active" ? (
                                                <CheckCircle2 size={16} className="text-primary" />
                                            ) : (
                                                <UserX size={16} className="text-muted-foreground/50" />
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                                            {officer.userProfile?.idNumber ? (
                                                <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground font-bold">
                                                    {officer.userProfile.idNumber}
                                                </span>
                                            ) : (
                                                <span className="font-mono bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-bold">
                                                    NO ID
                                                </span>
                                            )}
                                            <span>•</span>
                                            <span className="uppercase tracking-wider font-bold">{officer.role}</span>
                                            <span className="hidden sm:inline">•</span>
                                            <span className="first-letter:uppercase">{officer.position}</span>
                                            <span className="hidden sm:inline">•</span>
                                            <span>2025-2026</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    {officer.status === "active" ? (
                                        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                                            Active
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="text-muted-foreground">
                                            No Account
                                        </Badge>
                                    )}
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
