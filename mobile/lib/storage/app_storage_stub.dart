class AppStorage {
  static final Map<String, Object> _values = {};
  static Future<AppStorage> getInstance() async => AppStorage();
  bool? getBool(String key) => _values[key] as bool?;
  String? getString(String key) => _values[key] as String?;
  Future<void> setBool(String key, bool value) async => _values[key] = value;
  Future<void> setString(String key, String value) async => _values[key] = value;
}
