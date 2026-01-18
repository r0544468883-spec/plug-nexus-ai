import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Search, X, MapPin, Briefcase, DollarSign } from 'lucide-react';

export interface JobFiltersState {
  search: string;
  location: string;
  jobType: string;
  salaryMin: number;
  salaryMax: number;
}

interface JobFiltersProps {
  filters: JobFiltersState;
  onFiltersChange: (filters: JobFiltersState) => void;
  onClearFilters: () => void;
}

const JOB_TYPES = [
  { value: 'full-time', labelEn: 'Full-time', labelHe: 'משרה מלאה' },
  { value: 'part-time', labelEn: 'Part-time', labelHe: 'משרה חלקית' },
  { value: 'contract', labelEn: 'Contract', labelHe: 'חוזה' },
  { value: 'freelance', labelEn: 'Freelance', labelHe: 'פרילנס' },
  { value: 'internship', labelEn: 'Internship', labelHe: 'התמחות' },
];

const LOCATIONS = [
  { value: 'tel-aviv', labelEn: 'Tel Aviv', labelHe: 'תל אביב' },
  { value: 'jerusalem', labelEn: 'Jerusalem', labelHe: 'ירושלים' },
  { value: 'haifa', labelEn: 'Haifa', labelHe: 'חיפה' },
  { value: 'remote', labelEn: 'Remote', labelHe: 'עבודה מרחוק' },
  { value: 'hybrid', labelEn: 'Hybrid', labelHe: 'היברידי' },
];

export function JobFilters({ filters, onFiltersChange, onClearFilters }: JobFiltersProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';

  const hasActiveFilters = filters.search || filters.location || filters.jobType || 
    filters.salaryMin > 0 || filters.salaryMax < 100000;

  const updateFilter = <K extends keyof JobFiltersState>(key: K, value: JobFiltersState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <Search className="w-3.5 h-3.5" />
              {isHebrew ? 'חיפוש' : 'Search'}
            </Label>
            <Input
              placeholder={isHebrew ? 'חפש משרות, חברות...' : 'Search jobs, companies...'}
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="h-9"
            />
          </div>

          {/* Location */}
          <div className="w-full lg:w-40">
            <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {isHebrew ? 'מיקום' : 'Location'}
            </Label>
            <Select value={filters.location} onValueChange={(v) => updateFilter('location', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={isHebrew ? 'בחר מיקום' : 'Select'} />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {isHebrew ? loc.labelHe : loc.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Type */}
          <div className="w-full lg:w-40">
            <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" />
              {isHebrew ? 'סוג משרה' : 'Job Type'}
            </Label>
            <Select value={filters.jobType} onValueChange={(v) => updateFilter('jobType', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={isHebrew ? 'בחר סוג' : 'Select'} />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {isHebrew ? type.labelHe : type.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Salary Range */}
          <div className="w-full lg:w-56">
            <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              {isHebrew ? 'טווח שכר' : 'Salary Range'}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">₪{filters.salaryMin / 1000}k</span>
              <Slider
                value={[filters.salaryMin, filters.salaryMax]}
                min={0}
                max={100000}
                step={5000}
                onValueChange={([min, max]) => {
                  onFiltersChange({ ...filters, salaryMin: min, salaryMax: max });
                }}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground">₪{filters.salaryMax / 1000}k</span>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
                {isHebrew ? 'נקה' : 'Clear'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
