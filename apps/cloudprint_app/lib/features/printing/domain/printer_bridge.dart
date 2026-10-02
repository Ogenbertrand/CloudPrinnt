/// Platform boundary, not a working printer implementation.
abstract interface class PrinterBridge {
  Future<List<PrinterCapabilities>> discoverPrinters();

  /// Call only after persisting the local attempt as SUBMITTING.
  /// A timeout/crash is ambiguous and must not automatically resubmit.
  Future<PrintSubmissionResult> submit(PrintSubmission command);

  /// null means the platform cannot establish the state; it is not failure.
  Future<String?> querySpoolerStatus(String printerId, String spoolerJobId);
}

class PrinterCapabilities {
  const PrinterCapabilities({
    required this.id,
    required this.displayName,
    required this.supportsDirectSubmission,
    required this.supportsColorSelection,
    required this.supportsCopies,
    required this.supportsA4,
    required this.exposesSpoolerJobId,
  });

  final String id;
  final String displayName;
  final bool supportsDirectSubmission;
  final bool supportsColorSelection;
  final bool supportsCopies;
  final bool supportsA4;
  final bool exposesSpoolerJobId;
}

enum PrintColorMode { monochrome, color }

class PrintSubmission {
  const PrintSubmission({
    required this.attemptId,
    required this.reservationId,
    required this.printerId,
    required this.verifiedPdfPath,
    required this.pdfSha256,
    required this.copies,
    required this.colorMode,
  });

  final String attemptId;
  final String reservationId;
  final String printerId;
  final String verifiedPdfPath;
  final String pdfSha256;
  final int copies;
  final PrintColorMode colorMode;
}

/// Acceptance is not evidence of complete physical output.
sealed class PrintSubmissionResult {
  const PrintSubmissionResult();
}

class SubmissionAccepted extends PrintSubmissionResult {
  const SubmissionAccepted({this.spoolerJobId});
  final String? spoolerJobId;
}

class SubmissionRejected extends PrintSubmissionResult {
  const SubmissionRejected(this.reasonCode);
  final String reasonCode;
}

class SubmissionUnknown extends PrintSubmissionResult {
  const SubmissionUnknown(this.reasonCode);
  final String reasonCode;
}
