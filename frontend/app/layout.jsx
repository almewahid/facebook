import './globals.css'

export const metadata = {
  title: 'Facebook Auto Poster Dashboard',
  description: 'لوحة تحكم البوت الذكي للنشر التلقائي في مجموعات فيسبوك',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
