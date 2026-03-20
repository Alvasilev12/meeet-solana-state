
DROP POLICY IF EXISTS "Auth users can create oracle questions" ON oracle_questions;

CREATE POLICY "Auth users can create oracle questions"
ON oracle_questions
FOR INSERT
TO authenticated
WITH CHECK (
  yes_pool = 0
  AND no_pool = 0
  AND (total_pool_meeet IS NULL OR total_pool_meeet = 0)
  AND (status IS NULL OR status = 'open')
  AND resolution IS NULL
  AND resolved_at IS NULL
  AND deadline > now()
);
