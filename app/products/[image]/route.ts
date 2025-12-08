import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Serve product images with correct content-type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ image: string }> }
) {
  try {
    const { image } = await params;
    
    // Validate image name to prevent path traversal
    if (!image || image.includes('..') || image.includes('/')) {
      return new Response('Invalid image name', { status: 400 });
    }

    // Map of image files
    const imageMap: Record<string, string> = {
      'classic-blue.jpg': join(process.cwd(), 'public', 'products', 'classic-blue.jpg'),
      'premium-antiglare.jpg': join(process.cwd(), 'public', 'products', 'premium-antiglare.jpg'),
      'progressive.jpg': join(process.cwd(), 'public', 'products', 'progressive.jpg'),
      'budget.jpg': join(process.cwd(), 'public', 'products', 'budget.jpg'),
    };

    const filePath = imageMap[image];
    if (!filePath) {
      return new Response('Image not found', { status: 404 });
    }

    try {
      const fileContent = await readFile(filePath, 'utf-8');
      
      // Return SVG with correct content-type
      return new Response(fileContent, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (error) {
      console.error(`Error reading image ${image}:`, error);
      return new Response('Image not found', { status: 404 });
    }
  } catch (error) {
    console.error('Error serving image:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

