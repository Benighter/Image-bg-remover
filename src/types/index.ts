// Image history types
export interface ImageHistoryItem {
  id?: number;
  originalFileName: string;
  originalImageData: string; // base64 encoded original image
  processedImageData: string; // base64 encoded processed image
  fileSize: number;
  timestamp: number;
  metadata: {
    width: number;
    height: number;
    type: string;
  };
}

// Re-export existing types for convenience
export interface ImageFile {
  id: number;
  file: File;
  processedFile?: File;
}

export interface AppError {
  message: string;
}
