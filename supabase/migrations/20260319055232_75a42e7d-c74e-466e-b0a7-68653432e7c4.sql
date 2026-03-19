
-- Assign lat/lng to all agents that don't have coordinates using country capitals with offset
WITH agent_rows AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM agents
  WHERE lat IS NULL OR lng IS NULL
),
country_rows AS (
  SELECT code, capital_lat, capital_lng, ROW_NUMBER() OVER (ORDER BY code) AS rn
  FROM countries
),
assignments AS (
  SELECT a.id,
         c.code AS new_country_code,
         c.capital_lat + (random() - 0.5) * 2 AS new_lat,
         c.capital_lng + (random() - 0.5) * 2 AS new_lng
  FROM agent_rows a
  JOIN country_rows c ON ((a.rn - 1) % (SELECT COUNT(*) FROM countries) + 1) = c.rn
)
UPDATE agents
SET lat = assignments.new_lat,
    lng = assignments.new_lng,
    country_code = assignments.new_country_code
FROM assignments
WHERE agents.id = assignments.id;
