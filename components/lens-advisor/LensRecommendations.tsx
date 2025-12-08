'use client';

/**
 * Step 4: Lens Recommendations
 * Enhanced to show exactly 4 lenses with specific roles (BEST_MATCH, RECOMMENDED_INDEX, PREMIUM, BUDGET)
 */

import { useState, useMemo } from 'react';
import { useLensAdvisorStore } from '@/stores/lens-advisor-store';
import { Button } from '@/components/ui/Button';
import { Sparkles, GitCompare, List } from 'lucide-react';
import { LensRecommendationCard } from './LensRecommendationCard';
import { LensComparisonTable } from './LensComparisonTable';
import { PriceMatrixModal } from './PriceMatrixModal';
import { Modal } from '@/components/ui/Modal';
import { IndexRecommendationService } from '@/services/index-recommendation.service';

export function LensRecommendations() {
  const setCurrentStep = useLensAdvisorStore((state) => state.setCurrentStep);
  const recommendations = useLensAdvisorStore((state) => state.recommendations);
  const selectedLens = useLensAdvisorStore((state) => state.selectedLens);
  const setSelectedLens = useLensAdvisorStore((state) => state.setSelectedLens);
  const rx = useLensAdvisorStore((state) => state.rx);
  const frame = useLensAdvisorStore((state) => state.frame);

  const [showComparison, setShowComparison] = useState(false);
  const [showPriceMatrix, setShowPriceMatrix] = useState(false);
  const indexService = new IndexRecommendationService();

  // Calculate recommended index from prescription
  const recommendedIndex = useMemo(() => {
    if (!rx.odSphere && !rx.osSphere) return null;
    
    const rxInput = {
      rSph: rx.odSphere || null,
      rCyl: rx.odCylinder || null,
      rAxis: rx.odAxis || null,
      rAdd: rx.odAdd || null,
      lSph: rx.osSphere || null,
      lCyl: rx.osCylinder || null,
      lAxis: rx.osAxis || null,
      lAdd: rx.osAdd || null,
    };
    
    return indexService.recommendIndex(rxInput, frame);
  }, [rx, frame]);

  // Select exactly 4 lenses with roles
  const fourLenses = useMemo(() => {
    if (recommendations.length === 0) return [];
    
    const sorted = [...recommendations].sort((a: any, b: any) => {
      const scoreA = a.matchPercent || a.matchScore || 0;
      const scoreB = b.matchPercent || b.matchScore || 0;
      return scoreB - scoreA;
    });

    // 1. Best Match (highest score)
    const bestMatch = sorted[0];
    
    // 2. Recommended Index (matches recommended index)
    const recommendedIndexLens = sorted.find((lens: any) => {
      const lensIndex = lens.index || lens.lensIndex;
      return lensIndex === recommendedIndex;
    }) || sorted[1] || sorted[0];
    
    // 3. Premium Upgrade (score > 100% or highest premium option)
    const premium = sorted.find((lens: any) => {
      const score = lens.matchPercent || lens.matchScore || 0;
      return score > 100;
    }) || sorted[2] || sorted[0];
    
    // 4. Budget (lowest price safe option)
    const sortedByPrice = [...sorted].sort((a: any, b: any) => {
      const priceA = a.price || a.offerPrice || a.pricing?.finalPrice || 999999;
      const priceB = b.price || b.offerPrice || b.pricing?.finalPrice || 999999;
      return priceA - priceB;
    });
    const budget = sortedByPrice[0] || sorted[sorted.length - 1] || sorted[0];

    // Ensure unique lenses
    const uniqueLenses = [
      bestMatch,
      recommendedIndexLens.id !== bestMatch.id ? recommendedIndexLens : sorted[1] || bestMatch,
      premium.id !== bestMatch.id && premium.id !== recommendedIndexLens.id ? premium : sorted[2] || bestMatch,
      budget.id !== bestMatch.id && budget.id !== recommendedIndexLens.id && budget.id !== premium.id 
        ? budget 
        : sorted[3] || sorted[sorted.length - 1] || bestMatch,
    ].filter((lens, index, self) => 
      index === self.findIndex((l) => l.id === lens.id)
    );

    return uniqueLenses.slice(0, 4).map((lens: any, index: number) => {
      let roleTag: 'BEST_MATCH' | 'RECOMMENDED_INDEX' | 'PREMIUM' | 'BUDGET' = 'BEST_MATCH';
      
      if (index === 0) roleTag = 'BEST_MATCH';
      else if (index === 1) roleTag = 'RECOMMENDED_INDEX';
      else if (index === 2) roleTag = 'PREMIUM';
      else roleTag = 'BUDGET';
      
      return {
        ...lens,
        roleTag,
        matchPercent: lens.matchPercent || lens.matchScore || 0,
      };
    });
  }, [recommendations, recommendedIndex]);

  const handleSelectLens = (lens: any) => {
    setSelectedLens({
      id: lens.id,
      itCode: lens.itCode || lens.sku,
      name: lens.name,
      brandLine: lens.brandLine || 'STANDARD',
      price: lens.price || lens.offerPrice || lens.pricing?.finalPrice || 0,
      yopoEligible: lens.yopoEligible || false,
    });
  };

  // Convert recommendations to comparison format
  const comparisonLenses = recommendations.map((rec: any) => ({
    id: rec.id,
    name: rec.name,
    features: rec.features?.map((f: any) => f.id || f.key) || [],
  }));

  const comparisonFeatures = recommendations.length > 0
    ? recommendations[0].features?.map((f: any) => ({
        id: f.id || f.key,
        name: f.name,
        key: f.key || f.id,
      })) || []
    : [];

  if (recommendations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="text-blue-600" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Best Lenses for You</h2>
            <p className="text-slate-600">No recommendations available</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-slate-700 mb-2 font-medium">No lenses match this prescription.</p>
          <p className="text-sm text-slate-600">Try higher index or custom order.</p>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setCurrentStep(3)}>
            ← Back
          </Button>
          <Button onClick={() => setShowPriceMatrix(true)} size="lg">
            View All Lens Options
          </Button>
        </div>

        <PriceMatrixModal
          isOpen={showPriceMatrix}
          onClose={() => setShowPriceMatrix(false)}
          onSelect={(lens) => {
            handleSelectLens(lens);
            setCurrentStep(5);
          }}
          sph={rx.odSphere ?? rx.osSphere ?? undefined}
          cyl={rx.odCylinder ?? rx.osCylinder ?? undefined}
          add={rx.odAdd ?? rx.osAdd ?? undefined}
          visionType={rx.visionType ?? undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* WF-05: Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Best Lenses for You</h2>
        <p className="text-slate-600">
          Based on your lifestyle, power & frame
        </p>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => setShowComparison(true)}>
            <GitCompare size={18} className="mr-2" />
            Compare All
          </Button>
          <Button variant="outline" onClick={() => setShowPriceMatrix(true)}>
            <List size={18} className="mr-2" />
            View All Lens Options
          </Button>
        </div>
      </div>

      {/* WF-05: Exactly 4 Recommended Lenses - vertical scroll on mobile */}
      <div className="grid md:grid-cols-2 gap-4">
        {fourLenses.map((rec: any) => (
          <LensRecommendationCard
            key={rec.id}
            lens={{
              id: rec.id,
              name: rec.name,
              brandLine: rec.brandLine,
              visionType: rec.visionType,
              index: rec.index || rec.lensIndex,
              mrp: rec.pricing?.subtotal || rec.mrp,
              offerPrice: rec.pricing?.finalPrice || rec.offerPrice || rec.price,
              yopoEligible: rec.yopoEligible,
              matchPercent: rec.matchPercent,
              matchScore: rec.matchScore,
              benefits: rec.features?.map((f: any) => f.name) || rec.benefits || [],
              itCode: rec.itCode || rec.sku,
              price: rec.pricing?.finalPrice || rec.price || rec.offerPrice,
              roleTag: rec.roleTag,
            }}
            isSelected={selectedLens?.id === rec.id}
            onSelect={() => handleSelectLens(rec)}
          />
        ))}
      </div>

      {/* WF-05: Bottom section - View All Lenses button */}
      <div className="mt-6 text-center">
        <Button
          variant="outline"
          onClick={() => setShowPriceMatrix(true)}
          size="lg"
        >
          View All Lens Options
        </Button>
      </div>

      {/* Comparison Modal */}
      <Modal
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        title="Compare Lenses"
        size="lg"
      >
        <LensComparisonTable lenses={comparisonLenses} features={comparisonFeatures} />
      </Modal>

      {/* Price Matrix Modal */}
      <PriceMatrixModal
        isOpen={showPriceMatrix}
        onClose={() => setShowPriceMatrix(false)}
        onSelect={(lens) => {
          handleSelectLens(lens);
          setCurrentStep(5);
        }}
        sph={rx.odSphere ?? rx.osSphere ?? undefined}
        cyl={rx.odCylinder ?? rx.osCylinder ?? undefined}
        add={rx.odAdd ?? rx.osAdd ?? undefined}
        visionType={rx.visionType ?? undefined}
        recommendedIndex={recommendedIndex ? indexService.getIndexDisplayName(recommendedIndex) : undefined}
      />

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => setCurrentStep(3)}>
          ← Back
        </Button>
        <Button
          onClick={() => setCurrentStep(5)}
          size="lg"
          disabled={!selectedLens}
        >
          Next: Offer & Quote →
        </Button>
      </div>
    </div>
  );
}
