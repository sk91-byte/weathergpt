# WeatherGPT demo

1. Start the backend with `python -m uvicorn backend.main:app --reload`.
2. Open `http://127.0.0.1:8000/docs`.
3. Try `/weather/current` for Delhi coordinates `28.6139, 77.2090`.
4. Try `/chat` with `{"message":"What is the weather near me?","latitude":28.6139,"longitude":77.2090}`.
5. Try `/location/reverse` with the same coordinates.
6. Review `/alerts`; its response is explicitly demo data until an official provider is configured.
7. Review `/nwp/status`; GFS and WRF correctly report unavailable rather than fake data.
8. For mobile, run `flutter pub get` and `flutter run` from `mobile/`; Android emulators use `10.0.2.2` for the host backend.
9. Try `POST /decision/advice` with `{"latitude":28.6139,"longitude":77.2090,"profile":"traveller","question":"Should I travel tomorrow?"}`. Use the returned decision ID with the explanation endpoint for the WHY evidence.
10. Try `POST /reports` with an unverified local observation; it will appear in `/reports/nearby` and on the map as a citizen report, never as an official alert.
