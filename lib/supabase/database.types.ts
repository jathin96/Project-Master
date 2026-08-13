export type UserRole = "MD" | "ARCHITECT" | "PROJECT_HEAD" | "EXECUTION_HEAD" | "PROCESS_COORDINATOR" | "PURCHASE_MANAGER";
export type ProjectPhase = "INITIATION" | "DESIGN" | "FULL_KITTING" | "EXECUTION" | "FINISHING";
export type ProjectStatus = "RUNNING" | "COMPLETED" | "ON_HOLD";
export type TaskStatus = "ON_TIME" | "DELAYED" | "COMPLETED";

export type ProjectRow = {
  id: string; code: string; name: string; location: string | null;
  status: ProjectStatus; phase: ProjectPhase; current_gate: string | null;
  gate_progress: number; budget: number; spent: number;
  incharge_id: string | null; due_date: string | null; created_at: string;
};

export type TaskRow = {
  id: string; project_id: string; task_code: string | null; title: string;
  owner_name: string; phase: ProjectPhase; status: TaskStatus;
  start_date: string | null; due_date: string; percent_done: number;
  actual_end_date: string | null; form_link: string | null; frequency: string | null;
  is_gate: boolean; closed_by_id: string | null; closed_by_role: UserRole | null;
  closed_at: string | null; acknowledged_at: string | null;
};
