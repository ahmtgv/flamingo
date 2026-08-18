#!/usr/bin/env node
/**
 * 🔴 ПРИБОР ДЛЯ ПОДПИСОК: что увидела ВТОРАЯ сторона (промпт 34 §1).
 *
 * Подписывается настоящим веб-сокетом (`graphql-transport-ws`) как второй человек, потом
 * вызывает событие от первого — и печатает КАДР, который пришёл второму. Не «резолвер есть»
 * и не «схема называет» — этими двумя доводами список живых подписок в CLAUDE.md держался,
 * пока 16.08 все восемь не оказались мёртвыми разом.
 *
 * `boardChanged` здесь нет: он сторожится обычным прогоном, `e2e/live.spec.ts`.
 *
 * Запуск (бэкенд на 8000, база `flamingo`):
 *     node frontend/scripts/subs-probe.mjs
 *
 * ⚠️ Заводит учётки и класс в базе, на которую смотрит. По умолчанию это рабочая база
 * разработчика; для другой — `POSTGRES_DB=...`.
 */
const SEED_PY = `
import django, time
django.setup()
from datetime import date
from django.utils import timezone
from apps.accounts import services as accounts
from apps.courses import services as courses
from apps.exercises.models import LexicalItem
from apps.institutions.models import Group, GroupMembership, GroupTeacher, Institution, InstitutionMembership
from apps.meetingpoint import services as mp
from apps.scheduling import services as scheduling
from common.auth import issue_tokens
from common.enums import MembershipRole, MembershipStatus, Role

n = int(time.time())
t = accounts.register_user(email='cls-t-%d@flamingo-test.invalid' % n, password='T3stPass!2026', first_name='Ирина', last_name='Петровна', role=Role.TEACHER, specialty='Английский', consent_152fz=True)
p = accounts.register_user(email='cls-p-%d@flamingo-test.invalid' % n, password='T3stPass!2026', first_name='Аня', last_name='Коваль', role=Role.STUDENT, birth_date=date(2011, 5, 1), consent_152fz=True)
school = Institution.objects.create(name='Гимназия %d' % n)
g = Group.objects.create(institution=school, name='9А')
GroupMembership.objects.create(group=g, student=p.student_profile)
GroupTeacher.objects.create(group=g, teacher=t.teacher_profile, subject='Английский')
for u, r in ((t, MembershipRole.TEACHER), (p, MembershipRole.STUDENT)):
    InstitutionMembership.objects.create(user=u, institution=school, role=r.value, status=MembershipStatus.ACTIVE.value)
c = courses.create_course(t, title='Класс A2', subject='Английский', level='grade_9', institution_id=school.id, group_id=g.id)
sec = courses.create_section(t, c.id, title='Unit 1')
les = courses.create_lesson(t, sec.id, title='Урок класса', duration_min=40)
courses.publish_lesson(t, les.id)
courses.publish_course(t, c.id)
s = scheduling.schedule_session(t, lesson_id=les.id, start_at=timezone.now(), group_id=g.id)
scheduling.start_session(t, s.id)
# Слово урока: без него \`showWordToClass\` нечего показывать. Источник и лицензия обязательны
# — база их проверяет ограничением, и это решение владельца про открытые базы, не формальность.
item, _ = LexicalItem.objects.get_or_create(lemma='travel', pos='verb', defaults=dict(translation_ru='путешествовать', cefr_level='A2', source='wordnet', license='CC BY 4.0', attribution='Open English WordNet'))
les.words.add(item)
print('TEACHER_TOKEN=' + issue_tokens(t)['token'])
print('PUPIL_TOKEN=' + issue_tokens(p)['token'])
print('COURSE=' + str(c.id))
print('LESSON=' + str(les.id))
print('SESSION=' + str(s.id))
print('SLUG=' + mp.for_teacher(t, g.id).slug)
`;

import WebSocket from 'ws';

const API = 'http://localhost:8000/graphql/';
const WS = 'ws://localhost:8000/graphql/';

async function gql(query, variables, token) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0].message);
  return j.data;
}

/** Подписаться и дождаться первого кадра (или сдаться по таймауту). */
function listen(token, query, variables, ms = 6000) {
  return new Promise((resolve) => {
    const ws = new WebSocket(WS, 'graphql-transport-ws');
    let done = false;
    const finish = (v) => { if (!done) { done = true; try { ws.close(); } catch {} resolve(v); } };
    const timer = setTimeout(() => finish({ got: null, note: 'кадра не пришло' }), ms);
    ws.on('open', () => ws.send(JSON.stringify({ type: 'connection_init', payload: { authToken: token } })));
    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString());
      if (m.type === 'connection_ack') {
        ws.send(JSON.stringify({ id: '1', type: 'subscribe', payload: { query, variables } }));
        setTimeout(() => resolve.ready?.(), 0);
        listen.ready?.();
      } else if (m.type === 'next') { clearTimeout(timer); finish({ got: m.payload.data, note: '' }); }
      else if (m.type === 'error') { clearTimeout(timer); finish({ got: null, note: 'ОШИБКА: ' + JSON.stringify(m.payload).slice(0, 90) }); }
      else if (m.type === 'complete') { clearTimeout(timer); finish({ got: null, note: 'поток закрылся молча' }); }
    });
    ws.on('error', (e) => { clearTimeout(timer); finish({ got: null, note: 'сокет: ' + String(e).slice(0, 60) }); });
  });
}

const REG_T = `mutation($i: RegisterUserInput!){ registerUser(input:$i){ token } }`;
const stamp = Date.now();

const teacher = (await gql(REG_T, { i: { email: `subs-t-${stamp}@flamingo-test.invalid`, password: 'T3stPass!2026', firstName: 'Ирина', lastName: 'Петровна', role: 'TEACHER', consent152fz: true } })).registerUser.token;
const pupil = (await gql(REG_T, { i: { email: `subs-p-${stamp}@flamingo-test.invalid`, password: 'T3stPass!2026', firstName: 'Аня', lastName: 'Коваль', role: 'STUDENT', student: { birthDate: '2011-05-01' }, consent152fz: true } })).registerUser.token;

const course = (await gql('mutation($i: CourseInput!){ createCourse(input:$i){ id } }', { i: { title: 'Подписки A2', subject: 'Английский', level: 'GRADE_9' } }, teacher)).createCourse.id;
const section = (await gql('mutation($c:ID!,$t:String!){ createSection(courseId:$c, input:{title:$t}){ id } }', { c: course, t: 'Unit 1' }, teacher)).createSection.id;
const lesson = (await gql('mutation($s:ID!,$t:String!){ createLesson(sectionId:$s, input:{title:$t, durationMin:40}){ id } }', { s: section, t: 'Урок' }, teacher)).createLesson.id;
await gql('mutation($l:ID!){ publishLesson(id:$l){ id } }', { l: lesson }, teacher);
await gql('mutation($c:ID!){ publishCourse(id:$c){ id } }', { c: course }, teacher);
await gql('mutation($c:ID!){ enroll(courseId:$c){ id } }', { c: course }, pupil);
const session = (await gql('mutation($i: ScheduleSessionInput!){ scheduleSession(input:$i){ id } }', { i: { lessonId: lesson, startAt: new Date().toISOString() } }, teacher)).scheduleSession.id;
await gql('mutation($s:ID!){ startSession(sessionId:$s){ id } }', { s: session }, teacher);

const results = [];
async function probe(name, { who, query, variables, fire }) {
  // Подписчик — ВТОРАЯ сторона; событие вызывает первая.
  const waiting = listen(who, query, variables);
  await new Promise((r) => setTimeout(r, 1200)); // дать подписке встать
  let fireNote = '';
  try { await fire(); } catch (e) { fireNote = ' | вызвать событие не вышло: ' + String(e.message).slice(0, 60); }
  const { got, note } = await waiting;
  const seen = got ? JSON.stringify(got).slice(0, 80) : '—';
  results.push({ name, ok: Boolean(got), seen: got ? seen : note + fireNote });
  console.log(`${got ? '✅' : '🔴'} ${name.padEnd(24)} ${got ? 'вторая сторона увидела: ' + seen : note + fireNote}`);
}

await probe('chatMessageReceived', {
  who: pupil,
  query: 'subscription($s:ID!){ chatMessageReceived(sessionId:$s){ id text } }',
  variables: { s: session },
  fire: () => gql('mutation($s:ID!,$t:String!){ sendChatMessage(sessionId:$s, text:$t){ id } }', { s: session, t: 'здравствуйте, класс' }, teacher),
});

await probe('projectorFocusChanged', {
  who: pupil,
  query: 'subscription($s:ID!){ projectorFocusChanged(sessionId:$s){ sessionId } }',
  variables: { s: session },
  fire: () => gql('mutation($s:ID!){ setProjectorFocus(sessionId:$s){ sessionId } }', { s: session }, teacher),
});

await probe('attentionUpdates', {
  who: teacher,
  query: 'subscription($s:ID!){ attentionUpdates(sessionId:$s){ studentId avgAttention } }',
  variables: { s: session },
  fire: async () => {
    await gql('mutation($g:Boolean!){ setAttentionConsent(granted:$g) }', { g: true }, pupil);
    await gql('mutation($i: AttentionInput!){ reportAttention(input:$i) }', { i: { sessionId: session, bucketStart: new Date().toISOString(), avgAttention: 71 } }, pupil);
  },
});

await probe('signals', {
  who: pupil,
  query: 'subscription($s:ID!){ signals(sessionId:$s){ kind } }',
  variables: { s: session },
  fire: async () => {
    const me = (await gql('{ me { id } }', {}, pupil)).me.id;
    await gql('mutation($s:ID!,$to:ID!,$k:SignalKind!,$p:String!){ sendSignal(sessionId:$s,toPeer:$to,kind:$k,payload:$p) }', { s: session, to: me, k: 'OFFER', p: '{}' }, teacher);
  },
});

// --- стенд КЛАССА -------------------------------------------------------------------
// Три подписки живут не на курсе-программе, а на КЛАССЕ: канал предмета, точка встречи
// группы, словарь урока. Через API класс не завести — `createInstitution` требует сотрудника
// платформы (ровно то, что нашёл ролевой аудит промпта 27). Поэтому класс сеется напрямую.
const { execFileSync } = await import('node:child_process');
const seedOut = execFileSync(new URL('../../backend/.venv/bin/python', import.meta.url).pathname, ['-c', SEED_PY], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PYTHONPATH: new URL('../../backend', import.meta.url).pathname,
    LC_ALL: 'en_US.UTF-8',
    POSTGRES_HOST: 'localhost',
    POSTGRES_USER: 'flamingo',
    POSTGRES_PASSWORD: 'flamingo',
    POSTGRES_DB: process.env.POSTGRES_DB ?? 'flamingo',
    DJANGO_SETTINGS_MODULE: 'config.settings',
  },
  encoding: 'utf8',
});
const cls = Object.fromEntries(
  seedOut.trim().split('\n').filter((l) => l.includes('=')).map((l) => l.split('=')),
);
const teacher2 = cls.TEACHER_TOKEN;
const pupil2 = cls.PUPIL_TOKEN;
const { COURSE: groupCourse, LESSON: groupLesson, SESSION: groupSession, SLUG: slug } = cls;

// --- channelMessageReceived ---------------------------------------------------------
{
  try {
    const channel = (await gql('mutation($c:ID!){ openSubjectChannel(courseId:$c){ id } }', { c: groupCourse }, teacher2)).openSubjectChannel.id;
    await probe('channelMessageReceived', {
      who: pupil2,
      query: 'subscription($c:ID!){ channelMessageReceived(channelId:$c){ id text } }',
      variables: { c: channel },
      fire: () => gql('mutation($c:ID!,$t:String!){ sendChannelMessage(channelId:$c, text:$t){ id } }', { c: channel, t: 'привет предмету' }, teacher2),
    });
  } catch (e) {
    console.log('🔴 channelMessageReceived   упёрся: ' + String(e.message).slice(0, 90));
    results.push({ name: 'channelMessageReceived', ok: false, seen: String(e.message).slice(0, 70) });
  }
}

// --- hostPresenceChanged: ученик видит, что машина преподавателя вышла в сеть ---------
{
  try {
    await probe('hostPresenceChanged', {
      who: pupil2,
      query: 'subscription($s:String!){ hostPresenceChanged(slug:$s){ slug online } }',
      variables: { s: slug },
      fire: async () => {
        const code = (await gql('mutation($n:String!){ requestPairingCode(deviceName:$n){ code secret } }', { n: 'MacBook' }, teacher2)).requestPairingCode;
        await gql('mutation($c:String!){ confirmPairingCode(code:$c){ id } }', { c: code.code }, teacher2);
        const claimed = (await gql('mutation($c:String!,$s:String!){ claimDeviceToken(code:$c, secret:$s){ token } }', { c: code.code, s: code.secret })).claimDeviceToken;
        await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Device ${claimed.token}` }, body: JSON.stringify({ query: 'mutation{ hostHeartbeat{ slug online } }' }) });
      },
    });
  } catch (e) {
    console.log('🔴 hostPresenceChanged      упёрся: ' + String(e.message).slice(0, 90));
    results.push({ name: 'hostPresenceChanged', ok: false, seen: String(e.message).slice(0, 70) });
  }
}

// --- wordShown: показанное слово появляется у класса ---------------------------------
{
  try {
    const list = (await gql('query($l:ID!){ lessonWords(lessonId:$l){ id lemma } }', { l: groupLesson }, teacher2)).lessonWords;
    if (!list.length) throw new Error('в словаре урока нет ни одного слова — показывать нечего');
    await probe('wordShown', {
      who: pupil2,
      query: 'subscription($s:ID!){ wordShown(sessionId:$s){ sessionId } }',
      variables: { s: groupSession },
      fire: () => gql('mutation($s:ID!,$i:ID!){ showWordToClass(sessionId:$s, itemId:$i){ sessionId } }', { s: groupSession, i: list[0].id }, teacher2),
    });
  } catch (e) {
    console.log('🔴 wordShown                упёрся: ' + String(e.message).slice(0, 90));
    results.push({ name: 'wordShown', ok: false, seen: String(e.message).slice(0, 70) });
  }
}

console.log('\nИТОГ: живых ' + results.filter((r) => r.ok).length + ' из ' + results.length);
