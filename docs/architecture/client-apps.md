# Flutter client applications

CloudPrint uses one Flutter application, `apps/cloudprint_app`, to serve Android, iOS, web, Windows, macOS, and Ubuntu Linux. Authentication selects an experience and permissions; platform capability then determines what the client can safely do.

| Experience | Targets | Core responsibilities | Important limit |
| --- | --- | --- | --- |
| Student | Android, iOS, web | Track job progress, view quotes/receipts, receive ticket code, view collection readiness, get support | WhatsApp remains the first upload/configuration flow for the pilot |
| Shop operations | Web and desktop | Review queue, help customers, reserve jobs, confirm print output and collection | Web cannot silently submit to a local printer |
| Printer host | Windows, macOS, Ubuntu | Verified PDF cache, offline attempt journal, printer discovery, staff-triggered submission | Device must be paired to one shop; submission acceptance is not physical completion |
| Administration | Web and desktop | Shop setup, members, device pairing/revocation, pricing, reconciliation and refund review | Requires role-based authorization and audit trail |

## Routing and feature ownership

The first production route is an authenticated role selector followed by an experience-specific shell. Do not split the same job logic across screens: use one API client and versioned contracts. Server-side permissions remain authoritative.

```text
lib/
├── app/                    Bootstrap, theme, router, dependency wiring
├── core/
│   ├── auth/               Session and role claims
│   ├── network/            REST client, Socket.IO hint transport, schemas
│   ├── persistence/        SQLite/device cache and secure credential storage
│   └── platform/           Printer-host capability boundary
└── features/
    ├── student/            Tracking, tickets, receipts, support
    ├── shop/               Queue, reservation, collection, print review
    ├── printers/           Discovery, mappings, capability checks, test print
    ├── printing/           Desktop attempt journal and PrinterBridge
    ├── admin/              Shops, staff, devices, pricing, reconciliation
    └── sync/               Snapshot reconciliation and pending commands
```

The existing `enrollment`, `jobs`, `collection`, and `settings` directories are early boundaries that will be folded into these experiences as feature work begins.

## Platform rules

- Android, iOS, and web never cache a paid print document for offline fulfilment and never send a silent printer command.
- A web shop dashboard can inspect or manage a queue, but printing happens through a paired desktop printer host. It may display print status received from that host.
- Desktop printer hosts keep SQLite attempt records, an application-private verified PDF cache, and pending synchronization commands. Credentials are stored through the operating system secure-store API.
- Customer and administrator mobile/web sessions use normal authenticated API access. They do not receive file URLs for a shop job merely because they know a ticket code.
- Flutter web is a compiled application build of this same repository; it is not a separate TypeScript frontend.

## Delivery order

1. Build shared authentication, API client, error handling, routing, and responsive design foundations.
2. Deliver student mobile/web tracking and ticket views while WhatsApp remains the ordering channel.
3. Deliver shop web/desktop queue and collection views.
4. Add paired desktop reservation, private download cache, printer capabilities, and staff-triggered printer submission after the hardware spike.
5. Add admin web views and direct in-app order creation only after the WhatsApp pilot establishes operational rules.

No current Flutter screen calls the backend. The foundation screen identifies the platform and demonstrates whether it can act as a printer host.
