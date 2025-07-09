import { db } from '../db';
import { ProcessingJob, JobBatch, JobStatus, JobProgressUpdate, BatchProgressUpdate } from '../types';

// Event emitter for real-time updates
class JobEventEmitter extends EventTarget {
  emitJobUpdate(update: JobProgressUpdate) {
    this.dispatchEvent(new CustomEvent('jobUpdate', { detail: update }));
  }

  emitBatchUpdate(update: BatchProgressUpdate) {
    this.dispatchEvent(new CustomEvent('batchUpdate', { detail: update }));
  }

  onJobUpdate(callback: (update: JobProgressUpdate) => void) {
    this.addEventListener('jobUpdate', (event) => {
      callback((event as CustomEvent<JobProgressUpdate>).detail);
    });
  }

  onBatchUpdate(callback: (update: BatchProgressUpdate) => void) {
    this.addEventListener('batchUpdate', (event) => {
      callback((event as CustomEvent<BatchProgressUpdate>).detail);
    });
  }
}

export const jobEventEmitter = new JobEventEmitter();

/**
 * Generate a unique ID for jobs and batches
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new job batch
 */
export async function createJobBatch(name?: string): Promise<string> {
  const batchId = generateId();
  const batch: JobBatch = {
    id: batchId,
    name: name || `Batch ${new Date().toLocaleTimeString()}`,
    status: 'pending',
    progress: 0,
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    startTime: Date.now()
  };

  await db.jobBatches.add(batch);
  return batchId;
}

/**
 * Create a new processing job
 */
export async function createProcessingJob(
  file: File,
  batchId: string
): Promise<string> {
  const jobId = generateId();
  const job: ProcessingJob = {
    id: jobId,
    batchId,
    fileName: file.name,
    fileSize: file.size,
    status: 'pending',
    progress: 0,
    startTime: Date.now(),
    originalFile: file
  };

  await db.processingJobs.add(job);
  
  // Update batch total jobs count
  const batch = await db.jobBatches.get(batchId);
  if (batch) {
    await db.jobBatches.update(batchId, {
      totalJobs: batch.totalJobs + 1
    });
  }

  return jobId;
}

/**
 * Update job progress
 */
export async function updateJobProgress(
  jobId: string,
  progress: number,
  status?: JobStatus,
  estimatedTimeRemaining?: number,
  error?: string
): Promise<void> {
  const updateData: Partial<ProcessingJob> = {
    progress: Math.max(0, Math.min(100, progress))
  };

  if (status) {
    updateData.status = status;
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updateData.endTime = Date.now();
    }
  }

  if (estimatedTimeRemaining !== undefined) {
    updateData.estimatedTimeRemaining = estimatedTimeRemaining;
  }

  if (error) {
    updateData.error = error;
    updateData.status = 'failed';
  }

  await db.processingJobs.update(jobId, updateData);

  // Get updated job for event emission
  const job = await db.processingJobs.get(jobId);
  if (job) {
    // Emit job update event
    jobEventEmitter.emitJobUpdate({
      jobId,
      progress: job.progress,
      status: job.status,
      estimatedTimeRemaining: job.estimatedTimeRemaining,
      error: job.error
    });

    // Update batch progress
    await updateBatchProgress(job.batchId);
  }
}

/**
 * Update batch progress based on its jobs
 */
export async function updateBatchProgress(batchId: string): Promise<void> {
  const jobs = await db.processingJobs.where('batchId').equals(batchId).toArray();
  const batch = await db.jobBatches.get(batchId);
  
  if (!batch || jobs.length === 0) return;

  const completedJobs = jobs.filter(job => job.status === 'completed').length;
  const failedJobs = jobs.filter(job => job.status === 'failed').length;
  const processingJobs = jobs.filter(job => job.status === 'processing').length;
  
  // Calculate overall progress
  const totalProgress = jobs.reduce((sum, job) => sum + job.progress, 0);
  const averageProgress = totalProgress / jobs.length;

  // Determine batch status
  let batchStatus: JobStatus = 'pending';
  if (processingJobs > 0) {
    batchStatus = 'processing';
  } else if (completedJobs === jobs.length) {
    batchStatus = 'completed';
  } else if (failedJobs === jobs.length) {
    batchStatus = 'failed';
  } else if (completedJobs + failedJobs === jobs.length) {
    batchStatus = 'completed'; // Some completed, some failed
  }

  // Calculate estimated time remaining
  let estimatedTimeRemaining: number | undefined;
  if (batchStatus === 'processing') {
    const processingJobsWithETA = jobs.filter(job => 
      job.status === 'processing' && job.estimatedTimeRemaining
    );
    if (processingJobsWithETA.length > 0) {
      estimatedTimeRemaining = Math.max(
        ...processingJobsWithETA.map(job => job.estimatedTimeRemaining!)
      );
    }
  }

  const updateData: Partial<JobBatch> = {
    progress: averageProgress,
    status: batchStatus,
    completedJobs,
    failedJobs,
    estimatedTimeRemaining
  };

  if (batchStatus === 'completed' || batchStatus === 'failed') {
    updateData.endTime = Date.now();
  }

  await db.jobBatches.update(batchId, updateData);

  // Emit batch update event
  jobEventEmitter.emitBatchUpdate({
    batchId,
    progress: averageProgress,
    status: batchStatus,
    completedJobs,
    failedJobs,
    estimatedTimeRemaining
  });
}

/**
 * Get all active batches (not completed/failed/cancelled)
 */
export async function getActiveBatches(): Promise<JobBatch[]> {
  return await db.jobBatches
    .where('status')
    .anyOf(['pending', 'processing'])
    .reverse()
    .sortBy('startTime');
}

/**
 * Get all batches (including completed ones)
 */
export async function getAllBatches(): Promise<JobBatch[]> {
  return await db.jobBatches.orderBy('startTime').reverse().toArray();
}

/**
 * Get jobs for a specific batch
 */
export async function getJobsForBatch(batchId: string): Promise<ProcessingJob[]> {
  return await db.processingJobs
    .where('batchId')
    .equals(batchId)
    .sortBy('startTime');
}

/**
 * Get all active jobs across all batches
 */
export async function getActiveJobs(): Promise<ProcessingJob[]> {
  return await db.processingJobs
    .where('status')
    .anyOf(['pending', 'processing'])
    .sortBy('startTime');
}

/**
 * Cancel a specific job
 */
export async function cancelJob(jobId: string): Promise<void> {
  await updateJobProgress(jobId, 0, 'cancelled');
}

/**
 * Cancel all jobs in a batch
 */
export async function cancelBatch(batchId: string): Promise<void> {
  const jobs = await getJobsForBatch(batchId);
  const activeJobs = jobs.filter(job => 
    job.status === 'pending' || job.status === 'processing'
  );

  for (const job of activeJobs) {
    await cancelJob(job.id);
  }
}

/**
 * Mark job as completed with processed file
 */
export async function completeJob(
  jobId: string,
  processedFile: File,
  historyId?: number
): Promise<void> {
  await db.processingJobs.update(jobId, {
    processedFile,
    historyId,
    status: 'completed',
    progress: 100,
    endTime: Date.now()
  });

  const job = await db.processingJobs.get(jobId);
  if (job) {
    await updateBatchProgress(job.batchId);
  }
}

/**
 * Clean up old completed/failed jobs and batches
 */
export async function cleanupOldJobs(olderThanDays: number = 7): Promise<void> {
  const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
  
  // Delete old completed/failed jobs
  await db.processingJobs
    .where('endTime')
    .below(cutoffTime)
    .and(job => job.status === 'completed' || job.status === 'failed')
    .delete();

  // Delete old completed/failed batches
  await db.jobBatches
    .where('endTime')
    .below(cutoffTime)
    .and(batch => batch.status === 'completed' || batch.status === 'failed')
    .delete();
}
