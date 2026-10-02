/// Persisted in SQLite before a mutating command is sent to the server.
class PendingCommand {
  const PendingCommand({
    required this.commandId,
    required this.jobId,
    required this.expectedVersion,
    required this.kind,
    required this.payload,
    required this.createdAt,
    this.dependsOnCommandId,
  });

  final String commandId;
  final String jobId;
  final int expectedVersion;
  final String kind;
  final Map<String, Object?> payload;
  final DateTime createdAt;
  final String? dependsOnCommandId;
}

abstract interface class PendingCommandStore {
  Future<void> enqueue(PendingCommand command);
  Future<List<PendingCommand>> readReadyCommands();
  Future<void> acknowledge(String commandId);
}
