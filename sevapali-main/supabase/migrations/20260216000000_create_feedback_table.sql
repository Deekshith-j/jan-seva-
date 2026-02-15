create table feedback (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id),
    user_role text,
    category text,
    subject text,
    message text,
    rating int,
    office_id uuid references offices(id),
    service_name text,
    status text default 'pending',
    created_at timestamp with time zone default now()
);

alter table feedback enable row level security;

create policy "Users can manipulate their own feedback"
on feedback for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Officials can view all feedback"
on feedback for select
using (
  exists (select 1 from user_roles where user_id = auth.uid() and role in ('official', 'admin'))
);
