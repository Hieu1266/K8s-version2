import { LessonLearningStructure } from '@/types/lessons';
import { LessonStatus } from '@/types/statuses';

export type TabKey = 'lecture' | 'resources' | 'notes' | 'quiz';

export type LessonWithStatus = LessonLearningStructure & {
  status?: LessonStatus;
  progress_id?: string;
  video_url?: string | null;
  content_body?: string | null;
  submit_status?: string | null;
  is_optional?: boolean;
  had_quiz?: boolean;
};
