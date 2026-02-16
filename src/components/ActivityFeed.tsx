import { AttendanceRecord, Meeting } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
    attendance: AttendanceRecord[];
    meetings: Meeting[];
}

const ActivityFeed = ({ attendance, meetings }: Props) => {
    // Sort attendance by most recent (assuming we had a timestamp, but here we can try to correlate with meeting order or just list them)
    // Since attendance structure doesn't store timestamp by default in this MVP, we might treat "checked into [Meeting]" based on meeting date for now
    // OR just list the most recent meetings they attended.

    // Improvement: In a real app, attendance record should have 'timestamp'.
    // We will infer activity from meeting date for this visual.

    const activities = attendance
        .filter(a => a.status === 'present')
        .map(a => {
            const meeting = meetings.find(m => m.id === a.meetingId);
            return {
                id: a.meetingId,
                action: "Checked in to",
                target: meeting?.title || "Unknown Event",
                date: meeting?.date ? new Date(meeting.date + 'T' + (meeting.time || '12:00')) : new Date(),
            }
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5);

    return (
        <Card className="glass-card border-none bg-white/40 dark:bg-black/20 backdrop-blur-md shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    <History size={16} /> Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                ) : activities.map((act) => (
                    <div key={act.id} className="flex gap-3 items-start">
                        <div className="mt-1">
                            <CheckCircle2 size={16} className="text-green-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {act.action} <span className="font-bold text-primary">{act.target}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(act.date, { addSuffix: true })}
                            </p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

export default ActivityFeed;
