import { z } from 'zod';

export const memberProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required.').max(100),
  last_name: z.string().min(1, 'Last name is required.').max(100),
  date_of_birth: z.string().optional().or(z.literal('')),
  occupation: z.string().max(255).optional().or(z.literal('')),
  residential_address_line_1: z.string().min(1, 'Address line 1 is required.').max(255),
  residential_address_line_2: z.string().max(255).optional().or(z.literal('')),
  city: z.string().min(1, 'City is required.').max(100),
  state: z.string().min(1, 'State is required.').max(100),
  country: z.string().min(1, 'Country is required.').max(100),
  postal_code: z.string().max(30).optional().or(z.literal('')),
  publisher_name: z.string().max(255).optional().or(z.literal('')),
  corporate_name: z.string().max(255).optional().or(z.literal('')),
  member_provided_id: z.string().max(100).optional().or(z.literal('')),
});

export type MemberProfileFormValues = z.infer<typeof memberProfileSchema>;
