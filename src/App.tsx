import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useLiveQuery } from 'dexie-react-hooks';
import { saveAs } from 'file-saver';
import { db } from './lib/db';
import { processImage, getModelInfo } from '../lib/process';
import { EditModal } from './components/EditModal';
import { Images } from './components/Images';
import './index.css';

export interface ImageFile {
  id?: number;
  name: string;
  originalFile: File;
  processedFile?: File;
  processedUrl?: string;
  timestamp: number;
}

interface ModelInfo {
  currentModelId: string;
  isWebGPUSupported: boolean;
  isIOS: boolean;
}

function App() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [backgroundType, setBackgroundType] = useState<'transparent' | 'color' | 'image'>('transparent');
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [editingImage, setEditingImage] = useState<ImageFile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'upload' | 'gallery'>('upload');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get images from database
  const images = useLiveQuery(() => {
    let query = db.images.orderBy('timestamp').reverse();
    
    if (searchTerm) {
      query = query.filter(img => 
        img.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      query = query.filter(img => img.timestamp >= filterDate.getTime());
    }
    
    return query.toArray();
  }, [searchTerm, dateFilter]);

  useEffect(() => {
    // Get model information on component mount
    getModelInfo().then(setModelInfo);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setProcessedImage(null);
      setError(null);
      setCurrentView('upload');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    },
    multiple: false
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setProcessedImage(null);
      setError(null);
      setCurrentView('upload');
    }
  };

  const processSelectedImage = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const result = await processImage(selectedImage, (progress) => {
        setProgress(Math.round(progress * 100));
      });

      setProcessedImage(result);
      
      // Save to database
      const imageFile: ImageFile = {
        name: selectedImage.name,
        originalFile: selectedImage,
        processedFile: result,
        timestamp: Date.now()
      };
      
      await db.images.add(imageFile);
      
    } catch (err) {
      console.error('Processing failed:', err);
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const downloadImage = async (format: 'png' | 'jpg' = 'png') => {
    if (!processedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = URL.createObjectURL(processedImage);
    
    await new Promise(resolve => img.onload = resolve);
    
    canvas.width = img.width;
    canvas.height = img.height;

    // Apply background
    if (backgroundType === 'color') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (backgroundType === 'image' && backgroundImage) {
      const bgImg = new Image();
      bgImg.src = URL.createObjectURL(backgroundImage);
      await new Promise(resolve => bgImg.onload = resolve);
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    }

    // Draw processed image
    ctx.drawImage(img, 0, 0);

    // Download
    canvas.toBlob((blob) => {
      if (blob) {
        const filename = selectedImage?.name.replace(/\.[^/.]+$/, '') || 'processed-image';
        saveAs(blob, `${filename}-bg-removed.${format}`);
      }
    }, `image/${format}`);
  };

  const handleEditImage = (image: ImageFile) => {
    setEditingImage(image);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (editedUrl: string) => {
    if (!editingImage) return;

    // Convert data URL to blob
    const response = await fetch(editedUrl);
    const blob = await response.blob();
    const file = new File([blob], editingImage.name, { type: 'image/png' });

    // Update the image in database
    if (editingImage.id) {
      await db.images.update(editingImage.id, {
        processedFile: file,
        processedUrl: editedUrl
      });
    }

    // If this is the currently selected image, update it
    if (selectedImage?.name === editingImage.name) {
      setProcessedImage(file);
    }
  };

  const clearSelection = () => {
    setSelectedImage(null);
    setProcessedImage(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <button
              onClick={() => setCurrentView('upload')}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">🎨</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-800">BG Remover</h1>
            </button>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Remove backgrounds from images instantly using AI. All processing happens in your browser - your images never leave your device.
          </p>
          
          {/* Model Info */}
          {modelInfo && (
            <div className="mt-4 text-sm text-gray-500">
              Using: {modelInfo.currentModelId} 
              {modelInfo.isWebGPUSupported && ' (WebGPU Accelerated)'}
              {modelInfo.isIOS && ' (iOS Optimized)'}
            </div>
          )}
        </header>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-md">
            <button
              onClick={() => setCurrentView('upload')}
              className={`px-6 py-2 rounded-md transition-colors ${
                currentView === 'upload'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-blue-500'
              }`}
            >
              Upload & Process
            </button>
            <button
              onClick={() => setCurrentView('gallery')}
              className={`px-6 py-2 rounded-md transition-colors ${
                currentView === 'gallery'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-blue-500'
              }`}
            >
              Gallery ({images?.length || 0})
            </button>
          </div>
        </div>

        {currentView === 'upload' ? (
          <div className="max-w-4xl mx-auto">
            {/* Upload Section */}
            {!selectedImage ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="text-6xl">📸</div>
                  <div>
                    <p className="text-xl font-semibold text-gray-700">
                      {isDragActive ? 'Drop your image here' : 'Drag & drop an image here'}
                    </p>
                    <p className="text-gray-500 mt-2">or click to select a file</p>
                  </div>
                  <div className="text-sm text-gray-400">
                    Supports: PNG, JPG, JPEG, GIF, BMP, WebP
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Image Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-4 shadow-md">
                    <h3 className="font-semibold text-gray-700 mb-3">Original</h3>
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={URL.createObjectURL(selectedImage)}
                        alt="Original"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-md">
                    <h3 className="font-semibold text-gray-700 mb-3">Processed</h3>
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                      {processedImage ? (
                        <img
                          src={URL.createObjectURL(processedImage)}
                          alt="Processed"
                          className="w-full h-full object-contain"
                        />
                      ) : isProcessing ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <p className="text-gray-600">Processing... {progress}%</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          Click "Remove Background" to process
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="bg-white rounded-lg p-6 shadow-md">
                  <div className="flex flex-wrap gap-4 justify-center">
                    {!processedImage && !isProcessing && (
                      <button
                        onClick={processSelectedImage}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                        Remove Background
                      </button>
                    )}

                    {processedImage && (
                      <>
                        <button
                          onClick={() => downloadImage('png')}
                          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                        >
                          Download PNG
                        </button>
                        <button
                          onClick={() => downloadImage('jpg')}
                          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                        >
                          Download JPG
                        </button>
                      </>
                    )}

                    <button
                      onClick={clearSelection}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Clear
                    </button>
                  </div>

                  {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-700">{error}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Images
            images={images || []}
            onEdit={handleEditImage}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
          />
        )}

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Edit Modal */}
        {editingImage && (
          <EditModal
            image={editingImage}
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingImage(null);
            }}
            onSave={handleSaveEdit}
          />
        )}
      </div>
    </div>
  );
}

export default App;
