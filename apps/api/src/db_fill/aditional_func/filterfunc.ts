import { History } from '../entities/interface';

export const extractTopicsFromHistory = (historyData: History): string[] => {
  if (!Array.isArray(historyData)) return [];

  const topics = historyData
    .flatMap(section => section.tasks)
    .map(task => task.topic?.trim())
    .filter((topic): topic is string => !!topic && topic.length > 0);

  return [...new Set(topics)];
};
