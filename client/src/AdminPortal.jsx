import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, Check, LogOut, Pencil, Plus, ScrollText, Trash2, Users, X } from 'lucide-react';
import { request } from './api';
import { Empty } from './App';
import './doctor.css';

const roleLabels = { patient: 'Patient', doctor: 'Doctor' };

function UserModal({ modal, form, setForm, doctors, modalError, busy, onClose, onSubmit }) {
  const isDoctor = form.role === 'doctor';
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <form className="modal" onSubmit={onSubmit}>
      <div className="modal-head"><div><span className="eyebrow">{modal.kind === 'add' ? 'NEW ACCOUNT' : 'EDIT ACCOUNT'}</span><h2>{modal.kind === 'add' ? `Add ${roleLabels[form.role].toLowerCase()}` : `Edit ${modal.user.name}`}</h2></div><button type="button" className="icon-button" onClick={onClose}><X/></button></div>
      <label>Full name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label>
      <label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label>
      {modal.kind === 'add' && <label>Role<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="patient">Patient</option><option value="doctor">Doctor</option></select></label>}
      <label>Password<input type="password" minLength="8" required={modal.kind === 'add'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={modal.kind === 'edit' ? 'Leave blank to keep current' : 'At least 8 characters'}/></label>
      {isDoctor && <label>Specialization<input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder="e.g. Endocrinology"/></label>}
      {!isDoctor && <label>Assigned doctor<select value={form.doctor_id} onChange={e => setForm({ ...form, doctor_id: e.target.value })}><option value="">Unassigned</option>{doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
      {modalError && <div className="alert">{modalError}</div>}
      <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy ? 'Please wait…' : modal.kind === 'add' ? 'Create account' : 'Save changes'} <Check size={16}/></button></div>
    </form>
  </div>;
}

export default function AdminPortal({ user, onLogout }) {
  const [tab, setTab] = useState('users');
  const [roleFilter, setRoleFilter] = useState('patient');
  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [activity, setActivity] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient', specialization: '', doctor_id: '' });
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadUsers = async role => {
    const d = await request(`/admin/users?role=${role}`);
    setUsers(d.users);
  };
  const loadActivity = async () => {
    const d = await request('/admin/activity?limit=300');
    setActivity(d.activity);
  };
  useEffect(() => {
    request('/admin/users?role=doctor').then(d => setDoctors(d.users)).catch(e => setError(e.message));
    loadUsers(roleFilter).catch(e => setError(e.message));
  }, []);
  useEffect(() => { setError(''); loadUsers(roleFilter).catch(e => setError(e.message)); }, [roleFilter]);
  useEffect(() => { if (tab === 'activity') loadActivity().catch(e => setError(e.message)); }, [tab]);

  const openAdd = () => { setForm({ name: '', email: '', password: '', role: roleFilter, specialization: '', doctor_id: '' }); setModalError(''); setModal({ kind: 'add' }); };
  const openEdit = u => { setForm({ name: u.name, email: u.email, password: '', role: u.role, specialization: u.specialization || '', doctor_id: u.doctor_id ? String(u.doctor_id) : '' }); setModalError(''); setModal({ kind: 'edit', user: u }); };
  const save = async e => {
    e.preventDefault(); setModalError(''); setBusy(true);
    try {
      const payload = { name: form.name, email: form.email };
      if (form.password) payload.password = form.password;
      if (form.role === 'doctor') payload.specialization = form.specialization;
      else payload.doctor_id = form.doctor_id || null;
      if (modal.kind === 'add') payload.role = form.role;
      await request(modal.kind === 'add' ? '/admin/users' : `/admin/users/${modal.user.id}`, { method: modal.kind === 'add' ? 'POST' : 'PUT', body: JSON.stringify(payload) });
      setModal(null); setNotice(modal.kind === 'add' ? 'Account created successfully.' : 'Account updated successfully.');
      await loadUsers(roleFilter); if (tab === 'activity') loadActivity();
    } catch (err) { setModalError(err.message); } finally { setBusy(false); }
  };
  const remove = async u => {
    if (!confirm(`Delete ${u.name} (${u.email})? This also removes their readings.`)) return;
    try { await request(`/admin/users/${u.id}`, { method: 'DELETE' }); setNotice('Account deleted.'); await loadUsers(roleFilter); if (tab === 'activity') loadActivity(); }
    catch (e) { setError(e.message); }
  };
  const assign = async (u, doctorId) => {
    try { await request(`/admin/users/${u.id}`, { method: 'PUT', body: JSON.stringify({ doctor_id: doctorId || null }) }); setNotice('Assigned doctor updated.'); await loadUsers(roleFilter); }
    catch (e) { setError(e.message); }
  };

  const firstName = user.name.replace(/^Admin\s*/i, '').split(' ')[0];
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><span className="material-symbols-outlined">health_metrics</span></span> sweety</div>
      <div className="side-label">ADMIN WORKSPACE</div>
      <button className={`nav-item ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}><Users size={18}/> Users</button>
      <button className={`nav-item ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}><ScrollText size={18}/> Activity log</button>
      <div className="sidebar-bottom">
        <div className="side-tip"><Activity size={18}/><b>Oversight</b><p>Manage accounts, doctor assignments and monitor platform activity.</p></div>
        <div className="profile"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><div className="profile-text"><b>{user.name}</b><small>Admin account</small></div><button className="icon-button" title="Log out" onClick={onLogout}><LogOut size={17}/></button></div>
      </div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="eyebrow">SWEETY ADMIN PANEL</span><div className="top-title">Platform administration</div></div><div className="top-actions"><span className="status-pill"><span/> Full platform access</span><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div></div></header>
      <div className="content">
        <section className="welcome-row"><div><span className="eyebrow">ADMINISTRATION</span><h1>Hello, {firstName} <span>✦</span></h1><p className="muted">Manage patients, doctors and monitor everything that happens on Sweety.</p></div>{tab === 'users' && <button className="primary" onClick={openAdd}><Plus size={18}/> Add {roleLabels[roleFilter].toLowerCase()}</button>}</section>
        {notice && <div className="success-note"><Check size={16}/>{notice}<button onClick={() => setNotice('')}><X size={15}/></button></div>}
        {error && <div className="alert">{error}<button onClick={() => setError('')}><X size={15}/></button></div>}
        {tab === 'users' ? <>
          <section className="section-heading"><div><h2>Accounts</h2><p className="muted">Create, edit and remove patients and doctors.</p></div><div className="role-tabs">
            <button className={`role-tab ${roleFilter === 'patient' ? 'active' : ''}`} onClick={() => setRoleFilter('patient')}>Patients</button>
            <button className={`role-tab ${roleFilter === 'doctor' ? 'active' : ''}`} onClick={() => setRoleFilter('doctor')}>Doctors</button>
          </div></section>
          <section className="panel all-readings"><div className="table-wrap"><table><thead><tr><th>NAME</th><th>EMAIL</th>{roleFilter === 'doctor' && <th>SPECIALIZATION</th>}{roleFilter === 'patient' && <th>ASSIGNED DOCTOR</th>}<th>JOINED</th><th>ACTIONS</th></tr></thead>
            <tbody>{users.map(u => <tr key={u.id}>
              <td><b>{u.name}</b></td><td>{u.email}</td>
              {roleFilter === 'doctor' && <td>{u.specialization || '—'}</td>}
              {roleFilter === 'patient' && <td><select className="assign-select" value={u.doctor_id ? String(u.doctor_id) : ''} onChange={e => assign(u, e.target.value)}><option value="">Unassigned</option>{doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></td>}
              <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
              <td><button className="icon-button" onClick={() => openEdit(u)}><Pencil size={15}/></button><button className="icon-button danger" onClick={() => remove(u)}><Trash2 size={15}/></button></td>
            </tr>)}</tbody></table></div>
            {!users.length && <Empty text={`No ${roleFilter}s yet.`}/>}
          </section>
        </> : <>
          <section className="section-heading"><div><h2>Activity log</h2><p className="muted">Every login, logout, reading change and admin action — newest first.</p></div><button className="text-button" onClick={() => loadActivity().catch(e => setError(e.message))}><ArrowUpRight size={15}/> Refresh</button></section>
          <section className="panel all-readings"><div className="table-wrap"><table><thead><tr><th>TIME</th><th>USER</th><th>ACTION</th><th>DETAILS</th></tr></thead>
            <tbody>{activity.map(l => <tr key={l.id}>
              <td>{new Date(l.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
              <td>{l.actor_name || l.actor_email || '—'}</td>
              <td><span className={`action-tag ${l.action}`}>{l.action.replaceAll('_', ' ')}</span></td>
              <td>{l.details || '—'}</td>
            </tr>)}</tbody></table></div>
            {!activity.length && <Empty text="No activity recorded yet."/>}
          </section>
        </>}
        <footer>Made with care by Sweety <span>·</span> Platform administration.</footer>
      </div>
    </main>
    {modal && <UserModal modal={modal} form={form} setForm={setForm} doctors={doctors} modalError={modalError} busy={busy} onClose={() => setModal(null)} onSubmit={save}/>}
  </div>;
}
