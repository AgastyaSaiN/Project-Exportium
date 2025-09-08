// /api/upload.ts
import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// By exporting this config, we disable the default body parser which is
// required for server-side file uploads.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Ensure the request is a POST request.
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const filename = request.query.filename as string;

  if (!filename) {
    return response.status(400).json({ error: 'Filename is required' });
  }

  try {
    // The VercelRequest object is a stream. The `put` function from @vercel/blob
    // can handle this stream directly.
    const blob = await put(filename, request, {
      access: 'public',
      // The token is read automatically from the BLOB_READ_WRITE_TOKEN environment variable.
    });

    // Return the blob details to the client.
    return response.status(200).json(blob);
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to upload file.';
    return response.status(500).json({ error: message });
  }
}
