import "./globals.css";

export const metadata = {
  title: "Liquidazione Gratuito Patrocinio - Tribunale di Brindisi",
  description: "Webapp per la liquidazione del gratuito patrocinio (Sezione Penale).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
