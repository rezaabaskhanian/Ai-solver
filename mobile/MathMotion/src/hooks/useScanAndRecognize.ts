import { useState } from 'react';
import type { CameraPhotoOutput } from 'react-native-vision-camera';

import { toApiError, type ApiError } from '../services/api/apiError';
import { recognizeEquations } from '../services/api/vision';
import { useEntitlementStore } from '../store/useEntitlementStore';
import { useCapturePhoto } from './useCapturePhoto';

export interface RecognizeResult {
  photoUri: string;
  problems: string[];
}

// Orchestrates capture -> recognizeEquations (vision AI reads the photo,
// see backend/go-api/internal/service/vision) and stops there — solving
// happens only after the user picks which recognized problem to solve
// (RecognizedProblemsScreen), per PRD section 8: never solve a scanned
// problem without confirmation.
export function useScanAndRecognize(photoOutput: CameraPhotoOutput) {
  const capturePhoto = useCapturePhoto(photoOutput);
  const [recognizing, setRecognizing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const refreshEntitlement = useEntitlementStore(state => state.refresh);

  const recognize = async (): Promise<RecognizeResult | null> => {
    setRecognizing(true);
    setError(null);
    try {
      const photo = await capturePhoto();
      const problems = await recognizeEquations(photo.base64);
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

  return { recognize, recognizing, error };
}
