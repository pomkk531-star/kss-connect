import { NextResponse } from 'next/server'

const maintenanceHtml = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>KSS Connect — Maintenance</title>
  <style>
    html,body{height:100%;margin:0}
    body{display:flex;align-items:center;justify-content:center;background:#f3f7f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;color:#0f5132}
    .card{max-width:640px;width:92%;background:#fff;border:1px solid #d1e7dd;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,.08);padding:28px;text-align:center}
    .badge{display:inline-block;margin-bottom:10px;background:#198754;color:#fff;border-radius:999px;padding:6px 12px;font-weight:600}
    h1{margin:6px 0 8px;font-size:1.6rem}
    p{margin:0 0 4px;line-height:1.6;color:#155724}
    small{color:#5c6f65}
  </style>
  <meta http-equiv="Cache-Control" content="no-store" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
  <meta name="robots" content="noindex" />
</head>
<body>
  <div class="card">
    <span class="badge">Service Paused</span>
    <h1>ระบบอยู่ระหว่างปิดให้บริการชั่วคราว</h1>
    <p>ขออภัยในความไม่สะดวก ขณะนี้กำลังปิดระบบบน Vercel ชั่วคราว</p>
    <p>กรุณาลองใหม่อีกครั้งภายหลัง</p>
    <small>HTTP 503 — Maintenance</small>
  </div>
</body>
</html>`

export function middleware() {
  // เมื่อรันบน Vercel ให้ส่งหน้า Maintenance พร้อมสถานะ 503
  if (process.env.VERCEL === '1') {
    return new NextResponse(maintenanceHtml, {
      status: 503,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }
  // ในเครื่องนักพัฒนา (dev) ให้ทำงานตามปกติ
  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}
