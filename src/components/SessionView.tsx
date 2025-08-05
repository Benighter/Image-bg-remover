import React, { useState, useEffect } from 'react';
import { JobBatch, ProcessingJob } from '../types';
import { BatchCard } from './BatchCard';
import { ProgressBar } from './ProgressBar';
import { batchManager, groupBatchesByTime } from '../services/batchManager';
import { useJobProgress } from '../hooks/useJobProgress';
import { formatRelativeTime, formatDuration } from '../utils/formatters';

interface SessionGroup {
  sessionName: string;
  batches: JobBatch[];
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  overallProgress: number;
  startTime: number;
  endTime?: number;
}

interface SessionViewProps {
  onCancelBatch?: (batchId: string) => void;
  onCancelJob?: (jobId: string) => void;
  onRetryJob?: (jobId: string) => void;
  onViewResult?: (job: ProcessingJob) => void;
}

export function SessionView({
  onCancelBatch,
  onCancelJob,
  onRetryJob,
  onViewResult
}: SessionViewProps) {
  const { allBatches, isLoading } = useJobProgress();
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  useEffect(() => {
    const processSessionGroups = async () => {
      if (allBatches.length === 0) {
        setSessionGroups([]);
        return;
      }

      // Group batches by time proximity
      const groups = await groupBatchesByTime(allBatches);
      
      // Calculate statistics for each group
      const sessionGroupsWithStats: SessionGroup[] = await Promise.all(
        groups.map(async (group) => {
          let totalJobs = 0;
          let completedJobs = 0;
          let failedJobs = 0;
          let totalProgress = 0;
          let startTime = Math.min(...group.batches.map(b => b.startTime));
          let endTime: number | undefined;

          for (const batch of group.batches) {
            totalJobs += batch.totalJobs;
            completedJobs += batch.completedJobs;
            failedJobs += batch.failedJobs;
            totalProgress += batch.progress * batch.totalJobs;
            
            if (batch.endTime) {
              endTime = Math.max(endTime || 0, batch.endTime);
            }
          }

          const overallProgress = totalJobs > 0 ? totalProgress / totalJobs : 0;

          return {
            sessionName: group.sessionName,
            batches: group.batches,
            totalJobs,
            completedJobs,
            failedJobs,
            overallProgress,
            startTime,
            endTime
          };
        })
      );

      setSessionGroups(sessionGroupsWithStats);
    };

    processSessionGroups();
  }, [allBatches]);

  const handleToggleSession = (sessionName: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionName)) {
        newSet.delete(sessionName);
      } else {
        newSet.add(sessionName);
      }
      return newSet;
    });
  };

  const handleToggleBatch = (batchId: string) => {
    setExpandedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (sessionGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
        <p className="text-gray-600">
          Upload some images to create your first processing session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sessionGroups.map((session) => (
        <div key={session.sessionName} className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* Session Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleSession(session.sessionName)}
                  className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      expandedSessions.has(session.sessionName) ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {session.sessionName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {session.batches.length} batch{session.batches.length > 1 ? 'es' : ''} • {' '}
                    {session.totalJobs} image{session.totalJobs > 1 ? 's' : ''} • {' '}
                    Started {formatRelativeTime(session.startTime)}
                    {session.endTime && ` • Duration: ${formatDuration(session.startTime, session.endTime)}`}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {Math.round(session.overallProgress)}%
                </div>
                <div className="text-sm text-gray-600">
                  {session.completedJobs}/{session.totalJobs} completed
                </div>
              </div>
            </div>

            {/* Session Progress Bar */}
            <div className="mt-3">
              <ProgressBar
                progress={session.overallProgress}
                status={session.completedJobs === session.totalJobs ? 'completed' : 'processing'}
                size="md"
                animated={session.completedJobs < session.totalJobs}
              />
            </div>

            {/* Session Stats */}
            <div className="mt-3 flex gap-4 text-sm text-gray-600">
              <span>✓ {session.completedJobs} completed</span>
              {session.failedJobs > 0 && (
                <span className="text-red-600">✗ {session.failedJobs} failed</span>
              )}
              <span>⏳ {session.totalJobs - session.completedJobs - session.failedJobs} remaining</span>
            </div>
          </div>

          {/* Session Batches */}
          {expandedSessions.has(session.sessionName) && (
            <div className="p-4">
              <div className="space-y-4">
                {session.batches.map((batch) => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    expanded={expandedBatches.has(batch.id)}
                    onToggleExpanded={handleToggleBatch}
                    onCancelBatch={onCancelBatch}
                    onCancelJob={onCancelJob}
                    onRetryJob={onRetryJob}
                    onViewResult={onViewResult}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Session Summary Component
interface SessionSummaryProps {
  className?: string;
}

export function SessionSummary({ className = '' }: SessionSummaryProps) {
  const { allBatches, activeBatches, activeJobs } = useJobProgress();
  const [sessionStats, setSessionStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    processingJobs: 0
  });

  useEffect(() => {
    const calculateStats = async () => {
      if (allBatches.length === 0) {
        setSessionStats({
          totalSessions: 0,
          activeSessions: 0,
          totalJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          processingJobs: 0
        });
        return;
      }

      const groups = await groupBatchesByTime(allBatches);
      const activeGroups = await groupBatchesByTime(activeBatches);
      
      const totalJobs = allBatches.reduce((sum, batch) => sum + batch.totalJobs, 0);
      const completedJobs = allBatches.reduce((sum, batch) => sum + batch.completedJobs, 0);
      const failedJobs = allBatches.reduce((sum, batch) => sum + batch.failedJobs, 0);
      const processingJobs = activeJobs.length;

      setSessionStats({
        totalSessions: groups.length,
        activeSessions: activeGroups.length,
        totalJobs,
        completedJobs,
        failedJobs,
        processingJobs
      });
    };

    calculateStats();
  }, [allBatches, activeBatches, activeJobs]);

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <h4 className="text-sm font-medium text-gray-900 mb-3">Session Summary</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Total Sessions:</span>
          <span className="ml-2 font-medium">{sessionStats.totalSessions}</span>
        </div>
        <div>
          <span className="text-gray-600">Active Sessions:</span>
          <span className="ml-2 font-medium text-blue-600">{sessionStats.activeSessions}</span>
        </div>
        <div>
          <span className="text-gray-600">Total Jobs:</span>
          <span className="ml-2 font-medium">{sessionStats.totalJobs}</span>
        </div>
        <div>
          <span className="text-gray-600">Completed:</span>
          <span className="ml-2 font-medium text-green-600">{sessionStats.completedJobs}</span>
        </div>
        <div>
          <span className="text-gray-600">Processing:</span>
          <span className="ml-2 font-medium text-blue-600">{sessionStats.processingJobs}</span>
        </div>
        <div>
          <span className="text-gray-600">Failed:</span>
          <span className="ml-2 font-medium text-red-600">{sessionStats.failedJobs}</span>
        </div>
      </div>
    </div>
  );
}
