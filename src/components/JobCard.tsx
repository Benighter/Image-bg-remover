import React, { useState } from 'react';
import { ProcessingJob } from '../types';
import { ProgressBar } from './ProgressBar';
import { formatFileSize, formatTimeRemaining } from '../utils/formatters';

interface JobCardProps {
  job: ProcessingJob;
  onCancel?: (jobId: string) => void;
  onRetry?: (jobId: string) => void;
  onViewResult?: (job: ProcessingJob) => void;
  compact?: boolean;
}

export function JobCard({ 
  job, 
  onCancel, 
  onRetry, 
  onViewResult, 
  compact = false 
}: JobCardProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Generate preview URL for the original file
  React.useEffect(() => {
    if (job.originalFile) {
      const url = URL.createObjectURL(job.originalFile);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [job.originalFile]);

  const getStatusText = () => {
    switch (job.status) {
      case 'pending':
        return 'Waiting to start...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'failed':
        return `Failed: ${job.error || 'Unknown error'}`;
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'cancelled':
        return 'text-gray-600';
      case 'processing':
        return 'text-blue-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const canCancel = job.status === 'pending' || job.status === 'processing';
  const canRetry = job.status === 'failed';
  const canViewResult = job.status === 'completed' && job.processedFile;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
        {/* File Icon/Preview */}
        <div className="flex-shrink-0">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt={job.fileName}
              className="w-10 h-10 object-cover rounded"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{job.fileName}</p>
          <p className="text-xs text-gray-500">{formatFileSize(job.fileSize)}</p>
        </div>

        {/* Progress */}
        <div className="flex-1 max-w-32">
          <ProgressBar
            progress={job.progress}
            status={job.status}
            size="sm"
            showPercentage={false}
          />
        </div>

        {/* Status */}
        <div className="flex-shrink-0 text-right">
          <p className={`text-xs font-medium ${getStatusColor()}`}>
            {job.progress}%
          </p>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex gap-1">
          {canViewResult && (
            <button
              onClick={() => onViewResult?.(job)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              title="View result"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel?.(job.id)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title="Cancel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {canRetry && (
            <button
              onClick={() => onRetry?.(job.id)}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              title="Retry"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* File Preview */}
          <div className="flex-shrink-0">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt={job.fileName}
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate" title={job.fileName}>
              {job.fileName}
            </h3>
            <p className="text-sm text-gray-500">{formatFileSize(job.fileSize)}</p>
            <p className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex gap-2">
            {canViewResult && (
              <button
                onClick={() => onViewResult?.(job)}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200"
              >
                View
              </button>
            )}
            {canRetry && (
              <button
                onClick={() => onRetry?.(job.id)}
                className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded-md border border-green-200"
              >
                Retry
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => onCancel?.(job.id)}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md border border-red-200"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <ProgressBar
            progress={job.progress}
            status={job.status}
            size="md"
            animated={job.status === 'processing'}
          />
        </div>

        {/* Additional Info */}
        {(job.estimatedTimeRemaining || job.endTime) && (
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Started: {new Date(job.startTime).toLocaleTimeString()}
            </span>
            {job.estimatedTimeRemaining && job.status === 'processing' && (
              <span>
                ETA: {formatTimeRemaining(job.estimatedTimeRemaining)}
              </span>
            )}
            {job.endTime && (
              <span>
                Finished: {new Date(job.endTime).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
