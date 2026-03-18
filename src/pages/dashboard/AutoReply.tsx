import { useState, useCallback, useRef, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  MarkerType,
  Panel,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { StartNode } from "@/components/autoreply/StartNode";
import { MessageNode } from "@/components/autoreply/MessageNode";
import { EndNode } from "@/components/autoreply/EndNode";
import { FlowSidebar } from "@/components/autoreply/FlowSidebar";
import { EditPanel } from "@/components/autoreply/EditPanel";
import { FlowHeader } from "@/components/autoreply/FlowHeader";
import type { FlowNodeData } from "@/components/autoreply/types";

const nodeTypes = {
  startNode: StartNode,
  messageNode: MessageNode,
  endNode: EndNode,
};

const defaultEdgeOptions = {
  type: "smoothstep",
  animated: true,
  style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
};

const initialNodes: Node<FlowNodeData>[] = [
  {
    id: "start-1",
    type: "startNode",
    position: { x: 100, y: 200 },
    data: { label: "Início", trigger: "keyword", keyword: "" },
  },
  {
    id: "msg-1",
    type: "messageNode",
    position: { x: 450, y: 100 },
    data: {
      label: "Boas-vindas",
      text: "Olá {nome}, seja bem-vindo! 👋\nEscolha uma opção abaixo:",
      imageUrl: "",
      imageCaption: "",
      delay: 0,
      buttons: [
        { id: "btn-1", label: "Ver planos", targetNodeId: "" },
        { id: "btn-2", label: "Suporte", targetNodeId: "" },
        { id: "btn-3", label: "Falar com atendente", targetNodeId: "" },
      ],
    },
  },
  {
    id: "msg-2",
    type: "messageNode",
    position: { x: 850, y: 0 },
    data: {
      label: "Planos",
      text: "Confira nossos planos disponíveis:\n\n🥇 Pro — R$197/mês\n🥈 Start — R$97/mês\n\nQual plano te interessa?",
      imageUrl: "",
      imageCaption: "",
      delay: 2,
      buttons: [],
    },
  },
  {
    id: "msg-3",
    type: "messageNode",
    position: { x: 850, y: 250 },
    data: {
      label: "Suporte",
      text: "Nosso suporte está disponível de segunda a sexta, das 9h às 18h.\n\nDescreva sua dúvida que vamos te ajudar! 😊",
      imageUrl: "",
      imageCaption: "",
      delay: 1,
      buttons: [],
    },
  },
  {
    id: "end-1",
    type: "endNode",
    position: { x: 850, y: 480 },
    data: { label: "Finalizar", action: "end_flow" },
  },
];

const initialEdges: Edge[] = [
  { id: "e-start-msg1", source: "start-1", target: "msg-1", sourceHandle: "out" },
  { id: "e-msg1-btn1", source: "msg-1", target: "msg-2", sourceHandle: "btn-btn-1" },
  { id: "e-msg1-btn2", source: "msg-1", target: "msg-3", sourceHandle: "btn-btn-2" },
  { id: "e-msg1-btn3", source: "msg-1", target: "end-1", sourceHandle: "btn-btn-3" },
];

let nodeId = 100;

function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState("Minha Automação");
  const [isActive, setIsActive] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const id = `${type}-${++nodeId}`;

      let data: FlowNodeData;
      if (type === "startNode") {
        data = { label: "Início", trigger: "any_message", keyword: "" };
      } else if (type === "endNode") {
        data = { label: "Finalizar", action: "end_flow" };
      } else {
        data = {
          label: "Nova Mensagem",
          text: "",
          imageUrl: "",
          imageCaption: "",
          delay: 0,
          buttons: [],
        };
      }

      const newNode: Node<FlowNodeData> = { id, type, position, data };
      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(id);
    },
    [screenToFlowPosition, setNodes]
  );

  const updateNodeData = useCallback(
    (id: string, newData: Partial<FlowNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...newData } } : n))
      );
    },
    [setNodes]
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      if (selectedNodeId === id) setSelectedNodeId(null);
    },
    [setNodes, setEdges, selectedNodeId]
  );

  const duplicateNode = useCallback(
    (id: string) => {
      const node = nodes.find((n) => n.id === id);
      if (!node) return;
      const newId = `${node.type}-${++nodeId}`;
      const newNode: Node<FlowNodeData> = {
        ...node,
        id: newId,
        position: { x: node.position.x + 50, y: node.position.y + 50 },
        data: {
          ...node.data,
          label: `${node.data.label} (cópia)`,
          buttons: node.data.buttons?.map((b) => ({ ...b, id: `btn-${++nodeId}` })),
        },
        selected: false,
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [nodes, setNodes]
  );

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      <FlowHeader
        name={flowName}
        onNameChange={setFlowName}
        isActive={isActive}
        onToggleActive={() => setIsActive(!isActive)}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <FlowSidebar />
        <div ref={reactFlowWrapper} className="flex-1 min-w-0 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            deleteKeyCode={["Backspace", "Delete"]}
            className="bg-background"
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" color="hsl(var(--muted-foreground) / 0.15)" />
            <Controls className="!bg-card !border-border !shadow-lg !rounded-xl [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted" />
            <MiniMap
              className="!bg-card !border-border !shadow-lg !rounded-xl"
              nodeColor="hsl(var(--primary))"
              maskColor="hsl(var(--background) / 0.8)"
            />
          </ReactFlow>
        </div>
        {selectedNode && (
          <EditPanel
            node={selectedNode}
            onUpdate={updateNodeData}
            onDelete={deleteNode}
            onDuplicate={duplicateNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}

export default function AutoReply() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
