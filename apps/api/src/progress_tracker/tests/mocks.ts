export const mockProgress = {
  id: 'progress-1',
  user_id: 'user-1',
  subject_id: 'subject-1',
  completed_topics: 10,
  accuracy_rate: 0.85,
  time_spent: 600,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

export const mockProgressList = [
  mockProgress,
  {
    id: 'progress-2',
    user_id: 'user-2',
    subject_id: 'subject-2',
    completed_topics: 5,
    accuracy_rate: 0.75,
    time_spent: 300,
    created_at: new Date('2024-01-02'),
    updated_at: new Date('2024-01-02'),
  },
];

export const mockMetrixBody = {
  subject_id: 'subject-1',
  completed_topics: 10,
  accuracy_rate: 0.85,
  time_spent: 600,
};

export const mockPrismaClient = {
  progress: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
};
