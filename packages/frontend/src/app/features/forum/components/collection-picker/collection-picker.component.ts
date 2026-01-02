import { Component, Input, Output, EventEmitter, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTimes,
  faFolder,
  faFolderOpen,
  faPlus,
  faCheck,
  faSpinner,
  faLock,
  faGlobe
} from '@fortawesome/free-solid-svg-icons';
import { ForumService } from '../../services/forum.service';

export interface CollectionInfo {
  id: number;
  name: string;
  description?: string;
  isPrivate: boolean;
  postCount: number;
  hasPost?: boolean; // Whether the current post is in this collection
}

@Component({
  selector: 'app-collection-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './collection-picker.component.html',
  styleUrls: ['./collection-picker.component.scss']
})
export class CollectionPickerComponent implements OnInit {
  @Input() isOpen = false;
  @Input() postId = 0;

  @Output() close = new EventEmitter<void>();
  @Output() collectionSelected = new EventEmitter<{ collectionId: number; added: boolean }>();
  @Output() collectionCreated = new EventEmitter<CollectionInfo>();

  private readonly forumService = inject(ForumService);

  faTimes = faTimes;
  faFolder = faFolder;
  faFolderOpen = faFolderOpen;
  faPlus = faPlus;
  faCheck = faCheck;
  faSpinner = faSpinner;
  faLock = faLock;
  faGlobe = faGlobe;

  collections = signal<CollectionInfo[]>([]);
  loading = signal(false);
  showCreateForm = signal(false);
  creating = signal(false);
  toggling = signal<number | null>(null);

  newCollectionName = '';
  newCollectionDescription = '';
  newCollectionPrivate = false;

  ngOnInit(): void {
    if (this.isOpen) {
      this.loadCollections();
    }
  }

  loadCollections(): void {
    this.loading.set(true);
    this.forumService.getMyCollections().subscribe({
      next: (response) => {
        // Map API response to CollectionInfo format
        const collections: CollectionInfo[] = response.map((c: { id: number; name: string; description?: string; isPrivate: boolean; postCount: number }) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          isPrivate: c.isPrivate,
          postCount: c.postCount,
          hasPost: false // Will be updated when checking if post is in collection
        }));
        this.collections.set(collections);
        this.loading.set(false);

        // Check which collections contain the post
        if (this.postId) {
          this.checkPostInCollections();
        }
      },
      error: (err) => {
        console.error('Failed to load collections:', err);
        this.loading.set(false);
      }
    });
  }

  checkPostInCollections(): void {
    // For each collection, check if the post is in it
    // This would ideally be done in a single API call
    this.collections().forEach(collection => {
      this.forumService.getCollectionPosts(collection.id).subscribe({
        next: (response) => {
          const hasPost = response.data.some(p => p.id === this.postId);
          this.collections.update(collections =>
            collections.map(c =>
              c.id === collection.id ? { ...c, hasPost } : c
            )
          );
        },
        error: () => {
          // Ignore errors for individual checks
        }
      });
    });
  }

  toggleCollection(collection: CollectionInfo): void {
    if (this.toggling() !== null) return;

    this.toggling.set(collection.id);

    if (collection.hasPost) {
      this.forumService.removeFromCollection(collection.id, this.postId).subscribe({
        next: () => {
          this.collections.update(collections =>
            collections.map(c =>
              c.id === collection.id
                ? { ...c, hasPost: false, postCount: c.postCount - 1 }
                : c
            )
          );
          this.collectionSelected.emit({ collectionId: collection.id, added: false });
          this.toggling.set(null);
        },
        error: (err) => {
          console.error('Failed to remove from collection:', err);
          this.toggling.set(null);
        }
      });
    } else {
      this.forumService.addToCollection(collection.id, this.postId).subscribe({
        next: () => {
          this.collections.update(collections =>
            collections.map(c =>
              c.id === collection.id
                ? { ...c, hasPost: true, postCount: c.postCount + 1 }
                : c
            )
          );
          this.collectionSelected.emit({ collectionId: collection.id, added: true });
          this.toggling.set(null);
        },
        error: (err) => {
          console.error('Failed to add to collection:', err);
          this.toggling.set(null);
        }
      });
    }
  }

  toggleCreateForm(): void {
    this.showCreateForm.update(v => !v);
    if (!this.showCreateForm()) {
      this.resetCreateForm();
    }
  }

  createCollection(): void {
    if (!this.newCollectionName.trim() || this.creating()) return;

    this.creating.set(true);

    this.forumService.createCollection({
      name: this.newCollectionName.trim(),
      description: this.newCollectionDescription.trim() || undefined,
      isPrivate: this.newCollectionPrivate
    }).subscribe({
      next: (response) => {
        const newCollection: CollectionInfo = {
          id: response.data.id,
          name: response.data.name,
          description: response.data.description,
          isPrivate: response.data.isPrivate,
          postCount: 0,
          hasPost: false
        };

        this.collections.update(collections => [...collections, newCollection]);
        this.collectionCreated.emit(newCollection);
        this.resetCreateForm();
        this.showCreateForm.set(false);
        this.creating.set(false);
      },
      error: (err) => {
        console.error('Failed to create collection:', err);
        this.creating.set(false);
      }
    });
  }

  resetCreateForm(): void {
    this.newCollectionName = '';
    this.newCollectionDescription = '';
    this.newCollectionPrivate = false;
  }

  onClose(): void {
    this.showCreateForm.set(false);
    this.resetCreateForm();
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.onClose();
    }
  }
}
