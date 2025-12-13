import { recommendationsAdapterService } from '../services/recommendations-adapter.service';

async function checkLabels() {
  const result = await recommendationsAdapterService.generateRecommendations('693c30da5878abc43a246ba4');
  
  console.log('Total recommendations:', result.recommendations.length);
  console.log('\nAll labels:');
  result.recommendations.forEach((rec: any, index: number) => {
    console.log(`${index + 1}. ${rec.name} - Label: "${rec.label || 'None'}" - Can Try: ${rec.canTry || false}`);
  });
  
  const lastRec = result.recommendations[result.recommendations.length - 1];
  console.log('\nLast product:');
  console.log(`  Name: ${lastRec?.name}`);
  console.log(`  Label: ${lastRec?.label || 'None'}`);
  console.log(`  Can Try: ${lastRec?.canTry || false}`);
}

checkLabels()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

