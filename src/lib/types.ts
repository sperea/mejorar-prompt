export type Fase = "preguntas" | "finalizado" | "finalizado_con_advertencia";

export interface OrchestratorResponse {
  fase: Fase;
  contenido: string;
  progreso: number;
  ronda_actual: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
