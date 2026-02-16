import { useEffect, useState } from "react";
import { Meeting } from "@/lib/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar, MapPin } from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
    meetings: Meeting[];
}

const NextEventCountdown = ({ meetings }: Props) => {
    const [nextEvent, setNextEvent] = useState<Meeting | null>(null);
    const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

    useEffect(() => {
        // Find next event
        const now = new Date();
        const upcoming = meetings
            .filter(m => new Date(m.date + 'T' + (m.time || '00:00')) > now)
            .sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00')).getTime() - new Date(b.date + 'T' + (b.time || '00:00')).getTime())[0];

        setNextEvent(upcoming || null);
    }, [meetings]);

    useEffect(() => {
        if (!nextEvent) return;

        const interval = setInterval(() => {
            const now = new Date();
            const eventDate = new Date(nextEvent.date + 'T' + (nextEvent.time || '00:00'));
            const diff = differenceInSeconds(eventDate, now);

            if (diff <= 0) {
                setTimeLeft(null); // Event started
                return;
            }

            const d = Math.floor(diff / (3600 * 24));
            const h = Math.floor((diff % (3600 * 24)) / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;

            setTimeLeft({ d, h, m, s });
        }, 1000);

        return () => clearInterval(interval);
    }, [nextEvent]);

    if (!nextEvent) return null;

    return (
        <Card className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-none overflow-hidden relative shadow-lg">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Clock size={120} />
            </div>

            <CardContent className="p-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center md:text-left">
                    <div className="flex items-center gap-2 justify-center md:justify-start text-indigo-200 text-xs font-bold uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        Up Next
                    </div>
                    <h2 className="text-2xl font-black leading-tight max-w-md">{nextEvent.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-indigo-100 justify-center md:justify-start">
                        <span className="flex items-center gap-1"><Calendar size={14} /> {format(new Date(nextEvent.date), "MMM d")}</span>
                        <span className="flex items-center gap-1"><Clock size={14} /> {nextEvent.time}</span>
                        <span className="flex items-center gap-1"><MapPin size={14} /> {nextEvent.location}</span>
                    </div>
                </div>

                {timeLeft && (
                    <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                            <span className="text-3xl font-black tabular-nums">{timeLeft.d}</span>
                            <span className="text-[10px] uppercase opacity-70">Days</span>
                        </div>
                        <div className="text-3xl font-light opacity-50">:</div>
                        <div className="flex flex-col items-center">
                            <span className="text-3xl font-black tabular-nums">{timeLeft.h.toString().padStart(2, '0')}</span>
                            <span className="text-[10px] uppercase opacity-70">Hours</span>
                        </div>
                        <div className="text-3xl font-light opacity-50">:</div>
                        <div className="flex flex-col items-center">
                            <span className="text-3xl font-black tabular-nums">{timeLeft.m.toString().padStart(2, '0')}</span>
                            <span className="text-[10px] uppercase opacity-70">Mins</span>
                        </div>
                        <div className="text-3xl font-light opacity-50">:</div>
                        <div className="flex flex-col items-center">
                            <span className="text-3xl font-black tabular-nums">{timeLeft.s.toString().padStart(2, '0')}</span>
                            <span className="text-[10px] uppercase opacity-70">Secs</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default NextEventCountdown;
