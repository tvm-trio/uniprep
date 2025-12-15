export const mockFlashcard = {
  id: 'flashcard-1',
  topic_id: 'topic-1',
  question: 'What is NestJS?',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  answers: [
    {
      id: 'answer-1',
      flashcard_id: 'flashcard-1',
      text: 'A Node.js framework',
      is_correct: true,
    },
    {
      id: 'answer-2',
      flashcard_id: 'flashcard-1',
      text: 'A database',
      is_correct: false,
    },
  ],
};

export const mockFlashcardWithTopic = {
  ...mockFlashcard,
  Topic: {
    id: 'topic-1',
    subject_id: 'subject-1',
    name: 'NestJS Basics',
  },
};

export const mockUserFlashcardProgress = {
  id: 'progress-1',
  user_id: 'user-1',
  flashcard_id: 'flashcard-1',
  interval: 1,
  repetition: 1,
  ef: 2.5,
  nextReview: new Date('2024-01-02'),
  time_spent: 30,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

export const mockProgressMetric = {
  id: 'metric-1',
  user_id: 'user-1',
  subject_id: 'subject-1',
  completed_topics: 5,
  accuracy_rate: 0.8,
  time_spent: 300,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

export const mockPrismaService = {
  flashcard: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  userFlashcardProgress: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
};

export const mockProgressTrackerService = {
  getMetrixById: jest.fn(),
  updateMetrix: jest.fn(),
};
