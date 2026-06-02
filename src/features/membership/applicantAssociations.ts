/** Mirrors API `App\Support\Membership\ApplicantAssociationMap` (association codes). */

export type MemberApplicantType = 'author' | 'publisher' | 'artist';

export const MEMBER_APPLICANT_TYPES: MemberApplicantType[] = ['author', 'publisher', 'artist'];

export const APPLICANT_TYPE_OPTIONS: { label: string; value: MemberApplicantType }[] = [
  { label: 'Author', value: 'author' },
  { label: 'Publisher', value: 'publisher' },
  { label: 'Artist', value: 'artist' },
];

export const MEMBER_TYPE_OPTIONS = [
  { label: 'Individual', value: 'individual' },
  { label: 'Corporate', value: 'corporate' },
  { label: 'Agent', value: 'agent' },
] as const;

export const AUTHOR_CATEGORY_OPTIONS = [
  { label: 'Author', value: 'author' },
  { label: 'Journalist', value: 'journalist' },
  { label: 'Photographer', value: 'photographer' },
  { label: 'Illustrator', value: 'illustrator' },
  { label: 'Carver', value: 'carver' },
  { label: 'Painter', value: 'painter' },
  { label: 'Sculptor', value: 'sculptor' },
  { label: 'Other', value: 'other' },
] as const;

export const ARTIST_CATEGORY_OPTIONS = [
  { label: 'Illustrator', value: 'illustrator' },
  { label: 'Carver', value: 'carver' },
  { label: 'Painter', value: 'painter' },
  { label: 'Sculptor', value: 'sculptor' },
  { label: 'Other', value: 'other' },
] as const;

export const APPLICATION_DOCUMENT_WHY: Record<'proof_of_id' | 'proof_of_address', string> = {
  proof_of_id: 'For ensuring proper identification of the member national ID',
  proof_of_address: 'For ensuring proper address profiling for each member',
};

export function isAuthorLikeApplicantType(applicantType: string): boolean {
  return applicantType === 'author' || applicantType === 'artist';
}

/** Normalize legacy API values for form display. */
export function normalizeApplicantTypeForForm(value: string | null | undefined): MemberApplicantType {
  if (value === 'artist') return 'artist';
  if (value === 'publisher' || value === 'corporate_publisher') return 'publisher';
  return 'author';
}

export function applicantTypeLabel(applicantType: string): string {
  const found = APPLICANT_TYPE_OPTIONS.find((o) => o.value === normalizeApplicantTypeForForm(applicantType));
  return found?.label ?? applicantType;
}
