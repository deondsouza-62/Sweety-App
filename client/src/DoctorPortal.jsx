import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, CalendarDays, Check, CircleUserRound, Droplets, HeartPulse, LogOut, Sparkles, Stethoscope, TrendingUp, Users } from 'lucide-react';
import { request } from './api';
import { Empty, Summary, slotNames } from './App';
import './doctor.css';

const today = () => new Date().toLocaleDateString('en-CA');
const prevMonth = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

function Metric({ icon, label, value, suffix, note, tint }) { return <div className="metric-card"><div className={`metric-icon ${tint}`}>{icon}</div><span className="metric-label">{label}</span><div className="metric-value">{value}<small>{suffix}</small></div><span className="metric-note">{note}</span></div>; }

export default function DoctorPortal({ user, onLogout }) {
  const [patients, setPatients] = useState([]);
  const [patient, setPatient] = useState(null);
  const [readings, setReadings] = useState([]);
  const [report, setReport] = useState(null);
  const [sumDaily, setSumDaily] = useState(today());
  const [sumMtd, setSumMtd] = useState(today());
  const [sumMonth, setSumMonth] = useState(prevMonth());
  const [error, setError] = useState('');

  useEffect(() => {
    request('/doctor/patients').then(d => {
      setPatients(d.patients);
      if (d.patients.length && !patient) selectPatient(d.patients[0]);
    }).catch(e => setError(e.message));
  }, []);

  const selectPatient = async p => {
    setPatient(p); setReport(null); setError('');
    try {
      const [detail, rep] = await Promise.all([
        request(`/doctor/patients/${p.id}`),
        request(`/doctor/patients/${p.id}/report?daily=${sumDaily}&mtd=${sumMtd}&month=${sumMonth}`)
      ]);
      setPatient(detail.patient || p); setReadings(detail.readings); setReport(rep);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => {
    if (patient) request(`/doctor/patients/${patient.id}/report?daily=${sumDaily}&mtd=${sumMtd}&month=${sumMonth}`).then(setReport).catch(e => setError(e.message));
  }, [patient?.id, sumDaily, sumMtd, sumMonth]);

  const daily = report?.daily || { count: 0, average: null, highest: null, lowest: null, readings: [] };
  const firstName = user.name.replace(/^Dr\.\s*/i, '').split(' ')[0];

  return <div className="app-shell doctor-portal">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><span className="material-symbols-outlined">health_metrics</span></span> sweety</div>
      <div className="side-label">DOCTOR WORKSPACE</div>
      <button className="nav-item active"><Stethoscope size={18}/> Patient care</button>
      <div className="side-label">ASSIGNED PATIENTS · {patients.length}</div>
      <div className="patient-list">
        {patients.length ? patients.map(p =>
          <button key={p.id} className={`nav-item patient-item ${patient?.id === p.id ? 'active' : ''}`} onClick={() => selectPatient(p)}>
            <CircleUserRound size={18}/><span className="patient-name">{p.name}</span>
          </button>
        ) : <p className="muted side-empty">No patients assigned yet.</p>}
      </div>
      <div className="sidebar-bottom">
        <div className="side-tip"><Sparkles size={18}/><b>Clinical view</b><p>Review your patients' glucose reports and spot trends early.</p></div>
        <div className="profile"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><div className="profile-text"><b>{user.name}</b><small>Doctor account</small></div><button className="icon-button" title="Log out" onClick={onLogout}><LogOut size={17}/></button></div>
      </div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="eyebrow">SWEETY DOCTOR PORTAL</span><div className="top-title">Patient reports</div></div><div className="top-actions"><span className="status-pill"><span/> {patients.length} patient{patients.length === 1 ? '' : 's'} assigned</span><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div></div></header>
      <div className="content">
        <section className="welcome-row"><div><span className="eyebrow">CLINICAL DASHBOARD</span><h1>Hello, Dr. {firstName} <span>✦</span></h1><p className="muted">Review glucose reports for the patients assigned to you.</p></div></section>
        {error && <div className="alert">{error}<button onClick={() => setError('')}><X size={15}/></button></div>}
        {!patient ? <Empty text="Select a patient to view their report."/> : <>
          <section className="section-heading"><div><h2>{patient.name}</h2><p className="muted">{patient.email}</p></div><label className="date-select"><CalendarDays size={17}/><input type="date" value={sumDaily} max={today()} onChange={e => setSumDaily(e.target.value)}/></label></section>
          <section className="panel patient-overview"><div className="panel-head"><div><h3>Patient overview</h3><p className="muted">Account details and care assignment</p></div><span className="soft-tag">Assigned patient</span></div>
            <div className="overview-grid">
              <div className="overview-item"><span>FULL NAME</span><b>{patient.name}</b></div>
              <div className="overview-item"><span>EMAIL</span><b>{patient.email}</b></div>
              <div className="overview-item"><span>MEMBER SINCE</span><b>{patient.created_at ? new Date(patient.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</b></div>
              <div className="overview-item"><span>ASSIGNED DOCTOR</span><b>{patient.doctor_name || 'Unassigned'}</b>{patient.doctor_specialization && <small>{patient.doctor_specialization}</small>}</div>
            </div>
          </section>
          <section className="metric-grid">
            <Metric icon={<Droplets/>} label="Readings on date" value={daily.count} suffix="/ 4" note="Daily progress" tint="mint"/>
            <Metric icon={<TrendingUp/>} label="Average" value={daily.average ?? '—'} suffix={daily.average ? ' mg/dL' : ''} note="Selected date" tint="lavender"/>
            <Metric icon={<Activity/>} label="Highest" value={daily.highest ?? '—'} suffix={daily.highest ? ' mg/dL' : ''} note="Selected date" tint="peach"/>
            <Metric icon={<HeartPulse/>} label="Lowest" value={daily.lowest ?? '—'} suffix={daily.lowest ? ' mg/dL' : ''} note="Selected date" tint="blue"/>
          </section>
          <section className="summary-grid">
            <Summary title="Daily report" period={sumDaily} data={report?.daily} control={{type:'date',value:sumDaily,onChange:setSumDaily}}/>
            <Summary title="Month to date" period={`${sumMtd.slice(0, 7)} · 1st – ${sumMtd.slice(8, 10)}`} data={report?.monthToDate} control={{type:'date',value:sumMtd,onChange:setSumMtd}}/>
            <Summary title="Monthly report" period={sumMonth?new Date(`${sumMonth}-01T12:00:00`).toLocaleDateString('en-IN',{month:'long',year:'numeric'}):'—'} data={report?.monthly} control={{type:'month',value:sumMonth,onChange:setSumMonth,max:today().slice(0,7)}}/>
          </section>
          <section className="panel all-readings"><div className="panel-head"><div><h3>Readings on {new Date(`${sumDaily}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</h3><p className="muted">{patient.name}'s entries for the selected date</p></div><span className="count-tag">{daily.readings?.length || 0} / 4</span></div>
            {daily.readings?.length ? <div className="table-wrap"><table><thead><tr><th>TIME SLOT</th><th>GLUCOSE VALUE</th></tr></thead><tbody>{daily.readings.map(r => <tr key={r.id}><td>{slotNames[r.slot]}</td><td><b>{r.value} mg/dL</b></td></tr>)}</tbody></table></div> : <Empty text="No readings recorded for this date."/>}
          </section>
          <section className="panel all-readings"><div className="panel-head"><div><h3>Recent readings</h3><p className="muted">Latest entries across all dates</p></div></div>
            {readings.length ? <div className="table-wrap"><table><thead><tr><th>DATE</th><th>TIME SLOT</th><th>GLUCOSE VALUE</th></tr></thead><tbody>{readings.slice(0, 10).map(r => <tr key={r.id}><td>{new Date(`${r.reading_date}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td>{slotNames[r.slot]}</td><td><b>{r.value} mg/dL</b></td></tr>)}</tbody></table></div> : <Empty text="No readings yet."/>}
          </section>
        </>}
        <footer>Made with care by Sweety <span>·</span> Supporting clinicians with clearer glucose insights.</footer>
      </div>
    </main>
  </div>;
}
