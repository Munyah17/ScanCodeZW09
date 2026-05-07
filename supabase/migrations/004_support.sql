-- ScanCodeZW — Migration 004: Live chat + ticket support system
-- Run in Supabase Dashboard → SQL Editor
-- After running: enable Realtime on chat_sessions and chat_messages tables in
-- Supabase Dashboard → Database → Replication → Tables

-- ── Support tickets ───────────────────────────────────────────────────────────

create table if not exists public.support_tickets (
  id            bigserial primary key,
  ticket_number text unique,                    -- auto-set by trigger below: TKT-00001
  user_id       uuid references public.profiles(id) on delete set null,
  guest_name    text,
  guest_email   text not null,
  subject       text not null,
  body          text not null,
  status        text not null default 'open',   -- open | in_progress | resolved | closed
  priority      text not null default 'normal', -- low | normal | high | urgent
  source        text not null default 'widget', -- widget | email | admin | chat
  assigned_to   uuid references public.profiles(id),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace function public.set_ticket_number()
returns trigger language plpgsql as $$
begin
  new.ticket_number = 'TKT-' || lpad(new.id::text, 5, '0');
  return new;
end;
$$;

drop trigger if exists trg_set_ticket_number on public.support_tickets;
create trigger trg_set_ticket_number
  before insert on public.support_tickets
  for each row execute function public.set_ticket_number();

alter table public.support_tickets enable row level security;

create policy "Users view own tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

create policy "Admins manage all tickets"
  on public.support_tickets for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
  ));

-- ── Ticket replies ─────────────────────────────────────────────────────────────

create table if not exists public.ticket_replies (
  id          bigserial primary key,
  ticket_id   bigint not null references public.support_tickets(id) on delete cascade,
  sender_id   uuid references public.profiles(id),
  sender_name text not null,
  is_agent    boolean not null default false,
  body        text not null,
  created_at  timestamptz not null default now()
);

alter table public.ticket_replies enable row level security;

create policy "Users view replies on own tickets"
  on public.ticket_replies for select
  using (exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and t.user_id = auth.uid()
  ));

create policy "Admins manage all replies"
  on public.ticket_replies for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
  ));

-- ── Live chat sessions ────────────────────────────────────────────────────────

create table if not exists public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  guest_name  text,
  guest_email text,
  status      text not null default 'waiting',  -- waiting | active | ended | abandoned | timed_out
  agent_id    uuid references public.profiles(id),
  ticket_id   bigint references public.support_tickets(id),
  started_at  timestamptz not null default now(),
  assigned_at timestamptz,
  ended_at    timestamptz
);

alter table public.chat_sessions enable row level security;

create policy "Users view own sessions"
  on public.chat_sessions for select
  using (auth.uid() = user_id);

create policy "Anyone can insert a session"
  on public.chat_sessions for insert
  with check (true);

create policy "Admins manage all sessions"
  on public.chat_sessions for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
  ));

-- ── Live chat messages ────────────────────────────────────────────────────────

create table if not exists public.chat_messages (
  id          bigserial primary key,
  session_id  uuid not null references public.chat_sessions(id) on delete cascade,
  sender_id   uuid references public.profiles(id),
  sender_name text not null,
  is_agent    boolean not null default false,
  body        text not null,
  created_at  timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "Session participants view messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = session_id and (s.user_id = auth.uid() or s.agent_id = auth.uid())
    )
  );

create policy "Anyone can insert messages"
  on public.chat_messages for insert
  with check (true);

create policy "Admins manage all messages"
  on public.chat_messages for all
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'admin'
  ));

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists idx_tickets_user_id  on public.support_tickets(user_id);
create index if not exists idx_tickets_status   on public.support_tickets(status);
create index if not exists idx_replies_ticket   on public.ticket_replies(ticket_id);
create index if not exists idx_chat_user        on public.chat_sessions(user_id);
create index if not exists idx_chat_status      on public.chat_sessions(status);
create index if not exists idx_chat_msgs        on public.chat_messages(session_id);

-- ── NOTE: After running this migration ───────────────────────────────────────
-- Enable Supabase Realtime for live chat:
-- Dashboard → Database → Replication → Tables
-- Toggle ON: chat_sessions, chat_messages
