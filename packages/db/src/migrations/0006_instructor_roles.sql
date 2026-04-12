ALTER TABLE instructors
  ADD COLUMN IF NOT EXISTS role text;

UPDATE instructors
SET role = CASE
  WHEN subject LIKE '%상담%' OR subject LIKE '%학생관리%' OR subject LIKE '%운영%' OR subject LIKE '%행정%' OR subject LIKE '%원무%' OR subject LIKE '%마케팅%' OR subject LIKE '%차량%' THEN 'staff'
  WHEN subject LIKE '%영어%' OR subject LIKE '%수학%' OR subject LIKE '%국어%' OR subject LIKE '%과학%' OR subject LIKE '%사회%' OR subject LIKE '%초등부%' OR subject LIKE '%중등부%' OR subject LIKE '%고등부%' OR subject LIKE '%성인부%' OR subject LIKE '%파닉스%' OR subject LIKE '%회화%' OR subject LIKE '%문법%' OR subject LIKE '%독해%' OR subject LIKE '%토익%' THEN 'teacher'
  ELSE 'hybrid'
END
WHERE role IS NULL OR role = '';

ALTER TABLE instructors
  ALTER COLUMN role SET DEFAULT 'teacher';

ALTER TABLE instructors
  ALTER COLUMN role SET NOT NULL;
