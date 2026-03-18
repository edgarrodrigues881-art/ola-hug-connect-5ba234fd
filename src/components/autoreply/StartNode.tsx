import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap } from "lucide-react";
import type { FlowNodeData } from "./types";

const triggerLabels: Record<string, string> = {
  any_message: "Qualquer mensagem",
  keyword: "Palavra-chave",
  new_contact: "Novo contato",
  start_chat: "Início de atendimento",
};

export function StartNode({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  return (
    <div
      className={`rounded-2xl border-2 bg-card shadow-lg min-w-[200px] transition-all duration-150
        ${selected ? "border-emerald-500 shadow-emerald-500/20 shadow-xl" : "border-emerald-500/30 hover:border-emerald-500/60"}`}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-emerald-500/5 rounded-t-2xl">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <Zap className="w-4 h-4 text-emerald-500" />
        </div>
        <span className="font-semibold text-sm text-foreground">{d.label}</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {triggerLabels[d.trigger || "any_message"]}
        </p>
        {d.trigger === "keyword" && d.keyword && (
          <p className="text-xs font-mono mt-1 text-emerald-500">"{d.keyword}"</p>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="out" className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-card" />
    </div>
  );
}
