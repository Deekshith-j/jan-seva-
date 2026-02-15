import { supabase } from '@/integrations/supabase/client';

export interface OfficeLoad {
    id: string;
    name: string;
    currentWaitTime: number; // minutes
    distance: number; // km
}

export class QueueOptimizer {
    static async getAlternativeOffices(currentOfficeId: string): Promise<OfficeLoad[]> {
        // 1. Fetch active offices
        const { data: offices, error: officesError } = await supabase
            .from('offices')
            .select('id, office_name, latitude, longitude')
            .eq('is_active', true)
            .neq('id', currentOfficeId)
            .limit(5);

        if (officesError || !offices) {
            console.error("Error fetching offices:", officesError);
            return [];
        }

        const alternativeOffices: OfficeLoad[] = [];

        // 2. Calculate load for each office
        for (const office of offices) {
            // Count pending/waiting tokens
            const { count, error: countError } = await supabase
                .from('tokens')
                .select('*', { count: 'exact', head: true })
                .eq('office_id', office.id)
                .in('status', ['pending', 'waiting']);

            if (countError) {
                console.error(`Error counting tokens for ${office.id}:`, countError);
                continue;
            }

            // Assume ~15 mins per token on average (could be refined by service type)
            const estimatedWaitTime = (count || 0) * 15;

            // Mock distance calc (in real app, use Geolocation API)
            // We'll just give a random distance between 2-15km for demo
            const mockDistance = parseFloat((Math.random() * 13 + 2).toFixed(1));

            alternativeOffices.push({
                id: office.id,
                name: office.office_name || "Unknown Office",
                currentWaitTime: estimatedWaitTime,
                distance: mockDistance
            });
        }

        return alternativeOffices.sort((a, b) => a.currentWaitTime - b.currentWaitTime);
    }
}

export class RushForecaster {
    static async getForecast(officeId: string) {
        // Query service_logs to get historical wait times grouped by hour
        // Since we can't easily group by hour in simple Supabase client query without RPC,
        // we'll fetch logs for this office and process client-side (for prototype scale).

        const { data: logs, error } = await supabase
            .from('service_logs')
            .select('created_at, duration_minutes')
            .eq('office_id', officeId)
            .order('created_at', { ascending: false })
            .limit(500); // Analyze last 500 logs

        if (error || !logs) {
            console.error("Error fetching forecast logs:", error);
            // Fallback to mock data if no logs
            return this.getMockForecast();
        }

        if (logs.length === 0) return this.getMockForecast();

        // Process logs into hourly buckets
        const hourlyLoad: Record<number, { count: number, totalDuration: number }> = {};

        // Initialize 9 AM to 5 PM
        for (let i = 9; i <= 17; i++) {
            hourlyLoad[i] = { count: 0, totalDuration: 0 };
        }

        logs.forEach(log => {
            const date = new Date(log.created_at);
            const hour = date.getHours();
            if (hour >= 9 && hour <= 17) {
                hourlyLoad[hour].count++;
                hourlyLoad[hour].totalDuration += (log.duration_minutes || 0);
            }
        });

        // Convert to array format
        return Object.entries(hourlyLoad).map(([hour, stats]) => ({
            time: `${hour}:00`,
            load: stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0 // Avg wait time or load metric
            // Alternatively, 'load' could be just count of people serviced. 
            // Let's normalize it to 0-100 scale for the chart, or just return raw avg wait time.
            // Returning raw count as "Load Index"
        }));
    }

    private static getMockForecast() {
        return [
            { time: '09:00', load: 30 },
            { time: '10:00', load: 85 },
            { time: '11:00', load: 60 },
            { time: '12:00', load: 40 },
            { time: '13:00', load: 90 },
            { time: '14:00', load: 50 },
            { time: '15:00', load: 30 },
            { time: '16:00', load: 20 },
        ];
    }
}
