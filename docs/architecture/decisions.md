# Decisions and delivery roadmap

## Architecture decisions

| Decision | Rationale / consequence |
| --- | --- |
| One repository, modular backend | Shared business rules with three independently supervised runtimes |
| TypeScript + Flutter/Dart | Backend logic in TS; one Flutter application for Android, iOS, web, Windows, macOS, and Ubuntu/Linux; explicit JSON boundary |
| Combined dashboard and print agent | One application to install; no local unauthenticated HTTP service |
| Staff-triggered printing | Staff retain control over paper, availability, and physical handover |
| PostgreSQL owns business state | Paid jobs survive missed sockets or lost Redis execution state |
| Transactional outbox | Payment commit and dispatch intent cannot split across a crash |
| Prepare PDF before quoting | Price and print the same artifact; handle DOCX rendering explicitly |
| Private volume behind a storage port | Minimal initial infrastructure; later object storage remains possible |
| Durable device reservations | Offline printing cannot coexist with automatic reassignment |
| SQLite instead of localStorage | Native client needs a durable attempt journal and pending-command queue |
| No claim of exactly-once physical printing | Ambiguous OS submissions require reconciliation and explicit reprints |
| Provider adapter, no aggregator chosen yet | Fees, callback proof, refunds, and availability need sandbox verification |

## Implementation sequence

1. **Integration spikes:** verify one PDF on Windows, macOS, and Ubuntu; test copies, colour, page sizing, spooler IDs, and crash recovery. Exercise Baileys upload/menu/session recovery and a selected payment sandbox. Record the supported printer/OS matrix.
2. **Backend foundation:** NestJS API, PostgreSQL migrations, scoped authentication, commands, inbox/outbox, file storage, runtime contract validation, structured logging.
3. **Document and conversation flow:** upload limits, format validation, isolated conversion, page counting, quote snapshots, multiple-job conversation rules.
4. **Payments:** one active attempt, authenticated callbacks, amount matching, reconciliation, late success, refund review.
5. **Flutter experiences:** student mobile/web tracking, shop web/desktop operations, admin web, then printer-host enrollment, SQLite, authenticated downloads, reservations, native bridge, durable print journal, and staff confirmation.
6. **Pilot readiness:** outage/restart drills, backup restore, retention, signed installers, updates, operating procedures, observability, and one-shop pilot.

## Acceptance scenarios for implementation

- A repeated WhatsApp delivery creates one ingestion record.
- A forged or mismatched payment callback never releases a document.
- Duplicate success callbacks produce one paid transition and ticket.
- A timed-out charge is reconciled before any new charge attempt.
- A crash after payment commit but before enqueue does not lose dispatch.
- A disconnected shop retrieves every active paid job on reconnect.
- Two devices racing to reserve one job produce one owner.
- A crash after OS submission does not automatically produce another copy.
- Cross-shop REST access, room joins, downloads, and report commands fail.
- DOCX pagination and printed output use the same prepared PDF.
- A failed page count, malformed document, decompression limit, or timeout produces no payable quote.
- The original paid document survives retention cleanup while its job is unresolved.

## Decisions still requiring product or integration evidence

Per-shop rates and colour pricing; maximum pages and copies; fee settlement and who pays aggregator charges; account ownership and shop onboarding; opening hours versus online presence; quote expiry; retention and disputes; refund eligibility after partial printing; language support; device credential expiry during outages; installer signing accounts; supported OS and printer versions. These do not block architecture/scaffolding, but must be resolved before taking real payments.
