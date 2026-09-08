import 'package:flutter_test/flutter_test.dart';
import 'package:swarsanket/main.dart';
import 'package:swarsanket/screens/splash_screen.dart';

void main() {
  testWidgets('SwarSanketApp launches smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const SwarSanketApp());
    expect(find.textContaining('SwarSanket'), findsWidgets);

    // Tap splash screen to advance to Home screen
    await tester.tap(find.byType(SplashScreen));
    await tester.pumpAndSettle();

    expect(find.textContaining('Voice Check'), findsWidgets);
  });
}
