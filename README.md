# CloudPrint CM

WhatsApp document ordering, Mobile Money payment, and staff-controlled printing for partner shops in Cameroon.

**Current stage: architecture and project foundation.** The repository contains the editable architecture, implementation specifications, TypeScript boundaries, and a Flutter application for Android, iOS, web, and desktop. It does not yet connect to WhatsApp, charge customers, process documents, or print.

## Start here

- [Documentation index](docs/README.md) — architecture, client applications, contracts, decisions, and development.
- [Architecture overview PNG](docs/architecture/cloudprint-system-architecture.png) and [editable draw.io architecture](docs/architecture/cloudprint-architecture.drawio) — five pages: system, journey, recovery, data model, deployment.
- [Architecture specification](docs/architecture/system-design.md) — responsibilities, invariants, queues, security, and assumptions.
- [Flutter client application](docs/architecture/client-apps.md) — mobile, web, desktop, and printer-host boundaries.

## Technology direction

| Area | Direction |
| --- | --- |
| Server | TypeScript / Node.js; NestJS selected for the implementation phase |
| Messaging | Baileys behind a replaceable WhatsApp adapter |
| Data | PostgreSQL; private filesystem storage initially |
| Async processing | Redis + BullMQ, fed by a PostgreSQL transactional outbox |
| Client application | Flutter / Dart, Android + iOS + web + Windows + macOS + Ubuntu |
| Local persistence | SQLite, private PDF cache, OS credential storage |
| Printing | Flutter printer interface with platform-specific implementations |
| Realtime | Socket.IO notifications + authoritative REST synchronization |

Flutter code is written in Dart. TypeScript runs on the backend; versioned JSON contracts connect the two. Electron is not part of this architecture.

## Foundation checks

```sh
npm ci
npm run check
npm run build
npm test
python3 scripts/validate-architecture.py
cd apps/cloudprint_app
flutter pub get
flutter analyze
flutter test
```

The backend starts a NestJS/Fastify API foundation with PostgreSQL migrations, liveness/readiness probes, input hardening, rate limits, and OpenAPI documentation. It does not yet connect to WhatsApp, Mobile Money, document processing, or printer devices. The Flutter app has an application foundation screen, without authentication, a production dashboard, or a working printer adapter. Native builds must be tested on their respective operating systems.
