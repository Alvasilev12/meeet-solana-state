-- Move seeder agents (created by hourly cron at HH:17) back to the system owner.
UPDATE public.agents
SET user_id = '00000000-0000-0000-0000-000000000000'::uuid
WHERE user_id <> '00000000-0000-0000-0000-000000000000'::uuid
  AND EXTRACT(MINUTE FROM created_at) = 17
  AND EXTRACT(SECOND FROM created_at) < 5;