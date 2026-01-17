import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  WordMapService,
  StartExamResponse,
  ExamQuestion,
  ExamAnswer,
  ExamResult,
  ExamQuestionResult
} from '../word-map.service';

type ExamState = 'loading' | 'ready' | 'in_progress' | 'submitting' | 'results';

@Component({
  selector: 'app-lesson-exam',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lesson-exam.component.html',
  styleUrls: ['./lesson-exam.component.scss']
})
export class LessonExamComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wordMapService = inject(WordMapService);

  // Expose Math for template
  Math = Math;

  // IDs
  mapId = signal<number>(0);
  lessonId = signal<number>(0);

  // Exam data
  examData = signal<StartExamResponse | null>(null);
  examResult = signal<ExamResult | null>(null);
  error = signal<string | null>(null);

  // State
  state = signal<ExamState>('loading');
  currentQuestionIndex = signal(0);
  answers = signal<Map<number, string>>(new Map());
  startTime = signal<Date | null>(null);

  // Timer
  timeRemaining = signal(0);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Computed
  exam = computed(() => this.examData()?.exam);
  questions = computed(() => this.examData()?.questions || []);
  currentQuestion = computed(() => {
    const qs = this.questions();
    const idx = this.currentQuestionIndex();
    return qs[idx] || null;
  });

  progress = computed(() => {
    const answered = this.answers().size;
    const total = this.questions().length;
    return total > 0 ? Math.round((answered / total) * 100) : 0;
  });

  formattedTime = computed(() => {
    const seconds = this.timeRemaining();
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  });

  isLastQuestion = computed(() =>
    this.currentQuestionIndex() === this.questions().length - 1
  );

  allAnswered = computed(() =>
    this.answers().size === this.questions().length
  );

  ngOnInit(): void {
    const mapId = this.route.snapshot.paramMap.get('mapId');
    const lessonId = this.route.snapshot.paramMap.get('lessonId');

    if (mapId && lessonId) {
      this.mapId.set(+mapId);
      this.lessonId.set(+lessonId);
      this.loadExam(+lessonId);
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  loadExam(lessonId: number): void {
    this.state.set('loading');
    this.error.set(null);

    this.wordMapService.startExam(lessonId).subscribe({
      next: (response) => {
        this.examData.set(response);
        this.timeRemaining.set(response.exam.timeLimitSeconds);
        this.state.set('ready');
      },
      error: (err) => {
        this.error.set('Failed to start exam. Please try again.');
        console.error('Error starting exam:', err);
      }
    });
  }

  startExam(): void {
    this.state.set('in_progress');
    this.startTime.set(new Date());
    this.startTimer();
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      const remaining = this.timeRemaining();
      if (remaining <= 0) {
        this.submitExam();
      } else {
        this.timeRemaining.set(remaining - 1);
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  selectAnswer(answer: string): void {
    const question = this.currentQuestion();
    if (!question) return;

    const newAnswers = new Map(this.answers());
    newAnswers.set(question.id, answer);
    this.answers.set(newAnswers);
  }

  isAnswerSelected(answer: string): boolean {
    const question = this.currentQuestion();
    if (!question) return false;
    return this.answers().get(question.id) === answer;
  }

  goToQuestion(index: number): void {
    if (index >= 0 && index < this.questions().length) {
      this.currentQuestionIndex.set(index);
    }
  }

  nextQuestion(): void {
    if (!this.isLastQuestion()) {
      this.currentQuestionIndex.set(this.currentQuestionIndex() + 1);
    }
  }

  prevQuestion(): void {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.set(this.currentQuestionIndex() - 1);
    }
  }

  isQuestionAnswered(index: number): boolean {
    const question = this.questions()[index];
    return question ? this.answers().has(question.id) : false;
  }

  submitExam(): void {
    this.stopTimer();
    this.state.set('submitting');

    const examDataValue = this.examData();
    if (!examDataValue) return;

    const timeSpent = this.startTime()
      ? Math.round((Date.now() - this.startTime()!.getTime()) / 1000)
      : examDataValue.exam.timeLimitSeconds;

    const examAnswers: ExamAnswer[] = this.questions().map(q => ({
      questionId: q.id,
      answer: this.answers().get(q.id) || ''
    }));

    this.wordMapService.submitExamAnswers(examDataValue.attemptId, {
      answers: examAnswers,
      timeSpentSeconds: timeSpent
    }).subscribe({
      next: (result) => {
        this.examResult.set(result);
        this.state.set('results');
      },
      error: (err) => {
        console.error('Error submitting exam:', err);
        this.error.set('Failed to submit exam. Please try again.');
        this.state.set('in_progress');
      }
    });
  }

  getQuestionResult(questionId: number): ExamQuestionResult | undefined {
    return this.examResult()?.questionResults.find(r => r.questionId === questionId);
  }

  goBackToMap(): void {
    this.router.navigate(['/word-maps', this.mapId()]);
  }

  retryExam(): void {
    this.answers.set(new Map());
    this.currentQuestionIndex.set(0);
    this.examResult.set(null);
    this.loadExam(this.lessonId());
  }

  continueToNext(): void {
    const result = this.examResult();
    if (result?.unlockedNext) {
      if (result.unlockedNext.type === 'lesson') {
        this.router.navigate(['/word-maps', this.mapId(), 'lesson', result.unlockedNext.id]);
      } else {
        this.router.navigate(['/word-maps', this.mapId()]);
      }
    } else {
      this.router.navigate(['/word-maps', this.mapId()]);
    }
  }
}
