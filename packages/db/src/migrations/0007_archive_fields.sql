ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS archived_at timestamp;

ALTER TABLE ops_groups
  ADD COLUMN IF NOT EXISTS archived_at timestamp;
