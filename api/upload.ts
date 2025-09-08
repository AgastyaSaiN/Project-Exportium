// /api/upload.ts
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }
  
  if (!request.body) {
    return NextResponse.json({ error: 'File body is required' }, { status: 400 });
  }

  try {
    // This is a server-side upload. The file is streamed from the client,
    // through this function, to Vercel Blob.
    // NOTE: Vercel serverless functions have a maximum payload size (e.g., 4.5 MB on Hobby plan).
    // For larger files, a client-side upload approach is recommended.
    const blob = await put(filename, request.body, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to upload blob';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
