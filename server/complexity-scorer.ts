import OpenAI from "openai";
import { 
  ComplexityFactor, 
  InsertComplexityFactor, 
  InsertShiftComplexityScore, 
  Shift,
  Staff,
  User,
  ComplexityFactorType
} from "@shared/schema";
import { storage } from "./storage";

// Initialize the OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Enum for different complexity factors
const COMPLEXITY_FACTORS = {
  WORKLOAD: 'workload' as ComplexityFactorType,
  STAFF_EXPERIENCE: 'staff_experience' as ComplexityFactorType,
  PATIENT_ACUITY: 'patient_acuity' as ComplexityFactorType,
  TIME_OF_DAY: 'time_of_day' as ComplexityFactorType,
  CONSECUTIVE_SHIFTS: 'consecutive_shifts' as ComplexityFactorType,
  STAFF_PREFERENCES: 'staff_preferences' as ComplexityFactorType
};

/**
 * Interface representing the AI analysis response
 */
interface ShiftComplexityAnalysis {
  overall_complexity: number;
  factors: {
    factor_type: ComplexityFactorType;
    score: number;
    explanation: string;
  }[];
  summary: string;
}

/**
 * Analyzes the complexity of a shift using OpenAI
 */
export async function analyzeShiftComplexity(
  shift: Shift, 
  staffMember: Staff, 
  user: User, 
  previousShifts: Shift[]
): Promise<ShiftComplexityAnalysis> {
  // Determine shift time label based on shift type
  let shiftTimeLabel = "";
  switch(shift.shiftType) {
    case 'M': shiftTimeLabel = "Morning (6am-2pm)"; break;
    case 'P': shiftTimeLabel = "Afternoon (2pm-10pm)"; break;
    case 'N': shiftTimeLabel = "Night (10pm-6am)"; break;
    case 'R': shiftTimeLabel = "Rest day"; break;
    case 'F': shiftTimeLabel = "Vacation day"; break;
  }

  // Count consecutive working days
  let consecutiveWorkingDays = 0;
  if (previousShifts && previousShifts.length > 0) {
    // Sort previous shifts by date
    const sortedShifts = [...previousShifts].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Count consecutive working days
    for (let i = sortedShifts.length - 1; i >= 0; i--) {
      if (sortedShifts[i].shiftType !== 'R' && sortedShifts[i].shiftType !== 'F') {
        consecutiveWorkingDays++;
      } else {
        break;
      }
    }
  }

  // Create the prompt for the AI
  const prompt = `
Analyze the complexity of this nursing shift and provide a detailed assessment:

SHIFT DETAILS:
- Date: ${shift.date}
- Shift Type: ${shiftTimeLabel}
- Department: ${staffMember.department}
- Facility: ${staffMember.facility}
- Staff Role: ${staffMember.role}
- Staff Experience: ${user.name} (${staffMember.role})
- Part-time status: ${staffMember.isPartTime ? "Part-time" : "Full-time"}
${staffMember.isPartTime ? `- Part-time hours: ${staffMember.partTimeHours}` : ""}
- Consecutive working days before this shift: ${consecutiveWorkingDays}

CONTEXT FOR COMPLEXITY ANALYSIS:
- Workload: Consider typical patient-to-nurse ratios for this shift time
- Staff Experience: ${user.name}'s role is ${staffMember.role}
- Patient Acuity: Consider typical acuity levels for ${staffMember.department} department
- Time of Day: ${shiftTimeLabel} has specific challenges
- Consecutive Shifts: This follows ${consecutiveWorkingDays} consecutive working days
- Staff Preferences: Consider if this shift type matches typical preferences

INSTRUCTIONS:
1. Rate the overall complexity on a scale of 1.0 to 10.0
2. Analyze each complexity factor (workload, staff_experience, patient_acuity, time_of_day, consecutive_shifts, staff_preferences)
3. Rate each factor on a scale of 1.0 to 10.0
4. Provide a brief explanation for each factor
5. Return the analysis in the following JSON format

{
  "overall_complexity": <number 1.0-10.0>,
  "factors": [
    {
      "factor_type": "workload",
      "score": <number 1.0-10.0>,
      "explanation": "<explanation>"
    },
    // other factors...
  ],
  "summary": "<brief summary of overall complexity assessment>"
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are an expert healthcare scheduler and nurse supervisor with years of experience in analyzing shift complexity." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const analysisResult = JSON.parse(response.choices[0].message.content) as ShiftComplexityAnalysis;
    return analysisResult;
  } catch (error) {
    console.error("Error analyzing shift complexity with OpenAI:", error);
    
    // Return a default analysis in case of error
    return {
      overall_complexity: 5.0,
      factors: [
        {
          factor_type: COMPLEXITY_FACTORS.WORKLOAD,
          score: 5.0,
          explanation: "Unable to analyze due to API error"
        },
        {
          factor_type: COMPLEXITY_FACTORS.STAFF_EXPERIENCE,
          score: 5.0,
          explanation: "Unable to analyze due to API error"
        },
        {
          factor_type: COMPLEXITY_FACTORS.PATIENT_ACUITY,
          score: 5.0,
          explanation: "Unable to analyze due to API error"
        },
        {
          factor_type: COMPLEXITY_FACTORS.TIME_OF_DAY,
          score: 5.0,
          explanation: "Unable to analyze due to API error"
        },
        {
          factor_type: COMPLEXITY_FACTORS.CONSECUTIVE_SHIFTS,
          score: 5.0,
          explanation: "Unable to analyze due to API error"
        },
        {
          factor_type: COMPLEXITY_FACTORS.STAFF_PREFERENCES,
          score: 5.0,
          explanation: "Unable to analyze due to API error"
        }
      ],
      summary: "Analysis failed due to API error. Using default values."
    };
  }
}

/**
 * Calculates and stores shift complexity score for a given shift
 */
export async function calculateAndStoreShiftComplexity(shiftId: number): Promise<number> {
  // Get the shift details
  const shift = await storage.getShiftById(shiftId);
  if (!shift) {
    throw new Error(`Shift with ID ${shiftId} not found`);
  }

  // Get the staff member
  const staffMember = await storage.getStaffById(shift.staffId);
  if (!staffMember) {
    throw new Error(`Staff member with ID ${shift.staffId} not found`);
  }

  // Get the user
  const user = await storage.getUserById(staffMember.userId);
  if (!user) {
    throw new Error(`User with ID ${staffMember.userId} not found`);
  }

  // Get previous shifts (last 14 days)
  const shiftDate = new Date(shift.date);
  const twoWeeksAgo = new Date(shiftDate);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  const previousShifts = await storage.listShiftsByStaffAndDateRange(
    staffMember.id,
    twoWeeksAgo,
    new Date(shiftDate.setDate(shiftDate.getDate() - 1)) // Exclude the current shift
  );

  // Analyze the shift complexity
  const analysis = await analyzeShiftComplexity(shift, staffMember, user, previousShifts);

  // Store the complexity score
  const scoreData: InsertShiftComplexityScore = {
    shiftId: shift.id,
    complexityScore: analysis.overall_complexity.toString(),
    aiAnalysisDetails: analysis as any
  };

  const savedScore = await storage.createShiftComplexityScore(scoreData);

  // Store each complexity factor
  for (const factor of analysis.factors) {
    const factorData: InsertComplexityFactor = {
      scoreId: savedScore.id,
      factorType: factor.factor_type,
      factorScore: factor.score.toString(),
      explanation: factor.explanation
    };
    await storage.createComplexityFactor(factorData);
  }

  return analysis.overall_complexity;
}

/**
 * Gets the complexity score for a shift
 * If score doesn't exist, calculates it first
 */
export async function getShiftComplexityScore(shiftId: number): Promise<{
  score: number;
  factors: ComplexityFactor[];
  summary: string;
}> {
  // Check if score already exists
  let score = await storage.getShiftComplexityScoreByShiftId(shiftId);
  
  // If not, calculate it
  if (!score) {
    await calculateAndStoreShiftComplexity(shiftId);
    score = await storage.getShiftComplexityScoreByShiftId(shiftId);
    
    if (!score) {
      throw new Error(`Failed to calculate complexity score for shift ID ${shiftId}`);
    }
  }

  // Get the factors
  const factors = await storage.listComplexityFactorsByScoreId(score.id);
  
  // Get the summary from the AI analysis details
  const aiDetails = score.aiAnalysisDetails as any;
  const summary = aiDetails && aiDetails.summary ? aiDetails.summary : "No summary available";

  return {
    score: parseFloat(score.complexityScore),
    factors,
    summary
  };
}

/**
 * Analyzes all shifts in a date range and scores their complexity
 */
export async function analyzeScheduleComplexity(
  startDate: Date, 
  endDate: Date,
  role?: Role
): Promise<{
  averageComplexity: number;
  highestComplexity: number;
  lowestComplexity: number;
  totalShifts: number;
  analyzedShifts: {
    shiftId: number;
    date: string;
    staffName: string;
    shiftType: string;
    complexityScore: number;
  }[];
}> {
  // Get all shifts in the date range
  let shifts = await storage.listShiftsByDateRange(startDate, endDate);
  
  // Filter by role if provided
  if (role) {
    // We need to join with staff to filter by role
    const staffWithRole = await storage.listStaffByRole(role);
    const staffIds = staffWithRole.map(s => s.id);
    shifts = shifts.filter(shift => staffIds.includes(shift.staffId));
  }

  // Calculate complexity for all shifts that don't have it yet
  const complexityPromises = shifts.map(async shift => {
    try {
      // Check if complexity already exists
      const existingScore = await storage.getShiftComplexityScoreByShiftId(shift.id);
      if (!existingScore) {
        await calculateAndStoreShiftComplexity(shift.id);
      }
    } catch (error) {
      console.error(`Error calculating complexity for shift ID ${shift.id}:`, error);
    }
  });

  await Promise.all(complexityPromises);

  // Get all complexity scores
  const analyzedShifts = [];
  let totalComplexity = 0;
  let highestComplexity = 0;
  let lowestComplexity = 10;

  for (const shift of shifts) {
    try {
      const staff = await storage.getStaffById(shift.staffId);
      if (!staff) continue;

      const user = await storage.getUserById(staff.userId);
      if (!user) continue;

      const complexityData = await getShiftComplexityScore(shift.id);
      const complexityScore = complexityData.score;
      
      totalComplexity += complexityScore;
      highestComplexity = Math.max(highestComplexity, complexityScore);
      lowestComplexity = Math.min(lowestComplexity, complexityScore);

      analyzedShifts.push({
        shiftId: shift.id,
        date: shift.date,
        staffName: user.name,
        shiftType: shift.shiftType,
        complexityScore
      });
    } catch (error) {
      console.error(`Error retrieving complexity for shift ID ${shift.id}:`, error);
    }
  }

  const totalShifts = analyzedShifts.length;
  const averageComplexity = totalShifts > 0 ? totalComplexity / totalShifts : 0;

  return {
    averageComplexity,
    highestComplexity: totalShifts > 0 ? highestComplexity : 0,
    lowestComplexity: totalShifts > 0 ? lowestComplexity : 0,
    totalShifts,
    analyzedShifts
  };
}