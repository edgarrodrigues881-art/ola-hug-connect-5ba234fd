export interface FlowButton {
  id: string;
  label: string;
  targetNodeId: string;
}

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  // Start node
  trigger?: "any_message" | "keyword" | "new_contact" | "start_chat" | "template";
  keyword?: string;
  // Message node
  text?: string;
  imageUrl?: string;
  imageCaption?: string;
  delay?: number;
  buttons?: FlowButton[];
  // Model integration
  templateId?: string;
  templateName?: string;
  // End node
  action?: "end_flow" | "wait_response" | "transfer_human";
}
