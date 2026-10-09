CREATE TABLE organizations (id text PRIMARY KEY);
CREATE TABLE users (id text PRIMARY KEY);
CREATE TABLE projects (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE TABLE github_app_installations (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE TABLE github_integrations (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  github_app_installation_id text REFERENCES github_app_installations(id) ON DELETE CASCADE
);
CREATE TABLE posts (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);
CREATE TABLE content_publications (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  repository_id text NOT NULL REFERENCES github_integrations(id) ON DELETE CASCADE
);
