# Desktop printing and offline protocol

## Enrollment and capability checks

An authorized owner pairs a Windows, macOS, or Ubuntu/Linux desktop device using a one-time expiring code. The backend stores a device credential hash and scopes every credential to a shop. The app stores its credential in OS secure storage. Revocation blocks future sync/downloads; it cannot instantly revoke a print authorization already cached on an offline PC.

List printers using the platform adapter. Save separate mappings for monochrome and colour, even if they point to the same printer. Record supported paper sizes, duplex support, copy handling, colour selection, direct-submission availability, and whether spooler IDs/status queries are available. Reject unsupported paid options rather than silently substituting defaults. Verify these settings with a physical test print during onboarding.

The Flutter `printing` package is a candidate behind `PrinterBridge`, not a commitment that its API meets all requirements. Windows spooler and macOS/Linux printing backends may require a maintained native plugin via Flutter platform channels. Do not send printer commands by interpolating document names into shell strings.

## Reservation and safe offline printing

1. While online, the device requests a reservation with a stable command ID and expected job version.
2. A database transaction checks PAID_QUEUE, shop/device scope, and absence of another reservation. The server returns a reservation ID, device ID, prepared PDF digest, and immutable print settings.
3. The desktop downloads the PDF with authenticated access, verifies the digest and length, and atomically records the reservation and cached-file location in SQLite. Interrupted downloads remain unusable temporary files.
4. Only after all three are durable—reservation, verified PDF, and settings—does Print become available, including during a later outage.
5. Before invoking the OS, commit an attempt ID and SUBMITTING in SQLite. A device-wide coordinator serializes actions, and a unique local key prevents repeated clicks or a second app instance from creating another initial attempt.
6. If the OS accepts submission, persist SUBMITTED and any spooler identifier. Queue the same report command in the local outbox for eventual server synchronization.
7. If the process crashes or times out between submission and recording the result, restart with UNKNOWN. Ask staff to inspect the OS queue and physical output. Never automatically resubmit.
8. Staff confirm output and then collection, each as separate durable commands. Offline commands replay in dependency order; acknowledge or resolve a rejected command before sending its dependent successor.

A reservation is **not a renewable time lease that automatically frees the job**. That would allow an offline PC to print after another PC acquired the job. Keep the reservation until acknowledged release, completion, or supervised recovery. A lost-device recovery procedure must establish that the original machine cannot continue printing, inspect the spooler/output, and record an operator decision before reassignment or refund. Exactly-once physical output cannot be guaranteed across arbitrary OS/printer crashes.

## Reconnection

Authenticate, fetch a fresh authoritative queue, and reconcile local jobs by version and reservation ID. Preserve unsent local journal entries until the server acknowledges them. Replay local commands using their original command IDs and causal order. A duplicate returns its recorded result. A stale version returns a conflict for explicit reconciliation; do not overwrite server state with local cached state.

The API rejects a report from a device that does not own the reservation. The app shows a review state if its cached reservation differs from the server's record. Notifications are hints to synchronize; they never directly trigger physical printing.

## Known failure behavior

| Event | Required behavior |
| --- | --- |
| Shop offline when payment succeeds | Job remains durably PAID_QUEUE; customer is told it is queued, not printed |
| Internet drops during download | Resume/retry download; disable Print until digest verification completes |
| App restarts after a clean SUBMITTED record | Display submitted; no automatic resubmission |
| App restarts during SUBMITTING | Mark UNKNOWN; inspect spooler/output before resolving |
| Paper jam or partial output | Staff records issue; explicit new reprint attempt with reason and selected scope |
| Printer settings unsupported | Block submission and surface capability mismatch |
| Multiple PCs at one shop | One device reservation for each job; all staff can observe authorized queue state |
| Device is lost while offline | Freeze reassignment/refund until supervised recovery decision |
| Cleanup command received offline | Execute when reconnected; do not claim immediate remote deletion |

Initial scope keeps printing in the paired desktop printer-host process while it is running. A headless background service is a separate product decision; Flutter desktop alone does not create one. Browser, Android, and iOS clients may observe status and issue authorized workflow commands, but they do not run the printer bridge.
