import { NextRequest, NextResponse } from 'next/server';
import { createCategory, getCategoriesByUserId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-simple';
import { sanitizeCategoryName, sanitizeColorHex, sanitizeDescription } from '@/lib/sanitization';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await getCategoriesByUserId(user.id);

    return NextResponse.json({ categories });
  } catch (error) {
    logger.error('Error fetching categories', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, color, icon } = body;

    const sanitizedName = sanitizeCategoryName(name);
    const sanitizedColor = sanitizeColorHex(color);
    const sanitizedIcon = sanitizeDescription(icon);

    if (!sanitizedName || !type || !sanitizedColor || !sanitizedIcon) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const category = await createCategory(user.id, sanitizedName, type, sanitizedColor, sanitizedIcon);

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    logger.error('Error creating category', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
