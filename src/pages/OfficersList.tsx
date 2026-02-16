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
                    // Normalize name for better matching: remove middle initials and dots
                    const normalize = (name: string) =>
                        name.toLowerCase()
                            .replace(/[.\s]/g, " ") // replace dots and spaces with single space
                            .replace(/\b[a-z]\s/g, " ") // remove single letter initials followed by space
                            .trim()
                            .split(/\s+/)
                            .filter(word => word.length > 1); // keep only words longer than 1 char

                    const defParts = normalize(def.name);

                    const user = allUsers.find(u => {
                        const uParts = normalize(u.displayName);
                        // Check if all parts of the shorter name are in the longer name
                        const [smaller, larger] = defParts.length < uParts.length ? [defParts, uParts] : [uParts, defParts];
                        return smaller.every(part => larger.includes(part));
                    });

                    return {
                        ...def,
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
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-[900] tracking-tighter leading-none">
                            Officer <span className="text-primary italic">Roster</span>
                        </h1>
                        <p className="text-muted-foreground mt-2 font-medium flex items-center gap-2 text-sm sm:text-base">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary" />
                            Managed Personnel · {officers.length} Active
                        </p>
                    </div>
                </div>

                {/* Filters - Glass Edition */}
                <motion.div variants={item} className="flex flex-col md:flex-row gap-4 items-center bg-secondary/20 p-4 rounded-[24px] border border-border/40 backdrop-blur-sm">
                    {/* Search */}
                    <div className="relative flex-1 w-full group">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Search by name, ID, or position..."
                            className="pl-12 h-12 bg-background/50 border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 rounded-xl transition-all font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        {/* School Year Filter */}
                        <div className="w-full sm:w-48">
                            <Select value={schoolYearFilter} onValueChange={setSchoolYearFilter}>
                                <SelectTrigger className="h-12 bg-background/50 border-transparent rounded-xl focus:ring-primary/20">
                                    <div className="flex items-center gap-2">
                                        <Filter size={14} className="text-muted-foreground" />
                                        <SelectValue placeholder="School Year" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-border/40">
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
                                <SelectTrigger className="h-12 bg-background/50 border-transparent rounded-xl focus:ring-primary/20">
                                    <SelectValue placeholder="All Roles" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-border/40">
                                    <SelectItem value="All">All Roles</SelectItem>
                                    <SelectItem value="Executives">Executives</SelectItem>
                                    <SelectItem value="Creatives">Creatives</SelectItem>
                                    <SelectItem value="Logistics">Logistics</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </motion.div>

                {/* List - Premium Grid */}
                <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filteredOfficers.length === 0 ? (
                        <Card className="col-span-full bg-secondary/10 border-dashed border-2 border-border/50 rounded-2xl">
                            <CardContent className="p-12 text-center text-muted-foreground">
                                No officers found matching your filters.
                            </CardContent>
                        </Card>
                    ) : (
                        filteredOfficers.map((officer, index) => (
                            <motion.div
                                key={index}
                                variants={item}
                                whileHover={{ scale: 1.02, y: -2 }}
                                className={`bg-secondary/20 hover:bg-secondary/30 backdrop-blur-sm rounded-[24px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5 border border-border/40 hover:border-primary/20 transition-all group relative overflow-hidden`}
                            >
                                <div className="flex items-center gap-4 sm:gap-5 relative z-10">
                                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shrink-0 shadow-inner group-hover:scale-105 transition-transform ${officer.userProfile?.photoURL ? "" : "bg-gradient-to-br from-primary/20 to-primary/5 text-primary"
                                        }`}>
                                        {officer.userProfile?.photoURL ? (
                                            <img
                                                src={officer.userProfile.photoURL}
                                                alt={officer.name}
                                                className="w-full h-full rounded-2xl object-cover ring-2 ring-primary/10 shadow-sm"
                                            />
                                        ) : (
                                            officer.name.substring(0, 2).toUpperCase()
                                        )}
                                    </div>
                                    <div className="min-w-0 py-0.5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-[900] text-lg sm:text-xl tracking-tight leading-none truncate">{officer.name}</p>
                                            {officer.status === "active" && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 text-[10px] sm:text-[11px] text-muted-foreground font-medium tracking-wide opacity-70">
                                            {officer.userProfile?.idNumber ? (
                                                <span className="text-primary font-bold">
                                                    ID {officer.userProfile.idNumber}
                                                </span>
                                            ) : (
                                                <span className="text-destructive font-bold">
                                                    Unregistered
                                                </span>
                                            )}
                                            <span>·</span>
                                            <span>{officer.role}</span>
                                            <span className="hidden xs:inline">·</span>
                                            <span className="truncate">{officer.position}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0 relative z-10 self-end sm:self-auto uppercase">
                                    {officer.status === "active" ? (
                                        <Badge variant="outline" className="h-7 sm:h-8 px-3 sm:px-4 rounded-xl border-primary/20 bg-primary/10 text-primary font-bold tracking-wider text-[9px] sm:text-[10px]">
                                            Verified
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="h-7 sm:h-8 px-3 sm:px-4 rounded-xl text-muted-foreground font-bold tracking-wider text-[9px] sm:text-[10px] opacity-50">
                                            Pending
                                        </Badge>
                                    )}
                                </div>

                                {/* Background Glow */}
                                <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] -mr-16 -mt-16 opacity-0 group-hover:opacity-20 transition-opacity duration-700 ${officer.status === "active" ? "bg-primary" : "bg-muted-foreground"}`} />
                            </motion.div>
                        ))
                    )}
                </motion.div>
            </motion.div>
        </DashboardLayout>
    );
};

export default OfficersList;
