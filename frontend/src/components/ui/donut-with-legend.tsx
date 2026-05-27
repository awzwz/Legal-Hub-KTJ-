import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export interface DonutDatum {
  key: string;
  name: string;        // полное название — показывается в tooltip
  shortName?: string;  // короткое — для легенды (по умолчанию = name)
  value: number;
  color: string;
}

interface DonutWithLegendProps {
  data: DonutDatum[];
  centerLabel?: string; // например «всего дел»
  /** Высота круга. Легенда автоматически займёт оставшееся место справа. */
  size?: number;
}

export function DonutWithLegend({ data, centerLabel = "всего", size = 220 }: DonutWithLegendProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) {
    return <div className="text-sm text-muted-foreground py-12 text-center">Нет данных</div>;
  }
  const inner = Math.round(size * 0.27);
  const outer = Math.round(size * 0.42);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 items-center">
      <div className="relative w-full" style={{ height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={inner}
              outerRadius={outer}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(215,35%,90%)" }}
              formatter={(value: number, _name, p) => [
                `${value} (${Math.round((value / total) * 100)}%)`,
                p.payload.name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-blue-900 leading-none">{total}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{centerLabel}</span>
        </div>
      </div>
      <div className="space-y-1.5 sm:min-w-[160px]">
        {data
          .slice()
          .sort((a, b) => b.value - a.value)
          .map((d) => {
            const pct = Math.round((d.value / total) * 100);
            return (
              <div key={d.key} className="flex items-center gap-2 text-xs" title={d.name}>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="flex-1 truncate text-slate-700">{d.shortName || d.name}</span>
                <span className="text-slate-500 tabular-nums">{d.value}</span>
                <span className="text-slate-400 tabular-nums w-9 text-right">{pct}%</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
