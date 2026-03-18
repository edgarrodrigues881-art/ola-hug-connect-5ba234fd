import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, GitBranch, MousePointerClick, MessageSquare, ArrowRight } from "lucide-react";
import type { AutoReplyTemplate } from "./templates-data";
import { categoryLabels, categoryColors } from "./templates-data";

const triggerLabels: Record<string, string> = {
  any_message: "Qualquer mensagem",
  keyword: "Palavra-chave",
  new_contact: "Novo contato",
  start_chat: "Início de atendimento",
};

interface Props {
  template: AutoReplyTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: (template: AutoReplyTemplate) => void;
}

export function TemplatePreviewDialog({ template, open, onOpenChange, onUse }: Props) {
  if (!template) return null;

  const messageNodes = template.nodes.filter((n) => n.type === "messageNode");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 border ${categoryColors[template.category] || ""}`}>
              {categoryLabels[template.category]}
            </Badge>
            {template.popular && (
              <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-amber-500/20 text-amber-400 bg-amber-500/10">
                ⭐ Popular
              </Badge>
            )}
          </div>
          <DialogTitle className="text-lg">{template.name}</DialogTitle>
          <p className="text-xs text-muted-foreground/60 mt-1">{template.description}</p>
        </DialogHeader>

        {/* Stats */}
        <div className="flex items-center gap-4 py-3 border-y border-border/20">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
            <Zap className="w-3.5 h-3.5 text-amber-500/60" />
            {triggerLabels[template.trigger]}
            {template.triggerKeyword && (
              <code className="text-[10px] bg-muted/30 px-1.5 py-0.5 rounded">"{template.triggerKeyword}"</code>
            )}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
            <GitBranch className="w-3.5 h-3.5" /> {template.steps} etapas
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
            <MousePointerClick className="w-3.5 h-3.5" /> {template.buttons} botões
          </span>
        </div>

        {/* Flow preview */}
        <div className="space-y-2 mt-2">
          <h4 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Preview do fluxo</h4>
          <div className="space-y-2">
            {/* Start */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs font-medium text-foreground">Início</span>
              <span className="text-[10px] text-muted-foreground/50 ml-auto">
                {triggerLabels[template.trigger]}
              </span>
            </div>

            {messageNodes.map((node, i) => (
              <div key={node.id}>
                <div className="flex justify-center">
                  <ArrowRight className="w-3 h-3 text-muted-foreground/20 rotate-90" />
                </div>
                <div className="px-3 py-2.5 rounded-lg bg-card/80 border border-border/30">
                  <div className="flex items-center gap-2 mb-1.5">
                    <MessageSquare className="w-3 h-3 text-primary/60" />
                    <span className="text-xs font-medium text-foreground">{node.data.label}</span>
                  </div>
                  {node.data.text && (
                    <p className="text-[11px] text-muted-foreground/50 line-clamp-2 whitespace-pre-line">
                      {node.data.text}
                    </p>
                  )}
                  {node.data.buttons && node.data.buttons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {node.data.buttons.map((btn) => (
                        <span key={btn.id} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/70 border border-primary/15">
                          {btn.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* End */}
            {template.nodes.some((n) => n.type === "endNode") && (
              <>
                <div className="flex justify-center">
                  <ArrowRight className="w-3 h-3 text-muted-foreground/20 rotate-90" />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/10 border border-border/20">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  <span className="text-xs font-medium text-muted-foreground/60">Finalizar</span>
                </div>
              </>
            )}
          </div>
        </div>

        <Button className="w-full mt-4 gap-2" onClick={() => onUse(template)}>
          <Plus className="w-4 h-4" /> Usar este template
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Plus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  );
}
