/** Values accepted by institution registration (aligned with API). */
export const INSTITUTION_REGISTER_TYPES = [
  'university',
  'polytechnic',
  'college_of_education',
  'professional_body',
  'religious_organization',
  'corporate_organization',
  'government_agency',
  'ngo',
  'research_institute',
  'library',
  'other',
] as const;

export type InstitutionRegisterType = (typeof INSTITUTION_REGISTER_TYPES)[number];

/** Sentence-style labels for select options (not raw enum slugs). */
export const INSTITUTION_TYPE_OPTION_LABELS: Record<InstitutionRegisterType, string> = {
  university: 'University',
  polytechnic: 'Polytechnic',
  college_of_education: 'College of education',
  professional_body: 'Professional body',
  religious_organization: 'Religious organization',
  corporate_organization: 'Corporate organization',
  government_agency: 'Government agency',
  ngo: 'NGO',
  research_institute: 'Research institute',
  library: 'Library',
  other: 'Other',
};
