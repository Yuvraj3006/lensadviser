import { NextRequest } from 'next/server';
import { handleApiError } from '@/lib/errors';
import { autoTranslateQuestion, autoTranslateAnswer } from '@/lib/translation.service';
import { z } from 'zod';

const translateSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  type: z.enum(['question', 'answer']).default('question'),
});

/**
 * POST /api/admin/translate
 * Auto-translate English text to Hindi and Hinglish
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = translateSchema.parse(body);

    const translator = validated.type === 'question' 
      ? autoTranslateQuestion 
      : autoTranslateAnswer;

    const translations = translator(validated.text);

    return Response.json({
      success: true,
      data: {
        english: validated.text,
        hindi: translations.hindi,
        hinglish: translations.hinglish,
      },
    });
  } catch (error: any) {
    console.error('[translate] Error:', error);
    return handleApiError(error);
  }
}
