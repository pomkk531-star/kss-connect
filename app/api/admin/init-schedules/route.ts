import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // Simple check - in production you'd want proper auth
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== 'Bearer secret-init-key') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize schedules endpoint
    return NextResponse.json({ 
      ok: true, 
      message: `✅ สำเร็จ! เตรียมตารางเรียมแล้ว`
    });
  } catch (error: any) {
    console.error('Initialization error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
