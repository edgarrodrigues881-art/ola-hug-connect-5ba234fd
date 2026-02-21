import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface Props {
  rate: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
}

export function DeliveryRateCard({ rate, totalSent, totalDelivered, totalFailed }: Props) {
  const [animatedRate, setAnimatedRate] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedRate(rate), 300);
    return () => clearTimeout(timeout);
  }, [rate]);

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (animatedRate / 100) * circumference;
  const color = rate >= 90 ? "text-emerald-400" : rate >= 70 ? "text-yellow-400" : "text-destructive";
  const strokeColor = rate >= 90 ? "#34d399" : rate >= 70 ? "#facc15" : "#ef4444";

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
      <CardContent className="p-5 flex flex-col items-center justify-center h-full gap-3">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="40"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
              fill="none"
              opacity="0.3"
            />
            <circle
              cx="50" cy="50" r="40"
              stroke={strokeColor}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-bold ${color}`}>{animatedRate}%</span>
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-medium text-foreground">Taxa de Entrega</p>
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span>{totalSent} env.</span>
            <span>{totalDelivered} ent.</span>
            <span className={totalFailed > 0 ? "text-destructive" : ""}>{totalFailed} falhas</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
