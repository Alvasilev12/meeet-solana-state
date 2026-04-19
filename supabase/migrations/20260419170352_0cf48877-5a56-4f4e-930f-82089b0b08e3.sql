
-- Распределение классов агентов по секторам (министерствам)
-- oracle  -> ai_architects / health_bio / climate_earth / space_cosmos (научные)
-- diplomat -> politics_diplomacy / legal_compliance / justice_arbitration
-- trader/banker -> defi_markets / trade_logistics
-- miner   -> energy_resources / climate_earth
-- warrior -> justice_arbitration / legal_compliance
-- builder -> ai_architects
-- hacker  -> defi_markets
-- scout   -> media_journalism / education_culture

WITH ranked AS (
  SELECT id, class, row_number() OVER (PARTITION BY class ORDER BY random()) AS rn,
         count(*) OVER (PARTITION BY class) AS cnt
  FROM public.agents
  WHERE class != 'president' AND sector IS NULL
),
assigned AS (
  SELECT id,
    CASE class
      WHEN 'oracle' THEN
        CASE WHEN rn <= cnt/4 THEN 'ai_architects'
             WHEN rn <= cnt/2 THEN 'health_bio'
             WHEN rn <= 3*cnt/4 THEN 'climate_earth'
             ELSE 'space_cosmos' END
      WHEN 'diplomat' THEN
        CASE WHEN rn <= cnt/3 THEN 'politics_diplomacy'
             WHEN rn <= 2*cnt/3 THEN 'legal_compliance'
             ELSE 'justice_arbitration' END
      WHEN 'trader' THEN
        CASE WHEN rn <= cnt/2 THEN 'defi_markets' ELSE 'trade_logistics' END
      WHEN 'banker' THEN 'defi_markets'
      WHEN 'miner' THEN
        CASE WHEN rn <= cnt/2 THEN 'energy_resources' ELSE 'climate_earth' END
      WHEN 'warrior' THEN
        CASE WHEN rn <= cnt/2 THEN 'justice_arbitration' ELSE 'legal_compliance' END
      WHEN 'builder' THEN 'ai_architects'
      WHEN 'hacker' THEN 'defi_markets'
      WHEN 'scout' THEN
        CASE WHEN rn <= cnt/2 THEN 'media_journalism' ELSE 'education_culture' END
    END AS sector_key
  FROM ranked
)
UPDATE public.agents a SET sector = x.sector_key
FROM assigned x WHERE a.id = x.id;

-- Обновляем member_count для каждого сектора
UPDATE public.agent_sectors s
SET member_count = sub.cnt
FROM (SELECT sector, COUNT(*) AS cnt FROM public.agents WHERE sector IS NOT NULL GROUP BY sector) sub
WHERE s.key = sub.sector;

-- Назначаем министров: топ-агент по reputation в каждом секторе
UPDATE public.agent_sectors s
SET minister_agent_id = sub.id
FROM (
  SELECT DISTINCT ON (sector) sector, id
  FROM public.agents
  WHERE sector IS NOT NULL
  ORDER BY sector, reputation DESC, created_at ASC
) sub
WHERE s.key = sub.sector AND s.minister_agent_id IS NULL;

-- Сидим начальную казну каждому министерству пропорционально размеру
UPDATE public.agent_sectors
SET treasury_meeet = GREATEST(member_count * 1000, 5000)
WHERE treasury_meeet = 0;
