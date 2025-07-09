# Real-Time Progress Tracking System

This document describes the comprehensive real-time progress tracking system implemented in the BG Remover application.

## Overview

The progress tracking system provides real-time updates for background removal jobs, batch processing, and user notifications. It includes job management, progress visualization, and session grouping capabilities.

## Features

### 1. Live Progress Indicators
- **Real-time progress bars**: Show 0-100% completion for each image processing job
- **Stage indicators**: Display current processing stage (Loading, Preprocessing, AI Model, etc.)
- **Estimated time remaining**: Calculate and display ETA for job completion
- **Visual feedback**: Animated progress bars with shimmer effects during processing

### 2. Background Job Management
- **Non-blocking processing**: Users can continue using the app while images process
- **Job queue system**: Manage multiple processing jobs with priority handling
- **Job status tracking**: Track pending, processing, completed, failed, and cancelled jobs
- **Automatic retry**: Option to retry failed jobs
- **Job cancellation**: Cancel pending or in-progress jobs

### 3. Batch Processing with Job Grouping
- **Automatic batching**: Group multiple image uploads into logical batches
- **Session management**: Organize batches into time-based sessions
- **Batch progress**: Show overall progress for entire batches
- **Smart grouping**: Automatically group uploads within a 5-minute window
- **Manual batch creation**: Create custom batches with specific names

### 4. Job Queue UI
- **Dedicated job queue modal**: Full-screen interface for managing all jobs
- **Compact sidebar**: Mini job queue for active jobs
- **Session view**: Grouped view of batches organized by time sessions
- **Batch view**: Traditional view showing individual batches
- **Real-time updates**: Live updates without page refresh

### 5. Browser Notifications
- **Job completion alerts**: Native browser notifications when jobs complete
- **Failure notifications**: Alerts for failed processing jobs
- **Batch completion**: Notifications when entire batches finish
- **Permission handling**: Automatic request for notification permissions
- **In-app notifications**: Toast-style notifications within the application

## Technical Architecture

### Core Components

#### Job Service (`jobService.ts`)
- Manages job and batch creation, updates, and completion
- Provides real-time event emission for progress updates
- Handles database operations for job persistence

#### Job Processor (`jobProcessor.ts`)
- Orchestrates image processing with progress tracking
- Integrates with the ML processing pipeline
- Manages background job execution

#### Worker Manager (`workerManager.ts`)
- Handles Web Worker-based background processing
- Manages concurrent job execution
- Provides isolation for heavy processing tasks

#### Batch Manager (`batchManager.ts`)
- Manages batch creation and session grouping
- Provides smart batching based on time windows
- Handles session statistics and cleanup

#### Notification Service (`notificationService.ts`)
- Manages browser and in-app notifications
- Provides different notification types (success, error, warning, info)
- Handles notification permissions and fallbacks

### UI Components

#### Progress Components
- `ProgressBar`: Linear progress indicator with status colors
- `CircularProgress`: Circular progress indicator for compact spaces
- `JobCard`: Individual job display with progress and actions
- `BatchCard`: Batch display with expandable job list

#### Queue Management
- `JobQueue`: Main job queue modal interface
- `JobQueueSidebar`: Compact sidebar for active jobs
- `SessionView`: Session-grouped view of batches
- `NotificationCenter`: In-app notification display

### Database Schema

#### Processing Jobs Table
```typescript
interface ProcessingJob {
  id: string;
  batchId: string;
  fileName: string;
  fileSize: number;
  status: JobStatus;
  progress: number; // 0-100
  startTime: number;
  endTime?: number;
  estimatedTimeRemaining?: number;
  error?: string;
  originalFile: File;
  processedFile?: File;
  historyId?: number;
}
```

#### Job Batches Table
```typescript
interface JobBatch {
  id: string;
  name: string;
  status: JobStatus;
  progress: number; // 0-100
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  startTime: number;
  endTime?: number;
  estimatedTimeRemaining?: number;
}
```

## Usage

### Basic Usage

1. **Upload Images**: Drop or select images to start processing
2. **Monitor Progress**: View real-time progress in the main interface
3. **Check Job Queue**: Click the "Jobs" button to see detailed progress
4. **Receive Notifications**: Get alerts when processing completes

### Advanced Features

#### Session Management
- Sessions automatically group related uploads
- View sessions in the Job Queue's "Sessions" tab
- Sessions show overall progress across multiple batches

#### Batch Operations
- Cancel entire batches or individual jobs
- Retry failed jobs
- View detailed job information and results

#### Notification Settings
- Grant browser notification permissions for alerts
- Configure in-app notification preferences
- Receive completion and error notifications

## Development

### Testing

The system includes a comprehensive test panel (development mode only):

1. **Individual Job Progress**: Test single job progress updates
2. **Batch Processing**: Test multiple job processing
3. **Notifications**: Test all notification types
4. **Error Scenarios**: Test failure handling
5. **Concurrent Jobs**: Test multiple simultaneous jobs

Access the test panel by clicking the "Test" button in development mode.

### Configuration

Key configuration options:

```typescript
// Auto-grouping time window (default: 5 minutes)
const AUTO_GROUP_TIME_WINDOW = 5 * 60 * 1000;

// Maximum concurrent jobs (default: 2)
const MAX_CONCURRENT_JOBS = 2;

// Notification duration (default: 5 seconds)
const NOTIFICATION_DURATION = 5000;

// Progress update interval (default: 100ms)
const PROGRESS_UPDATE_INTERVAL = 100;
```

### Event System

The progress tracking system uses a custom event emitter for real-time updates:

```typescript
// Listen for job updates
jobEventEmitter.onJobUpdate((update: JobProgressUpdate) => {
  // Handle job progress update
});

// Listen for batch updates
jobEventEmitter.onBatchUpdate((update: BatchProgressUpdate) => {
  // Handle batch progress update
});
```

## Performance Considerations

- **Database Indexing**: Jobs and batches are indexed by status and timestamp
- **Memory Management**: Old completed jobs are automatically cleaned up
- **Concurrent Processing**: Limited concurrent jobs to prevent system overload
- **Event Throttling**: Progress updates are throttled to prevent UI flooding
- **Lazy Loading**: Job details are loaded on demand

## Browser Compatibility

- **Modern Browsers**: Full support for Chrome, Firefox, Safari, Edge
- **Web Workers**: Background processing support
- **IndexedDB**: Local storage for job persistence
- **Notifications API**: Browser notification support where available
- **Graceful Degradation**: Fallbacks for unsupported features

## Future Enhancements

- **Job Prioritization**: Priority queue for important jobs
- **Batch Templates**: Predefined batch configurations
- **Progress Analytics**: Detailed processing statistics
- **Export/Import**: Job queue state persistence
- **Advanced Filtering**: Filter jobs by status, date, or batch
- **Keyboard Shortcuts**: Quick access to job management features
