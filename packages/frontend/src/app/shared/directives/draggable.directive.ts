import {
  Directive,
  ElementRef,
  inject,
  input,
  output,
  signal,
  OnInit,
  OnDestroy,
  Renderer2,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface DraggablePosition {
  x: number;
  y: number;
}

@Directive({
  selector: '[appDraggable]',
  standalone: true,
})
export class DraggableDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private platformId = inject(PLATFORM_ID);

  // Inputs
  /** Unique key for saving position to localStorage */
  storageKey = input<string>('');
  /** Whether dragging is enabled */
  enabled = input<boolean>(true);
  /** Selector for the drag handle (if not provided, entire element is draggable) */
  dragHandle = input<string>('');
  /** Boundary constraints: 'viewport' | 'none' */
  boundary = input<'viewport' | 'none'>('viewport');
  /** Initial position */
  initialPosition = input<DraggablePosition | null>(null);

  // Outputs
  positionChange = output<DraggablePosition>();
  dragStart = output<void>();
  dragEnd = output<void>();

  // State
  private isDragging = signal(false);
  private hasMoved = false; // Track if actually moved (not just clicked)
  private startX = 0;
  private startY = 0;
  private initialLeft = 0;
  private initialTop = 0;
  private handleElement: HTMLElement | null = null;

  // Bound event handlers
  private boundMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundMouseUp: ((e: MouseEvent) => void) | null = null;
  private boundTouchMove: ((e: TouchEvent) => void) | null = null;
  private boundTouchEnd: ((e: TouchEvent) => void) | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const element = this.el.nativeElement as HTMLElement;

    // Load saved position
    this.loadPosition();

    // Find drag handle or use element itself
    const handleSelector = this.dragHandle();
    if (handleSelector) {
      this.handleElement = element.querySelector(handleSelector);
    }
    const dragTarget = this.handleElement || element;

    // Set cursor style on handle
    this.renderer.setStyle(dragTarget, 'cursor', 'grab');

    // Bind event handlers
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundTouchMove = this.onTouchMove.bind(this);
    this.boundTouchEnd = this.onTouchEnd.bind(this);

    // Add mousedown/touchstart listeners to handle
    dragTarget.addEventListener('mousedown', this.onMouseDown.bind(this));
    dragTarget.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.removeGlobalListeners();
  }

  private onMouseDown(e: MouseEvent): void {
    if (!this.enabled()) return;

    // Ignore if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (this.isInteractiveElement(target)) return;

    e.preventDefault();
    this.startDrag(e.clientX, e.clientY);
  }

  private onTouchStart(e: TouchEvent): void {
    if (!this.enabled()) return;

    const target = e.target as HTMLElement;
    if (this.isInteractiveElement(target)) return;

    const touch = e.touches[0];
    this.startDrag(touch.clientX, touch.clientY);
  }

  private startDrag(clientX: number, clientY: number): void {
    this.isDragging.set(true);
    this.hasMoved = false; // Reset move tracker
    this.dragStart.emit();

    const element = this.el.nativeElement as HTMLElement;
    const rect = element.getBoundingClientRect();

    this.startX = clientX;
    this.startY = clientY;
    this.initialLeft = rect.left;
    this.initialTop = rect.top;

    // Change cursor
    const handleSelector = this.dragHandle();
    const dragTarget = handleSelector ? element.querySelector(handleSelector) : element;
    if (dragTarget) {
      this.renderer.setStyle(dragTarget, 'cursor', 'grabbing');
    }

    // Convert to absolute positioning if not already
    this.renderer.setStyle(element, 'position', 'fixed');
    this.renderer.setStyle(element, 'left', `${rect.left}px`);
    this.renderer.setStyle(element, 'top', `${rect.top}px`);
    this.renderer.setStyle(element, 'right', 'auto');
    this.renderer.setStyle(element, 'bottom', 'auto');

    // Add global listeners
    document.addEventListener('mousemove', this.boundMouseMove!);
    document.addEventListener('mouseup', this.boundMouseUp!);
    document.addEventListener('touchmove', this.boundTouchMove!, { passive: false });
    document.addEventListener('touchend', this.boundTouchEnd!);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging()) return;
    e.preventDefault();
    this.updatePosition(e.clientX, e.clientY);
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging()) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.updatePosition(touch.clientX, touch.clientY);
  }

  private updatePosition(clientX: number, clientY: number): void {
    const element = this.el.nativeElement as HTMLElement;
    const deltaX = clientX - this.startX;
    const deltaY = clientY - this.startY;

    // Mark as moved if moved more than 5px (threshold to distinguish from click)
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      this.hasMoved = true;
    }

    let newLeft = this.initialLeft + deltaX;
    let newTop = this.initialTop + deltaY;

    // Apply boundary constraints
    if (this.boundary() === 'viewport') {
      const rect = element.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Keep at least 50px visible
      const minVisible = 50;
      newLeft = Math.max(-rect.width + minVisible, Math.min(viewportWidth - minVisible, newLeft));
      newTop = Math.max(0, Math.min(viewportHeight - minVisible, newTop));
    }

    this.renderer.setStyle(element, 'left', `${newLeft}px`);
    this.renderer.setStyle(element, 'top', `${newTop}px`);
  }

  private onMouseUp(e: MouseEvent): void {
    this.endDrag();
  }

  private onTouchEnd(e: TouchEvent): void {
    this.endDrag();
  }

  private endDrag(): void {
    if (!this.isDragging()) return;

    const wasMoved = this.hasMoved;
    this.isDragging.set(false);
    this.removeGlobalListeners();

    const element = this.el.nativeElement as HTMLElement;

    // Restore cursor
    const handleSelector = this.dragHandle();
    const dragTarget = handleSelector ? element.querySelector(handleSelector) : element;
    if (dragTarget) {
      this.renderer.setStyle(dragTarget, 'cursor', 'grab');
    }

    // If actually moved, save position and prevent click
    if (wasMoved) {
      const rect = element.getBoundingClientRect();
      const position: DraggablePosition = { x: rect.left, y: rect.top };
      this.savePosition(position);
      this.positionChange.emit(position);

      // Prevent the click event that would fire after mouseup
      const preventClick = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
      };
      element.addEventListener('click', preventClick, { capture: true, once: true });
    }

    this.dragEnd.emit();
  }

  private removeGlobalListeners(): void {
    if (this.boundMouseMove) {
      document.removeEventListener('mousemove', this.boundMouseMove);
    }
    if (this.boundMouseUp) {
      document.removeEventListener('mouseup', this.boundMouseUp);
    }
    if (this.boundTouchMove) {
      document.removeEventListener('touchmove', this.boundTouchMove);
    }
    if (this.boundTouchEnd) {
      document.removeEventListener('touchend', this.boundTouchEnd);
    }
  }

  private isInteractiveElement(target: HTMLElement): boolean {
    // If target IS the drag handle or element itself, allow dragging
    const element = this.el.nativeElement as HTMLElement;
    const handleSelector = this.dragHandle();
    const dragTarget = handleSelector ? element.querySelector(handleSelector) : element;

    // If clicking directly on the drag target, allow it
    if (target === dragTarget || target === element) {
      return false;
    }

    // Check if target is inside an interactive element that's NOT the drag target
    const interactiveSelectors = ['a', 'input', 'textarea', 'select'];

    // For buttons, only block if it's a child button, not the drag target itself
    const closestButton = target.closest('button');
    if (closestButton && closestButton !== element && closestButton !== dragTarget) {
      return true;
    }

    return interactiveSelectors.some(selector => {
      const closest = target.closest(selector);
      return closest !== null && closest !== element && closest !== dragTarget;
    });
  }

  private savePosition(position: DraggablePosition): void {
    const key = this.storageKey();
    if (!key) return;
    try {
      localStorage.setItem(`draggable_${key}`, JSON.stringify(position));
    } catch {
      // localStorage not available
    }
  }

  private loadPosition(): void {
    const key = this.storageKey();
    if (!key) return;

    try {
      const saved = localStorage.getItem(`draggable_${key}`);
      if (saved) {
        const position: DraggablePosition = JSON.parse(saved);
        const element = this.el.nativeElement as HTMLElement;

        // Validate position is within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (position.x >= 0 && position.x < viewportWidth &&
            position.y >= 0 && position.y < viewportHeight) {
          this.renderer.setStyle(element, 'position', 'fixed');
          this.renderer.setStyle(element, 'left', `${position.x}px`);
          this.renderer.setStyle(element, 'top', `${position.y}px`);
          this.renderer.setStyle(element, 'right', 'auto');
          this.renderer.setStyle(element, 'bottom', 'auto');
        }
      }
    } catch {
      // Invalid saved position
    }
  }

  /** Reset position to default (clear saved position) */
  resetPosition(): void {
    const key = this.storageKey();
    if (key) {
      try {
        localStorage.removeItem(`draggable_${key}`);
      } catch {
        // localStorage not available
      }
    }
    // Position will reset on next page load
  }
}
