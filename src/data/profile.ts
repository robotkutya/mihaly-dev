import rawProfile from './profile.json';
import { ProfileSchema } from './profile.schema';

export const profile = ProfileSchema.parse(rawProfile);
