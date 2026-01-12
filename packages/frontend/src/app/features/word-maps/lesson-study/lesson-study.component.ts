import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  WordMapService,
  LessonContentDetail,
  VocabularyContent,
  GrammarContent,
  ExerciseContent
} from '../word-map.service';
import { PronunciationService } from '../../../core/services/pronunciation.service';

type StudySection = 'overview' | 'vocabulary' | 'grammar' | 'exercises' | 'complete';

interface VocabularyCardState {
  vocabulary: VocabularyContent;
  isFlipped: boolean;
  isStudied: boolean;
}

@Component({
  selector: 'app-lesson-study',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './lesson-study.component.html',
  styleUrls: ['./lesson-study.component.scss']
})
export class LessonStudyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private wordMapService = inject(WordMapService);
  private pronunciationService = inject(PronunciationService);

  // Pronunciation state
  get speakingAccent() {
    return this.pronunciationService.speaking;
  }

  get speakingWord() {
    return this.pronunciationService.speakingWord;
  }

  // Check if a specific word is currently being spoken with a specific accent
  isSpeaking(word: string, accent: 'uk' | 'us'): boolean {
    const currentAccent = this.speakingAccent();
    const currentWord = this.speakingWord();
    return currentAccent === accent && currentWord === word.toLowerCase().trim();
  }

  // State
  mapId = signal<number>(0);
  lessonId = signal<number>(0);
  lessonContent = signal<LessonContentDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  completing = signal(false);

  // Study state
  currentSection = signal<StudySection>('overview');
  currentVocabIndex = signal(0);
  currentGrammarIndex = signal(0);
  currentExerciseIndex = signal(0);
  studyStartTime = signal<Date>(new Date());

  // Vocabulary cards
  vocabCards = signal<VocabularyCardState[]>([]);

  // Exercise answers
  exerciseAnswers = signal<Map<number, string>>(new Map());
  exerciseResults = signal<Map<number, boolean>>(new Map());

  // Matching exercise state
  matchingSelectedEn = signal<number | null>(null);
  matchingSelectedVi = signal<number | null>(null);
  matchingMatches = signal<Map<number, { enIdx: number; viIdx: number }>>(new Map());
  matchingShuffledVi = signal<string[]>([]);

  // Sentence building state
  sentenceAvailableWords = signal<string[]>([]);
  sentenceArrangedWords = signal<string[]>([]);

  // Computed
  lesson = computed(() => this.lessonContent()?.lesson);
  vocabularyList = computed(() => this.lessonContent()?.vocabulary || []);
  grammarList = computed(() => this.lessonContent()?.grammar || []);
  exerciseList = computed(() => this.lessonContent()?.exercises || []);

  vocabProgress = computed(() => {
    const cards = this.vocabCards();
    const studied = cards.filter(c => c.isStudied).length;
    return cards.length > 0 ? Math.round((studied / cards.length) * 100) : 0;
  });

  studiedVocabCount = computed(() => {
    return this.vocabCards().filter(c => c.isStudied).length;
  });

  currentVocab = computed(() => {
    const cards = this.vocabCards();
    const index = this.currentVocabIndex();
    return cards[index] || null;
  });

  currentGrammar = computed(() => {
    const list = this.grammarList();
    const index = this.currentGrammarIndex();
    return list[index] || null;
  });

  currentExercise = computed(() => {
    const list = this.exerciseList();
    const index = this.currentExerciseIndex();
    return list[index] || null;
  });

  exerciseProgress = computed(() => {
    const results = this.exerciseResults();
    const total = this.exerciseList().length;
    return total > 0 ? Math.round((results.size / total) * 100) : 0;
  });

  correctExercises = computed(() => {
    const results = this.exerciseResults();
    return Array.from(results.values()).filter(v => v).length;
  });

  // Track last initialized exercise to avoid re-initialization
  private lastInitializedExerciseId = signal<number | null>(null);

  constructor() {
    // Initialize matching/sentence_building exercises when currentExercise changes
    effect(() => {
      const exercise = this.currentExercise();
      if (!exercise) return;

      // Skip if already initialized this exercise
      if (this.lastInitializedExerciseId() === exercise.id) return;

      if (exercise.exerciseType === 'matching' && exercise.exerciseData?.['pairs']) {
        this.initMatchingExercise();
        this.lastInitializedExerciseId.set(exercise.id);
      } else if (exercise.exerciseType === 'sentence_building' && exercise.exerciseData?.['words']) {
        this.initSentenceBuildingExercise();
        this.lastInitializedExerciseId.set(exercise.id);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    const mapId = this.route.snapshot.paramMap.get('mapId');
    const lessonId = this.route.snapshot.paramMap.get('lessonId');

    if (mapId && lessonId) {
      this.mapId.set(+mapId);
      this.lessonId.set(+lessonId);
      this.loadLessonContent(+lessonId);
    }

    // Check for section query param to skip directly to a section (for testing)
    const section = this.route.snapshot.queryParamMap.get('section');
    if (section === 'exercises') {
      // Will be handled after content loads
      this.skipToExercises = true;
    }

    // Check for exerciseIndex query param to start at a specific exercise
    const exerciseIndexParam = this.route.snapshot.queryParamMap.get('exerciseIndex');
    if (exerciseIndexParam) {
      this.startAtExerciseIndex = parseInt(exerciseIndexParam, 10);
    }
  }

  private skipToExercises = false;
  private startAtExerciseIndex: number | null = null;

  loadLessonContent(lessonId: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.studyStartTime.set(new Date());

    this.wordMapService.getLessonContent(lessonId).subscribe({
      next: (content) => {
        this.lessonContent.set(content);
        // Initialize vocab cards
        this.vocabCards.set(content.vocabulary.map(v => ({
          vocabulary: v,
          isFlipped: false,
          isStudied: false
        })));
        this.loading.set(false);

        // Handle skip to exercises (for testing)
        if (this.skipToExercises && content.exercises.length > 0) {
          this.startExercises();
          // Also handle starting at specific exercise index
          if (this.startAtExerciseIndex !== null && this.startAtExerciseIndex < content.exercises.length) {
            this.currentExerciseIndex.set(this.startAtExerciseIndex);
          }
        }
      },
      error: (err) => {
        this.error.set('Failed to load lesson content.');
        this.loading.set(false);
        console.error('Error loading lesson:', err);
      }
    });
  }

  // Navigation
  goToSection(section: StudySection): void {
    this.currentSection.set(section);
  }

  startVocabulary(): void {
    this.currentVocabIndex.set(0);
    this.currentSection.set('vocabulary');
  }

  startGrammar(): void {
    this.currentGrammarIndex.set(0);
    this.currentSection.set('grammar');
  }

  startExercises(): void {
    this.currentExerciseIndex.set(0);
    this.exerciseAnswers.set(new Map());
    this.exerciseResults.set(new Map());
    this.currentSection.set('exercises');
  }

  // Vocabulary
  flipCard(): void {
    const cards = this.vocabCards();
    const index = this.currentVocabIndex();
    if (cards[index]) {
      cards[index].isFlipped = !cards[index].isFlipped;
      this.vocabCards.set([...cards]);
    }
  }

  markVocabStudied(): void {
    const cards = this.vocabCards();
    const index = this.currentVocabIndex();
    if (cards[index]) {
      cards[index].isStudied = true;
      this.vocabCards.set([...cards]);
    }
  }

  nextVocab(): void {
    this.markVocabStudied();
    const cards = this.vocabCards();
    const index = this.currentVocabIndex();
    if (index < cards.length - 1) {
      // Reset flip state for next card
      cards[index + 1].isFlipped = false;
      this.vocabCards.set([...cards]);
      this.currentVocabIndex.set(index + 1);
    } else {
      // All vocab studied, move to next section
      if (this.grammarList().length > 0) {
        this.startGrammar();
      } else if (this.exerciseList().length > 0) {
        this.startExercises();
      } else {
        this.currentSection.set('complete');
      }
    }
  }

  prevVocab(): void {
    const index = this.currentVocabIndex();
    if (index > 0) {
      this.currentVocabIndex.set(index - 1);
    }
  }

  // Grammar
  nextGrammar(): void {
    const list = this.grammarList();
    const index = this.currentGrammarIndex();
    if (index < list.length - 1) {
      this.currentGrammarIndex.set(index + 1);
    } else {
      // All grammar studied
      if (this.exerciseList().length > 0) {
        this.startExercises();
      } else {
        this.currentSection.set('complete');
      }
    }
  }

  prevGrammar(): void {
    const index = this.currentGrammarIndex();
    if (index > 0) {
      this.currentGrammarIndex.set(index - 1);
    }
  }

  // Exercises
  selectAnswer(answer: string): void {
    const exercise = this.currentExercise();
    if (!exercise) return;

    const answers = new Map(this.exerciseAnswers());
    answers.set(exercise.id, answer);
    this.exerciseAnswers.set(answers);
  }

  submitAnswer(): void {
    const exercise = this.currentExercise();
    if (!exercise) return;

    const answer = this.exerciseAnswers().get(exercise.id);
    if (!answer) return;

    const isCorrect = answer.toLowerCase().trim() === exercise.correctAnswer.toLowerCase().trim();
    const results = new Map(this.exerciseResults());
    results.set(exercise.id, isCorrect);
    this.exerciseResults.set(results);
  }

  nextExercise(): void {
    const list = this.exerciseList();
    const index = this.currentExerciseIndex();
    if (index < list.length - 1) {
      this.currentExerciseIndex.set(index + 1);
    } else {
      this.currentSection.set('complete');
    }
  }

  isAnswerSelected(answer: string): boolean {
    const exercise = this.currentExercise();
    if (!exercise) return false;
    return this.exerciseAnswers().get(exercise.id) === answer;
  }

  isExerciseAnswered(): boolean {
    const exercise = this.currentExercise();
    if (!exercise) return false;
    return this.exerciseResults().has(exercise.id);
  }

  getAnswerState(answer: string): 'correct' | 'incorrect' | 'neutral' {
    const exercise = this.currentExercise();
    if (!exercise || !this.isExerciseAnswered()) return 'neutral';

    if (answer.toLowerCase().trim() === exercise.correctAnswer.toLowerCase().trim()) {
      return 'correct';
    }
    if (this.isAnswerSelected(answer)) {
      return 'incorrect';
    }
    return 'neutral';
  }

  // Text input for fill_blank / translation exercises
  onTextInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const exercise = this.currentExercise();
    if (!exercise) return;

    const answers = new Map(this.exerciseAnswers());
    answers.set(exercise.id, input.value);
    this.exerciseAnswers.set(answers);
  }

  getTextAnswerState(): 'correct' | 'incorrect' | 'neutral' {
    const exercise = this.currentExercise();
    if (!exercise || !this.isExerciseAnswered()) return 'neutral';

    const answer = this.exerciseAnswers().get(exercise.id);
    if (!answer) return 'incorrect';

    return answer.toLowerCase().trim() === exercise.correctAnswer.toLowerCase().trim()
      ? 'correct'
      : 'incorrect';
  }

  // ========================================
  // Matching exercise methods
  // ========================================
  initMatchingExercise(): void {
    const exercise = this.currentExercise();
    if (!exercise?.exerciseData?.['pairs']) return;

    const pairs = exercise.exerciseData['pairs'] as { en: string; vi: string }[];
    // Shuffle Vietnamese items
    const shuffledVi = pairs.map(p => p.vi).sort(() => Math.random() - 0.5);
    this.matchingShuffledVi.set(shuffledVi);
    this.matchingMatches.set(new Map());
    this.matchingSelectedEn.set(null);
    this.matchingSelectedVi.set(null);
  }

  getMatchingPairs(): { en: string; vi: string }[] {
    const exercise = this.currentExercise();
    return (exercise?.exerciseData?.['pairs'] as { en: string; vi: string }[]) || [];
  }

  selectMatchingEn(index: number): void {
    if (this.isExerciseAnswered()) return;
    // Check if already matched
    const matches = this.matchingMatches();
    for (const match of matches.values()) {
      if (match.enIdx === index) return;
    }

    if (this.matchingSelectedEn() === index) {
      this.matchingSelectedEn.set(null);
    } else {
      this.matchingSelectedEn.set(index);
      this.tryMatchingMatch();
    }
  }

  selectMatchingVi(index: number): void {
    if (this.isExerciseAnswered()) return;
    // Check if already matched
    const matches = this.matchingMatches();
    for (const match of matches.values()) {
      if (match.viIdx === index) return;
    }

    if (this.matchingSelectedVi() === index) {
      this.matchingSelectedVi.set(null);
    } else {
      this.matchingSelectedVi.set(index);
      this.tryMatchingMatch();
    }
  }

  private tryMatchingMatch(): void {
    const enIdx = this.matchingSelectedEn();
    const viIdx = this.matchingSelectedVi();

    if (enIdx !== null && viIdx !== null) {
      const matches = new Map(this.matchingMatches());
      const matchId = matches.size;
      matches.set(matchId, { enIdx, viIdx });
      this.matchingMatches.set(matches);

      this.matchingSelectedEn.set(null);
      this.matchingSelectedVi.set(null);

      // Update answer if all matched
      const pairs = this.getMatchingPairs();
      if (matches.size === pairs.length) {
        this.updateMatchingAnswer();
      }
    }
  }

  isMatchingEnMatched(index: number): boolean {
    const matches = this.matchingMatches();
    for (const match of matches.values()) {
      if (match.enIdx === index) return true;
    }
    return false;
  }

  isMatchingViMatched(index: number): boolean {
    const matches = this.matchingMatches();
    for (const match of matches.values()) {
      if (match.viIdx === index) return true;
    }
    return false;
  }

  private updateMatchingAnswer(): void {
    const exercise = this.currentExercise();
    if (!exercise) return;

    const pairs = this.getMatchingPairs();
    const shuffledVi = this.matchingShuffledVi();
    const matches = this.matchingMatches();

    // Build answer array
    const answer = Array.from(matches.values()).map(match => ({
      en: pairs[match.enIdx].en,
      vi: shuffledVi[match.viIdx]
    }));

    const answers = new Map(this.exerciseAnswers());
    answers.set(exercise.id, JSON.stringify(answer));
    this.exerciseAnswers.set(answers);
  }

  resetMatching(): void {
    this.initMatchingExercise();
    const exercise = this.currentExercise();
    if (exercise) {
      const answers = new Map(this.exerciseAnswers());
      answers.delete(exercise.id);
      this.exerciseAnswers.set(answers);
    }
  }

  // ========================================
  // Sentence building exercise methods
  // ========================================
  initSentenceBuildingExercise(): void {
    const exercise = this.currentExercise();
    if (!exercise?.exerciseData?.['words']) return;

    const words = [...(exercise.exerciseData['words'] as string[])];
    // Shuffle words
    this.sentenceAvailableWords.set(words.sort(() => Math.random() - 0.5));
    this.sentenceArrangedWords.set([]);
  }

  addWordToSentence(index: number): void {
    if (this.isExerciseAnswered()) return;

    const available = [...this.sentenceAvailableWords()];
    const word = available[index];
    available.splice(index, 1);
    this.sentenceAvailableWords.set(available);

    const arranged = [...this.sentenceArrangedWords(), word];
    this.sentenceArrangedWords.set(arranged);

    // Update answer
    this.updateSentenceAnswer();
  }

  removeWordFromSentence(index: number): void {
    if (this.isExerciseAnswered()) return;

    const arranged = [...this.sentenceArrangedWords()];
    const word = arranged[index];
    arranged.splice(index, 1);
    this.sentenceArrangedWords.set(arranged);

    const available = [...this.sentenceAvailableWords(), word];
    this.sentenceAvailableWords.set(available);

    // Update answer
    this.updateSentenceAnswer();
  }

  private updateSentenceAnswer(): void {
    const exercise = this.currentExercise();
    if (!exercise) return;

    const sentence = this.sentenceArrangedWords().join(' ');
    const answers = new Map(this.exerciseAnswers());
    if (sentence) {
      answers.set(exercise.id, sentence);
    } else {
      answers.delete(exercise.id);
    }
    this.exerciseAnswers.set(answers);
  }

  resetSentenceBuilding(): void {
    this.initSentenceBuildingExercise();
    const exercise = this.currentExercise();
    if (exercise) {
      const answers = new Map(this.exerciseAnswers());
      answers.delete(exercise.id);
      this.exerciseAnswers.set(answers);
    }
  }

  // Complete lesson
  completeLesson(): void {
    if (this.completing()) return;

    this.completing.set(true);
    const timeSpent = Math.round((Date.now() - this.studyStartTime().getTime()) / 1000);

    this.wordMapService.completeLessonStudy(this.lessonId(), {
      vocabularyMastered: this.vocabCards().filter(c => c.isStudied).length,
      grammarMastered: this.grammarList().length,
      timeSpentSeconds: timeSpent
    }).subscribe({
      next: (result) => {
        this.completing.set(false);
        // Navigate to exam if unlocked
        if (result.unlockedExam && this.lesson()?.hasBossExam) {
          this.router.navigate(['/word-maps', this.mapId(), 'lesson', this.lessonId(), 'exam']);
        } else {
          this.router.navigate(['/word-maps', this.mapId()]);
        }
      },
      error: (err) => {
        console.error('Error completing lesson:', err);
        this.completing.set(false);
      }
    });
  }

  goBackToMap(): void {
    this.router.navigate(['/word-maps', this.mapId()]);
  }

  // Pronunciation
  speak(word: string, accent: 'uk' | 'us', event?: Event): void {
    event?.stopPropagation(); // Prevent card flip when clicking speak button
    this.pronunciationService.speak(word, accent);
  }
}
