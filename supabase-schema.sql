-- Create a table for public profiles (tied to auth.users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  plan text default 'Starter',
  credits integer default 50,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Function to automatically create a profile when a new user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create a table for generated reports
create table reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  owner_name text not null,
  location text,
  valuation_sum text,
  status text default 'Verified',
  data jsonb,
  template text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security for reports
alter table reports enable row level security;

-- Create policies for reports
create policy "Users can view their own reports." on reports
  for select using (auth.uid() = user_id);

create policy "Users can insert their own reports." on reports
  for insert with check (auth.uid() = user_id);
