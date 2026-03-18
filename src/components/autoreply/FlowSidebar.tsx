import { Zap, MessageSquare, CircleStop } from "lucide-react";

const blocks = [
  { type: "startNode", label: "Início", icon: Zap, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { type: "messageNode", label: "Mensagem", icon: MessageSquare, color: "text-primary bg-primary/10 border-primary/20" },
  { type: "endNode", label: "Finalizar", icon: CircleStop, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
];

export function FlowSidebar() {
  const onDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("application/reactflow", type);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-[180px] shrink-0 border-r border-border bg-card/50 p-3 space-y-2 overflow-y-auto">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold px-1 mb-3">
        Blocos
      </p>
      {blocks.map((b) => (
        <div
          key={b.type}
          draggable
          onDragStart={(e) => onDragStart(e, b.type)}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] hover:shadow-md ${b.color}`}
        >
          <b.icon className="w-4 h-4 shrink-0" />
          <span className="text-xs font-semibold">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
