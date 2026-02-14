import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, message, email } = body as { category?: string; message?: string; email?: string };

    if (!category || !message?.trim()) {
      return NextResponse.json({ error: 'category and message are required' }, { status: 400 });
    }

    if (!['bug', 'feature', 'general'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const db = await ensureDb();
    await db.execute({
      sql: 'INSERT INTO support_messages (category, message, email) VALUES (?, ?, ?)',
      args: [category, message.trim(), email?.trim() || null],
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Support submission failed:', err);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
