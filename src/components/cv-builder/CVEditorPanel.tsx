import { CVData, Experience, Education, Certification, Project, Language } from './types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, GripVertical } from 'lucide-react';


interface CVEditorPanelProps {
  data: CVData;
  onChange: (data: CVData) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const CVEditorPanel = ({ data, onChange }: CVEditorPanelProps) => {
  const { language } = useLanguage();
  const isHe = language === 'he';

  const updatePersonalInfo = (field: keyof CVData['personalInfo'], value: string) => {
    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value },
    });
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: generateId(),
      company: '',
      role: '',
      startDate: '',
      endDate: null,
      current: false,
      bullets: [],
    };
    onChange({ ...data, experience: [...data.experience, newExp] });
  };

  const updateExperience = (id: string, field: keyof Experience, value: unknown) => {
    onChange({
      ...data,
      experience: data.experience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    });
  };

  const removeExperience = (id: string) => {
    onChange({ ...data, experience: data.experience.filter((e) => e.id !== id) });
  };

  const addEducation = () => {
    const newEdu: Education = {
      id: generateId(),
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
    };
    onChange({ ...data, education: [...data.education, newEdu] });
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    onChange({
      ...data,
      education: data.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    });
  };

  const removeEducation = (id: string) => {
    onChange({ ...data, education: data.education.filter((e) => e.id !== id) });
  };

  const updateSkills = (type: 'technical' | 'soft', value: string) => {
    const skills = value.split(',').map((s) => s.trim()).filter(Boolean);
    onChange({
      ...data,
      skills: { ...data.skills, [type]: skills },
    });
  };

  const addLanguage = () => {
    const newLang: Language = { name: '', level: 'intermediate' };
    onChange({
      ...data,
      skills: { ...data.skills, languages: [...data.skills.languages, newLang] },
    });
  };

  const updateLanguage = (idx: number, field: keyof Language, value: string) => {
    const newLangs = [...data.skills.languages];
    newLangs[idx] = { ...newLangs[idx], [field]: value };
    onChange({ ...data, skills: { ...data.skills, languages: newLangs } });
  };

  const removeLanguage = (idx: number) => {
    onChange({
      ...data,
      skills: { ...data.skills, languages: data.skills.languages.filter((_, i) => i !== idx) },
    });
  };

  const addProject = () => {
    const newProj: Project = { id: generateId(), name: '', description: '', url: '' };
    onChange({ ...data, projects: [...data.projects, newProj] });
  };

  const updateProject = (id: string, field: keyof Project, value: string) => {
    onChange({
      ...data,
      projects: data.projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    });
  };

  const removeProject = (id: string) => {
    onChange({ ...data, projects: data.projects.filter((p) => p.id !== id) });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4" dir={isHe ? 'rtl' : 'ltr'}>
        <Accordion type="multiple" defaultValue={['personal', 'experience']} className="space-y-2">
          {/* Personal Info */}
          <AccordionItem value="personal" className="border rounded-lg px-3">
            <AccordionTrigger className="font-semibold">
              {isHe ? '👤 פרטים אישיים' : '👤 Personal Info'}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{isHe ? 'שם מלא' : 'Full Name'}</Label>
                  <Input value={data.personalInfo.fullName} onChange={(e) => updatePersonalInfo('fullName', e.target.value)} />
                </div>
                <div>
                  <Label>{isHe ? 'תפקיד' : 'Title'}</Label>
                  <Input value={data.personalInfo.title} onChange={(e) => updatePersonalInfo('title', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{isHe ? 'אימייל' : 'Email'}</Label>
                  <Input type="email" value={data.personalInfo.email} onChange={(e) => updatePersonalInfo('email', e.target.value)} />
                </div>
                <div>
                  <Label>{isHe ? 'טלפון' : 'Phone'}</Label>
                  <Input value={data.personalInfo.phone} onChange={(e) => updatePersonalInfo('phone', e.target.value)} />
                </div>
              </div>
              <div>
                <Label>{isHe ? 'מיקום' : 'Location'}</Label>
                <Input value={data.personalInfo.location} onChange={(e) => updatePersonalInfo('location', e.target.value)} />
              </div>
              <div>
                <Label>{isHe ? 'תקציר מקצועי' : 'Professional Summary'}</Label>
                <Textarea rows={3} value={data.personalInfo.summary} onChange={(e) => updatePersonalInfo('summary', e.target.value)} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Experience */}
          <AccordionItem value="experience" className="border rounded-lg px-3">
            <AccordionTrigger className="font-semibold">
              {isHe ? '💼 ניסיון תעסוקתי' : '💼 Experience'}
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {data.experience.map((exp) => (
                <div key={exp.id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <Button variant="ghost" size="icon" onClick={() => removeExperience(exp.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>{isHe ? 'חברה' : 'Company'}</Label>
                      <Input value={exp.company} onChange={(e) => updateExperience(exp.id, 'company', e.target.value)} />
                    </div>
                    <div>
                      <Label>{isHe ? 'תפקיד' : 'Role'}</Label>
                      <Input value={exp.role} onChange={(e) => updateExperience(exp.id, 'role', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>{isHe ? 'תאריך התחלה' : 'Start Date'}</Label>
                      <Input placeholder="MM/YYYY" value={exp.startDate} onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)} />
                    </div>
                    <div>
                      <Label>{isHe ? 'תאריך סיום' : 'End Date'}</Label>
                      <Input placeholder="MM/YYYY" value={exp.endDate || ''} disabled={exp.current} onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={exp.current} onCheckedChange={(v) => updateExperience(exp.id, 'current', v)} />
                    <Label>{isHe ? 'עובד כאן כעת' : 'Currently working here'}</Label>
                  </div>
                  <div>
                    <Label>{isHe ? 'נקודות (כל שורה = נקודה)' : 'Bullet points (one per line)'}</Label>
                    <Textarea rows={3} value={exp.bullets.join('\n')} onChange={(e) => updateExperience(exp.id, 'bullets', e.target.value.split('\n').filter(Boolean))} />
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={addExperience}>
                <Plus className="w-4 h-4 mr-2" />
                {isHe ? 'הוסף ניסיון' : 'Add Experience'}
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Education */}
          <AccordionItem value="education" className="border rounded-lg px-3">
            <AccordionTrigger className="font-semibold">
              {isHe ? '🎓 השכלה' : '🎓 Education'}
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {data.education.map((edu) => (
                <div key={edu.id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => removeEducation(edu.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div>
                    <Label>{isHe ? 'מוסד לימודים' : 'Institution'}</Label>
                    <Input value={edu.institution} onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>{isHe ? 'תואר' : 'Degree'}</Label>
                      <Input value={edu.degree} onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)} />
                    </div>
                    <div>
                      <Label>{isHe ? 'תחום' : 'Field'}</Label>
                      <Input value={edu.field} onChange={(e) => updateEducation(edu.id, 'field', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>{isHe ? 'שנת התחלה' : 'Start Year'}</Label>
                      <Input value={edu.startDate} onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)} />
                    </div>
                    <div>
                      <Label>{isHe ? 'שנת סיום' : 'End Year'}</Label>
                      <Input value={edu.endDate} onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={addEducation}>
                <Plus className="w-4 h-4 mr-2" />
                {isHe ? 'הוסף השכלה' : 'Add Education'}
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Skills */}
          <AccordionItem value="skills" className="border rounded-lg px-3">
            <AccordionTrigger className="font-semibold">
              {isHe ? '🛠️ כישורים' : '🛠️ Skills'}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div>
                <Label>{isHe ? 'כישורים טכניים (מופרדים בפסיק)' : 'Technical Skills (comma separated)'}</Label>
                <Textarea rows={2} value={data.skills.technical.join(', ')} onChange={(e) => updateSkills('technical', e.target.value)} />
              </div>
              <div>
                <Label>{isHe ? 'כישורים רכים (מופרדים בפסיק)' : 'Soft Skills (comma separated)'}</Label>
                <Textarea rows={2} value={data.skills.soft.join(', ')} onChange={(e) => updateSkills('soft', e.target.value)} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Languages */}
          <AccordionItem value="languages" className="border rounded-lg px-3">
            <AccordionTrigger className="font-semibold">
              {isHe ? '🌍 שפות' : '🌍 Languages'}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              {data.skills.languages.map((lang, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input placeholder={isHe ? 'שפה' : 'Language'} value={lang.name} onChange={(e) => updateLanguage(idx, 'name', e.target.value)} />
                  <select className="border rounded px-2 py-2 text-sm" value={lang.level} onChange={(e) => updateLanguage(idx, 'level', e.target.value)}>
                    <option value="native">{isHe ? 'שפת אם' : 'Native'}</option>
                    <option value="fluent">{isHe ? 'שוטף' : 'Fluent'}</option>
                    <option value="advanced">{isHe ? 'מתקדם' : 'Advanced'}</option>
                    <option value="intermediate">{isHe ? 'בינוני' : 'Intermediate'}</option>
                    <option value="basic">{isHe ? 'בסיסי' : 'Basic'}</option>
                  </select>
                  <Button variant="ghost" size="icon" onClick={() => removeLanguage(idx)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addLanguage}>
                <Plus className="w-4 h-4 mr-1" />
                {isHe ? 'הוסף שפה' : 'Add Language'}
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Projects */}
          <AccordionItem value="projects" className="border rounded-lg px-3">
            <AccordionTrigger className="font-semibold">
              {isHe ? '🚀 פרויקטים' : '🚀 Projects'}
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              {data.projects.map((proj) => (
                <div key={proj.id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => removeProject(proj.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <Input placeholder={isHe ? 'שם הפרויקט' : 'Project Name'} value={proj.name} onChange={(e) => updateProject(proj.id, 'name', e.target.value)} />
                  <Input placeholder="URL" value={proj.url || ''} onChange={(e) => updateProject(proj.id, 'url', e.target.value)} />
                  <Textarea placeholder={isHe ? 'תיאור' : 'Description'} rows={2} value={proj.description} onChange={(e) => updateProject(proj.id, 'description', e.target.value)} />
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={addProject}>
                <Plus className="w-4 h-4 mr-2" />
                {isHe ? 'הוסף פרויקט' : 'Add Project'}
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </ScrollArea>
  );
};
