import React, { useState, useEffect } from 'react';
import type { ImageFile } from "../App";

interface EditModalProps {
  image: ImageFile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string) => void;
}

const backgroundOptions = [
  { id: 'color', label: 'Solid Color' },
  { id: 'image', label: 'Image' }
];

const effectOptions = [
  { id: 'none', label: 'None' },
  { id: 'blur', label: 'Blur' },
  { id: 'brightness', label: 'Bright' },
  { id: 'contrast', label: 'Contrast' }
];

const predefinedColors = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#00ffff', '#ff00ff', '#808080', '#c0c0c0'
];

const gradientOptions = [
  'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
  'linear-gradient(45deg, #667eea, #764ba2)',
  'linear-gradient(45deg, #f093fb, #f5576c)',
  'linear-gradient(45deg, #4facfe, #00f2fe)'
];

export function EditModal({ image, isOpen, onClose, onSave }: EditModalProps) {
  const [bgType, setBgType] = useState('color');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [customBgImage, setCustomBgImage] = useState<File | null>(null);
  const [selectedEffect, setSelectedEffect] = useState('none');
  const [blurValue, setBlurValue] = useState(50);
  const [brightnessValue, setBrightnessValue] = useState(50);
  const [contrastValue, setContrastValue] = useState(50);
  const [exportUrl, setExportUrl] = useState('');
  const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);

  const processedURL = image.processedFile ? URL.createObjectURL(image.processedFile) : '';

  useEffect(() => {
    if (isOpen) {
      applyChanges();
    }
  }, [bgType, bgColor, customBgImage, selectedEffect, blurValue, brightnessValue, contrastValue, isOpen]);

  const getCurrentEffectValue = () => {
    switch (selectedEffect) {
      case 'blur': return blurValue;
      case 'brightness': return brightnessValue;
      case 'contrast': return contrastValue;
      default: return 50;
    }
  };

  const handleEffectValueChange = (value: number) => {
    switch (selectedEffect) {
      case 'blur': setBlurValue(value); break;
      case 'brightness': setBrightnessValue(value); break;
      case 'contrast': setContrastValue(value); break;
    }
  };

  const getFilterStyle = () => {
    const filters = [];
    if (selectedEffect === 'blur') filters.push(`blur(${blurValue / 10}px)`);
    if (selectedEffect === 'brightness') filters.push(`brightness(${brightnessValue / 50})`);
    if (selectedEffect === 'contrast') filters.push(`contrast(${contrastValue / 50})`);
    return filters.length > 0 ? filters.join(' ') : 'none';
  };

  const applyChanges = async () => {
    if (!image.processedFile) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.src = processedURL;
    await new Promise(resolve => img.onload = resolve);
    
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Apply background
    if (bgType === 'color') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgType === 'image' && customBgImage) {
      const bgImg = new Image();
      bgImg.src = URL.createObjectURL(customBgImage);
      await new Promise(resolve => bgImg.onload = resolve);
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    }
    
    // Draw the processed image
    ctx.drawImage(img, 0, 0);
    
    // Apply effects by redrawing with filters
    if (selectedEffect !== 'none') {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        
        // Apply filter
        tempCtx.filter = getFilterStyle();
        tempCtx.drawImage(canvas, 0, 0);
        
        // Copy back to main canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (bgType === 'color') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (bgType === 'image' && customBgImage) {
          const bgImg = new Image();
          bgImg.src = URL.createObjectURL(customBgImage);
          await new Promise(resolve => bgImg.onload = resolve);
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }
    
    setExportUrl(canvas.toDataURL('image/png'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setCustomBgImage(file);
    }
  };

  const handleSave = async () => {
    let imageToSave = exportUrl;

    // If no changes were made (exportUrl is empty), convert the original processed image to data URL
    if (!exportUrl && image.processedFile) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.src = processedURL;
        await new Promise(resolve => img.onload = resolve);

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        imageToSave = canvas.toDataURL('image/png');
      }
    }

    if (imageToSave) {
      onSave(imageToSave);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Edit Image</h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Background</h3>
              <div className="flex gap-2 mb-4">
                {backgroundOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setBgType(option.id);
                    }}
                    className={`px-3 py-1 rounded ${
                      bgType === option.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {bgType === 'color' && (
                <div>
                  <div className="flex gap-2 mb-2">
                    {predefinedColors.map(color => (
                      <button
                        key={color}
                        onClick={(e) => {
                          e.stopPropagation();
                          setBgColor(color);
                        }}
                        className="w-8 h-8 rounded-full border border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCustomColorPicker(!showCustomColorPicker);
                    }}
                    className="text-sm text-blue-500 hover:text-blue-700"
                  >
                    Custom Color
                  </button>
                  {showCustomColorPicker && (
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => {
                        e.stopPropagation();
                        setBgColor(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 w-full h-10"
                    />
                  )}
                </div>
              )}

              {bgType === 'image' && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full"
                />
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Effects</h3>
              <select
                value={selectedEffect}
                onChange={(e) => {
                  e.stopPropagation();
                  setSelectedEffect(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full p-2 border rounded"
              >
                {effectOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>

              {selectedEffect !== 'none' && (
                <div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={getCurrentEffectValue()}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleEffectValueChange(Number(e.target.value));
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>0</span>
                    <span>{getCurrentEffectValue()}</span>
                    <span>100</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-700 mb-2">Preview</h3>
            <div className="border rounded-lg overflow-hidden">
              <img
                src={exportUrl || processedURL}
                alt="Preview"
                className="w-full object-contain"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
            className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
