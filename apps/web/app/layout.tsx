import './globals.css';
import { ToastProvider } from '../components/ui/ToastContext';
import { SessionProvider } from '../components/auth/SessionProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-zinc-100" style={{ backgroundColor: 'var(--deep-void, #0a0d14)' }}>
        <SessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
