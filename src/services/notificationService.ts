import { JobStatus } from '../types';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  actions?: NotificationAction[];
  data?: any;
}

export interface InAppNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
  duration?: number; // Auto-dismiss after this many ms
  persistent?: boolean; // Don't auto-dismiss
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private inAppNotifications: InAppNotification[] = [];
  private listeners: Array<(notifications: InAppNotification[]) => void> = [];
  private notificationId = 0;

  constructor() {
    this.checkPermission();
  }

  /**
   * Check current notification permission
   */
  private checkPermission(): void {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }

    return this.permission;
  }

  /**
   * Show a browser notification
   */
  async showBrowserNotification(options: NotificationOptions): Promise<Notification | null> {
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        data: options.data
      });

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Custom click handler from data
        if (options.data?.onClick) {
          options.data.onClick();
        }
      };

      return notification;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return null;
    }
  }

  /**
   * Show an in-app notification
   */
  showInAppNotification(notification: Omit<InAppNotification, 'id' | 'timestamp'>): string {
    const id = `notification-${++this.notificationId}`;
    const newNotification: InAppNotification = {
      ...notification,
      id,
      timestamp: Date.now()
    };

    this.inAppNotifications.unshift(newNotification);
    this.notifyListeners();

    // Auto-dismiss after duration (default 5 seconds)
    if (!notification.persistent) {
      const duration = notification.duration || 5000;
      setTimeout(() => {
        this.dismissInAppNotification(id);
      }, duration);
    }

    return id;
  }

  /**
   * Dismiss an in-app notification
   */
  dismissInAppNotification(id: string): void {
    this.inAppNotifications = this.inAppNotifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  /**
   * Clear all in-app notifications
   */
  clearAllInAppNotifications(): void {
    this.inAppNotifications = [];
    this.notifyListeners();
  }

  /**
   * Get all in-app notifications
   */
  getInAppNotifications(): InAppNotification[] {
    return [...this.inAppNotifications];
  }

  /**
   * Subscribe to in-app notification changes
   */
  subscribeToInAppNotifications(callback: (notifications: InAppNotification[]) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify all listeners of notification changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener([...this.inAppNotifications]);
    });
  }

  /**
   * Show job completion notification
   */
  async notifyJobComplete(fileName: string, jobId: string): Promise<void> {
    // Browser notification
    await this.showBrowserNotification({
      title: 'Background Removal Complete',
      body: `${fileName} has been processed successfully`,
      tag: `job-complete-${jobId}`,
      data: {
        jobId,
        onClick: () => {
          // Could navigate to results or open job queue
          console.log('Job complete notification clicked:', jobId);
        }
      }
    });

    // In-app notification
    this.showInAppNotification({
      type: 'success',
      title: 'Processing Complete',
      message: `${fileName} has been processed successfully`,
      actions: [
        {
          label: 'View Result',
          action: () => {
            // Could open the result or navigate to it
            console.log('View result clicked for job:', jobId);
          }
        }
      ]
    });
  }

  /**
   * Show job failure notification
   */
  async notifyJobFailed(fileName: string, error: string, jobId: string): Promise<void> {
    // Browser notification
    await this.showBrowserNotification({
      title: 'Background Removal Failed',
      body: `Failed to process ${fileName}: ${error}`,
      tag: `job-failed-${jobId}`,
      requireInteraction: true,
      data: {
        jobId,
        onClick: () => {
          console.log('Job failed notification clicked:', jobId);
        }
      }
    });

    // In-app notification
    this.showInAppNotification({
      type: 'error',
      title: 'Processing Failed',
      message: `Failed to process ${fileName}: ${error}`,
      persistent: true,
      actions: [
        {
          label: 'Retry',
          action: () => {
            // Could trigger job retry
            console.log('Retry clicked for job:', jobId);
          }
        },
        {
          label: 'Dismiss',
          action: () => {
            // Dismiss handled automatically
          }
        }
      ]
    });
  }

  /**
   * Show batch completion notification
   */
  async notifyBatchComplete(batchName: string, completedCount: number, totalCount: number, batchId: string): Promise<void> {
    const allSuccessful = completedCount === totalCount;
    const title = allSuccessful ? 'Batch Processing Complete' : 'Batch Processing Finished';
    const body = allSuccessful 
      ? `All ${totalCount} images in "${batchName}" have been processed successfully`
      : `${completedCount} of ${totalCount} images in "${batchName}" were processed successfully`;

    // Browser notification
    await this.showBrowserNotification({
      title,
      body,
      tag: `batch-complete-${batchId}`,
      data: {
        batchId,
        onClick: () => {
          console.log('Batch complete notification clicked:', batchId);
        }
      }
    });

    // In-app notification
    this.showInAppNotification({
      type: allSuccessful ? 'success' : 'warning',
      title,
      message: body,
      actions: [
        {
          label: 'View Results',
          action: () => {
            console.log('View batch results clicked:', batchId);
          }
        }
      ]
    });
  }

  /**
   * Show progress notification for long-running operations
   */
  showProgressNotification(title: string, message: string, progress: number): string {
    return this.showInAppNotification({
      type: 'info',
      title,
      message: `${message} (${Math.round(progress)}%)`,
      persistent: true
    });
  }

  /**
   * Update a progress notification
   */
  updateProgressNotification(id: string, message: string, progress: number): void {
    const notification = this.inAppNotifications.find(n => n.id === id);
    if (notification) {
      notification.message = `${message} (${Math.round(progress)}%)`;
      this.notifyListeners();
    }
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }

  /**
   * Check if browser notifications are supported
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }
}

// Global notification service instance
export const notificationService = new NotificationService();

// Convenience functions
export const requestNotificationPermission = () => notificationService.requestPermission();
export const showBrowserNotification = (options: NotificationOptions) => notificationService.showBrowserNotification(options);
export const showInAppNotification = (notification: Omit<InAppNotification, 'id' | 'timestamp'>) => notificationService.showInAppNotification(notification);
export const dismissInAppNotification = (id: string) => notificationService.dismissInAppNotification(id);
export const subscribeToInAppNotifications = (callback: (notifications: InAppNotification[]) => void) => notificationService.subscribeToInAppNotifications(callback);

// Job-specific notification helpers
export const notifyJobComplete = (fileName: string, jobId: string) => notificationService.notifyJobComplete(fileName, jobId);
export const notifyJobFailed = (fileName: string, error: string, jobId: string) => notificationService.notifyJobFailed(fileName, error, jobId);
export const notifyBatchComplete = (batchName: string, completedCount: number, totalCount: number, batchId: string) => notificationService.notifyBatchComplete(batchName, completedCount, totalCount, batchId);
