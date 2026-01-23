'use client';

import App from '../../App';

// This route exists so OAuth redirects to /dashboard work correctly
// The App component handles the view state internally
export default function DashboardPage() {
  return <App />;
}

