import * as z from 'zod/mini';

export const ProfileLinkKindSchema = z.union([
  z.literal('email'),
  z.literal('linkedin'),
  z.literal('github'),
  z.literal('website'),
]);

export const ProfileLinkSchema = z.object({
  kind: ProfileLinkKindSchema,
  label: z.string(),
  href: z.string(),
  showInHeader: z.boolean(),
});

export const ExperienceRoleSchema = z.object({
  company: z.string(),
  title: z.string(),
  dates: z.string(),
  duration: z.string(),
  location: z.string(),
  description: z.string(),
  startedOn: z.string(),
  finishedOn: z.nullable(z.string()),
  source: z.literal('linkedin'),
});

export const ProfileSchema = z.object({
  identity: z.object({
    name: z.string(),
    location: z.string(),
    website: z.string(),
    email: z.string(),
  }),
  headline: z.string(),
  summary: z.array(z.string()),
  skills: z.array(z.string()),
  experienceHighlights: z.array(z.string()),
  interests: z.array(z.string()),
  links: z.array(ProfileLinkSchema),
  experience: z.array(ExperienceRoleSchema),
  source: z.object({
    linkedinPositions: z.object({
      path: z.string(),
      loadedAt: z.string(),
      rowCount: z.number(),
    }),
  }),
  lastUpdated: z.string(),
});

export type ProfileLinkKind = z.infer<typeof ProfileLinkKindSchema>;
export type ProfileLink = z.infer<typeof ProfileLinkSchema>;
export type ExperienceRole = z.infer<typeof ExperienceRoleSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
