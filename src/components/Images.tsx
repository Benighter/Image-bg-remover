import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import { db } from '../lib/db';
import type { ImageFile } from '../App';

interface ImagesProps {
  images: ImageFile[];
  onEdit: (image: ImageFile) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  dateFilter: string;
  onDateFilterChange: (filter: string) => void;
}

export function Images({ 
  images, 
  onEdit, 
  searchTerm, 
  onSearchChange, 
  dateFilter, 
  onDateFilterChange 
}: ImagesProps) {
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleSelectImage = (id: number) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedImages(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map(img => img.id!)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedImages.size === 0) return;
    
    if (confirm(`Delete ${selectedImages.size} selected image(s)?`)) {
      await db.images.bulkDelete(Array.from(selectedImages));
      setSelectedImages(new Set());
    }
  };

  const handleDownloadImage = async (image: ImageFile, format: 'png' | 'jpg' = 'png') => {
    if (!image.processedFile) return;

    const blob = image.processedFile;
    const filename = image.name.replace(/\.[^/.]+$/, '') || 'processed-image';
    saveAs(blob, `${filename}-bg-removed.${format}`);
  };

  const handleDeleteImage = async (id: number) => {
    if (confirm('Delete this image?')) {
      await db.images.delete(id);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getImageUrl = (image: ImageFile) => {
    if (image.processedUrl) return image.processedUrl;
    if (image.processedFile) return URL.createObjectURL(image.processedFile);
    return URL.createObjectURL(image.originalFile);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Image Gallery</h2>
            <p className="text-gray-600">{images.length} processed images</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search images..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </div>
            </div>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => onDateFilterChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            {/* View Mode */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'grid' ? 'bg-white shadow' : ''
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'list' ? 'bg-white shadow' : ''
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {images.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedImages.size === images.length && images.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">
                    Select All ({selectedImages.size} selected)
                  </span>
                </label>
              </div>

              {selectedImages.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Delete Selected ({selectedImages.size})
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Images */}
      {images.length === 0 ? (
        <div className="bg-white rounded-lg p-12 shadow-md text-center">
          <div className="text-6xl mb-4">📷</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No images yet</h3>
          <p className="text-gray-500">
            {searchTerm || dateFilter !== 'all' 
              ? 'No images match your search criteria'
              : 'Upload and process your first image to get started'
            }
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'image-grid' : 'space-y-4'}>
          {images.map((image) => (
            <div
              key={image.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
                viewMode === 'list' ? 'flex' : ''
              }`}
            >
              {/* Image */}
              <div className={`relative ${viewMode === 'list' ? 'w-32 h-32 flex-shrink-0' : 'aspect-square'}`}>
                <img
                  src={getImageUrl(image)}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
                
                {/* Selection checkbox */}
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedImages.has(image.id!)}
                    onChange={() => handleSelectImage(image.id!)}
                    className="w-4 h-4 rounded"
                  />
                </div>

                {/* Quick actions overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(image)}
                      className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDownloadImage(image)}
                      className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full transition-colors"
                      title="Download"
                    >
                      ⬇️
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-800 truncate" title={image.name}>
                    {image.name}
                  </h3>
                  <button
                    onClick={() => handleDeleteImage(image.id!)}
                    className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>

                <p className="text-sm text-gray-500 mb-3">
                  {formatDate(image.timestamp)}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(image)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDownloadImage(image, 'png')}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
