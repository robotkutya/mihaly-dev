import { profile } from '../data/profile';
import { SITE_TITLE } from '../config';

export const prerender = true;

export function GET() {
  return new Response(renderLlmstxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

function renderLlmstxt() {
  const website = profile.identity.website;

  return `# ${SITE_TITLE}
> ${website}

## Resources
- Agent instructions: ${website}/AGENTS.md
- Structured profile (JSON): ${website}/profile.json
- Markdown profile: ${website}/profile.md
`;
}
