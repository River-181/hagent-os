WITH ranked_cases AS (
  SELECT
    id,
    organization_id,
    identifier,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, identifier
      ORDER BY created_at, id
    ) AS duplicate_rank
  FROM cases
),
deduped_cases AS (
  SELECT
    id,
    identifier || '-dup-' || duplicate_rank::text AS next_identifier
  FROM ranked_cases
  WHERE duplicate_rank > 1
)
UPDATE cases
SET identifier = deduped_cases.next_identifier
FROM deduped_cases
WHERE cases.id = deduped_cases.id;

CREATE UNIQUE INDEX IF NOT EXISTS cases_organization_identifier_unique
  ON cases (organization_id, identifier);
