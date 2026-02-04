export interface PersonalInfo {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  photo?: string;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  bullets: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface Language {
  name: string;
  level: 'native' | 'fluent' | 'advanced' | 'intermediate' | 'basic';
}

export interface Skills {
  technical: string[];
  soft: string[];
  languages: Language[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  url?: string;
}

export type FontFamily = 'inter' | 'roboto' | 'open-sans' | 'heebo' | 'assistant' | 'playfair' | 'lora';
export type ColorPreset = 'default' | 'professional' | 'creative' | 'minimal' | 'bold' | 'elegant';
export type Spacing = 'compact' | 'normal' | 'spacious';
export type Orientation = 'portrait' | 'landscape';

export interface CVSettings {
  templateId: string;
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: FontFamily;
  colorPreset: ColorPreset;
  spacing: Spacing;
  orientation: Orientation;
}

export const colorPresets: Record<ColorPreset, { primary: string; secondary: string; accent: string; name: string; nameHe: string }> = {
  default: { primary: '#3b82f6', secondary: '#64748b', accent: '#10b981', name: 'Modern Blue', nameHe: 'כחול מודרני' },
  professional: { primary: '#1e3a5f', secondary: '#374151', accent: '#0891b2', name: 'Professional Navy', nameHe: 'כחול עסקי' },
  creative: { primary: '#8b5cf6', secondary: '#6366f1', accent: '#ec4899', name: 'Creative Purple', nameHe: 'סגול יצירתי' },
  minimal: { primary: '#374151', secondary: '#6b7280', accent: '#9ca3af', name: 'Minimal Gray', nameHe: 'אפור מינימלי' },
  bold: { primary: '#dc2626', secondary: '#1f2937', accent: '#f97316', name: 'Bold Red', nameHe: 'אדום נועז' },
  elegant: { primary: '#0d9488', secondary: '#115e59', accent: '#14b8a6', name: 'Elegant Teal', nameHe: 'טורקיז אלגנטי' },
};

export const fontFamilies: Record<FontFamily, { name: string; nameHe: string; stack: string }> = {
  inter: { name: 'Inter', nameHe: 'אינטר', stack: "'Inter', sans-serif" },
  roboto: { name: 'Roboto', nameHe: 'רובוטו', stack: "'Roboto', sans-serif" },
  'open-sans': { name: 'Open Sans', nameHe: 'אופן סאנס', stack: "'Open Sans', sans-serif" },
  heebo: { name: 'Heebo', nameHe: 'חיבו', stack: "'Heebo', sans-serif" },
  assistant: { name: 'Assistant', nameHe: 'אסיסטנט', stack: "'Assistant', sans-serif" },
  playfair: { name: 'Playfair Display', nameHe: 'פלייפייר', stack: "'Playfair Display', serif" },
  lora: { name: 'Lora', nameHe: 'לורה', stack: "'Lora', serif" },
};

export interface CVData {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: Skills;
  certifications: Certification[];
  projects: Project[];
  settings: CVSettings;
}

export const defaultCVData: CVData = {
  personalInfo: {
    fullName: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
  },
  experience: [],
  education: [],
  skills: {
    technical: [],
    soft: [],
    languages: [],
  },
  certifications: [],
  projects: [],
  settings: {
    templateId: 'modern-tech',
    accentColor: '#3b82f6',
    fontSize: 'medium',
    fontFamily: 'inter',
    colorPreset: 'default',
    spacing: 'normal',
    orientation: 'portrait',
  },
};

export interface TemplateProps {
  data: CVData;
  scale?: number;
}

export interface ATSScore {
  overall: number;
  sections: {
    name: string;
    score: number;
    suggestions: string[];
  }[];
}
