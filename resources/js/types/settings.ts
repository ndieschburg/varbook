export type SettingType = 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'multiselect' | 'color';

export interface SettingOption {
    value: string;
    label: string;
}

export interface SettingValidationRules {
    min?: number;
    max?: number;
    step?: number;
    maxlength?: number;
}

export interface Setting {
    key: string;
    type: SettingType;
    label: string;
    description: string | null;
    value: unknown;
    default_value: unknown;
    system_value: unknown;
    is_overridden: boolean;
    is_user_overridable: boolean;
    validation_rules: SettingValidationRules | null;
    options: SettingOption[] | null;
}

export interface SettingsCategory {
    key: string;
    label: string;
    icon: string;
    sort: number;
    settings: Setting[];
}

export interface SettingsResponse {
    categories: SettingsCategory[];
}

export interface UpdateSettingResponse {
    message: string;
    value: unknown;
}
