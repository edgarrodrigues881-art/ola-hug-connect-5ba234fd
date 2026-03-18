import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CircleStop } from "lucide-react";
import type { FlowNodeData } from "./types";

const actionLabels: Record<string, string> = {
  end_flow: "Encerrar fluxo",
  wait_response: "Aguardar resposta",
  transfer_human: "Transferir para humano",
};

export function EndNode({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  return (
    <div
      className={`rounded-2xl border-2 bg-card shadow-lg min-w-[200px] transition-all duration-150
        ${selected ? "border-rose-500 shadow-rose-500/20 shadow-xl" : "border-rose-500/30 hover:border-rose-500/60"}`}
    >
      <Handle type="target" position={Position.Left} id="in" className="!w-3 !h-3 !bg-rose-500 !border-2 !border-card" />
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-rose-500/5 rounded-t-2xl">
        <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center">
          <CircleStop className="w-4 h-4 text-rose-500" />
        </div>
        <span className="font-semibold text-sm text-foreground">{d.label}</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-muted-foreground">{actionLabels[d.action || "end_flow"]}</p>
      </div>
    </div>
  );
}
