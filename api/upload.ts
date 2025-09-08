
// /api/upload.ts
import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // The client will send a JSON body with the filename.
  // Vercel's default body parser handles this automatically.
  const { filename } = request.body;

  if (!filename || typeof filename !== 'string') {
    return response.status(400).json({ error: 'Filename is required in the request body.' });
  }

  try {
    // The `put` function from `@vercel/blob` will generate a signed URL
    // when called without a `body` argument.
    const blob = await put(filename, '', {
      access: 'public',
      // The token is read automatically from the BLOB_READ_WRITE_TOKEN env var.
    });

    // Return the signed URL to the client. The client will use this
    // URL to upload the file directly to Vercel Blob storage.
    return response.status(200).json(blob);
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to create upload URL.';
    return response.status(500).json({ error: message });
  }
}
