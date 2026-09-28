import { useCallback } from 'react';
import type { CameraPhotoOutput } from 'react-native-vision-camera';

import { arrayBufferToBase64 } from '../utils/base64';

export interface CapturedPhoto {
  base64: string;
  /** Local filesystem path (not a file:// URL) — usable as an AR image
   * tracking target source (see ArSolutionScreen). */
  filePath: string;
}

// Wraps a single photoOutput.capturePhoto() call: reads the photo two
// ways (raw bytes for the /recognize upload, a temp file path for the
// AR tracking target) before disposing it, since a Photo's native
// memory must be released promptly (see Photo.dispose() docs).
export function useCapturePhoto(photoOutput: CameraPhotoOutput) {
  return useCallback(async (): Promise<CapturedPhoto> => {
    const photo = await photoOutput.capturePhoto({}, {});
    try {
      const [fileData, filePath] = await Promise.all([
        photo.getFileDataAsync(),
        photo.saveToTemporaryFileAsync(),
      ]);
      return { base64: arrayBufferToBase64(fileData), filePath };
    } finally {
      photo.dispose();
    }
  }, [photoOutput]);
}
