import { Component, OnInit, OnDestroy, signal, computed, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, GameVocabulary, EndGameResponse } from '../../../core/services/api.service';
import { AudioService } from '../../../core/services/audio.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import { GameOverDialogComponent, GameResult } from '../shared/game-over-dialog/game-over-dialog.component';
import { CountdownComponent } from '../shared/countdown/countdown.component';

interface CrosswordCell {
  row: number;
  col: number;
  letter: string;
  userLetter: string;
  isBlocked: boolean;
  wordIds: number[];
  clueNumber?: number;
  isSelected: boolean;
  isHighlighted: boolean;
  isCorrect?: boolean;
}

interface CrosswordWord {
  id: number;
  word: string;
  clue: string;
  direction: 'across' | 'down';
  startRow: number;
  startCol: number;
  clueNumber: number;
  vocabularyId: number;
}

@Component({
  selector: 'app-crossword',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GameHeaderComponent,
    GameOverDialogComponent,
    CountdownComponent
  ],
  templateUrl: './crossword.component.html',
  styleUrls: ['./crossword.component.scss']
})
export class CrosswordComponent implements OnInit, OnDestroy {
  // Game state
  sessionId = signal<number | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  showCountdown = signal(true);
  gameStarted = signal(false);
  isPaused = signal(false);

  // Grid
  gridSize = 10;
  grid = signal<CrosswordCell[][]>([]);
  words = signal<CrosswordWord[]>([]);

  // Selection
  selectedCell = signal<{ row: number; col: number } | null>(null);
  selectedDirection = signal<'across' | 'down'>('across');
  selectedWord = computed(() => {
    const cell = this.selectedCell();
    if (!cell) return null;
    const gridCell = this.grid()[cell.row]?.[cell.col];
    if (!gridCell || gridCell.isBlocked) return null;

    const direction = this.selectedDirection();
    const wordId = gridCell.wordIds.find(id => {
      const word = this.words().find(w => w.id === id);
      return word?.direction === direction;
    });

    return this.words().find(w => w.id === wordId) || null;
  });

  // Stats
  score = signal(0);
  hintsUsed = signal(0);
  cellsCorrect = signal(0);
  cellsWrong = signal(0);
  timeElapsed = signal(0);
  combo = signal(0);
  maxCombo = signal(0);

  // Timer
  private timerInterval: any = null;
  private startTime: number = 0;

  // Game result
  showGameOver = signal(false);
  gameResult = signal<GameResult | null>(null);

  // Clues
  acrossClues = computed(() => this.words().filter(w => w.direction === 'across').sort((a, b) => a.clueNumber - b.clueNumber));
  downClues = computed(() => this.words().filter(w => w.direction === 'down').sort((a, b) => a.clueNumber - b.clueNumber));

  // Progress
  totalCells = computed(() => {
    let count = 0;
    this.grid().forEach(row => {
      row.forEach(cell => {
        if (!cell.isBlocked) count++;
      });
    });
    return count;
  });

  filledCells = computed(() => {
    let count = 0;
    this.grid().forEach(row => {
      row.forEach(cell => {
        if (!cell.isBlocked && cell.userLetter) count++;
      });
    });
    return count;
  });

  isComplete = computed(() => this.filledCells() === this.totalCells() && this.totalCells() > 0);

  private dialogService = inject(DialogService);

  constructor(
    private apiService: ApiService,
    private router: Router,
    private audioService: AudioService
  ) {}

  ngOnInit(): void {
    this.startNewGame();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.gameStarted() || this.isPaused() || this.showGameOver()) return;

    const key = event.key.toUpperCase();
    const cell = this.selectedCell();

    if (!cell) return;

    if (key === 'ARROWUP') {
      event.preventDefault();
      this.moveSelection(cell.row - 1, cell.col);
    } else if (key === 'ARROWDOWN') {
      event.preventDefault();
      this.moveSelection(cell.row + 1, cell.col);
    } else if (key === 'ARROWLEFT') {
      event.preventDefault();
      this.moveSelection(cell.row, cell.col - 1);
    } else if (key === 'ARROWRIGHT') {
      event.preventDefault();
      this.moveSelection(cell.row, cell.col + 1);
    } else if (key === 'BACKSPACE' || key === 'DELETE') {
      event.preventDefault();
      this.clearCell(cell.row, cell.col);
      this.moveToPrevious();
    } else if (key === 'TAB') {
      event.preventDefault();
      this.toggleDirection();
    } else if (/^[A-Z]$/.test(key)) {
      event.preventDefault();
      this.enterLetter(key);
    }
  }

  startNewGame(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.resetGame();

    this.apiService.startGame('crossword').subscribe({
      next: (response) => {
        this.sessionId.set(response.sessionId);
        this.generatePuzzle(response.vocabulary);
        this.isLoading.set(false);
        this.showCountdown.set(true);
      },
      error: (err) => {
        console.error('Failed to start game:', err);
        this.error.set(err.error?.message || 'Failed to start game');
        this.isLoading.set(false);
      }
    });
  }

  resetGame(): void {
    this.stopTimer();
    this.grid.set([]);
    this.words.set([]);
    this.selectedCell.set(null);
    this.selectedDirection.set('across');
    this.score.set(0);
    this.hintsUsed.set(0);
    this.cellsCorrect.set(0);
    this.cellsWrong.set(0);
    this.timeElapsed.set(0);
    this.combo.set(0);
    this.maxCombo.set(0);
    this.gameStarted.set(false);
    this.showGameOver.set(false);
    this.gameResult.set(null);
  }

  generatePuzzle(vocabulary: GameVocabulary[]): void {
    // Initialize empty grid
    const grid: CrosswordCell[][] = [];
    for (let i = 0; i < this.gridSize; i++) {
      grid[i] = [];
      for (let j = 0; j < this.gridSize; j++) {
        grid[i][j] = {
          row: i,
          col: j,
          letter: '',
          userLetter: '',
          isBlocked: true,
          wordIds: [],
          isSelected: false,
          isHighlighted: false
        };
      }
    }

    const words: CrosswordWord[] = [];
    const sorted = [...vocabulary]
      .filter(v => v.englishWord.length <= this.gridSize && v.englishWord.length >= 3)
      .sort((a, b) => b.englishWord.length - a.englishWord.length)
      .slice(0, 12);

    if (sorted.length === 0) {
      this.error.set('Not enough vocabulary to generate puzzle');
      return;
    }

    let wordId = 0;
    let clueNumber = 1;

    // Place first word horizontally in middle
    const firstWord = sorted[0];
    const startCol = Math.floor((this.gridSize - firstWord.englishWord.length) / 2);
    const startRow = Math.floor(this.gridSize / 2);

    this.placeWord(grid, words, firstWord, startRow, startCol, 'across', wordId++, clueNumber++);

    // Try to place remaining words
    for (let i = 1; i < sorted.length; i++) {
      const vocab = sorted[i];
      const placement = this.findBestPlacement(grid, vocab.englishWord.toUpperCase(), words);

      if (placement) {
        this.placeWord(grid, words, vocab, placement.row, placement.col, placement.direction, wordId++, clueNumber++);
      }
    }

    // Assign clue numbers properly
    this.assignClueNumbers(grid, words);

    this.grid.set(grid);
    this.words.set(words);
  }

  private placeWord(
    grid: CrosswordCell[][],
    words: CrosswordWord[],
    vocab: GameVocabulary,
    startRow: number,
    startCol: number,
    direction: 'across' | 'down',
    wordId: number,
    clueNumber: number
  ): void {
    const word = vocab.englishWord.toUpperCase();

    for (let i = 0; i < word.length; i++) {
      const row = direction === 'down' ? startRow + i : startRow;
      const col = direction === 'across' ? startCol + i : startCol;

      grid[row][col].letter = word[i];
      grid[row][col].isBlocked = false;
      grid[row][col].wordIds.push(wordId);

      if (i === 0) {
        grid[row][col].clueNumber = clueNumber;
      }
    }

    words.push({
      id: wordId,
      word: word,
      clue: vocab.vietnameseWord,
      direction,
      startRow,
      startCol,
      clueNumber,
      vocabularyId: vocab.id
    });
  }

  private findBestPlacement(
    grid: CrosswordCell[][],
    word: string,
    existingWords: CrosswordWord[]
  ): { row: number; col: number; direction: 'across' | 'down' } | null {
    const placements: { row: number; col: number; direction: 'across' | 'down'; score: number }[] = [];

    // Find intersections with existing words
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (grid[row][col].letter) {
          const letter = grid[row][col].letter;
          const indices = this.findLetterIndices(word, letter);

          for (const index of indices) {
            // Try horizontal
            const hStart = col - index;
            if (this.canPlaceHorizontal(grid, word, row, hStart)) {
              placements.push({
                row, col: hStart, direction: 'across',
                score: this.scorePlacement(grid, word, row, hStart, 'across')
              });
            }

            // Try vertical
            const vStart = row - index;
            if (this.canPlaceVertical(grid, word, vStart, col)) {
              placements.push({
                row: vStart, col, direction: 'down',
                score: this.scorePlacement(grid, word, vStart, col, 'down')
              });
            }
          }
        }
      }
    }

    if (placements.length === 0) return null;

    // Return highest scoring placement
    placements.sort((a, b) => b.score - a.score);
    return placements[0];
  }

  private findLetterIndices(word: string, letter: string): number[] {
    const indices: number[] = [];
    for (let i = 0; i < word.length; i++) {
      if (word[i] === letter) indices.push(i);
    }
    return indices;
  }

  private canPlaceHorizontal(grid: CrosswordCell[][], word: string, row: number, startCol: number): boolean {
    if (startCol < 0 || startCol + word.length > this.gridSize) return false;

    // Check cell before
    if (startCol > 0 && !grid[row][startCol - 1].isBlocked) return false;

    // Check cell after
    if (startCol + word.length < this.gridSize && !grid[row][startCol + word.length].isBlocked) return false;

    for (let i = 0; i < word.length; i++) {
      const col = startCol + i;
      const cell = grid[row][col];

      if (!cell.isBlocked) {
        // Cell already has a letter - must match
        if (cell.letter !== word[i]) return false;
      } else {
        // Check cells above and below
        if (row > 0 && !grid[row - 1][col].isBlocked) return false;
        if (row < this.gridSize - 1 && !grid[row + 1][col].isBlocked) return false;
      }
    }

    return true;
  }

  private canPlaceVertical(grid: CrosswordCell[][], word: string, startRow: number, col: number): boolean {
    if (startRow < 0 || startRow + word.length > this.gridSize) return false;

    // Check cell before
    if (startRow > 0 && !grid[startRow - 1][col].isBlocked) return false;

    // Check cell after
    if (startRow + word.length < this.gridSize && !grid[startRow + word.length][col].isBlocked) return false;

    for (let i = 0; i < word.length; i++) {
      const row = startRow + i;
      const cell = grid[row][col];

      if (!cell.isBlocked) {
        // Cell already has a letter - must match
        if (cell.letter !== word[i]) return false;
      } else {
        // Check cells left and right
        if (col > 0 && !grid[row][col - 1].isBlocked) return false;
        if (col < this.gridSize - 1 && !grid[row][col + 1].isBlocked) return false;
      }
    }

    return true;
  }

  private scorePlacement(
    grid: CrosswordCell[][],
    word: string,
    startRow: number,
    startCol: number,
    direction: 'across' | 'down'
  ): number {
    let score = 0;
    for (let i = 0; i < word.length; i++) {
      const row = direction === 'down' ? startRow + i : startRow;
      const col = direction === 'across' ? startCol + i : startCol;
      if (!grid[row][col].isBlocked) score += 10; // Bonus for intersection
    }
    return score;
  }

  private assignClueNumbers(grid: CrosswordCell[][], words: CrosswordWord[]): void {
    let clueNumber = 1;
    const assigned = new Map<string, number>();

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = grid[row][col];
        if (cell.isBlocked) continue;

        const key = `${row}-${col}`;
        const needsNumber =
          (col === 0 || grid[row][col - 1].isBlocked) ||
          (row === 0 || grid[row - 1][col].isBlocked);

        if (needsNumber && !assigned.has(key)) {
          assigned.set(key, clueNumber);
          cell.clueNumber = clueNumber;

          // Update words that start here
          words.forEach(w => {
            if (w.startRow === row && w.startCol === col) {
              w.clueNumber = clueNumber;
            }
          });

          clueNumber++;
        }
      }
    }
  }

  onCountdownComplete(): void {
    this.showCountdown.set(false);
    this.gameStarted.set(true);
    this.startTimer();
    this.selectFirstCell();
  }

  startTimer(): void {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      if (!this.isPaused()) {
        this.timeElapsed.set(Math.floor((Date.now() - this.startTime) / 1000));
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  selectFirstCell(): void {
    const g = this.grid();
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (!g[row][col].isBlocked) {
          this.selectCell(row, col);
          return;
        }
      }
    }
  }

  selectCell(row: number, col: number): void {
    const g = this.grid();
    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return;
    if (g[row][col].isBlocked) return;

    // Play click sound for cell selection
    this.audioService.playSound('click');

    const prevCell = this.selectedCell();

    // If clicking same cell, toggle direction
    if (prevCell && prevCell.row === row && prevCell.col === col) {
      this.toggleDirection();
    } else {
      this.selectedCell.set({ row, col });
    }

    this.updateHighlights();
  }

  toggleDirection(): void {
    const cell = this.selectedCell();
    if (!cell) return;

    const gridCell = this.grid()[cell.row][cell.col];
    const currentDir = this.selectedDirection();
    const newDir = currentDir === 'across' ? 'down' : 'across';

    // Check if there's a word in the new direction
    const hasWordInNewDir = gridCell.wordIds.some(id => {
      const word = this.words().find(w => w.id === id);
      return word?.direction === newDir;
    });

    if (hasWordInNewDir) {
      this.selectedDirection.set(newDir);
      this.updateHighlights();
    }
  }

  updateHighlights(): void {
    const cell = this.selectedCell();
    const word = this.selectedWord();

    this.grid.update(g => {
      const newGrid = g.map(row => row.map(c => ({
        ...c,
        isSelected: false,
        isHighlighted: false
      })));

      if (cell) {
        newGrid[cell.row][cell.col].isSelected = true;
      }

      if (word) {
        for (let i = 0; i < word.word.length; i++) {
          const r = word.direction === 'down' ? word.startRow + i : word.startRow;
          const c = word.direction === 'across' ? word.startCol + i : word.startCol;
          newGrid[r][c].isHighlighted = true;
        }
      }

      return newGrid;
    });
  }

  moveSelection(row: number, col: number): void {
    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return;

    const g = this.grid();
    if (!g[row][col].isBlocked) {
      this.selectedCell.set({ row, col });
      this.updateHighlights();
    }
  }

  enterLetter(letter: string): void {
    const cell = this.selectedCell();
    if (!cell) return;

    const g = this.grid();
    const gridCell = g[cell.row][cell.col];
    if (gridCell.isBlocked) return;

    // Play type sound for letter entry
    this.audioService.playSound('type');

    // Update the cell
    this.grid.update(grid => {
      const newGrid = grid.map(row => [...row]);
      newGrid[cell.row][cell.col] = {
        ...newGrid[cell.row][cell.col],
        userLetter: letter
      };
      return newGrid;
    });

    // Move to next cell in current direction
    this.moveToNext();

    // Check if puzzle is complete
    if (this.isComplete()) {
      this.checkSolution();
    }
  }

  clearCell(row: number, col: number): void {
    this.grid.update(grid => {
      const newGrid = grid.map(r => [...r]);
      newGrid[row][col] = {
        ...newGrid[row][col],
        userLetter: ''
      };
      return newGrid;
    });
  }

  moveToNext(): void {
    const cell = this.selectedCell();
    const direction = this.selectedDirection();
    if (!cell) return;

    if (direction === 'across') {
      this.moveSelection(cell.row, cell.col + 1);
    } else {
      this.moveSelection(cell.row + 1, cell.col);
    }
  }

  moveToPrevious(): void {
    const cell = this.selectedCell();
    const direction = this.selectedDirection();
    if (!cell) return;

    if (direction === 'across') {
      this.moveSelection(cell.row, cell.col - 1);
    } else {
      this.moveSelection(cell.row - 1, cell.col);
    }
  }

  selectClue(word: CrosswordWord): void {
    this.selectedDirection.set(word.direction);
    this.selectedCell.set({ row: word.startRow, col: word.startCol });
    this.updateHighlights();
  }

  useHint(): void {
    const word = this.selectedWord();
    if (!word) return;

    // Play ding sound for hint usage
    this.audioService.playSound('ding');

    // Find first empty or wrong cell in the word
    const g = this.grid();
    for (let i = 0; i < word.word.length; i++) {
      const row = word.direction === 'down' ? word.startRow + i : word.startRow;
      const col = word.direction === 'across' ? word.startCol + i : word.startCol;
      const cell = g[row][col];

      if (!cell.userLetter || cell.userLetter !== cell.letter) {
        this.grid.update(grid => {
          const newGrid = grid.map(r => [...r]);
          newGrid[row][col] = {
            ...newGrid[row][col],
            userLetter: cell.letter,
            isCorrect: true
          };
          return newGrid;
        });
        this.hintsUsed.update(h => h + 1);
        break;
      }
    }
  }

  checkSolution(): void {
    let correct = 0;
    let wrong = 0;

    this.grid.update(g => {
      const newGrid = g.map(row => row.map(cell => {
        if (cell.isBlocked) return cell;

        const isCorrect = cell.userLetter === cell.letter;
        if (isCorrect) {
          correct++;
        } else {
          wrong++;
        }

        return { ...cell, isCorrect };
      }));
      return newGrid;
    });

    this.cellsCorrect.set(correct);
    this.cellsWrong.set(wrong);

    // Calculate score
    const baseScore = correct * 10;
    const hintPenalty = this.hintsUsed() * 20;
    const timeBonus = Math.max(0, 300 - this.timeElapsed()) * 2;
    const finalScore = Math.max(0, baseScore - hintPenalty + (wrong === 0 ? timeBonus : 0));

    this.score.set(finalScore);

    if (wrong === 0) {
      // Perfect solution - play victory sound
      this.audioService.playSound('victory');
      this.endGame();
    } else {
      // Some errors - play wrong sound
      this.audioService.playSound('wrong');
    }
  }

  onPause(): void {
    this.isPaused.update(p => !p);
  }

  async onQuit(): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Quit Game',
      message: 'Are you sure you want to quit? Your progress will be saved.',
      confirmText: 'Quit',
      cancelText: 'Continue',
    });
    if (confirmed) {
      this.endGame();
    }
  }

  endGame(): void {
    this.stopTimer();

    const sessionId = this.sessionId();
    if (!sessionId) {
      this.showGameOver.set(true);
      return;
    }

    const total = this.cellsCorrect() + this.cellsWrong();
    const accuracy = total > 0 ? Math.round((this.cellsCorrect() / total) * 100) : 0;

    const endData = {
      score: this.score(),
      maxCombo: this.maxCombo(),
      accuracy: accuracy,
      wordsCorrect: this.words().filter(w => this.isWordCorrect(w)).length,
      wordsWrong: this.words().filter(w => !this.isWordCorrect(w)).length,
      durationSeconds: this.timeElapsed()
    };

    this.apiService.endGame(sessionId, endData).subscribe({
      next: (response: EndGameResponse) => {
        this.gameResult.set({
          sessionId,
          score: response.session.score,
          maxCombo: response.session.maxCombo,
          accuracy: response.session.accuracy,
          wordsCorrect: response.session.wordsCorrect,
          wordsWrong: response.session.wordsWrong,
          durationSeconds: response.session.durationSeconds,
          xpEarned: response.xpEarned,
          coinsEarned: response.coinsEarned,
          isNewBestScore: response.isNewBestScore,
          leaderboardPosition: response.leaderboardPosition,
          newAchievements: response.newAchievements
        });
        this.showGameOver.set(true);
      },
      error: (err) => {
        console.error('Failed to end game:', err);
        this.gameResult.set({
          ...endData,
          xpEarned: 0,
          coinsEarned: 0,
          isNewBestScore: false,
          newAchievements: []
        });
        this.showGameOver.set(true);
      }
    });
  }

  isWordCorrect(word: CrosswordWord): boolean {
    const g = this.grid();
    for (let i = 0; i < word.word.length; i++) {
      const row = word.direction === 'down' ? word.startRow + i : word.startRow;
      const col = word.direction === 'across' ? word.startCol + i : word.startCol;
      if (g[row][col].userLetter !== g[row][col].letter) return false;
    }
    return true;
  }

  isClueSelected(word: CrosswordWord): boolean {
    const selected = this.selectedWord();
    return selected?.id === word.id;
  }

  onPlayAgain(): void {
    this.showGameOver.set(false);
    this.gameResult.set(null);
    this.startNewGame();
  }

  onBackToHub(): void {
    this.router.navigate(['/games']);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
