// Storage mode enum
export enum StorageMode {
  TAVERN_HELPER = 'tavern_helper',
  LOCAL_STORAGE = 'local_storage'
}

// Configuration interface
export interface BauiOption {
  input_mode: '直接发送' | '覆盖输入' | '尾附输入' | '自动推进';
  chars_per_second: number;
  auto_play_delay: number; // 自动播放延迟（毫秒）
}

// Default settings
const DefaultSetting: BauiOption = {
  input_mode: '直接发送',
  chars_per_second: 10,
  auto_play_delay: 2000, // 默认2秒
};

// Current storage mode (default to localStorage)
let currentStorageMode: StorageMode = StorageMode.LOCAL_STORAGE;

// LocalStorage key
const LOCAL_STORAGE_KEY = 'baui_settings';

// TavernHelper variable option
const variable_option = {
  type: 'script',
  script_id: typeof getScriptId === 'function' ? 'baui-script-id' : 'baui-script-id',
} as const;

export function VerifySettings(settings: any): settings is BauiOption {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  if (!('input_mode' in settings)) {
    return false;
  }

  const validModes = ['直接发送', '覆盖输入', '尾附输入', '自动推进'];
  if (!validModes.includes(settings.input_mode)) {
    return false;
  }

  if ('chars_per_second' in settings) {
    if (typeof settings.chars_per_second !== 'number' ||
        settings.chars_per_second <= 0 ||
        settings.chars_per_second > 100) {
      return false;
    }
  }

  if ('auto_play_delay' in settings) {
    if (typeof settings.auto_play_delay !== 'number' ||
        settings.auto_play_delay < 500 ||
        settings.auto_play_delay > 10000) {
      return false;
    }
  }

  return true;
}

// Get settings from TavernHelper
async function getSettingsFromTavernHelper(): Promise<BauiOption | null> {
  try {
    if (typeof getVariables === 'function') {
      const settings = getVariables(variable_option);
      if (VerifySettings(settings)) {
        return settings;
      }
    }
  } catch (error) {
    console.log('Failed to get settings from TavernHelper:', error);
  }
  return null;
}

// Set settings to TavernHelper
async function setSettingsToTavernHelper(settings: BauiOption): Promise<boolean> {
  try {
    if (typeof replaceVariables === 'function') {
      await replaceVariables(settings, variable_option);
      return true;
    }
  } catch (error) {
    console.log('Failed to save settings to TavernHelper:', error);
  }
  return false;
}

// Get settings from localStorage
function getSettingsFromLocalStorage(): BauiOption | null {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const settings = JSON.parse(stored);
      if (VerifySettings(settings)) {
        return settings;
      }
    }
  } catch (error) {
    console.log('Failed to get settings from localStorage:', error);
  }
  return null;
}

// Set settings to localStorage
function setSettingsToLocalStorage(settings: BauiOption): boolean {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.log('Failed to save settings to localStorage:', error);
  }
  return false;
}

// Validate and normalize settings
function validateAndNormalizeSettings(settings: Partial<BauiOption>): BauiOption {
  const mergedSettings = { ...DefaultSetting, ...settings };

  // Validate input_mode
  const validModes = ['直接发送', '覆盖输入', '尾附输入', '自动推进'];
  if (!validModes.includes(mergedSettings.input_mode)) {
    mergedSettings.input_mode = '直接发送';
  }

  // Validate chars_per_second
  if (typeof mergedSettings.chars_per_second !== 'number' ||
      mergedSettings.chars_per_second <= 0 ||
      mergedSettings.chars_per_second > 100) {
    mergedSettings.chars_per_second = 10;
  }

  // Validate auto_play_delay
  if (typeof mergedSettings.auto_play_delay !== 'number' ||
      mergedSettings.auto_play_delay < 500 ||
      mergedSettings.auto_play_delay > 10000) {
    mergedSettings.auto_play_delay = 2000;
  }

  return mergedSettings;
}

// Public API: Get settings
export async function getSettings(mode?: StorageMode): Promise<BauiOption> {
  const storageMode = mode || currentStorageMode;
  let settings: BauiOption | null = null;

  if (storageMode === StorageMode.TAVERN_HELPER) {
    settings = await getSettingsFromTavernHelper();
  } else {
    settings = getSettingsFromLocalStorage();
  }

  // If no settings found or invalid, use defaults
  if (!settings) {
    settings = DefaultSetting;
  }

  return validateAndNormalizeSettings(settings);
}

// Public API: Set settings
export async function setSettings(settings: BauiOption, mode?: StorageMode): Promise<boolean> {
  const storageMode = mode || currentStorageMode;
  const validatedSettings = validateAndNormalizeSettings(settings);

  let success = false;
  if (storageMode === StorageMode.TAVERN_HELPER) {
    success = await setSettingsToTavernHelper(validatedSettings);
  } else {
    success = setSettingsToLocalStorage(validatedSettings);
  }

  // Update global settings object if save was successful
  if (success) {
    Object.assign(bauiSettings, validatedSettings);
  }

  return success;
}

// Set storage mode
export function setStorageMode(mode: StorageMode): void {
  currentStorageMode = mode;
}

// Get current storage mode
export function getStorageMode(): StorageMode {
  return currentStorageMode;
}

// Legacy function for compatibility
export async function GetBauiSettings(): Promise<BauiOption> {
  return getSettings();
}

// Export settings instance for global access
export let bauiSettings: BauiOption = DefaultSetting;

export async function initializeBauiSettings(): Promise<void> {
  bauiSettings = await getSettings();
}
