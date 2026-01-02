import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft,
  faSpinner,
  faFolder,
  faFolderOpen,
  faPlus,
  faLock,
  faGlobe,
  faEllipsisV,
  faEdit,
  faTrash,
  faTimes,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import { ForumService, CollectionPreview } from '../../services/forum.service';

@Component({
  selector: 'app-collections',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, FontAwesomeModule],
  templateUrl: './collections.component.html',
  styleUrls: ['./collections.component.scss']
})
export class CollectionsComponent implements OnInit {
  private readonly forumService = inject(ForumService);

  faArrowLeft = faArrowLeft;
  faSpinner = faSpinner;
  faFolder = faFolder;
  faFolderOpen = faFolderOpen;
  faPlus = faPlus;
  faLock = faLock;
  faGlobe = faGlobe;
  faEllipsisV = faEllipsisV;
  faEdit = faEdit;
  faTrash = faTrash;
  faTimes = faTimes;
  faCheck = faCheck;

  collections = signal<CollectionPreview[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Create form
  showCreateForm = signal(false);
  creating = signal(false);
  newCollectionName = '';
  newCollectionDescription = '';
  newCollectionPrivate = false;

  // Edit form
  editingId = signal<number | null>(null);
  editName = '';
  editDescription = '';
  editPrivate = false;
  updating = signal(false);

  // Menu
  activeMenuId = signal<number | null>(null);
  deleting = signal<number | null>(null);

  ngOnInit(): void {
    this.loadCollections();
  }

  loadCollections(): void {
    this.loading.set(true);
    this.error.set(null);

    this.forumService.getMyCollections().subscribe({
      next: (collections) => {
        this.collections.set(collections);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load collections');
        this.loading.set(false);
      }
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm.update(v => !v);
    if (!this.showCreateForm()) {
      this.resetCreateForm();
    }
  }

  resetCreateForm(): void {
    this.newCollectionName = '';
    this.newCollectionDescription = '';
    this.newCollectionPrivate = false;
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
        this.collections.update(collections => [response.data, ...collections]);
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

  toggleMenu(collectionId: number): void {
    this.activeMenuId.update(id => id === collectionId ? null : collectionId);
  }

  startEdit(collection: CollectionPreview): void {
    this.editingId.set(collection.id);
    this.editName = collection.name;
    this.editDescription = collection.description || '';
    this.editPrivate = collection.isPrivate;
    this.activeMenuId.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editName = '';
    this.editDescription = '';
    this.editPrivate = false;
  }

  saveEdit(collection: CollectionPreview): void {
    if (!this.editName.trim() || this.updating()) return;

    this.updating.set(true);

    this.forumService.updateCollection(collection.id, {
      name: this.editName.trim(),
      description: this.editDescription.trim() || undefined,
      isPrivate: this.editPrivate
    }).subscribe({
      next: (response) => {
        this.collections.update(collections =>
          collections.map(c => c.id === collection.id ? response.data : c)
        );
        this.cancelEdit();
        this.updating.set(false);
      },
      error: (err) => {
        console.error('Failed to update collection:', err);
        this.updating.set(false);
      }
    });
  }

  deleteCollection(collection: CollectionPreview): void {
    if (!confirm(`Are you sure you want to delete "${collection.name}"? This cannot be undone.`)) {
      return;
    }

    this.deleting.set(collection.id);
    this.activeMenuId.set(null);

    this.forumService.deleteCollection(collection.id).subscribe({
      next: () => {
        this.collections.update(collections =>
          collections.filter(c => c.id !== collection.id)
        );
        this.deleting.set(null);
      },
      error: (err) => {
        console.error('Failed to delete collection:', err);
        this.deleting.set(null);
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
