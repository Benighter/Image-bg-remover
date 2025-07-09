import { useState, useEffect, useRef } from 'react';
import { ImageHistoryItem } from '../types';
import { LazyImage } from './LazyImage';
import { EditModal } from './EditModal';
import type { ImageFile } from '../App';
import {
  getImageHistory,
  deleteImageFromHistory,
  clearImageHistory,
  getHistoryStats,
  base64ToFile,
  updateImageInHistory
} from '../services/historyService';

interface HistoryGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryGallery({ isOpen, onClose }: HistoryGalleryProps) {
  const [historyItems, setHistoryItems] = useState<ImageHistoryItem[]>([]);
  const [displayedItems, setDisplayedItems] = useState<ImageHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalImages: 0, totalSize: 0 });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageHistoryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<ImageHistoryItem[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<ImageFile | null>(null);
  const itemsPerPage = 12;
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      // Reset modal states when history opens
      setIsEditModalOpen(false);
      setEditingImage(null);
      setSelectedImage(null); // Clear full-size image state
      setShowClearConfirm(false); // Clear confirmation dialog state
    }
  }, [isOpen]);

  useEffect(() => {
    let filtered = historyItems.filter(item =>
      item.originalFileName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = Date.now();
      const filterTime = {
        'today': 24 * 60 * 60 * 1000,
        'week': 7 * 24 * 60 * 60 * 1000,
        'month': 30 * 24 * 60 * 60 * 1000,
        'year': 365 * 24 * 60 * 60 * 1000
      }[dateFilter];

      if (filterTime) {
        filtered = filtered.filter(item => now - item.timestamp <= filterTime);
      }
    }

    setFilteredItems(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [historyItems, searchTerm, dateFilter]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setDisplayedItems(filteredItems.slice(startIndex, endIndex));
  }, [filteredItems, currentPage]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if any modal is open
      if (isEditModalOpen || selectedImage || showClearConfirm) {
        return;
      }

      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, isEditModalOpen, selectedImage, showClearConfirm]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const [items, statistics] = await Promise.all([
        getImageHistory(),
        getHistoryStats()
      ]);
      setHistoryItems(items);
      setStats(statistics);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (id: number) => {
    try {
      await deleteImageFromHistory(id);
      await loadHistory(); // Refresh the list
      // Reset to first page if current page becomes empty
      const newTotalPages = Math.ceil((historyItems.length - 1) / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearImageHistory();
      setHistoryItems([]);
      setDisplayedItems([]);
      setStats({ totalImages: 0, totalSize: 0 });
      setCurrentPage(1);
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };



  const handleEdit = (item: ImageHistoryItem) => {
    const originalFile = base64ToFile(
      item.originalImageData,
      item.originalFileName,
      item.metadata.type
    );
    const processedFile = base64ToFile(
      item.processedImageData,
      `${item.originalFileName.split('.')[0]}-bg-removed.png`,
      'image/png'
    );

    const imageFile: ImageFile = {
      id: item.id || 0,
      file: originalFile,
      processedFile: processedFile,
      originalProcessedFile: processedFile
    };

    setEditingImage(imageFile);
    setIsEditModalOpen(true);
  };

  const handleEditSave = async (editedImageUrl: string) => {
    if (!editingImage) return;

    try {
      // Update the image in history with the edited version
      await updateImageInHistory(editingImage.id, editedImageUrl);

      // Reload the history to show the updated image
      await loadHistory();

      // Close the modal
      setIsEditModalOpen(false);
      setEditingImage(null);
    } catch (error) {
      console.error('Error saving edited image:', error);
      // You could show a toast notification here for better UX
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDateFilterLabel = (filter: string): string => {
    const labels = {
      'all': 'All Time',
      'today': 'Today',
      'week': 'This Week',
      'month': 'This Month',
      'year': 'This Year'
    };
    return labels[filter as keyof typeof labels] || 'All Time';
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadImage = (imageData: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Image History</h2>
              <p className="text-blue-100">
                {stats.totalImages} images • {formatFileSize(stats.totalSize)} total
                {(searchTerm || dateFilter !== 'all') && (
                  <span className="ml-2">
                    • Showing {filteredItems.length} results
                    {dateFilter !== 'all' && (
                      <span className="ml-1">({getDateFilterLabel(dateFilter)})</span>
                    )}
                  </span>
                )}
              </p>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Date Filter Dropdown */}
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="appearance-none bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg px-4 py-2 pr-8 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-all duration-200 cursor-pointer"
                >
                  <option value="all" className="text-gray-800">All Time</option>
                  <option value="today" className="text-gray-800">Today</option>
                  <option value="week" className="text-gray-800">This Week</option>
                  <option value="month" className="text-gray-800">This Month</option>
                  <option value="year" className="text-gray-800">This Year</option>
                </select>
                <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-100 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search images..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 pr-4 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-blue-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition-all duration-200"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-100 hover:text-white transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              {stats.totalImages > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="px-3 sm:px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 flex items-center gap-2 smooth-transition hover-lift click-feedback"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors duration-200 smooth-transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No images in history</h3>
              <p className="text-gray-500">Process some images to see them appear here</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
              <p className="text-gray-500">Try adjusting your search term</p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 smooth-transition hover-lift click-feedback"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedItems.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] animate-slide-up overflow-hidden"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="relative group aspect-square bg-gray-50">
                    <LazyImage
                      src={item.processedImageData}
                      alt={item.originalFileName}
                      className="w-full h-full object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                      onClick={() => setSelectedImage(item)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-t-xl flex items-end justify-center pb-4">
                      <button
                        onClick={() => setSelectedImage(item)}
                        className="bg-white/90 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 shadow-lg hover:shadow-xl"
                      >
                        <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        View Full Size
                      </button>
                    </div>

                    {/* Image dimensions badge */}
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {item.metadata.width} × {item.metadata.height}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900 truncate text-sm mb-1" title={item.originalFileName}>
                        {item.originalFileName}
                      </h3>
                      <p className="text-xs text-gray-500">{formatDate(item.timestamp)}</p>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-400 mb-4">
                      <span className="bg-gray-100 px-2 py-1 rounded-full">
                        {formatFileSize(item.fileSize)}
                      </span>
                      <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                        {item.metadata.width} × {item.metadata.height}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(item);
                        }}
                        className="flex-1 px-3 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 smooth-transition hover-lift click-feedback shadow-md hover:shadow-lg"
                        title="Edit image"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => downloadImage(item.processedImageData, `${item.originalFileName.split('.')[0]}-processed.png`)}
                        className="px-3 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-medium rounded-lg transition-all duration-200 smooth-transition hover-lift click-feedback shadow-md hover:shadow-lg"
                        title="Download image"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteImage(item.id!)}
                        className="px-3 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-medium rounded-lg transition-all duration-200 smooth-transition hover-lift click-feedback shadow-md hover:shadow-lg"
                        title="Delete image"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredItems.length > itemsPerPage && (
            <div className="flex justify-center items-center mt-8 gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 smooth-transition hover-lift click-feedback"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <span className="px-4 py-2 text-sm text-gray-600">
                Page {currentPage} of {Math.ceil(filteredItems.length / itemsPerPage)}
                {searchTerm && (
                  <span className="text-blue-600 ml-2">
                    ({filteredItems.length} of {historyItems.length} images)
                  </span>
                )}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredItems.length / itemsPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(filteredItems.length / itemsPerPage)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 smooth-transition hover-lift click-feedback"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Clear All Confirmation Dialog */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Clear All History?</h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete all {stats.totalImages} images from your history. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowClearConfirm(false);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Size Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-60 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
              className="absolute top-6 right-6 text-white hover:text-gray-300 z-20 bg-black bg-opacity-50 rounded-full p-2 transition-all duration-200 hover:bg-opacity-70"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image Container */}
            <div
              className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage.processedImageData}
                alt={selectedImage.originalFileName}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Image Info */}
            <div
              className="absolute bottom-6 left-6 bg-black bg-opacity-80 backdrop-blur-sm text-white p-4 rounded-xl max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-semibold text-lg mb-2">{selectedImage.originalFileName}</h4>
              <div className="space-y-1 text-sm text-gray-300">
                <p>{formatDate(selectedImage.timestamp)}</p>
                <p>{selectedImage.metadata.width} × {selectedImage.metadata.height} pixels</p>
                <p>{formatFileSize(selectedImage.fileSize)}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              className="absolute bottom-6 right-6 flex gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(selectedImage.processedImageData, `${selectedImage.originalFileName.split('.')[0]}-processed.png`);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(selectedImage);
                  setSelectedImage(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingImage && isEditModalOpen && (
        <EditModal
          image={editingImage}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingImage(null);
          }}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
