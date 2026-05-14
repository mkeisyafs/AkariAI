import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen text-ink-primary">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-grid mask-fade-y opacity-40"
      />
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-10 animate-fade">
        <Outlet />
      </main>
    </div>
  );
}
