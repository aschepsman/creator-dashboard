import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import type { DailySnapshot } from './types';
import { cutoffDate, formatDate, formatGain } from './utils';

interface Props {
  snapshots: DailySnapshot[]; // cleaned, sorted asc
  color: string;
  days?: number;
}

export default function Sparkline({ snapshots, color, days = 30 }: Props) {
  const cutoff = cutoffDate(days);
  const recent = snapshots.filter(s => s.date >= cutoff);

  if (recent.length < 2) {
    return <div className="w-full h-10 flex items-center justify-center text-xs text-slate-300">—</div>;
  }

  // Build delta data: each point is the day-over-day gain
  const points = recent.slice(1).map((s, i) => ({
    date:  s.date,
    delta: s.followers - recent[i]!.followers,
  }));

  const isGrowing = points[points.length - 1]!.delta >= 0;

  return (
    <div className="w-full h-10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="delta"
            stroke={isGrowing ? '#22c55e' : '#ef4444'}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              backgroundColor: '#fff',
            }}
            labelFormatter={formatDate}
            formatter={(v: number) => [formatGain(v), 'Daily gain']}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
