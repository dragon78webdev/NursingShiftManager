const axios = require('axios');

// Helper to format dates as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Get today's date
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

// Create a head nurse user with delegation permissions
async function setupHeadNurse() {
  try {
    console.log('Creating test head nurse...');
    
    // First check if the user already exists
    const { data: users } = await axios.get('http://localhost:5000/api/users');
    const headNurse = users.find(u => u.email === 'head@example.com');
    
    if (headNurse) {
      console.log('Head nurse already exists:', headNurse);
      return headNurse.id;
    }
    
    // Create new head nurse if doesn't exist
    const response = await axios.post('http://localhost:5000/api/users', {
      googleId: '9876543210',
      email: 'head@example.com',
      name: 'Head Nurse',
      role: 'head_nurse',
      department: 'Cardiology',
      facility: 'Main Hospital'
    });
    
    console.log('Created head nurse:', response.data);
    return response.data.id;
  } catch (error) {
    console.error('Error setting up head nurse:', error.response?.data || error.message);
    throw error;
  }
}

// Analyze shift complexity
async function analyzeShiftComplexity(shiftId) {
  try {
    console.log(`Analyzing complexity for shift ${shiftId}...`);
    const response = await axios.get(`http://localhost:5000/api/complexity/shift/${shiftId}`);
    console.log('Complexity score:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error analyzing shift complexity:', error.response?.data || error.message);
    throw error;
  }
}

// Analyze complexity for a date range
async function analyzeComplexityRange(startDate, endDate, role) {
  try {
    console.log(`Analyzing complexity for date range ${formatDate(startDate)} to ${formatDate(endDate)}...`);
    
    // Start the analysis (this is asynchronous in the API)
    await axios.post('http://localhost:5000/api/complexity/analyze', {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      role
    });
    
    console.log('Analysis started. Waiting for results...');
    
    // Wait a bit for analysis to complete (in a real scenario, we'd listen for the notification)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get the results
    const response = await axios.get(`http://localhost:5000/api/complexity/results?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}${role ? `&role=${role}` : ''}`);
    console.log('Complexity analysis results:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error analyzing complexity range:', error.response?.data || error.message);
    throw error;
  }
}

// Main function to run the tests
async function runTests() {
  try {
    // Set up test data if needed
    // const headNurseId = await setupHeadNurse();
    
    // Test shift complexity analysis for a single shift (ID 1 is the one we created)
    await analyzeShiftComplexity(1);
    
    // Test complexity analysis for a date range
    await analyzeComplexityRange(yesterday, tomorrow, 'nurse');
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests();