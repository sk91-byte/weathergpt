class BrowserVoiceCapture {
  bool get supported => false;

  Future<void> start({required String language}) async {
    throw UnsupportedError('Browser speech recognition is unavailable');
  }

  Future<String?> stop() async => null;

  Future<void> speak(String text, {required String language}) async {}
}
