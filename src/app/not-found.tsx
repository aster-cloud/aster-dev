import Link from 'next/link';

/**
 * 全局 404（locale 段外的兜底）。保持品牌 token 样式。
 * locale 段内的未匹配路由由 [locale]/layout 的 notFound() 抛到这里。
 */
export default function NotFound() {
  return (
    <html>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#fff',
          color: '#1e293b',
        }}
      >
        <main style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ fontSize: '3rem', fontWeight: 700, margin: 0 }}>404</p>
          <p style={{ color: '#64748b' }}>This page could not be found.</p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.6rem 1.25rem',
              borderRadius: 8,
              background: '#2563eb',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Back to home
          </Link>
        </main>
      </body>
    </html>
  );
}
