'use client';
import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/** Single series: cumulative consented connections. Hover shows the quarter's new connections. Table view for accessibility. */
export default function ConnectionsChart({ data }: { data: { period: string; count: number; cumulative: number }[] }) {
  const [table, setTable] = useState(false);
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button className="text-xs font-medium text-navy underline decoration-gold underline-offset-4" onClick={() => setTable((t) => !t)}>
          {table ? 'Show chart' : 'Show table'}
        </button>
      </div>
      {table ? (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-ink/60"><th className="py-1">Quarter</th><th>New connections</th><th>Total</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.period} className="border-t border-navy/5"><td className="py-1">{d.period}</td><td className="tabular-nums">{d.count}</td><td className="tabular-nums">{d.cumulative}</td></tr>)}</tbody>
        </table>
      ) : (
        <div className="h-64" role="img" aria-label={`Total connections grew to ${data.at(-1)?.cumulative ?? 0} by ${data.at(-1)?.period ?? ''}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="growFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#003057" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#003057" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#003057" strokeOpacity={0.08} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#1E2A36', opacity: 0.6 }} tickLine={false} axisLine={{ stroke: '#003057', strokeOpacity: 0.2 }} interval="preserveStartEnd" minTickGap={18} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#1E2A36', opacity: 0.6 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ stroke: '#B3A369', strokeWidth: 1.5 }}
                contentStyle={{ borderRadius: 8, border: '1px solid rgba(0,48,87,0.1)', fontSize: 12 }}
                formatter={(v: number, _n, item) => [`${v} total (+${(item.payload as { count: number }).count} this quarter)`, 'Connections']}
              />
              <Area type="monotone" dataKey="cumulative" stroke="#003057" strokeWidth={2} fill="url(#growFill)" dot={false} activeDot={{ r: 5, fill: '#B3A369', stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
