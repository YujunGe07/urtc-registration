-- Run once in the Supabase SQL editor. Tables are private to the Edge Function.
create table public.urtc_conferences (
 id text primary key,
 revision bigint not null default 0,
 data jsonb not null
);
create table public.urtc_presenter_sessions (
 token_hash text primary key,
 submission_id text not null,
 expires_at bigint not null
);
create index urtc_sessions_expiry on public.urtc_presenter_sessions(expires_at);
create table public.urtc_organizers (
 email text primary key check(email = lower(email))
);
create table public.urtc_login_attempts (
 id text primary key,
 attempts integer not null default 1,
 expires_at bigint not null
);
create index urtc_attempts_expiry on public.urtc_login_attempts(expires_at);
alter table public.urtc_conferences enable row level security;
alter table public.urtc_presenter_sessions enable row level security;
alter table public.urtc_organizers enable row level security;
alter table public.urtc_login_attempts enable row level security;
-- No browser role can select or modify these tables, including verified organizers.
-- The Edge Function verifies identity and applies the domain rules before using service_role.
revoke all on public.urtc_conferences,public.urtc_presenter_sessions,public.urtc_organizers,public.urtc_login_attempts from anon,authenticated;
grant select,insert,update,delete on public.urtc_conferences,public.urtc_presenter_sessions,public.urtc_organizers,public.urtc_login_attempts to service_role;
insert into public.urtc_conferences(id,data) values ('urtc-2027','{"presenters":[],"submissions":[],"blocks":[],"log":[]}');
insert into public.urtc_organizers(email) values ('geyujunamy@gmail.com'),('gwan@vicr.com');
create function public.urtc_count_login(p_id text,p_expiry bigint) returns integer
language sql security definer set search_path = '' as $$
 insert into public.urtc_login_attempts(id,attempts,expires_at) values(p_id,1,p_expiry)
 on conflict(id) do update set attempts=public.urtc_login_attempts.attempts+1 returning attempts;
$$;
revoke all on function public.urtc_count_login(text,bigint) from public,anon,authenticated;
grant execute on function public.urtc_count_login(text,bigint) to service_role;
