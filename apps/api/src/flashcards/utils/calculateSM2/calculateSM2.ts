// SM-2 Spaced Repetition Algorithm
// SM-2 (SuperMemo 2): A widely used spaced repetition algorithm for optimizing learning and memory retention.

// The algorithm tracks three properties for each item being studied:
// the easiness factor (EF), the interval (I), and the repetition count (n)

// After reviewing an item, the user rates their response on a 0-5 scale.
// This rating, denoted as q (quality), influences the next review interval and the EF.

// The EF is updated using a specific formula based on the quality of response q.
// If the new EF is below 1.3, it is reset to 1.3.

// The next I (interval) is calculated as follows:
// If q is less than 3, the repetition number is reset to 0, and the next interval is 1 day.
// If q is 3 or greater, the repetition number is increased.
// The first successful repetition has an interval of 1 day,
// the second has 6 days,
// and subsequent intervals are calculated by multiplying the previous interval
// by the updated EF, rounded up.

import { UserFlashcardProgress } from '@prisma/client';
import {
  DAY_IN_HOURS,
  HOUR_IN_MINUTES,
  MINUTE_IN_SECONDS,
  SECOND_IN_MILLISECONDS,
  SM2_CORRECT_QUALITY,
  SM2_INCORRECT_QUALITY,
} from './constants';

import { ReturnType } from './types';

export const calculateSM2 = (
  flashcardProgress: UserFlashcardProgress,
  isCorrect: boolean,
): ReturnType => {
  const { interval, repetition, ef } = flashcardProgress;

  const q = isCorrect ? SM2_CORRECT_QUALITY : SM2_INCORRECT_QUALITY;

  const diff = SM2_CORRECT_QUALITY - q;

  const newEF = Math.max(1.3, ef + (0.1 - diff * (0.08 + diff * 0.02)));

  const newRepetition = q < 3 ? 0 : repetition + 1;

  const newInterval =
    newRepetition === 0
      ? 1
      : newRepetition === 1
        ? 1
        : newRepetition === 2
          ? 6
          : Math.round(interval * newEF);

  const nextReview = new Date(
    Date.now() +
      newInterval *
        DAY_IN_HOURS *
        HOUR_IN_MINUTES *
        MINUTE_IN_SECONDS *
        SECOND_IN_MILLISECONDS,
  );

  return {
    interval: newInterval,
    repetition: newRepetition,
    ef: newEF,
    nextReview,
  };
};
