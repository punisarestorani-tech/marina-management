'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PhotoUploadProps {
  onPhotoUploaded: (url: string) => void;
  currentPhotoUrl?: string;
  onPhotoRemoved?: () => void;
  bucketName?: string;
  folderPath?: string;
}

export function PhotoUpload({
  onPhotoUploaded,
  currentPhotoUrl,
  onPhotoRemoved,
  bucketName = 'vessel-photos',
  folderPath = 'boats',
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadToSupabase = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      setError(null);

      const supabase = createClient();

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${folderPath}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setError('Greška pri uploadu: ' + uploadError.message);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      setError('Greška pri uploadu slike');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Molimo izaberite sliku');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Slika mora biti manja od 5MB');
      return;
    }

    // Show preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    // Upload to Supabase
    const url = await uploadToSupabase(file);

    if (url) {
      setPreviewUrl(url);
      onPhotoUploaded(url);
    } else {
      // Revert preview on error
      setPreviewUrl(currentPhotoUrl || null);
    }

    // Clean up
    URL.revokeObjectURL(localPreview);
    event.target.value = '';
  };

  const handleRemovePhoto = () => {
    setPreviewUrl(null);
    setError(null);
    onPhotoRemoved?.();
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview or upload buttons */}
      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Slika plovila"
            className="w-full h-32 object-cover rounded-lg border"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
          {!isUploading && (
            <button
              onClick={handleRemovePhoto}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openCamera}
            disabled={isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Camera className="w-4 h-4 mr-1" />
            )}
            Uslikaj
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openFilePicker}
            disabled={isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-1" />
            )}
            Izaberi
          </Button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
