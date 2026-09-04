import 'dart:async';
import 'dart:js_interop';
import 'dart:js_interop_unsafe';

@JS('window')
external JSObject get _window;

/// Uses Chrome's built-in speech recognition for the web preview.
/// The recognized text is sent to WeatherGPT; raw microphone audio is not stored.
class BrowserVoiceCapture {
  JSObject? _recognition;
  Completer<String?>? _result;
  final _parts = <String>[];

  bool get supported =>
      _window.hasProperty('SpeechRecognition'.toJS).toDart ||
      _window.hasProperty('webkitSpeechRecognition'.toJS).toDart;

  Future<void> start({required String language}) async {
    if (!supported) {
      throw UnsupportedError(
          'This browser does not support speech recognition.');
    }

    final constructor =
        _window['SpeechRecognition'] ?? _window['webkitSpeechRecognition'];
    final recognition =
        (constructor as JSFunction).callAsConstructor<JSObject>();
    _recognition = recognition;
    _result = Completer<String?>();
    _parts.clear();

    recognition['lang'] = (language == 'hi' ? 'hi-IN' : 'en-IN').toJS;
    recognition['continuous'] = false.toJS;
    recognition['interimResults'] = false.toJS;
    recognition['maxAlternatives'] = 1.toJS;
    recognition['onresult'] = ((JSAny? event) {
      final eventObject = event as JSObject;
      final results = eventObject['results'] as JSObject;
      final resultIndex = _asInt(eventObject['resultIndex']);
      final length = _asInt(results['length']);
      for (var index = resultIndex; index < length; index++) {
        final result =
            results.getProperty(index.toString().toJS) as JSObject;
        final alternative = result['0'] as JSObject;
        final transcript = _asString(alternative['transcript'])?.trim();
        if (transcript != null && transcript.isNotEmpty) {
          _parts.add(transcript);
        }
      }
    }).toJS;
    recognition['onerror'] = ((JSAny? event) {
      final result = _result;
      if (result == null || result.isCompleted) return;
      final error = _asString((event as JSObject)['error']);
      result.completeError(Exception(error == null || error.isEmpty
          ? 'Speech recognition failed.'
          : 'Speech recognition failed: $error'));
    }).toJS;
    recognition['onend'] = ((JSAny? _) {
      final result = _result;
      if (result == null || result.isCompleted) return;
      final text = _parts.join(' ').trim();
      result.complete(text.isEmpty ? null : text);
    }).toJS;

    recognition.callMethod<JSAny?>('start'.toJS);
  }

  Future<String?> stop() async {
    final result = _result;
    final recognition = _recognition;
    if (result == null || recognition == null) return null;
    // Chrome may finish automatically after a pause. In that case the final
    // transcript is already complete and calling stop() again throws.
    if (!result.isCompleted) {
      recognition.callMethod<JSAny?>('stop'.toJS);
    }
    return result.future.timeout(const Duration(seconds: 12), onTimeout: () {
      if (!result.isCompleted) result.complete(null);
      return null;
    });
  }

  Future<void> speak(String text, {required String language}) async {
    final synthesis = _window['speechSynthesis'];
    final constructor = _window['SpeechSynthesisUtterance'];
    if (synthesis is! JSObject || constructor is! JSFunction) return;

    final utterance = constructor.callAsConstructor<JSObject>();
    utterance['text'] = text.toJS;
    utterance['lang'] = (language == 'hi' ? 'hi-IN' : 'en-IN').toJS;
    final finished = Completer<void>();
    void complete() {
      if (!finished.isCompleted) finished.complete();
    }

    utterance['onend'] = ((JSAny? _) => complete()).toJS;
    utterance['onerror'] = ((JSAny? _) => complete()).toJS;
    synthesis.callMethod<JSAny?>('speak'.toJS, utterance);
    await finished.future.timeout(const Duration(seconds: 30), onTimeout: () {});
  }
}

int _asInt(JSAny? value) => value is JSNumber ? value.toDartInt : 0;

String? _asString(JSAny? value) => value is JSString ? value.toDart : null;
