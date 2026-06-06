-- Ensure the platform owner account has super_admin privileges
UPDATE profiles
SET user_type = 'super_admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'munyamuzvidziwa19@gmail.com'
);
