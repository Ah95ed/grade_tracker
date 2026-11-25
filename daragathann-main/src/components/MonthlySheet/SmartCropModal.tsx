import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Crop,
  RotateCw,
  Sparkles,
  Maximize2,
  Check,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Scissors,
} from 'lucide-react';

export interface ImageUploadItem {
  id: string;
  file: File;
  previewUrl: string;
  base64Data: string;
  mimeType: string;
}

interface CropRect {
  x: number; // 0 to 1 (percentage of container width)
  y: number; // 0 to 1 (percentage of container height)
  w: number; // 0 to 1
  h: number; // 0 to 1
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  images: ImageUploadItem[];
  activeImageIndex?: number;
  onApplyCrop: (
    croppedBase64: string,
    imageIndex: number,
    analyzeImmediately: boolean
  ) => void;
}

export const SmartCropModal: React.FC<Props> = ({
  isOpen,
  onClose,
  images,
  activeImageIndex = 0,
  onApplyCrop,
}) => {
  const [currentIdx, setCurrentIdx] = useState(activeImageIndex);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270

  // Normalized crop rectangle (0 to 1)
  const [crop, setCrop] = useState<CropRect>({
    x: 0.05,
    y: 0.08,
    w: 0.9,
    h: 0.84,
  });

  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    crop: CropRect;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIdx(Math.min(activeImageIndex, Math.max(0, images.length - 1)));
      setRotation(0);
      setCrop({
        x: 0.04,
        y: 0.06,
        w: 0.92,
        h: 0.88,
      });
    }
  }, [isOpen, activeImageIndex, images.length]);

  const currentImage = images[currentIdx];

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    // Reset crop to standard area on rotate to avoid out-of-bounds
    setCrop({
      x: 0.05,
      y: 0.05,
      w: 0.9,
      h: 0.9,
    });
  };

  // Quick preset selections
  const applyPreset = (type: 'all' | 'top' | 'bottom' | 'center') => {
    switch (type) {
      case 'all':
        setCrop({ x: 0.02, y: 0.02, w: 0.96, h: 0.96 });
        break;
      case 'top':
        setCrop({ x: 0.03, y: 0.04, w: 0.94, h: 0.48 });
        break;
      case 'bottom':
        setCrop({ x: 0.03, y: 0.48, w: 0.94, h: 0.48 });
        break;
      case 'center':
        setCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
        break;
    }
  };

  // Pointer drag handling for moving and resizing the crop box
  const handlePointerDown = (
    e: React.PointerEvent,
    handleType: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    setActiveHandle(handleType);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      crop: { ...crop },
    };
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!activeHandle || !dragStartRef.current || !containerRef.current) return;

      const container = containerRef.current.getBoundingClientRect();
      const dx = (e.clientX - dragStartRef.current.pointerX) / container.width;
      const dy = (e.clientY - dragStartRef.current.pointerY) / container.height;

      const start = dragStartRef.current.crop;
      const minSize = 0.08; // minimum 8% of container

      let nextX = start.x;
      let nextY = start.y;
      let nextW = start.w;
      let nextH = start.h;

      if (activeHandle === 'move') {
        nextX = Math.max(0, Math.min(1 - start.w, start.x + dx));
        nextY = Math.max(0, Math.min(1 - start.h, start.y + dy));
      } else {
        // Resize handles
        if (activeHandle.includes('w')) {
          const right = start.x + start.w;
          nextX = Math.max(0, Math.min(right - minSize, start.x + dx));
          nextW = right - nextX;
        }
        if (activeHandle.includes('e')) {
          nextW = Math.max(minSize, Math.min(1 - start.x, start.w + dx));
        }
        if (activeHandle.includes('n')) {
          const bottom = start.y + start.h;
          nextY = Math.max(0, Math.min(bottom - minSize, start.y + dy));
          nextH = bottom - nextY;
        }
        if (activeHandle.includes('s')) {
          nextH = Math.max(minSize, Math.min(1 - start.y, start.h + dy));
        }
      }

      setCrop({
        x: Math.max(0, Math.min(1 - minSize, nextX)),
        y: Math.max(0, Math.min(1 - minSize, nextY)),
        w: Math.max(minSize, Math.min(1 - nextX, nextW)),
        h: Math.max(minSize, Math.min(1 - nextY, nextH)),
      });
    },
    [activeHandle]
  );

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeHandle) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setActiveHandle(null);
      dragStartRef.current = null;
    }
  };

  // Generate cropped base64 image slice
  const generateCroppedImage = async (): Promise<string> => {
    if (!currentImage) return '';

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Create an intermediate canvas for rotated source if needed
        const rotCanvas = document.createElement('canvas');
        const rotCtx = rotCanvas.getContext('2d');
        if (!rotCtx) {
          resolve(currentImage.base64Data);
          return;
        }

        const isSideways = rotation === 90 || rotation === 270;
        rotCanvas.width = isSideways ? img.naturalHeight : img.naturalWidth;
        rotCanvas.height = isSideways ? img.naturalWidth : img.naturalHeight;

        rotCtx.save();
        rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
        rotCtx.rotate((rotation * Math.PI) / 180);
        rotCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        rotCtx.restore();

        // Now crop from rotCanvas according to crop rect
        const sourceX = Math.round(crop.x * rotCanvas.width);
        const sourceY = Math.round(crop.y * rotCanvas.height);
        const sourceW = Math.max(20, Math.round(crop.w * rotCanvas.width));
        const sourceH = Math.max(20, Math.round(crop.h * rotCanvas.height));

        // Output canvas max limit to ensure crisp readability
        const maxOut = 2600;
        let outW = sourceW;
        let outH = sourceH;
        if (outW > maxOut || outH > maxOut) {
          if (outW > outH) {
            outH = Math.round((outH * maxOut) / outW);
            outW = maxOut;
          } else {
            outW = Math.round((outW * maxOut) / outH);
            outH = maxOut;
          }
        }

        const outCanvas = document.createElement('canvas');
        outCanvas.width = outW;
        outCanvas.height = outH;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) {
          resolve(currentImage.base64Data);
          return;
        }

        outCtx.imageSmoothingEnabled = true;
        outCtx.imageSmoothingQuality = 'high';
        outCtx.fillStyle = '#ffffff';
        outCtx.fillRect(0, 0, outW, outH);

        outCtx.drawImage(
          rotCanvas,
          sourceX,
          sourceY,
          sourceW,
          sourceH,
          0,
          0,
          outW,
          outH
        );

        const dataUrl = outCanvas.toDataURL('image/jpeg', 0.92);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('فشل قراءة الصورة'));
      img.src = currentImage.previewUrl || currentImage.base64Data;
    });
  };

  const handleApply = async (analyzeImmediately: boolean) => {
    try {
      const croppedData = await generateCroppedImage();
      onApplyCrop(croppedData, currentIdx, analyzeImmediately);
      onClose();
    } catch (err) {
      console.error('Error generating cropped slice:', err);
    }
  };

  if (!isOpen || !currentImage) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200 text-right select-none">
      <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[96dvh] flex flex-col overflow-hidden my-auto">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>التصحيح الذكي وتحديد منطقة الجدول (Crop)</span>
                {images.length > 1 && (
                  <span className="text-[11px] font-normal text-slate-400">
                    (ورقة {currentIdx + 1} من {images.length})
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                اسحب المربع لتحديد جدول أسماء الطلاب والدرجات فقط وتجاوز الحواف غير الواضحة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRotate}
              className="p-2 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-600"
              title="تدوير الصورة 90 درجة مع اتجاه عقارب الساعة"
            >
              <RotateCw className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">تدوير 90°</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Multi-image thumbnail selector (if multiple images uploaded) */}
        {images.length > 1 && (
          <div className="px-4 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-xs text-slate-400 font-semibold whitespace-nowrap ml-2">
              اختر الورقة لتحديد منطقتها:
            </span>
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => {
                  setCurrentIdx(i);
                  setRotation(0);
                }}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  i === currentIdx
                    ? 'bg-emerald-600 text-white shadow-xs border border-emerald-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <span>ورقة #{i + 1}</span>
              </button>
            ))}
          </div>
        )}

        {/* Toolbar: Presets & Tips */}
        <div className="px-4 py-2.5 bg-slate-800/40 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-bold ml-1">تحديد سريع:</span>
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
            >
              كامل الورقة
            </button>
            <button
              type="button"
              onClick={() => applyPreset('center')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
            >
              الجدول بالوسط
            </button>
            <button
              type="button"
              onClick={() => applyPreset('top')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
            >
              النصف العلوي
            </button>
            <button
              type="button"
              onClick={() => applyPreset('bottom')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
            >
              النصف السفلي
            </button>
          </div>

          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <ZoomIn className="w-3.5 h-3.5" />
            <span>يمكنك سحب أركان المربع الأخضر للتكبير أو التحريك</span>
          </div>
        </div>

        {/* Interactive Crop Viewport */}
        <div className="flex-1 bg-slate-950/90 overflow-hidden relative flex items-center justify-center p-3 sm:p-5 min-h-[300px]">
          <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative max-w-full max-h-[58dvh] overflow-hidden rounded-2xl shadow-2xl border border-slate-700/80 inline-block touch-none select-none"
          >
            {/* Display Image with Dynamic CSS Rotation */}
            <img
              ref={imageRef}
              src={currentImage.previewUrl || currentImage.base64Data}
              alt="كشف الدرجات"
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
              className="max-w-full max-h-[58dvh] object-contain block pointer-events-none transition-transform duration-200"
            />

            {/* Darkened overlay for areas outside the crop rectangle */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top Mask */}
              <div
                className="absolute top-0 left-0 right-0 bg-black/60"
                style={{ height: `${crop.y * 100}%` }}
              />
              {/* Bottom Mask */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-black/60"
                style={{ height: `${(1 - (crop.y + crop.h)) * 100}%` }}
              />
              {/* Left Mask */}
              <div
                className="absolute left-0 bg-black/60"
                style={{
                  top: `${crop.y * 100}%`,
                  height: `${crop.h * 100}%`,
                  width: `${crop.x * 100}%`,
                }}
              />
              {/* Right Mask */}
              <div
                className="absolute right-0 bg-black/60"
                style={{
                  top: `${crop.y * 100}%`,
                  height: `${crop.h * 100}%`,
                  width: `${(1 - (crop.x + crop.w)) * 100}%`,
                }}
              />
            </div>

            {/* Interactive Crop Box Overlay */}
            <div
              style={{
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.w * 100}%`,
                height: `${crop.h * 100}%`,
              }}
              onPointerDown={(e) => handlePointerDown(e, 'move')}
              className="absolute border-2 border-emerald-400 bg-emerald-500/10 cursor-move shadow-[0_0_0_1px_rgba(255,255,255,0.4)]"
            >
              {/* Grid guide lines inside selection (Rule of Thirds) */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-white" />
                <div className="border-r border-white" />
                <div />
              </div>

              {/* Center Drag Badge */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="px-2 py-0.5 bg-black/70 text-emerald-300 text-[10px] font-bold rounded-md backdrop-blur-xs shadow-xs border border-emerald-500/40">
                  منطقة التحليل الذكي
                </span>
              </div>

              {/* 8 Resize Handles */}
              {/* Corner Handles */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'nw')}
                className="absolute -top-2 -left-2 w-4 h-4 bg-emerald-400 border-2 border-slate-900 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'ne')}
                className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-400 border-2 border-slate-900 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'se')}
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-emerald-400 border-2 border-slate-900 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'sw')}
                className="absolute -bottom-2 -left-2 w-4 h-4 bg-emerald-400 border-2 border-slate-900 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
              />

              {/* Edge Handles */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'n')}
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-2.5 bg-emerald-300 border border-slate-900 rounded-full cursor-ns-resize"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 's')}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-2.5 bg-emerald-300 border border-slate-900 rounded-full cursor-ns-resize"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'w')}
                className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-6 w-2.5 bg-emerald-300 border border-slate-900 rounded-full cursor-ew-resize"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'e')}
                className="absolute -right-1.5 top-1/2 -translate-y-1/2 h-6 w-2.5 bg-emerald-300 border border-slate-900 rounded-full cursor-ew-resize"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-800/90 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleApply(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-600"
              title="تطبيق القص على الصورة دون بدء الاستخراج فوراً"
            >
              حفظ القص فقط
            </button>

            <button
              type="button"
              onClick={() => handleApply(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer border border-emerald-400"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>استخراج الأسماء والدرجات من هذه المنطقة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
