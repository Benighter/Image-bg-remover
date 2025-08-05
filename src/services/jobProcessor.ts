import { processImage, ProcessingProgressCallback } from '../../../lib/process';
import { saveImageToHistory } from './historyService';
import {
  createJobBatch,
  createProcessingJob,
  updateJobProgress,
  completeJob,
  jobEventEmitter
} from './jobService';

export interface JobProcessorOptions {
  enableNotifications?: boolean;
  batchName?: string;
}

/**
 * Process a single file with job tracking
 */
export async function processFileWithJob(
  file: File,
  batchId?: string,
  options: JobProcessorOptions = {}
): Promise<{ jobId: string; processedFile?: File; historyId?: number }> {
  // Create batch if not provided
  const finalBatchId = batchId || await createJobBatch(options.batchName);
  
  // Create job
  const jobId = await createProcessingJob(file, finalBatchId);

  try {
    // Update job status to processing
    await updateJobProgress(jobId, 0, 'processing');

    // Create progress callback
    const progressCallback: ProcessingProgressCallback = async (progress, stage) => {
      // Estimate time remaining based on progress
      const startTime = Date.now();
      let estimatedTimeRemaining: number | undefined;
      
      if (progress > 5) {
        const elapsedTime = Date.now() - startTime;
        const estimatedTotalTime = (elapsedTime / progress) * 100;
        estimatedTimeRemaining = Math.max(0, estimatedTotalTime - elapsedTime);
      }

      await updateJobProgress(jobId, progress, 'processing', estimatedTimeRemaining);
    };

    // Process the image
    const processedFile = await processImage(file, progressCallback);

    // Save to history
    const historyId = await saveImageToHistory(file, processedFile);

    // Mark job as completed
    await completeJob(jobId, processedFile, historyId);

    // Send notification if enabled
    if (options.enableNotifications && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Background Removal Complete', {
          body: `${file.name} has been processed successfully`,
          icon: '/favicon.ico'
        });
      }
    }

    return { jobId, processedFile, historyId };
  } catch (error) {
    // Mark job as failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateJobProgress(jobId, 0, 'failed', undefined, errorMessage);

    // Send error notification if enabled
    if (options.enableNotifications && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Background Removal Failed', {
          body: `Failed to process ${file.name}: ${errorMessage}`,
          icon: '/favicon.ico'
        });
      }
    }

    throw error;
  }
}

/**
 * Process multiple files with job tracking
 */
export async function processFilesWithJobs(
  files: File[],
  options: JobProcessorOptions = {}
): Promise<Array<{ jobId: string; processedFile?: File; historyId?: number; error?: string }>> {
  // Create batch for all files
  const batchId = await createJobBatch(
    options.batchName || `Batch of ${files.length} images`
  );

  const results: Array<{ jobId: string; processedFile?: File; historyId?: number; error?: string }> = [];

  // Process files sequentially to avoid overwhelming the system
  for (const file of files) {
    try {
      const result = await processFileWithJob(file, batchId, options);
      results.push(result);
    } catch (error) {
      const jobId = await createProcessingJob(file, batchId);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await updateJobProgress(jobId, 0, 'failed', undefined, errorMessage);
      
      results.push({
        jobId,
        error: errorMessage
      });
    }
  }

  return results;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'default') {
    return await Notification.requestPermission();
  }

  return Notification.permission;
}

/**
 * Background job processor that can run in a Web Worker context
 */
export class BackgroundJobProcessor {
  private isProcessing = false;
  private processingQueue: Array<{
    file: File;
    batchId: string;
    jobId: string;
    options: JobProcessorOptions;
  }> = [];

  constructor(private maxConcurrentJobs = 1) {}

  /**
   * Add a job to the processing queue
   */
  async queueJob(
    file: File,
    batchId?: string,
    options: JobProcessorOptions = {}
  ): Promise<string> {
    const finalBatchId = batchId || await createJobBatch(options.batchName);
    const jobId = await createProcessingJob(file, finalBatchId);

    this.processingQueue.push({
      file,
      batchId: finalBatchId,
      jobId,
      options
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return jobId;
  }

  /**
   * Process the job queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const job = this.processingQueue.shift();
      if (!job) continue;

      try {
        await this.processJob(job);
      } catch (error) {
        console.error('Error processing job:', error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process a single job
   */
  private async processJob(job: {
    file: File;
    batchId: string;
    jobId: string;
    options: JobProcessorOptions;
  }): Promise<void> {
    const { file, jobId, options } = job;

    try {
      // Update job status to processing
      await updateJobProgress(jobId, 0, 'processing');

      // Create progress callback
      const progressCallback: ProcessingProgressCallback = async (progress, stage) => {
        await updateJobProgress(jobId, progress, 'processing');
      };

      // Process the image
      const processedFile = await processImage(file, progressCallback);

      // Save to history
      const historyId = await saveImageToHistory(file, processedFile);

      // Mark job as completed
      await completeJob(jobId, processedFile, historyId);

      // Send notification if enabled
      if (options.enableNotifications && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Background Removal Complete', {
            body: `${file.name} has been processed successfully`,
            icon: '/favicon.ico'
          });
        }
      }
    } catch (error) {
      // Mark job as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await updateJobProgress(jobId, 0, 'failed', undefined, errorMessage);

      // Send error notification if enabled
      if (options.enableNotifications && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Background Removal Failed', {
            body: `Failed to process ${file.name}: ${errorMessage}`,
            icon: '/favicon.ico'
          });
        }
      }

      throw error;
    }
  }

  /**
   * Get the current queue length
   */
  getQueueLength(): number {
    return this.processingQueue.length;
  }

  /**
   * Clear the processing queue
   */
  clearQueue(): void {
    this.processingQueue = [];
  }

  /**
   * Check if processor is currently processing
   */
  getIsProcessing(): boolean {
    return this.isProcessing;
  }
}

// Global background processor instance
export const backgroundJobProcessor = new BackgroundJobProcessor();
