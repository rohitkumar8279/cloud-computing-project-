import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Table2 } from 'lucide-react';
import { cn } from '../utils/format';

// Single-series charts use one hue (blue); ink stays in neutral text colors.
const SERIES = '#2a78d6';
const GRID = '#e5e7eb';
const AXIS_TEXT = '#6b7280';

/** Card with a chart <-> table toggle so values are never readable by color/shape alone. */
export function ChartCard({ title, subtitle, rows, columns, children, empty }) {
  const [view, setView] = useState('chart');
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex rounded-lg border border-gray-200 p-0.5" role="group" aria-label="Chart view">
          {[
            ['chart', BarChart3, 'Chart'],
            ['table', Table2, 'Table'],
          ].map(([v, Icon, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn('rounded-md p-1.5', view === v ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600')}
              title={label}
            >
              <Icon className="h-4 w-4" />
              <span className="sr-only">{label}</span>
            </button>
          ))}
        </div>
      </div>
      {empty ? (
        <p className="py-16 text-center text-sm text-gray-500">{empty}</p>
      ) : view === 'chart' ? (
        children
      ) : (
        <div className="max-h-72 overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {columns.map((c) => (
                  <th key={c.key} className={cn('py-2 font-medium text-gray-500', c.numeric ? 'text-right' : 'text-left')}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {columns.map((c) => (
                    <td key={c.key} className={cn('py-2 text-gray-700', c.numeric && 'text-right tabular-nums')}>
                      {r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TooltipBox({ active, payload, label, labelFormatter, unit = 'complaints' }) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-gray-900">{labelFormatter ? labelFormatter(label) : label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-gray-600">
        <span className="h-2 w-2 rounded-sm" style={{ background: SERIES }} />
        <span className="tabular-nums">{value}</span> {value === 1 ? unit.replace(/s$/, '') : unit}
      </p>
    </div>
  );
}

/** Horizontal bars - good for comparing counts across named categories. */
export function HorizontalBarChart({ data, labelKey = 'label', valueKey = 'count' }) {
  const height = Math.max(160, data.length * 34 + 16);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={8}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey={labelKey}
          width={160}
          tick={{ fill: '#374151', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip cursor={{ fill: '#f3f4f6' }} content={<TooltipBox />} />
        <Bar dataKey={valueKey} fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={18} minPointSize={2}>
          <LabelList dataKey={valueKey} position="right" fill="#374151" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Daily trend line with crosshair tooltip. */
export function TrendChart({ data }) {
  const fmt = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES} stopOpacity={0.18} />
            <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis
          dataKey="date"
          tickFormatter={fmt}
          tick={{ fill: AXIS_TEXT, fontSize: 12 }}
          axisLine={{ stroke: GRID }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ stroke: '#9ca3af', strokeDasharray: '3 3' }} content={<TooltipBox labelFormatter={fmt} />} />
        <Area
          type="monotone"
          dataKey="count"
          stroke={SERIES}
          strokeWidth={2}
          fill="url(#trendFill)"
          dot={false}
          activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: SERIES }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
