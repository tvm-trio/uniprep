export interface InfoForPlan {
    userId: string,
    subjectId: string,
    results: Result[]
}

export interface Result {
    topicId: string,
    flashcardId: string,
    answerId: string
}