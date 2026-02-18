import { useRef, useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type StatusFilter = "NOVA" | "USANDO" | "USADA" | null;

const Proxy = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [pasteInput, setPasteInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch proxies from database
  const { data: dbProxies = [] } = useQuery({
    queryKey: ["proxies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proxies")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!session,
  });

  // Derive status: active = USANDO, not active = USADA, newly added (no usage yet) = NOVA
  // For simplicity: active && never used as "NOVA", active && used = "USANDO", !active = "USADA"
  const getStatus = (p: any): "NOVA" | "USANDO" | "USADA" => {
    if (!p.active) return "USADA";
    // If updated_at > created_at by more than 1s, consider it "USANDO"
    const created = new Date(p.created_at).getTime();
    const updated = new Date(p.updated_at).getTime();
    if (updated - created > 1000) return "USANDO";
    return "NOVA";
  };

  const proxiesWithIndex = dbProxies.map((p: any, i: number) => ({
    ...p,
    displayId: i + 1,
    proxyStatus: getStatus(p),
  }));

  const filtered = statusFilter
    ? proxiesWithIndex.filter((p: any) => p.proxyStatus === statusFilter)
    : proxiesWithIndex;

  // Mutations
  const addMutation = useMutation({
    mutationFn: async (proxies: { host: string; port: string; username: string; password: string }[]) => {
      const insertData = proxies.map((p) => ({
        ...p,
        type: "HTTP",
        user_id: session?.user.id,
      }));
      const { error } = await supabase.from("proxies").insert(insertData as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proxies"] });
      toast.success("Proxy(s) adicionada(s)!");
    },
    onError: () => toast.error("Erro ao adicionar proxy"),
  });

  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("proxies").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proxies"] });
      setSelectedIds(new Set());
      toast.success("Proxies removidas");
    },
  });

  // Parse proxy lines
  const parseLine = (line: string) => {
    let host = "", port = "", username = "", password = "";
    const trimmed = line.trim();
    if (!trimmed) return null;

    if (trimmed.includes("@")) {
      const [cred, hp] = trimmed.split("@");
      const c = cred.split(":");
      username = c[0] || "";
      password = c[1] || "";
      const h = hp?.split(":") || [];
      host = h[0] || "";
      port = h[1] || "";
    } else {
      const p = trimmed.split(":");
      host = p[0] || "";
      port = p[1] || "";
      username = p[2] || "";
      password = p[3] || "";
    }

    if (host && port) return { host, port, username, password };
    return null;
  };

  const handleAdd = () => {
    const lines = pasteInput.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed = lines.map(parseLine).filter(Boolean) as { host: string; port: string; username: string; password: string }[];

    if (parsed.length === 0) {
      toast.error("Nenhuma proxy válida encontrada");
      return;
    }

    addMutation.mutate(parsed);
    setPasteInput("");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const parsed = lines.map(parseLine).filter(Boolean) as any[];
      if (parsed.length > 0) {
        addMutation.mutate(parsed);
      } else {
        toast.error("Nenhuma proxy válida encontrada");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p: any) => p.id)));
    }
  };

  const removeSelected = () => {
    deleteMultipleMutation.mutate(Array.from(selectedIds));
  };

  const clearAll = () => {
    deleteMultipleMutation.mutate(filtered.map((p: any) => p.id));
  };

  const statusColors: Record<string, string> = {
    NOVA: "bg-slate-600 text-slate-200",
    USANDO: "bg-emerald-600 text-emerald-100",
    USADA: "bg-amber-600 text-amber-100",
  };

  const filterChips: StatusFilter[] = ["NOVA", "USANDO", "USADA"];

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <span className="text-emerald-500">✓</span> Proxy
        </h1>
        <p className="text-sm text-muted-foreground">Gerencie suas proxies</p>
      </div>

      {/* Filter chips + Import */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterChips.map((chip) => (
          <button
            key={chip}
            onClick={() => setStatusFilter(statusFilter === chip ? null : chip)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              statusFilter === chip
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {chip}
          </button>
        ))}

        <div className="ml-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv"
            className="hidden"
            onChange={handleImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            Importar
          </button>
        </div>
      </div>

      {/* Paste input */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <textarea
          value={pasteInput}
          onChange={(e) => setPasteInput(e.target.value)}
          placeholder="Cole aqui, uma por linha"
          rows={3}
          className="w-full bg-slate-800 text-sm text-foreground px-4 py-3 resize-none focus:outline-none placeholder:text-slate-500 font-mono"
        />
        <div className="flex justify-end px-3 py-2 bg-slate-800 border-t border-slate-700">
          <button
            onClick={handleAdd}
            className="px-4 py-1.5 rounded text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
          >
            Adicionar
          </button>
        </div>
      </div>

      {/* Bulk actions (only when selected) */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {selectedIds.size} selecionada(s)
          </span>
          <button
            onClick={removeSelected}
            className="px-3 py-1.5 rounded text-xs font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
          >
            Remover
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1.5 rounded text-xs font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
          >
            Limpar tudo
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-slate-700 bg-slate-800 overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-800 border-b border-slate-700 z-10">
              <tr>
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={selectAll}
                    className="rounded border-slate-600 accent-indigo-500"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-400">
                  ID
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-400">
                  Proxy
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-slate-400">
                  Status
                </th>
                <th className="w-10 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-sm text-slate-500">
                    Nenhuma proxy cadastrada. Importe ou cole acima.
                  </td>
                </tr>
              ) : (
                filtered.map((proxy: any) => {
                  const isSelected = selectedIds.has(proxy.id);
                  return (
                    <tr
                      key={proxy.id}
                      className={`border-b border-slate-700 last:border-0 transition-colors ${
                        isSelected ? "bg-slate-700/50" : "hover:bg-slate-700/30"
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(proxy.id)}
                          className="rounded border-slate-600 accent-indigo-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-400 font-mono">
                        {proxy.displayId}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground font-mono">
                        {proxy.host}:{proxy.port}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            statusColors[proxy.proxyStatus]
                          }`}
                        >
                          {proxy.proxyStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {isSelected && (
                          <button
                            onClick={() =>
                              deleteMultipleMutation.mutate([proxy.id])
                            }
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Remover"
                          >
                            🗑
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Proxy;
