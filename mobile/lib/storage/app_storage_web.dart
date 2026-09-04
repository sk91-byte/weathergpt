// ignore_for_file: deprecated_member_use
import 'dart:html' as html;

class AppStorage {
  static Future<AppStorage> getInstance() async => AppStorage();
  bool? getBool(String key) => html.window.localStorage[key] == 'true' ? true : html.window.localStorage[key] == 'false' ? false : null;
  String? getString(String key) => html.window.localStorage[key];
  Future<void> setBool(String key, bool value) async => html.window.localStorage[key] = value.toString();
  Future<void> setString(String key, String value) async => html.window.localStorage[key] = value;
}
