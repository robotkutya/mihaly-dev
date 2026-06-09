import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProfileSchema } from '../src/data/profile.schema.ts';

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const positionsPath = resolve(rootDirectory, 'linked-in-dump/Positions.csv');
const profilePath = resolve(rootDirectory, 'src/data/profile.json');

const requiredColumns = [
  'Company Name',
  'Title',
  'Description',
  'Location',
  'Started On',
  'Finished On',
];

const monthIndexes = new Map([
  ['Jan', 0],
  ['Feb', 1],
  ['Mar', 2],
  ['Apr', 3],
  ['May', 4],
  ['Jun', 5],
  ['Jul', 6],
  ['Aug', 7],
  ['Sep', 8],
  ['Oct', 9],
  ['Nov', 10],
  ['Dec', 11],
]);

const csv = await readFile(positionsPath, 'utf8');
const profile = ProfileSchema.parse(JSON.parse(await readFile(profilePath, 'utf8')));
const positions = parseCsv(csv);
const [headers, ...rows] = positions;

if (!headers) {
  throw new Error('Positions.csv is empty.');
}

for (const column of requiredColumns) {
  if (!headers.includes(column)) {
    throw new Error(`Positions.csv is missing the "${column}" column.`);
  }
}

const roles = rows
  .filter((row) => row.some((cell) => cell.trim() !== ''))
  .map((row, index) => csvRowToRole(headers, row, index + 2));

const loadedAt = new Date().toISOString();
const nextProfile = ProfileSchema.parse({
  ...profile,
  experience: roles,
  source: {
    ...profile.source,
    linkedinPositions: {
      path: relative(rootDirectory, positionsPath),
      loadedAt,
      rowCount: roles.length,
    },
  },
  lastUpdated: loadedAt,
});

await mkdir(dirname(profilePath), { recursive: true });
await writeFile(profilePath, `${JSON.stringify(nextProfile, null, 2)}\n`);

console.log(
  `Loaded ${roles.length} LinkedIn positions into ${relative(
    rootDirectory,
    profilePath,
  )}.`,
);

function parseCsv(input) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }

      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n' || char === '\r') {
      if (char === '\r' && input[index + 1] === '\n') {
        index += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function csvRowToRole(headers, row, rowNumber) {
  const value = (column) => {
    const columnIndex = headers.indexOf(column);
    return (row[columnIndex] ?? '').trim();
  };

  const company = value('Company Name');
  const title = value('Title');
  const description = normalizeWhitespace(value('Description'));
  const location = value('Location');
  const startedOn = value('Started On');
  const finishedOn = value('Finished On');

  if (!company) {
    throw new Error(`Row ${rowNumber} is missing Company Name.`);
  }

  if (!title) {
    throw new Error(`Row ${rowNumber} is missing Title.`);
  }

  if (!startedOn) {
    throw new Error(`Row ${rowNumber} is missing Started On.`);
  }

  const start = parseMonthYear(startedOn, `Started On in row ${rowNumber}`);
  const finish = finishedOn
    ? parseMonthYear(finishedOn, `Finished On in row ${rowNumber}`)
    : null;
  const durationInMonths = getInclusiveDurationInMonths(start, finish);

  return {
    company,
    title,
    dates: `${startedOn} - ${finishedOn || 'Present'}`,
    duration: formatDuration(durationInMonths),
    location,
    description,
    startedOn,
    finishedOn: finishedOn || null,
    source: 'linkedin',
  };
}

function parseMonthYear(value, label) {
  const match = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/.exec(
    value,
  );

  if (!match) {
    throw new Error(`${label} must use LinkedIn's "Mon YYYY" format.`);
  }

  return {
    monthIndex: monthIndexes.get(match[1]),
    year: Number(match[2]),
  };
}

function getInclusiveDurationInMonths(start, finish) {
  const effectiveFinish =
    finish ??
    (() => {
      const now = new Date();
      return {
        monthIndex: now.getMonth(),
        year: now.getFullYear(),
      };
    })();

  const duration =
    (effectiveFinish.year - start.year) * 12 +
    effectiveFinish.monthIndex -
    start.monthIndex +
    1;

  if (duration < 1) {
    throw new Error('LinkedIn position duration cannot be less than one month.');
  }

  return duration;
}

function formatDuration(months) {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const parts = [];

  if (years > 0) {
    parts.push(`${years} yr${years === 1 ? '' : 's'}`);
  }

  if (remainingMonths > 0) {
    parts.push(
      `${remainingMonths} mo${remainingMonths === 1 ? '' : 's'}`,
    );
  }

  return parts.join(' ');
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}
