import React, { StrictMode } from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

registerSW({ immediate: true });

type AppErrorBoundaryProps = { children: React.ReactNode };

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, { error: Error | null }> {
  declare readonly props: AppErrorBoundaryProps;
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('WeatherGPT render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f1f5f9', fontFamily: 'system-ui' }}>
        <section style={{ maxWidth: 420, borderRadius: 18, padding: 24, background: 'white', boxShadow: '0 12px 40px rgba(15,23,42,.15)' }}>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: 20 }}>WeatherGPT could not display this screen</h1>
          <p style={{ color: '#475569', lineHeight: 1.5 }}>The route data was invalid or the browser loaded an outdated bundle. Refresh this page once.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ border: 0, borderRadius: 10, padding: '10px 16px', background: '#2563eb', color: 'white', fontWeight: 700 }}>Refresh WeatherGPT</button>
        </section>
      </main>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </StrictMode>,
);
