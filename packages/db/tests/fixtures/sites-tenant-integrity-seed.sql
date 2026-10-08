INSERT INTO organizations VALUES ('a'), ('b');
INSERT INTO projects VALUES ('project-a', 'a'), ('project-b', 'b');
INSERT INTO github_app_installations VALUES ('installation-a', 'a'), ('installation-b', 'b');
INSERT INTO github_integrations VALUES ('repository-a', 'a', 'installation-a'), ('repository-b', 'b', 'installation-b');
INSERT INTO posts VALUES ('post-a', 'a'), ('post-b', 'b');
INSERT INTO sites (
  id, organization_id, project_id, name, slug, repository_id,
  github_installation_id, github_repository_id, repository_owner, repository_name,
  public_origin, mounts
) VALUES
  ('site-a', 'a', 'project-a', 'A', 'site-a', 'repository-a', 'snapshot-installation', 'snapshot-repository', 'snapshot-owner', 'snapshot-name', 'https://a.example.test', '{"blog":"/"}'),
  ('site-b', 'b', 'project-b', 'B', 'site-b', 'repository-b', NULL, NULL, NULL, NULL, 'https://b.example.test', '{"blog":"/"}'),
  ('site-a2', 'a', NULL, 'A2', 'site-a2', NULL, NULL, NULL, NULL, NULL, 'https://a2.example.test', '{"blog":"/"}');
INSERT INTO site_deployments (
  id, site_id, organization_id, kind, trigger, generation, branch, commit_sha, target, config_hash
) VALUES
  ('deployment-a', 'site-a', 'a', 'production', 'manual', 1, 'main', 'sha-a', '{}', 'hash-a'),
  ('deployment-b', 'site-b', 'b', 'production', 'manual', 1, 'main', 'sha-b', '{}', 'hash-b'),
  ('deployment-a2', 'site-a2', 'a', 'production', 'manual', 1, 'main', 'sha-a2', '{}', 'hash-a2');
INSERT INTO site_jobs (id, site_id, deployment_id, kind) VALUES ('job-a', 'site-a', 'deployment-a', 'build');
INSERT INTO site_jobs (id, site_id, kind) VALUES ('lease-only', 'site-a', 'build'), ('settings-a', 'site-a', 'sync_state'), ('removal-a', 'site-a', 'remove_preview');
INSERT INTO site_domains (id, site_id, organization_id, hostname, kind) VALUES ('domain-a', 'site-a', 'a', 'shared.example.test', 'proxy'), ('domain-b', 'site-b', 'b', 'shared.example.test', 'proxy');
INSERT INTO content_publications VALUES ('publication-a', 'a', 'post-a', 'repository-a');
INSERT INTO site_drafts (id, site_id, path, content) VALUES ('draft-a', 'site-a', 'blog/a.mdx', 'draft');
