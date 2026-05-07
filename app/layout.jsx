export const metadata = {
  title: 'Becchiamoci 🐔',
  description: 'Organizza quando beccarsi con gli amici',
}

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
