import { Component, inject, OnInit, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PetService,
  DailyPetTask,
  DailyTasksSummary,
  DailyTaskType,
  RewardItemCategory,
  TaskClaimResult
} from '../../services/pet.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-daily-tasks',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-tasks.component.html',
  styleUrls: ['./daily-tasks.component.scss'],
})
export class DailyTasksComponent implements OnInit {
  private petService = inject(PetService);
  private toastService = inject(ToastService);

  // Output event when reward is claimed (parent can reload inventory)
  rewardClaimed = output<TaskClaimResult>();

  tasks = signal<DailyPetTask[]>([]);
  summary = signal<DailyTasksSummary | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  claimingTaskId = signal<number | null>(null);

  // Claim result modal
  showClaimResult = signal(false);
  claimResult = signal<TaskClaimResult | null>(null);

  // Computed
  completionPercent = computed(() => {
    const s = this.summary();
    if (!s || s.totalTasks === 0) return 0;
    return Math.round((s.completedTasks / s.totalTasks) * 100);
  });

  unclaimedCount = computed(() => {
    const s = this.summary();
    if (!s) return 0;
    return s.completedTasks - s.claimedTasks;
  });

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading.set(true);
    this.error.set(null);

    this.petService.getDailyTasks().subscribe({
      next: (response) => {
        this.tasks.set(response.tasks);
        this.summary.set(response.summary);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load daily tasks:', err);
        this.error.set('Failed to load daily tasks');
        this.loading.set(false);
      }
    });
  }

  claimReward(task: DailyPetTask): void {
    if (!task.isCompleted || task.rewardClaimed) return;

    this.claimingTaskId.set(task.taskId);

    this.petService.claimTaskReward(task.taskId).subscribe({
      next: (result) => {
        this.claimingTaskId.set(null);
        if (result.success) {
          this.claimResult.set(result);
          this.showClaimResult.set(true);
          // Refresh tasks to update state
          this.loadTasks();
          // Emit event so parent can reload inventory/actions
          this.rewardClaimed.emit(result);
          // Show toast notification
          let rewardText = 'Reward claimed!';
          if (result.itemsRewarded && result.itemsRewarded.length > 0) {
            const items = result.itemsRewarded.map(i => `+${i.quantity} ${i.itemName}`).join(', ');
            rewardText = items;
          } else if (result.coinsRewarded > 0) {
            rewardText = `+${result.coinsRewarded} coins`;
          } else if (result.xpRewarded > 0) {
            rewardText = `+${result.xpRewarded} XP`;
          }
          this.toastService.success('Task Complete!', rewardText);
        } else {
          this.error.set(result.message);
          this.toastService.error('Claim Failed', result.message);
        }
      },
      error: (err) => {
        console.error('Failed to claim reward:', err);
        this.claimingTaskId.set(null);
        this.error.set('Failed to claim reward');
        this.toastService.error('Error', 'Failed to claim reward');
      }
    });
  }

  closeClaimResult(): void {
    this.showClaimResult.set(false);
    this.claimResult.set(null);
  }

  getTaskIcon(task: DailyPetTask): string {
    return task.icon || this.petService.getTaskTypeIcon(task.taskType);
  }

  getRewardIcon(category: RewardItemCategory): string {
    return this.petService.getRewardCategoryIcon(category);
  }

  getTaskTypeLabel(taskType: DailyTaskType): string {
    const labels: Record<DailyTaskType, string> = {
      exercise: 'Exercise',
      game: 'Game',
      review: 'Review',
      social: 'Social',
      streak: 'Streak',
      challenge: 'Challenge'
    };
    return labels[taskType] || taskType;
  }

  getCategoryLabel(category: RewardItemCategory): string {
    const labels: Record<RewardItemCategory, string> = {
      food: 'Food',
      toy: 'Toy',
      heart: 'Heart',
      medicine: 'Medicine',
      random: 'Random'
    };
    return labels[category] || category;
  }

  getProgressBarColor(task: DailyPetTask): string {
    if (task.rewardClaimed) return 'bg-gray-400';
    if (task.isCompleted) return 'bg-green-500';
    if (task.progressPercent >= 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  }
}
