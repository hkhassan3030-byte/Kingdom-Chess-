import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export interface AppVersionInfo {
  appName: string;
  packageId: string;
  versionName: string;
  versionCode: string;
}

const FALLBACK_INFO: AppVersionInfo = {
  appName: 'Kingdom Chess',
  packageId: 'com.kingdomchess.game',
  versionName: typeof __APP_VERSION__ === 'string' && __APP_VERSION__ ? __APP_VERSION__ : '1.0.0',
  versionCode:
    typeof __APP_VERSION_CODE__ === 'number' && Number.isFinite(__APP_VERSION_CODE__)
      ? String(__APP_VERSION_CODE__)
      : '1',
};

let cachedNativeInfo: AppVersionInfo | null = null;

export function getBuildVersionInfo(): AppVersionInfo {
  return cachedNativeInfo ?? FALLBACK_INFO;
}

export async function getInstalledAppVersionInfo(): Promise<AppVersionInfo> {
  if (cachedNativeInfo) return cachedNativeInfo;
  if (!Capacitor.isNativePlatform()) {
    return FALLBACK_INFO;
  }
  try {
    const info = await CapacitorApp.getInfo();
    cachedNativeInfo = {
      appName: info.name || FALLBACK_INFO.appName,
      packageId: info.id || FALLBACK_INFO.packageId,
      versionName: info.version || FALLBACK_INFO.versionName,
      versionCode: info.build || FALLBACK_INFO.versionCode,
    };
    return cachedNativeInfo;
  } catch {
    return FALLBACK_INFO;
  }
}
