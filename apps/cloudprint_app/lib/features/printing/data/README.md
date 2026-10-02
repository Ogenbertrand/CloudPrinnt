# Printer platform adapters

Implement `PrinterBridge` after the hardware spike. Evaluate the Flutter `printing` package, then add native adapters if needed for Windows spooler or macOS/Linux printing APIs. Capabilities must be discovered and checked rather than assumed. Keep adapter details out of widgets.

No adapter is implemented yet. The Windows/macOS/Linux directories at the app root are generated Flutter runners, not completed print integrations.
