import { useState, useCallback, useRef, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  MarkerType,
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
  style: { stroke: "hsl(var(--primary) / 0.5)", strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary) / 0.6)", width: 16, height: 16 },
};

const defaultNodes: Node<FlowNodeData>[] = [
  {
    id: "start-1",
    type: "startNode",
    position: { x: 100, y: 200 },
    data: { label: "Início", trigger: "keyword", keyword: "" },
  },
];

const defaultEdges: Edge[] = [];

let nodeId = 100;

function FlowCanvas() {
  const initial = useMemo(() => getInitialData(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState(initial.name);
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
    <div className="flow-builder-fullscreen flex flex-col h-full w-full overflow-hidden">
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
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode={["Backspace", "Delete"]}
            className="bg-background"
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={0.8} className="!bg-background" color="hsl(var(--muted-foreground) / 0.08)" />
            <Controls
              showInteractive={false}
              className="!bg-card/90 !backdrop-blur-sm !border-border/50 !shadow-xl !rounded-2xl !overflow-hidden [&>button]:!bg-transparent [&>button]:!border-b [&>button]:!border-border/30 [&>button]:!text-muted-foreground [&>button:hover]:!bg-muted/50 [&>button:hover]:!text-foreground [&>button]:!transition-colors [&>button]:!duration-150 [&>button:last-child]:!border-b-0"
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
