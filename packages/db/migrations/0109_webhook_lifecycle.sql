CREATE FUNCTION notra_enqueue_webhook_event(
  event_organization_id text,
  event_source_key text,
  event_type_name text,
  event_data jsonb
) RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  new_event_id text := 'whev_' || gen_random_uuid()::text;
  event_created_at timestamptz := clock_timestamp();
  event_payload text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = event_organization_id) THEN
    RETURN;
  END IF;

  event_payload := jsonb_build_object(
    'id', new_event_id,
    'type', event_type_name,
    'apiVersion', '2026-10-06',
    'createdAt', to_char(event_created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'organizationId', event_organization_id,
    'data', event_data
  )::text;

  IF octet_length(event_payload) > 65536 THEN
    RAISE EXCEPTION 'Webhook payload exceeds 64 KiB';
  END IF;

  WITH inserted AS (
    INSERT INTO webhook_events (id, organization_id, source_key, event_type, payload, created_at)
    VALUES (new_event_id, event_organization_id, event_source_key, event_type_name, event_payload, event_created_at)
    ON CONFLICT (organization_id, source_key) DO NOTHING
    RETURNING *
  )
  INSERT INTO webhook_deliveries (id, organization_id, event_id, endpoint_id, url, secret)
  SELECT inserted.id || '_' || endpoint.id, inserted.organization_id, inserted.id, endpoint.id, endpoint.url, endpoint.secret
  FROM inserted JOIN webhook_endpoints endpoint ON endpoint.organization_id = inserted.organization_id
  WHERE endpoint.enabled AND endpoint.deleted_at IS NULL AND inserted.event_type = ANY(endpoint.events)
  ON CONFLICT (event_id, endpoint_id) DO NOTHING;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION notra_post_webhook_events() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  post_data jsonb;
  published_source_key text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM notra_enqueue_webhook_event(
      OLD.organization_id, 'post:' || OLD.id || ':deleted', 'post.deleted', jsonb_build_object('postId', OLD.id)
    );
    RETURN OLD;
  END IF;

  post_data := jsonb_build_object('postId', NEW.id);

  IF TG_OP = 'INSERT' THEN
    PERFORM notra_enqueue_webhook_event(
      NEW.organization_id, 'post:' || NEW.id || ':created', 'post.created', post_data
    );
  ELSE
    IF (to_jsonb(NEW) - 'updated_at' - 'created_at') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'updated_at' - 'created_at') THEN
      RETURN NEW;
    END IF;
    PERFORM notra_enqueue_webhook_event(
      NEW.organization_id, 'post:' || NEW.id || ':updated:' || gen_random_uuid()::text, 'post.updated', post_data
    );
  END IF;

  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    published_source_key := 'post:' || NEW.id || ':published';
    IF EXISTS (
      SELECT 1 FROM webhook_events
      WHERE organization_id = NEW.organization_id AND source_key = published_source_key
    ) THEN
      published_source_key := published_source_key || ':' || gen_random_uuid()::text;
    END IF;
    PERFORM notra_enqueue_webhook_event(
      NEW.organization_id, published_source_key, 'post.published', post_data
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'published' AND NEW.status = 'draft' THEN
    PERFORM notra_enqueue_webhook_event(
      NEW.organization_id, 'post:' || NEW.id || ':unpublished:' || gen_random_uuid()::text, 'post.unpublished', post_data
    );
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER posts_webhook_lifecycle
AFTER INSERT OR UPDATE OR DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION notra_post_webhook_events();
--> statement-breakpoint
CREATE FUNCTION notra_geo_scan_webhook_events() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  scan_data jsonb;
BEGIN
  IF NEW.status NOT IN ('completed', 'failed') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IN ('completed', 'failed') THEN
    RETURN NEW;
  END IF;

  scan_data := jsonb_build_object('scanId', NEW.id, 'projectId', NEW.project_id);
  IF NEW.status = 'completed' THEN
    scan_data := scan_data || jsonb_build_object(
      'runId', NEW.run_id,
      'checksTotal', NEW.checks_total,
      'checksFailed', NEW.checks_failed,
      'mentions', NEW.mentions,
      'durationMs', NEW.duration_ms
    );
  ELSE
    scan_data := scan_data || jsonb_build_object(
      'errorCode', left(NEW.error_code, 256),
      'error', left(NEW.error_message, 4096),
      'failedStage', NEW.failed_stage,
      'retryable', NEW.retryable
    );
  END IF;

  PERFORM notra_enqueue_webhook_event(
    NEW.organization_id, 'geo-scan:' || NEW.id || ':terminal', 'geo.scan.' || NEW.status, scan_data
  );
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER geo_scans_webhook_terminal
AFTER INSERT OR UPDATE ON geo_scans
FOR EACH ROW EXECUTE FUNCTION notra_geo_scan_webhook_events();
