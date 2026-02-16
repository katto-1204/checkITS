import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getAllUsers, getAttendanceForUser } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LeaderboardEntry {
    uid: string;
    displayName: string;
    count: number;
    rank: number;
}

const LeaderboardWidget = () => {
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                // Fetch all officers
                const users = await getAllUsers();
                const officers = users.filter(u => u.role === "officer");

                // Calculate attendance for each
                const stats = await Promise.all(
                    officers.map(async (officer) => {
                        const records = await getAttendanceForUser(officer.uid);
                        const presentCount = records.filter(r => r.status === "present").length;
                        return {
                            uid: officer.uid,
                            displayName: officer.displayName,
                            count: presentCount
                        };
                    })
                );

                // Sort descending
                const sorted = stats.sort((a, b) => b.count - a.count);

                // Top 5
                const top5 = sorted.slice(0, 5).map((entry, index) => ({
                    ...entry,
                    rank: index + 1
                }));

                setLeaders(top5);
            } catch (error) {
                console.error("Failed to load leaderboard", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    if (loading) return <div className="h-64 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <Card className="glass-card border-none bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-wider text-foreground/80">
                    <Trophy className="text-yellow-500" size={20} />
                    Leaderboard
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {leaders.map((leader, index) => (
                    <motion.div
                        key={leader.uid}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors border border-border/50"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 font-bold text-lg">
                                {index === 0 ? <Crown size={24} className="text-yellow-500 drop-shadow-sm" /> :
                                    index === 1 ? <Medal size={20} className="text-gray-400" /> :
                                        index === 2 ? <Medal size={20} className="text-amber-700" /> :
                                            <span className="text-muted-foreground">#{leader.rank}</span>}
                            </div>
                            <Avatar className="h-8 w-8 border border-border">
                                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                                    {leader.displayName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className={`font-semibold text-sm ${index === 0 ? "text-yellow-600 dark:text-yellow-400" : "text-foreground/90"}`}>
                                {leader.displayName}
                            </span>
                        </div>
                        <div className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                            {leader.count} Events
                        </div>
                    </motion.div>
                ))}
            </CardContent>
        </Card>
    );
};

export default LeaderboardWidget;
