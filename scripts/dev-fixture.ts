/**
 * Development only. Builds a synthetic Brand survey at the current question
 * version whose answers contain deliberately planted findings, so the analysis
 * can be tested without a real client.
 *
 *   npm run dev:fixture
 *
 * What is planted, and why each one:
 *
 *   1. An audience split                 — three describe industrial buyers, two
 *                                          describe walk-in consumers
 *   2. A mutual-avoid tone contradiction — each camp's chosen mood sits on the
 *                                          other camp's avoid list
 *   3. Clarity gaps                      — blanks and "ยังไม่มี" on the promise
 *                                          and the limitations
 *   4. An outlier                        — one person against everyone else
 *   5. A stated–revealed contradiction   — calls itself accessible and everyday
 *                                          while admiring only exclusive brands
 *   6. A near-unanimous scale, and two split ones
 *
 * **The point of this fixture at version 3.** Version 1 gave the analysis a
 * department and a decision-maker flag for every respondent, and the ARUN+
 * acceptance test was passed by grouping on them. Version 3 gives it a name and
 * nothing else. So the audience split here is planted with *no* signal outside
 * the answers themselves: the two camps are not marked, not ordered together,
 * and not distinguishable by anything but what they wrote. If the insights still
 * finds them, the prompt survived losing the roles. If it doesn't, that is the
 * regression and it is better found here than on a client.
 *
 * Passing here is weaker evidence than passing on real data — the conflicts are
 * cleaner than life — but failing here means it would certainly fail there.
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
import { CURRENT_QUESTION_VERSION, PACKAGE_BLOCKS } from '../src/lib/survey/packages';
import { makeToken } from '../src/lib/survey/token';

type Person = {
  name: string;
  email: string;
  /** keyed "blockKey.order" — omit a key entirely to leave it blank */
  answers: Record<string, AnswerValue>;
};

const t = (text: string): AnswerValue => ({ kind: 'text', text });
const multi = (...choices: string[]): AnswerValue => ({ kind: 'multi', choices });
const other = (choices: string[], note: string): AnswerValue => ({ kind: 'multi', choices, other: note });
const scale = (values: Record<string, number>): AnswerValue => ({ kind: 'scale', points: 5, values });

/* Scale pair indices, in seed order:
   0 Traditional–Modern · 1 Exclusive–Accessible · 2 Serious–Fun
   3 Corporate–Friendly · 4 Simple–Sophisticated · 5 Subtle–Bold
   6 Cosmopolitan–Natural · 7 Calm–Dynamic · 8 Familiar–Disruptive
   9 Realistic–Idealistic

   Every respondent puts Traditional–Modern at 4 or 5 — that is the settled one.
   Exclusive–Accessible and Serious–Fun are split down the middle. */

const PEOPLE: Person[] = [
  /* ── camp A · industrial buyers, formal ──────────────────────────── */
  {
    name: 'คุณธนวัฒน์ วงศ์สกุล',
    email: 'tanawat@example.co.th',
    answers: {
      'strategy.1': t(
        'เราผลิตชิ้นส่วนความแม่นยำสูงให้โรงงานประกอบรถยนต์ ส่งมอบตรงเวลามาสิบสองปี ไม่เคยมีสายการผลิตของลูกค้าหยุดเพราะเรา',
      ),
      'strategy.2': t('ผู้ผลิตชิ้นส่วนที่โรงงานระดับโลกไว้ใจ'),
      'strategy.3': t(
        'ฝ่ายจัดซื้อกลัวของมาช้าแล้วสายการผลิตหยุด เราลดความกลัวนั้นด้วยสัญญาและประวัติการส่งมอบ',
      ),
      'strategy.4': t(
        'คู่แข่งขายราคา เราขายความแน่นอน วิศวกรของเราเข้าไปแก้ปัญหาที่หน้างานของลูกค้าได้ภายในวันเดียว',
      ),
      'strategy.5': scale({ '0': 4, '1': 1, '2': 1, '3': 2, '4': 4, '5': 2, '6': 2, '7': 3, '8': 2, '9': 2 }),
      'strategy.6': t('คุณภาพที่วัดได้ · การส่งมอบตรงเวลา · ความสัมพันธ์ระยะยาวกับวิศวกรของลูกค้า'),
      'strategy.7': t(
        'เริ่มจากโรงกลึงเล็ก ๆ ของคุณพ่อ จุดเปลี่ยนคือปี 2014 ที่ได้ออร์เดอร์แรกจากผู้ผลิตญี่ปุ่น ทุกวันนี้ส่งออกหกประเทศ',
      ),
      'strategy.8': t('ของถึงตรงเวลา ทุกครั้ง'),
      'strategy.9': t('อยากให้จำว่าเราเป็นคนที่เขาโทรหาได้ตอนตีสองแล้วมีคนรับ'),
      /* the split — this camp describes procurement engineers */
      'strategy.10': t(
        'ลูกค้าหลักคือฝ่ายจัดซื้อและวิศวกรโรงงานประกอบรถยนต์ ตัดสินใจกันเป็นคณะ ใช้เวลาสามถึงหกเดือน ดูสเปกกับประวัติการส่งมอบก่อนราคา',
      ),
      'strategy.11': t('ทีมเราพูดถึงตัวเลข รอบการผลิต ค่าความคลาดเคลื่อน ไม่ค่อยพูดเรื่องแบรนด์'),
      'strategy.12': t('ความสบายใจว่าไม่ต้องกังวลเรื่องนี้อีก'),
      /* clarity gap — left blank on purpose */
      'strategy.14': t('สุภาพ ตรงไปตรงมา เป็นมืออาชีพ ไม่ต้องหวือหวา'),

      'visual.1': multi('Elegant', 'Innovative', 'Natural'),
      'visual.2': t('น่าเชื่อถือ แม่นยำ นิ่ง'),
      'visual.3': t(
        'ชอบงานของ Siemens และ Bosch — mood ที่สะอาด layout ที่มีระเบียบ ใช้พื้นที่ว่างเยอะ อ่านง่ายแม้เป็นข้อมูลเทคนิค',
      ),
      /* mutual avoid — this camp rejects exactly what camp B chose */
      'visual.4': multi('Too Playful', 'Too Trendy', 'Cheap'),
      'visual.5': multi('Character', 'Colorful Palette', '3D'),
      /* clarity gap */
      'visual.7': t('ต้องใช้กับ catalogue พิมพ์ นามบัตร และ presentation ให้ลูกค้าองค์กร ขอไฟล์ AI และ PDF'),
    },
  },
  {
    name: 'คุณกฤต ชัยพัฒน์',
    email: 'krit@example.co.th',
    answers: {
      'strategy.1': t('งานเราคือความแม่นยำระดับไมครอน และเอกสารรับรองที่ผ่านการตรวจของลูกค้าญี่ปุ่น'),
      'strategy.2': t('เจ้าที่ไม่เคยทำให้ไลน์หยุด'),
      'strategy.3': t('ความกังวลว่าซัพพลายเออร์ไทยจะคุมคุณภาพไม่ได้ เราลบข้อกังวลนั้นด้วยตัวเลข'),
      'strategy.4': t('เราเปิดโรงงานให้ลูกค้าเข้ามาตรวจได้ทุกเมื่อ คู่แข่งส่วนใหญ่ไม่ยอม'),
      'strategy.5': scale({ '0': 5, '1': 2, '2': 1, '3': 2, '4': 4, '5': 2, '6': 2, '7': 2, '8': 2, '9': 2 }),
      'strategy.6': t('มาตรฐาน ISO · ความโปร่งใสเรื่องต้นทุน · ไม่รับงานที่ทำไม่ได้'),
      'strategy.7': t('โรงกลึงเล็ก ๆ เมื่อยี่สิบปีก่อน ตอนนี้มีสามสายการผลิต'),
      'strategy.8': t('เอกสารครบ ตรวจสอบย้อนกลับได้ทุกล็อต'),
      'strategy.9': t('เป็นซัพพลายเออร์ที่ไม่ต้องคอยตาม'),
      'strategy.10': t(
        'ลูกค้าคือโรงงานประกอบ ซื้อผ่านระบบจัดซื้อ มีการประมูล ต้องผ่าน audit ก่อนถึงจะเป็นคู่ค้าได้',
      ),
      'strategy.11': t('เราพูดเรื่องสเปกเป็นหลัก'),
      'strategy.12': t('ความไว้ใจ'),
      'strategy.13': t('ยังไม่มี ยังไม่เคยคุยกันเรื่องนี้'),
      'strategy.14': t('เป็นทางการ กระชับ'),

      'visual.1': multi('Elegant', 'Innovative', 'Bold'),
      'visual.2': t('แม่นยำ มั่นคง สะอาด'),
      'visual.3': t('ชอบ layout แบบ catalogue เยอรมัน อ่านง่าย ไม่มีอะไรเกิน'),
      'visual.4': multi('Too Playful', 'Too Cute', 'Cheap'),
      'visual.5': multi('Character', 'Illustration', 'Colorful Palette'),
      'visual.7': t('ขอไฟล์ต้นฉบับทั้งหมด และคู่มือการใช้โลโก้'),
    },
  },
  {
    name: 'คุณสิริพร มณีรัตน์',
    email: 'siriporn@example.co.th',
    answers: {
      'strategy.1': t('ความแม่นยำและการส่งมอบ เป็นสองอย่างที่เราไม่เคยพลาด'),
      'strategy.2': t('แบรนด์ที่โรงงานระดับโลกเลือก'),
      'strategy.3': t('ลูกค้ากลัวเปลี่ยนซัพพลายเออร์แล้วเจอปัญหา เราทำให้การเปลี่ยนมาหาเราไม่เจ็บ'),
      'strategy.4': t('เราตอบอีเมลภายในสองชั่วโมง คู่แข่งใช้เวลาสองวัน'),
      'strategy.5': scale({ '0': 4, '1': 2, '2': 2, '3': 3, '4': 3, '5': 3, '6': 2, '7': 3, '8': 2, '9': 3 }),
      'strategy.6': t('ความตรงเวลา · ความซื่อสัตย์เรื่องปัญหา · คุณภาพคงที่'),
      'strategy.7': t('เริ่มปี 2004 จุดเปลี่ยนคือได้ลูกค้าญี่ปุ่นรายแรก'),
      'strategy.8': t('การตอบกลับที่เร็ว'),
      'strategy.9': t('อยากให้รู้สึกว่าเลือกถูกแล้ว'),
      'strategy.10': t(
        'กลุ่มหลักคือผู้จัดการฝ่ายจัดซื้อของโรงงานขนาดใหญ่ ทำงานกับเราแบบสัญญายาว',
      ),
      'strategy.11': t('เราพูดถึงความน่าเชื่อถือ'),
      'strategy.12': t('ความมั่นใจ'),
      'strategy.14': t('มืออาชีพ อบอุ่นได้แต่ไม่เล่น'),

      'visual.1': multi('Elegant', 'Natural', 'Innovative'),
      'visual.2': t('สะอาด เชื่อถือได้ ทันสมัย'),
      'visual.3': t('ชอบเว็บของแบรนด์ญี่ปุ่นที่ใช้สีน้อย ตัวอักษรอ่านง่าย และรูปโรงงานจริง'),
      'visual.4': multi('Too Playful', 'Too Trendy'),
      'visual.5': multi('3D', 'Character'),
      'visual.6': t('สีน้ำเงินเดิมของบริษัทต้องเก็บไว้ ลูกค้าญี่ปุ่นจำสีนี้ได้'),
      'visual.7': t('ใช้กับ print เป็นหลัก'),
    },
  },

  /* ── camp B · walk-in consumers, playful ─────────────────────────── */
  {
    name: 'คุณพลอย เจริญสุข',
    email: 'ploy@example.co.th',
    answers: {
      'strategy.1': t('เราเปิดหน้าร้านขายอะไหล่แต่งรถให้คนทั่วไป เข้ามาเลือกเองได้ จับได้ ลองได้'),
      'strategy.2': t('ร้านที่วัยรุ่นนึกถึงก่อนเวลาจะแต่งรถ'),
      'strategy.3': t('ลูกค้ากลัวซื้อของปลอม เราให้ลองของจริงหน้าร้าน'),
      'strategy.4': t('คู่แข่งขายออนไลน์อย่างเดียว เรามีหน้าร้านให้มาเล่นได้'),
      'strategy.5': scale({ '0': 5, '1': 5, '2': 5, '3': 5, '4': 2, '5': 5, '6': 3, '7': 5, '8': 4, '9': 4 }),
      'strategy.6': t('ราคาที่บอกตรง ๆ · ของแท้ · บรรยากาศร้านที่เข้ามาแล้วสนุก'),
      'strategy.7': t('เริ่มจากขายในเฟซบุ๊ก จุดเปลี่ยนคือเปิดหน้าร้านปี 2021 แล้วคนมาถ่ายรูปลงไอจี'),
      'strategy.8': t('ของแท้ ราคาไม่หลอก'),
      'strategy.9': t('อยากให้จำว่าเป็นร้านที่คุยสนุก ไม่กดดันให้ซื้อ'),
      /* the other side of the split — walk-in consumers, decided in minutes */
      'strategy.10': t(
        'ลูกค้าเราคือคนทั่วไปอายุ 18-30 เดินเข้าร้านเอง ตัดสินใจซื้อภายในสิบนาที ดูจากหน้าตาของกับรีวิวในติ๊กต๊อก',
      ),
      'strategy.11': t('เราคุยกับลูกค้าเหมือนเพื่อน ใช้คำแบบที่วัยรุ่นใช้'),
      'strategy.12': t('ความรู้สึกว่าร้านนี้เป็นพวกเดียวกับเรา'),
      'strategy.13': t('อยากให้ทีมจำว่าเราขายความสนุก ไม่ได้ขายอะไหล่'),
      'strategy.14': t('เป็นกันเอง ขำได้ ใช้ภาษาพูด'),

      'visual.1': multi('Playful', 'Bold', 'Friendly'),
      'visual.2': t('สนุก แรง จำได้'),
      'visual.3': t('ชอบงานของ Red Bull กับพวกแบรนด์สเก็ต — สีจัด ตัวหนังสือใหญ่ ดูมีพลัง'),
      /* mutual avoid — exactly camp A's chosen mood */
      'visual.4': multi('Too Corporate', 'Too Serious', 'Too Luxury'),
      'visual.5': multi('Serif Font', 'Minimal Style'),
      'visual.7': t('ใช้กับไอจี ติ๊กต๊อก สติกเกอร์ติดรถ เสื้อ'),
    },
  },
  {
    /* the outlier and the stated–revealed gap in one person: says accessible
       and everyday, admires only exclusive brands */
    name: 'คุณวิน อารีย์',
    email: 'win@example.co.th',
    answers: {
      'strategy.1': t('เราขายให้ทุกคน ใครก็เข้าถึงได้ ไม่ต้องรู้เรื่องรถก็เดินเข้ามาได้'),
      'strategy.2': t('แบรนด์ที่ใคร ๆ ก็ใช้'),
      'strategy.3': t('คนกลัวว่าจะโดนหลอกเพราะไม่มีความรู้ เราอธิบายให้ฟังจนเข้าใจ'),
      'strategy.4': t('เราเป็นมิตรกว่า ไม่ทำให้ใครรู้สึกโง่'),
      /* against everyone on almost every pair */
      'strategy.5': scale({ '0': 1, '1': 5, '2': 5, '3': 5, '4': 1, '5': 1, '6': 5, '7': 1, '8': 1, '9': 5 }),
      'strategy.6': t('ความเป็นกันเอง · ราคาที่ทุกคนจ่ายได้ · ไม่ดูถูกใคร'),
      'strategy.7': t('ยังไม่มี'),
      'strategy.8': t('ความรู้สึกว่าไม่โดนเอาเปรียบ'),
      'strategy.9': t('อยากให้รู้สึกว่าเป็นร้านของทุกคน'),
      'strategy.10': t('ลูกค้าคือคนธรรมดา เดินผ่านแล้วแวะ ไม่ได้วางแผนมาก่อน'),
      'strategy.11': t('เราพูดง่าย ๆ ไม่ใช้ศัพท์เทคนิค'),
      'strategy.12': t('ความอบอุ่น'),
      'strategy.14': t('อบอุ่น เข้าถึงง่าย เหมือนคุยกับคนรู้จัก'),

      'visual.1': multi('Friendly', 'Natural', 'Playful'),
      'visual.2': t('อบอุ่น เข้าถึงง่าย ไม่หรู'),
      /* the reveal — every reference is a luxury house */
      'visual.3': t(
        'ชอบงานของ Hermès, Aesop และ Apple มาก ๆ ชอบที่มันดูแพงและสงบ ชอบการใช้พื้นที่ว่างและกระดาษดี ๆ',
      ),
      'visual.4': other(['Cheap', 'Too Cute'], 'ไม่อยากให้ดูเหมือนร้านข้างทาง'),
      'visual.5': multi('Colorful Palette'),
      'visual.6': t('ยังไม่มี'),
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
    .values({ clientId: client.id, package: 'brand', stage: 2 })
    .returning();

  const [survey] = await db
    .insert(surveys)
    .values({
      projectId: project.id,
      kind: 'discovery',
      token: makeToken(),
      questionVersion: CURRENT_QUESTION_VERSION,
      blockKeys: [...PACKAGE_BLOCKS.brand],
    })
    .returning();

  /* resolve "strategy.10" style refs to question ids, at this survey's version */
  const blocks = await db
    .select()
    .from(questionBlocks)
    .where(inArray(questionBlocks.key, survey.blockKeys));
  const qs = (
    await db
      .select()
      .from(questions)
      .where(
        inArray(
          questions.blockId,
          blocks.map((b) => b.id),
        ),
      )
  ).filter((q) => q.version === survey.questionVersion);

  const keyOf = new Map(blocks.map((b) => [b.id, b.key]));
  const idByRef = new Map(qs.map((q) => [`${keyOf.get(q.blockId)}.${q.order}`, q.id]));

  const identity = qs
    .filter((q) => keyOf.get(q.blockId) === 'identity')
    .sort((a, b) => a.order - b.order);

  for (const person of PEOPLE) {
    const [response] = await db
      .insert(responses)
      .values({
        surveyId: survey.id,
        respondentName: person.name,
        email: person.email,
      })
      .returning();

    /* the email question was retired at version 4; the name is all the
       identity block holds now, and older versions still have both */
    const rows: { responseId: string; questionId: string; value: AnswerValue }[] = [
      { responseId: response.id, questionId: identity[0].id, value: t(person.name) },
    ];
    if (identity[1]) {
      rows.push({ responseId: response.id, questionId: identity[1].id, value: t(person.email) });
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
  console.log(`${PEOPLE.length} respondents at question version ${survey.questionVersion} · project ${project.id}`);
  console.log(
    'Planted: audience split (unmarked) · mutual-avoid contradiction · clarity gaps · outlier · stated–revealed gap',
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
