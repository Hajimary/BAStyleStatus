export interface BauiOption {
  input_mode: '直接发送' | '覆盖输入' | '尾附输入' | '自动推进';
}

const DefaultSetting: BauiOption = {
  input_mode: '直接发送',
};

const variable_option = {
  type: 'script',
  script_id: typeof getScriptId === 'function' ? getScriptId() : 'baui-script-id',
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

  return true;
}

export async function GetBauiSettings(): Promise<BauiOption> {
  const settings = getVariables(variable_option) || {};

  if (!VerifySettings(settings)) {
    const mergedSettings = { ...DefaultSetting, ...settings };

    // Validate and fallback input_mode
    const validModes = ['直接发送', '覆盖输入', '尾附输入', '自动推进'];
    if (!validModes.includes(mergedSettings.input_mode)) {
      mergedSettings.input_mode = '直接发送';
    }

    await replaceVariables(mergedSettings, variable_option);
    return mergedSettings;
  }

  const mergedSettings = { ...DefaultSetting, ...settings };

  // Validate input_mode even if verify passed
  const validModes = ['直接发送', '覆盖输入', '尾附输入', '自动推进'];
  if (!validModes.includes(mergedSettings.input_mode)) {
    mergedSettings.input_mode = '直接发送';
  }

  // Save if there are any changes
  if (settings.input_mode !== mergedSettings.input_mode) {
    await replaceVariables(mergedSettings, variable_option);
  }

  return mergedSettings;
}

// Export settings instance for global access
export let bauiSettings: BauiOption = DefaultSetting;

export async function initializeBauiSettings(): Promise<void> {
  bauiSettings = await GetBauiSettings();
}