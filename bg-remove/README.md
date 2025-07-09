# BG Remover

A powerful React + Vite application that removes backgrounds from images directly in your browser. This app leverages machine learning models through Transformers.js to process media locally, ensuring your files never leave your device.

![BG Remover Interface](public/BG%20Remover%20Interface.png)

## ✨ Before & After Example

<div align="center">
  <img src="public/meta.jpg" alt="Original Image" width="300" />
  <p><em>Original Image</em></p>

  <p>⬇️ <strong>After Background Removal</strong> ⬇️</p>

  <img src="public/meta.jpg" alt="Background Removed" width="300" style="background: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;" />
  <p><em>Background Removed (Transparent)</em></p>
</div>

**Created by Bennet Nkolele**

## Connect with me:
- **GitHub**: [https://github.com/Benighter](https://github.com/Benighter)
- **LinkedIn**: [https://www.linkedin.com/in/bennet-nkolele-321285249/](https://www.linkedin.com/in/bennet-nkolele-321285249/)
- **Portfolio**: [https://react-personal-portfolio-alpha.vercel.app/](https://react-personal-portfolio-alpha.vercel.app/)

## ✨ Features

### 🎯 Core Functionality
- **One-click background removal** for images using advanced AI models
- **Real-time preview** with side-by-side comparison
- **Drag & drop interface** for easy file uploads
- **Multiple image processing** with batch support

### 🎨 Advanced Editing
- **Custom background colors** with predefined color palette
- **Background image uploads** for creative compositions
- **Visual effects** including blur, brightness, and contrast adjustments
- **Multiple edit sessions** on the same image without quality loss

### 📚 History & Management
- **Complete image history** with persistent storage
- **Search and filter** functionality for easy organization
- **Date-based filtering** to find images by time period
- **Lazy loading** and pagination for optimal performance
- **Download and delete** options for each processed image

### 🔒 Privacy & Performance
- **100% local processing** - no server uploads needed
- **Privacy-focused** - all processing happens in your browser
- **Offline capable** once models are loaded
- **Cross-browser compatibility** with WebAssembly fallback

## Technical Implementation

The app implements a cross-browser approach to background removal with optional WebGPU acceleration:

### Default Implementation (All Browsers)
- Uses [RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4), a robust background removal model
- Ensures consistent performance across all modern browsers
- Processes images efficiently using WebAssembly

### Optional WebGPU Acceleration
- For browsers with WebGPU support, offers [MODNet](https://huggingface.co/Xenova/modnet) as an alternative
- Can be enabled through a dropdown when WebGPU is available
- Leverages GPU acceleration for potentially faster processing

Both implementations use Transformers.js to run the machine learning models directly in the browser, eliminating the need for server-side processing.

## 🚀 How It Works

1. **Upload Images**: Drag & drop or click to upload one or multiple images
2. **Automatic Processing**: The RMBG-1.4 AI model automatically removes backgrounds
3. **Real-time Preview**: See before/after comparison with transparent background
4. **Edit & Customize**:
   - Change background colors using the color palette
   - Upload custom background images
   - Apply visual effects (blur, brightness, contrast)
   - Make multiple edits without quality loss
5. **History Management**: All processed images are saved locally with search/filter capabilities
6. **Download**: Export your images with transparent or custom backgrounds

## 📱 User Interface

The app features a clean, modern interface with:
- **Side-by-side image preview** showing original and processed versions
- **Intuitive editing modal** with real-time preview of changes
- **Comprehensive history gallery** with search, filtering, and pagination
- **Responsive design** that works on desktop and mobile devices
- **Toast notifications** for user feedback and status updates

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/Benighter/Image-bg-remover.git
cd Image-bg-remover
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Browser Support

- **Default Experience**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Optional WebGPU**: Available in browsers with WebGPU support (Chrome Canary with WebGPU flags enabled)

## 🛠️ Technical Stack

- **React + Vite** for the frontend framework
- **Transformers.js** for ML model inference
- **RMBG-1.4** as the default cross-browser model
- **IndexedDB (via Dexie.js)** for local image history storage
- **TailwindCSS** for modern, responsive styling
- **TypeScript** for type safety and better development experience

## Credits

Originally based on the [WebGPU background removal demo](https://github.com/huggingface/transformers.js-examples/tree/main/remove-background-webgpu) by [@xenova](https://github.com/xenova) and enhanced by [Addy Osmani](https://github.com/addyosmani).

**Customized and enhanced by Bennet Nkolele**
- GitHub: [https://github.com/Benighter](https://github.com/Benighter)
- LinkedIn: [https://www.linkedin.com/in/bennet-nkolele-321285249/](https://www.linkedin.com/in/bennet-nkolele-321285249/)
- Portfolio: [https://react-personal-portfolio-alpha.vercel.app/](https://react-personal-portfolio-alpha.vercel.app/)

## License

MIT License - feel free to use this in your own projects!
