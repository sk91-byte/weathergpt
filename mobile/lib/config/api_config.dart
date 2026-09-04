// Local development default. For deployment, pass:
// flutter build web --release --dart-define=BACKEND_BASE_URL=https://your-backend.onrender.com
const String backendBaseUrl = String.fromEnvironment(
  'BACKEND_BASE_URL',
  defaultValue: 'http://127.0.0.1:8000',
);
