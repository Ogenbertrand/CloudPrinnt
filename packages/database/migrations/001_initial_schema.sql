CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE document_status AS ENUM ('RECEIVED', 'PROCESSING', 'READY', 'REJECTED');
CREATE TYPE job_status AS ENUM (
  'PENDING_CONFIG', 'PENDING_PAYMENT', 'PROCESSING_PAYMENT', 'PAID_QUEUE', 'RESERVED', 'SUBMITTED',
  'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'FULFILMENT_REVIEW'
);
CREATE TYPE payment_status AS ENUM ('CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'UNKNOWN');
CREATE TYPE print_attempt_status AS ENUM ('PREPARED', 'SUBMITTING', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'UNKNOWN');

CREATE TABLE print_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name text NOT NULL,
  physical_location text NOT NULL,
  websocket_room_id text NOT NULL UNIQUE,
  is_online boolean NOT NULL DEFAULT false,
  registered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shop_memberships (
  shop_id uuid NOT NULL REFERENCES print_shops(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'OPERATOR', 'VIEWER')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_id, staff_user_id)
);

CREATE TABLE shop_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES print_shops(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  credential_hash text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('WINDOWS', 'MACOS', 'LINUX')),
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_storage_key text NOT NULL UNIQUE,
  prepared_storage_key text UNIQUE,
  original_filename text NOT NULL,
  source_format text NOT NULL CHECK (source_format IN ('PDF', 'DOCX')),
  source_size_bytes integer NOT NULL CHECK (source_size_bytes > 0 AND source_size_bytes <= 15000000),
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  prepared_sha256 text CHECK (prepared_sha256 IS NULL OR prepared_sha256 ~ '^[a-f0-9]{64}$'),
  prepared_size_bytes integer CHECK (prepared_size_bytes IS NULL OR prepared_size_bytes > 0),
  page_count integer CHECK (page_count IS NULL OR page_count > 0),
  status document_status NOT NULL DEFAULT 'RECEIVED',
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code text UNIQUE,
  user_phone_number text NOT NULL,
  shop_id uuid NOT NULL REFERENCES print_shops(id),
  document_id uuid NOT NULL REFERENCES documents(id),
  color_mode text CHECK (color_mode IS NULL OR color_mode IN ('MONOCHROME', 'COLOR')),
  copy_count integer CHECK (copy_count IS NULL OR copy_count BETWEEN 1 AND 100),
  total_amount_xaf integer CHECK (total_amount_xaf IS NULL OR total_amount_xaf >= 0),
  quote_snapshot jsonb,
  status job_status NOT NULL DEFAULT 'PENDING_CONFIG',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  reserved_device_id uuid REFERENCES shop_devices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX print_jobs_shop_status_created_idx ON print_jobs (shop_id, status, created_at);

CREATE TABLE payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES print_jobs(id),
  provider text NOT NULL,
  merchant_reference text NOT NULL UNIQUE,
  gateway_reference text UNIQUE,
  payer_phone_number text NOT NULL,
  amount_xaf integer NOT NULL CHECK (amount_xaf >= 0),
  currency char(3) NOT NULL DEFAULT 'XAF' CHECK (currency = 'XAF'),
  status payment_status NOT NULL DEFAULT 'CREATED',
  idempotency_key text NOT NULL,
  callback_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, idempotency_key)
);
CREATE UNIQUE INDEX one_open_payment_per_job_idx ON payment_attempts (job_id)
  WHERE status IN ('CREATED', 'PENDING', 'UNKNOWN');

CREATE TABLE device_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE REFERENCES print_jobs(id),
  shop_id uuid NOT NULL REFERENCES print_shops(id),
  device_id uuid NOT NULL REFERENCES shop_devices(id),
  job_version integer NOT NULL CHECK (job_version > 0),
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE print_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES print_jobs(id),
  reservation_id uuid NOT NULL REFERENCES device_reservations(id),
  device_id uuid NOT NULL REFERENCES shop_devices(id),
  printer_id text NOT NULL,
  spooler_job_id text,
  status print_attempt_status NOT NULL DEFAULT 'PREPARED',
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_event_id text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_event_id)
);

CREATE TABLE outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id uuid NOT NULL,
  aggregate_version integer NOT NULL CHECK (aggregate_version > 0),
  shop_id uuid REFERENCES print_shops(id),
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  UNIQUE (aggregate_id, aggregate_version, event_type)
);
CREATE INDEX outbox_events_unpublished_idx ON outbox_events (occurred_at) WHERE published_at IS NULL;

CREATE TABLE command_results (
  actor_scope text NOT NULL,
  operation text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  response_status integer NOT NULL,
  response_body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_scope, operation, idempotency_key)
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_scope text NOT NULL,
  action text NOT NULL,
  aggregate_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
