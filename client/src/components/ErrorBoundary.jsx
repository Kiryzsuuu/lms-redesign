import { Component } from 'react';
import { Button, Container } from './ui';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(err) {
    return { hasError: true, errorMessage: err?.message || String(err) };
  }

  componentDidCatch(err) {
    console.error('App crashed:', err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="py-10">
          <Container>
            <div className="border border-rose-200 bg-rose-50 p-6 text-slate-900">
              <div className="text-lg font-extrabold">Terjadi error di aplikasi</div>
              <div className="mt-2 text-sm text-rose-800">{this.state.errorMessage}</div>
              <div className="mt-4">
                <Button onClick={() => window.location.reload()}>Reload</Button>
              </div>
            </div>
          </Container>
        </section>
      );
    }

    return this.props.children;
  }
}
