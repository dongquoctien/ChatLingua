import { Component, OnInit, OnDestroy, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, GameVocabulary, EndGameResponse, GameAchievementInfo } from '../../../core/services/api.service';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import { GameOverDialogComponent, GameResult } from '../shared/game-over-dialog/game-over-dialog.component';
import { CountdownComponent } from '../shared/countdown/countdown.component';

interface GridCell {
  letter: string;
  row: number;
  col: number;
  isSelected: boolean;
  isHighlighted: boolean;
  isFound: boolean;
  wordIds: string[]; // IDs of words this cell belongs to
}

interface HiddenWord {
  id: string;
  word: string;
  vietnamese: string;
  direction: 'horizontal' | 'vertical' | 'diagonal' | 'diagonal-up';
  startRow: number;
  startCol: number;
  isFound: boolean;
}

type Direction = 'horizontal' | 'vertical' | 'diagonal' | 'diagonal-up';

@Component({
  selector: 'app-word-search',
  standalone: true,
  imports: [CommonModule, GameHeaderComponent, GameOverDialogComponent, CountdownComponent],
  templateUrl: './word-search.component.html',
  styleUrls: ['./word-search.component.scss']
})
export class WordSearchComponent implements OnInit, OnDestroy {
  // Game state
  isLoading = signal(true);
  error = signal<string | null>(null);
  showCountdown = signal(false);
  gameStarted = signal(false);
  isPaused = signal(false);
  showGameOver = signal(false);
  sessionId = signal<number | null>(null);

  // Grid state
  grid = signal<GridCell[][]>([]);
  hiddenWords = signal<HiddenWord[]>([]);
  gridSize = 12;

  // Selection state
  isSelecting = signal(false);
  selectionStart = signal<{row: number; col: number} | null>(null);
  selectionEnd = signal<{row: number; col: number} | null>(null);
  selectedCells = signal<{row: number; col: number}[]>([]);

  // Game stats
  score = signal(0);
  timeElapsed = signal(0);
  hintsUsed = signal(0);
  private timerInterval: any;

  // Computed
  foundWords = computed(() => this.hiddenWords().filter(w => w.isFound));
  remainingWords = computed(() => this.hiddenWords().filter(w => !w.isFound));
  isComplete = computed(() => this.remainingWords().length === 0 && this.hiddenWords().length > 0);

  gameResult = computed<GameResult>(() => {
    const total = this.hiddenWords().length;
    const found = this.foundWords().length;
    const accuracy = total > 0 ? Math.round((found / total) * 100) : 0;

    return {
      score: this.score(),
      maxCombo: 0,
      accuracy,
      wordsCorrect: found,
      wordsWrong: total - found,
      durationSeconds: this.timeElapsed(),
      xpEarned: 0,
      coinsEarned: 0,
      isNewBestScore: false,
      newAchievements: [],
    };
  });

  // Vocabulary for generating puzzle
  private vocabulary: GameVocabulary[] = [];

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.startNewGame();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  startNewGame(): void {
    this.isLoading.set(true);
    this.score.set(0);
    this.timeElapsed.set(0);
    this.hintsUsed.set(0);
    this.stopTimer();

    // Start game session - this returns vocabulary
    this.apiService.startGame('word_search').subscribe({
      next: (response) => {
        this.sessionId.set(response.sessionId);
        // Filter vocabulary for word search suitability
        this.vocabulary = response.vocabulary.filter(v =>
          v.englishWord.length >= 3 &&
          v.englishWord.length <= 10 &&
          /^[a-zA-Z]+$/.test(v.englishWord)
        );

        if (this.vocabulary.length < 6) {
          this.error.set('Not enough vocabulary to generate puzzle. Please add more words.');
          this.isLoading.set(false);
          return;
        }

        this.generatePuzzle();
        this.isLoading.set(false);
        this.showCountdown.set(true);
      },
      error: (err) => {
        console.error('Error starting game:', err);
        this.error.set(err.error?.message || 'Failed to start game');
        this.isLoading.set(false);
      }
    });
  }

  private generatePuzzle(): void {
    // Initialize empty grid
    const grid: GridCell[][] = [];
    for (let row = 0; row < this.gridSize; row++) {
      grid[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        grid[row][col] = {
          letter: '',
          row,
          col,
          isSelected: false,
          isHighlighted: false,
          isFound: false,
          wordIds: [],
        };
      }
    }

    // Select random words
    const shuffled = [...this.vocabulary].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.slice(0, Math.min(8, shuffled.length));

    const hiddenWords: HiddenWord[] = [];
    const directions: Direction[] = ['horizontal', 'vertical', 'diagonal', 'diagonal-up'];

    // Place each word
    for (const vocab of selectedWords) {
      const word = vocab.englishWord.toUpperCase();
      let placed = false;

      // Try each direction randomly
      const shuffledDirs = [...directions].sort(() => Math.random() - 0.5);

      for (const direction of shuffledDirs) {
        const position = this.findPlacement(grid, word, direction);
        if (position) {
          const hiddenWord: HiddenWord = {
            id: `word_${hiddenWords.length}`,
            word,
            vietnamese: vocab.vietnameseWord,
            direction,
            startRow: position.row,
            startCol: position.col,
            isFound: false,
          };

          this.placeWord(grid, hiddenWord);
          hiddenWords.push(hiddenWord);
          placed = true;
          break;
        }
      }

      if (!placed) {
        console.log(`Could not place word: ${word}`);
      }
    }

    // Fill empty cells with random letters
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (!grid[row][col].letter) {
          grid[row][col].letter = letters[Math.floor(Math.random() * letters.length)];
        }
      }
    }

    this.grid.set(grid);
    this.hiddenWords.set(hiddenWords);
  }

  private findPlacement(
    grid: GridCell[][],
    word: string,
    direction: Direction
  ): { row: number; col: number } | null {
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let row: number, col: number;

      switch (direction) {
        case 'horizontal':
          row = Math.floor(Math.random() * this.gridSize);
          col = Math.floor(Math.random() * (this.gridSize - word.length + 1));
          break;
        case 'vertical':
          row = Math.floor(Math.random() * (this.gridSize - word.length + 1));
          col = Math.floor(Math.random() * this.gridSize);
          break;
        case 'diagonal':
          row = Math.floor(Math.random() * (this.gridSize - word.length + 1));
          col = Math.floor(Math.random() * (this.gridSize - word.length + 1));
          break;
        case 'diagonal-up':
          row = word.length - 1 + Math.floor(Math.random() * (this.gridSize - word.length + 1));
          col = Math.floor(Math.random() * (this.gridSize - word.length + 1));
          break;
      }

      if (this.canPlace(grid, word, row, col, direction)) {
        return { row, col };
      }
    }

    return null;
  }

  private canPlace(
    grid: GridCell[][],
    word: string,
    startRow: number,
    startCol: number,
    direction: Direction
  ): boolean {
    for (let i = 0; i < word.length; i++) {
      let row = startRow;
      let col = startCol;

      switch (direction) {
        case 'horizontal':
          col += i;
          break;
        case 'vertical':
          row += i;
          break;
        case 'diagonal':
          row += i;
          col += i;
          break;
        case 'diagonal-up':
          row -= i;
          col += i;
          break;
      }

      if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
        return false;
      }

      const cell = grid[row][col];
      if (cell.letter && cell.letter !== word[i]) {
        return false;
      }
    }

    return true;
  }

  private placeWord(grid: GridCell[][], word: HiddenWord): void {
    for (let i = 0; i < word.word.length; i++) {
      let row = word.startRow;
      let col = word.startCol;

      switch (word.direction) {
        case 'horizontal':
          col += i;
          break;
        case 'vertical':
          row += i;
          break;
        case 'diagonal':
          row += i;
          col += i;
          break;
        case 'diagonal-up':
          row -= i;
          col += i;
          break;
      }

      grid[row][col].letter = word.word[i];
      grid[row][col].wordIds.push(word.id);
    }
  }

  onCountdownComplete(): void {
    this.showCountdown.set(false);
    this.gameStarted.set(true);
    this.startTimer();
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (!this.isPaused()) {
        this.timeElapsed.update(t => t + 1);
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // Mouse/touch events for selection
  onCellMouseDown(row: number, col: number): void {
    if (this.isPaused() || this.showGameOver()) return;

    this.isSelecting.set(true);
    this.selectionStart.set({ row, col });
    this.selectionEnd.set({ row, col });
    this.updateSelection();
  }

  onCellMouseEnter(row: number, col: number): void {
    if (!this.isSelecting()) return;

    this.selectionEnd.set({ row, col });
    this.updateSelection();
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (this.isSelecting()) {
      this.checkSelection();
      this.isSelecting.set(false);
      this.clearSelection();
    }
  }

  private updateSelection(): void {
    const start = this.selectionStart();
    const end = this.selectionEnd();
    if (!start || !end) return;

    const grid = this.grid();
    const newGrid = grid.map(row => row.map(cell => ({
      ...cell,
      isSelected: false
    })));

    const cells = this.getCellsBetween(start, end);
    this.selectedCells.set(cells);

    for (const cell of cells) {
      newGrid[cell.row][cell.col].isSelected = true;
    }

    this.grid.set(newGrid);
  }

  private getCellsBetween(
    start: { row: number; col: number },
    end: { row: number; col: number }
  ): { row: number; col: number }[] {
    const cells: { row: number; col: number }[] = [];

    const rowDiff = end.row - start.row;
    const colDiff = end.col - start.col;

    // Determine direction
    const isHorizontal = rowDiff === 0;
    const isVertical = colDiff === 0;
    const isDiagonal = Math.abs(rowDiff) === Math.abs(colDiff);

    if (!isHorizontal && !isVertical && !isDiagonal) {
      // Not a valid selection line
      return [start];
    }

    const length = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
    const rowStep = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
    const colStep = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);

    for (let i = 0; i <= length; i++) {
      cells.push({
        row: start.row + i * rowStep,
        col: start.col + i * colStep
      });
    }

    return cells;
  }

  private checkSelection(): void {
    const cells = this.selectedCells();
    if (cells.length < 2) return;

    const grid = this.grid();
    const selectedWord = cells.map(c => grid[c.row][c.col].letter).join('');
    const reversedWord = selectedWord.split('').reverse().join('');

    // Check if this matches any hidden word
    const hiddenWords = this.hiddenWords();
    const matchedWord = hiddenWords.find(w =>
      !w.isFound && (w.word === selectedWord || w.word === reversedWord)
    );

    if (matchedWord) {
      this.foundWord(matchedWord);
    }
  }

  private foundWord(word: HiddenWord): void {
    // Update word as found
    const hiddenWords = this.hiddenWords().map(w =>
      w.id === word.id ? { ...w, isFound: true } : w
    );
    this.hiddenWords.set(hiddenWords);

    // Mark cells as found
    const grid = this.grid();
    const newGrid = grid.map(row => row.map(cell => ({
      ...cell,
      isFound: cell.wordIds.includes(word.id) ? true : cell.isFound
    })));
    this.grid.set(newGrid);

    // Update score: base 100 + length bonus
    const lengthBonus = word.word.length * 10;
    this.score.update(s => s + 100 + lengthBonus);

    // Check if game is complete
    if (this.remainingWords().length === 0) {
      this.endGame(true);
    }
  }

  private clearSelection(): void {
    const grid = this.grid();
    const newGrid = grid.map(row => row.map(cell => ({
      ...cell,
      isSelected: false
    })));
    this.grid.set(newGrid);
    this.selectionStart.set(null);
    this.selectionEnd.set(null);
    this.selectedCells.set([]);
  }

  useHint(): void {
    const remaining = this.remainingWords();
    if (remaining.length === 0) return;

    // Find a random unfound word and highlight its first letter
    const word = remaining[Math.floor(Math.random() * remaining.length)];
    const grid = this.grid();
    const newGrid = grid.map(row => row.map(cell => ({ ...cell, isHighlighted: false })));

    // Highlight first letter
    newGrid[word.startRow][word.startCol].isHighlighted = true;

    this.grid.set(newGrid);
    this.hintsUsed.update(h => h + 1);
    this.score.update(s => Math.max(0, s - 25)); // Penalty for hint

    // Clear highlight after 2 seconds
    setTimeout(() => {
      const g = this.grid();
      const updated = g.map(row => row.map(cell => ({ ...cell, isHighlighted: false })));
      this.grid.set(updated);
    }, 2000);
  }

  // Removed highlightWord - it was revealing the answer!
  // Only hint button should show first letter

  clearHighlight(): void {
    const grid = this.grid();
    const newGrid = grid.map(row => row.map(cell => ({ ...cell, isHighlighted: false })));
    this.grid.set(newGrid);
  }

  onPause(): void {
    this.isPaused.update(p => !p);
  }

  onQuit(): void {
    this.endGame(false);
  }

  private endGame(completed: boolean): void {
    this.stopTimer();

    if (completed) {
      // Time bonus for fast completion
      const timeBonus = Math.max(0, 300 - this.timeElapsed()) * 2;
      this.score.update(s => s + timeBonus);
    }

    // Save session
    const sessionId = this.sessionId();
    if (sessionId) {
      const total = this.hiddenWords().length;
      const found = this.foundWords().length;
      const accuracy = total > 0 ? Math.round((found / total) * 100) : 0;

      const endData = {
        score: this.score(),
        maxCombo: 0,
        accuracy,
        wordsCorrect: found,
        wordsWrong: total - found,
        durationSeconds: this.timeElapsed(),
        gameData: {
          hintsUsed: this.hintsUsed(),
          completed,
        }
      };

      this.apiService.endGame(sessionId, endData).subscribe({
        next: (response: EndGameResponse) => {
          console.log('Game session saved:', response);
        },
        error: (err) => console.error('Error saving game session:', err)
      });
    }

    this.showGameOver.set(true);
  }

  onPlayAgain(): void {
    this.showGameOver.set(false);
    this.gameStarted.set(false);
    this.startNewGame();
  }

  onBackToHub(): void {
    this.router.navigate(['/games']);
  }
}
