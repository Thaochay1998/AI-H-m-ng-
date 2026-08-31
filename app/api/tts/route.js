import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { text, gender } = await req.json();
    if (!text) {
      return NextResponse.json({ error: 'Chưa có nội dung văn bản' }, { status: 400 });
    }

    const audioPath = gender === 'nu' ? '/audio/thuyet-trinh-nu.mp3' : '/audio/thuyet-trinh-nam.mp3';

    return NextResponse.json({ success: true, audioUrl: audioPath, text });
  } catch (err) {
    return NextResponse.json({ error: 'Lỗi xử lý âm thanh' }, { status: 500 });
  }
}
