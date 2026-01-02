import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faSpinner,
  faFolder,
  faLock,
  faGlobe,
  faEdit,
  faTrash,
  faTimes,
  faCheck,
  faShare
} from '@fortawesome/free-solid-svg-icons';
import { ForumService, CollectionDetail, PostPreview } from '../../services/forum.service';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { ShareDialogComponent } from '../../components/share-dialog/share-dialog.component';

@Component({
  selector: 'app-collection-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    FontAwesomeModule,
    PostCardComponent,
    ShareDialogComponent
  ],
  templateUrl: './collection-detail.component.html',
  styleUrls: ['./collection-detail.component.scss']
})
export class CollectionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly forumService = inject(ForumService);

  faArrowLeft = faArrowLeft;
  faSpinner = faSpinner;
  faFolder = faFolder;
  faLock = faLock;
  faGlobe = faGlobe;
  faEdit = faEdit;
  faTrash = faTrash;
  faTimes = faTimes;
  faCheck = faCheck;
  faShare = faShare;

  collection = signal<CollectionDetail | null>(null);
  posts = signal<PostPreview[]>([]);
  loading = signal(true);
  loadingPosts = signal(false);
  error = signal<string | null>(null);

  // Edit mode
  isEditing = signal(false);
  editName = '';
  editDescription = '';
  editPrivate = false;
  updating = signal(false);

  // Delete
  deleting = signal(false);

  // Share dialog
  showShareDialog = signal(false);

  // Pagination
  currentPage = signal(1);
  totalPosts = signal(0);
  readonly pageSize = 10;

  ngOnInit(): void {
    const collectionId = this.route.snapshot.paramMap.get('id');
    if (collectionId) {
      this.loadCollection(Number(collectionId));
    } else {
      this.error.set('Collection not found');
      this.loading.set(false);
    }
  }

  loadCollection(collectionId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.forumService.getCollection(collectionId).subscribe({
      next: (response) => {
        this.collection.set(response.data);
        this.loading.set(false);
        this.loadPosts(collectionId);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load collection');
        this.loading.set(false);
      }
    });
  }

  loadPosts(collectionId: number): void {
    this.loadingPosts.set(true);

    this.forumService.getCollectionPosts(collectionId, {
      page: this.currentPage(),
      limit: this.pageSize
    }).subscribe({
      next: (response) => {
        this.posts.set(response.data);
        this.totalPosts.set(response.meta.total);
        this.loadingPosts.set(false);
      },
      error: (err) => {
        console.error('Failed to load posts:', err);
        this.loadingPosts.set(false);
      }
    });
  }

  get totalPages(): number {
    return Math.ceil(this.totalPosts() / this.pageSize) || 1;
  }

  get hasMorePosts(): boolean {
    return this.currentPage() < this.totalPages;
  }

  loadMore(): void {
    const collection = this.collection();
    if (this.loadingPosts() || !this.hasMorePosts || !collection) return;

    this.currentPage.update(p => p + 1);
    this.loadingPosts.set(true);

    this.forumService.getCollectionPosts(collection.id, {
      page: this.currentPage(),
      limit: this.pageSize
    }).subscribe({
      next: (response) => {
        this.posts.update(posts => [...posts, ...response.data]);
        this.loadingPosts.set(false);
      },
      error: (err) => {
        console.error('Failed to load more posts:', err);
        this.currentPage.update(p => p - 1);
        this.loadingPosts.set(false);
      }
    });
  }

  startEdit(): void {
    const collection = this.collection();
    if (!collection) return;

    this.editName = collection.name;
    this.editDescription = collection.description || '';
    this.editPrivate = collection.isPrivate;
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.editName = '';
    this.editDescription = '';
    this.editPrivate = false;
  }

  saveEdit(): void {
    const collection = this.collection();
    if (!collection || !this.editName.trim() || this.updating()) return;

    this.updating.set(true);

    this.forumService.updateCollection(collection.id, {
      name: this.editName.trim(),
      description: this.editDescription.trim() || undefined,
      isPrivate: this.editPrivate
    }).subscribe({
      next: (response) => {
        this.collection.set({
          ...collection,
          name: response.data.name,
          description: response.data.description,
          isPrivate: response.data.isPrivate
        });
        this.cancelEdit();
        this.updating.set(false);
      },
      error: (err) => {
        console.error('Failed to update collection:', err);
        this.updating.set(false);
      }
    });
  }

  deleteCollection(): void {
    const collection = this.collection();
    if (!collection) return;

    if (!confirm(`Are you sure you want to delete "${collection.name}"? This cannot be undone.`)) {
      return;
    }

    this.deleting.set(true);

    this.forumService.deleteCollection(collection.id).subscribe({
      next: () => {
        this.router.navigate(['/forum/collections']);
      },
      error: (err) => {
        console.error('Failed to delete collection:', err);
        this.deleting.set(false);
      }
    });
  }

  removePost(postId: number): void {
    const collection = this.collection();
    if (!collection) return;

    if (!confirm('Remove this post from the collection?')) return;

    this.forumService.removeFromCollection(collection.id, postId).subscribe({
      next: () => {
        this.posts.update(posts => posts.filter(p => p.id !== postId));
        this.totalPosts.update(t => t - 1);
        this.collection.update(c => c ? { ...c, postCount: c.postCount - 1 } : null);
      },
      error: (err) => {
        console.error('Failed to remove post:', err);
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

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
