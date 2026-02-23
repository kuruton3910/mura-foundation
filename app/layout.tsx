// app/layout.js
import Link from 'next/link'
import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <header style={{padding: '1rem', backgroundColor: '#f0f0f0'}}>
          <nav>
            <Link href="/" style={{marginRight: '1rem'}}>ホーム</Link>
            <Link href="/products" style={{marginRight: '1rem'}}>商品</Link>
            <Link href="/contact">お問い合わせ</Link>
          </nav>
        </header>
        {children}
        <footer style={{padding: '1rem', textAlign: 'center', backgroundColor: '#f0f0f0'}}>
          © 2024 My Website
        </footer>
      </body>
    </html>
  )
}