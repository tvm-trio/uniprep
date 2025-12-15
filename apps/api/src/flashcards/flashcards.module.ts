import { Module } from '@nestjs/common';
import { FlashcardsService } from './flashcards.service';
import { FlashcardsController } from './flashcards.controller';
import { ProgressTrackerModule } from '../progress_tracker/progress_tracker.module';

@Module({
  imports: [ProgressTrackerModule],
  controllers: [FlashcardsController],
  providers: [FlashcardsService],
})
export class FlashcardsModule {}
