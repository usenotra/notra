BEGIN;
DO $$
BEGIN
  IF current_database() <> 'notra_migration_test' OR current_user <> 'notra_test' THEN
    RAISE EXCEPTION 'Migration fixtures require the isolated notra_test database owner';
  END IF;
END
$$;
INSERT INTO users (id, name, email, email_verified, locale)
VALUES
  ('migration_user_owner', 'Migration Test Owner', 'migration-owner@example.invalid', true, 'en'),
  ('migration_user_other', 'Migration Other Owner', 'migration-other@example.invalid', true, 'en')
ON CONFLICT (id) DO NOTHING;
INSERT INTO organizations (id, name, slug, created_at, onboarding_completed)
VALUES
  ('migration_org_owned', 'Migration Test Workspace', 'migration-test', '2026-01-01T00:00:00Z', true),
  ('migration_org_other', 'Migration Other Workspace', 'migration-other', '2026-01-01T00:00:00Z', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO members (id, organization_id, user_id, role, created_at)
VALUES
  ('migration_member_owner', 'migration_org_owned', 'migration_user_owner', 'owner', '2026-01-01T00:00:00Z'),
  ('migration_member_other', 'migration_org_other', 'migration_user_other', 'owner', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;
COMMIT;
