import 'package:flutter_test/flutter_test.dart';
import 'package:weathergpt_mobile/main.dart';

void main() {
  testWidgets('WeatherGPT homepage renders', (WidgetTester tester) async {
    await tester.pumpWidget(const WeatherGPTApp());
    expect(find.text('WeatherGPT'), findsOneWidget);
    expect(find.text('Your 7-day forecast'), findsOneWidget);
    expect(find.text('Ask WeatherGPT'), findsOneWidget);
  });
}
