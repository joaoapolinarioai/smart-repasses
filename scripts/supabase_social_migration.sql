-- 1. Tabela de Conexões (Followers/Following)
create table if not exists public.connections (
    id uuid default gen_random_uuid() primary key,
    follower_id uuid references auth.users(id) on delete cascade not null,
    following_id uuid references auth.users(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(follower_id, following_id),
    constraint no_self_follow check (follower_id <> following_id)
);

-- 2. Sistema de Chat (Estrutura Real)
create table if not exists public.chat_rooms (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.chat_participants (
    room_id uuid references public.chat_rooms(id) on delete cascade not null,
    profile_id uuid references auth.users(id) on delete cascade not null,
    primary key (room_id, profile_id)
);

create table if not exists public.chat_messages (
    id uuid default gen_random_uuid() primary key,
    room_id uuid references public.chat_rooms(id) on delete cascade not null,
    sender_id uuid references auth.users(id) on delete cascade not null,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Habilitar RLS
alter table public.connections enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

-- 4. Políticas para Conexões
create policy "Qualquer um pode ver conexões" on public.connections for select to authenticated using (true);
create policy "Usuários podem seguir outros" on public.connections for insert to authenticated with check (auth.uid() = follower_id);
create policy "Usuários podem deixar de seguir" on public.connections for delete to authenticated using (auth.uid() = follower_id);

-- 5. Políticas para Chat
create policy "Ver salas próprias" on public.chat_rooms for select to authenticated 
using (exists (select 1 from public.chat_participants where room_id = public.chat_rooms.id and profile_id = auth.uid()));

create policy "Ver participantes das minhas salas" on public.chat_participants for select to authenticated 
using (exists (select 1 from public.chat_participants p2 where p2.room_id = public.chat_participants.room_id and p2.profile_id = auth.uid()));

create policy "Ver minhas mensagens" on public.chat_messages for select to authenticated 
using (exists (select 1 from public.chat_participants where room_id = public.chat_messages.room_id and profile_id = auth.uid()));

create policy "Enviar mensagens" on public.chat_messages for insert to authenticated 
with check (exists (select 1 from public.chat_participants where room_id = public.chat_messages.room_id and profile_id = auth.uid()) and sender_id = auth.uid());

-- 6. Função para criar sala de chat automaticamente
create or replace function get_or_create_chat_room(p_other_user_id uuid) returns uuid as $$
declare
    v_room_id uuid;
begin
    -- Tenta encontrar sala existente entre os dois
    select room_id into v_room_id
    from public.chat_participants p1
    join public.chat_participants p2 on p1.room_id = p2.room_id
    where p1.profile_id = auth.uid() and p2.profile_id = p_other_user_id
    limit 1;

    if v_room_id is null then
        insert into public.chat_rooms (id) values (default) returning id into v_room_id;
        insert into public.chat_participants (room_id, profile_id) values (v_room_id, auth.uid()), (v_room_id, p_other_user_id);
    end if;

    return v_room_id;
end;
$$ language plpgsql security definer;
