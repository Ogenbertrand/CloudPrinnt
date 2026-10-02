# CloudPrint application

One Flutter/Dart application targets Android, iOS, web, Windows, macOS, and Ubuntu Linux. It will provide three authenticated experiences: student order tracking, shop operations, and internal administration.

WhatsApp remains the first customer upload and configuration channel. The mobile and web application adds tracking, tickets, support, shop administration, and future direct ordering after the WhatsApp pilot. A paired Windows, macOS, or Ubuntu installation is the only client permitted to download a paid job for offline fulfilment or submit it to the operating system print queue.

Current state: generated platform runners, application foundation screen, printer interface, platform capability boundary, and pending-command contract. No authentication, designed feature UI, live backend connection, SQLite implementation, or printing adapter is implemented yet.

See [system design](../../docs/architecture/system-design.md), [client applications](../../docs/architecture/client-apps.md), and [desktop printing protocol](../../docs/architecture/desktop-protocol.md).

## Development

```sh
flutter pub get
flutter analyze
flutter test
flutter run -d chrome
```

The foundation screen proves the project can run as an application on each target. Use `-d android`, `-d ios`, `-d chrome`, `-d windows`, `-d macos`, or `-d linux` on a host with the corresponding platform tooling. Dart SDK baseline is the version supplied by Flutter 3.44.8 when this scaffold was generated.

`lib/features/printing/domain/printer_bridge.dart` deliberately distinguishes accepted, rejected, and unknown submissions. Platform implementations must preserve that distinction and must not report physical completion from a successful OS submission alone.
