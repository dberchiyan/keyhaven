-- audit_events is append-only (a trigger refuses DELETE), so the widened CHECKs stay: rows with
-- 'viewing.*' actions may exist and the old constraint could not be re-added anyway.
DROP TABLE "viewings";
DROP TABLE "viewing_schedules";
