import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, MapPin, Briefcase, DollarSign, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface JobFiltersState {
  search: string;
  location: string;
  jobType: string;
  salaryRange: string;
  companySearch: string;
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

const SALARY_RANGES = [
  { value: '', labelEn: 'Any salary', labelHe: 'כל שכר' },
  { value: '0-10000', labelEn: '₪0 - ₪10,000', labelHe: '₪0 - ₪10,000' },
  { value: '10000-20000', labelEn: '₪10,000 - ₪20,000', labelHe: '₪10,000 - ₪20,000' },
  { value: '20000-35000', labelEn: '₪20,000 - ₪35,000', labelHe: '₪20,000 - ₪35,000' },
  { value: '35000-50000', labelEn: '₪35,000 - ₪50,000', labelHe: '₪35,000 - ₪50,000' },
  { value: '50000+', labelEn: '₪50,000+', labelHe: '₪50,000+' },
];

const LOCATIONS = [
  { value: '', labelEn: 'All locations', labelHe: 'כל המיקומים' },
  { value: 'tel-aviv', labelEn: 'Tel Aviv', labelHe: 'תל אביב' },
  { value: 'jerusalem', labelEn: 'Jerusalem', labelHe: 'ירושלים' },
  { value: 'haifa', labelEn: 'Haifa', labelHe: 'חיפה' },
  { value: 'beer-sheva', labelEn: 'Beer Sheva', labelHe: 'באר שבע' },
  { value: 'herzliya', labelEn: 'Herzliya', labelHe: 'הרצליה' },
  { value: 'remote', labelEn: 'Remote', labelHe: 'עבודה מרחוק' },
  { value: 'hybrid', labelEn: 'Hybrid', labelHe: 'היברידי' },
];

export function JobFilters({ filters, onFiltersChange, onClearFilters }: JobFiltersProps) {
  const { language } = useLanguage();
  const isHebrew = language === 'he';
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch job title suggestions based on search
  const { data: suggestions } = useQuery({
    queryKey: ['job-suggestions', filters.search],
    queryFn: async () => {
      if (!filters.search || filters.search.length < 2) return [];
      
      const { data } = await supabase
        .from('jobs')
        .select('title')
        .ilike('title', `%${filters.search}%`)
        .eq('status', 'active')
        .limit(5);
      
      return [...new Set(data?.map(j => j.title) || [])];
    },
    enabled: filters.search.length >= 2,
  });

  useEffect(() => {
    if (suggestions && suggestions.length > 0) {
      setSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [suggestions]);

  const hasActiveFilters = filters.search || filters.location || filters.jobType || 
    filters.salaryRange || filters.companySearch;

  const updateFilter = <K extends keyof JobFiltersState>(key: K, value: JobFiltersState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
    if (key === 'search') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    updateFilter('search', suggestion);
    setShowSuggestions(false);
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Row 1: Search and Company */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search with Autocomplete */}
            <div className="flex-1 relative">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Search className="w-3.5 h-3.5" />
                {isHebrew ? 'חיפוש משרה' : 'Search Jobs'}
              </Label>
              <Input
                placeholder={isHebrew ? 'חפש לפי שם משרה...' : 'Search by job title...'}
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                onFocus={() => filters.search.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="h-9"
              />
              {/* Autocomplete Suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-popover border border-border rounded-md shadow-lg">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Company Search */}
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {isHebrew ? 'חברה' : 'Company'}
              </Label>
              <Input
                placeholder={isHebrew ? 'חפש לפי שם חברה...' : 'Search by company...'}
                value={filters.companySearch}
                onChange={(e) => updateFilter('companySearch', e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Row 2: Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Location */}
            <div className="w-full lg:w-44">
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
                    <SelectItem key={loc.value || 'all'} value={loc.value}>
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
                  <SelectItem value="">{isHebrew ? 'כל הסוגים' : 'All types'}</SelectItem>
                  {JOB_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {isHebrew ? type.labelHe : type.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Salary Range - Now a Select dropdown */}
            <div className="w-full lg:w-48">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                {isHebrew ? 'טווח שכר' : 'Salary Range'}
              </Label>
              <Select value={filters.salaryRange} onValueChange={(v) => updateFilter('salaryRange', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={isHebrew ? 'בחר טווח' : 'Select range'} />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_RANGES.map((range) => (
                    <SelectItem key={range.value || 'any'} value={range.value}>
                      {isHebrew ? range.labelHe : range.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="gap-1 text-muted-foreground hover:text-foreground h-9"
                >
                  <X className="w-4 h-4" />
                  {isHebrew ? 'נקה' : 'Clear'}
                </Button>
              </div>
            )}
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  {isHebrew ? 'חיפוש:' : 'Search:'} {filters.search}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilter('search', '')} 
                  />
                </Badge>
              )}
              {filters.companySearch && (
                <Badge variant="secondary" className="gap-1">
                  {isHebrew ? 'חברה:' : 'Company:'} {filters.companySearch}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilter('companySearch', '')} 
                  />
                </Badge>
              )}
              {filters.location && (
                <Badge variant="secondary" className="gap-1">
                  {LOCATIONS.find(l => l.value === filters.location)?.[isHebrew ? 'labelHe' : 'labelEn']}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilter('location', '')} 
                  />
                </Badge>
              )}
              {filters.jobType && (
                <Badge variant="secondary" className="gap-1">
                  {JOB_TYPES.find(t => t.value === filters.jobType)?.[isHebrew ? 'labelHe' : 'labelEn']}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilter('jobType', '')} 
                  />
                </Badge>
              )}
              {filters.salaryRange && (
                <Badge variant="secondary" className="gap-1">
                  {SALARY_RANGES.find(r => r.value === filters.salaryRange)?.[isHebrew ? 'labelHe' : 'labelEn']}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilter('salaryRange', '')} 
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
