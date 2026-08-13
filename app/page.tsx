"use client";

import { FormEvent, useMemo, useState } from "react";

type Role = "Project Head" | "Project Incharge" | "Process Coordinator";
type View = "dashboard" | "projects" | "tasks" | "scope" | "meetings";
type Project = { id: number; code: string; name: string; location: string; progress: number; tasks: number; overdue: number; team: string[]; due: string; tone: string };

const projects: Project[] = [
  { id: 1, code: "PM-024", name: "Meridian Corporate Tower", location: "Bengaluru, Karnataka", progress: 72, tasks: 28, overdue: 3, team: ["AR", "VK", "NS"], due: "28 Sep 2026", tone: "blue" },
  { id: 2, code: "PM-019", name: "Northpoint Logistics Hub", location: "Pune, Maharashtra", progress: 48, tasks: 34, overdue: 5, team: ["RM", "ST", "AK"], due: "12 Nov 2026", tone: "orange" },
  { id: 3, code: "PM-031", name: "Aster Healthcare Campus", location: "Hyderabad, Telangana", progress: 89, tasks: 19, overdue: 1, team: ["MN", "PS", "JD"], due: "04 Sep 2026", tone: "green" },
];

const baseTasks = [
  { title: "Finalize façade shop drawings", project: "Meridian Corporate Tower", owner: "Arjun Rao", due: "14 Aug", status: "Delayed" },
  { title: "MEP coordination — Level 04", project: "Northpoint Logistics Hub", owner: "Rhea Mehta", due: "15 Aug", status: "On time" },
  { title: "Approve OT room material samples", project: "Aster Healthcare Campus", owner: "Meera Nair", due: "16 Aug", status: "On time" },
  { title: "Issue revised structural grid", project: "Meridian Corporate Tower", owner: "Vikram Kumar", due: "18 Aug", status: "On time" },
  { title: "Close fire NOC observations", project: "Northpoint Logistics Hub", owner: "Sameer Taneja", due: "19 Aug", status: "Delayed" },
];

const meetings = [
  { date: "12 AUG", title: "Weekly design coordination", project: "Meridian Corporate Tower", note: "Façade mock-up approval and services routing", owner: "Nisha Shah" },
  { date: "09 AUG", title: "Client progress review", project: "Aster Healthcare Campus", note: "Handover sequence and statutory clearances", owner: "Priya Sen" },
  { date: "07 AUG", title: "Site execution alignment", project: "Northpoint Logistics Hub", note: "Dock leveller procurement and drainage levels", owner: "Anita Kapoor" },
];

const nav: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Overview", icon: "⌂" },
  { id: "projects", label: "Projects", icon: "▦" },
  { id: "tasks", label: "Task manager", icon: "✓" },
  { id: "scope", label: "Scope & drawings", icon: "▱" },
  { id: "meetings", label: "Meeting notes", icon: "≡" },
];

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [role, setRole] = useState<Role>("Project Head");
  const [query, setQuery] = useState("");
  const [taskRows, setTaskRows] = useState(baseTasks);
  const [modal, setModal] = useState<"task" | "mom" | null>(null);
  const [toast, setToast] = useState("");

  const filteredProjects = useMemo(() => projects.filter((p) => `${p.name} ${p.code} ${p.location}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const canEditTasks = role === "Project Incharge";
  const canEditMoms = role === "Process Coordinator";

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setTaskRows([{ title: String(data.get("title")), project: String(data.get("project")), owner: "Arjun Rao", due: "22 Aug", status: "On time" }, ...taskRows]);
    setModal(null);
    notify("Task added to the project plan");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("dashboard")} aria-label="Project Master home"><span>PM</span><strong>PROJECT<br />MASTER</strong></button>
        <nav aria-label="Primary navigation">
          <p className="eyebrow side-label">Workspace</p>
          {nav.map((item) => <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)}><span>{item.icon}</span>{item.label}{item.id === "tasks" && <i>8</i>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item"><span>?</span>Help centre</button>
          <div className="profile">
            <div className="avatar">AR</div><div><strong>Arjun Rao</strong><small>{role}</small></div><span>⌄</span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand">PM</div>
          <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects, tasks or meetings..." /></label>
          <div className="top-actions">
            <label className="role-switch"><span>View as</span><select value={role} onChange={(e) => setRole(e.target.value as Role)}><option>Project Head</option><option>Project Incharge</option><option>Process Coordinator</option></select></label>
            <button className="notification" aria-label="Notifications">♢<i /></button>
            <div className="top-avatar">AR</div>
          </div>
        </header>

        <div className="content">
          <section className="hero-row">
            <div><p className="eyebrow">Thursday, 13 August</p><h1>{view === "dashboard" ? "Good morning, Arjun." : nav.find((n) => n.id === view)?.label}</h1><p className="subtitle">{view === "dashboard" ? "Here’s what needs your attention across all projects today." : `A focused view of your ${nav.find((n) => n.id === view)?.label.toLowerCase()}.`}</p></div>
            <div className="header-actions"><button className="secondary" onClick={() => notify("Report prepared for review")}>↗ Export report</button><button className="primary" onClick={() => view === "meetings" ? setModal("mom") : setModal("task")}>＋ {view === "meetings" ? "Add MOM" : "New task"}</button></div>
          </section>

          {view === "dashboard" && <Dashboard onOpen={setView} />}
          {view === "projects" && <Projects rows={filteredProjects} />}
          {view === "tasks" && <Tasks rows={taskRows} editable={canEditTasks} onUpdate={() => notify("Task status updated")} />}
          {view === "scope" && <Scope />}
          {view === "meetings" && <Meetings editable={canEditMoms} onAdd={() => setModal("mom")} />}
        </div>
      </section>

      {modal && <Modal type={modal} canEdit={modal === "task" ? canEditTasks : canEditMoms} onClose={() => setModal(null)} onSubmit={submitTask} onSave={() => { setModal(null); notify("Meeting notes saved"); }} />}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}

function Dashboard({ onOpen }: { onOpen: (view: View) => void }) {
  return <>
    <section className="metrics">
      <Metric label="Running projects" value="12" detail="2 closing this month" icon="▦" tone="blue" />
      <Metric label="Tasks on track" value="84%" detail="94 of 112 tasks" icon="✓" tone="green" />
      <Metric label="Delayed tasks" value="8" detail="3 need action today" icon="!" tone="coral" />
      <Metric label="Upcoming meetings" value="5" detail="Next: today, 3:30 PM" icon="◷" tone="amber" />
    </section>

    <section className="dashboard-grid">
      <div className="panel project-panel">
        <PanelTitle title="Active projects" subtitle="Current delivery health" action="View all projects" onClick={() => onOpen("projects")} />
        <div className="project-list">{projects.map((p) => <ProjectRow key={p.id} project={p} />)}</div>
      </div>
      <div className="panel deadline-panel">
        <PanelTitle title="Deadline watch" subtitle="Next 7 days" action="Open tasks" onClick={() => onOpen("tasks")} />
        <div className="deadline-list">{baseTasks.slice(0, 4).map((task, i) => <div className="deadline" key={task.title}><div className={`date-box ${i === 0 ? "urgent" : ""}`}><strong>{task.due.split(" ")[0]}</strong><span>AUG</span></div><div><strong>{task.title}</strong><small>{task.project}</small></div><span className={`status ${task.status === "Delayed" ? "delayed" : "ontime"}`}>{task.status}</span></div>)}</div>
      </div>
    </section>

    <section className="lower-grid">
      <div className="panel"><PanelTitle title="Portfolio progress" subtitle="Completion by project" /><div className="chart-wrap"><div className="donut"><div><strong>68%</strong><span>overall</span></div></div><div className="legend"><div><i className="dot blue" /><span>On track</span><strong>8</strong></div><div><i className="dot amber" /><span>At risk</span><strong>3</strong></div><div><i className="dot gray" /><span>On hold</span><strong>1</strong></div></div></div></div>
      <div className="panel activity"><PanelTitle title="Recent activity" subtitle="Across your workspace" /><div className="activity-list"><Activity initials="NS" text={<><b>Nisha Shah</b> added meeting notes</>} detail="Meridian Corporate Tower · 24 min ago" /><Activity initials="RM" text={<><b>Rhea Mehta</b> completed a task</>} detail="MEP coordination — Basement · 1 hr ago" /><Activity initials="PS" text={<><b>Priya Sen</b> uploaded a drawing</>} detail="Aster Healthcare Campus · 2 hrs ago" /></div></div>
    </section>
  </>;
}

function Metric({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: string; tone: string }) { return <article className="metric"><div className={`metric-icon ${tone}`}>{icon}</div><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article>; }
function PanelTitle({ title, subtitle, action, onClick }: { title: string; subtitle: string; action?: string; onClick?: () => void }) { return <div className="panel-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button onClick={onClick}>{action} →</button>}</div>; }
function ProjectRow({ project }: { project: Project }) { return <article className="project-row"><div className={`project-mark ${project.tone}`}>{project.code.slice(-2)}</div><div className="project-main"><strong>{project.name}</strong><small>{project.code} · {project.location}</small><div className="progress"><i style={{ width: `${project.progress}%` }} /></div></div><div className="project-stat"><strong>{project.progress}%</strong><small>complete</small></div><div className="project-stat hide-small"><strong>{project.tasks}</strong><small>open tasks</small></div><div className="avatars hide-small">{project.team.map((member) => <span key={member}>{member}</span>)}</div><button className="more" aria-label="Project options">•••</button></article>; }
function Activity({ initials, text, detail }: { initials: string; text: React.ReactNode; detail: string }) { return <div className="activity-row"><div className="avatar soft">{initials}</div><div><p>{text}</p><small>{detail}</small></div><i /></div>; }

function Projects({ rows }: { rows: Project[] }) { return <section className="panel table-page"><div className="filters"><button className="filter-active">All projects <b>12</b></button><button>Running <b>9</b></button><button>On hold <b>1</b></button><button>Completed <b>2</b></button></div><div className="cards-grid">{rows.map((p) => <article className="project-card" key={p.id}><div className="card-top"><span className={`project-mark ${p.tone}`}>{p.code.slice(-2)}</span><span className="status ontime">Running</span></div><h3>{p.name}</h3><p>{p.code} · {p.location}</p><div className="card-progress"><div><span>Overall progress</span><strong>{p.progress}%</strong></div><div className="progress"><i style={{ width: `${p.progress}%` }} /></div></div><div className="card-meta"><div><span>Due date</span><strong>{p.due}</strong></div><div><span>Open tasks</span><strong>{p.tasks}</strong></div><div><span>Delayed</span><strong className="coral-text">{p.overdue}</strong></div></div><div className="card-footer"><div className="avatars">{p.team.map((x) => <span key={x}>{x}</span>)}</div><button>Open project →</button></div></article>)}</div>{rows.length === 0 && <div className="empty">No projects match your search.</div>}</section>; }

function Tasks({ rows, editable, onUpdate }: { rows: typeof baseTasks; editable: boolean; onUpdate: () => void }) { return <section className="panel table-page"><div className="filters"><button className="filter-active">All tasks <b>{rows.length}</b></button><button>My tasks <b>8</b></button><button>Delayed <b>3</b></button><button>Completed <b>41</b></button><span className="permission-note">{editable ? "You can update tasks" : "View-only for this role"}</span></div><div className="data-table"><div className="table-head"><span>Task</span><span>Project</span><span>Owner</span><span>Due date</span><span>Status</span></div>{rows.map((task) => <div className="table-row" key={`${task.title}-${task.due}`}><div><span className="check">✓</span><strong>{task.title}</strong></div><span>{task.project}</span><span>{task.owner}</span><span>{task.due}</span><button disabled={!editable} onClick={onUpdate} className={`status ${task.status === "Delayed" ? "delayed" : "ontime"}`}>{task.status}⌄</button></div>)}</div></section>; }

function Scope() { const docs = ["Architectural IFC Set — Rev 06", "Structural Coordination Drawing", "MEP Builders Work — Level 04", "Landscape Scope Matrix"]; return <section className="panel table-page"><div className="scope-intro"><div><span className="scope-icon">▱</span><div><h2>Project scope library</h2><p>Approved work items and latest drawing references</p></div></div><select><option>Meridian Corporate Tower</option><option>Northpoint Logistics Hub</option><option>Aster Healthcare Campus</option></select></div><div className="scope-grid">{docs.map((doc, i) => <article className="doc-card" key={doc}><div className="doc-preview"><span>{i % 2 ? "DWG" : "PDF"}</span><div className="blueprint-lines" /></div><div className="doc-info"><div><h3>{doc}</h3><p>{["Façade, cores, floor plans and details", "Post-tensioned slab and column grid", "Electrical, plumbing and HVAC openings", "Hardscape, planting and external works"][i]}</p></div><small>Updated {i + 2} days ago · Rev 0{i + 3}</small><button>View drawing ↗</button></div></article>)}</div></section>; }

function Meetings({ editable, onAdd }: { editable: boolean; onAdd: () => void }) { return <section className="panel table-page"><div className="filters"><button className="filter-active">All meetings <b>16</b></button><button>This month <b>6</b></button><button>Action pending <b>4</b></button><span className="permission-note">{editable ? "You can create and edit MOMs" : "View-only for this role"}</span></div><div className="meeting-list">{meetings.map((meeting) => <article className="meeting-card" key={meeting.title}><div className="meeting-date"><strong>{meeting.date.split(" ")[0]}</strong><span>{meeting.date.split(" ")[1]}</span></div><div><span className="meeting-project">{meeting.project}</span><h3>{meeting.title}</h3><p>{meeting.note}</p><small>Recorded by {meeting.owner}</small></div><div className="meeting-actions"><span className="status ontime">MOM ready</span><button>View notes →</button></div></article>)}</div>{editable && <button className="add-note" onClick={onAdd}>＋ Record a new meeting</button>}</section>; }

function Modal({ type, canEdit, onClose, onSubmit, onSave }: { type: "task" | "mom"; canEdit: boolean; onClose: () => void; onSubmit: (e: FormEvent<HTMLFormElement>) => void; onSave: () => void }) { return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">Project Master</p><h2>{type === "task" ? "Create a new task" : "Record meeting notes"}</h2></div><button onClick={onClose}>×</button></div>{!canEdit && <div className="access-banner"><span>i</span><p><strong>View-only access</strong><br />Switch to the {type === "task" ? "Project Incharge" : "Process Coordinator"} role to save changes.</p></div>}<form onSubmit={type === "task" ? onSubmit : (e) => { e.preventDefault(); onSave(); }}><label>{type === "task" ? "Task title" : "Meeting title"}<input name="title" required placeholder={type === "task" ? "What needs to be done?" : "e.g. Weekly design coordination"} /></label><label>Project<select name="project"><option>Meridian Corporate Tower</option><option>Northpoint Logistics Hub</option><option>Aster Healthcare Campus</option></select></label>{type === "mom" && <label>Minutes of meeting<textarea rows={5} required placeholder="Capture decisions, actions and owners..." /></label>}<div className="form-grid"><label>{type === "task" ? "Due date" : "Meeting date"}<input type="date" defaultValue="2026-08-22" /></label><label>{type === "task" ? "Status" : "Created by"}<select><option>{type === "task" ? "On time" : "Anita Kapoor"}</option><option>{type === "task" ? "Delayed" : "Priya Sen"}</option></select></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button disabled={!canEdit} className="primary">{canEdit ? (type === "task" ? "Create task" : "Save MOM") : "No edit permission"}</button></div></form></div></div>; }
