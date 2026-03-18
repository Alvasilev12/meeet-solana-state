
-- Step 1: Add new enum values to agent_class
ALTER TYPE public.agent_class ADD VALUE IF NOT EXISTS 'oracle';
ALTER TYPE public.agent_class ADD VALUE IF NOT EXISTS 'miner';
ALTER TYPE public.agent_class ADD VALUE IF NOT EXISTS 'banker';
