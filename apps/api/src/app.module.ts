import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '@common/prisma';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from './notification/notification.module';
import { ProgressTrackerModule } from './progress_tracker/progress_tracker.module';
import { DbFillModule } from './db_fill/db_fill.module';
import { StudyPlanModule } from './study-plan/study-plan.module';
import { FlashcardsModule } from './flashcards/flashcards.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MailModule,
    ConfigModule.forRoot(),
    NotificationModule,
    ProgressTrackerModule,
    DbFillModule,
    StudyPlanModule,
    FlashcardsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
