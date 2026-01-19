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

export interface CVSettings {
  templateId: string;
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
}

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
