# Infrastructure

`docker/compose.dev.yml` defines local PostgreSQL and Redis only. Ports bind to loopback and credentials are development-only. This is not a production deployment, and no services are started automatically.

Future deployment work belongs in `deployment/`: TLS proxy, app images, converter isolation, secrets, persistence, backups, health checks, metrics, and restore procedure. Pin production images by verified digest. Never expose Redis/PostgreSQL directly or mount the Docker socket into the API.
