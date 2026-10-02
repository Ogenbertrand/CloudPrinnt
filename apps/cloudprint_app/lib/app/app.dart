import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../core/platform/platform_capabilities.dart';

/// Application shell shared by Android, iOS, web, and desktop builds.
/// Authentication and the final experience router will replace this foundation
/// screen once the API contract and product navigation are implemented.
class CloudPrintApp extends StatelessWidget {
  const CloudPrintApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'CloudPrint CM',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0E5BD8)),
        useMaterial3: true,
      ),
      home: const _FoundationHome(),
    );
  }
}

class _FoundationHome extends StatelessWidget {
  const _FoundationHome();

  @override
  Widget build(BuildContext context) {
    final capabilities = PlatformCapabilities.current();
    final platformName = kIsWeb ? 'Web' : defaultTargetPlatform.name;

    return Scaffold(
      appBar: AppBar(title: const Text('CloudPrint CM')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text('Application foundation', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 12),
            const Text(
              'One Flutter application will serve student mobile and web journeys, '
              'shop operations, and internal administration.',
            ),
            const SizedBox(height: 24),
            const _SurfaceCard(
              title: 'Student mobile and web',
              body: 'Track orders, quotes, payment status, ticket codes, and collection updates. '
                  'WhatsApp remains the first upload and configuration channel.',
            ),
            const _SurfaceCard(
              title: 'Shop operations',
              body: 'Review the paid queue, reserve jobs, confirm output, and record collection.',
            ),
            const _SurfaceCard(
              title: 'Printer-connected desktop',
              body: 'Direct printer submission and an offline document cache are available only on a paired desktop host.',
            ),
            const SizedBox(height: 24),
            Text('Current platform: $platformName'),
            Text(capabilities.directPrinting
                ? 'This platform can host the printer bridge after device pairing.'
                : 'This platform can view and manage work, but cannot submit a job directly to a local printer.'),
          ],
        ),
      ),
    );
  }
}

class _SurfaceCard extends StatelessWidget {
  const _SurfaceCard({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(body),
          ],
        ),
      ),
    );
  }
}
