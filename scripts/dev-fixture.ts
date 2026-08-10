/**
 * Development only. Builds a synthetic branding survey whose answers contain
 * deliberately planted findings, so the analysis can be tested without the real
 * ARUN+ data.
 *
 *   npm run dev:fixture
 *
 * What is planted, and why each one:
 *
 *   1. A B2B/B2C audience split          — the highest-severity conflict shape
 *   2. A mutual-avoid tone contradiction — wants bold and disruptive, and also
 *                                          says avoid anything provocative
 *   3. Clarity gaps                      — blanks and "ยังไม่มี" on competitors
 *                                          and existing guidelines
 *   4. An outlier                        — one person answering against all others
 *   5. A stated–revealed contradiction   — calls itself accessible and friendly
 *                                          while admiring exclusive brands
 *   6. A near-unanimous scale + two split ones
 *
 * These mirror the findings docs/first-session-brief.md names as the acceptance
 * test. Passing here is weaker evidence than passing on the real data — the
 * conflicts are cleaner than life — but failing here means it would certainly
 * fail there.
 */
import { inArray } from 'drizzle-orm';

import { getDb, usingLocalDatabase } from '../src/lib/db';
import {
  answers,
  clients,
  projects,
  questionBlocks,
  questions,
  responses,
  surveys,
  type AnswerValue,
} from '../src/lib/db/schema';
import { PACKAGE_BLOCKS } from '../src/lib/survey/packages';
import { makeToken } from '../src/lib/survey/token';

type Person = {
  name: string;
  role: string;
  decisionMaker: string | null;
  /** keyed "blockKey.order" — omit a key entirely to leave it blank */
  answers: Record<string, AnswerValue>;
};

const t = (text: string): AnswerValue => ({ kind: 'text', text });
const choice = (c: string): AnswerValue => ({ kind: 'choice', choice: c });
const multi = (...choices: string[]): AnswerValue => ({ kind: 'multi', choices });
const scale = (values: Record<string, number>): AnswerValue => ({ kind: 'scale', points: 5, values });

const YES = 'Yes — final decisions come to me';
const SHARED = 'Shared — we decide as a group';
const NO = 'No — I contribute my perspective';

/* Scale pair indices, in seed order:
   0 Traditional–Modern · 1 Exclusive–Accessible · 2 Serious–Fun
   3 Corporate–Friendly · 4 Simple–Sophisticated · 5 Subtle–Bold
   6 Cosmopolitan–Natural · 7 Calm–Dynamic · 8 Familiar–Disruptive
   9 Realistic–Idealistic */

const PEOPLE: Person[] = [
  {
    name: 'คุณธนวัฒน์ วงศ์สกุล',
    role: 'CEO',
    decisionMaker: YES,
    answers: {
      'core.1': t('เราผลิตชิ้นส่วนอิเล็กทรอนิกส์สำหรับผู้ผลิตรถยนต์ OEM รายใหญ่ในไทยและอาเซียน'),
      'core.2': t('We supply precision electronic components to automotive manufacturers.'),
      'core.3': t('Denso, Aisin, และผู้ผลิตชิ้นส่วนรายใหญ่จากญี่ปุ่น'),
      'core.4': t('เราส่งมอบตรงเวลา 100% มาสิบสองปีติดต่อกัน ไม่เคยมีสายการผลิตของลูกค้าหยุดเพราะเรา'),
      /* planted: the B2B side of the audience split */
      'core.5': t('ลูกค้าของเราคือฝ่ายจัดซื้อของโรงงานประกอบรถยนต์ เป็นวิศวกรและผู้จัดการโรงงาน B2B ล้วน ๆ'),
      'core.6': t('ความแม่นยำและความน่าเชื่อถือของสายการผลิต'),
      'core.7': t('ยังไม่มี'),
      'core.8': t('น่าเชื่อถือ มั่นคง เป็นมืออาชีพ'),
      'core.9': scale({ '0': 4, '1': 1, '2': 1, '3': 1, '4': 4, '5': 2, '6': 2, '7': 3, '8': 2, '9': 1 }),
      'core.10': t('ไม่ต้องการให้ดูเล่น ๆ หรือไม่จริงจัง'),
      'branding.1': t('เริ่มจากโรงกลึงเล็ก ๆ ของคุณพ่อเมื่อปี 2531 ขยายมาเป็นโรงงานสามแห่ง'),
      'branding.2': t('งานที่ส่งมอบต้องดีกว่าที่สัญญาไว้เสมอ'),
      'branding.3': t('โรงงานประกอบหยุดสายการผลิตไม่ได้ เราทำให้เขาไม่ต้องกังวลเรื่องชิ้นส่วน'),
      /* planted: stated–revealed — admires exclusive, premium brands */
      'branding.4': t('Bosch เพราะมาตรฐานวิศวกรรม และ Hermès เพราะเขาไม่เคยลดคุณภาพเพื่อขายให้มากขึ้น'),
      'branding.5': t('Denso ทำแบรนด์ได้นิ่งและน่าเชื่อถือมาก'),
      'branding.6': t('แบรนด์จีนราคาถูกที่โฆษณาเกินจริง'),
      'branding.7': t('รายงานประจำปีของ Siemens'),
      'branding.8': t('ไม่เอาสีสันฉูดฉาด'),
      'branding.9': t('น่าจะเป็นวิศวกรอาวุโสที่พูดน้อยแต่ทำได้จริง'),
      'branding.10': multi('Trustworthy', 'Professional', 'Smart', 'Frank', 'Authoritative', 'Respectful'),
      'branding.11': t('อยากได้อะไรที่ดูมั่นคง ใช้ได้อีกยี่สิบปี'),
    },
  },
  {
    name: 'คุณศิริพร ตั้งจิตต์',
    role: 'Marketing Director',
    decisionMaker: SHARED,
    answers: {
      'core.1': t('ชิ้นส่วนอิเล็กทรอนิกส์ และกำลังจะมีสายผลิตภัณฑ์สำหรับผู้บริโภคด้วย'),
      'core.2': t('We make electronics — and we are moving into consumer products.'),
      'core.3': t('ยังไม่มี'),
      'core.4': t('ทีมงานที่อยู่กับเรามานาน'),
      /* planted: the B2C side of the same split */
      'core.5': t(
        'กลุ่มเป้าหมายคือคนรุ่นใหม่ Gen Y และ Gen Z ที่ซื้อของออนไลน์ เราต้องเข้าถึงผู้บริโภคทั่วไปให้ได้',
      ),
      'core.6': t('เราปรับตัวเร็วกว่าโรงงานเก่า ๆ'),
      'core.7': t('ไม่มี'),
      'core.8': t('ทันสมัย เข้าถึงง่าย เป็นกันเอง'),
      'core.9': scale({ '0': 5, '1': 5, '2': 4, '3': 5, '4': 2, '5': 5, '6': 3, '7': 5, '8': 5, '9': 4 }),
      /* planted: mutual-avoid contradiction — wants bold, avoids provocative */
      'core.10': t('ไม่อยากให้ดูก้าวร้าวหรือเร้าใจเกินไป'),
      'branding.1': t('โรงงานครอบครัว แต่ตอนนี้ต้องเปลี่ยนเป็นแบรนด์ที่คนทั่วไปรู้จัก'),
      'branding.2': t('เราเชื่อว่าเทคโนโลยีควรเข้าถึงได้ทุกคน'),
      'branding.3': t('ช่วยให้คนใช้ชีวิตง่ายขึ้น'),
      'branding.4': t('Tesla เพราะสื่อสารเร็วมากและกล้านำเทรนด์ ไม่รอใคร'),
      'branding.5': t('Xiaomi ทำการตลาดเก่ง'),
      'branding.6': t('แบรนด์ที่ดูเก่าและไม่ยอมเปลี่ยน'),
      'branding.7': t('งานโฆษณาของ Apple'),
      /* planted: reinforces the avoid contradiction */
      'branding.8': t('ไม่เอาอะไรที่ดูยั่วยุหรือแรงเกินไป'),
      'branding.9': t('Elon Musk — กล้าคิดกล้าทำ'),
      'branding.10': multi('Friendly', 'Fun', 'Trendy', 'Enthusiastic', 'Playful', 'Casual', 'Provocative'),
      'branding.11': t('อยากได้แบรนด์ที่วัยรุ่นรู้สึกว่าเป็นของเขา'),
    },
  },
  {
    name: 'คุณกฤษณ์ ภักดีวงศ์',
    role: 'Head of Production',
    decisionMaker: NO,
    answers: {
      'core.1': t('ผลิตชิ้นส่วนตามสเปกลูกค้า'),
      'core.2': t('We build to spec.'),
      /* planted: clarity gap — cannot name competitors */
      'core.3': t('ไม่มี'),
      'core.4': t('เครื่องจักรใหม่ที่เพิ่งลงทุนไป'),
      'core.5': t('โรงงานที่สั่งของเรา'),
      'core.6': t('ยังไม่มี'),
      'core.7': t('ไม่มี'),
      'core.8': t('มั่นคง'),
      'core.9': scale({ '0': 4, '1': 2, '2': 2, '3': 2, '4': 3, '5': 2, '6': 3, '7': 3, '8': 2, '9': 2 }),
      'core.10': t(''),
      'branding.1': t('ไม่ทราบรายละเอียด'),
      'branding.2': t('ทำงานให้ดี'),
      'branding.3': t('ยังไม่มี'),
      'branding.4': t('ไม่มี'),
      'branding.9': t('ไม่ทราบ'),
      'branding.10': multi('Trustworthy', 'Professional', 'Serious', 'Formal', 'Respectful', 'Informative'),
      /* branding.5–8 and 11 deliberately absent — blanks are data */
    },
  },
  {
    name: 'คุณพลอย รัตนาภรณ์',
    role: 'Sales Manager',
    decisionMaker: NO,
    answers: {
      'core.1': t('ชิ้นส่วนสำหรับอุตสาหกรรมยานยนต์'),
      'core.2': t('Automotive components for OEM assembly lines.'),
      'core.3': t('ผู้ผลิตชิ้นส่วนจากญี่ปุ่นและเกาหลี'),
      'core.4': t('ความสัมพันธ์กับลูกค้าที่ยาวนาน'),
      /* planted: sides with B2B */
      'core.5': t('ฝ่ายจัดซื้อของโรงงานประกอบ เป็นงาน B2B ที่ต้องใช้ความสัมพันธ์'),
      'core.6': t('เราแก้ปัญหาให้ลูกค้าได้เร็ว'),
      'core.7': t('ยังไม่มี'),
      'core.8': t('ไว้ใจได้'),
      'core.9': scale({ '0': 4, '1': 2, '2': 2, '3': 3, '4': 3, '5': 2, '6': 3, '7': 3, '8': 2, '9': 2 }),
      'core.10': t('ไม่อยากดูเหมือนโรงงานทั่วไป'),
      'branding.1': t('เริ่มจากธุรกิจครอบครัว'),
      'branding.2': t('รักษาคำพูด'),
      'branding.3': t('ทำให้ลูกค้าไม่ต้องกังวลเรื่องคุณภาพ'),
      'branding.4': t('Toyota เพราะระบบการผลิตที่ทุกคนเลียนแบบ'),
      'branding.5': t('Denso'),
      'branding.6': t('แบรนด์ที่สัญญาแล้วไม่ทำ'),
      'branding.8': t('ไม่เอาอะไรที่ดูไม่จริงจัง'),
      'branding.9': t('คนที่ทำงานเงียบ ๆ แต่ผลงานพูดแทน'),
      'branding.10': multi('Trustworthy', 'Professional', 'Frank', 'Caring', 'Respectful', 'Smart'),
    },
  },
  {
    /* planted: the outlier — answers against everyone on nearly everything */
    name: 'คุณวินัย เจริญสุข',
    role: 'Head of New Ventures',
    decisionMaker: NO,
    answers: {
      'core.1': t('เราควรเลิกทำชิ้นส่วนแล้วไปทำแพลตฟอร์มซอฟต์แวร์'),
      'core.2': t('We should be a software company.'),
      'core.3': t('บริษัทเทคโนโลยีทั่วโลก'),
      'core.4': t('ไม่มีอะไรที่ภูมิใจเป็นพิเศษ'),
      'core.5': t('ใครก็ได้ที่ใช้อินเทอร์เน็ต'),
      'core.6': t('ยังไม่มี'),
      'core.7': t('ไม่มี'),
      'core.8': t('ตื่นเต้น แปลกใหม่'),
      /* planted: the outlier's scale answers run opposite to everyone */
      'core.9': scale({ '0': 1, '1': 5, '2': 5, '3': 5, '4': 1, '5': 5, '6': 5, '7': 5, '8': 5, '9': 5 }),
      'core.10': t('ไม่อยากให้ดูน่าเบื่อแบบโรงงาน'),
      'branding.1': t('ไม่สำคัญแล้ว'),
      'branding.2': t('ต้องเปลี่ยนทุกอย่าง'),
      'branding.3': t('ยังไม่รู้'),
      'branding.4': t('OpenAI เพราะเปลี่ยนโลกได้เร็ว'),
      'branding.6': t('แบรนด์อุตสาหกรรมทุกแบรนด์'),
      'branding.9': t('Steve Jobs'),
      'branding.10': multi('Provocative', 'Trendy', 'Witty', 'Humourous', 'Casual', 'Playful'),
      'branding.11': t('อยากให้ดูเหมือนสตาร์ทอัพ ไม่ใช่โรงงาน'),
    },
  },
];

async function main() {
  if (!usingLocalDatabase() && process.env.ALLOW_FIXTURE !== 'yes') {
    throw new Error(
      'Refusing to write a synthetic client into a real database. Set ALLOW_FIXTURE=yes if you really mean it.',
    );
  }

  const db = await getDb();

  const [client] = await db
    .insert(clients)
    .values({ name: 'ZZ Fixture — Precision Components', projectCode: 'FIXTURE' })
    .returning();

  const [project] = await db
    .insert(projects)
    .values({ clientId: client.id, package: 'branding', stage: 2 })
    .returning();

  const [survey] = await db
    .insert(surveys)
    .values({
      projectId: project.id,
      kind: 'discovery',
      token: makeToken(),
      questionVersion: 1,
      blockKeys: [...PACKAGE_BLOCKS.branding],
    })
    .returning();

  /* resolve "core.5" style refs to question ids */
  const blocks = await db
    .select()
    .from(questionBlocks)
    .where(inArray(questionBlocks.key, survey.blockKeys));
  const qs = await db
    .select()
    .from(questions)
    .where(
      inArray(
        questions.blockId,
        blocks.map((b) => b.id),
      ),
    );
  const keyOf = new Map(blocks.map((b) => [b.id, b.key]));
  const idByRef = new Map(qs.map((q) => [`${keyOf.get(q.blockId)}.${q.order}`, q.id]));

  const identity = qs.filter((q) => keyOf.get(q.blockId) === 'identity').sort((a, b) => a.order - b.order);

  for (const person of PEOPLE) {
    const [response] = await db
      .insert(responses)
      .values({
        surveyId: survey.id,
        respondentName: person.name,
        role: person.role,
        decisionMaker: person.decisionMaker,
      })
      .returning();

    const rows: { responseId: string; questionId: string; value: AnswerValue }[] = [
      { responseId: response.id, questionId: identity[0].id, value: t(person.name) },
      { responseId: response.id, questionId: identity[1].id, value: t(person.role) },
    ];
    if (person.decisionMaker) {
      rows.push({
        responseId: response.id,
        questionId: identity[2].id,
        value: choice(person.decisionMaker),
      });
    }

    for (const [ref, value] of Object.entries(person.answers)) {
      const questionId = idByRef.get(ref);
      if (!questionId) throw new Error(`Fixture references an unknown question: ${ref}`);
      if (value.kind === 'text' && !value.text.trim()) continue; // blank stays absent
      rows.push({ responseId: response.id, questionId, value });
    }

    await db.insert(answers).values(rows);
  }

  console.log(`Fixture survey created: /s/${survey.token}`);
  console.log(`${PEOPLE.length} respondents · project ${project.id}`);
  console.log('Planted: B2B/B2C split · mutual-avoid contradiction · clarity gaps · outlier · stated–revealed gap');
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
