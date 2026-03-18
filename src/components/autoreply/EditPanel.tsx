import { Node } from "@xyflow/react";
import { X, Trash2, Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FlowNodeData, FlowButton } from "./types";
import { MessagePreview } from "./MessagePreview";

interface Props {
  node: Node<FlowNodeData>;
  onUpdate: (id: string, data: Partial<FlowNodeData>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onClose: () => void;
}

let btnCounter = 200;

const variables = ["{nome}", "{numero}", "{email}", "{empresa}"];

export function EditPanel({ node, onUpdate, onDelete, onDuplicate, onClose }: Props) {
  const d = node.data;
  const isStart = node.type === "startNode";
  const isEnd = node.type === "endNode";
  const isMessage = node.type === "messageNode";

  const insertVariable = (v: string) => {
    onUpdate(node.id, { text: (d.text || "") + v });
  };

  const addButton = () => {
    const newBtn: FlowButton = { id: `btn-${++btnCounter}`, label: "Novo Botão", targetNodeId: "" };
    onUpdate(node.id, { buttons: [...(d.buttons || []), newBtn] });
  };

  const updateButton = (btnId: string, label: string) => {
    onUpdate(node.id, {
      buttons: (d.buttons || []).map((b) => (b.id === btnId ? { ...b, label } : b)),
    });
  };

  const removeButton = (btnId: string) => {
    onUpdate(node.id, { buttons: (d.buttons || []).filter((b) => b.id !== btnId) });
  };

  return (
    <div className="w-[340px] shrink-0 border-l border-border/40 bg-card/50 backdrop-blur-sm overflow-y-auto animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 sticky top-0 bg-card/80 backdrop-blur-sm z-10">
        <h3 className="text-[13px] font-semibold text-foreground">Editar Bloco</h3>
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground/50 hover:text-foreground" onClick={() => onDuplicate(node.id)}>
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground/50 hover:text-destructive" onClick={() => onDelete(node.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground/50 hover:text-foreground" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Label */}
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Nome do bloco</Label>
          <Input
            value={d.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        {/* Start node */}
        {isStart && (
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Gatilho</Label>
            <Select value={d.trigger || "any_message"} onValueChange={(v) => onUpdate(node.id, { trigger: v as any })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any_message">Qualquer mensagem</SelectItem>
                <SelectItem value="keyword">Palavra-chave</SelectItem>
                <SelectItem value="new_contact">Novo contato</SelectItem>
                <SelectItem value="start_chat">Início de atendimento</SelectItem>
              </SelectContent>
            </Select>
            {d.trigger === "keyword" && (
              <Input
                placeholder="Digite a palavra-chave"
                value={d.keyword || ""}
                onChange={(e) => onUpdate(node.id, { keyword: e.target.value })}
                className="h-9 text-sm mt-2"
              />
            )}
          </div>
        )}

        {/* End node */}
        {isEnd && (
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Ação final</Label>
            <Select value={d.action || "end_flow"} onValueChange={(v) => onUpdate(node.id, { action: v as any })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="end_flow">Encerrar fluxo</SelectItem>
                <SelectItem value="wait_response">Aguardar resposta</SelectItem>
                <SelectItem value="transfer_human">Transferir para humano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Message node */}
        {isMessage && (
          <>
            {/* Text */}
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Mensagem</Label>
              <Textarea
                value={d.text || ""}
                onChange={(e) => onUpdate(node.id, { text: e.target.value })}
                className="min-h-[100px] text-sm resize-none"
                placeholder="Digite a mensagem..."
              />
              <div className="flex flex-wrap gap-1.5">
                {variables.map((v) => (
                  <button
                    key={v}
                    onClick={() => insertVariable(v)}
                    className="text-[10px] font-mono px-2 py-1 rounded-lg bg-primary/6 text-primary/70 hover:bg-primary/12 hover:text-primary transition-colors border border-primary/10"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Image */}
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Imagem (URL)</Label>
              <Input
                value={d.imageUrl || ""}
                onChange={(e) => onUpdate(node.id, { imageUrl: e.target.value })}
                placeholder="https://..."
                className="h-9 text-sm"
              />
              {d.imageUrl && (
                <>
                  <img src={d.imageUrl} alt="" className="w-full h-32 object-cover rounded-xl border border-border/30" />
                  <Input
                    value={d.imageCaption || ""}
                    onChange={(e) => onUpdate(node.id, { imageCaption: e.target.value })}
                    placeholder="Legenda da imagem (opcional)"
                    className="h-9 text-sm"
                  />
                </>
              )}
            </div>

            {/* Delay */}
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Delay (segundos)</Label>
              <Input
                type="number"
                min={0}
                value={d.delay || 0}
                onChange={(e) => onUpdate(node.id, { delay: parseInt(e.target.value) || 0 })}
                className="h-9 text-sm w-24"
              />
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Botões interativos</Label>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground/60 hover:text-foreground" onClick={addButton}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
              {(d.buttons || []).map((btn, i) => (
                <div key={btn.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/30 w-4 shrink-0 text-right">{i + 1}</span>
                  <Input
                    value={btn.label}
                    onChange={(e) => updateButton(btn.id, e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground/30 hover:text-destructive" onClick={() => removeButton(btn.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Preview</Label>
              <MessagePreview data={d} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
