
import { useState, useEffect } from 'react';

export function useEarningsData(symbol: string | undefined) {
    const [nextEarningsDate, setNextEarningsDate] = useState<string | null>(null);
    const [earningsTooltip, setEarningsTooltip] = useState<string>('');

    useEffect(() => {
        if (!symbol) {
            setNextEarningsDate(null);
            setEarningsTooltip('');
            return;
        }

        const fetchEarnings = async () => {
            try {
                const res = await fetch(`/api/earnings?symbol=${symbol}`);
                if (!res.ok) return;
                const data = await res.json();
                if (data && data.length > 0 && data[0].date) {
                    setNextEarningsDate(data[0].date);
                    const eps = data[0].epsEstimate ? `EPS Est: $${data[0].epsEstimate}` : 'EPS: TBD';
                    setEarningsTooltip(`${symbol} Earnings\n${eps}`);
                } else {
                    setNextEarningsDate(null);
                    setEarningsTooltip('');
                }
            } catch {
                setNextEarningsDate(null);
                setEarningsTooltip('');
            }
        };

        fetchEarnings();
    }, [symbol]);

    return {
        nextEarningsDate,
        earningsTooltip,
    };
}
