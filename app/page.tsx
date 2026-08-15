"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Role = "MD" | "Architect" | "Project Head" | "Execution Head" | "Process Coordinator" | "Purchase Manager";
type View = "dashboard" | "projects" | "tasks" | "budget" | "scope" | "meetings" | "access";
type Phase = "Initiation" | "Design" | "Full Kitting" | "Execution" | "Finishing";
type Project = { id: number | string; code: string; name: string; location: string; progress: number; tasks: number; overdue: number; team: string[]; due: string; tone: string; phase: Phase; gate: string; gateProgress: number; budget: number; spent: number };
type TaskRow = { code: string; title: string; project: string; phase: Phase; owner: string; start: string; due: string; done: number; actualEnd: string; status: "On time" | "Delayed" | "Completed"; gate?: boolean; frequency?: string; formLink?: string };
type Acknowledgement = { id: number; task: string; project: string; closedBy: Role; closedAt: string; acknowledged: boolean };

const projects: Project[] = [];

const money = (value: number) => `${value < 0 ? "−" : ""}₹${(Math.abs(value) / 10000000).toFixed(Math.abs(value) % 10000000 === 0 ? 0 : 1)} Cr`;

const baseTasks: TaskRow[] = [];

const meetings: { date: string; title: string; project: string; note: string; owner: string }[] = [];

const nav: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Overview", icon: "⌂" },
  { id: "projects", label: "Projects", icon: "▦" },
  { id: "tasks", label: "Task manager", icon: "✓" },
  { id: "budget", label: "Budget & spend", icon: "₹" },
  { id: "scope", label: "Scope & drawings", icon: "▱" },
  { id: "meetings", label: "Meeting notes", icon: "≡" },
  { id: "access", label: "Access control", icon: "⚿" },
];

const teamUsers: { initials: string; name: string; email: string; role: Role; access: string }[] = [
  { initials: "N", name: "Naveen", email: "naveen@grs.com", role: "Project Head", access: "Full administrator" },
];

const roleLabels: Record<string, Role> = {
  MD: "MD", ARCHITECT: "Architect", PROJECT_HEAD: "Project Head", EXECUTION_HEAD: "Execution Head",
  PROCESS_COORDINATOR: "Process Coordinator", PURCHASE_MANAGER: "Purchase Manager",
};

type AuthProfile = { id: string; name: string; email: string; role: string };

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { setProfile(null); setLoading(false); return; }
      const { data, error } = await supabase.from("pm_profiles").select("id,name,email,role").eq("id", user.id).single();
      if (!active) return;
      if (error || !data) { await supabase.auth.signOut(); setAuthError("Your account has no Project Master role. Contact the Project Head."); setProfile(null); }
      else setProfile(data as AuthProfile);
      setLoading(false);
    }
    loadProfile();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { loadProfile(); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthError(""); setLoading(true);
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({ email: String(form.get("email")).trim().toLowerCase(), password: String(form.get("password")) });
    if (error) { setAuthError("Invalid login ID or password."); setLoading(false); }
  }

  if (loading) return <main className="auth-screen"><div className="auth-card"><div className="auth-logo">PM</div><p>Securing your workspace…</p></div></main>;
  if (!profile) return <main className="auth-screen"><form className="auth-card" onSubmit={signIn}><div className="auth-logo">PM</div><p className="eyebrow">Project Master</p><h1>Sign in to continue</h1><p className="auth-subtitle">Use your company login ID and password.</p><label>Login ID<input name="email" type="email" required autoComplete="username" placeholder="name@grs.com" /></label><label>Password<input name="password" type="password" required autoComplete="current-password" /></label>{authError && <div className="auth-error">{authError}</div>}<button className="primary">Sign in</button></form></main>;
  return <ProjectMasterApp profile={profile} onSignOut={() => supabase.auth.signOut()} />;
}

function ProjectMasterApp({ profile, onSignOut }: { profile: AuthProfile; onSignOut: () => Promise<unknown> }) {
  const supabase = useMemo(() => createClient(), []);
  const [view, setView] = useState<View>("dashboard");
  const role = roleLabels[profile.role] ?? "Architect";
  const initials = profile.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const [query, setQuery] = useState("");
  const [taskRows, setTaskRows] = useState(baseTasks);
  const [projectRows, setProjectRows] = useState(projects);
  const [modal, setModal] = useState<"task" | "mom" | null>(null);
  const [manageModal, setManageModal] = useState<"project" | "member" | null>(null);
  const [toast, setToast] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const [acknowledgements, setAcknowledgements] = useState<Acknowledgement[]>([]);
  const [taskToClose, setTaskToClose] = useState<TaskRow | null>(null);

  useEffect(() => {
    let active = true;
    supabase.from("pm_projects").select("id,code,name,location,phase,current_gate,gate_progress,budget,spent,due_date").order("created_at").then(({ data }) => {
      if (!active || !data) return;
      setProjectRows(data.map((row) => ({ id: row.id, code: row.code, name: row.name, location: row.location ?? "", progress: 0, tasks: 0, overdue: 0, team: [], due: row.due_date ?? "TBD", tone: "blue", phase: ({ INITIATION: "Initiation", DESIGN: "Design", FULL_KITTING: "Full Kitting", EXECUTION: "Execution", FINISHING: "Finishing" } as Record<string, Phase>)[row.phase] ?? "Initiation", gate: row.current_gate ?? "Gate 1 · Concept Brief Signed", gateProgress: row.gate_progress ?? 0, budget: Number(row.budget) || 0, spent: Number(row.spent) || 0 })));
    });
    return () => { active = false; };
  }, [supabase]);

  const filteredProjects = useMemo(() => projectRows.filter((p) => `${p.name} ${p.code} ${p.location}`.toLowerCase().includes(query.toLowerCase())), [query, projectRows]);
  const isAdmin = role === "Project Head";
  const canManage = isAdmin || role === "MD";
  const canCreateTasks = isAdmin || role === "Execution Head" || role === "Process Coordinator";
  const canCloseTasks = isAdmin || role === "Process Coordinator";
  const canEditMoms = isAdmin || role === "Process Coordinator";
  const visibleNav = nav.filter((item) => item.id !== "access" || canManage);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const projectName = String(data.get("project"));
    const selectedProject = projectRows.find((project) => project.name === projectName);
    if (!selectedProject) { notify("Select a listed project before creating the task"); return; }
    setTaskRows([{ code: "NEW", title: String(data.get("title")), project: projectName, phase: selectedProject.phase, owner: profile.name, start: "13 Aug", due: "22 Aug", done: 0, actualEnd: "—", status: "On time" }, ...taskRows]);
    setModal(null);
    notify("Task added to the project plan");
  }

  function closeTask(task: TaskRow) {
    setTaskToClose(task);
  }

  function confirmTaskClosure(task: TaskRow) {
    setTaskRows(taskRows.map((row) => row.code === task.code && row.project === task.project ? { ...row, status: "Completed", done: 100, actualEnd: "13 Aug" } : row));
    if (role === "Process Coordinator") {
      setAcknowledgements([{ id: Date.now(), task: task.title, project: task.project, closedBy: role, closedAt: "Just now", acknowledged: false }, ...acknowledgements]);
      notify("Task closed — acknowledgement sent to Project Head");
    } else notify("Task closed and recorded");
    setTaskToClose(null);
  }

  async function changeProjectPhase(project: Project, phase: Phase) {
    const databasePhase = ({ Initiation: "INITIATION", Design: "DESIGN", "Full Kitting": "FULL_KITTING", Execution: "EXECUTION", Finishing: "FINISHING" } as Record<Phase, string>)[phase];
    const { error } = await supabase.from("pm_projects").update({ phase: databasePhase }).eq("id", project.id);
    if (error) { notify(error.message || "Unable to update project stage"); return; }
    setProjectRows((rows) => rows.map((row) => row.id === project.id ? { ...row, phase } : row));
    notify(`${project.name} moved to ${phase}`);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("dashboard")} aria-label="Project Master home"><span>PM</span><strong>PROJECT<br />MASTER</strong></button>
        <nav aria-label="Primary navigation">
          <p className="eyebrow side-label">Workspace</p>
          {visibleNav.map((item) => <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)}><span>{item.icon}</span>{item.label}{item.id === "tasks" && taskRows.length > 0 && <i>{taskRows.length}</i>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item"><span>?</span>Help centre</button>
          <div className="profile">
            <div className="avatar">{initials}</div><div><strong>{profile.name}</strong><small>{role}</small></div><button className="sign-out" onClick={onSignOut}>Sign out</button>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand">PM</div>
          <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects, tasks or meetings..." /></label>
          <div className="top-actions">
            <span className="signed-role">{role}</span>
            <button className="notification" aria-label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}>♢{role === "Project Head" && acknowledgements.some((item) => !item.acknowledged) && <i />} {role === "Project Head" && acknowledgements.filter((item) => !item.acknowledged).length > 0 && <b>{acknowledgements.filter((item) => !item.acknowledged).length}</b>}</button>
            <div className="top-avatar">{initials}</div>
          </div>
        </header>

        <div className="content">
          <section className="hero-row">
            <div><p className="eyebrow">Project operations</p><h1>{view === "dashboard" ? `Welcome, ${profile.name.split(" ")[0]}.` : nav.find((n) => n.id === view)?.label}</h1><p className="subtitle">{view === "dashboard" ? "Here’s what needs your attention across all projects today." : `A focused view of your ${nav.find((n) => n.id === view)?.label.toLowerCase()}.`}</p></div>
            <div className="header-actions"><button className="secondary" onClick={() => notify("Report prepared for review")}>↗ Export report</button>{view === "projects" && canManage ? <button className="primary" onClick={() => setManageModal("project")}>＋ Add project</button> : view === "access" && canManage ? <button className="primary" onClick={() => setManageModal("member")}>＋ Add member</button> : view !== "budget" && projectRows.length > 0 && <button className="primary" onClick={() => view === "meetings" ? setModal("mom") : setModal("task")}>＋ {view === "meetings" ? "Add MOM" : "New task"}</button>}</div>
          </section>

          {view === "dashboard" && <Dashboard projects={projectRows} tasks={taskRows} onOpen={setView} />}
          {view === "projects" && <Projects rows={filteredProjects} canManage={canManage} onPhaseChange={changeProjectPhase} />}
          {view === "tasks" && <Tasks rows={taskRows} editable={canCloseTasks} onUpdate={closeTask} />}
          {view === "budget" && <BudgetSheet rows={filteredProjects} />}
          {view === "scope" && <Scope />}
          {view === "meetings" && <Meetings editable={canEditMoms} onAdd={() => setModal("mom")} />}
          {view === "access" && canManage && <AccessControl onNotify={notify} onInvite={() => setManageModal("member")} managerRole={role} />}
        </div>
      </section>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {visibleNav.filter((item) => item.id !== "access").map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobileAccountOpen(false); }}><span>{item.icon}</span><small>{item.label.replace(" manager", "").replace(" & spend", "")}</small></button>)}
        <button className={mobileAccountOpen ? "active" : ""} onClick={() => setMobileAccountOpen(!mobileAccountOpen)}><span>{initials}</span><small>Account</small></button>
      </nav>
      {mobileAccountOpen && <div className="mobile-account"><div><span className="avatar">{initials}</span><p><strong>{profile.name}</strong><small>{role}</small></p></div>{canManage && <button onClick={() => { setView("access"); setMobileAccountOpen(false); }}>Access control</button>}<button className="mobile-sign-out" onClick={onSignOut}>Sign out</button></div>}

      {modal && <Modal type={modal} projects={projectRows} canEdit={modal === "task" ? canCreateTasks : canEditMoms} onClose={() => setModal(null)} onSubmit={submitTask} onSave={() => { setModal(null); notify("Meeting notes saved"); }} />}
      {manageModal && <ManageModal type={manageModal} onClose={() => setManageModal(null)} onSave={async (data) => { if (manageModal === "project") { const code = `PM-${String(projectRows.length + 1).padStart(3, "0")}`; const { data: saved, error } = await supabase.from("pm_projects").insert({ code, name: data.name, location: data.location, budget: Number(data.budget) || 0, due_date: data.due || null, current_gate: "Gate 1 · Concept Brief Signed" }).select("id").single(); if (error || !saved) { notify(error?.message || "Unable to save project"); return; } setProjectRows([...projectRows, { id: saved.id, code, name: data.name, location: data.location, progress: 0, tasks: 0, overdue: 0, team: [initials], due: data.due || "TBD", tone: "blue", phase: "Initiation", gate: "Gate 1 · Concept Brief Signed", gateProgress: 0, budget: Number(data.budget) || 0, spent: 0 }]); notify("New project added"); } else { const { error } = await supabase.functions.invoke("pm-admin-users", { body: { name: data.name, email: data.email, password: data.password, role: data.role } }); if (error) { notify(error.message || "Unable to create user"); return; } notify(`${data.name} created as ${data.role}`); } setManageModal(null); }} />}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
      {notificationsOpen && <NotificationPanel role={role} items={acknowledgements} onClose={() => setNotificationsOpen(false)} onAcknowledge={(id) => { setAcknowledgements(acknowledgements.map((item) => item.id === id ? { ...item, acknowledged: true } : item)); notify("Task closure acknowledged"); }} />}
      {taskToClose && <TaskClosureModal task={taskToClose} role={role} onClose={() => setTaskToClose(null)} onConfirm={() => confirmTaskClosure(taskToClose)} />}
    </main>
  );
}

function Dashboard({ projects, tasks, onOpen }: { projects: Project[]; tasks: TaskRow[]; onOpen: (view: View) => void }) {
  const averageGateReadiness = projects.length ? Math.round(projects.reduce((sum, project) => sum + project.gateProgress, 0) / projects.length) : 0;
  const delayedTasks = tasks.filter((task) => task.status === "Delayed").length;
  return <>
    <section className="metrics">
      <Metric label="Running projects" value={String(projects.length)} detail={projects.length ? `${projects.length} active in the workspace` : "Add your first project"} icon="▦" tone="blue" />
      <Metric label="Gate readiness" value={`${averageGateReadiness}%`} detail={projects.length ? "Across active projects" : "No gates configured"} icon="◇" tone="green" />
      <Metric label="Delayed tasks" value={String(delayedTasks)} detail={delayedTasks ? "Needs attention" : "Workspace is up to date"} icon="!" tone="coral" />
      <Metric label="Tracked tasks" value={String(tasks.length)} detail={tasks.length ? "Across all projects" : "No activity recorded"} icon="◷" tone="amber" />
    </section>

    <section className="dashboard-grid">
      <div className="panel project-panel">
        <PanelTitle title="Active projects" subtitle="Current delivery health" action="View all projects" onClick={() => onOpen("projects")} />
        <div className="project-list">{projects.map((p) => <ProjectRow key={p.id} project={p} />)}{projects.length === 0 && <div className="empty">No projects yet. Open Projects and add your first project.</div>}</div>
      </div>
      <div className="panel deadline-panel">
        <PanelTitle title="Deadline watch" subtitle="Next 7 days" action="Open tasks" onClick={() => onOpen("tasks")} />
        <div className="deadline-list">{tasks.slice(0, 4).map((task, i) => <div className="deadline" key={`${task.project}-${task.code}`}><div className={`date-box ${i === 0 ? "urgent" : ""}`}><strong>{task.due.split(" ")[0]}</strong><span>DUE</span></div><div><strong>{task.title}</strong><small>{task.phase} · {task.project}</small></div><span className={`status ${task.status === "Delayed" ? "delayed" : task.status === "Completed" ? "complete" : "ontime"}`}>{task.status}</span></div>)}{tasks.length === 0 && <div className="empty">No upcoming deadlines.</div>}</div>
      </div>
    </section>

    <GanttChart projects={projects} />

    <section className="panel activity activity-wide"><PanelTitle title="Recent activity" subtitle="Across your workspace" /><div className="empty">No activity yet.</div></section>
  </>;
}

function GanttChart({ projects }: { projects: Project[] }) {
  const months = ["JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const rows = projects.map((project, index) => ({ project: project.name, code: project.code, phase: project.phase, start: Math.min(index * 7, 45), width: 38, progress: project.progress, due: project.due, tone: project.tone }));
  return <section className="panel gantt-panel"><div className="gantt-title"><div><p className="eyebrow">Master programme</p><h2>All-project Gantt chart</h2><p>Your project schedules will appear here.</p></div><div className="gantt-key"><span><i className="key-plan" />Planned</span><span><i className="key-progress" />Completed</span></div></div><div className="gantt-scroll"><div className="gantt-chart"><div className="gantt-header"><span>Project / current phase</span><div className="gantt-months">{months.map((month) => <span key={month}>{month}</span>)}</div><span>Due</span></div>{rows.map((row) => <div className="gantt-row" key={row.code}><div className="gantt-project"><span className={`project-mark ${row.tone}`}>{row.code.slice(-2)}</span><div><strong>{row.project}</strong><small>{row.code} · {row.phase}</small></div></div><div className="gantt-timeline"><div className={`gantt-bar ${row.tone}`} style={{ left: `${row.start}%`, width: `${row.width}%` }}><i style={{ width: `${row.progress}%` }} /><span>{row.progress}%</span></div></div><div className="gantt-due"><strong>{row.due}</strong></div></div>)}{rows.length === 0 && <div className="empty">No Gantt data yet.</div>}</div></div><div className="gantt-footer"><span>{projects.length} active {projects.length === 1 ? "project" : "projects"}</span></div></section>;
}

function Metric({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: string; tone: string }) { return <article className="metric"><div className={`metric-icon ${tone}`}>{icon}</div><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article>; }
function PanelTitle({ title, subtitle, action, onClick }: { title: string; subtitle: string; action?: string; onClick?: () => void }) { return <div className="panel-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button onClick={onClick}>{action} →</button>}</div>; }
function ProjectRow({ project }: { project: Project }) { return <article className="project-row"><div className={`project-mark ${project.tone}`}>{project.code.slice(-2)}</div><div className="project-main"><strong>{project.name}</strong><small>{project.phase} · {project.gate}</small><div className="progress"><i style={{ width: `${project.progress}%` }} /></div></div><div className="project-stat"><strong>{project.progress}%</strong><small>complete</small></div><div className="project-stat hide-small"><strong>{project.gateProgress}%</strong><small>gate ready</small></div><div className="avatars hide-small">{project.team.map((member) => <span key={member}>{member}</span>)}</div><button className="more" aria-label="Project options">•••</button></article>; }
function Activity({ initials, text, detail }: { initials: string; text: React.ReactNode; detail: string }) { return <div className="activity-row"><div className="avatar soft">{initials}</div><div><p>{text}</p><small>{detail}</small></div><i /></div>; }

function ManageModal({ type, onClose, onSave }: { type: "project" | "member"; onClose: () => void; onSave: (data: Record<string, string>) => void | Promise<void> }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">Management access</p><h2>{type === "project" ? "Add new project" : "Add new member"}</h2></div><button onClick={onClose}>×</button></div><form onSubmit={async (e) => { e.preventDefault(); const form = new FormData(e.currentTarget); await onSave(Object.fromEntries(form.entries()) as Record<string, string>); }}><label>{type === "project" ? "Project name" : "Full name"}<input name="name" required placeholder={type === "project" ? "Enter project name" : "Enter member name"} /></label>{type === "project" ? <><label>Location<input name="location" required placeholder="City, State" /></label><div className="form-grid"><label>Approved budget<input name="budget" type="number" min="0" placeholder="Amount in INR" /></label><label>Target completion<input name="due" type="date" /></label></div></> : <><label>Email address<input name="email" type="email" required pattern="[^@]+@grs\\.com" title="Use a @grs.com company email" placeholder="name@grs.com" /></label><label>Temporary password<input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="Minimum 8 characters" /></label><label>Role<select name="role"><option>MD</option><option>Architect</option><option>Project Head</option><option>Execution Head</option><option>Process Coordinator</option><option>Purchase Manager</option></select></label></>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">{type === "project" ? "Add project" : "Create user"}</button></div></form></div></div>;
}

function AccessControl({ onNotify, onInvite, managerRole }: { onNotify: (message: string) => void; onInvite: () => void; managerRole: Role }) {
  const [users, setUsers] = useState(teamUsers);
  const permissions = [["MD","View","View","View","View","View","View","—"],["Architect","View","View","View","Edit","View","—","—"],["Project Head","Full","Full","Full","Full","Full","Full","Full"],["Execution Head","View","Edit","Edit","View","View","View","—"],["Process Coordinator","View","View","Edit","View","Edit","—","—"],["Purchase Manager","View","View","View","View","View","Edit","—"]];
  return <section className="access-page"><div className="admin-banner"><div><span>⚿</span><div><p className="eyebrow">Project Head administration</p><h2>Access control</h2><small>Manage users, roles and workspace permissions</small></div></div><button className="primary" onClick={() => onNotify("User invitation ready")}>＋ Invite user</button></div><div className="panel user-panel"><div className="panel-title"><div><h2>Workspace users</h2><p>{users.length} active team members</p></div></div><div className="user-head"><span>User</span><span>Role</span><span>Default access</span><span>Status</span><span></span></div>{users.map((user,index) => <div className="user-row" key={user.email}><div><span className="avatar soft">{user.initials}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div><select value={user.role} disabled={user.role === "Project Head"} onChange={(e) => { const next=[...users]; next[index]={...user,role:e.target.value as Role}; setUsers(next); onNotify(`${user.name}'s role updated`); }}><option>MD</option><option>Architect</option><option>Project Head</option><option>Execution Head</option><option>Process Coordinator</option><option>Purchase Manager</option></select><span>{user.access}</span><span className="status ontime">Active</span><button className="more">•••</button></div>)}</div><div className="panel permission-panel"><div className="panel-title"><div><h2>Role permissions</h2><p>Default access across Project Master</p></div><button onClick={() => onNotify("Permission changes saved")}>Save permissions →</button></div><div className="permission-table"><div className="permission-head"><span>Role</span><span>Overview</span><span>Projects</span><span>Tasks</span><span>Scope</span><span>MOMs</span><span>Budget</span><span>Admin</span></div>{permissions.map((row) => <div className={`permission-row ${row[0] === "Project Head" ? "admin-row" : ""}`} key={row[0]}>{row.map((value,i) => <span key={`${row[0]}-${i}`} className={`permission-${value.toLowerCase().replace("—","none")}`}>{value}</span>)}</div>)}</div></div></section>;
}

function Projects({ rows, canManage, onPhaseChange }: { rows: Project[]; canManage: boolean; onPhaseChange: (project: Project, phase: Phase) => void }) { return <section className="panel table-page"><div className="stage-guide"><strong>Project stage workflow</strong><span>Every new project starts in Initiation. The Project Head or MD moves it forward after the current stage requirements are complete.</span></div><div className="filters"><button className="filter-active">All projects <b>{rows.length}</b></button><button>Initiation <b>{rows.filter((p) => p.phase === "Initiation").length}</b></button><button>Design <b>{rows.filter((p) => p.phase === "Design").length}</b></button><button>Full Kitting <b>{rows.filter((p) => p.phase === "Full Kitting").length}</b></button><button>Execution <b>{rows.filter((p) => p.phase === "Execution").length}</b></button><button>Finishing <b>{rows.filter((p) => p.phase === "Finishing").length}</b></button></div><div className="cards-grid">{rows.map((p) => <article className="project-card" key={p.id}><div className="card-top"><span className={`project-mark ${p.tone}`}>{p.code.slice(-2)}</span>{canManage ? <label className="phase-control"><span>Project stage</span><select aria-label={`Project stage for ${p.name}`} value={p.phase} onChange={(e) => onPhaseChange(p, e.target.value as Phase)}><option>Initiation</option><option>Design</option><option>Full Kitting</option><option>Execution</option><option>Finishing</option></select></label> : <span className="phase-pill">Phase · {p.phase}</span>}</div><h3>{p.name}</h3><p>{p.code} · {p.location}</p><div className="gate-block"><div><span>Current gate</span><strong>{p.gate}</strong></div><b>{p.gateProgress}%</b></div><div className="progress gate-progress"><i style={{ width: `${p.gateProgress}%` }} /></div><div className="card-meta"><div><span>Due date</span><strong>{p.due}</strong></div><div><span>Open tasks</span><strong>{p.tasks}</strong></div><div><span>Delayed</span><strong className="coral-text">{p.overdue}</strong></div></div><div className="card-footer"><div className="avatars">{p.team.map((x) => <span key={x}>{x}</span>)}</div><button>Open lifecycle →</button></div></article>)}</div>{rows.length === 0 && <div className="empty">No projects yet. Use “Add project” to create your first project.</div>}</section>; }

function BudgetSheet({ rows }: { rows: Project[] }) {
  const budget = rows.reduce((sum, project) => sum + project.budget, 0);
  const spent = rows.reduce((sum, project) => sum + project.spent, 0);
  const exceeded = rows.reduce((sum, project) => sum + Math.max(project.spent - project.budget, 0), 0);
  return <section className="budget-page">
    <div className="budget-summary"><article><span>Total approved budget</span><strong>{money(budget)}</strong><small>{rows.length} projects in view</small></article><article><span>Total spent</span><strong>{money(spent)}</strong><small>{budget ? Math.round(spent / budget * 100) : 0}% portfolio utilization</small></article><article><span>Available balance</span><strong>{money(Math.max(budget - spent, 0))}</strong><small>Unspent portfolio allocation</small></article><article className="exceeded-card"><span>Total exceeded</span><strong>{money(exceeded)}</strong><small>{rows.filter((project) => project.spent > project.budget).length} project over budget</small></article></div>
    <div className="panel budget-sheet"><div className="budget-sheet-title"><div><p className="eyebrow">Financial control</p><h2>Project budget register</h2></div><span>Amounts shown in INR</span></div><div className="budget-head"><span>Project</span><span>Phase</span><span>Budget</span><span>Spent</span><span>Remaining</span><span>Exceeded</span><span>Utilization</span><span>Health</span></div>{rows.map((project) => { const used = Math.round(project.spent / project.budget * 100); const over = Math.max(project.spent - project.budget, 0); return <div className={`budget-row ${over > 0 ? "exceeded-row" : ""}`} key={project.id}><div><span className={`project-mark ${project.tone}`}>{project.code.slice(-2)}</span><div><strong>{project.name}</strong><small>{project.code} · {project.location}</small></div></div><span className="phase-pill">{project.phase}</span><strong>{money(project.budget)}</strong><strong>{money(project.spent)}</strong><strong>{money(Math.max(project.budget - project.spent, 0))}</strong><strong className={over > 0 ? "exceeded-value" : ""}>{over > 0 ? money(over) : "—"}</strong><div className="budget-use"><div><div className="progress"><i className={used >= 90 ? "over" : ""} style={{ width: `${Math.min(used, 100)}%` }} /></div><b>{used}%</b></div></div><span className={`status ${used > 100 ? "exceeded" : used >= 90 ? "delayed" : "ontime"}`}>{used > 100 ? "Exceeded" : used >= 90 ? "Watch" : "Healthy"}</span></div>})}<div className="budget-total"><strong>Portfolio total</strong><span>{money(budget)}</span><span>{money(spent)}</span><span>{money(Math.max(budget - spent, 0))}</span><span className="exceeded-value">{money(exceeded)}</span><b>{budget ? Math.round(spent / budget * 100) : 0}% used</b></div></div>
  </section>;
}

function Tasks({ rows, editable, onUpdate }: { rows: TaskRow[]; editable: boolean; onUpdate: (task: TaskRow) => void }) {
  const [phase, setPhase] = useState<Phase | "All">("All");
  const [project, setProject] = useState("");
  const phases: (Phase | "All")[] = ["All", "Initiation", "Design", "Full Kitting", "Execution", "Finishing"];
  if (rows.length === 0) return <section className="panel table-page"><div className="empty">No tasks yet. Add a project first, then create its tasks.</div></section>;
  const projectNames = Array.from(new Set(rows.map((task) => task.project)));
  const selectedProject = project || projectNames[0];
  const visible = rows.filter((task) => (phase === "All" || task.phase === phase) && task.project === selectedProject);
  return <section className="panel table-page lifecycle-page">
    <div className="lifecycle-toolbar"><div><p className="eyebrow">Lifecycle task list</p><h2>{selectedProject}</h2></div><select value={selectedProject} onChange={(e) => setProject(e.target.value)}>{projectNames.map((name) => <option key={name}>{name}</option>)}</select></div>
    <div className="phase-track">{["Initiation", "Design", "Full Kitting", "Execution", "Finishing"].map((item, index) => <button key={item} onClick={() => setPhase(item as Phase)} className={phase === item ? "selected" : ""}><span>{index + 1}</span><div><strong>{item}</strong><small>{index < 2 ? "Gate passed" : index === 2 ? "In progress" : "Locked"}</small></div></button>)}</div>
    <div className="filters phase-filters">{phases.map((item) => <button key={item} onClick={() => setPhase(item)} className={phase === item ? "filter-active" : ""}>{item}<b>{rows.filter((x) => (item === "All" || x.phase === item) && x.project === selectedProject).length}</b></button>)}<span className="permission-note">{editable ? "Owner updates enabled" : "View-only for this role"}</span></div>
    <div className="lifecycle-table"><div className="lifecycle-head"><span>Task / Gate</span><span>Owner</span><span>Schedule</span><span>% Done</span><span>Actual end</span><span>Status</span></div>{visible.map((task) => <div className={`lifecycle-row ${task.gate ? "gate-row" : ""}`} key={`${task.code}-${task.project}`}><div className="task-cell"><span className={task.gate ? "gate-symbol" : "task-code"}>{task.gate ? "G" : task.code}</span><div><strong>{task.title}</strong><small>{task.phase}{task.frequency ? ` · ${task.frequency}` : ""}{task.formLink ? ` · ${task.formLink} attached` : ""}</small></div></div><span className="owner-cell">{task.owner}</span><span className="schedule-cell"><b>{task.start}</b> → <b>{task.due}</b></span><div className="done-cell"><div className="progress"><i style={{ width: `${task.done}%` }} /></div><strong>{task.done}%</strong></div><span>{task.actualEnd}</span><button disabled={!editable || task.status === "Completed"} onClick={() => onUpdate(task)} className={`status ${task.status === "Delayed" ? "delayed" : task.status === "Completed" ? "complete" : "ontime"}`}>{task.status === "Completed" ? "Completed" : "Close task"}</button></div>)}</div>
    {visible.length === 0 && <div className="phase-empty"><span>◇</span><strong>No tasks in this phase yet</strong><p>Tasks stay locked until the preceding gate is formally passed.</p></div>}
    <div className="lifecycle-rule"><span>i</span><p><strong>Gate control is active.</strong> No task in the next phase can start until the gate above it reaches 100% and is formally approved.</p></div>
  </section>;
}

function TaskClosureModal({ task, role, onClose, onConfirm }: { task: TaskRow; role: Role; onClose: () => void; onConfirm: () => void }) {
  const [photoName, setPhotoName] = useState("");
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal closure-modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">Task closure</p><h2>Close task with evidence</h2></div><button onClick={onClose}>×</button></div><div className="closure-body"><div className="closure-task"><span>{task.code}</span><div><strong>{task.title}</strong><small>{task.project} · {task.phase}</small></div></div><div className="closure-note"><span>i</span><p>A site photo is mandatory for every task closure. This action is recorded under <strong>{role}</strong>{role === "Process Coordinator" ? " and sent to the Project Head for acknowledgement" : ""}.</p></div><label className={`photo-drop ${photoName ? "has-photo" : ""}`}><input type="file" accept="image/*" capture="environment" onChange={(e) => setPhotoName(e.target.files?.[0]?.name || "")} /><span>{photoName ? "✓" : "▧"}</span><strong>{photoName || "Upload closure photo"}</strong><small>{photoName ? "Photo attached and ready" : "Take a photo or choose an image file"}</small></label><div className="modal-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={!photoName} onClick={onConfirm}>Close task</button></div></div></div></div>;
}

function NotificationPanel({ role, items, onClose, onAcknowledge }: { role: Role; items: Acknowledgement[]; onClose: () => void; onAcknowledge: (id: number) => void }) {
  return <aside className="notification-panel"><div className="notification-head"><div><p className="eyebrow">Workflow alerts</p><h2>Notifications</h2></div><button onClick={onClose}>×</button></div>{role !== "Project Head" ? <div className="notification-empty"><span>♢</span><strong>No acknowledgements assigned</strong><p>Task closure acknowledgements are routed to the Project Head.</p></div> : items.length === 0 ? <div className="notification-empty"><span>✓</span><strong>You’re all caught up</strong><p>New task closures will appear here for acknowledgement.</p></div> : <div className="ack-list">{items.map((item) => <article className={item.acknowledged ? "acknowledged" : ""} key={item.id}><div className="ack-icon">✓</div><div><span>Task closure</span><strong>{item.task}</strong><p>{item.project}</p><small>Closed by {item.closedBy} · {item.closedAt}</small></div>{item.acknowledged ? <span className="ack-done">Acknowledged</span> : <button onClick={() => onAcknowledge(item.id)}>Acknowledge</button>}</article>)}</div>}</aside>;
}

function Scope() { return <section className="panel table-page"><div className="scope-intro"><div><span className="scope-icon">▱</span><div><h2>Project scope library</h2><p>Approved work items and latest drawing references</p></div></div></div><div className="empty">No scopes or drawings yet. Add a project first.</div></section>; }

function Meetings({ editable, onAdd }: { editable: boolean; onAdd: () => void }) { return <section className="panel table-page"><div className="filters"><button className="filter-active">All meetings <b>{meetings.length}</b></button><button>This month <b>0</b></button><button>Action pending <b>0</b></button><span className="permission-note">{editable ? "You can create and edit MOMs" : "View-only for this role"}</span></div><div className="meeting-list">{meetings.map((meeting) => <article className="meeting-card" key={meeting.title}><div className="meeting-date"><strong>{meeting.date.split(" ")[0]}</strong><span>{meeting.date.split(" ")[1]}</span></div><div><span className="meeting-project">{meeting.project}</span><h3>{meeting.title}</h3><p>{meeting.note}</p><small>Recorded by {meeting.owner}</small></div><div className="meeting-actions"><span className="status ontime">MOM ready</span><button>View notes →</button></div></article>)}</div>{meetings.length === 0 && <div className="empty">No meeting notes yet.</div>}{editable && <button className="add-note" onClick={onAdd}>＋ Record a new meeting</button>}</section>; }

function Modal({ type, projects, canEdit, onClose, onSubmit, onSave }: { type: "task" | "mom"; projects: Project[]; canEdit: boolean; onClose: () => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void; onSave: () => void }) { const hasProjects = projects.length > 0; return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">Project Master</p><h2>{type === "task" ? "Create a new task" : "Record meeting notes"}</h2></div><button onClick={onClose}>×</button></div>{!canEdit && <div className="access-banner"><span>i</span><p><strong>View-only access</strong><br />You do not have permission to save this record.</p></div>}{!hasProjects && <div className="access-banner"><span>i</span><p><strong>No projects available</strong><br />Add a project before creating tasks or meeting notes.</p></div>}<form onSubmit={type === "task" ? onSubmit : (e) => { e.preventDefault(); onSave(); }}><label>{type === "task" ? "Task title" : "Meeting title"}<input name="title" required placeholder={type === "task" ? "What needs to be done?" : "e.g. Weekly design coordination"} /></label><label>Project<select name="project" required disabled={!hasProjects}>{hasProjects ? projects.map((project) => <option key={project.id} value={project.name}>{project.name}</option>) : <option value="">No projects added</option>}</select></label>{type === "mom" && <label>Minutes of meeting<textarea rows={5} required placeholder="Capture decisions, actions and owners..." /></label>}<div className="form-grid"><label>{type === "task" ? "Due date" : "Meeting date"}<input type="date" /></label><label>{type === "task" ? "Status" : "Created by"}<select><option>{type === "task" ? "On time" : "Current user"}</option><option>{type === "task" ? "Delayed" : "Project team"}</option></select></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button disabled={!canEdit || !hasProjects} className="primary">{!hasProjects ? "Add a project first" : canEdit ? (type === "task" ? "Create task" : "Save MOM") : "No edit permission"}</button></div></form></div></div>; }
