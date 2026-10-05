import { Platform } from 'react-native';
import Constants from 'expo-constants';

// API base URL — dynamically extract the Metro host IP if running on a physical phone
const getDefaultApiUrl = () => {
  // 1. Explicit environment variable if set and not default localhost/emulator
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1') && !envUrl.includes('10.0.2.2')) {
    return envUrl;
  }

  // 2. Automatically extract computer LAN IP from Expo's Metro hostUri
  // When Expo Go connects, hostUri is "192.168.0.205:8081"
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:3000`;
    }
  }

  // 3. Fallback to your computer's local Wi-Fi IP (192.168.0.205)
  return 'http://192.168.0.205:3000';
};

export const API_URL = getDefaultApiUrl();

export const APP_NAME = 'PG SAS';

// Token storage key in SecureStore
export const TOKEN_KEY = 'pg_sas_access_token';
export const USER_KEY = 'pg_sas_user';
