import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = { open: '#f59e0b', in_progress: '#6366f1', resolved: '#10b981', closed: '#6b7280' };
const PRIORITY_COLORS = { low: '#22d3ee', medium: '#f59e0b', high: '#ef4444', urgent: '#dc2626' };
const fmtDate = (s) => s ? new Date(s).toLocaleDateString() : '-';

export default function SASupport() {
  const { user }      = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState(null);
  const [statusFilter, setStatusFilter]   = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [reply, setReply]       = useState('');
  const [sending, setSending]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter)   params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    params.set('limit', '100');
    fetch(`/api/support/tickets/list?${params}`, { headers: { Authorization: `Bearer ${user?.token}` } })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setTickets(Array.isArray(d) ? d : []); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [user?.token, statusFilter, priorityFilter]);

  useEffect(() => { load(); }, [load]);

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    const res = await fetch('/api/support/tickets/reply', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user?.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: selected.id, message: reply, sender: 'agent' }),
    }).then(r => r.json());
    setSending(false);
    if (res.error) { alert(res.error); return; }
    setReply('');
  };

  const updateStatus = async (ticket_id, status) => {
    await fetch('/api/support/tickets/update', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${user?.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id, status }),
    });
    load();
  };

  if (loading) return <div className="sa-loading">Loading tickets…</div>;
  if (err)     return <div className="sa-error">{err}</div>;

  return (
    <div className="sa-tab-content">
      <div className="sa-toolbar">
        <h3 style={{ margin: 0 }}>Support Tickets ({tickets.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="sa-select-inline" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select className="sa-select-inline" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="sa-support-layout">
        <div className="sa-ticket-list">
          {tickets.map(t => (
            <div
              key={t.id}
              className={`sa-ticket-item${selected?.id === t.id ? ' selected' : ''}`}
              onClick={() => setSelected(t)}
            >
              <div className="sa-ticket-header">
                <span className="mono">#{t.ticket_number}</span>
                <span className="sa-badge" style={{ background: PRIORITY_COLORS[t.priority] + '22', color: PRIORITY_COLORS[t.priority] }}>{t.priority}</span>
              </div>
              <div className="sa-ticket-subject">{t.subject}</div>
              <div className="sa-ticket-meta">
                <span className="sa-badge" style={{ background: STATUS_COLORS[t.status] + '22', color: STATUS_COLORS[t.status] }}>{t.status}</span>
                <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>{fmtDate(t.created_at)}</span>
              </div>
            </div>
          ))}
          {tickets.length === 0 && <p className="sa-empty">No tickets</p>}
        </div>

        <div className="sa-ticket-detail">
          {selected ? (
            <>
              <div className="sa-ticket-detail-header">
                <h3>{selected.subject}</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['open','in_progress','resolved','closed'].map(s => (
                    <button
                      key={s}
                      className={`sa-btn sa-btn-sm${selected.status === s ? ' sa-btn-primary' : ''}`}
                      onClick={() => { updateStatus(selected.id, s); setSelected({ ...selected, status: s }); }}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sa-ticket-info-row">
                <span>From: <strong>{selected.guest_name || 'Registered user'}</strong></span>
                {selected.guest_email && <span>{selected.guest_email}</span>}
                <span>Source: {selected.source}</span>
              </div>
              <div className="sa-reply-area">
                <textarea
                  className="sa-textarea"
                  placeholder="Write a reply…"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  rows={4}
                />
                <button className="sa-btn sa-btn-primary" onClick={sendReply} disabled={sending || !reply.trim()}>
                  {sending ? 'Sending…' : 'Send Reply'}
                </button>
              </div>
            </>
          ) : (
            <div className="sa-empty" style={{ marginTop: '4rem' }}>Select a ticket to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}
