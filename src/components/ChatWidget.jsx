import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const API_BASE = ''; // same-origin; Vite dev proxy forwards /api to the dev API server
const QUEUE_TIMEOUT_MS = 120000;  // 120 seconds

const STATUS = {
  CLOSED:   'closed',
  INTRO:    'intro',
  WAITING:  'waiting',
  ACTIVE:   'active',
  TIMEDOUT: 'timed_out',
  LEAVING:  'leaving_message',
  SENT:     'message_sent',
};

export default function ChatWidget() {
  const { user } = useAuth();

  const [panelStatus, setPanelStatus] = useState(STATUS.CLOSED);
  const [form,        setForm]        = useState({ name: '', email: '' });
  const [sessionId,   setSessionId]   = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [messageBody, setMessageBody] = useState('');
  const [queuePos,    setQueuePos]    = useState(1);
  const [elapsed,     setElapsed]     = useState(0);
  const [ticketForm,  setTicketForm]  = useState({ subject: '', body: '' });
  const [sending,     setSending]     = useState(false);

  const timerRef      = useRef(null);
  const realtimeRef   = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(timerRef.current);
    realtimeRef.current?.unsubscribe();
  }, []);

  const startChat = async () => {
    setSending(true);
    try {
      const name  = user ? user.username : form.name;
      const email = user ? user.email    : form.email;

      const res = await fetch(`${API_BASE}/api/support/chat/start`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ guestName: name, guestEmail: email, userId: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSessionId(data.sessionId);
      setQueuePos(data.queuePosition ?? 1);
      setElapsed(0);
      setPanelStatus(STATUS.WAITING);
      startQueueTimer(data.sessionId);
      subscribeToSession(data.sessionId);
    } catch (err) {
      console.error('[ChatWidget]', err);
    } finally {
      setSending(false);
    }
  };

  const startQueueTimer = useCallback((sid) => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1000;
        if (next >= QUEUE_TIMEOUT_MS) {
          clearInterval(timerRef.current);
          // Only time out if still waiting
          setPanelStatus(s => s === STATUS.WAITING ? STATUS.TIMEDOUT : s);
          // Mark session timed_out server-side
          fetch(`${API_BASE}/api/support/chat/end`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ sessionId: sid, reason: 'timed_out' }),
          });
        }
        return next;
      });
    }, 1000);
  }, []);

  const subscribeToSession = useCallback((sid) => {
    if (!supabase) return;

    realtimeRef.current = supabase
      .channel(`chat:${sid}`)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'chat_sessions',
        filter: `id=eq.${sid}`,
      }, (payload) => {
        const { status: newStatus, agent_id } = payload.new;
        if (newStatus === 'active' && agent_id) {
          clearInterval(timerRef.current);
          setPanelStatus(STATUS.ACTIVE);
          loadMessages(sid);
        }
      })
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'chat_messages',
        filter: `session_id=eq.${sid}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();
  }, []);

  const loadMessages = async (sid) => {
    try {
      const res  = await fetch(`${API_BASE}/api/support/chat/messages?sessionId=${encodeURIComponent(sid)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) setMessages(data.messages ?? []);
    } catch { /* ignore network errors on chat load */ }
  };

  const sendMessage = async () => {
    if (!messageBody.trim() || !sessionId) return;
    const body = messageBody.trim();
    setMessageBody('');

    await fetch(`${API_BASE}/api/support/chat/message`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        sessionId,
        senderName: user ? user.username : form.name,
        senderId:   user?.id ?? null,
        body,
        isAgent:    false,
      }),
    });
  };

  const endChat = async () => {
    clearInterval(timerRef.current);
    realtimeRef.current?.unsubscribe();
    if (sessionId) {
      await fetch(`${API_BASE}/api/support/chat/end`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId, reason: 'user' }),
      });
    }
    setPanelStatus(STATUS.CLOSED);
    setSessionId(null);
    setMessages([]);
  };

  const submitTicket = async () => {
    if (!ticketForm.subject || !ticketForm.body) return;
    setSending(true);
    try {
      const name  = user ? user.username : form.name;
      const email = user ? user.email    : form.email;

      const res = await fetch(`${API_BASE}/api/support/tickets/create`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          guestName:  name,
          guestEmail: email,
          subject:    ticketForm.subject,
          body:       ticketForm.body,
          userId:     user?.id ?? null,
          source:     'widget',
          sessionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPanelStatus(STATUS.SENT);
    } catch (err) {
      console.error('[ChatWidget ticket]', err);
    } finally {
      setSending(false);
    }
  };

  const remaining  = Math.max(0, QUEUE_TIMEOUT_MS - elapsed);
  const remSecs    = Math.ceil(remaining / 1000);
  const timerColor = remSecs < 30 ? '#ef4444' : remSecs < 60 ? '#f59e0b' : '#10b981';

  return (
    <>
      {/* WhatsApp floating button */}
      <a
        href="https://wa.me/263773909307"
        target="_blank"
        rel="noopener noreferrer"
        className="chat-widget-fab whatsapp-fab"
        aria-label="Chat on WhatsApp"
      >
        <i className="fab fa-whatsapp"></i>
      </a>

      {/* Panel */}
      {panelStatus !== STATUS.CLOSED && (
        <div className="chat-widget-panel">

          {/* Header */}
          <div className="chat-widget-header">
            <div className="chat-widget-title">
              <i className="fas fa-headset"></i>
              <span>ScanCodeZW Support</span>
              {panelStatus === STATUS.ACTIVE && <span className="chat-online-dot"></span>}
            </div>
            <button className="chat-close-btn" onClick={endChat} aria-label="Close chat">&times;</button>
          </div>

          {/* Intro form */}
          {panelStatus === STATUS.INTRO && (
            <div className="chat-widget-body chat-intro">
              <p>Hi there! Start a chat or leave a message and we'll get back to you.</p>
              <div className="form-group">
                <input className="form-input" placeholder="Your name *" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <input type="email" className="form-input" placeholder="Email address *" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <button className="btn btn-primary btn-block" disabled={!form.name || !form.email || sending} onClick={startChat}>
                {sending ? <><i className="fas fa-spinner fa-spin"></i> Starting…</> : <><i className="fas fa-comments"></i> Start Chat</>}
              </button>
            </div>
          )}

          {/* Waiting in queue */}
          {panelStatus === STATUS.WAITING && (
            <div className="chat-widget-body chat-waiting">
              <div className="chat-queue-icon">
                <i className="fas fa-clock" style={{ color: timerColor }}></i>
              </div>
              <h4>You're in the queue</h4>
              <p>Position #{queuePos} — an agent will be with you shortly.</p>
              <div className="chat-timer" style={{ color: timerColor }}>
                {remSecs}s remaining
              </div>
              <div className="chat-timer-bar">
                <div className="chat-timer-fill" style={{ width: `${(remaining / QUEUE_TIMEOUT_MS) * 100}%`, background: timerColor }}></div>
              </div>
            </div>
          )}

          {/* Timed out — offer to leave message */}
          {panelStatus === STATUS.TIMEDOUT && (
            <div className="chat-widget-body chat-timed-out">
              <div className="chat-queue-icon"><i className="fas fa-moon" style={{ color: '#9ca3af' }}></i></div>
              <h4>No agents available right now</h4>
              <p>Leave us a message and we'll reply by email as soon as possible.</p>
              <button className="btn btn-primary btn-block" onClick={() => setPanelStatus(STATUS.LEAVING)}>
                <i className="fas fa-envelope"></i> Leave a Message
              </button>
            </div>
          )}

          {/* Leave message form */}
          {panelStatus === STATUS.LEAVING && (
            <div className="chat-widget-body">
              <div className="form-group">
                <input className="form-input" placeholder="Subject *" value={ticketForm.subject}
                  onChange={e => setTicketForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
              <div className="form-group">
                <textarea className="form-input" rows={4} placeholder="Describe your issue… *"
                  style={{ resize: 'none' }} value={ticketForm.body}
                  onChange={e => setTicketForm(f => ({ ...f, body: e.target.value }))} />
              </div>
              <button className="btn btn-primary btn-block" disabled={!ticketForm.subject || !ticketForm.body || sending} onClick={submitTicket}>
                {sending ? <><i className="fas fa-spinner fa-spin"></i> Sending…</> : <><i className="fas fa-paper-plane"></i> Send Message</>}
              </button>
            </div>
          )}

          {/* Message sent */}
          {panelStatus === STATUS.SENT && (
            <div className="chat-widget-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
              <i className="fas fa-check-circle" style={{ fontSize: '3rem', color: '#10b981', marginBottom: '1rem' }}></i>
              <h4>Message received!</h4>
              <p>We'll reply to <strong>{user?.email ?? form.email}</strong> as soon as an agent is available.</p>
              <button className="btn btn-outline btn-block" style={{ marginTop: '1rem' }} onClick={() => setPanelStatus(STATUS.CLOSED)}>
                Close
              </button>
            </div>
          )}

          {/* Active chat */}
          {panelStatus === STATUS.ACTIVE && (
            <>
              <div className="chat-messages">
                {messages.map(m => (
                  <div key={m.id} className={`chat-msg ${m.is_agent ? 'chat-msg-agent' : 'chat-msg-user'}`}>
                    <div className="chat-msg-bubble">{m.body}</div>
                    <div className="chat-msg-meta">{m.sender_name} · {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="chat-input-row">
                <input
                  className="form-input chat-input"
                  placeholder="Type a message…"
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                />
                <button className="btn btn-primary chat-send-btn" onClick={sendMessage} disabled={!messageBody.trim()}>
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
              <div className="chat-end-row">
                <button className="btn btn-outline btn-sm" onClick={endChat}>End Chat</button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
