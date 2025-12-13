/**
 * Analytics Service
 * Tracks user events for the Combo + Regular Purchase Flow
 */

interface AnalyticsEvent {
  eventType: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

class AnalyticsService {
  /**
   * Track an analytics event
   * In production, this would send to an analytics service (e.g., Google Analytics, Mixpanel, etc.)
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    const eventData = {
      ...event,
      timestamp: event.timestamp || new Date(),
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', eventData);
    }

    // TODO: In production, send to analytics service
    // Example:
    // await fetch('https://analytics.example.com/events', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(eventData),
    // });
  }

  /**
   * Questionnaire started
   */
  async questionnaireStarted(sessionId: string): Promise<void> {
    await this.trackEvent({
      eventType: 'questionnaire_started',
      sessionId,
    });
  }

  /**
   * Questionnaire completed
   */
  async questionnaireCompleted(sessionId: string, needsProfile?: any): Promise<void> {
    await this.trackEvent({
      eventType: 'questionnaire_completed',
      sessionId,
      metadata: {
        hasNeedsProfile: !!needsProfile,
      },
    });
  }

  /**
   * Needs profile generated
   */
  async needsProfileGenerated(sessionId: string, needsProfile: any): Promise<void> {
    await this.trackEvent({
      eventType: 'needs_profile_generated',
      sessionId,
      metadata: {
        primaryUsage: needsProfile.primaryUsage,
        screenTime: needsProfile.screenTime,
        backupNeed: needsProfile.backupNeed,
        lensComplexity: needsProfile.lensComplexity,
      },
    });
  }

  /**
   * Path selection viewed
   */
  async pathSelectionViewed(sessionId: string): Promise<void> {
    await this.trackEvent({
      eventType: 'path_selection_viewed',
      sessionId,
    });
  }

  /**
   * Path selected (REGULAR or COMBO)
   */
  async pathSelected(sessionId: string, path: 'REGULAR' | 'COMBO'): Promise<void> {
    await this.trackEvent({
      eventType: 'path_selected',
      sessionId,
      metadata: {
        path,
      },
    });
  }

  /**
   * Combo cards viewed
   */
  async comboCardsViewed(sessionId: string, tierCount: number): Promise<void> {
    await this.trackEvent({
      eventType: 'combo_cards_viewed',
      sessionId,
      metadata: {
        tierCount,
      },
    });
  }

  /**
   * Combo tier selected
   */
  async comboTierSelected(sessionId: string, tierCode: string, tierVersion: number): Promise<void> {
    await this.trackEvent({
      eventType: 'combo_tier_selected',
      sessionId,
      metadata: {
        tierCode,
        tierVersion,
      },
    });
  }

  /**
   * Upgrade prompt shown
   */
  async upgradePromptShown(
    sessionId: string,
    triggerType: 'BRAND_NOT_ELIGIBLE' | 'LENS_NOT_ELIGIBLE' | 'NEEDS_MISMATCH' | 'BOTH_OPTIONS',
    fromTier: string,
    toTier: string
  ): Promise<void> {
    await this.trackEvent({
      eventType: 'upgrade_prompt_shown',
      sessionId,
      metadata: {
        triggerType,
        fromTier,
        toTier,
      },
    });
  }

  /**
   * Upgrade accepted
   */
  async upgradeAccepted(sessionId: string, fromTier: string, toTier: string): Promise<void> {
    await this.trackEvent({
      eventType: 'upgrade_accepted',
      sessionId,
      metadata: {
        fromTier,
        toTier,
      },
    });
  }

  /**
   * Upgrade rejected
   */
  async upgradeRejected(sessionId: string, fromTier: string, toTier: string): Promise<void> {
    await this.trackEvent({
      eventType: 'upgrade_rejected',
      sessionId,
      metadata: {
        fromTier,
        toTier,
      },
    });
  }

  /**
   * Switched to regular from combo
   */
  async switchedToRegularFromCombo(sessionId: string): Promise<void> {
    await this.trackEvent({
      eventType: 'switched_to_regular_from_combo',
      sessionId,
    });
  }

  /**
   * Checkout completed
   */
  async checkoutCompleted(
    sessionId: string,
    orderId: string,
    purchaseContext: 'REGULAR' | 'COMBO' | 'YOPO',
    finalPrice: number
  ): Promise<void> {
    await this.trackEvent({
      eventType: 'checkout_completed',
      sessionId,
      metadata: {
        orderId,
        purchaseContext,
        finalPrice,
      },
    });
  }
}

export const analyticsService = new AnalyticsService();

