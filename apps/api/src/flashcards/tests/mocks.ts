import { SubmitAnswerBody } from '../interfaces';

export const mockTopicId = 'topic-123';

export const mockSubjectId = 'subject-123';

export const mockFlashcards = Array.from({ length: 50 }, (_, i) => ({
  id: `${i + 1}`,
  question: `Q${i + 1}`,
  answers: [],
}));

export const mockCorrectAnswerBody: SubmitAnswerBody = {
  flashcardId: 'flashcard-123',
  isCorrect: true,
};

export const mockIncorrectAnswerBody: SubmitAnswerBody = {
  flashcardId: 'flashcard-123',
  isCorrect: false,
};

export const mockUpdatedFlashcard = {
  id: 'flashcard-123',
  ef: 2.5,
  interval: 1,
};
