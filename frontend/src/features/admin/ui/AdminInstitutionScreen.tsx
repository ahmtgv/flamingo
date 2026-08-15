import { ICON_SM } from '@/shared/ui/iconSizes';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  type AdminInstitutionQuery,
  type InstitutionGroupsQuery,
  type InstitutionMembersQuery,
  type MembershipRole,
  useAddStudentsToGroupMutation,
  useAdminInstitutionQuery,
  useAssignTeacherMutation,
  useCreateGroupMutation,
  useInstitutionGroupsQuery,
  useInstitutionMembersQuery,
  useInviteMemberMutation,
  useRemoveMemberMutation,
  useRemoveStudentFromGroupMutation,
  useUpdateBrandingMutation,
  useUpdateInstitutionMutation,
  useUpdateMembershipMutation,
} from '@/entities/graphql/generated';
import { Badge, type BadgeTone, Button, ErrorState, Input, Select, SelectField, TextField } from '@/shared/ui';

import { AdminLayout } from './AdminLayout';
import styles from './admin.module.css';

const STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  INACTIVE: 'neutral',
};

type Institution = NonNullable<
  NonNullable<NonNullable<AdminInstitutionQuery['me']>['adminProfile']>['institution']
>;
type Member = InstitutionMembersQuery['institutionMembers'][number];
type Group = InstitutionGroupsQuery['groups'][number];

export function AdminInstitutionScreen() {
  const { t } = useTranslation(['admin', 'common']);
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useAdminInstitutionQuery();
  const institution = data?.me?.adminProfile?.institution ?? null;

  return (
    <AdminLayout>
      <div className={styles.content}>
        <button type="button" className={styles.back} onClick={() => navigate('/app')}>
          <ArrowLeft size={ICON_SM} /> {t('back')}
        </button>
        <h1 className={styles.pageTitle}>{t('title')}</h1>
        {/* Дверь в верификацию. Без неё экран существует и до него никто не доходит —
            ровно то, на что владелец пожаловался 15.08 про сам путь верификации. */}
        <div className={styles.actionsRow}>
          <Button variant="secondary" size="sm" onClick={() => navigate('/admin/verification')}>
            {t('verification.link')}
          </Button>
        </div>
        {error && !institution ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !institution ? (
          <p className={styles.empty}>
            {loading ? t('common:actions.loading') : t('noInstitution')}
          </p>
        ) : (
          <>
            <p className={styles.pageSub}>{institution.name}</p>
            <SettingsSection institution={institution} onDone={refetch} />
            <MembersSection institutionId={institution.id} currentUserId={data?.me?.id ?? ''} />
            <GroupsSection institutionId={institution.id} />
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function SettingsSection({ institution, onDone }: { institution: Institution; onDone: () => void }) {
  const { t } = useTranslation('admin');
  const brand = (institution.branding ?? {}) as Record<string, unknown>;
  const [name, setName] = useState(institution.name);
  const [address, setAddress] = useState(institution.address ?? '');
  const [website, setWebsite] = useState(institution.website ?? '');
  const [color, setColor] = useState(
    typeof brand.primaryColor === 'string' ? brand.primaryColor : '',
  );
  const [updateInstitution, { loading: savingInst }] = useUpdateInstitutionMutation();
  const [updateBranding, { loading: savingBrand }] = useUpdateBrandingMutation();

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await updateInstitution({ variables: { id: institution.id, input: { name, address, website } } });
    onDone();
  }

  async function saveBranding(e: FormEvent) {
    e.preventDefault();
    await updateBranding({
      variables: { institutionId: institution.id, branding: { ...brand, primaryColor: color } },
    });
    onDone();
  }

  return (
    <div className={styles.card}>
      <div className={styles.sectionTitle}>{t('settings.title')}</div>
      <form className={styles.form} onSubmit={saveSettings}>
        <div className={styles.formRow}>
          <TextField label={t('settings.name')} value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label={t('settings.website')}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
        <TextField
          label={t('settings.address')}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <div className={styles.actionsRow}>
          <Button type="submit" variant="primary" size="sm" loading={savingInst}>
            {t('settings.save')}
          </Button>
        </div>
      </form>
      <form className={styles.form} onSubmit={saveBranding}>
        <div className={styles.formRow}>
          <TextField
            label={t('settings.primaryColor')}
            placeholder="#E2725B"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <div className={styles.actionsRow}>
          <Button type="submit" variant="secondary" size="sm" loading={savingBrand}>
            {t('settings.saveBranding')}
          </Button>
          <span className={styles.muted}>{t('settings.brandingNote')}</span>
        </div>
      </form>
    </div>
  );
}

function MembersSection({
  institutionId,
  currentUserId,
}: {
  institutionId: string;
  currentUserId: string;
}) {
  const { t } = useTranslation(['admin', 'common']);
  const { data, loading, refetch } = useInstitutionMembersQuery({ variables: { institutionId } });
  const members = data?.institutionMembers ?? [];
  const activeAdminCount = members.filter(
    (m) => m.role === 'ADMIN' && m.status === 'ACTIVE',
  ).length;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MembershipRole>('STUDENT');
  const [err, setErr] = useState('');
  const [inviteMember, { loading: inviting }] = useInviteMemberMutation();
  const [updateMembership] = useUpdateMembershipMutation();
  const [removeMember] = useRemoveMemberMutation();

  async function invite(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (!email.trim()) return;
    try {
      await inviteMember({ variables: { input: { institutionId, email, role } } });
      setEmail('');
      await refetch();
    } catch {
      setErr(t('members.inviteError'));
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.sectionTitle}>{t('members.title')}</div>
      {loading ? (
        <p className={styles.muted}>{t('common:actions.loading')}</p>
      ) : members.length === 0 ? (
        <p className={styles.muted}>{t('members.empty')}</p>
      ) : (
        members.map((m: Member) => {
          const isActiveAdmin = m.role === 'ADMIN' && m.status === 'ACTIVE';
          const blockSelf = isActiveAdmin && m.user.id === currentUserId;
          const blockLast = isActiveAdmin && activeAdminCount === 1;
          return (
          <div className={styles.row} key={m.id}>
            <span className={styles.rowMain}>
              {m.user.firstName} {m.user.lastName}{' '}
              <span className={styles.rowSub}>· {m.user.email}</span>
            </span>
            <Badge tone="info">{t(`role.${m.role}`)}</Badge>
            <Badge tone={STATUS_TONE[m.status]}>{t(`status.${m.status}`)}</Badge>
            <div className={styles.actionsRow}>
              {m.status === 'PENDING' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await updateMembership({ variables: { id: m.id, status: 'ACTIVE' } });
                    await refetch();
                  }}
                >
                  {t('members.approve')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} />}
                disabled={blockSelf || blockLast}
                title={
                  blockSelf
                    ? t('members.cannotRemoveSelf')
                    : blockLast
                      ? t('members.cannotRemoveLast')
                      : undefined
                }
                onClick={async () => {
                  await removeMember({ variables: { id: m.id } });
                  await refetch();
                }}
              >
                {t('members.remove')}
              </Button>
            </div>
          </div>
          );
        })
      )}
      <form className={styles.form} onSubmit={invite}>
        <div className={styles.formRow}>
          <TextField
            label={t('members.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={err || undefined}
          />
          <SelectField
            label={t('members.role')}
            value={role}
            onChange={(e) => setRole(e.target.value as MembershipRole)}
          >
            <option value="STUDENT">{t('role.STUDENT')}</option>
            <option value="TEACHER">{t('role.TEACHER')}</option>
            <option value="ADMIN">{t('role.ADMIN')}</option>
          </SelectField>
        </div>
        <div className={styles.actionsRow}>
          <Button type="submit" variant="primary" size="sm" icon={<Plus size={ICON_SM} />} loading={inviting}>
            {t('members.invite')}
          </Button>
        </div>
      </form>
    </div>
  );
}

function GroupsSection({ institutionId }: { institutionId: string }) {
  const { t } = useTranslation(['admin', 'common']);
  const { data, loading, refetch } = useInstitutionGroupsQuery({ variables: { institutionId } });
  const { data: memberData } = useInstitutionMembersQuery({ variables: { institutionId } });
  const groups = data?.groups ?? [];
  const members = memberData?.institutionMembers ?? [];
  const students = members.filter((m) => m.role === 'STUDENT');
  const teachers = members.filter((m) => m.role === 'TEACHER');
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [createGroup, { loading: creating }] = useCreateGroupMutation();

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createGroup({ variables: { input: { institutionId, name, level } } });
    setName('');
    setLevel('');
    await refetch();
  }

  return (
    <div className={styles.card}>
      <div className={styles.sectionTitle}>{t('groups.title')}</div>
      {loading ? (
        <p className={styles.muted}>{t('common:actions.loading')}</p>
      ) : groups.length === 0 ? (
        <p className={styles.muted}>{t('groups.empty')}</p>
      ) : (
        groups.map((g: Group) => (
          <GroupBlock key={g.id} group={g} students={students} teachers={teachers} onDone={refetch} />
        ))
      )}
      <form className={styles.form} onSubmit={create}>
        <div className={styles.formRow}>
          <TextField label={t('groups.name')} value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label={t('groups.level')}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />
        </div>
        <div className={styles.actionsRow}>
          <Button type="submit" variant="primary" size="sm" icon={<Plus size={ICON_SM} />} loading={creating}>
            {t('groups.create')}
          </Button>
        </div>
      </form>
    </div>
  );
}

function GroupBlock({
  group,
  students,
  teachers,
  onDone,
}: {
  group: Group;
  students: Member[];
  teachers: Member[];
  onDone: () => void;
}) {
  const { t } = useTranslation('admin');
  const [studentId, setStudentId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [addStudents] = useAddStudentsToGroupMutation();
  const [removeStudent] = useRemoveStudentFromGroupMutation();
  const [assignTeacher, { loading: assigning }] = useAssignTeacherMutation();

  const inGroup = new Set(group.students.map((s) => s.user.id));
  const candidates = students.filter((s) => !inGroup.has(s.user.id));

  return (
    <div className={styles.group}>
      <div className={styles.groupHead}>
        <span className={styles.groupName}>{group.name}</span>
        {group.level && <Badge tone="neutral">{group.level}</Badge>}
      </div>

      <div className={styles.muted}>{t('groups.students')}</div>
      <div className={styles.chips}>
        {group.students.length === 0 ? (
          <span className={styles.muted}>—</span>
        ) : (
          group.students.map((s) => (
            <span className={styles.chip} key={s.user.id}>
              {s.user.firstName} {s.user.lastName}
              <button
                type="button"
                className={styles.chipDelete}
                aria-label={t('groups.removeStudent')}
                onClick={async () => {
                  await removeStudent({ variables: { groupId: group.id, studentId: s.user.id } });
                  await onDone();
                }}
              >
                <X size={12} />
              </button>
            </span>
          ))
        )}
      </div>
      {candidates.length > 0 && (
        <div className={styles.formRow}>
          <div>
            <Select
              aria-label={t('groups.addStudent')}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">{t('groups.addStudent')}</option>
              {candidates.map((s) => (
                <option key={s.user.id} value={s.user.id}>
                  {s.user.firstName} {s.user.lastName}
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={!studentId}
            onClick={async () => {
              await addStudents({ variables: { groupId: group.id, studentIds: [studentId] } });
              setStudentId('');
              await onDone();
            }}
          >
            {t('groups.add')}
          </Button>
        </div>
      )}

      <div className={styles.muted} style={{ marginTop: 'var(--space-2)' }}>
        {t('groups.teachers')}
      </div>
      <div className={styles.chips}>
        {group.teachers.length === 0 ? (
          <span className={styles.muted}>—</span>
        ) : (
          group.teachers.map((gt) => (
            <span className={styles.chip} key={gt.id}>
              {gt.teacher.user.firstName} {gt.teacher.user.lastName} · {gt.subject}
            </span>
          ))
        )}
      </div>
      {teachers.length > 0 && (
        <form
          className={styles.formRow}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!teacherId || !subject.trim()) return;
            await assignTeacher({ variables: { groupId: group.id, teacherId, subject } });
            setTeacherId('');
            setSubject('');
            await onDone();
          }}
        >
          <div>
            <Select
              aria-label={t('groups.assignTeacher')}
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
            >
              <option value="">{t('groups.assignTeacher')}</option>
              {teachers.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.firstName} {m.user.lastName}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Input
              placeholder={t('groups.subject')}
              aria-label={t('groups.subject')}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            loading={assigning}
            disabled={!teacherId || !subject.trim()}
          >
            {t('groups.assign')}
          </Button>
        </form>
      )}
    </div>
  );
}
