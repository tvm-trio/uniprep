import { Body, Injectable } from '@nestjs/common';
import { extractTopicsFromHistory } from './aditional_func/filterfunc';
import { PrismaClient } from '@prisma/client';
import { filterHistoryData } from './aditional_func/filterFuncQuestion';
import history_data from './history_raw.json';
import { HistoryTopic, FilteredTask } from './entities/interface';
import { Subject } from 'rxjs';

interface InfoObj {
  subject_id: string;
  name: string;
}

@Injectable()
export class DbFillService {
  constructor(private prisma: PrismaClient) { }

  async findAll() {
    return this.prisma.topic.findMany();
  }

  async insertTopic() {
    const subject = await this.prisma.subject.findFirst({
      where: {
        name: 'History',
      },
    });
    if (!subject) {
      throw new Error("Subject 'History' not found");
    }
    const subjectID: string = subject.id;
    const topics: string[] = extractTopicsFromHistory(history_data as any);

    if (topics.length == 0) {
      return "Error during topics parsing"
    }

    const infoToInsert: InfoObj[] = [];

    topics.forEach((elemnet) => {
      infoToInsert.push({
        subject_id: subjectID,
        name: elemnet,
      });
    });

    await this.prisma.topic.createMany({
      data: infoToInsert,
    });
  }

  async insertTask() {
    const info = filterHistoryData(history_data as any);
    const topics: any = await this.prisma.topic.findMany();

    const tempArr: FilteredTask[] = [];

    info.map(async (elem) => {
      const topic = topics.find((topic: HistoryTopic) => {
        return topic.name == elem.topic;
      });
      if (topic) {
        try {
          await this.prisma.flashcard.create({
            data: {
              question: elem.question,
              topic_id: topic.id,
              answers: {
                create: elem.answers,
              },
            },
          });
        } catch (err) {
          throw err;
        }
      } else {
        tempArr.push(elem);
      }
    });

    console.log(tempArr.length);
  }

  async answersInfo() {
    const answers = await this.prisma.answer.findMany({
      include: {
        Flashcard: {
          include: {
            Topic: true,
          },
        },
      },
    });

    const emptyAnswers = answers.filter((a) => !a.text?.trim());

    const topicsWithNoText = emptyAnswers.map(
      (a) => a.Flashcard?.Topic?.name ?? 'UNKNOWN',
    );

    return {
      answerNum: answers.length,
      answerNoText: emptyAnswers.length,
      topicsWithNoText: [...new Set(topicsWithNoText)],
    };
  }

  async insertSub(subject: string) {
    return await this.prisma.subject.create({
      data: {
        name: subject
      }
    })
  }

  async deleteEmptyTopics() {
    const deleted = await this.prisma.topic.deleteMany({
      where: {
        Flashcard: {
          none: {}
        }
      }
    });

    return {
      message: "Empty topics deleted",
      deleted: deleted.count
    };
  }

  async deleteEmptyFlashcards() {
    const deleted = await this.prisma.flashcard.deleteMany({
      where: {
        Answers: {
          none: {}
        }
      }
    });

    return {
      message: "Empty flashcards deleted",
      deleted: deleted.count
    };
  }

}
