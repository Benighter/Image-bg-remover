import React, { useState, useEffect } from 'react';
import { JobBatch, ProcessingJob } from '../types';
import { BatchCard } from './BatchCard';
import { JobCard } from './JobCard';
import { SessionView, SessionSummary } from './SessionView';
import { useJobProgress } from '../hooks/useJobProgress';
import { requestNotificationPermission } from '../services/jobProcessor';

interface JobQueueProps {
  isOpen: boolean;
  onClose: () => void;
  onViewResult?: (job: ProcessingJob) => void;
}

export function JobQueue({ isOpen, onClose, onViewResult }: JobQueueProps) {
  const {
    activeBatches,
    allBatches,
    activeJobs,
    isLoading,
    refreshData,
    cancelJob,
    cancelBatch
  } = useJobProgress();

  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<'batches' | 'sessions'>('batches');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleToggleExpanded = (batchId: string) => {
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

  const handleRequestNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
  };

  const handleRetryJob = async (jobId: string) => {
    // TODO: Implement job retry functionality
    console.log('Retry job:', jobId);
  };

  const displayedBatches = showCompleted ? allBatches : activeBatches;
  const hasActiveBatches = activeBatches.length > 0;
  const hasActiveJobs = activeJobs.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Job Queue</h2>
            {hasActiveBatches && (
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                {activeBatches.length} active
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Notification Permission */}
            {notificationPermission !== 'granted' && 'Notification' in window && (
              <button
                onClick={handleRequestNotifications}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Enable notifications
              </button>
            )}
            
            {/* Refresh Button */}
            <button
              onClick={refreshData}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-md"
              title="Refresh"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-50 rounded-md"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-6">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">View:</span>
              <div className="flex bg-white rounded-lg border border-gray-300 p-1">
                <button
                  onClick={() => setViewMode('batches')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'batches'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Batches
                </button>
                <button
                  onClick={() => setViewMode('sessions')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'sessions'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sessions
                </button>
              </div>
            </div>

            {/* Show Completed Toggle */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show completed</span>
            </label>
          </div>

          <div className="text-sm text-gray-600">
            {viewMode === 'batches'
              ? `${displayedBatches.length} ${displayedBatches.length === 1 ? 'batch' : 'batches'}`
              : 'Session view'
            }
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'sessions' ? (
            <div className="p-6">
              <SessionSummary className="mb-6" />
              <SessionView
                onCancelBatch={cancelBatch}
                onCancelJob={cancelJob}
                onRetryJob={handleRetryJob}
                onViewResult={onViewResult}
              />
            </div>
          ) : (
            <div className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : displayedBatches.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
                  <p className="text-gray-600">
                    {showCompleted
                      ? "No processing jobs have been created yet."
                      : "No active jobs. Upload some images to get started!"
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedBatches.map((batch) => (
                    <BatchCard
                      key={batch.id}
                      batch={batch}
                      expanded={expandedBatches.has(batch.id)}
                      onToggleExpanded={handleToggleExpanded}
                      onCancelBatch={cancelBatch}
                      onCancelJob={cancelJob}
                      onRetryJob={handleRetryJob}
                      onViewResult={onViewResult}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Summary */}
        {hasActiveBatches && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-6">
                <span className="text-gray-600">
                  Active batches: <span className="font-medium">{activeBatches.length}</span>
                </span>
                <span className="text-gray-600">
                  Active jobs: <span className="font-medium">{hasActiveJobs ? activeJobs.length : 0}</span>
                </span>
              </div>
              
              {hasActiveJobs && (
                <div className="text-blue-600">
                  Processing in progress...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact job queue sidebar component
interface JobQueueSidebarProps {
  className?: string;
  onViewResult?: (job: ProcessingJob) => void;
}

export function JobQueueSidebar({ className = '', onViewResult }: JobQueueSidebarProps) {
  const { activeBatches, activeJobs, cancelJob } = useJobProgress();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveWork = activeBatches.length > 0 || activeJobs.length > 0;

  if (!hasActiveWork) return null;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Active Jobs</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-600 hover:bg-gray-50 rounded"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 max-h-96 overflow-y-auto">
          <div className="space-y-2">
            {activeJobs.slice(0, 5).map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onCancel={cancelJob}
                onViewResult={onViewResult}
                compact={true}
              />
            ))}
            {activeJobs.length > 5 && (
              <div className="text-xs text-gray-500 text-center py-2">
                And {activeJobs.length - 5} more jobs...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
