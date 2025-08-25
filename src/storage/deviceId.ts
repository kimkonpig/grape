const DEVICE_ID_STORAGE_KEY = 'grape_device_id';

function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  }
  return deviceId;
}


