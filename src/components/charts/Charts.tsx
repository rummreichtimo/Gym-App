'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber } from '@/lib/utils';

/**
 * Chart wrappers with one shared visual language: muted grid and axes, brand
 * accent for the data, and a themed tooltip. Every chart is responsive and
 * scrolls inside its container rather than widening the page.
 */

const AXIS = {
  stroke: 'rgb(var(--subtle))',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const COLORS = {
  brand: 'rgb(var(--brand))',
  success: 'rgb(var(--success))',
  info: 'rgb(var(--info))',
  warning: 'rgb(var(--warning))',
  danger: 'rgb(var(--danger))',
} as const;

export type ChartColor = keyof typeof COLORS;

interface TooltipProps {
  active?: boolean;
  payload?: readonly { value?: unknown }[];
  label?: unknown;
}

/** Themed tooltip shared by every chart. */
function ChartTooltip({ unit, decimals = 0 }: { unit?: string; decimals?: number }) {
  function Content(props: TooltipProps) {
    const { active, payload, label } = props;
    const value = payload?.[0]?.value;
    if (!active || typeof value !== 'number') return null;
    return (
      <div className="rounded-xl border border-border bg-elevated px-3 py-2 shadow-card">
        <p className="text-xs text-subtle">{String(label ?? '')}</p>
        <p className="mt-0.5 text-sm font-bold text-fg tabular-nums">
          {formatNumber(value, decimals)}
          {unit ? ` ${unit}` : ''}
        </p>
      </div>
    );
  }
  return <Tooltip content={Content} cursor={{ stroke: 'rgb(var(--border))' }} />;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export function TrendChart({
  data,
  color = 'brand',
  unit,
  decimals = 0,
  height = 200,
  area = true,
}: {
  data: SeriesPoint[];
  color?: ChartColor;
  unit?: string;
  decimals?: number;
  height?: number;
  area?: boolean;
}) {
  const stroke = COLORS[color];
  const gradientId = `grad-${color}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      {area ? (
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" {...AXIS} minTickGap={24} />
          <YAxis {...AXIS} width={48} domain={['auto', 'auto']} />
          <ChartTooltip unit={unit} decimals={decimals} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={data.length <= 12 ? { r: 3, fill: stroke, strokeWidth: 0 } : false}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      ) : (
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" {...AXIS} minTickGap={24} />
          <YAxis {...AXIS} width={48} domain={['auto', 'auto']} />
          <ChartTooltip unit={unit} decimals={decimals} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2.5}
            dot={data.length <= 12 ? { r: 3, fill: stroke, strokeWidth: 0 } : false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

export function BarSeriesChart({
  data,
  color = 'brand',
  unit,
  height = 200,
  highlightMax = false,
}: {
  data: SeriesPoint[];
  color?: ChartColor;
  unit?: string;
  height?: number;
  highlightMax?: boolean;
}) {
  const max = Math.max(...data.map((point) => point.value), 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" {...AXIS} minTickGap={12} />
        <YAxis {...AXIS} width={48} allowDecimals={false} />
        <ChartTooltip unit={unit} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
          {data.map((point, index) => (
            <Cell
              key={index}
              fill={
                highlightMax && point.value === max && max > 0
                  ? COLORS.brand
                  : COLORS[color]
              }
              fillOpacity={highlightMax && point.value !== max ? 0.45 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars, used for volume per muscle group. */
export function RankedBars({
  data,
  unit = 'kg',
}: {
  data: { label: string; value: number }[];
  unit?: string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <ul className="space-y-2.5">
      {data.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-sm text-fg">{item.label}</span>
            <span className="shrink-0 text-xs font-semibold text-muted tabular-nums">
              {formatNumber(item.value)} {unit}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
