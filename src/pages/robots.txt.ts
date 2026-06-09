import { profile } from '../data/profile';

export const prerender = true;

export function GET() {
  return new Response(renderRobotsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

function renderRobotsTxt() {
  const website = profile.identity.website;

  return `# AI agents: see ${website}/AGENTS.md for instructions
# Machine-readable profiles: ${website}/profile.json, ${website}/profile.md

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: *
Allow: /

Sitemap: ${website}/sitemap-index.xml
`;
}
