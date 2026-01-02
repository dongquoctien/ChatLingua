import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CategoryInfo, TagInfo, ForumService } from '../../services/forum.service';

@Component({
  selector: 'app-category-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './category-sidebar.component.html',
  styleUrls: ['./category-sidebar.component.scss']
})
export class CategorySidebarComponent implements OnInit {
  @Input() selectedCategory: string | null = null;
  @Input() selectedTag: string | null = null;
  @Output() categorySelect = new EventEmitter<string | null>();
  @Output() tagSelect = new EventEmitter<string | null>();

  private readonly forumService = inject(ForumService);

  categories = signal<CategoryInfo[]>([]);
  popularTags = signal<TagInfo[]>([]);
  loading = signal(true);
  showAllTags = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.forumService.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });

    this.forumService.getPopularTags(20).subscribe({
      next: (tags) => {
        this.popularTags.set(tags);
      }
    });
  }

  onCategoryClick(slug: string | null): void {
    this.categorySelect.emit(slug);
  }

  onTagClick(slug: string): void {
    this.tagSelect.emit(this.selectedTag === slug ? null : slug);
  }

  toggleShowAllTags(): void {
    this.showAllTags.update(v => !v);
  }

  get displayedTags(): TagInfo[] {
    const tags = this.popularTags();
    return this.showAllTags() ? tags : tags.slice(0, 10);
  }
}
