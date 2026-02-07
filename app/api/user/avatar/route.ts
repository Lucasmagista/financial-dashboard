import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-simple';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(`avatars/${user.id}-${Date.now()}.${file.type.split('/')[1]}`, file, {
      access: 'public',
    });

    // Update user avatar URL
    const result = await sql`
      UPDATE users 
      SET avatar_url = ${blob.url}, updated_at = NOW()
      WHERE id = ${user.id}
      RETURNING id, email, name, avatar_url
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('[v0] Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}
