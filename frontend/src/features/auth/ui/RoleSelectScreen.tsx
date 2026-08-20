import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { type AgeBandUi } from '../model/validation';
import { AuthLayout } from './AuthLayout';
import { returnTo, withReturnTo } from '@/shared/lib/returnTo';

import styles from './auth.module.css';



export function RoleSelectScreen() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  // 🔴 §26.4: адрес назначения обязан пережить и выбор роли. Здесь он терялся — человек,
  // пришедший из приложения на `/link?code=…`, после регистрации оказывался на стартовой.
  const back = returnTo(location.search);

  /*
   * 🔴 ВОЗРАСТ УЧЕНИКА СПРАШИВАЕТСЯ ЗДЕСЬ, А НЕ ВНУТРИ ФОРМЫ (лист «Вход и регистрация»).
   *
   * Ветки уже были в продукте — младший, подросток, взрослый: у них разные правила согласия,
   * и это закон, а не оформление. Но выбирались они переключателем ВНУТРИ формы, то есть
   * человек сначала видел все поля сразу, а потом половина исчезала. Лист разводит это на два
   * шага: сперва «кто вы», потом форма ровно под эту ветку.
   *
   * ⚠️ Родителя и администратора лист не рисует. Я их НЕ убираю: убрать путь регистрации —
   * это ограничение продукта, а его выдумывать нельзя (наряд §7). Вопрос владельцу записан
   * в отчёте.
   */
  const AGE_OPTIONS: AgeBandUi[] = ['junior', 'teen', 'adult'];

  const rows: { key: string; to: string; title: string; desc: string; cost: string }[] = [
    ...AGE_OPTIONS.map((band) => ({
      key: `student-${band}`,
      to: `/register/student?age=${band}`,
      title: t(`roleSelect.student.${band}.title`),
      desc: t(`roleSelect.student.${band}.desc`),
      cost: t(`roleSelect.student.${band}.cost`),
    })),
    {
      key: 'teacher',
      to: '/register/teacher',
      title: t('roles.teacher.title'),
      desc: t('roleSelect.teacher.desc'),
      cost: t('roleSelect.teacher.cost'),
    },
    ...(['parent', 'admin'] as const).map((role) => ({
      key: role,
      to: `/register/${role}`,
      title: t(`roles.${role}.title`),
      desc: t(`roles.${role}.desc`),
      cost: '',
    })),
  ];

  return (
    <AuthLayout back={{ label: t('nav.toLanding'), to: '/' }} step={t('nav.step1')}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t('roleSelect.title')}</h1>
        <p className={styles.subtitle}>{t('roleSelect.subtitle')}</p>
      </div>

      <div className={styles.roles}>
        {rows.map((row) => (
          <button
            key={row.key}
            type="button"
            className={styles.roleCard}
            onClick={() => navigate(withReturnTo(row.to, back ?? ''))}
          >
            <span>
              <span className={styles.roleTitle}>{row.title}</span>
              <p className={styles.roleDesc}>{row.desc}</p>
            </span>
            {/* Цена ветки словом: во что человек ввязывается, до того как начал. */}
            {row.cost && <span className={styles.roleCost}>{row.cost}</span>}
          </button>
        ))}
      </div>

      <p className={styles.note}>
        {t('roleSelect.haveAccount')}{' '}
        <button
          type="button"
          className={styles.link}
          onClick={() => navigate(withReturnTo('/login', back ?? ''))}
        >
          {t('roleSelect.signIn')}
        </button>
      </p>
    </AuthLayout>
  );
}
