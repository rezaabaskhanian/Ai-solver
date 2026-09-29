import { useState } from 'react';
import { launchImageLibrary } from 'react-native-image-picker';
import type { CameraPhotoOutput } from 'react-native-vision-camera';

import { toApiError, type ApiError } from '../services/api/apiError';
import { recognizeEquations } from '../services/api/vision';
import { useEntitlementStore } from '../store/useEntitlementStore';
import { useCapturePhoto } from './useCapturePhoto';

export interface RecognizeResult {
  photoUri: string;
  problems: string[];
}

// Orchestrates capture (camera, or a photo picked from the gallery) ->
// recognizeEquations (vision AI reads the photo,
// see backend/go-api/internal/service/vision) and stops there — solving
// happens only after the user picks which recognized problem to solve
// (RecognizedProblemsScreen), per PRD section 8: never solve a scanned
// problem without confirmation.
export function useScanAndRecognize(photoOutput: CameraPhotoOutput) {
  const capturePhoto = useCapturePhoto(photoOutput);
  const [recognizing, setRecognizing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const refreshEntitlement = useEntitlementStore(state => state.refresh);

  // Shared by both sources: `getPhoto` returns null when the user backs
  // out (e.g. closes the gallery), which is not an error.
  const run = async (
    getPhoto: () => Promise<{ base64: string; filePath: string; mediaType?: string } | null>,
  ): Promise<RecognizeResult | null> => {
    setRecognizing(true);
    setError(null);
    try {
      const photo = await getPhoto();
      if (!photo) {
        return null;
      }
      const problems = await recognizeEquations(photo.base64, photo.mediaType);
      return { photoUri: photo.filePath, problems };
    } catch (err) {
      const apiError = toApiError(err);
      if (apiError.code === 'quota_exceeded') {
        // Local entitlement was stale — resync so the paywall replaces
        // the capture button instead of showing a plain error text.
        refreshEntitlement();
      }
      setError(apiError);
      return null;
    } finally {
      setRecognizing(false);
    }
  };

  const recognize = () => run(capturePhoto);

  // Android's system photo picker (no storage permission needed). Large
  // photos are scaled down before upload, like the camera path's JPEG.
  const recognizeFromGallery = () =>
    run(async () => {
      const response = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        maxWidth: 2000,
        maxHeight: 2000,
        quality: 0.85,
        selectionLimit: 1,
      });
      const asset = response.assets?.[0];
      if (response.didCancel || !asset?.base64 || !asset.uri) {
        return null;
      }
      return {
        base64: asset.base64,
        // Same shape as the camera's path (no file:// scheme), which the
        // AR screen uses as its image-tracking target.
        filePath: asset.uri.replace(/^file:\/\//, ''),
        mediaType: asset.type ?? 'image/jpeg',
      };
    });

  return { recognize, recognizeFromGallery, recognizing, error };
}
