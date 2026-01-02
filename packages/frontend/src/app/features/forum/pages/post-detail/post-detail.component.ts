import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faSpinner,
  faExclamationCircle,
  faThumbTack,
  faStar,
  faBook,
  faLanguage,
  faGraduationCap,
  faTasks,
  faArrowUp,
  faArrowDown,
  faCheck,
  faDownload,
  faBookmark as faBookmarkSolid,
  faShareAlt,
  faEye,
  faComment,
  faComments,
  faPaperPlane,
  faReply,
  faCommentSlash,
  faFlag,
  faFolderPlus
} from '@fortawesome/free-solid-svg-icons';
import { faBookmark } from '@fortawesome/free-regular-svg-icons';
import {
  ForumService,
  PostDetail,
  CommentInfo,
  VoteType,
  PaginatedComments
} from '../../services/forum.service';
import { ImportDialogComponent, ImportOptions } from '../../components/import-dialog/import-dialog.component';
import { ShareDialogComponent } from '../../components/share-dialog/share-dialog.component';
import { ReportDialogComponent, ReportData } from '../../components/report-dialog/report-dialog.component';
import { CollectionPickerComponent } from '../../components/collection-picker/collection-picker.component';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    FontAwesomeModule,
    ImportDialogComponent,
    ShareDialogComponent,
    ReportDialogComponent,
    CollectionPickerComponent
  ],
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.scss']
})
export class PostDetailComponent implements OnInit {
  private readonly forumService = inject(ForumService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // FontAwesome icons
  faArrowLeft = faArrowLeft;
  faSpinner = faSpinner;
  faExclamationCircle = faExclamationCircle;
  faThumbTack = faThumbTack;
  faStar = faStar;
  faBook = faBook;
  faLanguage = faLanguage;
  faGraduationCap = faGraduationCap;
  faTasks = faTasks;
  faArrowUp = faArrowUp;
  faArrowDown = faArrowDown;
  faCheck = faCheck;
  faDownload = faDownload;
  faBookmarkSolid = faBookmarkSolid;
  faBookmark = faBookmark;
  faShareAlt = faShareAlt;
  faEye = faEye;
  faComment = faComment;
  faComments = faComments;
  faPaperPlane = faPaperPlane;
  faReply = faReply;
  faCommentSlash = faCommentSlash;
  faFlag = faFlag;
  faFolderPlus = faFolderPlus;

  // State
  post = signal<PostDetail | null>(null);
  comments = signal<CommentInfo[]>([]);
  loading = signal(true);
  commentsLoading = signal(false);
  error = signal<string | null>(null);

  // Comment pagination
  commentPage = signal(1);
  commentTotalPages = signal(1);

  // Dialog states
  showImportDialog = signal(false);
  showShareDialog = signal(false);
  showReportDialog = signal(false);
  showCollectionPicker = signal(false);

  // Legacy import state (kept for modal)
  showImportModal = signal(false);
  importOptions = signal({
    vocabulary: true,
    grammar: true,
    exercises: false
  });
  importing = signal(false);
  importSuccess = signal<{ vocab: number; grammar: number; exercises: number; xp: number } | null>(null);

  // New comment
  newComment = signal('');
  submittingComment = signal(false);
  replyingTo = signal<number | null>(null);
  replyContent = signal('');

  // Computed
  voteScore = computed(() => {
    const p = this.post();
    if (!p) return 0;
    return p.upvoteCount - p.downvoteCount;
  });

  difficultyLabel = computed(() => {
    const p = this.post();
    if (!p) return '';
    const labels: Record<string, string> = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced'
    };
    return labels[p.difficultyLevel] || p.difficultyLevel;
  });

  difficultyClass = computed(() => {
    const p = this.post();
    if (!p) return '';
    const classes: Record<string, string> = {
      beginner: 'difficulty-beginner',
      intermediate: 'difficulty-intermediate',
      advanced: 'difficulty-advanced'
    };
    return classes[p.difficultyLevel] || '';
  });

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.loadPost(slug);
    } else {
      this.error.set('Post not found');
      this.loading.set(false);
    }
  }

  loadPost(slug: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.forumService.getPostBySlug(slug).subscribe({
      next: (post) => {
        this.post.set(post);
        this.loading.set(false);
        this.loadComments(post.id);
      },
      error: (err) => {
        console.error('Failed to load post:', err);
        this.error.set('Failed to load post. It may have been deleted or you don\'t have permission to view it.');
        this.loading.set(false);
      }
    });
  }

  loadComments(postId: number, page = 1): void {
    this.commentsLoading.set(true);

    this.forumService.getComments(postId, page, 20).subscribe({
      next: (result: PaginatedComments) => {
        this.comments.set(result.items);
        this.commentPage.set(result.page);
        this.commentTotalPages.set(result.totalPages);
        this.commentsLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load comments:', err);
        this.commentsLoading.set(false);
      }
    });
  }

  // Voting
  vote(type: VoteType): void {
    const p = this.post();
    if (!p) return;

    // If same vote, remove it
    if (p.userVote === type) {
      this.forumService.removeVote(p.id).subscribe({
        next: (result) => {
          this.post.update(post => post ? {
            ...post,
            upvoteCount: result.upvoteCount,
            downvoteCount: result.downvoteCount,
            userVote: null
          } : null);
        },
        error: (err) => console.error('Failed to remove vote:', err)
      });
    } else {
      this.forumService.votePost(p.id, type).subscribe({
        next: (result) => {
          this.post.update(post => post ? {
            ...post,
            upvoteCount: result.upvoteCount,
            downvoteCount: result.downvoteCount,
            userVote: result.userVote
          } : null);
        },
        error: (err) => console.error('Failed to vote:', err)
      });
    }
  }

  // Bookmark
  toggleBookmark(): void {
    const p = this.post();
    if (!p) return;

    if (p.isBookmarked) {
      this.forumService.removeBookmark(p.id).subscribe({
        next: () => {
          this.post.update(post => post ? { ...post, isBookmarked: false } : null);
        },
        error: (err) => console.error('Failed to remove bookmark:', err)
      });
    } else {
      this.forumService.addBookmark(p.id).subscribe({
        next: () => {
          this.post.update(post => post ? { ...post, isBookmarked: true } : null);
        },
        error: (err) => console.error('Failed to add bookmark:', err)
      });
    }
  }

  // Import
  openImportModal(): void {
    this.showImportModal.set(true);
    this.importSuccess.set(null);
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
  }

  toggleImportOption(option: 'vocabulary' | 'grammar' | 'exercises'): void {
    this.importOptions.update(opts => ({
      ...opts,
      [option]: !opts[option]
    }));
  }

  confirmImport(): void {
    const p = this.post();
    if (!p) return;

    const opts = this.importOptions();
    this.importing.set(true);

    this.forumService.importPost(p.id, {
      importVocabulary: opts.vocabulary,
      importGrammar: opts.grammar,
      importExercises: opts.exercises
    }).subscribe({
      next: (result) => {
        this.importing.set(false);
        this.importSuccess.set({
          vocab: result.vocabularyImported,
          grammar: result.grammarImported,
          exercises: result.exercisesImported,
          xp: result.xpEarned
        });
        // Update post to show imported state
        this.post.update(post => post ? {
          ...post,
          isImported: true,
          importCount: post.importCount + 1
        } : null);
      },
      error: (err) => {
        console.error('Failed to import:', err);
        this.importing.set(false);
        alert('Failed to import content. Please try again.');
      }
    });
  }

  goToConversations(): void {
    this.closeImportModal();
    this.router.navigate(['/conversations']);
  }

  // Comments
  submitComment(): void {
    const p = this.post();
    const content = this.newComment().trim();
    if (!p || !content) return;

    this.submittingComment.set(true);

    this.forumService.createComment(p.id, { content }).subscribe({
      next: (comment) => {
        this.comments.update(comments => [comment, ...comments]);
        this.newComment.set('');
        this.submittingComment.set(false);
        // Update comment count
        this.post.update(post => post ? {
          ...post,
          commentCount: post.commentCount + 1
        } : null);
      },
      error: (err) => {
        console.error('Failed to post comment:', err);
        this.submittingComment.set(false);
        alert('Failed to post comment. Please try again.');
      }
    });
  }

  startReply(commentId: number): void {
    this.replyingTo.set(commentId);
    this.replyContent.set('');
  }

  cancelReply(): void {
    this.replyingTo.set(null);
    this.replyContent.set('');
  }

  submitReply(parentId: number): void {
    const p = this.post();
    const content = this.replyContent().trim();
    if (!p || !content) return;

    this.submittingComment.set(true);

    this.forumService.createComment(p.id, { content, parentId }).subscribe({
      next: (reply) => {
        // Add reply to parent comment's replies
        this.comments.update(comments => comments.map(c => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), reply]
            };
          }
          return c;
        }));
        this.replyingTo.set(null);
        this.replyContent.set('');
        this.submittingComment.set(false);
        // Update comment count
        this.post.update(post => post ? {
          ...post,
          commentCount: post.commentCount + 1
        } : null);
      },
      error: (err) => {
        console.error('Failed to post reply:', err);
        this.submittingComment.set(false);
        alert('Failed to post reply. Please try again.');
      }
    });
  }

  // Helpers
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  getRankBadgeClass(rank: string): string {
    const classes: Record<string, string> = {
      'newcomer': 'rank-newcomer',
      'contributor': 'rank-contributor',
      'active_contributor': 'rank-active',
      'trusted_contributor': 'rank-trusted',
      'expert': 'rank-expert',
      'master': 'rank-master',
      'legend': 'rank-legend'
    };
    return classes[rank] || 'rank-newcomer';
  }

  getRankLabel(rank: string): string {
    const labels: Record<string, string> = {
      'newcomer': 'Newcomer',
      'contributor': 'Contributor',
      'active_contributor': 'Active',
      'trusted_contributor': 'Trusted',
      'expert': 'Expert',
      'master': 'Master',
      'legend': 'Legend'
    };
    return labels[rank] || rank;
  }

  loadMoreComments(): void {
    const p = this.post();
    if (!p) return;
    const nextPage = this.commentPage() + 1;
    if (nextPage <= this.commentTotalPages()) {
      this.loadComments(p.id, nextPage);
    }
  }

  // Dialog handlers
  openImportDialog(): void {
    this.showImportDialog.set(true);
  }

  closeImportDialog(): void {
    this.showImportDialog.set(false);
  }

  handleImport(options: ImportOptions): void {
    const p = this.post();
    if (!p) return;

    this.forumService.importPost(p.id, {
      importVocabulary: options.importVocabulary,
      importGrammar: options.importGrammar,
      importExercises: options.importExercises
    }).subscribe({
      next: (result) => {
        this.closeImportDialog();
        // Update post to show imported state
        this.post.update(post => post ? {
          ...post,
          isImported: true,
          importCount: post.importCount + 1
        } : null);
        // Show success message
        alert(`Successfully imported: ${result.vocabularyImported} vocabulary, ${result.grammarImported} grammar points, ${result.exercisesImported} exercises. +${result.xpEarned} XP!`);
      },
      error: (err) => {
        console.error('Failed to import:', err);
        alert('Failed to import content. Please try again.');
      }
    });
  }

  openShareDialog(): void {
    this.showShareDialog.set(true);
  }

  closeShareDialog(): void {
    this.showShareDialog.set(false);
  }

  get shareUrl(): string {
    return window.location.href;
  }

  openReportDialog(): void {
    this.showReportDialog.set(true);
  }

  closeReportDialog(): void {
    this.showReportDialog.set(false);
  }

  handleReport(data: ReportData): void {
    const p = this.post();
    if (!p) return;

    this.forumService.submitReport({
      contentType: 'post',
      contentId: p.id,
      reason: data.reason,
      description: data.details
    }).subscribe({
      next: () => {
        this.closeReportDialog();
        alert('Thank you for your report. We will review it shortly.');
      },
      error: (err) => {
        console.error('Failed to submit report:', err);
        alert('Failed to submit report. Please try again.');
      }
    });
  }

  openCollectionPicker(): void {
    this.showCollectionPicker.set(true);
  }

  closeCollectionPicker(): void {
    this.showCollectionPicker.set(false);
  }

  handleAddToCollection(collectionId: number): void {
    const p = this.post();
    if (!p) return;

    this.forumService.addToCollection(collectionId, p.id).subscribe({
      next: () => {
        this.closeCollectionPicker();
        alert('Added to collection!');
      },
      error: (err) => {
        console.error('Failed to add to collection:', err);
        alert('Failed to add to collection. Please try again.');
      }
    });
  }

  handleCollectionSelected(event: { collectionId: number; added: boolean }): void {
    this.closeCollectionPicker();
    if (event.added) {
      alert('Added to collection!');
    } else {
      alert('Removed from collection.');
    }
  }
}
