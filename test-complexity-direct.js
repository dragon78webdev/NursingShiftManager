// This test script directly calls the functions in the complexity-scorer.ts file
// It bypasses authentication to test the functionality

const { calculateAndStoreShiftComplexity, getShiftComplexityScore, analyzeScheduleComplexity } = require('./server/complexity-scorer');

async function runTests() {
  try {
    // Test 1: Calculate complexity for shift with ID 1
    console.log('Test 1: Calculate complexity for shift ID 1');
    const complexityScore = await calculateAndStoreShiftComplexity(1);
    console.log('Complexity score:', complexityScore);
    
    // Test 2: Get complexity score for shift with ID 1
    console.log('\nTest 2: Get complexity score for shift ID 1');
    const complexityData = await getShiftComplexityScore(1);
    console.log('Complexity data:', JSON.stringify(complexityData, null, 2));
    
    // Test 3: Analyze complexity for all shifts in date range
    console.log('\nTest 3: Analyze schedule complexity for all shifts');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 1);
    
    const analysisResult = await analyzeScheduleComplexity(startDate, endDate);
    console.log('Analysis result:', JSON.stringify(analysisResult, null, 2));
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();