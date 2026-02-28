import { Card, CardContent } from "@/components/ui/card";

interface Props {
  rate: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
}

export function DeliveryRateCard({ rate, totalSent, totalDelivered, totalFailed }: Props) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  // Smart colors: <92% red, 92-96% yellow, >96% green
  const color = rate > 96 ? "text-emerald-400" : rate >= 92 ? "text-yellow-400" : "text-red-400";
  const strokeColor = rate > 96 ? "#34d399" : rate >= 92 ? "#facc15" : "#ef4444";
  const bgRing = rate > 96 ? "bg-emerald-500/10" : rate >= 92 ? "bg-yellow-500/10" : "bg-red-500/10";

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
      <CardContent className="p-5 flex flex-col items-center justify-center h-full gap-3">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" opacity="0.3" />
            <circle
              cx="50" cy="50" r="40"
              stroke={strokeColor}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-bold ${color}`}>{rate}%</span>
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-medium text-foreground">Taxa de Entrega</p>
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span>{totalSent} env.</span>
            <span>{totalDelivered} ent.</span>
            <span className={totalFailed > 0 ? "text-red-400" : ""}>{totalFailed} falhas</span>
          </div>
          <div className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-medium ${bgRing} ${color}`}>
            {rate > 96 ? "Saudável" : rate >= 92 ? "Atenção" : "Crítico"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
