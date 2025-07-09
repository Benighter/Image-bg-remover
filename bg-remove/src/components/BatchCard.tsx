import React from 'react';
import { JobBatch, ProcessingJob } from '../types';
import { ProgressBar, CircularProgress } from './ProgressBar';
import { JobCard } from './JobCard';
import { formatTimeRemaining, formatRelativeTime, formatDuration } from '../utils/formatters';
import { useBatchProgress } from '../hooks/useJobProgress';

interface BatchCardProps {
  batch: JobBatch;
  onCancelBatch?: (batchId: string) => void;
  onCancelJob?: (jobId: string) => void;
  onRetryJob?: (jobId: string) => void;
  onViewResult?: (job: ProcessingJob) => void;
  expanded?: boolean;
  onToggleExpanded?: (batchId: string) => void;
}

export function BatchCard({
  batch,
  onCancelBatch,
  onCancelJob,
  onRetryJob,
  onViewResult,
  expanded = false,
  onToggleExpanded
}: BatchCardProps) {
  const { jobs, isLoading } = useBatchProgress(batch.id);

  const getStatusIcon = () => {
    switch (batch.status) {
      case 'completed':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'processing':
        return (
          <div className="w-8 h-8">
            <CircularProgress
              progress={batch.progress}
              status={batch.status}
              size={32}
              strokeWidth={3}
              showPercentage={false}
            />
          </div>
        );
      case 'pending':
        return (
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  const getStatusText = () => {
    switch (batch.status) {
      case 'pending':
        return 'Waiting to start';
      case 'processing':
        return `Processing (${batch.completedJobs}/${batch.totalJobs} completed)`;
      case 'completed':
        return `Completed (${batch.completedJobs}/${batch.totalJobs} successful)`;
      case 'failed':
        return `Failed (${batch.failedJobs}/${batch.totalJobs} failed)`;
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (batch.status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'processing':
        return 'text-blue-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const canCancel = batch.status === 'pending' || batch.status === 'processing';
  const hasJobs = batch.totalJobs > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>

          {/* Batch Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {batch.name}
              </h3>
              <span className="text-sm text-gray-500">
                ({batch.totalJobs} {batch.totalJobs === 1 ? 'image' : 'images'})
              </span>
            </div>
            <p className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </p>
            <p className="text-xs text-gray-500">
              Started {formatRelativeTime(batch.startTime)}
              {batch.endTime && ` • Duration: ${formatDuration(batch.startTime, batch.endTime)}`}
            </p>
          </div>

          {/* Progress Percentage */}
          <div className="flex-shrink-0 text-right">
            <div className="text-lg font-semibold text-gray-900">
              {Math.round(batch.progress)}%
            </div>
            {batch.estimatedTimeRemaining && batch.status === 'processing' && (
              <div className="text-xs text-gray-500">
                ETA: {formatTimeRemaining(batch.estimatedTimeRemaining)}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex gap-2">
            {hasJobs && (
              <button
                onClick={() => onToggleExpanded?.(batch.id)}
                className="p-2 text-gray-600 hover:bg-gray-50 rounded-md"
                title={expanded ? 'Collapse' : 'Expand'}
              >
                <svg
                  className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => onCancelBatch?.(batch.id)}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md border border-red-200"
              >
                Cancel Batch
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <ProgressBar
            progress={batch.progress}
            status={batch.status}
            size="md"
            animated={batch.status === 'processing'}
          />
        </div>

        {/* Summary Stats */}
        {hasJobs && (
          <div className="mt-3 flex gap-4 text-sm text-gray-600">
            <span>✓ {batch.completedJobs} completed</span>
            {batch.failedJobs > 0 && (
              <span className="text-red-600">✗ {batch.failedJobs} failed</span>
            )}
            <span>⏳ {batch.totalJobs - batch.completedJobs - batch.failedJobs} remaining</span>
          </div>
        )}
      </div>

      {/* Expanded Job List */}
      {expanded && hasJobs && (
        <div className="border-t border-gray-200">
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Jobs in this batch
            </h4>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onCancel={onCancelJob}
                    onRetry={onRetryJob}
                    onViewResult={onViewResult}
                    compact={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
