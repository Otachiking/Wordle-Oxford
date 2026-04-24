/**
 * Scoring logic based on WordleCup.io rules:
 * - Speed (Time Taken): 4 Quarters of max time.
 *   - Q1: 40 points
 *   - Q2: 30 points
 *   - Q3: 20 points
 *   - Q4: 10 points
 * - Skill (Tries):
 *   - 1 try: 60 points
 *   - 2 tries: 50 points
 *   - 3 tries: 40 points
 *   - 4 tries: 30 points
 *   - 5 tries: 20 points
 *   - 6 tries: 10 points
 * - Hint Deduction: -5 points per hint used.
 */

export const calculateWordleScore = (guessesUsed, timeTakenMs, maxTimeMs, hintsUsedCount = 0, won = true) => {
  if (!won) return { total: 0, skill: 0, speed: 0, deductions: 0 };

  // Skill Points (based on tries)
  const skillPointsArr = [0, 60, 50, 40, 30, 20, 10];
  const skillScore = skillPointsArr[guessesUsed] || 0;

  // Speed Points (based on time quarters)
  const quarter = maxTimeMs / 4;
  let speedScore = 0;

  if (timeTakenMs <= quarter) {
    speedScore = 40;
  } else if (timeTakenMs <= quarter * 2) {
    speedScore = 30;
  } else if (timeTakenMs <= quarter * 3) {
    speedScore = 20;
  } else if (timeTakenMs <= quarter * 4) {
    speedScore = 10;
  }

  // Deduction for hints
  const HINT_DEDUCTION = 5;
  const deductions = hintsUsedCount * HINT_DEDUCTION;
  
  const total = Math.max(0, skillScore + speedScore - deductions);

  return { 
    total, 
    skill: skillScore, 
    speed: speedScore, 
    deductions 
  };
};
