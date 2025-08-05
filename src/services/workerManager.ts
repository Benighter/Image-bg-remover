import { updateJobProgress, completeJob } from './jobService';

export interface WorkerMessage {
  type: string;
  data: any;
}

export interface WorkerJobData {
  jobId: string;
  imageData: string; // base64 encoded image
  fileName: string;
}

export class WorkerManager {
  private worker: Worker | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.initializeWorker();
  }

  private async initializeWorker(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise((resolve, reject) => {
      try {
        // Create worker
        this.worker = new Worker('/worker.js');

        // Set up message handling
        this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
          this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (error) => {
          console.error('Worker error:', error);
          reject(error);
        };

        // Set up message handlers
        this.setupMessageHandlers(resolve, reject);

        // Initialize the worker
        this.sendMessage('init', {});

      } catch (error) {
        console.error('Failed to create worker:', error);
        reject(error);
      }
    });

    return this.initializationPromise;
  }

  private setupMessageHandlers(resolve: () => void, reject: (error: any) => void): void {
    this.messageHandlers.set('worker_ready', (data) => {
      this.isInitialized = true;
      console.log('Worker initialized successfully');
      resolve();
    });

    this.messageHandlers.set('progress_update', async (data) => {
      const { jobId, progress, stage } = data;
      if (jobId) {
        try {
          await updateJobProgress(jobId, progress, 'processing');
        } catch (error) {
          console.error('Failed to update job progress:', error);
        }
      }
    });

    this.messageHandlers.set('job_complete', async (data) => {
      const { jobId, processedImageData, fileName } = data;
      try {
        // Convert base64 to File object
        const response = await fetch(processedImageData);
        const blob = await response.blob();
        const processedFile = new File([blob], fileName, { type: 'image/png' });

        await completeJob(jobId, processedFile);
      } catch (error) {
        console.error('Failed to complete job:', error);
        await updateJobProgress(jobId, 0, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error');
      }
    });

    this.messageHandlers.set('job_failed', async (data) => {
      const { jobId, error } = data;
      if (jobId) {
        try {
          await updateJobProgress(jobId, 0, 'failed', undefined, error);
        } catch (updateError) {
          console.error('Failed to update job failure:', updateError);
        }
      } else {
        console.error('Worker initialization failed:', error);
        reject(new Error(error));
      }
    });
  }

  private handleWorkerMessage(message: WorkerMessage): void {
    const { type, data } = message;
    const handler = this.messageHandlers.get(type);
    
    if (handler) {
      handler(data);
    } else {
      console.warn('Unhandled worker message type:', type);
    }
  }

  private sendMessage(type: string, data: any): void {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    this.worker.postMessage({ type, data });
  }

  /**
   * Process an image file in the background worker
   */
  async processImage(jobId: string, file: File): Promise<void> {
    await this.initializeWorker();

    // Convert file to base64
    const imageData = await this.fileToBase64(file);

    const jobData: WorkerJobData = {
      jobId,
      imageData,
      fileName: file.name
    };

    this.sendMessage('process_image', jobData);
  }

  /**
   * Cancel a job in the worker
   */
  async cancelJob(jobId: string): Promise<void> {
    if (!this.worker) return;

    this.sendMessage('cancel_job', { jobId });
  }

  /**
   * Get worker status
   */
  async getStatus(): Promise<any> {
    if (!this.worker) return null;

    return new Promise((resolve) => {
      const handler = (data: any) => {
        this.messageHandlers.delete('get_status');
        resolve(data);
      };

      this.messageHandlers.set('get_status', handler);
      this.sendMessage('get_status', {});
    });
  }

  /**
   * Check if worker is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.initializationPromise = null;
    }
  }

  /**
   * Convert File to base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}

// Global worker manager instance
export const workerManager = new WorkerManager();

// Cleanup worker on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    workerManager.terminate();
  });
}

/**
 * Enhanced job processor that uses Web Workers
 */
export class BackgroundJobProcessor {
  private processingQueue: Array<{
    jobId: string;
    file: File;
    batchId: string;
  }> = [];
  private isProcessing = false;
  private maxConcurrentJobs = 2; // Limit concurrent jobs to prevent overwhelming

  constructor(maxConcurrentJobs = 2) {
    this.maxConcurrentJobs = maxConcurrentJobs;
  }

  /**
   * Add a job to the background processing queue
   */
  async queueJob(jobId: string, file: File, batchId: string): Promise<void> {
    this.processingQueue.push({ jobId, file, batchId });
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the job queue using Web Workers
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process jobs with limited concurrency
      const activeJobs: Promise<void>[] = [];

      while (this.processingQueue.length > 0 || activeJobs.length > 0) {
        // Start new jobs up to the limit
        while (activeJobs.length < this.maxConcurrentJobs && this.processingQueue.length > 0) {
          const job = this.processingQueue.shift();
          if (job) {
            const jobPromise = this.processJobInWorker(job);
            activeJobs.push(jobPromise);
          }
        }

        // Wait for at least one job to complete
        if (activeJobs.length > 0) {
          await Promise.race(activeJobs);
          // Remove completed jobs
          for (let i = activeJobs.length - 1; i >= 0; i--) {
            const job = activeJobs[i];
            if (await this.isPromiseResolved(job)) {
              activeJobs.splice(i, 1);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing job queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single job using the Web Worker
   */
  private async processJobInWorker(job: { jobId: string; file: File; batchId: string }): Promise<void> {
    try {
      await updateJobProgress(job.jobId, 0, 'processing');
      await workerManager.processImage(job.jobId, job.file);
    } catch (error) {
      console.error('Error processing job in worker:', error);
      await updateJobProgress(
        job.jobId, 
        0, 
        'failed', 
        undefined, 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Check if a promise is resolved (helper method)
   */
  private async isPromiseResolved(promise: Promise<any>): Promise<boolean> {
    try {
      await Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 0))
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cancel all jobs in the queue
   */
  clearQueue(): void {
    this.processingQueue = [];
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.processingQueue.length;
  }
}

// Global background processor instance
export const backgroundProcessor = new BackgroundJobProcessor();
