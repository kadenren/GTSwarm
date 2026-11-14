'use client';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/** Single series (connections per quarter): navy bars, recessive grid, hover tooltip, table view for accessibility. */
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
          <thead><tr className="text-left text-xs text-ink/60"><th className="py-1">Quarter</th><th>New connections</th><th>Running total</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.period} className="border-t border-navy/5"><td className="py-1">{d.period}</td><td className="tabular-nums">{d.count}</td><td className="tabular-nums">{d.cumulative}</td></tr>)}</tbody>
        </table>
      ) : (
        <div className="h-64" role="img" aria-label="New connections per quarter">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barCategoryGap={6}>
              <CartesianGrid vertical={false} stroke="#003057" strokeOpacity={0.08} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#1E2A36', opacity: 0.6 }} tickLine={false} axisLine={{ stroke: '#003057', strokeOpacity: 0.2 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#1E2A36', opacity: 0.6 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: '#003057', fillOpacity: 0.05 }}
                contentStyle={{ borderRadius: 8, border: '1px solid rgba(0,48,87,0.1)', fontSize: 12 }}
                formatter={(v: number, _n, item) => [`${v} new (${(item.payload as { cumulative: number }).cumulative} total)`, 'Connections']}
              />
              <Bar dataKey="count" fill="#003057" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
