import { useMemo } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Meeting } from "@/lib/firestore";

interface AttendanceChartProps {
    meetings: Meeting[];
    attendanceCounts: Record<string, number>;
}

const AttendanceChart = ({ meetings, attendanceCounts }: AttendanceChartProps) => {
    const data = useMemo(() => {
        // Sort meetings by date
        const sortedMeetings = [...meetings].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        return sortedMeetings.map((m) => ({
            name: new Date(m.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
            present: attendanceCounts[m.id] || 0,
            title: m.title
        }));
    }, [meetings, attendanceCounts]);

    // Calculate trend (up/down) based on last two data points
    const trend = useMemo(() => {
        if (data.length < 2) return 0;
        const last = data[data.length - 1].present;
        const prev = data[data.length - 2].present;
        return ((last - prev) / (prev || 1)) * 100; // Percentage change
    }, [data]);

    // Determine color based on trend (Green for up, Red for down/neutral)
    // Actually, stock markets use green for up.
    // For attendance, higher is better.
    // Let's stick to a nice theme color (Primary/Blue) or Green if trending up.
    // Let's use the primary app color for consistency, but maybe make it dynamic if user wants "stock like".
    // I'll use a nice emerald green gradient.

    return (
        <Card>
            <CardHeader>
                <CardTitle className=" text-lg font-bold flex items-center justify-between">
                    <span>Attendance Trends</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${trend >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                        {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey="name"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                                itemStyle={{ color: "hsl(var(--foreground))" }}
                                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                            />
                            <Area
                                type="monotone"
                                dataKey="present"
                                stroke="#10b981"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorPresent)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export default AttendanceChart;
