# Project structure

```text
cloudprint-cm/
├── apps/
│   ├── api/                       TypeScript API / Socket.IO composition root
│   ├── worker/                    TypeScript processors and outbox dispatcher
│   ├── whatsapp-gateway/          TypeScript Baileys session and message handlers
│   └── cloudprint_app/             Flutter / Dart mobile, web, and desktop application
│       ├── lib/
│       │   ├── app/               App entry and future dependency wiring
│       │   ├── core/
│       │   │   ├── network/       API client and realtime transport
│       │   │   └── persistence/   SQLite, private cache, secure credentials
│       │   └── features/
│       │       ├── student/       Tracking, tickets, and support
│       │       ├── shop/          Queue, reservation, and collection
│       │       ├── admin/         Shops, staff, pricing, and reconciliation
│       │       ├── enrollment/    Pairing, staff identity, and shop association
│       │       ├── printers/      Capabilities, mapping, and test print
│       │       ├── printing/      Desktop attempt journal and platform bridge
│       │       ├── sync/          Offline command replay and reconciliation
│       │       ├── collection/    Ready confirmation and handover
│       │       └── settings/      Device settings and diagnostics
│       ├── android/              Generated Flutter Android runner
│       ├── ios/                  Generated Flutter iOS runner
│       ├── web/                  Generated Flutter web runner
│       ├── windows/              Generated Flutter Windows runner
│       ├── macos/                Generated Flutter macOS runner
│       └── linux/                Generated Flutter Linux runner
├── packages/
│   ├── domain/                   Entities, states, invariants; no IO/framework
│   ├── application/              Use cases, transaction and adapter ports
│   ├── contracts/                Versioned JSON message proposals
│   ├── config/                   Limits and queue names
│   ├── database/                 Migration location and repository boundary
│   └── integrations/             Provider, storage, document, messaging, queues
├── infra/
│   ├── docker/                   Local PostgreSQL + Redis Compose
│   └── deployment/               Future production manifests and runbooks
├── docs/
│   ├── architecture/             Editable draw.io, preview, and system specifications
│   └── engineering/              Local setup and repository guidance
├── scripts/                      Diagram generation and structural validation
└── tests/
    ├── integration/              Planned critical integration scenarios
    └── fixtures/documents/       Future synthetic document fixtures
```

Use the existing workspace as the repository root; no nested repository was created. Directories containing a README describe their intended implementation boundary and are preserved in Git without empty placeholder modules.

Dependency direction: **runtime apps → application/domain + integration wiring**. Domain imports no infrastructure. Integrations implement application ports; application code never imports vendor SDKs. Database adapters provide a single transaction context to application use cases.

The Flutter application is outside npm workspaces. It produces Android, iOS, web, Windows, macOS, and Linux builds from one Dart codebase. Share data through versioned JSON contracts and a future generated Dart client, not by copying TypeScript implementation into Dart. Business pricing and payment rules remain server-side.
