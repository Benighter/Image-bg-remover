import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Images } from "./components/Images";
import { HistoryGallery } from "./components/HistoryGallery";
import { Toast } from "./components/Toast";
import { updateImageInHistory } from "./services/historyService";
import { processImages, initializeModel, getModelInfo } from "../../lib/process";
import { saveImageToHistory } from "./services/historyService";

interface AppError {
  message: string;
}

export interface ImageFile {
  id: number;
  file: File;
  processedFile?: File;
  originalProcessedFile?: File; // Keep the original processed file for editing
}

// Sample images from Unsplash
const sampleImages = [
  "https://images.unsplash.com/photo-1601233749202-95d04d5b3c00?q=80&w=2938&auto=format&fit=crop&ixlib=rb-4.0.3",
  "https://images.unsplash.com/photo-1513013156887-d2bf241c8c82?q=80&w=2970&auto=format&fit=crop&ixlib=rb-4.0.3",
  "https://images.unsplash.com/photo-1643490745745-e8ca9a3a1c90?q=80&w=2874&auto=format&fit=crop&ixlib=rb-4.0.3",
  "https://images.unsplash.com/photo-1574158622682-e40e69881006?q=80&w=2333&auto=format&fit=crop&ixlib=rb-4.0.3"
];

// Check if the user is on mobile Safari
const isMobileSafari = () => {
  const ua = window.navigator.userAgent;
  const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
  const webkit = !!ua.match(/WebKit/i);
  const iOSSafari = iOS && webkit && !ua.match(/CriOS/i) && !ua.match(/OPiOS/i) && !ua.match(/FxiOS/i);
  return iOSSafari && 'ontouchend' in document;
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [isWebGPU, setIsWebGPU] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [currentModel, setCurrentModel] = useState<'briaai/RMBG-1.4' | 'Xenova/modnet'>('briaai/RMBG-1.4');
  const [isModelSwitching, setIsModelSwitching] = useState(false);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  useEffect(() => {
    if (isMobileSafari()) {
      // Mobile Safari redirect removed - keeping the app accessible on all devices
      // window.location.href = 'https://bg-mobile.addy.ie';
      // return;
    }

    // Only check iOS on load since that won't change
    const { isIOS: isIOSDevice } = getModelInfo();
    setIsIOS(isIOSDevice);
    setIsLoading(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'h') {
        event.preventDefault();
        setIsHistoryOpen(true);
      }
      if (event.key === 'Escape' && isHistoryOpen) {
        setIsHistoryOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHistoryOpen]);

  const handleModelChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = event.target.value as typeof currentModel;
    setIsModelSwitching(true);
    setError(null);
    try {
      const initialized = await initializeModel(newModel);
      if (!initialized) {
        throw new Error("Failed to initialize new model");
      }
      setCurrentModel(newModel);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Falling back")) {
        setCurrentModel('briaai/RMBG-1.4');
      } else {
        setError({
          message: err instanceof Error ? err.message : "Failed to switch models"
        });
      }
    } finally {
      setIsModelSwitching(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file, index) => ({
      id: Date.now() + index,
      file,
      processedFile: undefined
    }));
    setImages(prev => [...prev, ...newImages]);
    
    // Initialize model if this is the first image
    if (images.length === 0) {
      setIsLoading(true);
      setError(null);
      try {
        const initialized = await initializeModel();
        if (!initialized) {
          throw new Error("Failed to initialize background removal model");
        }
        // Update WebGPU support status after model initialization
        const { isWebGPUSupported } = getModelInfo();
        setIsWebGPU(isWebGPUSupported);
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : "An unknown error occurred"
        });
        setImages([]); // Clear the newly added images if model fails to load
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }
    
    setIsProcessingImages(true);
    for (const image of newImages) {
      try {
        const result = await processImages([image.file]);
        if (result && result.length > 0) {
          setImages(prev => prev.map(img =>
            img.id === image.id
              ? { ...img, processedFile: result[0], originalProcessedFile: result[0] }
              : img
          ));

          // Save to history automatically and update the image ID to match history ID
          try {
            const historyId = await saveImageToHistory(image.file, result[0]);
            // Update the image ID to match the history ID for sync purposes
            setImages(prev => prev.map(img =>
              img.id === image.id
                ? { ...img, id: historyId }
                : img
            ));
            setToast({ message: 'Image saved to history', type: 'success' });
          } catch (historyError) {
            console.error('Error saving to history:', historyError);
            setToast({ message: 'Failed to save to history', type: 'error' });
          }
        }
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }
    setIsProcessingImages(false);
  }, [images.length]);


  const handlePaste = async (event: React.ClipboardEvent) => {
    const clipboardItems = event.clipboardData.items;
    const imageFiles: File[] = [];
    for (const item of clipboardItems) {
      if (item.type.startsWith("image")) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }
    if (imageFiles.length > 0) {
      onDrop(imageFiles);
    }
  };  

  const handleSampleImageClick = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], 'sample-image.jpg', { type: 'image/jpeg' });
      onDrop([file]);
    } catch (error) {
      console.error('Error loading sample image:', error);
    }
  };



  const handleImageEdit = async (id: number, editedImageUrl: string) => {
    try {
      // Convert the edited image URL to a File object
      const response = await fetch(editedImageUrl);
      const blob = await response.blob();
      const editedFile = new File([blob], 'edited-image.png', { type: 'image/png' });

      // Update the image in the main images state (keep originalProcessedFile intact)
      setImages(prev => prev.map(img =>
        img.id === id
          ? { ...img, processedFile: editedFile }
          : img
      ));

      // Also update it in the history
      await updateImageInHistory(id, editedImageUrl);

      // Show success toast
      setToast({ message: 'Image edited successfully!', type: 'success' });
    } catch (error) {
      console.error('Error saving edited image:', error);
      setToast({ message: 'Failed to save edited image', type: 'error' });
    }
  };

  const handleLogoClick = () => {
    // Reset app to initial state (back to dashboard)
    setImages([]);
    setIsHistoryOpen(false);
    setError(null);
    setToast(null);
    setIsProcessingImages(false);
    // Don't reset model or loading states as those are initialization-related
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".mp4"],
    },
  });

  // Remove the full screen error and loading states

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" onPaste={handlePaste}>
      <nav className="bg-white shadow-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleLogoClick}
              className="flex items-center space-x-3 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-2 -m-2 transition-all duration-200 hover:bg-gray-50"
              title="Back to dashboard"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform duration-200">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-200">
                BG Remover
              </h1>
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsHistoryOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl smooth-transition hover-lift click-feedback ${
                  isProcessingImages ? 'animate-pulse-scale' : ''
                }`}
                title="Open History (Ctrl+H)"
              >
                {isProcessingImages ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                History
                {isProcessingImages && (
                  <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
                    Processing...
                  </span>
                )}
              </button>
              {!isIOS && (
                <>
                  <span className="text-gray-600 font-medium">Model:</span>
                  <select
                    value={currentModel}
                    onChange={handleModelChange}
                    className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <option value="briaai/RMBG-1.4">RMBG-1.4 (Cross-browser)</option>
                    {isWebGPU && (
                      <option value="Xenova/modnet">MODNet (WebGPU)</option>
                    )}
                  </select>
                </>
              )}
            </div>
          </div>
          {isIOS && (
            <p className="text-sm text-gray-500 mt-2">
              Using optimized iOS background removal
            </p>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`grid ${images.length === 0 ? 'lg:grid-cols-2 gap-8 lg:gap-12' : 'grid-cols-1'} items-start`}>
          {images.length === 0 && (
            <div className="flex flex-col justify-center items-start animate-fade-in">
              <div className="relative mb-8 w-full group animate-float">
                <img
                  src="hero.png"
                  alt="Surprised man"
                  className="w-full object-cover h-[400px] rounded-2xl shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-gray-800 mb-4 animate-slide-up">
                  Remove Image Background
                </h2>
                <p className="text-xl text-gray-600 mb-4 animate-slide-up animation-delay-100">
                  100% Automatically and Free
                </p>
                <p className="text-gray-500 leading-relaxed animate-slide-up animation-delay-200">
                  Upload your image and let our AI remove the background instantly. Perfect for professional photos, product images, and more.
                </p>

                <div className="mt-8 animate-slide-up animation-delay-300">
                  <p className="text-sm text-gray-400 mb-4">
                    Built with ❤️ by Bennet Nkolele using Transformers.js
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://github.com/Benighter"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all duration-200 transform hover:scale-105 hover:shadow-lg group"
                    >
                      <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      GitHub
                    </a>
                    <a
                      href="https://www.linkedin.com/in/bennet-nkolele-321285249/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 hover:shadow-lg group"
                    >
                      <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn
                    </a>
                    <a
                      href="https://react-personal-portfolio-alpha.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 hover:shadow-lg group"
                    >
                      <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9"/>
                      </svg>
                      Portfolio
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className={images.length === 0 ? '' : 'w-full'}>
            <div
              {...getRootProps()}
              className={`p-8 mb-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-300 ease-in-out bg-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]
                ${isDragAccept ? "border-green-500 bg-green-50 shadow-green-200" : ""}
                ${isDragReject ? "border-red-500 bg-red-50 shadow-red-200" : ""}
                ${isDragActive ? "border-blue-500 bg-blue-50 shadow-blue-200 scale-[1.02]" : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"}
                ${isLoading || isModelSwitching ? "cursor-not-allowed opacity-75" : ""}
              `}
            >
              <input {...getInputProps()} className="hidden" disabled={isLoading || isModelSwitching} />
              <div className="flex flex-col items-center gap-4">
                {isLoading || isModelSwitching ? (
                  <>
                    <div className="relative">
                      <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-2"></div>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-20 animate-pulse"></div>
                    </div>
                    <p className="text-lg text-gray-600 font-medium animate-pulse">
                      {isModelSwitching ? 'Switching models...' : 'Loading background removal model...'}
                    </p>
                    <p className="text-sm text-gray-400">This may take a moment on first load</p>
                  </>
                ) : error ? (
                  <>
                    <div className="relative">
                      <svg className="w-16 h-16 text-red-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-lg text-red-600 font-medium mb-2">{error.message}</p>
                    {currentModel === 'Xenova/modnet' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleModelChange({ target: { value: 'briaai/RMBG-1.4' }} as any);
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Switch to Cross-browser Version
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="relative mb-4">
                      <svg className={`w-16 h-16 text-gray-400 transition-all duration-300 ${isDragActive ? 'scale-110 text-blue-500' : 'hover:text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {isDragActive && (
                        <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20 animate-ping"></div>
                      )}
                    </div>
                    <p className={`text-xl font-semibold transition-all duration-300 ${isDragActive ? 'text-blue-600 scale-105' : 'text-gray-600'}`}>
                      {isDragActive
                        ? "Drop the images here..."
                        : "Drag and drop images here"}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">or click to select files</p>
                    <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-gray-400">
                      <span>Supports:</span>
                      <span className="px-2 py-1 bg-gray-100 rounded">JPG</span>
                      <span className="px-2 py-1 bg-gray-100 rounded">PNG</span>
                      <span className="px-2 py-1 bg-gray-100 rounded">MP4</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {images.length === 0 && (
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl text-gray-700 font-semibold">No image? Try one of these:</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {sampleImages.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => handleSampleImageClick(url)}
                      className="group relative aspect-square overflow-hidden rounded-xl hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transform hover:scale-105"
                    >
                      <img
                        src={url}
                        alt={`Sample ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Click to try
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  All images are processed locally on your device and are not uploaded to any server.
                </p>
              </div>
            )}

            <Images
              images={images}
              onDelete={(id) => setImages(prev => prev.filter(img => img.id !== id))}
              onEdit={handleImageEdit}
            />
          </div>
        </div>
      </main>

      {/* History Gallery Modal */}
      <HistoryGallery
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
