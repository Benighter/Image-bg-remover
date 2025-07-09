import { useState, useEffect, useCallback } from 'react';
import {
  ProcessingJob,
  JobBatch,
  JobProgressUpdate,
  BatchProgressUpdate
} from '../types';
import {
  jobEventEmitter,
  getActiveBatches,
  getAllBatches,
  getJobsForBatch,
  getActiveJobs,
  cancelJob,
  cancelBatch
} from '../services/jobService';

export interface UseJobProgressReturn {
  activeBatches: JobBatch[];
  allBatches: JobBatch[];
  activeJobs: ProcessingJob[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  cancelJob: (jobId: string) => Promise<void>;
  cancelBatch: (batchId: string) => Promise<void>;
  getJobsForBatch: (batchId: string) => Promise<ProcessingJob[]>;
}

/**
 * Hook for managing job progress and batch data
 */
export function useJobProgress(): UseJobProgressReturn {
  const [activeBatches, setActiveBatches] = useState<JobBatch[]>([]);
  const [allBatches, setAllBatches] = useState<JobBatch[]>([]);
  const [activeJobs, setActiveJobs] = useState<ProcessingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Refresh all data from database
  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [activeBatchesData, allBatchesData, activeJobsData] = await Promise.all([
        getActiveBatches(),
        getAllBatches(),
        getActiveJobs()
      ]);

      setActiveBatches(activeBatchesData);
      setAllBatches(allBatchesData);
      setActiveJobs(activeJobsData);
    } catch (error) {
      console.error('Error refreshing job data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle job progress updates
  const handleJobUpdate = useCallback((update: JobProgressUpdate) => {
    setActiveJobs(prev => prev.map(job => 
      job.id === update.jobId
        ? {
            ...job,
            progress: update.progress,
            status: update.status,
            estimatedTimeRemaining: update.estimatedTimeRemaining,
            error: update.error
          }
        : job
    ));

    // If job is completed/failed/cancelled, refresh data to update lists
    if (['completed', 'failed', 'cancelled'].includes(update.status)) {
      refreshData();
    }
  }, [refreshData]);

  // Handle batch progress updates
  const handleBatchUpdate = useCallback((update: BatchProgressUpdate) => {
    const updateBatch = (batch: JobBatch) => 
      batch.id === update.batchId
        ? {
            ...batch,
            progress: update.progress,
            status: update.status,
            completedJobs: update.completedJobs,
            failedJobs: update.failedJobs,
            estimatedTimeRemaining: update.estimatedTimeRemaining
          }
        : batch;

    setActiveBatches(prev => prev.map(updateBatch));
    setAllBatches(prev => prev.map(updateBatch));

    // If batch is completed/failed, refresh data to update active lists
    if (['completed', 'failed'].includes(update.status)) {
      refreshData();
    }
  }, [refreshData]);

  // Set up event listeners
  useEffect(() => {
    jobEventEmitter.onJobUpdate(handleJobUpdate);
    jobEventEmitter.onBatchUpdate(handleBatchUpdate);

    // Initial data load
    refreshData();

    // Cleanup function would be needed if we had removeEventListener
    // For now, we rely on the component unmounting
    return () => {
      // Note: EventTarget doesn't have removeEventListener for custom events
      // This is a limitation we'll accept for this implementation
    };
  }, [handleJobUpdate, handleBatchUpdate, refreshData]);

  return {
    activeBatches,
    allBatches,
    activeJobs,
    isLoading,
    refreshData,
    cancelJob,
    cancelBatch,
    getJobsForBatch
  };
}

/**
 * Hook for tracking a specific batch
 */
export function useBatchProgress(batchId: string) {
  const [batch, setBatch] = useState<JobBatch | null>(null);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBatchData = useCallback(async () => {
    if (!batchId) return;

    try {
      setIsLoading(true);
      const [allBatches, batchJobs] = await Promise.all([
        getAllBatches(),
        getJobsForBatch(batchId)
      ]);

      const foundBatch = allBatches.find(b => b.id === batchId);
      setBatch(foundBatch || null);
      setJobs(batchJobs);
    } catch (error) {
      console.error('Error refreshing batch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [batchId]);

  // Handle updates for this specific batch
  const handleBatchUpdate = useCallback((update: BatchProgressUpdate) => {
    if (update.batchId === batchId) {
      setBatch(prev => prev ? {
        ...prev,
        progress: update.progress,
        status: update.status,
        completedJobs: update.completedJobs,
        failedJobs: update.failedJobs,
        estimatedTimeRemaining: update.estimatedTimeRemaining
      } : null);
    }
  }, [batchId]);

  // Handle job updates for jobs in this batch
  const handleJobUpdate = useCallback((update: JobProgressUpdate) => {
    setJobs(prev => prev.map(job => 
      job.id === update.jobId
        ? {
            ...job,
            progress: update.progress,
            status: update.status,
            estimatedTimeRemaining: update.estimatedTimeRemaining,
            error: update.error
          }
        : job
    ));
  }, []);

  useEffect(() => {
    jobEventEmitter.onBatchUpdate(handleBatchUpdate);
    jobEventEmitter.onJobUpdate(handleJobUpdate);

    refreshBatchData();

    return () => {
      // Cleanup would go here if supported
    };
  }, [handleBatchUpdate, handleJobUpdate, refreshBatchData]);

  return {
    batch,
    jobs,
    isLoading,
    refreshBatchData
  };
}

/**
 * Hook for tracking a specific job
 */
export function useSpecificJobProgress(jobId: string) {
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshJobData = useCallback(async () => {
    if (!jobId) return;

    try {
      setIsLoading(true);
      const allJobs = await getActiveJobs();
      const foundJob = allJobs.find(j => j.id === jobId);
      setJob(foundJob || null);
    } catch (error) {
      console.error('Error refreshing job data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  const handleJobUpdate = useCallback((update: JobProgressUpdate) => {
    if (update.jobId === jobId) {
      setJob(prev => prev ? {
        ...prev,
        progress: update.progress,
        status: update.status,
        estimatedTimeRemaining: update.estimatedTimeRemaining,
        error: update.error
      } : null);
    }
  }, [jobId]);

  useEffect(() => {
    jobEventEmitter.onJobUpdate(handleJobUpdate);
    refreshJobData();

    return () => {
      // Cleanup would go here if supported
    };
  }, [handleJobUpdate, refreshJobData]);

  return {
    job,
    isLoading,
    refreshJobData
  };
}
