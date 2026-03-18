import { Node } from "@xyflow/react";
import { X, Trash2, Copy, Plus, FileText, Unlink, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FlowNodeData, FlowButton } from "./types";
import { MessagePreview } from "./MessagePreview";
import { useTemplates, type Template } from "@/hooks/useTemplates";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

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
  const navigate = useNavigate();

  const { data: templatesList } = useTemplates();
  const [showModelPicker, setShowModelPicker] = useState(false);

  const isUsingModel = !!d.templateId;

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

  const selectModel = (template: Template) => {
    const buttons: FlowButton[] = (template.buttons || []).map((btn: any, i: number) => ({
      id: `btn-tpl-${++btnCounter}`,
      label: typeof btn === "string" ? btn : btn.label || `Botão ${i + 1}`,
      targetNodeId: "",
    }));

    onUpdate(node.id, {
      templateId: template.id,
      templateName: template.name,
      text: template.content,
      imageUrl: template.media_url || "",
      buttons,
    });
    setShowModelPicker(false);
  };

  const unlinkModel = () => {
    onUpdate(node.id, { templateId: undefined, templateName: undefined });
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
          <>
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

            {/* Template selector for start node */}
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Template</Label>
              {isUsingModel ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-primary/70" />
                      <span className="text-xs font-medium text-foreground">Usando modelo</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 h-4 border-primary/20 text-primary/60 bg-primary/5">
                      Vinculado
                    </Badge>
                  </div>
                  <p className="text-xs text-primary/80 font-medium truncate">{d.templateName}</p>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 flex-1 border-border/40" onClick={() => setShowModelPicker(true)}>
                      Trocar modelo
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-border/40" onClick={unlinkModel}>
                      <Unlink className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-border/40" onClick={() => navigate("/dashboard/templates")}>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 w-full border-border/40 hover:border-primary/40 hover:text-primary"
                  onClick={() => setShowModelPicker(true)}
                >
                  <FileText className="w-3 h-3" /> Selecionar modelo
                </Button>
              )}
            </div>

            {/* Model Picker for start node */}
            {showModelPicker && (
              <div className="rounded-xl border border-border/40 bg-card/80 overflow-hidden">
                <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground/60">Selecionar modelo</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowModelPicker(false)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <ScrollArea className="max-h-[220px]">
                  {!templatesList || templatesList.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-xs text-muted-foreground/50 mb-2">Nenhum modelo cadastrado</p>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => navigate("/dashboard/templates")}>
                        Ir para Template
                      </Button>
                    </div>
                  ) : (
                    <div className="p-1.5 space-y-1">
                      {templatesList.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => selectModel(tpl)}
                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors group/item"
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <FileText className="w-3 h-3 text-muted-foreground/40 group-hover/item:text-primary/60" />
                            <span className="text-xs font-medium text-foreground truncate">{tpl.name}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground/40 line-clamp-1 pl-5">{tpl.content}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </>
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
            {/* Message source selector */}
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Origem da mensagem</Label>
              
              {isUsingModel ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-primary/70" />
                      <span className="text-xs font-medium text-foreground">Usando modelo</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 h-4 border-primary/20 text-primary/60 bg-primary/5">
                      Vinculado
                    </Badge>
                  </div>
                  <p className="text-xs text-primary/80 font-medium truncate">{d.templateName}</p>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 flex-1 border-border/40" onClick={() => setShowModelPicker(true)}>
                      Trocar modelo
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-border/40" onClick={unlinkModel}>
                      <Unlink className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-border/40" onClick={() => navigate("/dashboard/templates")}>
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 flex-1 border-border/40 hover:border-primary/40 hover:text-primary"
                    onClick={() => setShowModelPicker(true)}
                  >
                    <FileText className="w-3 h-3" /> Selecionar modelo
                  </Button>
                </div>
              )}
            </div>

            {/* Model Picker */}
            {showModelPicker && (
              <div className="rounded-xl border border-border/40 bg-card/80 overflow-hidden">
                <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground/60">Selecionar modelo</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowModelPicker(false)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <ScrollArea className="max-h-[220px]">
                  {!templatesList || templatesList.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-xs text-muted-foreground/50 mb-2">Nenhum modelo cadastrado</p>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => navigate("/dashboard/templates")}>
                        Ir para Modelos
                      </Button>
                    </div>
                  ) : (
                    <div className="p-1.5 space-y-1">
                      {templatesList.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => selectModel(tpl)}
                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors group/item"
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <FileText className="w-3 h-3 text-muted-foreground/40 group-hover/item:text-primary/60" />
                            <span className="text-xs font-medium text-foreground truncate">{tpl.name}</span>
                            {tpl.buttons && Array.isArray(tpl.buttons) && tpl.buttons.length > 0 && (
                              <Badge variant="outline" className="text-[9px] px-1.5 h-4 border-border/30 text-muted-foreground/40 ml-auto">
                                {tpl.buttons.length} botão{tpl.buttons.length !== 1 ? "ões" : ""}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground/40 line-clamp-1 pl-5">{tpl.content}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

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
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
                  Botões interativos
                  {isUsingModel && (d.buttons?.length || 0) > 0 && (
                    <span className="ml-1.5 text-primary/50 normal-case tracking-normal">(do modelo)</span>
                  )}
                </Label>
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
