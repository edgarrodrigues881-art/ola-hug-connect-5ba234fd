import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MessageSquare, Image, Clock } from "lucide-react";
import type { FlowNodeData } from "./types";

export function MessageNode({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  const hasImage = !!d.imageUrl;
  const hasButtons = d.buttons && d.buttons.length > 0;

  return (
    <div
      className={`rounded-2xl border-2 bg-card shadow-lg min-w-[240px] max-w-[280px] transition-all duration-150
        ${selected ? "border-primary shadow-primary/20 shadow-xl" : "border-primary/30 hover:border-primary/60"}`}
    >
      <Handle type="target" position={Position.Left} id="in" className="!w-3 !h-3 !bg-primary !border-2 !border-card" />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-primary/5 rounded-t-2xl">
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-primary" />
        </div>
        <span className="font-semibold text-sm text-foreground truncate flex-1">{d.label}</span>
        {d.delay && d.delay > 0 ? (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> {d.delay}s
          </span>
        ) : null}
      </div>

      {/* Body preview */}
      <div className="px-4 py-3 space-y-2">
        {hasImage && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Image className="w-3.5 h-3.5" />
            <span>Imagem anexada</span>
          </div>
        )}
        {d.text && (
          <p className="text-xs text-foreground/80 line-clamp-3 whitespace-pre-line leading-relaxed">
            {d.text.replace(/\{(\w+)\}/g, (_, v) => `«${v}»`)}
          </p>
        )}
      </div>

      {/* Buttons with individual handles */}
      {hasButtons && (
        <div className="border-t border-border/50 px-3 py-2 space-y-1.5">
          {d.buttons!.map((btn) => (
            <div key={btn.id} className="relative flex items-center">
              <div className="flex-1 text-[11px] font-medium text-center py-1.5 px-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                {btn.label}
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={`btn-${btn.id}`}
                className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-card !right-[-6px]"
              />
            </div>
          ))}
        </div>
      )}

      {/* Default output if no buttons */}
      {!hasButtons && (
        <Handle type="source" position={Position.Right} id="out" className="!w-3 !h-3 !bg-primary !border-2 !border-card" />
      )}
    </div>
  );
}
