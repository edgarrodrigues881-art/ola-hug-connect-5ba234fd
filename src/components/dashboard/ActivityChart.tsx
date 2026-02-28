import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart, Area, Bar } from "recharts";
import { BarChart3 } from "lucide-react";

interface WarmupPoint {
  label: string;
  volume: number;
  entregas: number;
  crescimento: number;
}

interface Props {
  data: WarmupPoint[];
}

export function ActivityChart({ data }: Props) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          Evolução do Aquecimento — 7 dias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                fill="url(#gradVol)"
                name="Volume"
              />
              <Bar
                dataKey="entregas"
                fill="hsl(152, 69%, 53%)"
                opacity={0.5}
                barSize={8}
                radius={[2, 2, 0, 0]}
                name="Entregas"
              />
              <Line
                type="monotone"
                dataKey="crescimento"
                stroke="hsl(263, 70%, 50%)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name="Crescimento %"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "hsl(217, 91%, 60%)" }} /> Volume</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "hsl(152, 69%, 53%)" }} /> Entregas</span>
          <span className="flex items-center gap-1"><span className="w-2 h-0.5" style={{ background: "hsl(263, 70%, 50%)" }} /> Crescimento %</span>
        </div>
      </CardContent>
    </Card>
  );
}
