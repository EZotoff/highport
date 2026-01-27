import './globals.css';
import { ToastProvider } from '../components/ui/ToastContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
