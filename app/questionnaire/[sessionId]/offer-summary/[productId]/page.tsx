'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { 
  ArrowLeft,
  ShoppingCart,
  CheckCircle,
  Gift,
  Tag,
  Percent,
  Package,
  ArrowRight,
  Eye,
  X,
  Sparkles,
  Upload,
  User,
  UserCheck,
  Users,
  Glasses,
  Sun,
  Palette,
} from 'lucide-react';
import { OfferCalculationResult, OfferApplied } from '@/types/offer-engine';

/** BOGO: what kind of 2nd product the customer wants (drives brand + lens catalog) */
type SecondPairProductKind = 'EYEGLASS' | 'SUNGLASS' | 'POWER_SUNGLASS';

interface OfferDetail {
  type: string;
  code: string;
  title: string;
  description: string;
  discountAmount?: number;
  explanation: string;
}

interface OfferSummaryData {
  sessionId: string;
  selectedLens: {
    id: string;
    name: string;
    index: string;
    price: number;
    brandLine?: string;
    /** Same as 1st-pair lens / recommendation (e.g. SINGLE_VISION) — used to filter 2nd-pair list */
    visionType?: string;
    /** Prisma lensIndex enum, e.g. INDEX_160 */
    lensIndex?: string;
  };
  selectedFrame: {
    brand: string;
    subBrand?: string | null;
    mrp: number;
    frameType?: string;
  };
  offerResult: OfferCalculationResult;
  allApplicableOffers?: any[]; // All offers from recommendations
}

/** First item in `offersApplied` is the primary price rule (YOPO, %, etc.); YOPO + BOGO/2nd pair are mutually exclusive */
function isYOPOPrimaryOffer(offerResult: OfferCalculationResult | null | undefined): boolean {
  const p = offerResult?.offersApplied?.[0];
  if (!p) return false;
  const s = ((p.ruleCode || '') + ' ' + (p.description || '')).toUpperCase();
  return s.includes('YOPO');
}

/** Map stored `secondPairOtherRx` to `recalculate-offers` `secondPairPrescription` (must match `buildSecondPairPrescriptionForApi` shape) */
function secondPairOtherRxToApiBody(
  p: { odSphere?: string; osSphere?: string; odCylinder?: string; osCylinder?: string; odAdd?: string }
) {
  return {
    odSphere: p.odSphere ? parseFloat(p.odSphere) : 0,
    osSphere: p.osSphere ? parseFloat(p.osSphere) : 0,
    odCylinder: p.odCylinder ? parseFloat(p.odCylinder) : 0,
    osCylinder: p.osCylinder ? parseFloat(p.osCylinder) : 0,
    rSph: p.odSphere ? parseFloat(p.odSphere) : 0,
    lSph: p.osSphere ? parseFloat(p.osSphere) : 0,
    rCyl: p.odCylinder ? parseFloat(p.odCylinder) : 0,
    lCyl: p.osCylinder ? parseFloat(p.osCylinder) : 0,
    add: p.odAdd != null && p.odAdd !== '' ? parseFloat(p.odAdd) : 0,
  };
}

/**
 * If session has merged 2nd-pair data (not in “other person questionnaire in progress”),
 * returns payload for recalculate-offers; else null.
 */
function sessionSecondPairDataToRecalcInfo(spd: Record<string, unknown> | null | undefined):
  | {
      secondPair: {
        enabled: boolean;
        firstPairTotal: number;
        secondPairFrameMRP: number;
        secondPairLensPrice: number;
        lensId?: string;
      };
      secondPairPrescription?: ReturnType<typeof secondPairOtherRxToApiBody>;
    }
  | null {
  if (!spd || spd.enabled !== true) return null;
  if (spd.bogoSecondPersonInProgress === true) return null;
  const frameMRP = Number(spd.frameMRP) || 0;
  if (frameMRP <= 0) return null;
  const isReadySun = spd.readyMadeSunglasses === true || spd.secondPairProductKind === 'SUNGLASS';
  if (isReadySun) {
    return {
      secondPair: {
        enabled: true,
        firstPairTotal: 0, // set by caller to first offer baseTotal
        secondPairFrameMRP: frameMRP,
        secondPairLensPrice: 0,
      },
    };
  }
  if (!spd.lensId) return null;
  if (Number(spd.lensPrice ?? 0) < 0) return null;
  let secondPairPrescription: ReturnType<typeof secondPairOtherRxToApiBody> | undefined;
  if (spd.lensRecipient === 'other' && spd.secondPairOtherRx) {
    secondPairPrescription = secondPairOtherRxToApiBody(
      spd.secondPairOtherRx as {
        odSphere?: string;
        osSphere?: string;
        odCylinder?: string;
        osCylinder?: string;
        odAdd?: string;
      }
    );
  }
  return {
    secondPair: {
      enabled: true,
      firstPairTotal: 0,
      secondPairFrameMRP: frameMRP,
      secondPairLensPrice: Number(spd.lensPrice ?? 0),
      lensId: String(spd.lensId),
    },
    secondPairPrescription,
  };
}

/** Map Prisma `LensIndex` to display refraction index */
function formatLensIndexDisplay(raw: string | undefined | null): string {
  if (!raw) return '—';
  const map: Record<string, string> = {
    INDEX_156: '1.56',
    INDEX_160: '1.60',
    INDEX_167: '1.67',
    INDEX_174: '1.74',
  };
  return map[raw] || String(raw).replace(/^INDEX_/, '').replace('_', '.');
}

function humanizeLensEnum(raw: string | undefined | null): string {
  if (!raw) return '—';
  return String(raw)
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

type SecondPairLensRow = {
  id: string;
  itCode?: string;
  name: string;
  brandLine?: string;
  index?: string;
  price?: number;
  yopoEligible?: boolean;
  visionType?: string;
  tintOption?: string;
  category?: string;
  deliveryDays?: number;
};

/** Full tint row for 2nd-pair power-sun chart (from /api/public/tint-colors) */
type TintChartColor = {
  id: string;
  name: string;
  code: string;
  hexColor?: string | null;
  imageUrl?: string | null;
  category: string;
  darknessPercent: number;
  isPolarized: boolean;
};

const LENS_INDEX_ENUM_SET = new Set(['INDEX_156', 'INDEX_160', 'INDEX_167', 'INDEX_174']);

function displayIndexStringToLensEnum(s: string | undefined | null): string | null {
  if (!s) return null;
  if (LENS_INDEX_ENUM_SET.has(s)) return s;
  const norm = String(s).replace(/\s/g, '');
  const map: Record<string, string> = {
    '1.50': 'INDEX_156',
    '1.56': 'INDEX_156',
    '1.60': 'INDEX_160',
    '1.67': 'INDEX_167',
    '1.74': 'INDEX_174',
  };
  return map[norm] || null;
}

export default function OfferSummaryPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const sessionId = params?.sessionId as string;
  const productId = params?.productId as string;

  const [data, setData] = useState<OfferSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEligibleProducts, setShowEligibleProducts] = useState(false);
  const [eligibleProducts, setEligibleProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [applyingCategory, setApplyingCategory] = useState(false);
  const [appliedCategory, setAppliedCategory] = useState<string | null>(null);
  const [categoryIdImage, setCategoryIdImage] = useState<File | null>(null);
  const [categoryIdImagePreview, setCategoryIdImagePreview] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [allApplicableOffersList, setAllApplicableOffersList] = useState<any[]>([]);
  
  // Second pair selection state
  const [secondPairEnabled, setSecondPairEnabled] = useState(false);
  const [secondPairFrameMRP, setSecondPairFrameMRP] = useState('');
  const [secondPairBrand, setSecondPairBrand] = useState('');
  const [secondPairSubBrand, setSecondPairSubBrand] = useState('');
  const [secondPairLensId, setSecondPairLensId] = useState('');
  const [secondPairLensPrice, setSecondPairLensPrice] = useState(0);
  const [showLensSelectionModal, setShowLensSelectionModal] = useState(false);
  const [availableLenses, setAvailableLenses] = useState<any[]>([]);
  const [loadingLenses, setLoadingLenses] = useState(false);
  const [frameBrands, setFrameBrands] = useState<any[]>([]);
  const [availableSubBrands, setAvailableSubBrands] = useState<string[]>([]);
  const [selectedOfferType, setSelectedOfferType] = useState<string | null>(null);
  const [isOnlyLensFlow, setIsOnlyLensFlow] = useState(false);
  /** BOGO: who the 2nd pair of lenses is for (shown before lens picker) */
  const [secondPairLensRecipient, setSecondPairLensRecipient] = useState<'self' | 'other' | null>(null);
  const [showSecondPairRecipientModal, setShowSecondPairRecipientModal] = useState(false);
  /** Eyeglass + “someone else”: first pick recipient, then choose full merge flow vs catalog (only in modal) */
  const [bogoSecondPairModalScreen, setBogoSecondPairModalScreen] = useState<'who' | 'eyeglassOtherHow'>('who');
  /** BOGO: eyeglass vs sunglass vs power sunglasses for 2nd pair (frames + lens list) */
  const [secondPairProductKind, setSecondPairProductKind] = useState<SecondPairProductKind>('EYEGLASS');
  /** POWER_SUNGLASS: Rx when 2nd pair is for another person (maps to API secondPairPrescription) */
  const [secondPairOtherRx, setSecondPairOtherRx] = useState<{
    odSphere: string; osSphere: string; odCylinder: string; osCylinder: string; odAdd: string;
  } | null>(null);
  /** After lens pick for power sun — shade (tint + optional mirror) */
  const [secondPairTintSelection, setSecondPairTintSelection] = useState<{
    tintColorId: string; tintName: string; mirrorCoatingId: string | null; mirrorAddOn: number; tintAddOn?: number;
  } | null>(null);
  const [showSecondPairRxModal, setShowSecondPairRxModal] = useState(false);
  const [showSecondPairTintModal, setShowSecondPairTintModal] = useState(false);
  const [tintModalColors, setTintModalColors] = useState<TintChartColor[]>([]);
  const [tintModalMirrors, setTintModalMirrors] = useState<
    { id: string; name: string; addOnPrice: number; imageUrl?: string | null }[]
  >([]);
  const [pendingPowerSunLens, setPendingPowerSunLens] = useState<{
    id: string; price: number; name: string; index?: string;
  } | null>(null);
  const [tintFormPick, setTintFormPick] = useState<{
    tintId: string | null; mirrorId: string | null;
  }>({ tintId: null, mirrorId: null });
  const [tintColorPrices, setTintColorPrices] = useState<Record<string, number>>({});
  const [tintPricesLoading, setTintPricesLoading] = useState(false);
  /** Org override: 2nd-pair power-sun lens base (tint + mirror stack), when set; else 1st-pair lens price */
  const [bogoPowerSunSecondPairLensBasePrice, setBogoPowerSunSecondPairLensBasePrice] = useState<
    number | null
  >(null);
  const [startingBogoChildQuestionnaire, setStartingBogoChildQuestionnaire] = useState(false);

  useEffect(() => {
    if (sessionId && productId) {
      fetchOfferSummary();
      fetchAvailableCategories();
    }
  }, [sessionId, productId]);

  // Auto-enable second pair when BOGO is available — but never when YOPO is the active primary or user picked a non-BOGO offer
  useEffect(() => {
    if (!data?.offerResult?.availableBOGORule || secondPairEnabled) return;
    if (isYOPOPrimaryOffer(data.offerResult)) {
      return;
    }
    if (selectedOfferType && selectedOfferType !== 'BOGO' && selectedOfferType !== 'BOG50') {
      return;
    }
    console.log('[OfferSummary] Auto-enabling second pair for BOGO offer');
    setSecondPairEnabled(true);
  }, [data?.offerResult, data?.offerResult?.availableBOGORule, secondPairEnabled, selectedOfferType]);

  // ✅ Save second pair data to session database whenever it changes (best practice)
  useEffect(() => {
    // Don't save if we're in the middle of restoring (to avoid overwriting)
    if (!data || !data.offerResult) return;
    
    const saveSecondPairToDatabase = async () => {
      const mrp = parseFloat(secondPairFrameMRP) || 0;
      const canSaveSunglass =
        secondPairEnabled &&
        secondPairProductKind === 'SUNGLASS' &&
        mrp > 0 &&
        !!secondPairBrand;
      const canSaveEyeglass =
        secondPairEnabled &&
        secondPairProductKind === 'EYEGLASS' &&
        mrp > 0 &&
        !!secondPairBrand &&
        !!secondPairLensId &&
        secondPairLensPrice >= 0;
      const canSavePower =
        secondPairEnabled &&
        secondPairProductKind === 'POWER_SUNGLASS' &&
        mrp > 0 &&
        !!secondPairBrand &&
        !!secondPairLensId &&
        secondPairLensPrice >= 0 &&
        !!secondPairTintSelection;

      if (canSaveSunglass || canSaveEyeglass || canSavePower) {
        const selectedLens = availableLenses.find((l) => l.id === secondPairLensId);
        const baseData: Record<string, unknown> = {
          enabled: true,
          frameMRP: mrp,
          brand: secondPairBrand,
          subBrand: secondPairSubBrand,
          secondPairProductKind,
          lensRecipient: secondPairLensRecipient,
        };
        if (secondPairProductKind === 'SUNGLASS') {
          baseData.lensName = 'Ready-made sunglasses (no separate lens selection)';
          baseData.lensId = '';
          baseData.lensPrice = 0;
          baseData.readyMadeSunglasses = true;
        } else {
          baseData.lensId = secondPairLensId;
          baseData.lensName = selectedLens?.name || 'Lens';
          baseData.lensPrice = secondPairLensPrice;
        }
        if (secondPairProductKind === 'POWER_SUNGLASS') {
          if (secondPairOtherRx) baseData.secondPairOtherRx = secondPairOtherRx;
          if (secondPairTintSelection) baseData.tintSelection = secondPairTintSelection;
        }
        const secondPairData = baseData as any;
        try {
          const response = await fetch(`/api/public/questionnaire/sessions/${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              secondPairData: secondPairData,
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('[OfferSummary] ✅ Saved second pair data to session database:', secondPairData);
            console.log('[OfferSummary] Database response:', result);
          } else {
            const errorText = await response.text();
            console.warn('[OfferSummary] ⚠️ Failed to save second pair data to database:', response.status, errorText);
          }
        } catch (error) {
          console.error('[OfferSummary] Error saving second pair data:', error);
        }
      } else if (!secondPairEnabled) {
        // Clear if disabled
        try {
          const response = await fetch(`/api/public/questionnaire/sessions/${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              secondPairData: null,
            }),
          });
          
          if (response.ok) {
            console.log('[OfferSummary] ✅ Cleared second pair data from session database');
          } else {
            const errorText = await response.text();
            console.warn('[OfferSummary] ⚠️ Failed to clear second pair data:', response.status, errorText);
          }
        } catch (error) {
          console.error('[OfferSummary] Error clearing second pair data:', error);
        }
      }
    };
    
    // Debounce to avoid too many API calls
    const timeoutId = setTimeout(saveSecondPairToDatabase, 500);
    return () => clearTimeout(timeoutId);
  }, [sessionId, secondPairEnabled, secondPairFrameMRP, secondPairBrand, secondPairSubBrand, secondPairLensId, secondPairLensPrice, secondPairLensRecipient, secondPairProductKind, secondPairOtherRx, secondPairTintSelection, availableLenses, data]);

  const fetchAvailableCategories = async () => {
    try {
      console.log('[OfferSummary] Fetching categories...');
      
      // Method 1: Try to get organizationId from session (database) - NOT from localStorage
      let organizationId: string | null = null;
      let storeCode: string | null = null;
      
      // Get store code from session
      try {
        const sessionResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.success && sessionData.data?.session?.storeId) {
            // Get store details to get organizationId
            const storeResponse = await fetch(`/api/public/verify-store?storeId=${sessionData.data.session.storeId}`);
            if (storeResponse.ok) {
              const storeData = await storeResponse.json();
              if (storeData.success && storeData.data?.organizationId) {
                organizationId = storeData.data.organizationId;
                storeCode = storeData.data.code;
                console.log('[OfferSummary] ✅ Got organizationId from session->store:', organizationId);
              }
            }
          }
        }
      } catch (e) {
        console.warn('[OfferSummary] Could not get organizationId from session:', e);
      }
      
      // Fallback: Try store verification with localStorage store code (only if session method failed)
      if (!organizationId) {
        const fallbackStoreCode = localStorage.getItem('lenstrack_store_code');
        if (fallbackStoreCode) {
          try {
            console.log('[OfferSummary] Fallback: Trying store verification with localStorage code:', fallbackStoreCode);
            const verifyResponse = await fetch(`/api/public/verify-store?code=${fallbackStoreCode}`);
            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              if (verifyData.success && verifyData.data?.organizationId) {
                organizationId = verifyData.data.organizationId;
                storeCode = verifyData.data.code;
                console.log('[OfferSummary] ✅ Got organizationId from localStorage fallback:', organizationId);
              }
            }
          } catch (e) {
            console.warn('[OfferSummary] Fallback store verification error:', e);
          }
        }
      }
      
      if (!organizationId) {
        console.error('[OfferSummary] Could not determine organizationId for categories');
        console.error('[OfferSummary] Store code in localStorage:', storeCode);
        return;
      }
      
      console.log('[OfferSummary] Fetching category discounts for organizationId:', organizationId);
      const catResponse = await fetch(`/api/admin/offers/category-discounts?organizationId=${organizationId}`);
      
      console.log('[OfferSummary] Category discounts response status:', catResponse.status);
      
      if (!catResponse.ok) {
        const errorText = await catResponse.text();
        console.error('[OfferSummary] Category discounts API error:', catResponse.status, errorText);
        if (catResponse.status === 404) {
          console.warn('[OfferSummary] Category discounts endpoint not found (404)');
        } else if (catResponse.status === 401 || catResponse.status === 403) {
          console.warn('[OfferSummary] Category discounts API requires authentication');
        } else {
          console.warn('[OfferSummary] Failed to fetch category discounts:', catResponse.status);
        }
        return;
      }
      
      const catContentType = catResponse.headers.get('content-type');
      if (!catContentType || !catContentType.includes('application/json')) {
        const responseText = await catResponse.text();
        console.warn('[OfferSummary] Category discounts returned non-JSON response:', responseText.substring(0, 200));
        return;
      }
      
      const catData = await catResponse.json();
      console.log('[OfferSummary] Category discounts API response:', catData);
      
      if (catData.success && catData.data) {
        const categories = catData.data || [];
        setAvailableCategories(categories);
        console.log('[OfferSummary] ✅ Loaded categories:', categories.length, categories);
      } else {
        console.warn('[OfferSummary] Category discounts API returned unsuccessful response:', catData);
      }
    } catch (error) {
      console.error('[OfferSummary] ❌ Failed to fetch categories:', error);
    }
  };

  const fetchOfferSummary = async () => {
    setLoading(true);
    try {
      // ✅ IMPORTANT: Load ALL data from session (database) ONLY - NO localStorage
      // This ensures that stale data from previous sessions is not used
      let customerCategoryToUse: string | null = null;
      let isOnlyLensFlowCheck = false; // Local variable to check synchronously
      let sessionNotes: any = null; // Store session notes for frame/tint data
      let sessionRow: { secondPairData?: unknown; category?: string } | null = null;
      
      // Get from session (database) ONLY - no localStorage fallback
      try {
        const sessionResponse = await fetch(
          `/api/public/questionnaire/sessions/${sessionId}`
        );
        if (sessionResponse.ok) {
          const sessionDataResponse = await sessionResponse.json();
          if (sessionDataResponse.success && sessionDataResponse.data?.session) {
            const session = sessionDataResponse.data.session;
            sessionRow = session;
            const orgBogo = sessionDataResponse.data
              .bogoPowerSunSecondPairLensBasePrice as number | null | undefined;
            if (typeof orgBogo === 'number' && orgBogo > 0) {
              setBogoPowerSunSecondPairLensBasePrice(orgBogo);
            } else {
              setBogoPowerSunSecondPairLensBasePrice(null);
            }

            // Extract session notes (frame, tint, prescription data stored in customerEmail)
            sessionNotes = session.customerEmail as any;
            
            // Check if it's an only lens flow - store in local variable for immediate use
            isOnlyLensFlowCheck = session.category === 'ONLY_LENS';
            setIsOnlyLensFlow(isOnlyLensFlowCheck);
            
            if (isOnlyLensFlowCheck) {
              console.log('[OfferSummary] ✅ Detected ONLY_LENS flow - will not load frame data');
            }
            
            if (session.customerCategory) {
              customerCategoryToUse = session.customerCategory;
              console.log('[OfferSummary] ✅ Loaded category discount from session (database):', customerCategoryToUse);
              // Sync appliedCategory state with session data
              setAppliedCategory(customerCategoryToUse);
            } else {
              console.log('[OfferSummary] No category discount in session (database)');
              // Clear appliedCategory if session doesn't have it
              setAppliedCategory(null);
            }
          } else {
            setBogoPowerSunSecondPairLensBasePrice(null);
          }
        } else {
          setBogoPowerSunSecondPairLensBasePrice(null);
        }
      } catch (sessionError) {
        console.warn('[OfferSummary] Could not load from session:', sessionError);
        // Don't use localStorage as fallback - if session doesn't have it, it's not applied
        setAppliedCategory(null);
        setBogoPowerSunSecondPairLensBasePrice(null);
      }
      
      // ✅ REMOVED: localStorage check - we only use session database to prevent stale data
      
      // Get selected product from recommendations
      const recommendationsResponse = await fetch(
        `/api/public/questionnaire/sessions/${sessionId}/recommendations`
      );
      
      if (!recommendationsResponse.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const recommendationsData = await recommendationsResponse.json();
      if (!recommendationsData.success) {
        throw new Error('Failed to load recommendations');
      }

      const selectedRec = recommendationsData.data.recommendations.find(
        (r: any) => r.id === productId
      );

      if (!selectedRec) {
        throw new Error('Selected product not found');
      }

      // ✅ Get frame data from session (database) - NOT from localStorage
      // Frame data is stored in session.customerEmail as JSON
      let frameData: any = {};
      if (sessionNotes?.frame && !isOnlyLensFlowCheck) {
        frameData = sessionNotes.frame;
        console.log('[OfferSummary] ✅ Loaded frame data from session (database):', frameData);
      } else {
        frameData = {}; // Use empty object for only lens flow or when no frame data
        console.log('[OfferSummary] No frame data in session (database) or only lens flow');
      }
      
      // ✅ Get tint selection from session (database) - NOT from localStorage
      // Tint selection should be stored in session if needed, otherwise null
      const tintData = sessionNotes?.tintSelection || null;
      
      // Calculate offers using offer engine (all data from session/database)
      const offersResponse = await fetch(
        `/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: productId,
            couponCode: null,
            customerCategory: customerCategoryToUse,
            secondPair: null,
            tintSelection: tintData, // Include tint selection for mirror add-on price
          }),
        }
      );

      if (!offersResponse.ok) {
        throw new Error('Failed to calculate offers');
      }

      const offersData = await offersResponse.json();
      
      if (!offersData.success || !offersData.data) {
        throw new Error('Failed to load offer calculation');
      }

      let offerResult: OfferCalculationResult = offersData.data;

      // If session already has merged 2nd-pair (BOGO) data, recalc immediately so price breakdown + BOGO aren’t empty
      const spd0 = sessionRow?.secondPairData as Record<string, unknown> | undefined;
      const mergedRecalc = spd0 ? sessionSecondPairDataToRecalcInfo(spd0) : null;
      if (mergedRecalc) {
        mergedRecalc.secondPair.firstPairTotal = offerResult.baseTotal;
        const bogoT = offerResult.availableBOGORule?.offerType || 'BOGO';
        try {
          const r2 = await fetch(`/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: productId,
              couponCode: null,
              customerCategory: customerCategoryToUse,
              secondPair: mergedRecalc.secondPair,
              secondPairPrescription: mergedRecalc.secondPairPrescription,
              selectedOfferType: bogoT,
              tintSelection: tintData,
            }),
          });
          const j2 = await r2.json();
          if (j2.success && j2.data) {
            offerResult = j2.data as OfferCalculationResult;
            // Engine omits `availableBOGORule` when 2nd pair is on — still flag BOGO/BOG50 so offer cards + 2nd-pair block match
            setSelectedOfferType(bogoT);
            setSecondPairEnabled(true);
            console.log('[OfferSummary] Applied merged second-pair on initial load');
          }
        } catch (e) {
          console.warn('[OfferSummary] Initial merged second-pair recalc failed:', e);
        }
      }

      // Debug: Log offer result
      console.log('[OfferSummary] Offer Result:', {
        offersApplied: offerResult.offersApplied,
        categoryDiscount: offerResult.categoryDiscount,
        couponDiscount: offerResult.couponDiscount,
        secondPairDiscount: offerResult.secondPairDiscount,
        availableBOGORule: offerResult.availableBOGORule,
        upsell: offerResult.upsell,
        finalPayable: offerResult.finalPayable,
        baseTotal: offerResult.baseTotal,
        frameMRP: offerResult.frameMRP,
        lensPrice: offerResult.lensPrice,
      });
      
      // Auto-enable is handled in useEffect (avoids fighting user choice when switching YOPO ↔ BOGO; stale secondPairEnabled in this closure)
      
      // Debug: Log each offer in detail
      if (offerResult.offersApplied && offerResult.offersApplied.length > 0) {
        console.log('[OfferSummary] 🔍 Detailed offersApplied breakdown:');
        offerResult.offersApplied.forEach((offer: any, index: number) => {
          console.log(`[OfferSummary]   Offer ${index + 1}:`, {
            ruleCode: offer.ruleCode,
            description: offer.description,
            savings: offer.savings,
            type: offer.type,
            isYOPO: (offer.ruleCode || '').toUpperCase().includes('YOPO') || 
                    (offer.description || '').toUpperCase().includes('YOPO'),
          });
        });
      } else {
        console.log('[OfferSummary] ⚠️ No offers applied! This might indicate YOPO rule not found or not applicable.');
      }
      
      if (offerResult.upsell) {
        console.log('[OfferSummary] ? Upsell found! Details:', {
          message: offerResult.upsell.message,
          rewardText: offerResult.upsell.rewardText,
          remaining: offerResult.upsell.remaining,
          type: offerResult.upsell.type,
        });
      } else {
        console.log('[OfferSummary] ?? No upsell suggestion returned from offer engine');
        console.log('[OfferSummary] Final payable:', offerResult.finalPayable);
        console.log('[OfferSummary] This might mean:');
        console.log('  - No upsell rules configured in database');
        console.log('  - Customer has already reached all thresholds');
        console.log('  - No matching upsell rules for this frame/lens combination');
      }
      
      // Extract lens index from name
      const lensIndex = selectedRec.name.match(/\d+\.\d+/)?.[0] || '1.50';

      // Build offer summary data
      // For only lens flow, use empty/default frame data
      const frameBrand = isOnlyLensFlowCheck ? '' : (frameData.brand || 'Unknown');
      const frameSubBrand = isOnlyLensFlowCheck ? null : (frameData.subCategory || null);
      
      console.log('[OfferSummary] Frame data:', {
        isOnlyLensFlow: isOnlyLensFlowCheck,
        brand: frameBrand,
        subCategory: frameSubBrand,
        mrp: frameData.mrp,
        frameType: frameData.frameType,
        fullFrameData: frameData,
        offerResultFrameMRP: offerResult.frameMRP,
      });
      
      const summaryData: OfferSummaryData = {
        sessionId,
        selectedLens: {
          id: selectedRec.id,
          name: selectedRec.name,
          index: lensIndex,
          price: offerResult.lensPrice,
          brandLine: selectedRec.brand || 'Premium',
          visionType: selectedRec.visionType,
          lensIndex: selectedRec.lensIndex,
        },
        selectedFrame: {
          brand: frameBrand,
          subBrand: frameSubBrand,
          mrp: offerResult.frameMRP, // This should be 0 for only lens flow
          frameType: isOnlyLensFlowCheck ? undefined : frameData.frameType,
        },
        offerResult,
        allApplicableOffers: selectedRec.offers || [], // Store all applicable offers
      };

      setData(summaryData);
      
      // Second pair lenses + frame brands load via useEffect (session + secondPairProductKind)
      
      // Fetch all applicable offers (always fetch)
      fetchAllApplicableOffers(offerResult);
      
      // ✅ Restore second pair data from localStorage if available (after data is set)
      // This will be handled in a separate useEffect after data is loaded
    } catch (error: any) {
      console.error('[OfferSummary] Error:', error);
      showToast('error', error.message || 'Failed to load offer summary');
      router.push(`/questionnaire/${sessionId}/recommendations`);
    } finally {
      setLoading(false);
    }
  };

  const formatOffers = (offerResult: OfferCalculationResult): OfferDetail[] => {
    const offers: OfferDetail[] = [];
    
    // Primary offer types (only ONE should apply)
    const primaryOfferTypes = ['COMBO_PRICE', 'YOPO', 'FREE_LENS', 'PERCENT_OFF', 'FLAT_OFF'];
    let primaryOfferAdded = false;
    
    // Only show offers that are actually applied (from offersApplied array)
    // This ensures we only show the one offer that was selected/applied
    if (offerResult.offersApplied && offerResult.offersApplied.length > 0) {
      console.log('[OfferSummary] Processing offersApplied:', offerResult.offersApplied);
      offerResult.offersApplied.forEach((offer: OfferApplied) => {
        // Check if this is a primary offer type
        const isPrimaryOffer = primaryOfferTypes.includes(offer.ruleCode || '') || 
                              primaryOfferTypes.some(type => offer.description?.toUpperCase().includes(type));
        
        // Check if this is a BOGO/BOG50 offer
        const isBOGOOffer = offer.ruleCode?.includes('BOGO') || offer.ruleCode?.includes('BOG50') || 
                           offer.description?.toUpperCase().includes('BOGO') || 
                           offer.description?.toUpperCase().includes('BUY ONE GET');
        
        // Check if this is a category discount
        const isCategoryDiscount = offer.ruleCode === 'CATEGORY' || 
                                   offer.description?.toUpperCase().includes('DISCOUNT');
        
        // Only add primary offer if none has been added yet (only ONE primary offer)
        // YOPO should be shown even if savings is 0 (when frame and lens prices are equal)
        if (isPrimaryOffer) {
          if (!primaryOfferAdded) {
            // For YOPO, show even if savings is 0 (it's still the applied offer)
            const isYOPO = (offer.ruleCode || '').toUpperCase() === 'YOPO' || 
                          (offer.description || '').toUpperCase().includes('YOPO');
            
            // Show if savings > 0 OR if it's YOPO (even with 0 savings)
            if (offer.savings > 0 || isYOPO) {
              const explanation = getOfferExplanation(offer.ruleCode, offer);
              offers.push({
                type: offer.ruleCode || 'DISCOUNT',
                code: offer.ruleCode || '',
                title: offer.description || 'Discount',
                description: offer.description || '',
                discountAmount: offer.savings || 0,
                explanation,
              });
              primaryOfferAdded = true;
            }
          }
        } 
        // Always add BOGO offers (even with 0 savings, to show as available)
        // BOGO is separate from primary offers
        else if (isBOGOOffer) {
          const explanation = getOfferExplanation(offer.ruleCode, offer);
          offers.push({
            type: offer.ruleCode || 'DISCOUNT',
            code: offer.ruleCode || '',
            title: offer.description || 'Discount',
            description: offer.description || '',
            discountAmount: offer.savings || 0,
            explanation,
          });
        }
        // Always add category discounts (they are separate from primary offers)
        // But only if categoryDiscount exists in offerResult (not removed)
        else if (isCategoryDiscount && offer.savings > 0 && offerResult.categoryDiscount) {
          const explanation = getOfferExplanation(offer.ruleCode, offer);
          offers.push({
            type: 'CATEGORY_DISCOUNT',
            code: offer.ruleCode || '',
            title: offer.description || 'Category Discount',
            description: offer.description || '',
            discountAmount: offer.savings || 0,
            explanation,
          });
        }
        // Add other offers (coupons, etc.) if they have savings
        else if (!isPrimaryOffer && !isBOGOOffer && !isCategoryDiscount && offer.savings > 0) {
          const explanation = getOfferExplanation(offer.ruleCode, offer);
          offers.push({
            type: offer.ruleCode || 'DISCOUNT',
            code: offer.ruleCode || '',
            title: offer.description || 'Discount',
            description: offer.description || '',
            discountAmount: offer.savings || 0,
            explanation,
          });
        }
      });
    } else {
      console.log('[OfferSummary] No offersApplied found');
    }

    // Category Discount is already included in offersApplied array (added in service with ruleCode 'CATEGORY')
    // Check if it's already in the offers list to avoid duplication
    const categoryDiscountInOffers = offers.some(o => 
      o.code === 'CATEGORY' || 
      o.type === 'CATEGORY_DISCOUNT' ||
      (o.description && offerResult.categoryDiscount?.description && 
       o.description.toUpperCase() === offerResult.categoryDiscount.description.toUpperCase())
    );
    
    // Only add separately if not already in offersApplied and categoryDiscount exists
    // This is a fallback in case category discount wasn't added to offersApplied for some reason
    if (offerResult.categoryDiscount && offerResult.categoryDiscount.savings > 0 && !categoryDiscountInOffers) {
      offers.push({
        type: 'CATEGORY_DISCOUNT',
        code: 'CATEGORY',
        title: offerResult.categoryDiscount.description || 'Category Discount',
        description: offerResult.categoryDiscount.description || '',
        discountAmount: offerResult.categoryDiscount.savings || 0,
        explanation: formatCategoryDiscountExplanation(offerResult.categoryDiscount),
      });
    }

    // Coupon Discount (user applied)
    if (offerResult.couponDiscount && offerResult.couponDiscount.savings > 0) {
      // Check if not already in offersApplied
      const alreadyInOffers = offers.some(o => o.type === 'COUPON' || o.code === offerResult.couponDiscount?.ruleCode);
      if (!alreadyInOffers) {
        offers.push({
          type: 'COUPON',
          code: offerResult.couponDiscount.ruleCode || '',
          title: offerResult.couponDiscount.description || 'Coupon Discount',
          description: offerResult.couponDiscount.description || '',
          discountAmount: offerResult.couponDiscount.savings || 0,
          explanation: offerResult.couponDiscount.description || 'Coupon applied',
        });
      }
    }

    // Second Pair Discount is already included in offersApplied array
    // No need to add it separately here to avoid duplication

    return offers;
  };

  const getExplanationFromLabel = (label: string, discountAmount: number): string => {
    const labelUpper = label.toUpperCase();
    
    // YOPO: "YOPO - Pay higher of frame or lens"
    if (labelUpper.includes('YOPO')) {
      return 'You pay only the higher of frame or lens.';
    }
    
    // Combo: "Combo Price: ?X"
    if (labelUpper.includes('COMBO') || labelUpper.includes('COMBO PRICE')) {
      return 'Special package price applied.';
    }
    
    // Free Lens: "Free Lens (PERCENT_OF_FRAME)" or "Free Lens (VALUE_LIMIT)" or "Free Lens (FULL)"
    if (labelUpper.includes('FREE LENS') || labelUpper.includes('FREE_LENS')) {
      return `Lens free up to ?${Math.round(discountAmount).toLocaleString()}; you pay only difference.`;
    }
    
    // Percent OFF: "X% OFF" or "X% OFF (FRAME_ONLY)" or "X% OFF (LENS_ONLY)"
    if (labelUpper.includes('% OFF') || labelUpper.includes('%OFF') || labelUpper.match(/\d+%/)) {
      // Check if it's a brand discount (has brand name before percentage)
      const brandPercentMatch = label.match(/(\w+)\s+(\d+)%\s*OFF/i);
      if (brandPercentMatch) {
        const brand = brandPercentMatch[1];
        const percent = brandPercentMatch[2];
        return `${brand} ${percent}% Off`;
      }
      // Regular percentage discount
      const percentMatch = label.match(/(\d+)%\s*OFF/i);
      if (percentMatch) {
        return `${percentMatch[1]}% OFF`;
      }
      return label || 'Percentage discount applied';
    }
    
    // Flat OFF: "Flat ?X OFF"
    if (labelUpper.includes('FLAT') && labelUpper.includes('OFF')) {
      const flatMatch = label.match(/FLAT\s*₹?(\d+)\s*OFF/i);
      if (flatMatch) {
        return `Festival Offer -?${flatMatch[1]}`;
      }
      return `Festival Offer -?${Math.round(discountAmount).toLocaleString()}`;
    }
    
    // BOGO50: "BOG50" or "Second pair X% off"
    if (labelUpper.includes('BOGO') || labelUpper.includes('BOG50') || labelUpper.includes('SECOND PAIR')) {
      return 'Buy One Get One 50% Off - Second item at 50% discount';
    }
    
    // Default: return the label as-is
    return label || 'Discount applied';
  };

  const getOfferExplanation = (ruleCode: string, offer: OfferApplied): string => {
    const description = offer.description || '';
    return getExplanationFromLabel(description, offer.savings || 0);
  };

  const formatCategoryDiscountExplanation = (categoryDiscount: OfferApplied): string => {
    // Extract category name and percentage from description
    // Format: "STUDENT Discount (5%)" or similar
    const match = categoryDiscount.description.match(/(\w+)\s+Discount\s*\((\d+)%\)/);
    if (match) {
      const category = match[1];
      const percent = match[2];
      return `${category} Discount ${percent}%`;
    }
    return categoryDiscount.description || 'Category Discount applied';
  };

  const retailTypeParam = (kind: SecondPairProductKind) =>
    kind === 'EYEGLASS' ? 'FRAME' : kind === 'SUNGLASS' ? 'SUNGLASS' : 'POWER_SUNGLASS';

  const LENS_INDEX_ENUM = LENS_INDEX_ENUM_SET;

  /** Power sun: require MRP, brand, and sub-brand when the brand has sub-brands (before "who is it for") */
  const isPowerSunFrameComplete = (): boolean => {
    if (secondPairProductKind !== 'POWER_SUNGLASS') return true;
    const m = parseFloat(secondPairFrameMRP) || 0;
    if (m <= 0) return false;
    if (!String(secondPairBrand || '').trim()) return false;
    if (availableSubBrands.length > 0 && !String(secondPairSubBrand || '').trim()) return false;
    return true;
  };

  const onSecondPairProductKindChange = (kind: SecondPairProductKind) => {
    if (kind === secondPairProductKind) return;
    setSecondPairProductKind(kind);
    setSecondPairBrand('');
    setSecondPairSubBrand('');
    setSecondPairLensId('');
    setSecondPairLensPrice(0);
    setSecondPairOtherRx(null);
    setSecondPairTintSelection(null);
    setSecondPairLensRecipient(null);
    setPendingPowerSunLens(null);
    setTintColorPrices({});
    setTintPricesLoading(false);
  };

  const fetchAvailableLenses = async () => {
    if (data && data.selectedLens.id !== productId) {
      setAvailableLenses([]);
      return;
    }
    setLoadingLenses(true);
    try {
      const params = new URLSearchParams();
      params.set('secondPairKind', secondPairProductKind);
      const vt = data?.selectedLens?.visionType;
      if (vt) {
        params.set('visionType', String(vt).toUpperCase());
      }
      const response = await fetch(`/api/products/lenses?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setAvailableLenses(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch lenses:', error);
    } finally {
      setLoadingLenses(false);
    }
  };

  /** BOGO: for eyeglass & power-sun. Ready-made sun skips lens (no modal). */
  const openSecondPairRecipientStep = () => {
    if (secondPairProductKind === 'SUNGLASS') return;
    if (secondPairProductKind === 'POWER_SUNGLASS' && !isPowerSunFrameComplete()) {
      showToast(
        'error',
        availableSubBrands.length > 0
          ? 'Enter second pair frame MRP, brand, and sub-brand first.'
          : 'Enter second pair frame MRP and brand first.'
      );
      return;
    }
    setBogoSecondPairModalScreen('who');
    setShowSecondPairRecipientModal(true);
  };

  /** BOGO: full name → Q&A → recommendations for the other person; child session merges back here. */
  const startBogoOtherPersonFullQuestionnaire = async () => {
    if (secondPairProductKind !== 'EYEGLASS') {
      showToast('error', 'Full other-person flow is only available when 2nd pair is Eyeglass.');
      return;
    }
    const mrp = parseFloat(secondPairFrameMRP) || 0;
    if (mrp <= 0 || !secondPairBrand.trim()) {
      showToast(
        'error',
        'Enter 2nd pair frame MRP and brand first, then start the other-person questionnaire.'
      );
      return;
    }
    if (!secondPairEnabled) {
      showToast('error', 'Enable the second pair section first.');
      return;
    }
    setShowSecondPairRecipientModal(false);
    setBogoSecondPairModalScreen('who');
    setSecondPairLensRecipient('other');
    setStartingBogoChildQuestionnaire(true);
    try {
      const sub = secondPairSubBrand?.trim() || null;
      const secondPairDataPrime: Record<string, unknown> = {
        enabled: true,
        frameMRP: mrp,
        brand: secondPairBrand.trim(),
        subBrand: sub,
        secondPairProductKind: 'EYEGLASS',
        lensRecipient: 'other',
        bogoSecondPersonInProgress: true,
      };
      const pr = await fetch(`/api/public/questionnaire/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secondPairData: secondPairDataPrime }),
      });
      if (!pr.ok) {
        showToast('error', 'Could not save 2nd pair context. Try again.');
        return;
      }
      const sres = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
      const sj = await sres.json();
      const stId = sj.data?.session?.storeId;
      const category = sj.data?.session?.category as string | undefined;
      if (!stId || !category) {
        showToast('error', 'Session store or category is missing.');
        return;
      }
      const vres = await fetch(`/api/public/verify-store?storeId=${stId}`);
      const vj = await vres.json();
      const sc = vj.data?.code as string | undefined;
      if (!sc) {
        showToast('error', 'Could not resolve store code.');
        return;
      }
      const cres = await fetch('/api/public/questionnaire/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeCode: sc,
          category,
          parentSessionId: sessionId,
          bogoParentFirstPairProductId: productId,
          customerName: 'Second customer',
          customerPhone: '0000000000',
        }),
      });
      const cj = await cres.json();
      if (!cj.success || !cj.data?.sessionId) {
        showToast('error', cj.error?.message || 'Could not start the other-person session.');
        return;
      }
      router.push(`/questionnaire/${cj.data.sessionId}/bogo-second-person-details`);
    } catch {
      showToast('error', 'Something went wrong. Try again.');
    } finally {
      setStartingBogoChildQuestionnaire(false);
    }
  };

  /** Power sun 2nd pair: skip lens catalog — open tint chart using 1st-pair lens (same index / pricing). */
  const openSecondPairPowerSunTintFromFirstPair = () => {
    if (!data?.selectedLens?.id) {
      showToast('error', 'First-pair lens is missing. Open this page from recommendations again.');
      return;
    }
    const fromRec = data.selectedLens.lensIndex && LENS_INDEX_ENUM.has(data.selectedLens.lensIndex)
      ? data.selectedLens.lensIndex
      : null;
    const li = fromRec || displayIndexStringToLensEnum(data.selectedLens.index);
    if (!li) {
      showToast('error', 'Could not determine lens index for tint prices.');
      return;
    }
    const orgBase = bogoPowerSunSecondPairLensBasePrice;
    const lensBase =
      orgBase != null && orgBase > 0 ? orgBase : data.selectedLens.price;
    openSecondPairTintForPowerSun({
      id: data.selectedLens.id,
      name: data.selectedLens.name,
      price: lensBase,
      index: li,
    });
  };

  const applySecondPairRecipientAndOpenLenses = (recipient: 'self' | 'other') => {
    setSecondPairLensRecipient(recipient);
    if (secondPairProductKind === 'EYEGLASS') {
      if (recipient === 'other') {
        setBogoSecondPairModalScreen('eyeglassOtherHow');
        return;
      }
      setShowSecondPairRecipientModal(false);
      setBogoSecondPairModalScreen('who');
      void fetchAvailableLenses();
      setShowLensSelectionModal(true);
      return;
    }
    setShowSecondPairRecipientModal(false);
    setBogoSecondPairModalScreen('who');
    if (secondPairProductKind === 'POWER_SUNGLASS') {
      if (recipient === 'other') {
        setSecondPairOtherRx({
          odSphere: '',
          osSphere: '',
          odCylinder: '0',
          osCylinder: '0',
          odAdd: '',
        });
        setShowSecondPairRxModal(true);
      } else {
        setSecondPairOtherRx(null);
        openSecondPairPowerSunTintFromFirstPair();
      }
    }
  };

  const openEyeglassSecondPairLensCatalogFromModal = () => {
    setShowSecondPairRecipientModal(false);
    setBogoSecondPairModalScreen('who');
    void fetchAvailableLenses();
    setShowLensSelectionModal(true);
  };

  const finishSecondPairRxForPowerSun = () => {
    if (!secondPairOtherRx) return;
    if (secondPairOtherRx.odSphere.trim() === '' || secondPairOtherRx.osSphere.trim() === '') {
      showToast('error', 'Enter sphere for both eyes (use 0 if Plano).');
      return;
    }
    setShowSecondPairRxModal(false);
    openSecondPairPowerSunTintFromFirstPair();
  };

  const openSecondPairTintForPowerSun = (lens: { id: string; price: number; name: string; index: string }) => {
    setSecondPairLensId(lens.id);
    setPendingPowerSunLens({
      id: lens.id,
      price: lens.price,
      name: lens.name,
      index: lens.index,
    });
    setShowLensSelectionModal(false);
    setShowSecondPairTintModal(true);
    setTintFormPick({ tintId: null, mirrorId: null });
    setTintColorPrices({});
    setTintPricesLoading(true);
    void (async () => {
      try {
        const [tc, mc] = await Promise.all([
          fetch('/api/public/tint-colors'),
          fetch('/api/public/mirror-coatings'),
        ]);
        let colors: TintChartColor[] = [];
        if (tc.ok) {
          const j = await tc.json();
          if (j.success && j.data) {
            colors = (j.data as Record<string, unknown>[]).map((t) => ({
              id: String(t.id),
              name: String(t.name ?? ''),
              code: String(t.code ?? ''),
              hexColor: (t.hexColor as string | null | undefined) ?? null,
              imageUrl: (t.imageUrl as string | null | undefined) ?? null,
              category: String(t.category ?? 'OTHER'),
              darknessPercent: typeof t.darknessPercent === 'number' ? t.darknessPercent : 0,
              isPolarized: Boolean(t.isPolarized),
            }));
            setTintModalColors(colors);
          }
        }
        if (mc.ok) {
          const j2 = await mc.json();
          if (j2.success && j2.data) {
            setTintModalMirrors(
              (j2.data as { id: string; name: string; addOnPrice: number; imageUrl?: string | null }[]).map(
                (m) => ({
                id: m.id,
                name: m.name,
                addOnPrice: m.addOnPrice || 0,
                imageUrl: m.imageUrl,
              })
              )
            );
          }
        }
        const li = lens.index && LENS_INDEX_ENUM.has(lens.index) ? lens.index : null;
        if (li && colors.length) {
          const priceEntries = await Promise.all(
            colors.map(async (c) => {
              try {
                const r = await fetch(`/api/public/tint-colors/${c.id}/pricing?lensIndex=${li}`);
                const data = await r.json();
                if (data.success && data.data) {
                  const p = data.data.finalPrice ?? data.data.finalTintPrice ?? 0;
                  return [c.id, typeof p === 'number' ? p : 0] as const;
                }
              } catch {
                /* skip */
              }
              return [c.id, 0] as const;
            })
          );
          setTintColorPrices(Object.fromEntries(priceEntries));
        } else {
          setTintColorPrices({});
        }
      } catch (e) {
        console.error('Tint modal load', e);
      } finally {
        setTintPricesLoading(false);
      }
    })();
  };

  const confirmPowerSunTint = () => {
    if (!pendingPowerSunLens || !tintFormPick.tintId) {
      showToast('error', 'Select a tint shade to continue.');
      return;
    }
    const tint = tintModalColors.find((c) => c.id === tintFormPick.tintId);
    const mirror = tintFormPick.mirrorId
      ? tintModalMirrors.find((m) => m.id === tintFormPick.mirrorId)
      : null;
    const mirrorAdd = mirror?.addOnPrice || 0;
    const base = pendingPowerSunLens.price || 0;
    const tintAdd = tintFormPick.tintId ? (tintColorPrices[tintFormPick.tintId] ?? 0) : 0;
    const total = base + tintAdd + mirrorAdd;
    setSecondPairTintSelection({
      tintColorId: tintFormPick.tintId!,
      tintName: tint?.name || 'Tint',
      mirrorCoatingId: tintFormPick.mirrorId,
      mirrorAddOn: mirrorAdd,
      tintAddOn: tintAdd,
    });
    setSecondPairLensId(pendingPowerSunLens.id);
    setSecondPairLensPrice(total);
    setShowSecondPairTintModal(false);
    setPendingPowerSunLens(null);
    if (secondPairFrameMRP && parseFloat(secondPairFrameMRP) > 0) {
      void recalculateOffersWithSecondPair({
        frameMRP: parseFloat(secondPairFrameMRP),
        brand: secondPairBrand,
        subBrand: secondPairSubBrand,
        lensId: pendingPowerSunLens.id,
        lensPrice: total,
      });
    }
  };

  const fetchFrameBrands = async () => {
    try {
      // ✅ Get store code from session (database) - NOT from localStorage
      let storeCode: string | null = null;
      
      try {
        const sessionResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.success && sessionData.data?.session?.storeId) {
            const storeResponse = await fetch(`/api/public/verify-store?storeId=${sessionData.data.session.storeId}`);
            if (storeResponse.ok) {
              const storeData = await storeResponse.json();
              if (storeData.success && storeData.data?.code) {
                storeCode = storeData.data.code;
              }
            }
          }
        }
      } catch (e) {
        console.warn('[OfferSummary] Could not get store code from session, using localStorage fallback');
        storeCode = localStorage.getItem('lenstrack_store_code');
      }
      if (!storeCode) {
        storeCode = localStorage.getItem('lenstrack_store_code');
      }
      
      if (storeCode) {
        const response = await fetch(
          `/api/public/frame-brands?storeCode=${storeCode}&retailType=${retailTypeParam(secondPairProductKind)}`
        );
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setFrameBrands(result.data || []);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch frame brands:', error);
    }
  };

  useEffect(() => {
    if (!sessionId || !productId) return;
    void fetchFrameBrands();
    if (secondPairProductKind !== 'SUNGLASS') {
      void fetchAvailableLenses();
    } else {
      setAvailableLenses([]);
    }
    // secondPairProductKind changes which frame brands + lens catalog to load for BOGO
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, productId, secondPairProductKind, data?.selectedLens?.visionType, data?.selectedLens?.id]);

  const fetchAllApplicableOffers = async (offerResult?: OfferCalculationResult) => {
    try {
      // Use provided offerResult or current data's offerResult
      const currentOfferResult = offerResult || data?.offerResult;
      
      // First, get offers from recommendations API which has all applicable offers
      const recommendationsResponse = await fetch(
        `/api/public/questionnaire/sessions/${sessionId}/recommendations`
      );
      
      if (recommendationsResponse.ok) {
        const recommendationsData = await recommendationsResponse.json();
        if (recommendationsData.success) {
          const selectedRec = recommendationsData.data.recommendations.find(
            (r: any) => r.id === productId
          );
          
          if (selectedRec) {
            // Get offers from recommendations (if available)
            const recOffers = selectedRec.offers || [];
            
            // Also get formatted offers from current offer result
            let formattedOffers: any[] = [];
            if (currentOfferResult) {
              formattedOffers = formatOffers(currentOfferResult);
            }
            
            // Combine both sources and deduplicate
            const allOffersMap = new Map();
            
            // Add offers from recommendations
            recOffers.forEach((offer: any) => {
              if (offer.code) {
                allOffersMap.set(offer.code, {
                  type: offer.type || 'DISCOUNT',
                  code: offer.code,
                  title: offer.title || offer.description || 'Discount',
                  description: offer.description || '',
                  discountAmount: offer.discountAmount || 0,
                  discountPercent: offer.discountPercent,
                  isApplicable: offer.isApplicable !== false,
                });
              }
            });
            
            // Add formatted offers from offer result
            formattedOffers.forEach(offer => {
              if (offer.code && !allOffersMap.has(offer.code)) {
                allOffersMap.set(offer.code, {
                  type: offer.type,
                  code: offer.code,
                  title: offer.title,
                  description: offer.description,
                  discountAmount: offer.discountAmount || 0,
                  isApplicable: true,
                });
              }
            });
            
            const applicableOffers = Array.from(allOffersMap.values());
            
            setAllApplicableOffersList(applicableOffers);
            
            // Update data with applicable offers
            setData(prev => prev ? {
              ...prev,
              allApplicableOffers: applicableOffers,
            } : null);
            
            console.log('[OfferSummary] Fetched all applicable offers:', applicableOffers.length, applicableOffers);
          }
        }
      }
    } catch (error) {
      console.error('[OfferSummary] Failed to fetch all applicable offers:', error);
    }
  };

  // Update sub-brands when brand is selected
  useEffect(() => {
    if (secondPairBrand && frameBrands.length > 0) {
      const selectedBrand = frameBrands.find(b => b.brandName === secondPairBrand);
      if (selectedBrand && selectedBrand.subBrands) {
        setAvailableSubBrands(selectedBrand.subBrands.map((sb: any) => sb.subBrandName));
      } else {
        setAvailableSubBrands([]);
      }
      // Reset sub-brand if brand changes
      if (selectedBrand && !selectedBrand.subBrands?.some((sb: any) => sb.subBrandName === secondPairSubBrand)) {
        setSecondPairSubBrand('');
      }
    } else {
      setAvailableSubBrands([]);
    }
  }, [secondPairBrand, frameBrands]);

  // ✅ Restore second pair data from session (do not require lenses for ready-made sun)
  useEffect(() => {
    if (!data || !data.offerResult) return;

    const restoreSecondPairFromDatabase = async () => {
      if (selectedOfferType && selectedOfferType !== 'BOGO' && selectedOfferType !== 'BOG50') {
        return;
      }
      if (data && isYOPOPrimaryOffer(data.offerResult)) {
        return;
      }
      try {
        const sessionResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          console.log('[OfferSummary] Session data for restore:', sessionData);
          
          if (sessionData.success && sessionData.data?.session?.secondPairData) {
            const parsed = sessionData.data.session.secondPairData as any;
            console.log('[OfferSummary] Parsed secondPairData:', parsed);
            
            const isReadySun = parsed?.readyMadeSunglasses === true || parsed?.secondPairProductKind === 'SUNGLASS';
            const bogoOtherInProgress = parsed?.bogoSecondPersonInProgress === true;
            if (
              parsed &&
              parsed.enabled &&
              parsed.frameMRP &&
              (isReadySun || bogoOtherInProgress || (parsed.lensId && Number(parsed.lensPrice ?? 0) >= 0))
            ) {
              console.log('[OfferSummary] ✅ Restoring second pair data from session database:', parsed);
              
              // Set all state first
              setSecondPairEnabled(true);
              const bogoType =
                (data?.offerResult as { availableBOGORule?: { offerType?: string } } | null)?.availableBOGORule
                  ?.offerType || 'BOGO';
              setSelectedOfferType(bogoType);
              setSecondPairFrameMRP(parsed.frameMRP.toString());
              setSecondPairBrand(parsed.brand || '');
              setSecondPairSubBrand(parsed.subBrand || '');
              if (isReadySun) {
                setSecondPairLensId('');
                setSecondPairLensPrice(0);
              } else if (bogoOtherInProgress) {
                setSecondPairLensId('');
                setSecondPairLensPrice(0);
              } else {
                setSecondPairLensId(parsed.lensId);
                setSecondPairLensPrice(parsed.lensPrice);
              }
              if (parsed.lensRecipient === 'self' || parsed.lensRecipient === 'other') {
                setSecondPairLensRecipient(parsed.lensRecipient);
              }
              if (parsed.secondPairOtherRx) setSecondPairOtherRx(parsed.secondPairOtherRx);
              if (parsed.tintSelection) setSecondPairTintSelection(parsed.tintSelection);
              if (
                parsed.secondPairProductKind === 'EYEGLASS' ||
                parsed.secondPairProductKind === 'SUNGLASS' ||
                parsed.secondPairProductKind === 'POWER_SUNGLASS'
              ) {
                setSecondPairProductKind(parsed.secondPairProductKind);
              }
              
              if (!(bogoOtherInProgress && !isReadySun)) {
                // Recalculate offers with second pair data after a delay to ensure state is set
                setTimeout(() => {
                  if (data && productId) {
                    console.log('[OfferSummary] Recalculating offers with restored second pair data');
                    const rs = isReadySun;
                    const spRxFromSession =
                      !rs &&
                      parsed.lensRecipient === 'other' &&
                      parsed.secondPairOtherRx
                        ? secondPairOtherRxToApiBody(parsed.secondPairOtherRx)
                        : undefined;
                    void recalculateOffersWithSecondPair(
                      {
                        frameMRP: parsed.frameMRP,
                        brand: parsed.brand || '',
                        subBrand: parsed.subBrand || '',
                        lensId: rs ? '' : (parsed.lensId || ''),
                        lensPrice: rs ? 0 : (parsed.lensPrice || 0),
                      },
                      { secondPairPrescriptionOverride: spRxFromSession }
                    );
                  }
                }, 1500);
              }
            } else {
              console.log('[OfferSummary] Second pair data exists but is incomplete:', parsed);
            }
          } else {
            console.log('[OfferSummary] No second pair data in session');
          }
        } else {
          console.warn('[OfferSummary] Failed to fetch session for restore:', sessionResponse.status);
        }
      } catch (e) {
        console.error('[OfferSummary] Failed to restore second pair data from database:', e);
      }
    };
    
    restoreSecondPairFromDatabase();
  }, [data, sessionId, productId, selectedOfferType]);

  const buildSecondPairPrescriptionForApi = () => {
    if (secondPairLensRecipient !== 'other' || !secondPairOtherRx) {
      return undefined;
    }
    if (
      secondPairProductKind !== 'POWER_SUNGLASS' &&
      secondPairProductKind !== 'EYEGLASS'
    ) {
      return undefined;
    }
    const p = secondPairOtherRx;
    return {
      odSphere: p.odSphere ? parseFloat(p.odSphere) : 0,
      osSphere: p.osSphere ? parseFloat(p.osSphere) : 0,
      odCylinder: p.odCylinder ? parseFloat(p.odCylinder) : 0,
      osCylinder: p.osCylinder ? parseFloat(p.osCylinder) : 0,
      rSph: p.odSphere ? parseFloat(p.odSphere) : 0,
      lSph: p.osSphere ? parseFloat(p.osSphere) : 0,
      rCyl: p.odCylinder ? parseFloat(p.odCylinder) : 0,
      lCyl: p.osCylinder ? parseFloat(p.osCylinder) : 0,
      add: p.odAdd ? parseFloat(p.odAdd) : 0,
    };
  };

  const recalculateOffersWithSecondPair = async (
    secondPairData: {
      frameMRP: number;
      brand: string;
      subBrand: string;
      lensId: string;
      lensPrice: number;
    } | null,
    options?: { secondPairPrescriptionOverride?: ReturnType<typeof secondPairOtherRxToApiBody> | undefined }
  ) => {
    if (!data || !productId) return;
    const spRx = options?.secondPairPrescriptionOverride ?? buildSecondPairPrescriptionForApi();
    // When a 2nd pair is included, the engine must not pick YOPO as primary (YOPO blocks 2nd-pair BOGO).
    // If the user has not picked a card yet, force BOGO/BOG50 from the available rule (default BOGO).
    const bogoOrBog50 =
      selectedOfferType ||
      (data.offerResult as { availableBOGORule?: { offerType?: string } })?.availableBOGORule?.offerType ||
      'BOGO';
    const selectedOfferTypeForApi =
      secondPairData != null ? bogoOrBog50 : selectedOfferType;

    try {
      const offersResponse = await fetch(
        `/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: productId,
            couponCode: null,
            customerCategory: appliedCategory || null,
            secondPair: secondPairData
              ? {
                  enabled: true,
                  firstPairTotal: data.offerResult.baseTotal,
                  secondPairFrameMRP: secondPairData.frameMRP,
                  secondPairLensPrice: secondPairData.lensPrice,
                  ...(secondPairData.lensId ? { lensId: secondPairData.lensId } : {}),
                }
              : null,
            secondPairPrescription: spRx,
            selectedOfferType: selectedOfferTypeForApi,
          }),
        }
      );
      
      const offersData = await offersResponse.json();
      if (offersData.success && offersData.data) {
        // Update data with new offer result
        setData(prev => prev ? {
          ...prev,
          offerResult: offersData.data,
        } : null);
      }
    } catch (error) {
      console.error('Failed to recalculate offers with second pair:', error);
    }
  };

  const groupedSecondPairLenses = useMemo(() => {
    const rows = (availableLenses || []) as SecondPairLensRow[];
    const byBrand = new Map<string, SecondPairLensRow[]>();
    for (const l of rows) {
      const key = (l.brandLine || 'Other').trim() || 'Other';
      if (!byBrand.has(key)) byBrand.set(key, []);
      byBrand.get(key)!.push(l);
    }
    const keys = [...byBrand.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return keys.map((brand) => ({ brand, lenses: byBrand.get(brand)! }));
  }, [availableLenses]);

  const tintChartGrouped = useMemo(() => {
    const m = new Map<string, TintChartColor[]>();
    for (const c of tintModalColors) {
      const k = c.category || 'OTHER';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(c);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [tintModalColors]);

  const fetchEligibleProducts = async () => {
    if (!data) return;
    
    setLoadingProducts(true);
    setShowEligibleProducts(true);
    
    try {
      // Get session to find store and organization
      const sessionResponse = await fetch(`/api/public/questionnaire/sessions/${sessionId}`);
      if (!sessionResponse.ok) {
        throw new Error('Failed to fetch session');
      }
      
      const sessionData = await sessionResponse.json();
      if (!sessionData.success) {
        throw new Error('Session not found');
      }
      
      const storeId = sessionData.data.storeId;
      
      // Fetch products that can help reach the upsell threshold
      const currentTotal = data.offerResult.finalPayable;
      const remaining = data.offerResult.upsell?.remaining || 1000;
      const minPrice = Math.max(remaining - 500, 100); // Products around the remaining amount
      const maxPrice = remaining + 1000; // Slightly above threshold
      
      // Fetch products from store
      const productsResponse = await fetch(
        `/api/public/products/eligible?storeId=${storeId}&minPrice=${minPrice}&maxPrice=${maxPrice}&limit=20`
      );
      
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        if (productsData.success) {
          setEligibleProducts(productsData.data || []);
        } else {
          // Fallback: fetch from recommendations
          const recResponse = await fetch(
            `/api/public/questionnaire/sessions/${sessionId}/recommendations`
          );
          if (recResponse.ok) {
            const recData = await recResponse.json();
            if (recData.success && recData.data.recommendations) {
              // Filter products that can help reach threshold
              const filtered = recData.data.recommendations
                .filter((r: any) => {
                  const price = r.pricing?.finalPrice || r.pricing?.subtotal || 0;
                  return price >= minPrice && price <= maxPrice;
                })
                .slice(0, 10);
              setEligibleProducts(filtered);
            }
          }
        }
      } else {
        // Fallback: use recommendations
        const recResponse = await fetch(
          `/api/public/questionnaire/sessions/${sessionId}/recommendations`
        );
        if (recResponse.ok) {
          const recData = await recResponse.json();
          if (recData.success && recData.data.recommendations) {
            const filtered = recData.data.recommendations
              .filter((r: any) => {
                const price = r.pricing?.finalPrice || r.pricing?.subtotal || 0;
                return price >= minPrice && price <= maxPrice;
              })
              .slice(0, 10);
            setEligibleProducts(filtered);
          }
        }
      }
    } catch (error: any) {
      console.error('[OfferSummary] Error fetching eligible products:', error);
      showToast('error', 'Failed to load eligible products');
    } finally {
      setLoadingProducts(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-slate-300 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Calculating Your Best Offers</h2>
          <p className="text-slate-600 dark:text-slate-400">Applying all eligible discounts...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md bg-white/80 dark:bg-slate-800/50 backdrop-blur rounded-xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-lg">
          <div className="text-5xl mb-4">??</div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Unable to Load Offer Summary</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please go back and select a lens again.
          </p>
          <Button 
            onClick={() => router.push(`/questionnaire/${sessionId}/recommendations`)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Recommendations
          </Button>
        </div>
      </div>
    );
  }

  const totalDiscount = data.offerResult.baseTotal - data.offerResult.finalPayable;
  const savingsPercent = totalDiscount > 0 
    ? Math.round((totalDiscount / data.offerResult.baseTotal) * 100)
    : 0;

  const allOffers = formatOffers(data.offerResult);
  // Filter out offers with zero or negative discount, BUT keep YOPO even if savings is 0
  // YOPO should be shown even with 0 savings because it's the applied offer
  const offers = allOffers.filter(offer => {
    const isYOPO = (offer.code || '').toUpperCase() === 'YOPO' || 
                   (offer.type || '').toUpperCase() === 'YOPO' ||
                   (offer.title || '').toUpperCase().includes('YOPO');
    // Keep YOPO even if discountAmount is 0, otherwise filter out 0 discount offers
    return (offer.discountAmount || 0) > 0 || isYOPO;
  });
  
  // Debug: Log formatted offers
  console.log('[OfferSummary] All formatted offers:', allOffers);
  console.log('[OfferSummary] Filtered offers (with discount > 0):', offers);
  console.log('[OfferSummary] Total offers count:', offers.length);
  console.log('[OfferSummary] Offer result data:', {
    offersApplied: data.offerResult.offersApplied,
    categoryDiscount: data.offerResult.categoryDiscount,
    couponDiscount: data.offerResult.couponDiscount,
    secondPairDiscount: data.offerResult.secondPairDiscount,
    priceComponents: data.offerResult.priceComponents,
  });
  
  // Debug: Log upsell status
  const hasUpsell = !!data.offerResult.upsell;
  console.log('[OfferSummary] ?? Upsell Banner Status:', {
    hasUpsell,
    upsellData: data.offerResult.upsell,
    finalPayable: data.offerResult.finalPayable,
    willShowBanner: hasUpsell || (data.offerResult.finalPayable < 5000),
  });

  return (
    <div className="min-h-safe-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 pb-20 sm:pb-24 md:pb-28">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur border-b border-slate-200 dark:border-slate-700 py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-300 dark:border-blue-500/30">
                <CheckCircle className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white mb-1">
                  Offer Summary
                </h1>
                <p className="text-slate-600 dark:text-slate-400">All offers applied</p>
              </div>
            </div>
            {savingsPercent > 0 && (
              <div className="bg-blue-100 dark:bg-blue-500/20 rounded-lg px-6 py-3 border border-blue-300 dark:border-blue-500/30">
                <p className="text-blue-700 dark:text-blue-300 text-sm font-medium mb-1">You Saved</p>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{savingsPercent}%</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Top Summary: Selected Lens + Frame */}
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className={`grid gap-6 ${isOnlyLensFlow || data.selectedFrame.mrp === 0 ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
            {/* Selected Lens */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-lg p-5 border-2 border-blue-200 dark:border-blue-500/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">Selected Lens</h3>
                <Package className="text-blue-600 dark:text-blue-400" size={18} />
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white mb-2">{data.selectedLens.name}</p>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm mb-4">
                <span className="bg-blue-100 dark:bg-blue-500/20 px-3 py-1 rounded-lg border border-blue-300 dark:border-blue-500/30 font-semibold text-blue-700 dark:text-blue-200">
                  Index {data.selectedLens.index}
                </span>
                {data.selectedLens.brandLine && (
                  <span className="bg-slate-100 dark:bg-slate-700/50 px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                    {data.selectedLens.brandLine}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-slate-600 dark:text-slate-400 text-sm">₹</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(data.selectedLens.price).toLocaleString()}</span>
              </div>
            </div>

            {/* Selected Frame - Hide entire card in only lens flow or when MRP is 0 */}
            {!isOnlyLensFlow && data.selectedFrame.mrp > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 rounded-lg p-5 border-2 border-purple-200 dark:border-purple-500/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wide">Selected Frame</h3>
                  <Eye className="text-purple-600 dark:text-purple-400" size={18} />
                </div>
                <div className="mb-2">
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{data.selectedFrame.brand}</p>
                  {data.selectedFrame.subBrand && (
                    <p className="text-purple-700 dark:text-purple-200 text-sm font-medium mt-1">{data.selectedFrame.subBrand}</p>
                  )}
                </div>
                {data.selectedFrame.frameType && (
                  <div className="mb-4">
                    <span className="text-slate-700 dark:text-slate-300 text-sm bg-purple-100 dark:bg-purple-500/20 px-3 py-1 rounded-lg border border-purple-300 dark:border-purple-500/30 inline-block">
                      {data.selectedFrame.frameType.replace('_', ' ')}
                    </span>
                  </div>
                )}
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-slate-600 dark:text-slate-400 text-sm">MRP: ₹</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(data.selectedFrame.mrp).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Category Discount Section */}
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-300 dark:border-blue-500/30">
              <UserCheck className="text-blue-600 dark:text-blue-400" size={18} />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Category Discount</h2>
          </div>
          
          {!appliedCategory ? (
            <div className="space-y-4">
              {availableCategories.length > 0 ? (
                <Select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    // Reset image when category changes
                    setCategoryIdImage(null);
                    setCategoryIdImagePreview(null);
                  }}
                  options={[
                    { value: '', label: 'Select Category' },
                    ...(() => {
                      // Get unique categories (deduplicate by customerCategory)
                      const uniqueCategories = new Map<string, typeof availableCategories[0]>();
                      availableCategories
                        .filter(cat => cat.isActive)
                        .forEach(cat => {
                          if (!uniqueCategories.has(cat.customerCategory)) {
                            uniqueCategories.set(cat.customerCategory, cat);
                          }
                        });
                      
                      return Array.from(uniqueCategories.values()).map(cat => ({
                        value: cat.customerCategory,
                        label: `${cat.customerCategory} - ${cat.discountPercent}% off${cat.maxDiscount ? ` (max ₹${cat.maxDiscount})` : ''}`,
                      }));
                    })(),
                  ]}
                  className="!bg-slate-100 dark:!bg-slate-700/80 !border-2 !border-slate-300 dark:!border-slate-600 !text-slate-900 dark:!text-white"
                />
              ) : (
                <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-300 dark:border-slate-600">
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {availableCategories.length === 0 ? 'No category discounts available' : 'Loading categories...'}
                  </p>
                  <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">Check browser console for details</p>
                </div>
              )}
              
              {selectedCategory && (() => {
                const selectedCat = availableCategories.find(c => c.customerCategory === selectedCategory);
                const requiresVerification = selectedCat?.categoryVerificationRequired === true;
                console.log('[OfferSummary] Selected category:', selectedCategory);
                console.log('[OfferSummary] Selected cat object:', selectedCat);
                console.log('[OfferSummary] Requires verification:', requiresVerification);
                
                // Show upload option for all selected categories
                return (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Upload ID Proof {requiresVerification && <span className="text-red-500 dark:text-red-400">*</span>}
                      </label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setCategoryIdImage(file);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setCategoryIdImagePreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                          <Upload size={18} className="text-slate-500 dark:text-slate-400" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {categoryIdImage ? categoryIdImage.name : 'Click to upload ID proof'}
                          </span>
                        </div>
                      </label>
                      {categoryIdImagePreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryIdImage(null);
                            setCategoryIdImagePreview(null);
                          }}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                    {categoryIdImagePreview && (
                      <div className="mt-2">
                        <img
                          src={categoryIdImagePreview}
                          alt="ID Preview"
                          className="max-w-full h-32 object-contain rounded-lg border border-slate-600"
                        />
                      </div>
                    )}
                    </div>
                  </div>
                );
              })()}
              
              <Button
                onClick={async () => {
                  if (!selectedCategory || !productId) return;
                  const selectedCat = availableCategories.find(c => c.customerCategory === selectedCategory);
                  if (selectedCat?.categoryVerificationRequired && !categoryIdImage) {
                    showToast('error', 'Please upload ID proof for this category');
                    return;
                  }
                  
                  setApplyingCategory(true);
                  try {
                    console.log('[OfferSummary] Applying category discount:', selectedCategory);
                    console.log('[OfferSummary] Product ID:', productId);
                    console.log('[OfferSummary] Session ID:', sessionId);
                    
                    // Convert image to base64 if exists
                    let idImageBase64 = null;
                    if (categoryIdImage) {
                      idImageBase64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(categoryIdImage);
                      });
                    }
                    
                    // Recalculate offers with category
                    const requestBody = {
                      productId: productId,
                      couponCode: null,
                      customerCategory: selectedCategory,
                      secondPair: null,
                    };
                    console.log('[OfferSummary] Request body:', requestBody);
                    
                    const offersResponse = await fetch(
                      `/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody),
                      }
                    );
                    
                    console.log('[OfferSummary] Response status:', offersResponse.status);
                    const offersData = await offersResponse.json();
                    console.log('[OfferSummary] Response data:', offersData);
                    
                    if (offersData.success && offersData.data) {
                      console.log('[OfferSummary] Category discount in response:', offersData.data.categoryDiscount);
                      console.log('[OfferSummary] Full offer result:', offersData.data);
                      
                      // Apply category discount if it exists (even if savings is 0, to show it's applied)
                      if (offersData.data.categoryDiscount) {
                        setAppliedCategory(selectedCategory);
                        
                        // ✅ IMPORTANT: Update session in database ONLY (no localStorage)
                        // localStorage is not used anymore to prevent stale data issues
                        try {
                          const sessionUpdateResponse = await fetch(
                            `/api/public/questionnaire/sessions/${sessionId}`,
                            {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                customerCategory: selectedCategory,
                              }),
                            }
                          );
                          
                          if (sessionUpdateResponse.ok) {
                            console.log('[OfferSummary] ✅ Session updated with category discount in database');
                          } else {
                            console.warn('[OfferSummary] ⚠️ Failed to update session, but continuing...');
                          }
                        } catch (sessionError) {
                          console.error('[OfferSummary] Error updating session:', sessionError);
                          // Continue even if session update fails (non-critical)
                        }
                        
                        // Update data with new offer result
                        setData(prev => prev ? {
                          ...prev,
                          offerResult: offersData.data,
                        } : null);
                        
                        // ✅ REMOVED: localStorage save - we only use session database now
                        
                        const discountAmount = offersData.data.categoryDiscount.savings || 0;
                        
                        // Fetch all applicable offers after category is applied
                        await fetchAllApplicableOffers(offersData.data);
                        
                        if (discountAmount > 0) {
                          showToast('success', `Category discount applied! You saved ₹${Math.round(discountAmount).toLocaleString()}`);
                        } else {
                          showToast('success', 'Category discount applied!');
                        }
                      } else {
                        console.warn('[OfferSummary] No category discount in response');
                        showToast('warning', 'No discount available for this category');
                      }
                    } else {
                      console.error('[OfferSummary] API error:', offersData.error);
                      showToast('error', offersData.error?.message || 'Failed to apply category discount');
                    }
                  } catch (error) {
                    console.error('[OfferSummary] Exception applying category discount:', error);
                    showToast('error', 'Failed to apply category discount');
                  } finally {
                    setApplyingCategory(false);
                  }
                }}
                disabled={!selectedCategory || applyingCategory}
                loading={applyingCategory}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold shadow-lg"
              >
                Apply Category Discount
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-100 dark:bg-green-500/20 border border-green-300 dark:border-green-500/40 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                  <div>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300">{appliedCategory} Discount Applied</p>
                    {data.offerResult.categoryDiscount && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Saving ₹{Math.round(data.offerResult.categoryDiscount.savings).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    if (!productId) return;
                    setApplyingCategory(true);
                    try {
                      // Recalculate offers without category
                      const offersResponse = await fetch(
                        `/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            productId: productId,
                            couponCode: null,
                            customerCategory: null,
                            secondPair: null,
                            selectedOfferType: selectedOfferType, // Preserve selected offer type
                          }),
                        }
                      );
                      
                      const offersData = await offersResponse.json();
                      if (offersData.success && offersData.data) {
                        setAppliedCategory(null);
                        setSelectedCategory('');
                        setCategoryIdImage(null);
                        setCategoryIdImagePreview(null);
                        // ✅ IMPORTANT: Update session in database to remove category discount
                        // No need to remove from localStorage - we don't use it anymore
                        // This ensures checkout page doesn't show the removed discount
                        try {
                          const sessionUpdateResponse = await fetch(
                            `/api/public/questionnaire/sessions/${sessionId}`,
                            {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                customerCategory: null, // Remove category from session
                              }),
                            }
                          );
                          if (sessionUpdateResponse.ok) {
                            console.log('[OfferSummary] ✅ Session updated - category discount removed from database');
                          } else {
                            console.warn('[OfferSummary] ⚠️ Failed to update session, but continuing...');
                          }
                        } catch (sessionError) {
                          console.error('[OfferSummary] Error updating session:', sessionError);
                          // Continue even if session update fails
                        }
                        
                        // Update data with new offer result (which should have categoryDiscount as null)
                        setData(prev => prev ? {
                          ...prev,
                          offerResult: {
                            ...offersData.data,
                            categoryDiscount: null, // Explicitly set to null to ensure it's removed
                          },
                        } : null);
                        
                        // Fetch all applicable offers after removing category
                        await fetchAllApplicableOffers(offersData.data);
                        
                        showToast('success', 'Category discount removed');
                      }
                    } catch (error) {
                      showToast('error', 'Failed to remove category discount');
                    } finally {
                      setApplyingCategory(false);
                    }
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                >
                  <X size={16} className="mr-1" />
                  Remove
                </Button>
              </div>
              {categoryIdImagePreview && (
                <div className="p-2 bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Uploaded ID Proof:</p>
                  <img
                    src={categoryIdImagePreview}
                    alt="ID Proof"
                    className="max-w-full h-24 object-contain rounded border border-slate-600"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Second Pair Selection for BOGO Offers */}
        {(() => {
          // User picked a non-BOGO primary (e.g. YOPO) — never show 2nd pair here
          if (selectedOfferType && selectedOfferType !== 'BOGO' && selectedOfferType !== 'BOG50') {
            return null;
          }
          // No card selected: if engine already applied YOPO and there is no BOGO second-pair discount, hide BOGO block
          if (
            selectedOfferType == null &&
            isYOPOPrimaryOffer(data.offerResult) &&
            !data.offerResult?.secondPairDiscount
          ) {
            return null;
          }

          // Only show second pair section if BOGO/BOG50 is selected OR if second pair details are already entered
          const isBOGOSelected = selectedOfferType === 'BOGO' || selectedOfferType === 'BOG50';
          const hasSecondPairData = secondPairEnabled && (secondPairFrameMRP || secondPairBrand || secondPairLensId);
          const hasSecondPairDiscount = !!data.offerResult?.secondPairDiscount;
          
          // Only show if:
          // 1. BOGO is explicitly selected, OR
          // 2. Second pair data is already entered (user has started filling it), OR
          // 3. Second pair discount is already applied (from previous selection)
          const shouldShowSecondPair = isBOGOSelected || hasSecondPairData || hasSecondPairDiscount;
          
          console.log('[OfferSummary] BOGO Offer Check:', {
            selectedOfferType,
            isBOGOSelected,
            hasSecondPairData,
            hasSecondPairDiscount,
            secondPairEnabled,
            secondPairFrameMRP,
            shouldShowSecondPair,
          });
          
          if (!shouldShowSecondPair) return null;
          
          return (
            <div className="bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-700 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                  <Package className="text-purple-400" size={18} />
                </div>
                <h2 className="text-xl font-semibold text-white">Second Pair (BOGO Offer)</h2>
              </div>
              
              <div className="space-y-4">
                {/* Auto-enable if BOGO rule is available */}
                {data.offerResult?.availableBOGORule && !secondPairEnabled && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-green-300 font-medium">
                      ✅ {data.offerResult.availableBOGORule.description}
                    </p>
                    <p className="text-xs text-green-400 mt-1">
                      Your frame is eligible for this offer! Select second pair details below.
                    </p>
                  </div>
                )}
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={secondPairEnabled}
                    onChange={(e) => {
                      setSecondPairEnabled(e.target.checked);
                      if (!e.target.checked) {
                        // Reset second pair data
                        setSecondPairFrameMRP('');
                        setSecondPairBrand('');
                        setSecondPairSubBrand('');
                        setSecondPairLensId('');
                        setSecondPairLensPrice(0);
                        setSecondPairLensRecipient(null);
                        setSecondPairProductKind('EYEGLASS');
                        setSecondPairOtherRx(null);
                        setSecondPairTintSelection(null);
                        // Recalculate offers without second pair
                        recalculateOffersWithSecondPair(null);
                      }
                    }}
                    disabled={!!data.offerResult?.availableBOGORule}
                    className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-700 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 cursor-pointer disabled:opacity-50"
                  />
                  <span className="text-base font-semibold text-slate-200">
                    {data.offerResult?.availableBOGORule ? 'Second Pair Discount (Auto-enabled)' : 'Enable Second Pair Discount'}
                  </span>
                </label>
                
                {secondPairEnabled && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
                    <p className="text-sm text-slate-300 font-medium">Enter Second Pair Details:</p>
                    
                    {/* 2nd pair product type: eyeglass / sunglass / power sun — drives frame brands + lens list */}
                    <div>
                      <p className="text-sm font-medium text-slate-200 mb-2">What kind of second pair is this?</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => onSecondPairProductKindChange('EYEGLASS')}
                          className={`flex items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                            secondPairProductKind === 'EYEGLASS'
                              ? 'border-purple-500 bg-purple-500/15 text-white'
                              : 'border-slate-600 bg-slate-800/50 text-slate-200 hover:border-slate-500'
                          }`}
                        >
                          <Glasses className="shrink-0 mt-0.5 text-purple-400" size={20} />
                          <span>
                            <span className="block font-semibold">Eyeglasses</span>
                            <span className="text-xs opacity-80">Clear pair (regular specs)</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSecondPairProductKindChange('SUNGLASS')}
                          className={`flex items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                            secondPairProductKind === 'SUNGLASS'
                              ? 'border-amber-500 bg-amber-500/15 text-white'
                              : 'border-slate-600 bg-slate-800/50 text-slate-200 hover:border-slate-500'
                          }`}
                        >
                          <Sun className="shrink-0 mt-0.5 text-amber-400" size={20} />
                          <span>
                            <span className="block font-semibold">Sunglasses</span>
                            <span className="text-xs opacity-80">Sun pair (fashion / plano sun)</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSecondPairProductKindChange('POWER_SUNGLASS')}
                          className={`flex items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                            secondPairProductKind === 'POWER_SUNGLASS'
                              ? 'border-cyan-500 bg-cyan-500/15 text-white'
                              : 'border-slate-600 bg-slate-800/50 text-slate-200 hover:border-slate-500'
                          }`}
                        >
                          <Glasses className="shrink-0 mt-0.5 text-cyan-400" size={20} />
                          <span>
                            <span className="block font-semibold">Power sunglasses</span>
                            <span className="text-xs opacity-80">Rx in sun (tinted + power)</span>
                          </span>
                        </button>
                      </div>
                    </div>
                    
                    {secondPairProductKind === 'POWER_SUNGLASS' && (
                      <p className="text-xs text-cyan-200/90 font-medium uppercase tracking-wide">Step 1 — Frame: MRP &amp; brand</p>
                    )}

                    {/* Frame Price */}
                    <Input
                      label="Second Pair Frame MRP"
                      type="number"
                      placeholder="e.g., 1500"
                      value={secondPairFrameMRP}
                      onChange={(e) => {
                        setSecondPairFrameMRP(e.target.value);
                        const m = e.target.value ? parseFloat(e.target.value) : 0;
                        if (!m || m <= 0) return;
                        if (secondPairProductKind === 'SUNGLASS' && secondPairBrand) {
                          void recalculateOffersWithSecondPair({
                            frameMRP: m,
                            brand: secondPairBrand,
                            subBrand: secondPairSubBrand,
                            lensId: '',
                            lensPrice: 0,
                          });
                          return;
                        }
                        recalculateOffersWithSecondPair({
                          frameMRP: m,
                          brand: secondPairBrand,
                          subBrand: secondPairSubBrand,
                          lensId: secondPairLensId,
                          lensPrice: secondPairLensPrice,
                        });
                      }}
                      className="!bg-slate-100 dark:!bg-slate-700/80 !border-2 !border-slate-300 dark:!border-slate-600 !text-slate-900 dark:!text-white !placeholder:text-slate-500 dark:!placeholder:text-slate-500"
                    />
                    
                    {/* Frame Brand */}
                    <Select
                      label="Frame Brand"
                      value={secondPairBrand}
                      onChange={(e) => {
                        setSecondPairBrand(e.target.value);
                        setSecondPairSubBrand(''); // Reset sub-brand when brand changes
                        if (!e.target.value) return;
                        const mrp = secondPairFrameMRP ? parseFloat(secondPairFrameMRP) : 0;
                        if (mrp <= 0) return;
                        if (secondPairProductKind === 'SUNGLASS') {
                          void recalculateOffersWithSecondPair({
                            frameMRP: mrp,
                            brand: e.target.value,
                            subBrand: '',
                            lensId: '',
                            lensPrice: 0,
                          });
                          return;
                        }
                        recalculateOffersWithSecondPair({
                          frameMRP: mrp,
                          brand: e.target.value,
                          subBrand: '',
                          lensId: secondPairLensId,
                          lensPrice: secondPairLensPrice,
                        });
                      }}
                      options={[
                        { value: '', label: 'Select Brand' },
                        ...frameBrands.map(b => ({ value: b.brandName, label: b.brandName })),
                      ]}
                      className="!bg-slate-100 dark:!bg-slate-700/80 !border-2 !border-slate-300 dark:!border-slate-600 !text-slate-900 dark:!text-white"
                    />
                    
                    {/* Frame Sub Brand */}
                    {secondPairBrand && availableSubBrands.length > 0 && (
                      <Select
                        label="Frame Sub Brand"
                        value={secondPairSubBrand}
                        onChange={(e) => {
                          setSecondPairSubBrand(e.target.value);
                          if (!secondPairFrameMRP || parseFloat(secondPairFrameMRP) <= 0) return;
                          if (secondPairProductKind === 'SUNGLASS') {
                            void recalculateOffersWithSecondPair({
                              frameMRP: parseFloat(secondPairFrameMRP),
                              brand: secondPairBrand,
                              subBrand: e.target.value,
                              lensId: '',
                              lensPrice: 0,
                            });
                            return;
                          }
                          void recalculateOffersWithSecondPair({
                            frameMRP: parseFloat(secondPairFrameMRP),
                            brand: secondPairBrand,
                            subBrand: e.target.value,
                            lensId: secondPairLensId,
                            lensPrice: secondPairLensPrice,
                          });
                        }}
                        options={[
                          { value: '', label: 'Select Sub Brand (Optional)' },
                          ...availableSubBrands.map(sb => ({ value: sb, label: sb })),
                        ]}
                        className="!bg-slate-100 dark:!bg-slate-700/80 !border-2 !border-slate-300 dark:!border-slate-600 !text-slate-900 dark:!text-white"
                      />
                    )}
                    
                    {secondPairProductKind === 'EYEGLASS' && (
                    <div>
                      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                          Second Pair Lens
                        </span>
                        {secondPairLensRecipient && (
                          <span className="text-xs font-semibold text-purple-600 dark:text-purple-300">
                            {secondPairLensRecipient === 'self'
                              ? '2nd pair for: same customer'
                              : '2nd pair for: someone else'}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Input
                          type="text"
                          placeholder={secondPairLensId ? 'Lens selected' : 'Click to select lens'}
                          value={secondPairLensId ? availableLenses.find(l => l.id === secondPairLensId)?.name || '' : ''}
                          readOnly
                          onClick={() => openSecondPairRecipientStep()}
                          className="flex-1 !bg-slate-100 dark:!bg-slate-700/80 !border-2 !border-slate-300 dark:!border-slate-600 !text-slate-900 dark:!text-white cursor-pointer"
                        />
                        <Button
                          onClick={() => openSecondPairRecipientStep()}
                          variant="outline"
                          className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-purple-500 dark:hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400"
                        >
                          <Eye size={18} className="mr-2" />
                          Select Lens
                        </Button>
                      </div>
                      {!!secondPairLensId && secondPairLensPrice >= 0 && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Selected lens price: ₹{Math.round(secondPairLensPrice).toLocaleString()}
                        </p>
                      )}
                    </div>
                    )}

                    {secondPairProductKind === 'POWER_SUNGLASS' && (
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => openSecondPairRecipientStep()}
                          variant="outline"
                          disabled={!isPowerSunFrameComplete()}
                          className="border-2 border-cyan-500/50 text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {secondPairLensRecipient ? 'Change who it’s for' : 'Start: who is it for?'}
                        </Button>
                        {secondPairLensId && secondPairTintSelection && (
                          <p className="text-xs text-slate-400 self-center">
                            {availableLenses.find((l) => l.id === secondPairLensId)?.name || 'Lens'} · {secondPairTintSelection.tintName}
                            {typeof secondPairTintSelection.tintAddOn === 'number' && secondPairTintSelection.tintAddOn > 0
                              ? ` · tint ₹${Math.round(secondPairTintSelection.tintAddOn).toLocaleString()}`
                              : ''}
                            {secondPairTintSelection.mirrorAddOn > 0
                              ? ` + mirror ₹${secondPairTintSelection.mirrorAddOn.toLocaleString()}`
                              : ''}
                          </p>
                        )}
                      </div>
                      {secondPairLensId && availableLenses.find((l) => l.id === secondPairLensId) && secondPairTintSelection && secondPairLensPrice >= 0 && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          2nd pair lens+shade: ₹{Math.round(secondPairLensPrice).toLocaleString()}
                        </p>
                      )}
                    </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Available Offers Selection */}
        {data.offerResult.availableOffers && data.offerResult.availableOffers.length > 0 && (
          <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-300 dark:border-purple-500/30">
                <Gift className="text-purple-600 dark:text-purple-400" size={18} />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Available Offers</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Select an offer to apply. Only one offer can be applied at a time.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.offerResult.availableOffers.map((offer: any, index: number) => {
                const isSelected = selectedOfferType === offer.type;
                const isCurrentlyApplied = offers.some(o => 
                  o.code === offer.code || 
                  (o.type === offer.type && offer.type !== 'BOGO' && offer.type !== 'BOG50')
                );
                
                return (
                  <button
                    key={index}
                    onClick={async () => {
                      if (isSelected) {
                        // Deselect - recalculate without selected offer (apply default/highest priority)
                        setSelectedOfferType(null);
                        // Reset second pair if it was enabled
                        if (secondPairEnabled) {
                          setSecondPairEnabled(false);
                          setSecondPairFrameMRP('');
                          setSecondPairBrand('');
                          setSecondPairSubBrand('');
                          setSecondPairLensId('');
                          setSecondPairLensPrice(0);
                          setSecondPairLensRecipient(null);
                          setSecondPairProductKind('EYEGLASS');
                          setSecondPairOtherRx(null);
                          setSecondPairTintSelection(null);
                          try {
                            await fetch(`/api/public/questionnaire/sessions/${sessionId}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ secondPairData: null }),
                            });
                          } catch (e) {
                            console.warn('[OfferSummary] Failed to clear secondPairData on deselect', e);
                          }
                        }
                        await fetchOfferSummary();
                      } else {
                        // Select this offer
                        setSelectedOfferType(offer.type);
                        
                        // If BOGO is selected, enable second pair section
                        if (offer.type === 'BOGO' || offer.type === 'BOG50') {
                          setSecondPairEnabled(true);
                        } else {
                          // If non-BOGO offer is selected, disable and reset second pair
                          setSecondPairEnabled(false);
                          setSecondPairFrameMRP('');
                          setSecondPairBrand('');
                          setSecondPairSubBrand('');
                          setSecondPairLensId('');
                          setSecondPairLensPrice(0);
                          setSecondPairLensRecipient(null);
                          setSecondPairProductKind('EYEGLASS');
                          setSecondPairOtherRx(null);
                          setSecondPairTintSelection(null);
                          // Clear session immediately so restore effect / debounced save cannot re-hydrate BOGO
                          try {
                            await fetch(`/api/public/questionnaire/sessions/${sessionId}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ secondPairData: null }),
                            });
                          } catch (e) {
                            console.warn('[OfferSummary] Failed to clear secondPairData on session', e);
                          }
                        }
                        
                        // Recalculate with selected offer
                        setLoading(true);
                        try {
                          const offersResponse = await fetch(
                            `/api/public/questionnaire/sessions/${sessionId}/recalculate-offers`,
                            {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                productId: productId,
                                couponCode: null,
                                customerCategory: appliedCategory,
                                secondPair: null, // Reset second pair when selecting non-BOGO offer
                                selectedOfferType: offer.type,
                              }),
                            }
                          );
                          
                          const offersData = await offersResponse.json();
                          if (offersData.success && offersData.data) {
                            setData(prev => prev ? {
                              ...prev,
                              offerResult: offersData.data,
                            } : null);
                            showToast('success', `${offer.description} selected!`);
                          }
                        } catch (error) {
                          showToast('error', 'Failed to apply offer');
                        } finally {
                          setLoading(false);
                        }
                      }
                    }}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected || isCurrentlyApplied
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/20 shadow-md'
                        : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:border-purple-300 dark:hover:border-purple-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white">{offer.description}</h3>
                          {(isSelected || isCurrentlyApplied) && (
                            <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">Applied</span>
                          )}
                        </div>
                        {offer.estimatedSavings > 0 && (
                          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                            Estimated Savings: ₹{Math.round(offer.estimatedSavings).toLocaleString()}
                          </p>
                        )}
                        {offer.type === 'BOGO' || offer.type === 'BOG50' ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Select second pair to see savings
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price Breakdown Card */}
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-300 dark:border-blue-500/30">
              <Tag className="text-blue-600 dark:text-blue-400" size={18} />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Price Breakdown</h2>
          </div>

          <div className="space-y-4">
            {/* Price Components - Use priceComponents array for accurate breakdown */}
            {data.offerResult.priceComponents && data.offerResult.priceComponents.length > 0 ? (
              <>
                {data.offerResult.priceComponents
                  .filter((component: any) => {
                    // Filter out category discounts from price breakdown
                    // Category discounts should only show in applicable offers section
                    const labelLower = (component.label || '').toLowerCase();
                    const isCategoryDiscount = labelLower.includes('category') || 
                                              labelLower.includes('student') ||
                                              labelLower.includes('doctor') ||
                                              labelLower.includes('teacher') ||
                                              labelLower.includes('senior') ||
                                              labelLower.includes('corporate') ||
                                              labelLower.includes('armed') ||
                                              labelLower.includes('forces') ||
                                              labelLower.includes('citizen');
                    
                    // Also check if categoryDiscount exists in offerResult - if it's null/undefined, filter out any matching components
                    const hasCategoryDiscount = !!data.offerResult?.categoryDiscount;
                    if (!hasCategoryDiscount && isCategoryDiscount) {
                      return false; // Hide category discount if it's been removed
                    }
                    
                    // Filter out Frame MRP if it's 0 or if it's an only lens flow
                    const isFrameMRP = labelLower.includes('frame') && (labelLower.includes('mrp') || labelLower.includes('price'));
                    if (isFrameMRP && (isOnlyLensFlow || component.amount === 0)) {
                      return false; // Hide Frame MRP in only lens flow or when it's 0
                    }
                    
                    // Filter out any component with 0 discount amount
                    const hasZeroDiscount = component.amount < 0 && Math.abs(component.amount) === 0;
                    
                    // Filter out components with "0 off" or "₹0" in label
                    const hasZeroInLabel = labelLower.includes('₹0') || 
                                          labelLower.includes('0 off') ||
                                          labelLower.includes('flat ₹0') ||
                                          labelLower.includes('flat 0');
                    
                    return !isCategoryDiscount && !hasZeroDiscount && !hasZeroInLabel;
                  })
                  .map((component: any, index: number) => {
                    // Show all components - positive amounts are prices, negative are discounts
                    if (component.amount < 0) {
                      // Discount component - show with green styling
                      // Don't show if discount is 0
                      if (Math.abs(component.amount) === 0) {
                        return null;
                      }
                      return (
                        <div key={index} className="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-green-100 via-emerald-100 to-green-100 dark:from-green-500/20 dark:via-emerald-500/20 dark:to-green-500/20 rounded-lg border-2 border-green-300 dark:border-green-400/50">
                          <span className="text-green-700 dark:text-green-200 font-medium">{component.label}</span>
                          <span className="text-lg font-bold text-green-600 dark:text-green-300">-₹{Math.round(Math.abs(component.amount)).toLocaleString()}</span>
                        </div>
                      );
                    } else {
                      // Price component
                      return (
                        <div key={index} className="flex justify-between items-center py-3 px-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-300 dark:border-slate-600">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{component.label}</span>
                          <span className="text-lg font-semibold text-slate-900 dark:text-white">₹{Math.round(component.amount).toLocaleString()}</span>
                        </div>
                      );
                    }
                  })
                  .filter(Boolean) // Remove null entries (0 discounts)
                }
              </>
            ) : (
              <>
                {/* Fallback to original display if priceComponents not available */}
                {/* Hide Frame MRP if it's 0 or if it's an only lens flow */}
                {!isOnlyLensFlow && data.offerResult.frameMRP > 0 && (
                  <div className="flex justify-between items-center py-3 px-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-300 dark:border-slate-600">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Frame MRP</span>
                    <span className="text-lg font-semibold text-slate-900 dark:text-white">₹{Math.round(data.offerResult.frameMRP).toLocaleString()}</span>
                  </div>
                )}
                {data.offerResult.lensPrice > 0 && (
                  <div className="flex justify-between items-center py-3 px-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-300 dark:border-slate-600">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Lens Price</span>
                    <span className="text-lg font-semibold text-slate-900 dark:text-white">₹{Math.round(data.offerResult.lensPrice).toLocaleString()}</span>
                  </div>
                )}
              </>
            )}

            {/* Discount components are already shown above, no need to duplicate */}

            {/* Subtotal - Show effectiveBase if YOPO/Combo is applied, otherwise baseTotal */}
            <div className="flex justify-between items-center py-4 px-4 bg-slate-100 dark:bg-slate-700/70 rounded-lg border border-slate-300 dark:border-slate-600">
              <span className="text-lg font-semibold text-slate-900 dark:text-white">Subtotal</span>
              <span className="text-xl font-semibold text-slate-900 dark:text-white">
                ₹{Math.round((data.offerResult.effectiveBase ?? data.offerResult.baseTotal)).toLocaleString()}
              </span>
            </div>

            {/* Total Discount - Only show if there are additional discounts beyond primary offer */}
            {(() => {
              // Total discount is baseTotal - finalPayable
              // This should automatically exclude category discount if it's been removed
              const actualTotalDiscount = data.offerResult.baseTotal - data.offerResult.finalPayable;
              
              // Check if there are any active discounts (category, coupon, or second pair)
              const hasCategoryDiscount = !!data.offerResult.categoryDiscount && (data.offerResult.categoryDiscount.savings || 0) > 0;
              const hasCouponDiscount = !!data.offerResult.couponDiscount && (data.offerResult.couponDiscount.savings || 0) > 0;
              const hasSecondPairDiscount = !!data.offerResult.secondPairDiscount && (data.offerResult.secondPairDiscount.savings || 0) > 0;
              
              // Only show total discount if:
              // 1. There's an actual discount amount > 0
              // 2. AND at least one active discount source exists (category, coupon, or second pair)
              // This ensures that if category discount is removed, total discount won't show if it was the only discount
              if (actualTotalDiscount > 0 && (hasCategoryDiscount || hasCouponDiscount || hasSecondPairDiscount)) {
                return (
                  <div className="relative overflow-hidden flex justify-between items-center py-4 px-4 bg-gradient-to-r from-green-100 via-emerald-100 to-green-100 dark:from-green-500/20 dark:via-emerald-500/20 dark:to-green-500/20 rounded-lg border-2 border-green-300 dark:border-green-400/50 shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                    <span className="relative text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="relative">
                        <div className="absolute inset-0 bg-green-400 rounded-full blur-md animate-ping opacity-75" />
                        <Percent className="relative text-green-600 dark:text-green-300" size={20} />
                      </div>
                      Total Discount
                    </span>
                    <span className="relative text-2xl font-bold text-green-600 dark:text-green-300">
                      -₹{Math.round(actualTotalDiscount).toLocaleString()}
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Final Payable */}
            <div className="relative overflow-hidden bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 rounded-lg p-4 sm:p-6 border-2 border-green-400/50 shadow-2xl transform hover:scale-[1.01] transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 animate-pulse" />
              <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-green-100 text-xs sm:text-sm font-semibold mb-1 uppercase tracking-wide">Final Payable</p>
                  <p className="text-green-200 text-xs sm:text-sm">Including all discounts & offers</p>
                </div>
                <div className="text-right sm:text-right w-full sm:w-auto flex-shrink-0">
                  <div className="bg-white/20 backdrop-blur rounded-lg px-3 sm:px-4 py-2 border border-white/30 inline-block sm:block">
                    <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white whitespace-nowrap">
                      ₹{Math.round(data.offerResult.finalPayable).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Button
            onClick={() => router.push(`/questionnaire/${sessionId}/recommendations`)}
            variant="outline"
            className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white font-medium py-3"
          >
            <ArrowLeft size={18} className="mr-2" />
            Change Lens
          </Button>
          <Button
            onClick={async () => {
              const mrp = parseFloat(secondPairFrameMRP) || 0;
              const canPreSave =
                secondPairEnabled &&
                mrp > 0 &&
                secondPairBrand &&
                (secondPairProductKind === 'SUNGLASS' ||
                  (secondPairProductKind === 'EYEGLASS' && secondPairLensId && secondPairLensPrice >= 0) ||
                  (secondPairProductKind === 'POWER_SUNGLASS' &&
                    secondPairLensId &&
                    secondPairLensPrice >= 0 &&
                    secondPairTintSelection));
              if (canPreSave) {
                const selectedLens = availableLenses.find((l) => l.id === secondPairLensId);
                const baseData: Record<string, unknown> = {
                  enabled: true,
                  frameMRP: mrp,
                  brand: secondPairBrand,
                  subBrand: secondPairSubBrand,
                  secondPairProductKind,
                  lensRecipient: secondPairLensRecipient,
                };
                if (secondPairProductKind === 'SUNGLASS') {
                  baseData.lensName = 'Ready-made sunglasses (no separate lens selection)';
                  baseData.lensId = '';
                  baseData.lensPrice = 0;
                  baseData.readyMadeSunglasses = true;
                } else {
                  baseData.lensId = secondPairLensId;
                  baseData.lensName = selectedLens?.name || 'Lens';
                  baseData.lensPrice = secondPairLensPrice;
                }
                if (secondPairProductKind === 'POWER_SUNGLASS') {
                  if (secondPairOtherRx) baseData.secondPairOtherRx = secondPairOtherRx;
                  if (secondPairTintSelection) baseData.tintSelection = secondPairTintSelection;
                }
                try {
                  const response = await fetch(`/api/public/questionnaire/sessions/${sessionId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secondPairData: baseData }),
                  });
                  if (response.ok) {
                    console.log('[OfferSummary] ✅ Saved second pair before checkout:', baseData);
                  }
                } catch (error) {
                  console.error('[OfferSummary] Save before checkout:', error);
                }
              }
              router.push(`/questionnaire/${sessionId}/checkout/${productId}`);
            }}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 shadow-lg hover:shadow-green-500/50 transform hover:scale-[1.02] transition-all duration-300 border-2 border-green-400/50"
          >
            <ShoppingCart size={18} className="mr-2" />
            Proceed to Checkout
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      </div>

      {/* Upsell Strip - Sticky Banner */}
      {data.offerResult.upsell ? (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 py-2 sm:py-3 md:py-4 px-3 sm:px-4 md:px-6 shadow-2xl border-t-2 sm:border-t-4 border-yellow-600 z-40 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          <div className="max-w-5xl mx-auto relative flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 w-full sm:w-auto">
              <div className="relative flex-shrink-0 hidden sm:block">
                <div className="absolute inset-0 bg-yellow-600 rounded-full blur-lg animate-pulse opacity-75" />
                <Gift className="relative text-yellow-900" size={20} />
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <p className="text-yellow-900 font-bold text-xs sm:text-sm md:text-base leading-tight">
                  {data.offerResult.upsell.message}
                </p>
                {data.offerResult.upsell.rewardText && (
                  <p className="text-yellow-800 text-xs sm:text-sm font-semibold hidden sm:block">
                    ?? {data.offerResult.upsell.rewardText}
                  </p>
                )}
              </div>
            </div>
            <Button
              onClick={fetchEligibleProducts}
              className="bg-yellow-900 hover:bg-yellow-800 text-white font-bold px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 text-xs sm:text-sm whitespace-nowrap shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-yellow-800 rounded-lg w-full sm:w-auto"
            >
              See eligible products
            </Button>
          </div>
        </div>
      ) : (
        // Fallback upsell banner if no upsell from backend
        (() => {
          const currentTotal = data.offerResult.finalPayable;
          
          // Show upsell if total is less than common thresholds
          const thresholds = [
            { amount: 5000, reward: 'free Lenstrack Sunglass worth ₹1499', remaining: 5000 - currentTotal },
            { amount: 3000, reward: 'extra ₹500 OFF', remaining: 3000 - currentTotal },
            { amount: 2000, reward: 'free Anti-Glare coating worth ₹2000', remaining: 2000 - currentTotal },
          ];
          
          // Find the best threshold that customer hasn't reached yet
          const bestThreshold = thresholds.find(t => t.remaining > 0 && t.remaining <= 1000);
          
          if (bestThreshold) {
            const remaining = Math.ceil(bestThreshold.remaining / 100) * 100; // Round to nearest 100
            
            console.log('[OfferSummary] ?? Showing fallback upsell banner:', {
              currentTotal,
              threshold: bestThreshold.amount,
              remaining,
              reward: bestThreshold.reward,
            });
            
            return (
              <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 py-2 sm:py-3 md:py-4 px-3 sm:px-4 md:px-6 shadow-2xl border-t-2 sm:border-t-4 border-yellow-600 z-40 backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                <div className="max-w-5xl mx-auto relative flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 w-full sm:w-auto">
                    <div className="relative flex-shrink-0 hidden sm:block">
                      <div className="absolute inset-0 bg-yellow-600 rounded-full blur-lg animate-pulse opacity-75" />
                      <Gift className="relative text-yellow-900" size={20} />
                    </div>
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <p className="text-yellow-900 font-bold text-xs sm:text-sm md:text-base leading-tight">
                        Add ₹{remaining.toLocaleString()} more and get {bestThreshold.reward}
                      </p>
                      <p className="text-yellow-800 text-xs sm:text-sm font-semibold hidden sm:block">
                        ?? Unlock amazing rewards with just a little more!
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={fetchEligibleProducts}
                    className="bg-yellow-900 hover:bg-yellow-800 text-white font-bold px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 text-xs sm:text-sm whitespace-nowrap shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-yellow-800 rounded-lg w-full sm:w-auto"
                  >
                    See eligible products
                  </Button>
                </div>
              </div>
            );
          }
          
          console.log('[OfferSummary] ?? No fallback upsell banner - customer total too high or too low');
          return null;
        })()
      )}

      {/* Eligible Products Modal */}
      {showEligibleProducts && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 px-6 py-5 border-b border-yellow-600 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Eligible Products</h2>
                  {data.offerResult.upsell && (
                    <p className="text-yellow-100 text-sm">
                      Add ₹{data.offerResult.upsell.remaining.toLocaleString()} more to unlock {data.offerResult.upsell.rewardText}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowEligibleProducts(false);
                    setEligibleProducts([]);
                  }}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Products List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin" />
                    <p className="text-slate-600 font-medium">Loading eligible products...</p>
                  </div>
                </div>
              ) : eligibleProducts.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {eligibleProducts.map((product: any) => {
                    // Handle both API response format and recommendations format
                    const productPrice = product.storePrice || product.pricing?.finalPrice || product.pricing?.subtotal || product.basePrice || 0;
                    const productName = product.name || product.product?.name || 'Product';
                    const productBrand = product.brand || product.product?.brand || '';
                    const productImage = product.imageUrl || product.product?.imageUrl || '';
                    const productId = product.id || product.productId;
                    const subtotal = product.pricing?.subtotal || product.storePrice || product.basePrice || 0;
                    
                    return (
                      <div
                        key={productId || Math.random()}
                        className="border-2 border-slate-200 rounded-xl p-5 hover:border-yellow-400 hover:shadow-lg transition-all bg-white group cursor-pointer"
                        onClick={() => {
                          // Navigate to product details
                          if (productId) {
                            router.push(`/questionnaire/${sessionId}/offer-summary/${productId}`);
                            setShowEligibleProducts(false);
                          }
                        }}
                      >
                        <div className="flex items-start gap-4">
                          {productImage && productImage.trim() ? (
                            <img
                              src={productImage}
                              alt={productName}
                              className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-lg border border-yellow-200 flex items-center justify-center flex-shrink-0">
                              <Package className="text-yellow-600" size={32} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 mb-1 text-lg line-clamp-2">{productName}</h3>
                            {productBrand && (
                              <p className="text-slate-600 text-sm mb-2">{productBrand}</p>
                            )}
                            {product.sku && (
                              <p className="text-xs text-slate-500 mb-2">SKU: {product.sku}</p>
                            )}
                            <div className="flex items-center justify-between mt-3">
                              <div>
                                <span className="text-2xl font-bold text-slate-900">
                                  ₹{Math.round(productPrice).toLocaleString()}
                                </span>
                                {subtotal > productPrice && (
                                  <span className="text-sm text-slate-500 line-through ml-2">
                                    ₹{Math.round(subtotal).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-lg border border-yellow-300 whitespace-nowrap">
                                  Select
                                </span>
                                <ArrowRight className="text-yellow-600 group-hover:translate-x-1 transition-transform" size={18} />
                              </div>
                            </div>
                            {data.offerResult.upsell && (
                              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-700 font-medium">
                                  ? Adding this will unlock your reward!
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="text-slate-400 mx-auto mb-4" size={48} />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No Products Found</h3>
                  <p className="text-slate-600 mb-6">
                    We couldn't find products matching your criteria at this time.
                  </p>
                  <Button
                    onClick={() => {
                      setShowEligibleProducts(false);
                    }}
                    variant="outline"
                    className="border-2 border-slate-300"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gradient-to-r from-slate-50 to-yellow-50 border-t-2 border-slate-200 px-6 py-4 rounded-b-3xl">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  {eligibleProducts.length > 0 && (
                    <span className="font-semibold text-slate-900">{eligibleProducts.length}</span>
                  )}{' '}
                  products found
                </p>
                <Button
                  onClick={() => {
                    setShowEligibleProducts(false);
                    setEligibleProducts([]);
                  }}
                  variant="outline"
                  className="border-2 border-slate-300"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOGO: who is the 2nd pair of lenses for? (before lens list) — eyeglass + “someone else” offers full merge flow in this modal */}
      {showSecondPairRecipientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-600 overflow-hidden animate-in zoom-in-95 duration-200">
            {bogoSecondPairModalScreen === 'who' ? (
              <>
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4">
                  <h2 className="text-lg font-bold text-white">Second pair: who is it for?</h2>
                  <p className="text-violet-100 text-sm mt-1">
                    Tell us whether the second pair of lenses is for the same person as the first pair, or for someone
                    else.
                  </p>
                </div>
                <div className="p-5 space-y-3">
                  <button
                    type="button"
                    onClick={() => applySecondPairRecipientAndOpenLenses('self')}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:border-purple-500 dark:hover:border-purple-500 text-left transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                      <User className="text-purple-600 dark:text-purple-400" size={22} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">Same customer</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Both pairs for the person being served now</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applySecondPairRecipientAndOpenLenses('other')}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:border-purple-500 dark:hover:border-purple-500 text-left transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                      <Users className="text-indigo-600 dark:text-indigo-400" size={22} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">Someone else</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">E.g. family member, child, or another prescription</div>
                    </div>
                  </button>
                </div>
                <div className="px-5 pb-5">
                  <Button
                    fullWidth
                    variant="outline"
                    onClick={() => {
                      setShowSecondPairRecipientModal(false);
                      setBogoSecondPairModalScreen('who');
                    }}
                    className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4">
                  <h2 className="text-lg font-bold text-white">Other person — how do you want to add lenses?</h2>
                  <p className="text-violet-100 text-sm mt-1">
                    Use the full flow (name, prescription, questions, then pick lens and merge). Or select a lens from
                    the catalog on this offer page only.
                  </p>
                </div>
                <div className="p-5 space-y-3">
                  <Button
                    fullWidth
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                    disabled={startingBogoChildQuestionnaire}
                    onClick={() => void startBogoOtherPersonFullQuestionnaire()}
                  >
                    {startingBogoChildQuestionnaire
                      ? 'Starting…'
                      : 'Full flow for other person (merge back here)'}
                  </Button>
                  <Button
                    fullWidth
                    variant="outline"
                    onClick={() => openEyeglassSecondPairLensCatalogFromModal()}
                    className="border-slate-300 dark:border-slate-600"
                  >
                    Select lens from catalog
                  </Button>
                </div>
                <div className="px-5 pb-5">
                  <Button
                    fullWidth
                    variant="outline"
                    onClick={() => {
                      setBogoSecondPairModalScreen('who');
                      setSecondPairLensRecipient(null);
                    }}
                    className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                  >
                    Back
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* POWER SUN: prescription for “someone else” */}
      {showSecondPairRxModal && secondPairOtherRx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[75] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-600 p-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">2nd pair — other person Rx</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Enter prescription for the person receiving this power sunglass pair.</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Input label="OD Sph" type="text" value={secondPairOtherRx.odSphere} onChange={(e) => setSecondPairOtherRx({ ...secondPairOtherRx, odSphere: e.target.value })} className="!text-slate-900" />
              <Input label="OS Sph" type="text" value={secondPairOtherRx.osSphere} onChange={(e) => setSecondPairOtherRx({ ...secondPairOtherRx, osSphere: e.target.value })} className="!text-slate-900" />
              <Input label="OD Cyl" type="text" value={secondPairOtherRx.odCylinder} onChange={(e) => setSecondPairOtherRx({ ...secondPairOtherRx, odCylinder: e.target.value })} className="!text-slate-900" />
              <Input label="OS Cyl" type="text" value={secondPairOtherRx.osCylinder} onChange={(e) => setSecondPairOtherRx({ ...secondPairOtherRx, osCylinder: e.target.value })} className="!text-slate-900" />
              <Input label="Add (if any)" type="text" value={secondPairOtherRx.odAdd} onChange={(e) => setSecondPairOtherRx({ ...secondPairOtherRx, odAdd: e.target.value })} className="!text-slate-900 col-span-2" />
            </div>
            <div className="flex gap-2 mt-4">
              <Button fullWidth variant="outline" onClick={() => { setShowSecondPairRxModal(false); setBogoSecondPairModalScreen('who'); setShowSecondPairRecipientModal(true); }}>Back</Button>
              <Button fullWidth onClick={() => { void finishSecondPairRxForPowerSun(); }}>Save &amp; continue</Button>
            </div>
          </div>
        </div>
      )}

      {/* POWER SUN: full tint chart first (lens list skipped; uses 1st-pair lens SKU + index) */}
      {showSecondPairTintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-600 overflow-hidden">
            <div className="shrink-0 bg-gradient-to-r from-cyan-700 to-slate-900 px-4 sm:px-6 py-4 border-b border-cyan-900/50">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Palette className="text-cyan-300" size={24} />
                    2nd pair — tint chart
                  </h2>
                  <p className="text-cyan-100/90 text-sm mt-1 pr-2">
                    Every shade: swatch, product code, darkness, and add-on price for index{' '}
                    {pendingPowerSunLens?.index ? formatLensIndexDisplay(pendingPowerSunLens.index) : '—'}. Lens
                    base = your 1st-pair lens (not the long lens list).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSecondPairTintModal(false);
                    setTintFormPick({ tintId: null, mirrorId: null });
                  }}
                  className="text-white/90 hover:text-white p-1 rounded-lg hover:bg-white/10"
                  aria-label="Close"
                >
                  <X size={22} />
                </button>
              </div>
            </div>
            {tintPricesLoading && (
              <div className="shrink-0 px-4 py-2 bg-amber-50 dark:bg-amber-950/40 text-sm text-amber-900 dark:text-amber-200">
                Loading prices for all shades…
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {tintChartGrouped.map(([cat, items]) => (
                <div key={cat} className="mb-8 last:mb-0">
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-200 dark:border-slate-700 pb-1">
                    {humanizeLensEnum(cat)}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((c) => {
                      const pt = tintColorPrices[c.id];
                      const hasPrice = typeof pt === 'number' && !tintPricesLoading;
                      const selected = tintFormPick.tintId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setTintFormPick((p) => ({ ...p, tintId: c.id }))}
                          className={`text-left rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg ${
                            selected
                              ? 'border-cyan-500 ring-2 ring-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-950/30'
                              : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/80'
                          }`}
                        >
                          <div
                            className="h-32 w-full flex items-center justify-center relative overflow-hidden"
                            style={
                              c.imageUrl
                                ? undefined
                                : c.hexColor
                                  ? { backgroundColor: c.hexColor }
                                  : { background: 'linear-gradient(180deg, #e2e8f0, #94a3b8)' }
                            }
                          >
                            {c.imageUrl ? (
                              <img
                                src={c.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                            {c.isPolarized && (
                              <span className="absolute top-2 right-2 text-[10px] font-bold bg-black/65 text-white px-1.5 py-0.5 rounded">
                                POL
                              </span>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{c.code}</p>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm leading-snug mt-0.5">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Shade {c.darknessPercent}% darkness
                            </p>
                            <p className="text-lg font-bold text-cyan-700 dark:text-cyan-300 mt-1.5">
                              {tintPricesLoading ? '…' : hasPrice ? `+ ₹${Math.round(pt).toLocaleString()}` : '—'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {tintModalMirrors.length > 0 && (
              <div className="shrink-0 border-t border-slate-200 dark:border-slate-600 px-4 sm:px-6 py-3 bg-slate-50/80 dark:bg-slate-800/30">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Mirror (optional)</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTintFormPick((p) => ({ ...p, mirrorId: null }))}
                    className={`px-3 py-2 rounded-lg text-sm border-2 ${
                      !tintFormPick.mirrorId
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40'
                        : 'border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    None
                  </button>
                  {tintModalMirrors.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setTintFormPick((p) => ({ ...p, mirrorId: m.id }))}
                      className={`px-3 py-2 rounded-lg text-sm border-2 flex items-center gap-2 ${
                        tintFormPick.mirrorId === m.id
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40'
                          : 'border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      {m.imageUrl ? (
                        <img src={m.imageUrl} alt="" className="h-7 w-7 object-cover rounded" />
                      ) : null}
                      <span>
                        {m.name}
                        {m.addOnPrice > 0 ? (
                          <span className="text-cyan-700 dark:text-cyan-300"> (+₹{m.addOnPrice.toLocaleString()})</span>
                        ) : null}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tintFormPick.tintId && typeof tintColorPrices[tintFormPick.tintId] === 'number' && pendingPowerSunLens && (
              <div className="shrink-0 border-t border-slate-200 dark:border-slate-600 px-4 sm:px-6 py-3 bg-slate-100/90 dark:bg-slate-800/50">
                <p className="text-sm text-slate-800 dark:text-slate-100">
                  <span className="font-semibold">Total (2nd pair lens line):</span> lens ₹
                  {Math.round(pendingPowerSunLens.price).toLocaleString()} + tint ₹
                  {Math.round(tintColorPrices[tintFormPick.tintId] || 0).toLocaleString()}
                  {tintFormPick.mirrorId
                    ? (() => {
                        const mir = tintModalMirrors.find((x) => x.id === tintFormPick.mirrorId);
                        return mir ? ` + mirror ₹${Math.round(mir.addOnPrice).toLocaleString()}` : '';
                      })()
                    : ''}
                </p>
              </div>
            )}
            <div className="shrink-0 flex flex-col sm:flex-row gap-2 p-4 border-t border-slate-200 dark:border-slate-600">
              <Button
                fullWidth
                variant="outline"
                onClick={() => {
                  setShowSecondPairTintModal(false);
                  setTintFormPick({ tintId: null, mirrorId: null });
                  setBogoSecondPairModalScreen('who');
                  setShowSecondPairRecipientModal(true);
                }}
                className="order-2 sm:order-1"
              >
                Back
              </Button>
              <Button
                fullWidth
                onClick={() => {
                  void confirmPowerSunTint();
                }}
                className="order-1 sm:order-2 bg-cyan-600 hover:bg-cyan-700"
              >
                Apply &amp; continue with BOGO
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lens Selection Modal for Second Pair */}
      {showLensSelectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 px-6 py-5 border-b border-purple-700 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Select Second Pair Lens</h2>
                  <p className="text-purple-100 text-sm">
                    {secondPairProductKind === 'EYEGLASS' && (
                      <>
                        Choose a clear lens for{' '}
                        {secondPairLensRecipient === 'other' ? 'the other person' : 'this customer'}.
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowLensSelectionModal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingLenses ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 mx-auto mb-4 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                  <p className="text-slate-600">Loading lenses...</p>
                </div>
              ) : availableLenses.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-700 font-medium">No lenses available for this option</p>
                  <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    {data?.selectedLens?.visionType
                      ? `There are no ${humanizeLensEnum(data.selectedLens.visionType).toLowerCase()} lenses in this catalog for the selected product type. You can go back and pick another 2nd-pair product type, or check inventory.`
                      : 'No lenses were returned. Try again or check store configuration.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-10">
                  {groupedSecondPairLenses.map(({ brand, lenses }) => (
                    <section key={brand} className="scroll-mt-4">
                      <div className="sticky top-0 z-[1] -mx-1 px-1 py-2 mb-3 bg-white/95 backdrop-blur border-b border-slate-200">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-purple-800">{brand}</h3>
                        <p className="text-xs text-slate-500">{lenses.length} option{lenses.length === 1 ? '' : 's'}</p>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {lenses.map((lens) => (
                          <div
                            key={lens.id}
                            className={`border-2 rounded-xl p-4 hover:shadow-md transition-all bg-white ${
                              secondPairLensId === lens.id
                                ? 'border-purple-500 bg-purple-50/80 ring-1 ring-purple-200'
                                : 'border-slate-200 hover:border-purple-300'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-stretch gap-4">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-base font-bold text-slate-900 leading-snug">{lens.name}</h4>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                                    Index {formatLensIndexDisplay(lens.index)}
                                  </span>
                                  {lens.visionType && (
                                    <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-800 border border-indigo-100">
                                      {humanizeLensEnum(lens.visionType)}
                                    </span>
                                  )}
                                  {lens.category && (
                                    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900 border border-amber-100">
                                      {humanizeLensEnum(lens.category)}
                                    </span>
                                  )}
                                  {lens.tintOption && lens.tintOption !== 'CLEAR' && (
                                    <span className="inline-flex items-center rounded-md bg-cyan-50 px-2 py-0.5 text-[11px] font-medium text-cyan-900 border border-cyan-100">
                                      {humanizeLensEnum(lens.tintOption)}
                                    </span>
                                  )}
                                </div>
                                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                                  <div>
                                    <dt className="text-slate-400 font-medium">IT code</dt>
                                    <dd className="text-slate-800 font-mono truncate" title={lens.itCode}>
                                      {lens.itCode || '—'}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-slate-400 font-medium">Delivery</dt>
                                    <dd className="text-slate-800">
                                      {typeof lens.deliveryDays === 'number' ? `${lens.deliveryDays} days` : '—'}
                                    </dd>
                                  </div>
                                  <div className="col-span-2">
                                    <dt className="text-slate-400 font-medium">Brand line</dt>
                                    <dd className="text-slate-800">{lens.brandLine || '—'}</dd>
                                  </div>
                                </dl>
                                <div className="mt-3 flex items-baseline gap-2">
                                  <span className="text-xl font-bold text-slate-900">
                                    ₹{Math.round(lens.price || 0).toLocaleString()}
                                  </span>
                                  <span className="text-xs text-slate-500">offer price</span>
                                </div>
                              </div>
                              <div className="flex sm:flex-col justify-end shrink-0">
                                <Button
                                  onClick={() => {
                                    setSecondPairLensId(lens.id);
                                    setSecondPairLensPrice(lens.price || 0);
                                    setShowLensSelectionModal(false);
                                    if (secondPairFrameMRP && parseFloat(secondPairFrameMRP) > 0) {
                                      void recalculateOffersWithSecondPair({
                                        frameMRP: parseFloat(secondPairFrameMRP),
                                        brand: secondPairBrand,
                                        subBrand: secondPairSubBrand,
                                        lensId: lens.id,
                                        lensPrice: lens.price || 0,
                                      });
                                    }
                                  }}
                                  className={`font-bold px-6 py-2.5 shadow-md w-full sm:w-auto ${
                                    secondPairLensId === lens.id
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                                  }`}
                                >
                                  {secondPairLensId === lens.id ? 'Selected' : 'Select'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gradient-to-r from-slate-50 to-purple-50 border-t-2 border-slate-200 px-6 py-4 rounded-b-3xl">
              <Button
                fullWidth
                onClick={() => setShowLensSelectionModal(false)}
                variant="outline"
                className="border-2 border-slate-300 text-slate-700 hover:bg-white hover:border-purple-400 font-semibold py-3 shadow-sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

