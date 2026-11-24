import { NextResponse } from 'next/server';
import { notifyResidents } from '@/app/actions/notify';

export async function POST(req: Request) {
  const secret = req.headers.get('x-webhook-secret');
  if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await req.json();
  const record = payload.record;
  const oldRecord = payload.old_record;

  const newlyPushed =
    record?.isPushed === true && oldRecord?.isPushed === false;

  if (!newlyPushed) {
    return NextResponse.json({ ignored: true });
  }

  const result = await notifyResidents({
    id: record.id,
    title: record.title,
    description: record.description,
  });

  return NextResponse.json(result);
}
