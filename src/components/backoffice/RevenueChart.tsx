import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { format, eachMonthOfInterval, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RevenueChartProps {
  payments: any[];
  costs: any[];
}

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e5e9f0] rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-[#2e3440] mb-2 capitalize">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-[#8892a4]">{entry.name}:</span>
          <span className="font-semibold text-[#2e3440]">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

const RevenueChart = ({ payments, costs }: RevenueChartProps) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), 5),
      end: startOfMonth(now),
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const interval = { start: monthStart, end: monthEnd };

      const received = (payments || [])
        .filter((p: any) => isWithinInterval(new Date(p.paid_at), interval))
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

      const fees = (payments || [])
        .filter((p: any) => isWithinInterval(new Date(p.paid_at), interval))
        .reduce((sum: number, p: any) => sum + Number(p.fee || 0), 0);

      const opCosts = (costs || [])
        .filter((c: any) => isWithinInterval(new Date(c.cost_date), interval))
        .reduce((sum: number, c: any) => sum + Number(c.amount), 0);

      const totalCosts = opCosts + fees;
      const net = received - totalCosts;

      return {
        month: format(month, "MMM yy", { locale: ptBR }),
        Recebida: Number(received.toFixed(2)),
        Custos: Number(totalCosts.toFixed(2)),
        Líquida: Number(net.toFixed(2)),
      };
    });
  }, [payments, costs]);

  const hasData = chartData.some(d => d.Recebida > 0 || d.Custos > 0);

  if (!hasData) {
    return (
      <div className="bg-white rounded-xl border border-[#e5e9f0] p-5">
        <p className="text-xs font-bold text-[#8892a4] uppercase tracking-[0.15em] mb-4">Receita Mensal</p>
        <div className="flex items-center justify-center h-[200px] text-[#b0b8c8] text-sm">
          Sem dados de receita para exibir
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#e5e9f0] p-5">
      <p className="text-xs font-bold text-[#8892a4] uppercase tracking-[0.15em] mb-4">Receita Mensal (6 meses)</p>
      <div className="h-[240px] sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={2} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f8" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#8892a4" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e9f0" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#8892a4" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `R$${(v / 1000).toFixed(v >= 1000 ? 1 : 0)}${v >= 1000 ? "k" : ""}`}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8f9fc" }} />
            <Legend
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: "11px", color: "#8892a4", paddingTop: "8px" }}
            />
            <Bar dataKey="Recebida" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="Custos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="Líquida" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;
