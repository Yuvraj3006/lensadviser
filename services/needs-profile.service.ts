/**
 * Needs Profile Service
 * Generates NeedsProfile from questionnaire answers
 */

import { prisma } from '@/lib/prisma';

export interface NeedsProfileData {
  primary_usage?: 'DAILY' | 'SCREEN' | 'DRIVING' | 'OUTDOOR';
  screen_time?: 'LOW' | 'MEDIUM' | 'HIGH';
  driving_night?: boolean;
  outdoor_frequency?: 'LOW' | 'MEDIUM' | 'HIGH';
  backup_need?: boolean;
  lens_complexity?: 'BASIC' | 'ADVANCED' | 'PREMIUM';
  sensitivity_flags?: string[]; // e.g., ["GLARE", "DRY_EYES"]
  recommend_second_eyewear?: boolean;
}

export class NeedsProfileService {
  /**
   * Generate NeedsProfile from session answers
   */
  async generateNeedsProfile(sessionId: string): Promise<NeedsProfileData> {
    // Get all answers for this session
    const sessionAnswers = await prisma.sessionAnswer.findMany({
      where: { sessionId },
    });

    const profile: NeedsProfileData = {
      sensitivity_flags: [],
    };

    // Get all option and question IDs
    const optionIds = [...new Set(sessionAnswers.map((a) => a.optionId))];
    const questionIds = [...new Set(sessionAnswers.map((a) => a.questionId))];
    
    // Fetch options and questions in bulk
    const options = await prisma.answerOption.findMany({
      where: { id: { in: optionIds } },
      include: { question: true },
    });
    
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
    });
    
    // Create maps for lookup
    const optionMap = new Map(options.map((o) => [o.id, o]));
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // Analyze answers to build profile
    for (const answer of sessionAnswers) {
      const option = optionMap.get(answer.optionId);
      const question = questionMap.get(answer.questionId);
      
      if (!option || !question) continue;
      
      const questionKey = question.key?.toLowerCase() || '';
      const optionText = (option.textEn || option.text || '').toLowerCase();

      // Screen time detection
      if (questionKey.includes('screen') || questionKey.includes('computer') || questionKey.includes('digital')) {
        if (optionText.includes('high') || optionText.includes('8') || optionText.includes('more')) {
          profile.screen_time = 'HIGH';
        } else if (optionText.includes('medium') || optionText.includes('4') || optionText.includes('moderate')) {
          profile.screen_time = 'MEDIUM';
        } else {
          profile.screen_time = 'LOW';
        }
      }

      // Driving/Night driving
      if (questionKey.includes('driving') || questionKey.includes('night')) {
        if (optionText.includes('night') || optionText.includes('yes')) {
          profile.driving_night = true;
        }
        if (questionKey.includes('driving')) {
          profile.primary_usage = 'DRIVING';
        }
      }

      // Outdoor frequency
      if (questionKey.includes('outdoor') || questionKey.includes('sun')) {
        if (optionText.includes('high') || optionText.includes('frequent') || optionText.includes('daily')) {
          profile.outdoor_frequency = 'HIGH';
        } else if (optionText.includes('medium') || optionText.includes('sometimes')) {
          profile.outdoor_frequency = 'MEDIUM';
        } else {
          profile.outdoor_frequency = 'LOW';
        }
        if (questionKey.includes('outdoor')) {
          profile.primary_usage = 'OUTDOOR';
        }
      }

      // Backup need / Second eyewear
      if (questionKey.includes('backup') || questionKey.includes('second') || questionKey.includes('spare')) {
        if (optionText.includes('yes') || optionText.includes('need')) {
          profile.backup_need = true;
          profile.recommend_second_eyewear = true;
        }
      }

      // Lens complexity (based on features/benefits)
      if (questionKey.includes('blue') || questionKey.includes('glare') || questionKey.includes('anti')) {
        if (!profile.sensitivity_flags) profile.sensitivity_flags = [];
        if (optionText.includes('glare')) profile.sensitivity_flags.push('GLARE');
        if (optionText.includes('blue') || optionText.includes('screen')) profile.sensitivity_flags.push('BLUE_LIGHT');
      }

      // Primary usage detection
      if (questionKey.includes('primary') || questionKey.includes('main') || questionKey.includes('usage')) {
        if (optionText.includes('screen') || optionText.includes('computer') || optionText.includes('digital')) {
          profile.primary_usage = 'SCREEN';
        } else if (optionText.includes('daily') || optionText.includes('general')) {
          profile.primary_usage = 'DAILY';
        }
      }
    }

    // Determine lens complexity based on needs
    if (!profile.lens_complexity) {
      const hasAdvancedNeeds = 
        profile.screen_time === 'HIGH' ||
        profile.driving_night === true ||
        (profile.sensitivity_flags && profile.sensitivity_flags.length > 1);
      
      const hasPremiumNeeds =
        profile.backup_need === true &&
        (profile.screen_time === 'HIGH' || profile.driving_night === true);

      if (hasPremiumNeeds) {
        profile.lens_complexity = 'PREMIUM';
      } else if (hasAdvancedNeeds) {
        profile.lens_complexity = 'ADVANCED';
      } else {
        profile.lens_complexity = 'BASIC';
      }
    }

    // Default values
    if (!profile.primary_usage) profile.primary_usage = 'DAILY';
    if (!profile.screen_time) profile.screen_time = 'LOW';
    if (profile.driving_night === undefined) profile.driving_night = false;
    if (!profile.outdoor_frequency) profile.outdoor_frequency = 'LOW';
    if (profile.backup_need === undefined) profile.backup_need = false;
    if (!profile.recommend_second_eyewear) profile.recommend_second_eyewear = false;
    if (!profile.sensitivity_flags) profile.sensitivity_flags = [];

    return profile;
  }

  /**
   * Save NeedsProfile to database
   */
  async saveNeedsProfile(sessionId: string, profile: NeedsProfileData): Promise<void> {
    // Check if profile already exists
    const existing = await prisma.needsProfile.findUnique({
      where: { sessionId },
    });

    if (existing) {
      // Update existing
      await prisma.needsProfile.update({
        where: { sessionId },
        data: {
          primaryUsage: profile.primary_usage,
          screenTime: profile.screen_time,
          drivingNight: profile.driving_night || false,
          outdoorFrequency: profile.outdoor_frequency,
          backupNeed: profile.backup_need || false,
          lensComplexity: profile.lens_complexity,
          sensitivityFlags: profile.sensitivity_flags || [],
          recommendSecondEyewear: profile.recommend_second_eyewear || false,
        },
      });
    } else {
      // Create new
      await prisma.needsProfile.create({
        data: {
          sessionId,
          primaryUsage: profile.primary_usage,
          screenTime: profile.screen_time,
          drivingNight: profile.driving_night || false,
          outdoorFrequency: profile.outdoor_frequency,
          backupNeed: profile.backup_need || false,
          lensComplexity: profile.lens_complexity,
          sensitivityFlags: profile.sensitivity_flags || [],
          recommendSecondEyewear: profile.recommend_second_eyewear || false,
        },
      });
    }
  }
}

export const needsProfileService = new NeedsProfileService();

