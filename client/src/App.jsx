import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleUserRound, Droplets, HeartPulse, LogOut, Plus, Sparkles, TrendingUp, Trash2, Pencil, X } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { request } from './api';
import DoctorPortal from './DoctorPortal';
import AdminPortal from './AdminPortal';

export const slotNames = { morning: 'Morning (fasting)', after_breakfast: 'After breakfast', after_lunch: 'After lunch', after_dinner: 'After dinner' };
const slotOpens = { morning: '4:00 AM', after_breakfast: '6:00 AM', after_lunch: '12:00 PM', after_dinner: '6:00 PM' };
const slotOpenMinutes = { morning: 240, after_breakfast: 360, after_lunch: 720, after_dinner: 1080 };
const nowMinutes = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
const today = () => new Date().toLocaleDateString('en-CA');
const prevMonth = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const data = await request(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) });
      localStorage.setItem('sweety_token', data.token);
      const me = await request('/auth/me');
      onAuth(me.user);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <main className="auth-shell"><section className="auth-art"><div className="brand light"><span className="brand-mark"><span className="material-symbols-outlined">health_metrics</span></span> sweety</div><div className="art-copy"><span className="eyebrow">YOUR HEALTH, IN HARMONY</span><h1>Small steps.<br/>Healthier days.</h1><p>A calmer, clearer way to understand your glucose patterns and build healthy routines.</p><div className="art-orb"><Droplets size={70}/><span>Care, every day.</span></div></div><span className="art-foot">A little more awareness goes a long way.</span></section><section className="auth-panel"><div className="auth-card"><div className="brand"><span className="brand-mark"><span className="material-symbols-outlined">health_metrics</span></span> sweety</div><span className="eyebrow">WELCOME {mode === 'login' ? 'BACK' : 'ABOARD'}</span><h2>{mode === 'login' ? 'Your health space awaits.' : 'Create your account.'}</h2><p className="muted">Track your readings, notice patterns, feel more in control.</p><form onSubmit={submit}>{mode === 'register' && <label>Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></label>}<label>Email address<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/></label><label>Password<input required type="password" minLength="8" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="At least 8 characters"/></label>{error && <div className="alert">{error}</div>}<button className="primary full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in to Sweety' : 'Create account'} <ArrowUpRight size={17}/></button></form><p className="switch">{mode === 'login' ? "New to Sweety?" : 'Already have an account?'} <button onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}>{mode==='login'?'Create an account':'Log in'}</button></p><div className="privacy"><span><Check size={14}/> Private by design</span><span><Check size={14}/> Secure sign-in</span></div></div></section></main>;
}

function App() {
  const [user, setUser] = useState(null);
  const [readings, setReadings] = useState([]);
  const [reports, setReports] = useState(null);
  const [selectedDate, setSelectedDate] = useState(today());
  const [sumDaily, setSumDaily] = useState(today());
  const [sumMtd, setSumMtd] = useState(today());
  const [sumMonth, setSumMonth] = useState(prevMonth());
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ date: today(), slot: 'morning', value: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('overview');
  const [profileOpen, setProfileOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [page, setPage] = useState(1);
  const [pageData, setPageData] = useState({ readings: [], page: 1, limit: 20, total: 0 });

  const load = async () => {
    const [r, p] = await Promise.all([request('/readings?limit=100'), request(`/reports?daily=${sumDaily}&mtd=${sumMtd}&month=${sumMonth}`)]);
    setReadings(r.readings); setReports(p);
  };
  const loadPage = async p => {
    const d = await request(`/readings?page=${p}&limit=20`);
    setPageData(d); setPage(d.page);
  };
  useEffect(() => { if (localStorage.getItem('sweety_token')) request('/auth/me').then(d=>setUser(d.user)).catch(()=>localStorage.removeItem('sweety_token')); }, []);
  useEffect(() => { if (user) load().catch(e=>setError(e.message)); }, [user, sumDaily, sumMtd, sumMonth]);
  useEffect(() => { if (user && tab === 'readings') loadPage(page).catch(e=>setError(e.message)); }, [user, tab, page]);
  const logout = () => { request('/auth/logout', { method: 'POST' }).catch(() => {}); localStorage.removeItem('sweety_token'); setUser(null); setReadings([]); setReports(null); };
  const openAdd = () => { setForm({date:selectedDate,slot:'morning',value:''}); setError(''); setModal({kind:'add'}); };
  const openEdit = r => { setForm({date:r.reading_date,slot:r.slot,value:String(r.value)}); setError(''); setModal({kind:'edit',id:r.id}); };
  const save = async e => {
    e.preventDefault(); setError('');
    try {
      await request(modal.kind==='add'?'/readings':`/readings/${modal.id}`, {method:modal.kind==='add'?'POST':'PUT',body:JSON.stringify(form)});
      setModal(null); setNotice(modal.kind==='add'?'Reading added successfully.':'Reading updated successfully.'); await load(); if (tab==='readings') loadPage(page);
    } catch(err) { setError(err.message); }
  };
  const confirmDelete = async () => {
    const id = deleting.id; setDeleting(null);
    try { await request(`/readings/${id}`,{method:'DELETE'}); await load(); if (tab==='readings') loadPage(page); setNotice('Reading deleted.'); } catch(e){setError(e.message)}
  };
  const chartData = useMemo(()=>readings.filter(r=>r.reading_date.slice(0,7)===selectedDate.slice(0,7)).slice().reverse().map(r=>({day:`${r.reading_date.slice(8,10)} · ${slotNames[r.slot].split(' ')[0]}`, glucose:r.value})),[readings,selectedDate]);
  if (!user) return <Auth onAuth={setUser}/>;
  if (user.role === 'doctor') return <DoctorPortal user={user} onLogout={logout}/>;
  if (user.role === 'admin') return <AdminPortal user={user} onLogout={logout}/>;
  const daily = reports?.daily || {count:0,average:null,highest:null,lowest:null,readings:[]};
  const firstName = user.name.split(' ')[0];

  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark"><span className="material-symbols-outlined">health_metrics</span></span> sweety</div><div className="side-label">WORKSPACE</div><button className={`nav-item ${tab==='overview'?'active':''}`} onClick={()=>setTab('overview')}><Activity size={18}/> Overview</button><button className={`nav-item ${tab==='readings'?'active':''}`} onClick={()=>setTab('readings')}><Droplets size={18}/> My readings</button><div className="sidebar-bottom"><div className="side-tip"><Sparkles size={18}/><b>Little reminder</b><p>Consistency matters more than perfection. Keep showing up for yourself.</p></div><div className="profile" onClick={()=>setProfileOpen(true)}><div className="avatar">{user.name.slice(0,1).toUpperCase()}</div><div className="profile-text"><b>{user.name}</b><small>Personal account</small></div><button className="icon-button" title="Log out" onClick={e=>{e.stopPropagation();logout()}}><LogOut size={17}/></button></div></div></aside>
  <main className="main"><header className="topbar"><div><span className="eyebrow">SATURDAY, NOVEMBER 14, 2026</span><div className="top-title">Your health overview</div></div><div className="top-actions"><span className="status-pill"><span/> All your data is private</span><div className="avatar">{user.name.slice(0,1).toUpperCase()}</div></div></header>
  <div className="content"><section className="welcome-row"><div><span className="eyebrow">YOUR PERSONAL HEALTH COMPANION</span><h1>Good to see you, {firstName} <span>✦</span></h1><p className="muted">Every reading is a step towards understanding your health.</p></div><button className="primary" onClick={openAdd}><Plus size={18}/> Add a reading</button></section>
  {notice && <div className="success-note"><Check size={16}/>{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>}
  {error && !modal && <div className="alert">{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
  {tab==='overview'&&<>
  <section className="metric-grid"><Metric icon={<Droplets/>} label="Today's readings" value={daily.count} suffix="/ 4" note="Daily progress" tint="mint"/><Metric icon={<TrendingUp/>} label="Today's average" value={daily.average ?? '—'} suffix={daily.average?' mg/dL':''} note="Based on today's entries" tint="lavender"/><Metric icon={<Activity/>} label="Highest today" value={daily.highest ?? '—'} suffix={daily.highest?' mg/dL':''} note="Today's peak reading" tint="peach"/><Metric icon={<HeartPulse/>} label="Lowest today" value={daily.lowest ?? '—'} suffix={daily.lowest?' mg/dL':''} note="Today's lowest reading" tint="blue"/></section>
  <div className="section-heading"><div><h2>Glucose insights</h2><p className="muted">A closer look at your readings and trends.</p></div><label className="date-select"><CalendarDays size={17}/><input type="date" value={selectedDate} max={today()} onChange={e=>{setSelectedDate(e.target.value);setSumDaily(e.target.value)}}/></label></div>
  <section className="report-grid"><div className="panel chart-panel"><div className="panel-head"><div><h3>Reading trends</h3><p className="muted">Your readings this month</p></div><span className="soft-tag">mg/dL</span></div>{chartData.length?<div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="fillGlucose" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#36a994" stopOpacity={.22}/><stop offset="100%" stopColor="#36a994" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e9efed"/><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{fontSize:11,fill:'#87938f'}}/><YAxis tickLine={false} axisLine={false} tick={{fontSize:11,fill:'#87938f'}} width={35}/><Tooltip/><Area type="monotone" dataKey="glucose" stroke="#279b88" strokeWidth={2.5} fill="url(#fillGlucose)" /></AreaChart></ResponsiveContainer></div>:<Empty text="Add a few readings to see your monthly trend."/>}</div>
  <div className="panel daily-panel"><div className="panel-head"><div><h3>Daily breakdown</h3><p className="muted">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p></div><span className="count-tag">{daily.count} / 4</span></div>{daily.readings?.length?<div className="slot-list">{daily.readings.map(r=><div className="slot-row" key={r.id}><span className="slot-dot"/><div className="slot-info"><b>{slotNames[r.slot]}</b><small>{r.reading_date}</small></div><strong>{r.value}<small> mg/dL</small></strong><button className="icon-button" onClick={()=>openEdit(r)}><Pencil size={15}/></button></div>)}</div>:<Empty text="No readings for this date yet. Add your first one."/>}<button className="text-button" onClick={openAdd}>Add a reading <ArrowUpRight size={15}/></button></div></section>
  <section className="section-heading reports-title"><div><h2>Reporting periods</h2><p className="muted">Your glucose summary at a glance.</p></div></section><section className="summary-grid"><Summary title="Daily report" period={sumDaily} data={reports?.daily} control={{type:'date',value:sumDaily,onChange:setSumDaily}}/><Summary title="Month to date" period={`${sumMtd.slice(0,7)} · 1st – ${sumMtd.slice(8,10)}`} data={reports?.monthToDate} control={{type:'date',value:sumMtd,onChange:setSumMtd}}/><Summary title="Monthly report" period={sumMonth?new Date(`${sumMonth}-01T12:00:00`).toLocaleDateString('en-IN',{month:'long',year:'numeric'}):'—'} data={reports?.monthly} control={{type:'month',value:sumMonth,onChange:setSumMonth,max:today().slice(0,7)}}/></section>
  <section className="panel all-readings"><div className="panel-head"><div><h3>Recent readings</h3><p className="muted">Your latest glucose entries</p></div><button className="text-button" onClick={()=>setTab('readings')}>View all <ArrowUpRight size={15}/></button></div>{readings.length?<div className="table-wrap"><table><thead><tr><th>DATE</th><th>TIME SLOT</th><th>GLUCOSE VALUE</th><th>ACTIONS</th></tr></thead><tbody>{readings.slice(0,6).map(r=><tr key={r.id}><td>{new Date(`${r.reading_date}T12:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td><td>{slotNames[r.slot]}</td><td><b>{r.value} mg/dL</b></td><td><button className="icon-button" onClick={()=>openEdit(r)}><Pencil size={15}/></button><button className="icon-button danger" onClick={()=>setDeleting(r)}><Trash2 size={15}/></button></td></tr>)}</tbody></table></div>:<Empty text="Your readings will appear here."/>}</section>
  </>}
  {tab==='readings'&&<>
  <section className="section-heading"><div><h2>All readings</h2><p className="muted">Every glucose entry, newest first.</p></div></section>
  <section className="panel all-readings"><div className="table-wrap"><table><thead><tr><th>DATE</th><th>TIME SLOT</th><th>GLUCOSE VALUE</th><th>ACTIONS</th></tr></thead><tbody>{pageData.readings.map(r=><tr key={r.id}><td>{new Date(`${r.reading_date}T12:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td><td>{slotNames[r.slot]}</td><td><b>{r.value} mg/dL</b></td><td><button className="icon-button" onClick={()=>openEdit(r)}><Pencil size={15}/></button><button className="icon-button danger" onClick={()=>setDeleting(r)}><Trash2 size={15}/></button></td></tr>)}</tbody></table></div>
  {!pageData.readings.length&&<Empty text="Your readings will appear here."/>}
  {pageData.total>0&&(()=>{const totalPages=Math.ceil(pageData.total/pageData.limit);const nums=Array.from({length:totalPages},(_,i)=>i+1).filter(n=>totalPages<=7||Math.abs(n-pageData.page)<=2);const from=(pageData.page-1)*pageData.limit+1;const to=Math.min(pageData.page*pageData.limit,pageData.total);return <div className="pagination"><span className="page-info">Showing {from}–{to} of {pageData.total}</span><div className="page-buttons"><button className="icon-button" disabled={pageData.page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={16}/></button>{nums.map(n=><button key={n} className={`page-num ${n===pageData.page?'active':''}`} onClick={()=>setPage(n)}>{n}</button>)}<button className="icon-button" disabled={pageData.page>=totalPages} onClick={()=>setPage(p=>p+1)}><ChevronRight size={16}/></button></div></div>})()}
  </section>
  </>}
  <footer>Made with care by Sweety <span>·</span> Your health journey, one reading at a time.</footer></div></main>
  {modal && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><form className="modal" onSubmit={save}><div className="modal-head"><div><span className="eyebrow">{modal.kind==='add'?'NEW ENTRY':'UPDATE ENTRY'}</span><h2>{modal.kind==='add'?'Add glucose reading':'Edit reading'}</h2></div><button type="button" className="icon-button" onClick={()=>setModal(null)}><X/></button></div><p className="muted">Record your blood glucose level in mg/dL.</p><label>Date<input type="date" required max={today()} value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Time slot<select value={form.slot} onChange={e=>setForm({...form,slot:e.target.value})}>{Object.entries(slotNames).map(([v,l])=>{const locked=form.date===today()&&nowMinutes()<slotOpenMinutes[v];return <option value={v} key={v} disabled={locked}>{l}{locked?` · from ${slotOpens[v]}`:''}</option>})}</select></label><label>Glucose value (mg/dL)<input type="number" required min="40" max="600" step="1" value={form.value} onChange={e=>setForm({...form,value:e.target.value})} placeholder="e.g. 110"/></label><div className="hint">Enter a whole number between 40 and 600 mg/dL.</div>{form.date===today()&&nowMinutes()<slotOpenMinutes[form.slot]&&<div className="hint">The {slotNames[form.slot].toLowerCase()} slot opens at {slotOpens[form.slot]} today.</div>}{error&&<div className="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal(null)}>Cancel</button><button className="primary">{modal.kind==='add'?'Save reading':'Update reading'} <Check size={16}/></button></div></form></div>}
  {profileOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setProfileOpen(false)}}><div className="modal profile-modal"><div className="modal-head"><div><span className="eyebrow">MY PROFILE</span><h2>{user.name}</h2></div><button type="button" className="icon-button" onClick={()=>setProfileOpen(false)}><X/></button></div>
  <div className="profile-details">
    <div className="profile-row"><span>Full name</span><b>{user.name}</b></div>
    <div className="profile-row"><span>Email</span><b>{user.email}</b></div>
    <div className="profile-row"><span>Account type</span><b>Patient</b></div>
    <div className="profile-row"><span>Member since</span><b>{user.created_at?new Date(user.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'}</b></div>
    <div className="profile-row"><span>Assigned doctor</span><b>{user.doctor_name||'Not assigned yet'}</b>{user.doctor_specialization&&<small>{user.doctor_specialization}</small>}</div>
  </div>
  <p className="muted" style={{marginTop:16}}>Your readings are private and only visible to you and your assigned care team.</p>
  </div></div>}
  {deleting&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setDeleting(null)}}><div className="modal"><div className="modal-head"><div><span className="eyebrow">DELETE READING</span><h2>Delete this reading?</h2></div><button type="button" className="icon-button" onClick={()=>setDeleting(null)}><X/></button></div>
  <p className="muted">This will permanently delete the <b>{slotNames[deleting.slot]?.toLowerCase()}</b> reading of <b>{deleting.value} mg/dL</b> on <b>{new Date(`${deleting.reading_date}T12:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</b>. This action cannot be undone.</p>
  <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setDeleting(null)}>Cancel</button><button type="button" className="primary danger-btn" onClick={confirmDelete}><Trash2 size={16}/> Delete reading</button></div>
  </div></div>}
  </div>;
}

function Metric({icon,label,value,suffix,note,tint}) { return <div className="metric-card"><div className={`metric-icon ${tint}`}>{icon}</div><span className="metric-label">{label}</span><div className="metric-value">{value}<small>{suffix}</small></div><span className="metric-note">{note}</span></div>; }
export function Summary({title,period,data,control}) { return <div className="summary-card"><div className="summary-top"><b>{title}</b>{control?<input className="summary-date" type={control.type} value={control.value} max={control.max||today()} onChange={e=>control.onChange(e.target.value)}/>:<span className="summary-icon"><CalendarDays size={16}/></span>}</div><p className="muted">{period}</p>{data?.count?<><div className="summary-average">{data.average}<small> mg/dL avg.</small></div><div className="summary-stats"><span>High <b>{data.highest}</b></span><span>Low <b>{data.lowest}</b></span><span>Readings <b>{data.count}</b></span></div></>:<div className="summary-empty">No readings in this period</div>}</div>; }
export function Empty({text}) { return <div className="empty"><span><Droplets size={21}/></span><p>{text}</p></div>; }

export default App;
