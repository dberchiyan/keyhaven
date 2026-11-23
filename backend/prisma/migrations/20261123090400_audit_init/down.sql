DROP TRIGGER "trg_audit_events_no_truncate" ON "audit_events";
DROP TRIGGER "trg_audit_events_no_update_delete" ON "audit_events";
DROP FUNCTION audit_events_reject_change();
DROP TABLE "audit_events";
