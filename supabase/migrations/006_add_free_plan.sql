-- Add 'free' plan to subscription_type constraint
-- This allows users to sign up with a free trial plan

alter table public.profiles 
  drop constraint if exists profiles_subscription_type_check;

alter table public.profiles 
  add constraint profiles_subscription_type_check
  check (subscription_type in ('free','starter','business','pro','enterprise','custom'));

-- Insert free plan into subscription_plans table
insert into public.subscription_plans values
  ('free', 'Free Trial', 0, 1, 1, '1 barcode/month, 1 QR code/month, EAN-13 & UPC-A, PNG download', true)
on conflict (id) do nothing;

-- Update default subscription_type to 'free'
alter table public.profiles 
  alter column subscription_type set default 'free';

-- Update trigger to save plan from user metadata
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, subscription_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'plan', 'free')
  );
  return new;
end;
$$;
