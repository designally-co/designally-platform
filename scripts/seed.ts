/**
 * Imports seed/question-blocks.json. The questions are never retyped — this
 * file is the only path from the seed into the database.
 *
 * Idempotent: re-running replaces version 1 of every block's questions and
 * leaves any later version alone. Responses reference question rows by id, so
 * this refuses to delete a question that has already been answered.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inArray, sql } from 'drizzle-orm';

import { getDb, usingLocalDatabase } from '../src/lib/db';
import {
  answers,
  clients,
  projects,
  questionBlocks,
  questions,
  surveys,
  type BlockKey,
  type Package,
  type QuestionConfig,
  type QuestionType,
} from '../src/lib/db/schema';
import { PACKAGE_BLOCKS } from '../src/lib/survey/packages';
import { makeToken } from '../src/lib/survey/token';

type SeedQuestion = {
  order: number;
  type: QuestionType;
  text_en: string;
  text_th: string;
  help_en?: string;
  help_th?: string;
  required?: boolean;
  config?: QuestionConfig;
};

type SeedBlock = {
  key: BlockKey;
  name_en: string;
  name_th: string;
  intro_en?: string;
  intro_th?: string;
  shown_when?: string;
  questions: SeedQuestion[];
};

type SeedFile = {
  version: number;
  packages: Record<string, string[]>;
  question_types: string[];
  blocks: SeedBlock[];
};

const SEED_PATH = resolve(process.cwd(), 'seed/question-blocks.json');

function assertPackagesAgree(seed: SeedFile) {
  for (const [pkg, blocks] of Object.entries(PACKAGE_BLOCKS)) {
    const fromSeed = seed.packages[pkg];
    if (!fromSeed) throw new Error(`seed packages is missing "${pkg}"`);
    const a = [...blocks].join(',');
    const b = [...fromSeed].join(',');
    if (a !== b) {
      throw new Error(
        `PACKAGE_BLOCKS.${pkg} (${a}) has drifted from seed/question-blocks.json (${b}). ` +
          `Fix src/lib/survey/packages.ts.`,
      );
    }
  }
}

async function main() {
  const seed: SeedFile = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
  assertPackagesAgree(seed);

  const db = await getDb();
  const version = 1;

  for (const block of seed.blocks) {
    const [row] = await db
      .insert(questionBlocks)
      .values({
        key: block.key,
        nameEn: block.name_en,
        nameTh: block.name_th,
        introEn: block.intro_en ?? null,
        introTh: block.intro_th ?? null,
        shownWhen: block.shown_when ?? null,
      })
      .onConflictDoUpdate({
        target: questionBlocks.key,
        set: {
          nameEn: block.name_en,
          nameTh: block.name_th,
          introEn: block.intro_en ?? null,
          introTh: block.intro_th ?? null,
          shownWhen: block.shown_when ?? null,
        },
      })
      .returning();

    // Refuse to touch a question somebody has already answered.
    const existing = await db
      .select({ id: questions.id })
      .from(questions)
      .where(sql`${questions.blockId} = ${row.id} and ${questions.version} = ${version}`);

    if (existing.length) {
      const ids = existing.map((q) => q.id);
      const answered = await db
        .select({ id: answers.questionId })
        .from(answers)
        .where(inArray(answers.questionId, ids))
        .limit(1);

      if (answered.length) {
        console.log(`  ${block.key}: already answered, left untouched`);
        continue;
      }
      await db.delete(questions).where(inArray(questions.id, ids));
    }

    await db.insert(questions).values(
      block.questions.map((q) => ({
        blockId: row.id,
        order: q.order,
        textEn: q.text_en,
        textTh: q.text_th,
        helpEn: q.help_en ?? null,
        helpTh: q.help_th ?? null,
        type: q.type,
        config: q.config ?? {},
        required: q.required ?? true,
        version,
      })),
    );

    console.log(`  ${block.key}: ${block.questions.length} questions at version ${version}`);
  }

  await seedExampleProject(db);

  console.log(
    `\nSeeded ${usingLocalDatabase() ? 'local PGlite (.pglite)' : 'DATABASE_URL'} from seed/question-blocks.json.`,
  );
  process.exit(0);
}

/**
 * Milestone 1 has no team app, so there is no way to create a survey yet. This
 * makes one branding survey so there is a link to open. Milestone 2 replaces it
 * with the real "New survey" form.
 */
async function seedExampleProject(db: Awaited<ReturnType<typeof getDb>>) {
  const existing = await db.select().from(surveys).limit(1);
  if (existing.length) {
    console.log(`\nExample survey already present: /s/${existing[0].token}`);
    return;
  }

  const [client] = await db
    .insert(clients)
    .values({ name: 'F.W. Dentogenesis', projectCode: 'FWD' })
    .returning();

  const pkg: Package = 'branding';
  const [project] = await db
    .insert(projects)
    .values({ clientId: client.id, package: pkg, stage: 2 })
    .returning();

  const [survey] = await db
    .insert(surveys)
    .values({
      projectId: project.id,
      kind: 'discovery',
      token: makeToken(),
      questionVersion: 1,
      blockKeys: [...PACKAGE_BLOCKS[pkg]],
    })
    .returning();

  console.log(`\nExample survey: /s/${survey.token}  (${client.name} · ${pkg})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
