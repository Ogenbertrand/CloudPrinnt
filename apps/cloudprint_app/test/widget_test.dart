import 'package:flutter_test/flutter_test.dart';

import 'package:cloudprint_app/app/app.dart';

void main() {
  testWidgets('renders the application foundation', (WidgetTester tester) async {
    await tester.pumpWidget(const CloudPrintApp());

    expect(find.text('CloudPrint CM'), findsOneWidget);
    expect(find.text('Student mobile and web'), findsOneWidget);
    expect(find.text('Printer-connected desktop'), findsOneWidget);
  });
}
