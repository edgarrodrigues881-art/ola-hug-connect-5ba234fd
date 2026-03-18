import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap, FileText } from "lucide-react";
import type { FlowNodeData } from "./types";

const triggerLabels: Record<string, string> = {
  any_message: "Qualquer mensagem",
  keyword: "Palavra-chave",
  new_contact: "Novo contato",
  start_chat: "Início de atendimento",
  template: "Template",
};

export function StartNode({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  const isTemplate = d.trigger === "template";

  return (
    <div
      className={`group rounded-2xl bg-card/95 backdrop-blur-sm min-w-[210px] transition-all duration-200 ease-out
        ${selected
          ? "shadow-[0_0_0_2px_hsl(var(--primary)),0_8px_32px_-8px_hsl(var(--primary)/0.25)] scale-[1.02]"
          : "shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.08)] hover:shadow-[0_4px_20px_-6px_hsl(var(--foreground)/0.12)] hover:scale-[1.01] border border-border/40"
        }`}
    >
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ring-1 ${
          isTemplate
            ? "bg-primary/10 ring-primary/20"
            : "bg-emerald-500/10 ring-emerald-500/20"
        }`}>
          {isTemplate
            ? <FileText className="w-4 h-4 text-primary" />
            : <Zap className="w-4 h-4 text-emerald-500" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-tight">
            {isTemplate ? "Template" : d.label}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {isTemplate && d.templateName ? d.templateName : triggerLabels[d.trigger || "keyword"]}
          </p>
        </div>
      </div>
      {d.trigger === "keyword" && d.keyword && (
        <div className="px-4 pb-3">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/8 text-emerald-500 border border-emerald-500/15">
            "{d.keyword}"
          </span>
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="!w-4 !h-4 !bg-emerald-500 !border-[2.5px] !border-card !rounded-full !shadow-[0_0_6px_hsl(142_71%_45%/0.3)]"
      />
    </div>
  );
}
