import AsyncStorage from '@react-native-async-storage/async-storage';

// The Go API is auth-free in the MVP (PRD section 39 / backend section
// 4.1): the client owns a random device id, sends it as X-Device-Id, and
// persists whatever id the server echoes back so history stays attached
// to the same "user" across app restarts.
const STORAGE_KEY = 'mathmotion.device_id';

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string | null> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  cachedDeviceId = stored;
  return stored;
}

export async function saveDeviceId(deviceId: string): Promise<void> {
  cachedDeviceId = deviceId;
  await AsyncStorage.setItem(STORAGE_KEY, deviceId);
}
