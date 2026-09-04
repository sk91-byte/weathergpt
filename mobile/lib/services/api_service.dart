import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../config/api_config.dart';

class ApiService {
  Future<Map<String, dynamic>> currentWeather(
      double latitude, double longitude) async {
    final response = await http.get(Uri.parse(
        '$backendBaseUrl/weather/current?latitude=$latitude&longitude=$longitude'));
    return _decode(response);
  }

  Future<Map<String, dynamic>> forecast(double latitude, double longitude,
      {int days = 7}) async {
    final response = await http.get(Uri.parse(
        '$backendBaseUrl/weather/forecast?latitude=$latitude&longitude=$longitude&days=$days'));
    return _decode(response);
  }

  Future<Map<String, dynamic>> mapWeather(double latitude, double longitude,
      {int zoom = 10}) async {
    final response = await http.get(Uri.parse(
        '$backendBaseUrl/map/weather?latitude=$latitude&longitude=$longitude&zoom=$zoom'));
    return _decode(response);
  }

  Future<Map<String, dynamic>> resolveRoute(String origin, String destination,
      {String travelMode = 'driving'}) async {
    final uri = Uri.parse('$backendBaseUrl/route/resolve').replace(queryParameters: {
      'origin': origin,
      'destination': destination,
      'travel_mode': travelMode,
    });
    final response = await http.post(uri);
    return _decode(response);
  }

  Future<Map<String, dynamic>> createRoute(Map<String, dynamic> origin,
      Map<String, dynamic> destination, {String travelMode = 'driving'}) async {
    final response = await http.post(Uri.parse('$backendBaseUrl/route'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'origin': origin, 'destination': destination, 'travel_mode': travelMode}));
    return _decode(response);
  }

  Future<List<Map<String, dynamic>>> autocomplete(String input,
      {double? latitude, double? longitude, String? sessionId}) async {
    final params = <String, String>{'input': input};
    if (latitude != null) params['latitude'] = latitude.toString();
    if (longitude != null) params['longitude'] = longitude.toString();
    if (sessionId != null) params['session_id'] = sessionId;
    final response = await http.get(Uri.parse('$backendBaseUrl/places/autocomplete').replace(queryParameters: params));
    final value = _decode(response)['suggestions'];
    return value is List ? value.whereType<Map<String, dynamic>>().toList() : <Map<String, dynamic>>[];
  }

  Future<Map<String, dynamic>> placeDetails(String placeId) async {
    final response = await http.get(Uri.parse('$backendBaseUrl/places/$placeId'));
    return _decode(response);
  }

  Future<Map<String, dynamic>> routeWeather(String routeId,
      {String? departureTime}) async {
    final response = await http.post(Uri.parse('$backendBaseUrl/route/weather'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'route_id': routeId, 'departure_time': departureTime}));
    return _decode(response);
  }

  Future<Map<String, dynamic>> routeExplanation(String routeId) async {
    final response = await http.get(Uri.parse('$backendBaseUrl/route/$routeId/explanation'));
    return _decode(response);
  }

  Future<Map<String, dynamic>> routeBestTime(String routeId) async {
    final response = await http.post(Uri.parse('$backendBaseUrl/route/best-time'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'route_id': routeId}));
    return _decode(response);
  }

  Future<Map<String, dynamic>> chat(String message,
      {double? latitude,
      double? longitude,
      String? conversationId,
      String profile = 'general_public',
      String? language}) async {
    final body = <String, dynamic>{'message': message};
    if (latitude != null && longitude != null) {
      body['latitude'] = latitude;
      body['longitude'] = longitude;
    }
    if (conversationId != null) body['conversation_id'] = conversationId;
    body['profile'] = profile;
    if (language != null) body['language'] = language;
    final response = await http.post(Uri.parse('$backendBaseUrl/chat'),
        headers: {'Content-Type': 'application/json'}, body: jsonEncode(body));
    return _decode(response);
  }

  Future<void> saveLanguage(String language) async {
    final response = await http.put(Uri.parse('$backendBaseUrl/profile'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'language': language}));
    _decode(response);
  }

  Future<Map<String, dynamic>> voiceChat(List<int> audio,
      {String filename = 'voice.wav',
      double? latitude,
      double? longitude,
      String? conversationId,
      String language = 'en',
      String profile = 'general_public'}) async {
    final request =
        http.MultipartRequest('POST', Uri.parse('$backendBaseUrl/voice/chat'));
    final extension = filename.toLowerCase().split('.').last;
    final mime = extension == 'webm'
        ? 'webm'
        : extension == 'ogg'
            ? 'ogg'
            : extension == 'mp3'
                ? 'mpeg'
                : extension == 'm4a'
                    ? 'mp4'
                    : 'wav';
    request.files.add(http.MultipartFile.fromBytes('file', audio,
        filename: filename, contentType: MediaType('audio', mime)));
    request.fields['language'] = language;
    request.fields['profile_type'] = profile;
    if (latitude != null && longitude != null) {
      request.fields['latitude'] = latitude.toString();
      request.fields['longitude'] = longitude.toString();
    }
    if (conversationId != null)
      request.fields['conversation_id'] = conversationId;
    final response = await request.send();
    return _decode(await http.Response.fromStream(response));
  }

  Map<String, dynamic> _decode(http.Response response) {
    if (response.statusCode >= 400) {
      var detail = 'Server error (${response.statusCode})';
      try {
        detail = (jsonDecode(response.body) as Map<String, dynamic>)['detail']
                ?.toString() ??
            detail;
      } catch (_) {}
      throw Exception(detail);
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }
}
