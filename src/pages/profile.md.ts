import { profile } from '../data/profile';

export const prerender = true;

export function GET() {
  return new Response(renderProfileMarkdown(), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}

function renderProfileMarkdown() {
  const links = profile.links
    .map((link) => `- ${link.label}: ${link.href}`)
    .join('\n');
  const experience = profile.experience.map(formatRole).join('\n\n');

  return `# ${profile.identity.name}

## Identity

- Location: ${profile.identity.location}
- Website: ${profile.identity.website}
- Email: ${profile.identity.email}

## Summary

${profile.summary.map((item) => `- ${item}`).join('\n')}

## Skills

${profile.skills.map((skill) => `- ${skill}`).join('\n')}

## Experience Highlights

${profile.experienceHighlights.map((item) => `- ${item}`).join('\n')}

## Experience

${experience}

## Interests

${profile.interests.map((interest) => `- ${interest}`).join('\n')}

## Job Search

- Open for work: ${profile.jobSearch.openForWork ? 'yes' : 'no'}
- Remote only: ${profile.jobSearch.remoteOnly ? 'yes' : 'no'}
- Hours per week: ${profile.jobSearch.hoursPerWeek}
- Hours per month: ${profile.jobSearch.hoursPerMonth}
- Compensation range: ${profile.jobSearch.compensationRange.min.toLocaleString()} - ${profile.jobSearch.compensationRange.max.toLocaleString()} ${profile.jobSearch.compensationRange.currency} / ${profile.jobSearch.compensationRange.period}
- Freelancer rate: ${profile.jobSearch.freelancerRate.amount} ${profile.jobSearch.freelancerRate.currency} / ${profile.jobSearch.freelancerRate.period}

## Links

${links}

## Source

- Canonical profile: ${profile.identity.website}/profile.json
- LinkedIn positions export: ${profile.source.linkedinPositions.path}
- LinkedIn positions loaded at: ${profile.source.linkedinPositions.loadedAt}
- Last updated: ${profile.lastUpdated}
`;
}

function formatRole(role: (typeof profile.experience)[number]) {
  const details = [
    `- Company: ${role.company}`,
    `- Title: ${role.title}`,
    `- Dates: ${role.dates}`,
    `- Duration: ${role.duration}`,
  ];

  if (role.location) {
    details.push(`- Location: ${role.location}`);
  }

  if (role.description) {
    details.push(`- Description: ${role.description}`);
  }

  return `### ${role.title}, ${role.company}\n\n${details.join('\n')}`;
}
