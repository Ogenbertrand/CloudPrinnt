import 'package:flutter/foundation.dart';

/// Browser builds cannot silently submit to local OS printers or safely retain
/// paid documents for offline fulfilment. Those actions require a paired host.
class PlatformCapabilities {
  const PlatformCapabilities._({
    required this.directPrinting,
    required this.offlineDocumentCache,
  });

  final bool directPrinting;
  final bool offlineDocumentCache;

  factory PlatformCapabilities.current() {
    if (kIsWeb) {
      return const PlatformCapabilities._(
        directPrinting: false,
        offlineDocumentCache: false,
      );
    }

    final isDesktop = switch (defaultTargetPlatform) {
      TargetPlatform.windows || TargetPlatform.macOS || TargetPlatform.linux => true,
      _ => false,
    };
    return PlatformCapabilities._(
      directPrinting: isDesktop,
      offlineDocumentCache: isDesktop,
    );
  }
}
