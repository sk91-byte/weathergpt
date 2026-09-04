import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:cross_file/cross_file.dart';
import 'package:geolocator/geolocator.dart';
import 'package:record/record.dart';
import 'services/api_service.dart';
import 'language_registry.dart';
import 'ui_text.dart';
import 'widgets/language_selector.dart';
import 'storage/app_storage.dart';
import 'services/voice_capture.dart';

const navy = Color(0xff102a59);
const blue = Color(0xff2470dc);
const background = Color(0xfff4f7fc);

void main() => runApp(const WeatherGPTApp());

class WeatherGPTApp extends StatelessWidget {
  const WeatherGPTApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'WeatherGPT',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
            colorSchemeSeed: blue,
            scaffoldBackgroundColor: background,
            useMaterial3: true),
        home: const WeatherGPTRoot(),
      );
}

class WeatherGPTRoot extends StatefulWidget {
  const WeatherGPTRoot({super.key});
  @override
  State<WeatherGPTRoot> createState() => _WeatherGPTRootState();
}

class _WeatherGPTRootState extends State<WeatherGPTRoot> {
  String? language;
  bool loading = true;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await AppStorage.getInstance();
    if (!mounted) return;
    setState(() {
      language = prefs.getBool('onboarding_completed') == true
          ? (prefs.getString('response_language') ?? 'en')
          : null;
      loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (loading)
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (language == null)
      return OnboardingFlow(
          onComplete: (code) => setState(() => language = code));
    return WeatherHomePage(initialLanguage: language!);
  }
}

class OnboardingFlow extends StatefulWidget {
  const OnboardingFlow({super.key, required this.onComplete});
  final ValueChanged<String> onComplete;
  @override
  State<OnboardingFlow> createState() => _OnboardingFlowState();
}

class _OnboardingFlowState extends State<OnboardingFlow> {
  int step = 0;
  String selected = 'en';
  Position? position;
  bool busy = false;
  Future<void> allowLocation() async {
    setState(() => busy = true);
    try {
      if (await Geolocator.isLocationServiceEnabled()) {
        var p = await Geolocator.checkPermission();
        if (p == LocationPermission.denied)
          p = await Geolocator.requestPermission();
        if (p == LocationPermission.always ||
            p == LocationPermission.whileInUse)
          position = await Geolocator.getCurrentPosition();
      }
    } catch (_) {}
    if (mounted)
      setState(() {
        busy = false;
        step = 1;
      });
  }

  Future<void> finish() async {
    final prefs = await AppStorage.getInstance();
    await prefs.setBool('onboarding_completed', true);
    await prefs.setString('response_language', selected);
    try {
      await ApiService().saveLanguage(selected);
    } catch (_) {}
    if (mounted) widget.onComplete(selected);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      body: SafeArea(
          child: Padding(
              padding: const EdgeInsets.all(24),
              child: step == 0 ? _locationPage() : _languagePage())));
  Widget _locationPage() =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Spacer(),
        const Icon(Icons.cloud_rounded, color: blue, size: 70),
        const SizedBox(height: 20),
        const Text('WeatherGPT',
            style: TextStyle(
                color: navy, fontSize: 32, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        const Text('Get weather for your location',
            style: TextStyle(
                color: navy, fontSize: 22, fontWeight: FontWeight.w700)),
        const SizedBox(height: 10),
        const Text(
            'WeatherGPT uses your location to provide local weather, forecasts and location-based alerts.',
            style:
                TextStyle(color: Color(0xff64748b), fontSize: 16, height: 1.4)),
        const Spacer(),
        SizedBox(
            width: double.infinity,
            child: FilledButton(
                onPressed: busy ? null : allowLocation,
                child: Text(busy ? 'Requesting location…' : 'Allow Location'))),
        SizedBox(
            width: double.infinity,
            child: TextButton(
                onPressed: busy ? null : () => setState(() => step = 1),
                child: const Text('Not Now')))
      ]);
  Widget _languagePage() =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Choose your response language',
            style: TextStyle(
                color: navy, fontSize: 24, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        const Text('WeatherGPT will use this language for its answers.',
            style: TextStyle(color: Color(0xff64748b))),
        const SizedBox(height: 18),
        Expanded(
            child: LanguageSelector(
                selectedCode: selected,
                onSelected: (item) => setState(() => selected = item.code))),
        const SizedBox(height: 12),
        SizedBox(
            width: double.infinity,
            child:
                FilledButton(onPressed: finish, child: const Text('Continue')))
      ]);
}

class ChatLine {
  ChatLine(this.text,
      {required this.fromUser, this.fallback = false, this.decision});
  final String text;
  final bool fromUser;
  final bool fallback;
  final Map<String, dynamic>? decision;
}

class WeatherHomePage extends StatefulWidget {
  const WeatherHomePage({super.key, this.initialLanguage = 'en'});
  final String initialLanguage;
  @override
  State<WeatherHomePage> createState() => _WeatherHomePageState();
}

class _WeatherHomePageState extends State<WeatherHomePage> {
  final _api = ApiService();
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _messages = <ChatLine>[];
  Map<String, dynamic>? _current, _forecast;
  Map<String, dynamic>? _routeResult;
  Position? _position;
  String _place = 'Delhi, India';
  bool _loading = true, _loadingLocation = false, _sending = false;
  String? _error, _conversationId;
  String _profile = 'general_public';
  late String _language;
  final _recorder = AudioRecorder();
  final _player = AudioPlayer();
  final _browserVoice = BrowserVoiceCapture();
  String _voiceState = 'idle';

  @override
  void initState() {
    super.initState();
    _language = widget.initialLanguage;
    _messages
        .add(ChatLine(uiText(_language, 'chat_greeting'), fromUser: false));
    _loadWeather(28.6139, 77.2090, 'Delhi, India');
  }

  Future<void> _loadWeather(
      double latitude, double longitude, String place) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _api.currentWeather(latitude, longitude),
        _api.forecast(latitude, longitude)
      ]);
      if (!mounted) return;
      setState(() {
        _current = results[0];
        _forecast = results[1];
        _place = place;
        _loading = false;
      });
    } catch (_) {
      if (mounted)
        setState(() {
          _loading = false;
          _error =
              'Live weather is temporarily unavailable. Check that the backend is running.';
        });
    }
  }

  Future<void> _useLocation() async {
    setState(() => _loadingLocation = true);
    try {
      if (!await Geolocator.isLocationServiceEnabled())
        throw Exception('Please enable location services.');
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied)
        permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever)
        throw Exception('Location permission was not granted.');
      final position = await Geolocator.getCurrentPosition();
      _position = position;
      await _loadWeather(
          position.latitude, position.longitude, 'Your current location');
    } catch (error) {
      if (mounted)
        _showMessage(error.toString().replaceFirst('Exception: ', ''));
    }
    if (mounted) setState(() => _loadingLocation = false);
  }

  Future<Map<String, dynamic>?> _send(
      [String? suggestion, String? displayText]) async {
    final text = (suggestion ?? _input.text).trim();
    final visibleText = (displayText ?? text).trim();
    if (text.isEmpty || _sending) return null;
    final wantsCurrentLocation =
        RegExp(r'\b(near me|around me|my location|current location|where i am|weather of mine|my weather)\b',
                    caseSensitive: false)
                .hasMatch(text) ||
            text.contains('मेरे पास') ||
            text.contains('मेरी लोकेशन') ||
            text.contains('मेरे स्थान') ||
            text.contains('मेरे इलाके');
    if (wantsCurrentLocation && _position == null) {
      await _useLocation();
      if (_position == null) return null;
    }
    _input.clear();
    setState(() {
      _messages.add(ChatLine(visibleText, fromUser: true));
      _sending = true;
    });
    Map<String, dynamic>? chatResult;
    try {
      final result = await _api.chat(text,
          latitude: _position?.latitude,
          longitude: _position?.longitude,
          conversationId: _conversationId,
          profile: _profile,
          language: _language);
      _conversationId ??= result['conversation_id']?.toString();
      final fallback = result['fallback_used'] == true;
      _showMessage(
          '${result['response'] ?? 'No response received.'}${fallback ? '\n\n${_t('fallback_notice')}' : ''}',
          fallback: fallback,
          decision: result['decision'] as Map<String, dynamic>?);
      chatResult = result;
      final route = result['route'];
      if (route is Map<String, dynamic> && route['origin'] != null && route['destination'] != null) {
        if (mounted) setState(() => _routeResult = result);
      }
    } catch (_) {
      _showMessage(_language == 'hi'
          ? 'WeatherGPT अभी उपलब्ध नहीं है। कृपया फिर से कोशिश करें।'
          : 'WeatherGPT is temporarily unavailable. Please try again.');
    }
    if (mounted) setState(() => _sending = false);
    return chatResult;
  }

  Future<void> _toggleVoice() async {
    // Flutter web can use the browser's speech engine directly. This gives the
    // user visible text immediately and avoids sending a browser blob URL as
    // if it were a local file to the backend.
    if (_browserVoice.supported) {
      if (_voiceState == 'recording') {
        setState(() => _voiceState = 'processing');
        try {
          final transcript = await _browserVoice.stop();
          if (transcript == null || transcript.trim().isEmpty) {
            throw Exception(_language == 'hi'
                ? 'आवाज़ समझ में नहीं आई। फिर से बोलें।'
                : 'I could not hear any words. Please try again.');
          }
          final result = await _send(transcript, transcript);
          final response = result?['response']?.toString() ?? '';
          if (response.isNotEmpty) {
            if (mounted) setState(() => _voiceState = 'playing');
            await _browserVoice.speak(response, language: _language);
          }
        } catch (error) {
          _showMessage(error.toString().replaceFirst('Exception: ', ''));
        } finally {
          if (mounted) setState(() => _voiceState = 'idle');
        }
        return;
      }
      if (_voiceState != 'idle') return;
      try {
        await _browserVoice.start(language: _language);
        if (mounted) setState(() => _voiceState = 'recording');
      } catch (error) {
        _showMessage(error.toString().replaceFirst('Exception: ', ''));
      }
      return;
    }

    if (_voiceState == 'recording') {
      setState(() => _voiceState = 'processing');
      try {
        final path = await _recorder.stop();
        if (path == null || path.isEmpty)
          throw Exception('No recording was captured.');
        final bytes = await XFile(path).readAsBytes();
        if (bytes.isEmpty) throw Exception('No speech was detected.');
        final result = await _api.voiceChat(bytes,
            filename: 'weather_question.wav',
            latitude: _position?.latitude,
            longitude: _position?.longitude,
            conversationId: _conversationId,
            language: _language,
            profile: _profile);
        _conversationId ??= result['conversation_id']?.toString();
        final transcript = result['transcription']?.toString() ?? '';
        final response = result['response_text']?.toString() ?? '';
        if (transcript.isNotEmpty)
          _messages.add(ChatLine(
              '${_language == 'hi' ? 'आपने कहा' : 'You said'}: $transcript',
              fromUser: true));
        _showMessage(response,
            decision: result['decision'] as Map<String, dynamic>?);
        final encoded = result['audio_base64']?.toString();
        if (encoded != null && encoded.isNotEmpty) {
          setState(() => _voiceState = 'playing');
          await _player.play(BytesSource(base64Decode(encoded)));
        }
      } catch (error) {
        final detail = error.toString().replaceFirst('Exception: ', '').trim();
        final safeDetail = detail.length > 180
            ? '${detail.substring(0, 180)}…'
            : detail;
        _showMessage(_language == 'hi'
            ? 'वॉइस अभी उपलब्ध नहीं है${safeDetail.isNotEmpty ? ': $safeDetail' : ''}। आप टेक्स्ट चैट का उपयोग कर सकते हैं।'
            : 'Voice is currently unavailable${safeDetail.isNotEmpty ? ': $safeDetail' : ''}. You can continue using text chat.');
      }
      if (mounted) setState(() => _voiceState = 'idle');
      return;
    }
    if (_voiceState != 'idle') return;
    try {
      if (!await _recorder.hasPermission())
        throw Exception('Microphone permission is needed for voice questions.');
      await _recorder.start(
          const RecordConfig(
              encoder: AudioEncoder.wav, sampleRate: 16000, numChannels: 1),
          path: 'weather_question.wav');
      if (mounted) setState(() => _voiceState = 'recording');
    } catch (_) {
      _showMessage(_language == 'hi'
          ? 'वॉइस के लिए माइक्रोफोन की अनुमति चाहिए। आप टेक्स्ट चैट का उपयोग कर सकते हैं।'
          : 'Microphone permission is needed for voice questions. You can continue using text chat.');
    }
  }

  @override
  void dispose() {
    _recorder.dispose();
    _player.dispose();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _showMessage(String text,
      {bool fallback = false, Map<String, dynamic>? decision}) {
    setState(() => _messages.add(ChatLine(text,
        fromUser: false, fallback: fallback, decision: decision)));
    Future.delayed(const Duration(milliseconds: 80), () {
      if (_scroll.hasClients)
        _scroll.animateTo(_scroll.position.maxScrollExtent,
            duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
    });
  }

  void _newChat() => setState(() {
        _conversationId = null;
        _messages
          ..clear()
          ..add(ChatLine(uiText(_language, 'chat_greeting'), fromUser: false));
      });

  @override
  Widget build(BuildContext context) => Scaffold(
      body: SafeArea(
          child: Center(
              child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 960),
                  child: Column(children: [
                    _header(),
                    Expanded(child: _body()),
                    _bottomNav()
                  ])))));

  Widget _header() => Container(
      padding: const EdgeInsets.fromLTRB(18, 15, 18, 17),
      decoration: const BoxDecoration(
          gradient:
              LinearGradient(colors: [Color(0xff1e5bd7), Color(0xff2775e7)]),
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(30))),
      child: Row(children: [
        IconButton(
            onPressed: _changeLanguage,
            tooltip: _t('settings_language'),
            icon: const Icon(Icons.settings_outlined,
                color: Colors.white, size: 26)),
        Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
                color: Colors.white24, borderRadius: BorderRadius.circular(15)),
            child:
                const Icon(Icons.cloud_rounded, color: Colors.white, size: 30)),
        const SizedBox(width: 12),
        Expanded(
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
              Text('WeatherGPT',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w800)),
              Text('Your AI weather intelligence assistant',
                  style: TextStyle(color: Color(0xffe0ecff), fontSize: 12))
            ])),
        IconButton(
            onPressed: _newChat,
            tooltip: _t('ask_anything'),
            icon: const Icon(Icons.add_comment_rounded, color: Colors.white))
      ]));

  Future<void> _changeLanguage() async {
    var choice = languageForCode(_language);
    await showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
                title: const Text('Choose your response language'),
                content: SizedBox(
                    width: 420,
                    height: 460,
                    child: LanguageSelector(
                        selectedCode: choice.code,
                        onSelected: (item) {
                          choice = item;
                          Navigator.of(context).pop();
                        })),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Cancel'))
                ]));
    if (choice.code != _language) {
      setState(() => _language = choice.code);
      final prefs = await AppStorage.getInstance();
      await prefs.setString('response_language', _language);
      try {
        await _api.saveLanguage(_language);
      } catch (_) {}
    }
  }

  Widget _body() => ListView(
          controller: _scroll,
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 12),
          children: [
            Text(_t('good_morning'),
                style: const TextStyle(
                    color: navy, fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(_t('overview'),
                style: const TextStyle(color: Color(0xff64748b), fontSize: 14)),
            const SizedBox(height: 16),
            _weatherHero(),
            const SizedBox(height: 12),
            if (_error != null)
              _infoCard(Icons.cloud_off_rounded, _error!, Colors.orange),
            if (_current != null) _metrics(),
            const SizedBox(height: 18),
            _sectionTitle(_t('seven_day_forecast'), _t('view_all')),
            const SizedBox(height: 10),
            _forecastRow(),
            if (_routeResult != null) ...[
              const SizedBox(height: 18),
              _nextTripCard(),
            ],
            const SizedBox(height: 18),
            _sectionTitle(_t('weather_alerts'), _t('view_all')),
            const SizedBox(height: 10),
            _alertCard(),
            const SizedBox(height: 18),
            _sectionTitle(_t('ask_weathergpt'), null),
            const SizedBox(height: 8),
            _chatMessages(),
            _composer(),
            const SizedBox(height: 18),
            _sectionTitle(_t('explore_more'), null),
            const SizedBox(height: 10),
            _explore()
          ]);

  String _t(String key) => uiText(_language, key);

  Widget _nextTripCard() {
    final route = _routeResult?['route'] as Map<String, dynamic>? ?? {};
    final origin = route['origin']?.toString() ?? 'Origin';
    final destination = route['destination']?.toString() ?? 'Destination';
    final score = (_routeResult?['decision'] as Map<String, dynamic>?)?['safety_score'] ??
        route['safety_score'] ?? '--';
    final advice = _routeResult?['response']?.toString() ?? '';
    final rain = advice.toLowerCase().contains('rain') || advice.contains('बारिश')
        ? 'Rain is possible on the route'
        : 'Check live weather before leaving';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xffe2e9f4))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(_language == 'hi' ? 'आपकी अगली यात्रा' : 'YOUR NEXT TRIP', style: const TextStyle(color: navy, fontWeight: FontWeight.w800, fontSize: 13)),
          const Spacer(),
          TextButton(onPressed: _openMap, child: Text(_language == 'hi' ? 'मानचित्र' : 'View Map'))
        ]),
        Row(children: [
          const Icon(Icons.trip_origin, color: Colors.green, size: 18),
          const SizedBox(width: 7),
          Expanded(child: Text(origin, style: const TextStyle(color: navy, fontWeight: FontWeight.w700))),
          const Icon(Icons.arrow_forward, color: Color(0xff94a3b8), size: 18),
          const SizedBox(width: 7),
          Expanded(child: Text(destination, style: const TextStyle(color: navy, fontWeight: FontWeight.w700))),
        ]),
        const Divider(height: 22),
        Text(rain, style: const TextStyle(color: navy, fontSize: 13)),
        const SizedBox(height: 10),
        Row(children: [
          const Text('Weather Safety Score', style: TextStyle(color: navy, fontWeight: FontWeight.w700, fontSize: 12)),
          const Spacer(),
          Text('$score/100', style: const TextStyle(color: blue, fontWeight: FontWeight.w800)),
        ]),
        const SizedBox(height: 12),
        SizedBox(width: double.infinity, child: FilledButton.icon(
          onPressed: _openMap,
          icon: const Icon(Icons.navigation_rounded),
          label: Text(_language == 'hi' ? 'WeatherGPT Live Map में खोलें' : 'Open in WeatherGPT Live Map'),
        )),
      ]),
    );
  }

  void _openMap() {
    final latitude = _position?.latitude ?? 28.6139;
    final longitude = _position?.longitude ?? 77.2090;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: background,
      builder: (_) => MapPanel(api: _api, latitude: latitude, longitude: longitude, language: _language,
          route: _routeResult?['route'] as Map<String, dynamic>?,
          originName: _position == null ? 'Delhi' : 'Current Location'),
    );
  }

  Widget _weatherHero() {
    final current = _current?['current'] as Map<String, dynamic>?;
    final temperature = current?['temperature_c']?.toString() ?? '--';
    final feels = current?['apparent_temperature_c']?.toString() ?? '--';
    final rawCondition = current?['condition']?.toString() ??
        (_loading ? 'Loading live conditions' : 'No data');
    final condition = _localizedCondition(rawCondition);
    return Container(
        padding: const EdgeInsets.all(19),
        decoration: BoxDecoration(
            gradient: const LinearGradient(
                colors: [Color(0xff3187dc), Color(0xff4aa4e8)]),
            borderRadius: BorderRadius.circular(21),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x22215ea8),
                  blurRadius: 14,
                  offset: Offset(0, 7))
            ]),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.location_on_rounded,
                color: Colors.white, size: 19),
            const SizedBox(width: 5),
            Expanded(
                child: Text(_place,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700))),
            IconButton(
                onPressed: _loadingLocation ? null : _useLocation,
                icon:
                    const Icon(Icons.my_location_rounded, color: Colors.white))
          ]),
          Row(children: [
            Text(temperature,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 58,
                    fontWeight: FontWeight.w300)),
            const Text('°C',
                style: TextStyle(color: Colors.white, fontSize: 28)),
            const Spacer(),
            Icon(_weatherIcon(condition), color: Colors.white, size: 68)
          ]),
          Text(condition,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 7),
          Text('Feels like $feels°C  •  Live data from Open-Meteo',
              style: const TextStyle(color: Color(0xffe8f4ff), fontSize: 12))
        ]));
  }

  IconData _weatherIcon(String condition) =>
      condition.toLowerCase().contains('rain')
          ? Icons.umbrella_rounded
          : condition.toLowerCase().contains('cloud')
              ? Icons.cloud_rounded
              : Icons.wb_sunny_rounded;

  String _localizedCondition(String condition) {
    if (_language != 'hi') return condition;
    const words = {
      'thunderstorm with slight hail': 'गरज-चमक के साथ हल्के ओले',
      'thunderstorm': 'गरज-चमक',
      'mainly clear': 'आसमान ज्यादातर साफ',
      'overcast': 'बादल छाए हुए',
      'rain': 'बारिश हो रही है',
      'precipitation': 'बारिश या बूंदाबांदी',
      'clear': 'आसमान साफ'
    };
    return words[condition.toLowerCase()] ?? condition;
  }

  Widget _metrics() {
    final c = _current!['current'] as Map<String, dynamic>;
    return Row(children: [
      _metric(
          Icons.umbrella_rounded, _t('rain_now'), '${c['rain_mm'] ?? 0} mm'),
      _metric(Icons.water_drop_rounded, _t('humidity'),
          '${c['humidity_percent'] ?? '--'}%'),
      _metric(
          Icons.air_rounded, _t('wind'), '${c['wind_speed_kmh'] ?? '--'} km/h')
    ]);
  }

  Widget _metric(IconData icon, String title, String value) => Expanded(
      child: Container(
          margin: const EdgeInsets.only(right: 8),
          padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 6),
          decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [
                BoxShadow(
                    color: Color(0x100f172a),
                    blurRadius: 8,
                    offset: Offset(0, 3))
              ]),
          child: Column(children: [
            Icon(icon, color: blue, size: 23),
            const SizedBox(height: 6),
            Text(title,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xff64748b), fontSize: 10)),
            const SizedBox(height: 3),
            Text(value,
                style: const TextStyle(
                    color: navy, fontSize: 13, fontWeight: FontWeight.w800))
          ])));

  Widget _forecastRow() {
    final days = (_forecast?['forecast'] as List<dynamic>?) ?? [];
    if (days.isEmpty)
      return _infoCard(Icons.event_busy_rounded, _t('forecast_will_appear'),
          Colors.blueGrey);
    return SizedBox(
        height: 132,
        child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: days.length,
            separatorBuilder: (_, __) => const SizedBox(width: 9),
            itemBuilder: (_, i) {
              final day = days[i] as Map<String, dynamic>;
              final date = day['date']?.toString() ?? '';
              return Container(
                  width: 98,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xffe3eaf5))),
                  child: Column(children: [
                    Text(i == 0 ? _t('today') : date,
                        style: const TextStyle(
                            color: Color(0xff64748b),
                            fontSize: 10,
                            fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Icon(_weatherIcon(day['condition']?.toString() ?? ''),
                        color: blue, size: 25),
                    const SizedBox(height: 6),
                    Text(
                        '${day['temperature_max_c']}° / ${day['temperature_min_c']}°',
                        style: const TextStyle(
                            color: navy,
                            fontSize: 11,
                            fontWeight: FontWeight.w800)),
                    Text(
                        '${day['precipitation_probability_percent']}% ${_t('rain')}',
                        style: const TextStyle(
                            color: Color(0xff64748b), fontSize: 10))
                  ]));
            }));
  }

  Widget _alertCard() =>
      _infoCard(Icons.verified_outlined, _t('no_alerts'), Colors.green,
          subtitle: _t('alerts_subtitle'));
  Widget _infoCard(IconData icon, String title, Color color,
          {String? subtitle}) =>
      Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
              color: Colors.white, borderRadius: BorderRadius.circular(16)),
          child: Row(children: [
            Icon(icon, color: color, size: 25),
            const SizedBox(width: 11),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(title,
                      style: const TextStyle(
                          color: navy,
                          fontWeight: FontWeight.w700,
                          fontSize: 13)),
                  if (subtitle != null)
                    Text(subtitle,
                        style: const TextStyle(
                            color: Color(0xff64748b), fontSize: 11))
                ]))
          ]));
  Widget _sectionTitle(String title, String? action) => Row(children: [
        Text(title,
            style: const TextStyle(
                color: navy, fontSize: 17, fontWeight: FontWeight.w800)),
        const Spacer(),
        if (action != null)
          Text(action,
              style: const TextStyle(
                  color: blue, fontSize: 12, fontWeight: FontWeight.w600))
      ]);
  Widget _chatMessages() => Column(
        children: _messages.map((item) {
          return Align(
            alignment:
                item.fromUser ? Alignment.centerRight : Alignment.centerLeft,
            child: Container(
              constraints: const BoxConstraints(maxWidth: 700),
              margin: const EdgeInsets.only(bottom: 9),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                  color: item.fromUser ? blue : Colors.white,
                  borderRadius: BorderRadius.circular(16)),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.text,
                        style: TextStyle(
                            color: item.fromUser ? Colors.white : navy,
                            fontSize: 13,
                            height: 1.35)),
                    if (item.decision != null) _decisionCard(item.decision!),
                    if (item.fallback)
                      Padding(
                          padding: EdgeInsets.only(top: 5),
                          child: Text(_t('live_weather_used'),
                              style: TextStyle(
                                  color: Color(0xff64748b), fontSize: 10))),
                  ]),
            ),
          );
        }).toList(),
      );
  Widget _composer() {
    const profiles = [
      'general_public',
      'traveller',
      'farmer',
      'student',
      'outdoor_worker',
      'commuter'
    ];
    return Column(children: [
      Row(children: [
        Icon(Icons.location_on_outlined,
            color: _position == null ? const Color(0xff64748b) : blue,
            size: 18),
        const SizedBox(width: 5),
        Expanded(
            child: Text(
                _position == null
                    ? _t('location_not_connected')
                    : _t('using_current_location'),
                style:
                    const TextStyle(color: Color(0xff64748b), fontSize: 11))),
        TextButton.icon(
            onPressed: _loadingLocation ? null : _useLocation,
            icon: _loadingLocation
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.gps_fixed, size: 16),
            label: Text(_t('use_gps')))
      ]),
      const SizedBox(height: 4),
      if (_voiceState != 'idle')
        Align(
            alignment: Alignment.centerLeft,
            child: Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                    _voiceState == 'recording'
                        ? (_language == 'hi'
                            ? 'सुन रहा हूँ… बोलना पूरा होने पर फिर माइक्रोफ़ोन दबाएँ।'
                            : 'Listening… tap the microphone again when you finish.')
                        : (_voiceState == 'processing'
                            ? (_language == 'hi'
                                ? 'आपकी बात भेजी जा रही है…'
                                : 'Sending what you said…')
                            : (_language == 'hi'
                                ? 'उत्तर तैयार हो रहा है…'
                                : 'Preparing your answer…')),
                    style: const TextStyle(
                        color: Color(0xff64748b), fontSize: 11)))),
      Row(children: [
        Text(_t('advice_for'),
            style: const TextStyle(color: Color(0xff64748b), fontSize: 11)),
        DropdownButton<String>(
            value: _profile,
            isDense: true,
            underline: const SizedBox.shrink(),
            items: profiles
                .map((key) => DropdownMenuItem(
                    value: key,
                    child: Text(profileLabel(_language, key),
                        style: const TextStyle(fontSize: 11))))
                .toList(),
            onChanged: _sending
                ? null
                : (value) {
                    if (value != null) setState(() => _profile = value);
                  }),
        const Spacer()
      ]),
      const SizedBox(height: 4),
      Row(children: [
        Expanded(
            child: TextField(
                controller: _input,
                onSubmitted: (_) => _send(),
                textInputAction: TextInputAction.send,
                decoration: InputDecoration(
                    hintText: '${_t('ask_anything')} about weather...',
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 15, vertical: 13),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(18),
                        borderSide: BorderSide.none)))),
        const SizedBox(width: 8),
        IconButton(
            onPressed: _sending ? null : _send,
            style: IconButton.styleFrom(
                backgroundColor: blue, foregroundColor: Colors.white),
            icon: _sending
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2))
                : const Icon(Icons.arrow_upward_rounded)),
        const SizedBox(width: 6),
        FloatingActionButton.small(
            onPressed: _sending ? null : _toggleVoice,
            backgroundColor: _voiceState == 'recording' ? Colors.red : blue,
            foregroundColor: Colors.white,
            tooltip:
                _voiceState == 'recording' ? 'Listening...' : 'Tap to speak',
            child: Icon(_voiceState == 'recording'
                ? Icons.stop_rounded
                : _voiceState == 'processing'
                    ? Icons.hourglass_top_rounded
                    : _voiceState == 'playing'
                        ? Icons.volume_up_rounded
                        : Icons.mic_rounded))
      ])
    ]);
  }

  Widget _decisionCard(Map<String, dynamic> decision) {
    final score = decision['risk_score']?.toString() ?? '--';
    final level = (decision['risk_level']?.toString() ?? 'unavailable')
        .replaceAll('_', ' ')
        .toUpperCase();
    final peak = decision['peak_risk_window'] as Map<String, dynamic>?;
    final actions =
        (decision['recommended_actions'] as List<dynamic>?) ?? const [];
    final carry = (decision['what_to_carry'] as List<dynamic>?) ?? const [];
    final avoid = (decision['what_to_avoid'] as List<dynamic>?) ?? const [];
    final precautions = (decision['precautions'] as List<dynamic>?) ?? const [];
    final color = level == 'EXTREME'
        ? Colors.red
        : level == 'HIGH'
            ? Colors.deepOrange
            : level == 'MODERATE'
                ? Colors.orange
                : Colors.green;
    Widget listBlock(String label, List<dynamic> values) => values.isEmpty
        ? const SizedBox.shrink()
        : Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text('$label: ${values.join(', ')}',
                style: const TextStyle(color: navy, fontSize: 11)));
    return Container(
        margin: const EdgeInsets.only(top: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: color.withAlpha(18),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withAlpha(80))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(Icons.warning_amber_rounded, color: color, size: 20),
            const SizedBox(width: 6),
            Text(_t('weather_risk'),
                style: TextStyle(
                    color: color, fontWeight: FontWeight.w800, fontSize: 12)),
            const Spacer(),
            Text('$score / 100',
                style: TextStyle(color: color, fontWeight: FontWeight.w900))
          ]),
          const SizedBox(height: 5),
          Text(level,
              style: TextStyle(color: color, fontWeight: FontWeight.w800)),
          if (peak != null)
            Text('${_t('peak')}: ${peak['time'] ?? 'forecast period'}',
                style: const TextStyle(color: navy, fontSize: 11)),
          if (actions.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(_t('recommended_action'),
                style: const TextStyle(
                    color: navy, fontWeight: FontWeight.w700, fontSize: 11)),
            Text('• ${actions.first}',
                style: const TextStyle(color: navy, fontSize: 11))
          ],
          listBlock(_t('carry'), carry),
          listBlock(_t('avoid'), avoid),
          listBlock(_t('precautions'), precautions),
          const SizedBox(height: 5),
          Row(children: [
            Text(
                '${_t('decision_confidence')}: ${((decision['confidence'] as Map<String, dynamic>?)?['level'] ?? 'unknown')}',
                style: const TextStyle(color: Color(0xff64748b), fontSize: 10)),
            const Spacer(),
            TextButton(
                onPressed: () => _showWhy(decision),
                child: Text(_t('why'),
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 11)))
          ])
        ]));
  }

  void _showWhy(Map<String, dynamic> decision) {
    final risks = decision['risk_components'] as Map<String, dynamic>? ?? {};
    final evidence = (decision['explanation']
            as Map<String, dynamic>?)?['factors'] as List<dynamic>? ??
        const [];
    final source = (decision['data_sources'] as List<dynamic>?)?.firstOrNull;
    showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
                title: const Text('Why this decision?'),
                content: SingleChildScrollView(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      const Text('Risk breakdown',
                          style: TextStyle(fontWeight: FontWeight.w800)),
                      ...risks.entries
                          .where((entry) => entry.key != 'overall')
                          .map((entry) {
                        final value = entry.value as Map<String, dynamic>;
                        return Text(
                            '${entry.key}: ${value['score'] ?? 'unavailable'} (${value['level']})');
                      }),
                      const SizedBox(height: 12),
                      const Text('Evidence',
                          style: TextStyle(fontWeight: FontWeight.w800)),
                      ...evidence.map((item) => Text('• $item')),
                      const SizedBox(height: 12),
                      Text(
                          'Source: ${source is Map<String, dynamic> ? source['name'] : 'unavailable'}')
                    ])),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Close'))
                ]));
  }

  Widget _explore() => Wrap(spacing: 9, runSpacing: 9, children: [
        _actionCard(
            Icons.wb_sunny_rounded,
            _t('weather_details'),
            _position == null
                ? 'What is the current weather in Delhi?'
                : 'What is the current weather near me?',
            _position == null
                ? 'दिल्ली का अभी मौसम कैसा है?'
                : 'मेरे पास अभी मौसम कैसा है?'),
        _actionCard(
            Icons.water_drop_rounded,
            _t('rain_check'),
            _position == null
                ? 'Will it rain in Delhi today?'
                : 'Will it rain near me today?',
            _position == null
                ? 'क्या आज दिल्ली में बारिश होगी?'
                : 'क्या आज मेरे पास बारिश होगी?'),
        _actionCard(
            Icons.calendar_month_rounded,
            _t('seven_day_forecast'),
            _position == null
                ? 'Give me the 7 day forecast for Delhi'
                : 'Give me the 7 day forecast near me',
            _position == null
                ? 'दिल्ली का 7 दिन का मौसम बताएं'
                : 'मेरे पास 7 दिन का मौसम बताएं')
      ]);
  Widget _actionCard(
          IconData icon, String title, String prompt, String hindiPrompt) =>
      InkWell(
          onTap: () => _send(prompt, _language == 'hi' ? hindiPrompt : prompt),
          borderRadius: BorderRadius.circular(15),
          child: Container(
              width: 145,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(color: const Color(0xffe2e9f4))),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(icon, color: blue, size: 24),
                    const SizedBox(height: 8),
                    Text(title,
                        style: const TextStyle(
                            color: navy,
                            fontWeight: FontWeight.w700,
                            fontSize: 12)),
                    Text(_t('ask_now'),
                        style: const TextStyle(
                            color: Color(0xff64748b), fontSize: 10))
                  ])));
  Widget _bottomNav() => Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xffe5eaf2)))),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
        _nav(Icons.home_rounded, _language == 'hi' ? 'होम' : 'Home', true),
        _navButton(Icons.map_outlined, _language == 'hi' ? 'मानचित्र' : 'Map', _openMap),
        _nav(Icons.chat_bubble_outline_rounded,
            _language == 'hi' ? 'चैट' : 'Chat', false),
        _nav(Icons.person_outline_rounded,
            _language == 'hi' ? 'प्रोफ़ाइल' : 'Profile', false)
      ]));
  Widget _navButton(IconData icon, String label, VoidCallback onTap) =>
      InkWell(onTap: onTap, borderRadius: BorderRadius.circular(12), child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: _nav(icon, label, false)));
  Widget _nav(IconData icon, String label, bool active) =>
      Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, color: active ? blue : const Color(0xff94a3b8), size: 22),
        Text(label,
            style: TextStyle(
                color: active ? blue : const Color(0xff64748b),
                fontSize: 10,
                fontWeight: active ? FontWeight.w700 : FontWeight.normal))
      ]);
}

class MapPanel extends StatefulWidget {
  const MapPanel({super.key, required this.api, required this.latitude, required this.longitude, required this.language, this.route, this.originName = 'Current Location'});
  final ApiService api;
  final double latitude;
  final double longitude;
  final String language;
  final Map<String, dynamic>? route;
  final String originName;

  @override
  State<MapPanel> createState() => _MapPanelState();
}

class _MapPanelState extends State<MapPanel> {
  late Future<Map<String, dynamic>> _weather;
  late final TextEditingController _origin;
  final _destination = TextEditingController();
  Timer? _searchDebounce;
  List<Map<String, dynamic>> _suggestions = [];
  Map<String, dynamic>? _selectedPlace;
  Map<String, dynamic>? _route, _routeWeather;
  Map<String, dynamic>? _bestTime;
  String _travelMode = 'driving';
  bool _routeLoading = false;
  int _selectedRoute = 0;
  bool _showDetails = false;

  @override
  void initState() {
    super.initState();
    _weather = widget.api.mapWeather(widget.latitude, widget.longitude);
    _route = widget.route;
    _origin = TextEditingController(text: widget.originName);
  }

  @override
  void dispose() {
    _origin.dispose();
    _destination.dispose();
    _searchDebounce?.cancel();
    super.dispose();
  }

  Future<void> _findRoute() async {
    final destination = _destination.text.trim();
    if (destination.isEmpty) {
      _showNotice('Enter a destination such as Jaipur or India Gate.');
      return;
    }
    setState(() => _routeLoading = true);
    try {
      final originText = _origin.text.trim().toLowerCase() == 'current location'
          ? 'Delhi'
          : _origin.text.trim();
      final route = _selectedPlace == null || originText.toLowerCase() != 'current location'
          ? await widget.api.resolveRoute(originText, destination, travelMode: _travelMode)
          : await widget.api.createRoute({
              'latitude': widget.latitude,
              'longitude': widget.longitude,
              'name': originText,
            }, {
              'latitude': _selectedPlace!['latitude'],
              'longitude': _selectedPlace!['longitude'],
              'name': _selectedPlace!['name'] ?? destination,
            }, travelMode: _travelMode);
      Map<String, dynamic>? weather;
      try {
        weather = await widget.api.routeWeather(route['route_id'].toString());
      } catch (_) {}
      if (mounted) setState(() { _route = route; _routeWeather = weather; });
    } catch (error) {
      _showNotice(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _routeLoading = false);
    }
  }

  void _searchPlaces(String value) {
    _searchDebounce?.cancel();
    final query = value.trim();
    if (query.length < 2) {
      setState(() => _suggestions = []);
      return;
    }
    _searchDebounce = Timer(const Duration(milliseconds: 320), () async {
      try {
        final result = await widget.api.autocomplete(query,
            latitude: widget.latitude, longitude: widget.longitude);
        if (mounted) setState(() => _suggestions = result);
      } catch (_) {
        if (mounted) _showNotice('Place search is temporarily unavailable.');
      }
    });
  }

  Future<void> _selectPlace(Map<String, dynamic> place) async {
    Map<String, dynamic> selected = place;
    final placeId = place['place_id']?.toString();
    if (placeId != null && placeId.isNotEmpty) {
      try {
        selected = await widget.api.placeDetails(placeId);
      } catch (_) {
        // The suggestion already contains coordinates for the default provider.
      }
    }
    setState(() {
      _selectedPlace = selected;
      _destination.text = selected['name']?.toString() ?? selected['address']?.toString() ?? '';
      _suggestions = [];
    });
  }

  void _refresh() => setState(() {
        _weather = widget.api.mapWeather(widget.latitude, widget.longitude);
      });

  @override
  Widget build(BuildContext context) => SafeArea(
        child: SizedBox(
          height: MediaQuery.of(context).size.height * .9,
          child: Column(children: [
            Container(
              color: const Color(0xff0c1730),
              padding: const EdgeInsets.fromLTRB(18, 14, 12, 13),
              child: Row(children: [
                Container(width: 30, height: 30, alignment: Alignment.center, decoration: BoxDecoration(color: blue, borderRadius: BorderRadius.circular(8)), child: const Text('W', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900))),
                const SizedBox(width: 9),
                const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('WeatherGPT Live Map  LIVE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)), Text('Navigate smarter. Stay ahead of the weather.', style: TextStyle(color: Color(0xffa8b5cd), fontSize: 10))])),
                IconButton(onPressed: _refresh, icon: const Icon(Icons.refresh_rounded, color: Colors.white)),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded, color: Colors.white)),
              ]),
            ),
            Expanded(child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _routeInputs(),
              const SizedBox(height: 12),
              InkWell(onTap: () => setState(() => _showDetails = !_showDetails), child: Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Row(children: [const Text('WeatherGPT Route Comparison', style: TextStyle(color: Color(0xff64748b), fontWeight: FontWeight.w700, fontSize: 12)), const Spacer(), Text(_showDetails ? 'Hide Details' : 'View Details & Best Time', style: const TextStyle(color: blue, fontWeight: FontWeight.w700, fontSize: 12))]))),
              const SizedBox(height: 8),
              Expanded(child: FutureBuilder<Map<String, dynamic>>(
                future: _weather,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
                  if (snapshot.hasError) return _mapError(snapshot.error.toString());
                  final data = snapshot.data ?? {};
                  final features = data['features'] as List<dynamic>? ?? [];
                  final properties = features.isNotEmpty && features.first is Map<String, dynamic>
                      ? ((features.first as Map<String, dynamic>)['properties'] as Map<String, dynamic>? ?? {})
                      : <String, dynamic>{};
                  final temp = properties['temperature_c']?.toString() ?? '--';
                  final rain = properties['rain_probability_percent']?.toString() ?? '--';
                  final condition = properties['condition']?.toString() ?? 'Live conditions unavailable';
                  return ListView(children: [
                    if (_route != null) _routeSummary(condition, rain) else _routeEmpty(),
                    const SizedBox(height: 12),
                    Text(_route == null ? 'CREATE A ROUTE TO SEE OPTIONS' : 'AVAILABLE ROUTE OPTIONS', style: const TextStyle(color: Color(0xff64748b), fontWeight: FontWeight.w800, fontSize: 12)),
                    const SizedBox(height: 8),
                    if (_route != null) _routeOption(0, 'WeatherGPT Route', '${_route!['distance_km'] ?? '--'} km • ${_route!['duration_minutes'] ?? '--'} min', _routeWeather?['overall_risk']?['score']?.toString() ?? '--', Colors.green, true),
                    if (_showDetails) _departureCard(),
                  ]);
                },
              )),
            ]),
          )),
          ]),
        ),
      );

  Widget _routeInputs() => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('WEATHERGPT ROUTE INTELLIGENCE', style: TextStyle(color: navy, fontWeight: FontWeight.w900, fontSize: 15)),
        const SizedBox(height: 9),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: _routeField(_origin, 'From')), const SizedBox(width: 8), Expanded(child: Column(children: [_routeField(_destination, 'To • Search destination', onChanged: _searchPlaces), if (_suggestions.isNotEmpty) Container(constraints: const BoxConstraints(maxHeight: 150), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), boxShadow: const [BoxShadow(color: Color(0x22000000), blurRadius: 5)]), child: ListView(shrinkWrap: true, children: _suggestions.map((place) => ListTile(dense: true, onTap: () => _selectPlace(place), leading: const Icon(Icons.location_on_outlined, color: blue, size: 18), title: Text(place['name']?.toString() ?? 'Place', style: const TextStyle(color: navy, fontSize: 12, fontWeight: FontWeight.w700)), subtitle: Text(place['address']?.toString() ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10)))).toList()))]))]),
        const SizedBox(height: 8),
        Row(children: [DropdownButton<String>(value: _travelMode, items: const [DropdownMenuItem(value: 'driving', child: Text('🚗 Driving')), DropdownMenuItem(value: 'walking', child: Text('🚶 Walking')), DropdownMenuItem(value: 'cycling', child: Text('🚲 Cycling'))], onChanged: _routeLoading ? null : (value) { if (value != null) setState(() => _travelMode = value); }), const Spacer(), FilledButton.icon(onPressed: _routeLoading ? null : _findRoute, icon: _routeLoading ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.route_rounded), label: const Text('Show Route'))]),
      ]);

  Widget _routeField(TextEditingController controller, String hint, {ValueChanged<String>? onChanged}) => TextField(controller: controller, onChanged: onChanged, style: const TextStyle(color: navy, fontSize: 12), decoration: InputDecoration(labelText: hint, labelStyle: const TextStyle(color: Color(0xff64748b), fontSize: 11), filled: true, fillColor: Colors.white, contentPadding: const EdgeInsets.symmetric(horizontal: 11, vertical: 10), border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xffdce5f1)))));

  Widget _routeEmpty() => Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xffdce5f1))), child: const Text('Enter your starting location and destination to calculate a route, weather along the route, and the WeatherGPT Decision Risk Score.', style: TextStyle(color: Color(0xff64748b), height: 1.4)));

  Widget _routeSummary(String condition, String rain) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xffb8d7ff)), boxShadow: const [BoxShadow(color: Color(0x12000000), blurRadius: 5)]),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [Container(padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6), decoration: BoxDecoration(color: const Color(0xffd5f8e6), borderRadius: BorderRadius.circular(8)), child: const Text('● ROUTE FOUND', style: TextStyle(color: Color(0xff087444), fontWeight: FontWeight.w800, fontSize: 11))), const Spacer(), const Text('Risk Score:', style: TextStyle(color: Color(0xff64748b), fontSize: 11)), const SizedBox(width: 6), Text('${_routeWeather?['overall_risk']?['score'] ?? '--'}/100', style: const TextStyle(color: Color(0xff009b61), fontWeight: FontWeight.w900, fontSize: 16))]),
      const SizedBox(height: 12),
      Text('${_route?['duration_minutes'] ?? '--'} min  (${_route?['distance_km'] ?? '--'} km)', style: const TextStyle(color: navy, fontSize: 22, fontWeight: FontWeight.w900)),
      Text(condition, style: const TextStyle(color: Color(0xff64748b), fontSize: 12)),
      const SizedBox(height: 9),
      Row(children: [_risk('Rain Risk', _riskValue('rain'), _riskColor('rain')), const SizedBox(width: 8), _risk('Flood Risk', _riskValue('flood'), _riskColor('flood'))]),
      const SizedBox(height: 12),
      Row(children: [Expanded(child: FilledButton.icon(onPressed: () => _showNotice('Navigation started for the selected route.'), icon: const Icon(Icons.navigation_rounded), label: const Text('START NAVIGATION'))), const SizedBox(width: 8), Expanded(child: OutlinedButton.icon(onPressed: () => _showNotice('This route has the lowest predicted rain and waterlogging risk.'), icon: const Icon(Icons.auto_awesome, size: 16), label: const Text('Why This Route?')))]),
    ]),
  );

  Widget _risk(String title, String value, Color color) => Expanded(child: Container(padding: const EdgeInsets.all(9), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xffe2e9f4))), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('$title:', style: const TextStyle(color: Color(0xff64748b), fontSize: 11)), Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 11))])));

  Widget _routeOption(int index, String title, String subtitle, String score,
      Color dot, bool recommended) {
    final selected = _selectedRoute == index;
    final scoreColor = dot == Colors.red
        ? Colors.red
        : dot == Colors.orange
            ? Colors.orange[800]!
            : const Color(0xff009b61);
    return InkWell(
      onTap: () => setState(() => _selectedRoute = index),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? const Color(0xffeef6ff) : Colors.white,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(
              color: selected ? blue : const Color(0xffdce5f1),
              width: selected ? 1.5 : 1),
        ),
        child: Row(children: [
          Icon(Icons.circle, color: dot, size: 15),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        color: navy,
                        fontWeight: FontWeight.w800,
                        fontSize: 13)),
                Text(subtitle,
                    style: const TextStyle(
                        color: Color(0xff64748b), fontSize: 11)),
              ],
            ),
          ),
          Text(score,
              style: TextStyle(
                  color: scoreColor, fontWeight: FontWeight.w900)),
          const Icon(Icons.chevron_right, color: Color(0xff94a3b8)),
        ]),
      ),
    );
  }

  String _riskValue(String key) {
    final segment = _routeWeather?['peak_segment'] as Map<String, dynamic>?;
    final risk = segment?['risk'];
    final components = risk is Map ? risk['components'] : null;
    final component = components is Map ? components[key] : null;
    return component is Map ? component['level']?.toString() ?? 'unavailable' : 'unavailable';
  }

  Color _riskColor(String key) {
    final value = _riskValue(key);
    return value == 'unavailable' ? const Color(0xff64748b) : (value == 'high' || value == 'extreme') ? Colors.red : (value == 'moderate' ? Colors.orange[800]! : Colors.green);
  }

  Future<void> _checkBestTime() async {
    if (_route == null) return;
    try {
      final result = await widget.api.routeBestTime(_route!['route_id'].toString());
      if (mounted) setState(() => _bestTime = result);
    } catch (error) { _showNotice(error.toString().replaceFirst('Exception: ', '')); }
  }

  Widget _departureCard() => Container(margin: const EdgeInsets.only(top: 6), padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: const Color(0xfffffbeb), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xffffd66b))), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('◷  BEST DEPARTURE TIME AI', style: TextStyle(color: Color(0xff7c3512), fontWeight: FontWeight.w900, fontSize: 12)), const SizedBox(height: 8), Text(_bestTime?['reason']?.toString() ?? 'Compare forecast risk across possible departure times.', style: const TextStyle(color: Color(0xff8a431d), fontSize: 12, height: 1.45)), const SizedBox(height: 8), OutlinedButton(onPressed: _checkBestTime, child: Text(_bestTime?['recommended_departure_time'] == null ? 'Check best departure time' : 'Recommended: ${_bestTime!['recommended_departure_time']}'))]));

  void _showNotice(String message) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));

  Widget _mapChip(IconData icon, String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 7),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: const [BoxShadow(color: Color(0x22000000), blurRadius: 5)]),
        child: Row(children: [Icon(icon, color: blue, size: 15), const SizedBox(width: 4), Text(text, style: const TextStyle(color: navy, fontWeight: FontWeight.w700, fontSize: 11))]),
      );

  Widget _mapInfo(IconData icon, String title, String value) => ListTile(
        dense: true,
        contentPadding: EdgeInsets.zero,
        leading: Icon(icon, color: blue),
        title: Text(title, style: const TextStyle(color: Color(0xff64748b), fontSize: 11)),
        subtitle: Text(value, style: const TextStyle(color: navy, fontWeight: FontWeight.w700)),
      );

  Widget _mapError(String error) => Center(child: Text('Live map is temporarily unavailable.\nPlease check the backend and try again.', textAlign: TextAlign.center, style: const TextStyle(color: navy, height: 1.4)));
}

class _MapGridPainter extends CustomPainter {
  const _MapGridPainter();
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = const Color(0x3370a8d8)..strokeWidth = 1;
    for (var x = 0.0; x < size.width; x += 32) canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    for (var y = 0.0; y < size.height; y += 32) canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
  }
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
