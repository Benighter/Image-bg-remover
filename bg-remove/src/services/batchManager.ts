import { JobBatch, ProcessingJob } from '../types';
import { 
  createJobBatch, 
  createProcessingJob, 
  getJobsForBatch, 
  getAllBatches,
  updateBatchProgress 
} from './jobService';
import { generateBatchName } from '../utils/formatters';

export interface BatchSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  batchIds: string[];
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  isActive: boolean;
}

export interface BatchCreationOptions {
  sessionId?: string;
  batchName?: string;
  autoGroupByTime?: boolean; // Group uploads within a time window
  timeWindowMs?: number; // Default 5 minutes
}

class BatchManager {
  private activeSessions: Map<string, BatchSession> = new Map();
  private currentSessionId: string | null = null;
  private autoGroupTimeWindow = 5 * 60 * 1000; // 5 minutes

  /**
   * Create or get a batch for processing files
   */
  async createOrGetBatch(
    files: File[], 
    options: BatchCreationOptions = {}
  ): Promise<string> {
    const {
      sessionId,
      batchName,
      autoGroupByTime = true,
      timeWindowMs = this.autoGroupTimeWindow
    } = options;

    // If session ID is provided, use it
    if (sessionId) {
      return this.createBatchInSession(sessionId, files, batchName);
    }

    // Auto-grouping logic
    if (autoGroupByTime && this.currentSessionId) {
      const session = this.activeSessions.get(this.currentSessionId);
      if (session && session.isActive) {
        const timeSinceLastActivity = Date.now() - session.startTime;
        
        // If within time window, add to current session
        if (timeSinceLastActivity < timeWindowMs) {
          return this.createBatchInSession(this.currentSessionId, files, batchName);
        }
      }
    }

    // Create new session
    const newSessionId = await this.createSession();
    return this.createBatchInSession(newSessionId, files, batchName);
  }

  /**
   * Create a new session
   */
  async createSession(name?: string): Promise<string> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session: BatchSession = {
      id: sessionId,
      name: name || `Session ${new Date().toLocaleTimeString()}`,
      startTime: Date.now(),
      batchIds: [],
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      isActive: true
    };

    this.activeSessions.set(sessionId, session);
    this.currentSessionId = sessionId;
    
    return sessionId;
  }

  /**
   * Create a batch within a session
   */
  private async createBatchInSession(
    sessionId: string, 
    files: File[], 
    batchName?: string
  ): Promise<string> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const finalBatchName = batchName || generateBatchName(files.length);
    const batchId = await createJobBatch(finalBatchName);

    // Update session
    session.batchIds.push(batchId);
    session.totalJobs += files.length;

    return batchId;
  }

  /**
   * Add jobs to a batch
   */
  async addJobsToBatch(batchId: string, files: File[]): Promise<string[]> {
    const jobIds: string[] = [];

    for (const file of files) {
      const jobId = await createProcessingJob(file, batchId);
      jobIds.push(jobId);
    }

    return jobIds;
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): BatchSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): BatchSession[] {
    return Array.from(this.activeSessions.values()).filter(s => s.isActive);
  }

  /**
   * Get current session
   */
  getCurrentSession(): BatchSession | null {
    return this.currentSessionId ? this.activeSessions.get(this.currentSessionId) || null : null;
  }

  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.endTime = Date.now();
      
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }
    }
  }

  /**
   * Get batches for a session
   */
  async getBatchesForSession(sessionId: string): Promise<JobBatch[]> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return [];

    const allBatches = await getAllBatches();
    return allBatches.filter(batch => session.batchIds.includes(batch.id));
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    processingJobs: number;
    pendingJobs: number;
    overallProgress: number;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        processingJobs: 0,
        pendingJobs: 0,
        overallProgress: 0
      };
    }

    const batches = await this.getBatchesForSession(sessionId);
    let totalJobs = 0;
    let completedJobs = 0;
    let failedJobs = 0;
    let processingJobs = 0;
    let pendingJobs = 0;
    let totalProgress = 0;

    for (const batch of batches) {
      const jobs = await getJobsForBatch(batch.id);
      totalJobs += jobs.length;
      
      for (const job of jobs) {
        switch (job.status) {
          case 'completed':
            completedJobs++;
            break;
          case 'failed':
            failedJobs++;
            break;
          case 'processing':
            processingJobs++;
            break;
          case 'pending':
            pendingJobs++;
            break;
        }
        totalProgress += job.progress;
      }
    }

    const overallProgress = totalJobs > 0 ? totalProgress / totalJobs : 0;

    // Update session stats
    session.totalJobs = totalJobs;
    session.completedJobs = completedJobs;
    session.failedJobs = failedJobs;

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      processingJobs,
      pendingJobs,
      overallProgress
    };
  }

  /**
   * Auto-cleanup old sessions
   */
  cleanupOldSessions(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - olderThanMs;
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (!session.isActive && session.endTime && session.endTime < cutoffTime) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Group existing batches by time proximity
   */
  async groupBatchesByTime(
    batches: JobBatch[], 
    timeWindowMs: number = this.autoGroupTimeWindow
  ): Promise<Array<{ sessionName: string; batches: JobBatch[] }>> {
    if (batches.length === 0) return [];

    // Sort batches by start time
    const sortedBatches = [...batches].sort((a, b) => a.startTime - b.startTime);
    const groups: Array<{ sessionName: string; batches: JobBatch[] }> = [];
    let currentGroup: JobBatch[] = [sortedBatches[0]];
    let groupStartTime = sortedBatches[0].startTime;

    for (let i = 1; i < sortedBatches.length; i++) {
      const batch = sortedBatches[i];
      const timeDiff = batch.startTime - groupStartTime;

      if (timeDiff <= timeWindowMs) {
        // Add to current group
        currentGroup.push(batch);
      } else {
        // Start new group
        groups.push({
          sessionName: `Session ${new Date(groupStartTime).toLocaleString()}`,
          batches: currentGroup
        });
        currentGroup = [batch];
        groupStartTime = batch.startTime;
      }
    }

    // Add the last group
    if (currentGroup.length > 0) {
      groups.push({
        sessionName: `Session ${new Date(groupStartTime).toLocaleString()}`,
        batches: currentGroup
      });
    }

    return groups;
  }

  /**
   * Create a smart batch name based on files and context
   */
  generateSmartBatchName(files: File[], context?: string): string {
    const fileCount = files.length;
    const timestamp = new Date();
    
    if (context) {
      return `${context} - ${fileCount} image${fileCount > 1 ? 's' : ''}`;
    }

    // Analyze file names for common patterns
    const fileNames = files.map(f => f.name.toLowerCase());
    const commonExtensions = new Set(fileNames.map(name => {
      const ext = name.split('.').pop();
      return ext || '';
    }));

    let batchName = `${fileCount} image${fileCount > 1 ? 's' : ''}`;
    
    if (commonExtensions.size === 1) {
      const ext = Array.from(commonExtensions)[0].toUpperCase();
      batchName = `${fileCount} ${ext} image${fileCount > 1 ? 's' : ''}`;
    }

    return `${batchName} - ${timestamp.toLocaleTimeString()}`;
  }
}

// Global batch manager instance
export const batchManager = new BatchManager();

// Convenience functions
export const createOrGetBatch = (files: File[], options?: BatchCreationOptions) => 
  batchManager.createOrGetBatch(files, options);

export const createSession = (name?: string) => 
  batchManager.createSession(name);

export const getSessionStats = (sessionId: string) => 
  batchManager.getSessionStats(sessionId);

export const groupBatchesByTime = (batches: JobBatch[], timeWindowMs?: number) => 
  batchManager.groupBatchesByTime(batches, timeWindowMs);
