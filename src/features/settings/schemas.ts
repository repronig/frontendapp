import { z } from 'zod';

/** Matches `ChangePasswordPayload`; use when migrating settings forms to RHF+Zod. */
export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required.'),
    new_password: z.string().min(8, 'Password must be at least 8 characters.'),
    new_password_confirmation: z.string().min(8, 'Confirm your password.'),
  })
  .refine((value) => value.new_password === value.new_password_confirmation, {
    message: 'Passwords do not match.',
    path: ['new_password_confirmation'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const updateProfileBasicsSchema = z.object({
  first_name: z.string().min(1, 'First name is required.'),
  last_name: z.string().min(1, 'Last name is required.'),
  phone: z.string().optional(),
});

export type UpdateProfileBasicsFormValues = z.infer<typeof updateProfileBasicsSchema>;
