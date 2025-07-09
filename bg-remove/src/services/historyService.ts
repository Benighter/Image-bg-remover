import { db } from '../db';
import { ImageHistoryItem } from '../types';

/**
 * Convert File to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Get image dimensions from File
 */
const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

/**
 * Save a processed image to history
 */
export const saveImageToHistory = async (
  originalFile: File,
  processedFile: File
): Promise<number> => {
  try {
    const [originalImageData, processedImageData, dimensions] = await Promise.all([
      fileToBase64(originalFile),
      fileToBase64(processedFile),
      getImageDimensions(originalFile)
    ]);

    const historyItem: ImageHistoryItem = {
      originalFileName: originalFile.name,
      originalImageData,
      processedImageData,
      fileSize: originalFile.size,
      timestamp: Date.now(),
      metadata: {
        width: dimensions.width,
        height: dimensions.height,
        type: originalFile.type
      }
    };

    const id = await db.imageHistory.add(historyItem);
    return id;
  } catch (error) {
    console.error('Error saving image to history:', error);
    throw new Error('Failed to save image to history');
  }
};

/**
 * Get all images from history, sorted by timestamp (newest first)
 */
export const getImageHistory = async (): Promise<ImageHistoryItem[]> => {
  try {
    return await db.imageHistory.orderBy('timestamp').reverse().toArray();
  } catch (error) {
    console.error('Error retrieving image history:', error);
    throw new Error('Failed to retrieve image history');
  }
};

/**
 * Get a specific image from history by ID
 */
export const getImageFromHistory = async (id: number): Promise<ImageHistoryItem | undefined> => {
  try {
    return await db.imageHistory.get(id);
  } catch (error) {
    console.error('Error retrieving image from history:', error);
    throw new Error('Failed to retrieve image from history');
  }
};

/**
 * Update a specific image in history with edited version
 */
export const updateImageInHistory = async (
  id: number,
  editedImageData: string
): Promise<void> => {
  try {
    await db.imageHistory.update(id, {
      processedImageData: editedImageData,
      timestamp: Date.now() // Update timestamp to show it was recently edited
    });
  } catch (error) {
    console.error('Error updating image in history:', error);
    throw new Error('Failed to update image in history');
  }
};

/**
 * Delete a specific image from history
 */
export const deleteImageFromHistory = async (id: number): Promise<void> => {
  try {
    await db.imageHistory.delete(id);
  } catch (error) {
    console.error('Error deleting image from history:', error);
    throw new Error('Failed to delete image from history');
  }
};

/**
 * Clear all images from history
 */
export const clearImageHistory = async (): Promise<void> => {
  try {
    await db.imageHistory.clear();
  } catch (error) {
    console.error('Error clearing image history:', error);
    throw new Error('Failed to clear image history');
  }
};

/**
 * Get history statistics
 */
export const getHistoryStats = async (): Promise<{
  totalImages: number;
  totalSize: number;
}> => {
  try {
    const items = await db.imageHistory.toArray();
    const totalImages = items.length;
    const totalSize = items.reduce((sum, item) => sum + item.fileSize, 0);
    
    return { totalImages, totalSize };
  } catch (error) {
    console.error('Error getting history stats:', error);
    throw new Error('Failed to get history statistics');
  }
};

/**
 * Convert base64 to File object
 */
export const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], filename, { type: mimeType });
};
