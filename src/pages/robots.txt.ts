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
  return `User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: *
Allow: /

Sitemap: ${profile.identity.website}/sitemap-index.xml
`;
}
