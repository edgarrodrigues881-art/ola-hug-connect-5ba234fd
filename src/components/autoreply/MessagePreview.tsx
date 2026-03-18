import type { FlowNodeData } from "./types";

interface Props {
  data: FlowNodeData;
}

export function MessagePreview({ data }: Props) {
  const text = (data.text || "").replace(
    /\{(\w+)\}/g,
    (_, v) => `<span class="font-semibold text-primary">«${v}»</span>`
  );

  return (
    <div className="bg-muted/30 border border-border rounded-2xl overflow-hidden">
      {/* Chat bubble */}
      <div className="p-3 space-y-2">
        {data.imageUrl && (
          <div className="rounded-xl overflow-hidden border border-border/50">
            <img src={data.imageUrl} alt="" className="w-full h-28 object-cover" />
            {data.imageCaption && (
              <p className="text-[11px] text-foreground/70 px-2 py-1.5">{data.imageCaption}</p>
            )}
          </div>
        )}
        {data.text && (
          <div className="bg-card rounded-xl px-3 py-2 border border-border/50">
            <p
              className="text-xs text-foreground/80 whitespace-pre-line leading-relaxed"
              dangerouslySetInnerHTML={{ __html: text }}
            />
          </div>
        )}
        {data.buttons && data.buttons.length > 0 && (
          <div className="space-y-1">
            {data.buttons.map((btn) => (
              <div
                key={btn.id}
                className="text-[11px] font-medium text-center py-2 rounded-lg bg-primary/10 text-primary border border-primary/20"
              >
                {btn.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
