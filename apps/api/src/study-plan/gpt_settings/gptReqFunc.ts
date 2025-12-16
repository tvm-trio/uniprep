import OpenAI from "openai";

function getOpenAIClient() {
    return new OpenAI({
        apiKey: process.env.GPT_API_KEY,
    });
}

const client = getOpenAIClient()

export interface TopicObj {
    topicId: string;
    topic: string;
}

export interface Param {
    taskNum: number;
    correctTaskNum: number;
}


export async function supportMsg(params: Param) {
    const { taskNum, correctTaskNum } = params;

    return await client.responses.create({
        model: "gpt-5-nano",
        instructions:
            "Generate a short motivational message for a student based on test results.",
        input: `Total tasks: ${taskNum}, correct answers: ${correctTaskNum}`,

        text: {
            format: {
                name: "support_message",
                type: "json_schema",
                schema: {
                    type: "object",
                    properties: {
                        message: { type: "string" }
                    },
                    required: ["message"],
                    additionalProperties: false
                }
            }
        }
    } as any);
}



export async function analiseAnswers(topics: TopicObj[]) {
    return await client.responses.create({
        model: "gpt-5-nano",
        instructions: "Sort topics by chronology",
        input: JSON.stringify(topics),

        text: {
            format: {
                name: "sorted_topics",
                type: "json_schema",
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" }
                        }
                    },
                    required: ["ids"],
                    additionalProperties: false
                }

            }
        },

    } as any);
}
