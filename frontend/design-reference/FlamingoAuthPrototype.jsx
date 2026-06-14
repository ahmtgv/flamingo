import React, { useState } from "react";
import {
  GraduationCap, Users, BookOpen, Building2,
  Eye, Lock, ArrowLeft, Check, Moon, Sun, Mail, ShieldCheck,
} from "lucide-react";

/**
 * Flamingo — auth screens (UI prototype on the design system).
 * Flow: role select -> role-aware registration -> login -> password reset.
 * Maps to features/auth in the web app and the GraphQL mutations
 * registerUser / login / requestPasswordReset / addChild / submitVerificationDocument.
 * Demo only: nothing is sent.
 */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Golos+Text:wght@400;500&display=swap');

.fa-root{
  --sans:'IBM Plex Sans',system-ui,sans-serif;
  --body:'Golos Text',system-ui,sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,monospace;
  min-height:100%;font-family:var(--body);
  background:var(--bg);color:var(--ink);
}
.fa-root[data-theme="light"]{
  --paper:#FBF8F2;--bg:#F4EFE6;--bg-subtle:#EDE7DB;
  --border:#E0D8CA;--border-strong:#CFC3B0;
  --ink:#2A2520;--n700:#4E473E;--n600:#6E6456;--n500:#8B7F69;--n400:#A99D87;
  --coral-700:#A23A1C;--coral-600:#BE4622;--coral-500:#D2562E;--coral-400:#E8794F;
  --coral-100:#F6D8C8;--coral-50:#FBEDE6;
  --success:#3F8F5F;--error:#C8392B;--error-bg:#F8E3DF;
  --field:#FFFFFF;--ring:#E8794F;
}
.fa-root[data-theme="dark"]{
  --paper:#2C2820;--bg:#232019;--bg-subtle:#353027;
  --border:#3A352C;--border-strong:#4A4438;
  --ink:#F1EBDF;--n700:#D8CFBD;--n600:#CABFA9;--n500:#A99D87;--n400:#8B7F69;
  --coral-700:#E8946B;--coral-600:#D2562E;--coral-500:#E8794F;--coral-400:#E8946B;
  --coral-100:#4A2A1C;--coral-50:#3A2218;
  --success:#6FB98C;--error:#E08A7E;--error-bg:#3A211C;
  --field:#1E1B15;--ring:#D2562E;
}

.fa-shell{min-height:100vh;display:flex;flex-direction:column}
.fa-bar{display:flex;align-items:center;justify-content:space-between;
  padding:16px 22px;border-bottom:1px solid var(--border);background:var(--paper)}
.fa-logo{font-family:var(--sans);font-weight:600;font-size:20px;letter-spacing:-.01em;
  display:inline-flex;align-items:flex-end;color:var(--ink)}
.fa-logo .dot{width:7px;height:7px;border-radius:50%;background:var(--coral-500);margin-left:5px;margin-bottom:4px}
.fa-bar-right{display:flex;align-items:center;gap:12px}
.fa-badge{font-family:var(--mono);font-size:11px;letter-spacing:.03em;color:var(--n500);
  border:1px solid var(--border);border-radius:999px;padding:5px 11px;white-space:nowrap}
.fa-tt{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;
  border-radius:10px;border:1px solid var(--border-strong);background:transparent;color:var(--n700);cursor:pointer}
.fa-tt:hover{background:var(--bg-subtle)}

.fa-main{flex:1;display:flex;align-items:flex-start;justify-content:center;padding:48px 20px 64px}
.fa-col{width:100%;max-width:460px}
.fa-col.wide{max-width:680px}

.fa-back{display:inline-flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;
  color:var(--n600);font-family:var(--body);font-size:14px;padding:6px 2px;margin-bottom:14px}
.fa-back:hover{color:var(--ink)}

.fa-head{margin-bottom:24px}
.fa-eyebrow{font-family:var(--mono);font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--coral-700)}
.fa-head h1{font-family:var(--sans);font-size:27px;font-weight:600;letter-spacing:-.015em;margin:8px 0 6px;line-height:1.2}
.fa-head p{font-size:15px;color:var(--n600)}

.fa-card{background:var(--paper);border:1px solid var(--border);border-radius:16px;
  padding:26px;box-shadow:0 1px 2px rgba(42,37,32,.06),0 2px 8px rgba(42,37,32,.05)}

/* role cards */
.fa-roles{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:520px){.fa-roles{grid-template-columns:1fr}}
.fa-rolecard{text-align:left;background:var(--paper);border:1px solid var(--border);border-radius:14px;
  padding:18px;cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .1s;font-family:var(--body)}
.fa-rolecard:hover{border-color:var(--coral-400);box-shadow:0 4px 14px rgba(42,37,32,.08)}
.fa-rolecard:active{transform:translateY(1px)}
.fa-rolecard .ic{width:40px;height:40px;border-radius:11px;background:var(--coral-50);
  border:1px solid var(--coral-100);display:flex;align-items:center;justify-content:center;margin-bottom:12px;color:var(--coral-700)}
.fa-rolecard h3{font-family:var(--sans);font-size:16px;font-weight:600;margin-bottom:4px;color:var(--ink)}
.fa-rolecard p{font-size:13px;color:var(--n600);line-height:1.45}

/* fields */
.fa-field{margin-bottom:15px}
.fa-field label{display:block;font-family:var(--sans);font-size:13.5px;font-weight:500;color:var(--n700);margin-bottom:6px}
.fa-field .req{color:var(--coral-600)}
.fa-input{width:100%;font-family:var(--body);font-size:15px;color:var(--ink);background:var(--field);
  border:1px solid var(--border-strong);border-radius:10px;padding:11px 13px;transition:border-color .15s,box-shadow .15s}
.fa-input::placeholder{color:var(--n400)}
.fa-input:hover{border-color:var(--n500)}
.fa-input:focus{outline:none;border-color:var(--coral-500);box-shadow:0 0 0 3px var(--paper),0 0 0 5px var(--ring)}
.fa-input.bad{border-color:var(--error)}
.fa-hint{font-size:12.5px;color:var(--n500);margin-top:6px;line-height:1.4}
.fa-err{font-size:12.5px;color:var(--error);margin-top:6px}
.fa-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:460px){.fa-row{grid-template-columns:1fr}}

/* segmented */
.fa-seg{display:inline-flex;background:var(--bg-subtle);border:1px solid var(--border);border-radius:11px;padding:3px;gap:3px;margin-bottom:18px;width:100%}
.fa-seg button{flex:1;font-family:var(--sans);font-size:13.5px;font-weight:500;color:var(--n600);
  background:transparent;border:none;border-radius:8px;padding:9px 8px;cursor:pointer;transition:background .15s,color .15s}
.fa-seg button[aria-pressed="true"]{background:var(--paper);color:var(--ink);box-shadow:0 1px 2px rgba(42,37,32,.08)}

/* checkbox */
.fa-check{display:flex;gap:11px;align-items:flex-start;padding:13px;border:1px solid var(--border);
  border-radius:11px;background:var(--bg-subtle);cursor:pointer;margin-bottom:8px}
.fa-check.bad{border-color:var(--error);background:var(--error-bg)}
.fa-box{width:22px;height:22px;border-radius:6px;border:1.5px solid var(--border-strong);background:var(--field);
  flex:none;display:flex;align-items:center;justify-content:center;color:#fff;margin-top:1px}
.fa-box.on{background:var(--coral-600);border-color:var(--coral-600)}
.fa-check span{font-size:13.5px;color:var(--n700);line-height:1.45}

/* buttons */
.fa-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--sans);
  font-size:15px;font-weight:600;padding:13px 20px;border-radius:11px;border:1px solid transparent;cursor:pointer;transition:background .15s,transform .1s}
.fa-btn:active{transform:translateY(1px)}
.fa-btn.block{width:100%}
.fa-btn.primary{background:var(--coral-600);color:#fff}
.fa-btn.primary:hover{background:var(--coral-700)}
.fa-root[data-theme="dark"] .fa-btn.primary{color:#231a14}
.fa-btn.ghost{background:transparent;color:var(--ink);border-color:var(--border-strong)}
.fa-btn.ghost:hover{background:var(--bg-subtle)}

.fa-note{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--n500);margin-top:14px;line-height:1.45}
.fa-note svg{flex:none;margin-top:1px;color:var(--n600)}

.fa-foot{margin-top:18px;text-align:center;font-size:14px;color:var(--n600)}
.fa-link{background:none;border:none;cursor:pointer;font-family:var(--body);font-size:14px;color:var(--coral-700);font-weight:500;padding:0}
.fa-link:hover{text-decoration:underline}
.fa-sub-actions{display:flex;justify-content:space-between;align-items:center;margin-top:4px;margin-bottom:2px}

/* success */
.fa-success{text-align:center;padding:8px 4px}
.fa-success .ok{width:56px;height:56px;border-radius:50%;background:var(--coral-50);border:1px solid var(--coral-100);
  color:var(--coral-700);display:flex;align-items:center;justify-content:center;margin:0 auto 18px}
.fa-success h2{font-family:var(--sans);font-size:22px;font-weight:600;margin-bottom:8px}
.fa-success p{font-size:15px;color:var(--n600);max-width:36ch;margin:0 auto 20px}
`;

const ROLES = [
  { key: "student", title: "Ученик", desc: "Школа или курсы. Интерфейс подстроится под возраст.", Icon: GraduationCap },
  { key: "parent", title: "Родитель", desc: "Следить за учёбой ребёнка и управлять доступом.", Icon: Users },
  { key: "teacher", title: "Преподаватель", desc: "Создавать курсы, вести занятия, оценивать.", Icon: BookOpen },
  { key: "admin", title: "Администратор", desc: "Учреждение: ученики, группы, отчёты.", Icon: Building2 },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function App() {
  const [theme, setTheme] = useState("light");
  const [screen, setScreen] = useState("role"); // role | register | login | reset | done
  const [role, setRole] = useState("student");
  const [age, setAge] = useState("teen"); // junior | teen | adult (student only)
  const [f, setF] = useState({});
  const [errs, setErrs] = useState({});
  const [doneKind, setDoneKind] = useState("register");

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const reset = () => { setF({}); setErrs({}); };

  const chooseRole = (k) => {
    setRole(k);
    setAge("teen");
    reset();
    setScreen("register");
  };

  // ---- validation -------------------------------------------------------
  const need = (o, k, v, msg) => { if (!v || !String(v).trim()) o[k] = msg; };

  const validateRegister = () => {
    const o = {};
    need(o, "firstName", f.firstName, "Укажите имя");
    if (role === "teacher") {
      need(o, "lastName", f.lastName, "Укажите фамилию");
      need(o, "specialty", f.specialty, "Укажите специальность");
    }
    if (role === "admin") need(o, "institution", f.institution, "Название учреждения");

    if (role === "student" && age === "junior") {
      need(o, "parentEmail", f.parentEmail, "Нужна почта родителя");
      if (f.parentEmail && !EMAIL_RE.test(f.parentEmail)) o.parentEmail = "Проверьте адрес";
      if (!f.consent) o.consent = "Нужно согласие на обработку данных ребёнка";
    } else {
      need(o, "email", f.email, "Укажите почту");
      if (f.email && !EMAIL_RE.test(f.email)) o.email = "Проверьте адрес";
    }
    if (role === "student" && age === "teen") need(o, "birthDate", f.birthDate, "Укажите дату рождения");

    need(o, "password", f.password, "Придумайте пароль");
    if (f.password && f.password.length < 8) o.password = "Минимум 8 символов";
    return o;
  };

  const submitRegister = () => {
    const o = validateRegister();
    setErrs(o);
    if (Object.keys(o).length) return;
    // -> services.register_user / addChild (demo: no network)
    setDoneKind(role === "student" ? `student_${age}` : role);
    setScreen("done");
  };

  const submitLogin = () => {
    const o = {};
    need(o, "email", f.email, "Укажите почту");
    if (f.email && !EMAIL_RE.test(f.email)) o.email = "Проверьте адрес";
    need(o, "password", f.password, "Введите пароль");
    setErrs(o);
    if (Object.keys(o).length) return;
    setDoneKind("login");
    setScreen("done");
  };

  const submitReset = () => {
    const o = {};
    need(o, "email", f.email, "Укажите почту");
    if (f.email && !EMAIL_RE.test(f.email)) o.email = "Проверьте адрес";
    setErrs(o);
    if (Object.keys(o).length) return;
    setDoneKind("reset");
    setScreen("done");
  };

  return (
    <div className="fa-root" data-theme={theme}>
      <style>{CSS}</style>
      <div className="fa-shell">
        <div className="fa-bar">
          <span className="fa-logo">flamingo<span className="dot" /></span>
          <div className="fa-bar-right">
            <span className="fa-badge">прототип · данные не отправляются</span>
            <button className="fa-tt" onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              aria-label="Переключить тему">
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </div>

        <div className="fa-main">
          {screen === "role" && (
            <div className="fa-col wide">
              <div className="fa-head">
                <span className="fa-eyebrow">Регистрация</span>
                <h1>Кто вы на платформе?</h1>
                <p>Выберите роль — форму подстроим под неё.</p>
              </div>
              <div className="fa-roles">
                {ROLES.map(({ key, title, desc, Icon }) => (
                  <button key={key} className="fa-rolecard" onClick={() => chooseRole(key)}>
                    <span className="ic"><Icon size={20} /></span>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </button>
                ))}
              </div>
              <div className="fa-foot">
                Уже есть аккаунт?{" "}
                <button className="fa-link" onClick={() => { reset(); setScreen("login"); }}>Войти</button>
              </div>
            </div>
          )}

          {screen === "register" && (
            <div className="fa-col">
              <button className="fa-back" onClick={() => { reset(); setScreen("role"); }}>
                <ArrowLeft size={15} /> К выбору роли
              </button>
              <div className="fa-head">
                <span className="fa-eyebrow">{ROLES.find((r) => r.key === role).title}</span>
                <h1>Создать аккаунт</h1>
                <p>{role === "student" ? "Сначала уточните возраст ученика." : "Заполните несколько полей — это быстро."}</p>
              </div>

              <div className="fa-card">
                {role === "student" && (
                  <div className="fa-seg" role="group" aria-label="Возраст ученика">
                    {[["junior", "7–11 лет"], ["teen", "12–17 лет"], ["adult", "18+"]].map(([k, label]) => (
                      <button key={k} aria-pressed={age === k} onClick={() => { setAge(k); setErrs({}); }}>{label}</button>
                    ))}
                  </div>
                )}

                {/* STUDENT: junior (managed by parent) */}
                {role === "student" && age === "junior" && (
                  <>
                    <Field label="Имя ребёнка" value={f.firstName} onChange={set("firstName")} err={errs.firstName} placeholder="Соня" />
                    <Field label="Класс" value={f.grade} onChange={set("grade")} placeholder="3 класс" required={false} />
                    <Field label="Почта родителя" type="email" value={f.parentEmail} onChange={set("parentEmail")} err={errs.parentEmail}
                      placeholder="parent@example.com" hint="Аккаунтом младшего ученика управляет родитель." />
                    <PasswordField value={f.password} onChange={set("password")} err={errs.password} />
                    <Consent checked={!!f.consent} bad={!!errs.consent}
                      onToggle={() => setF((p) => ({ ...p, consent: !p.consent }))} />
                    {errs.consent && <div className="fa-err">{errs.consent}</div>}
                  </>
                )}

                {/* STUDENT: teen */}
                {role === "student" && age === "teen" && (
                  <>
                    <Field label="Имя" value={f.firstName} onChange={set("firstName")} err={errs.firstName} placeholder="Пётр" />
                    <div className="fa-row">
                      <Field label="Класс" value={f.grade} onChange={set("grade")} placeholder="8 класс" required={false} />
                      <Field label="Дата рождения" type="date" value={f.birthDate} onChange={set("birthDate")} err={errs.birthDate} />
                    </div>
                    <Field label="Почта" type="email" value={f.email} onChange={set("email")} err={errs.email} placeholder="you@example.com" />
                    <PasswordField value={f.password} onChange={set("password")} err={errs.password} />
                    <div className="fa-note"><Mail size={14} />Отправим письмо родителю для подтверждения — так требует закон для тех, кто младше 18.</div>
                  </>
                )}

                {/* STUDENT: adult */}
                {role === "student" && age === "adult" && (
                  <>
                    <Field label="Имя" value={f.firstName} onChange={set("firstName")} err={errs.firstName} placeholder="Анна" />
                    <Field label="Почта" type="email" value={f.email} onChange={set("email")} err={errs.email} placeholder="you@example.com" />
                    <PasswordField value={f.password} onChange={set("password")} err={errs.password} />
                  </>
                )}

                {/* PARENT */}
                {role === "parent" && (
                  <>
                    <Field label="Имя" value={f.firstName} onChange={set("firstName")} err={errs.firstName} placeholder="Мария" />
                    <Field label="Почта" type="email" value={f.email} onChange={set("email")} err={errs.email} placeholder="you@example.com" />
                    <PasswordField value={f.password} onChange={set("password")} err={errs.password} />
                    <div className="fa-note"><Users size={14} />Ребёнка можно добавить после входа — по коду или почте.</div>
                  </>
                )}

                {/* TEACHER */}
                {role === "teacher" && (
                  <>
                    <div className="fa-row">
                      <Field label="Имя" value={f.firstName} onChange={set("firstName")} err={errs.firstName} placeholder="Иван" />
                      <Field label="Фамилия" value={f.lastName} onChange={set("lastName")} err={errs.lastName} placeholder="Петров" />
                    </div>
                    <Field label="Специальность" value={f.specialty} onChange={set("specialty")} err={errs.specialty} placeholder="Математика" />
                    <Field label="Почта" type="email" value={f.email} onChange={set("email")} err={errs.email} placeholder="you@example.com" />
                    <PasswordField value={f.password} onChange={set("password")} err={errs.password} />
                    <div className="fa-note"><ShieldCheck size={14} />Диплом загрузите после входа — после проверки можно вести занятия.</div>
                  </>
                )}

                {/* ADMIN */}
                {role === "admin" && (
                  <>
                    <Field label="Имя" value={f.firstName} onChange={set("firstName")} err={errs.firstName} placeholder="Ольга" />
                    <Field label="Название учреждения" value={f.institution} onChange={set("institution")} err={errs.institution} placeholder="Школа №12" />
                    <Field label="Почта" type="email" value={f.email} onChange={set("email")} err={errs.email} placeholder="you@example.com" />
                    <PasswordField value={f.password} onChange={set("password")} err={errs.password} />
                    <div className="fa-note"><ShieldCheck size={14} />Данные учреждения проходят модерацию перед активацией.</div>
                  </>
                )}

                <button className="fa-btn primary block" style={{ marginTop: 8 }} onClick={submitRegister}>
                  Создать аккаунт
                </button>
              </div>

              <div className="fa-foot">
                Уже есть аккаунт?{" "}
                <button className="fa-link" onClick={() => { reset(); setScreen("login"); }}>Войти</button>
              </div>
            </div>
          )}

          {screen === "login" && (
            <div className="fa-col">
              <div className="fa-head">
                <span className="fa-eyebrow">Вход</span>
                <h1>С возвращением</h1>
                <p>Войдите, чтобы продолжить учиться или преподавать.</p>
              </div>
              <div className="fa-card">
                <Field label="Почта" type="email" value={f.email} onChange={set("email")} err={errs.email} placeholder="you@example.com" />
                <PasswordField value={f.password} onChange={set("password")} err={errs.password} label="Пароль" hideHint />
                <div className="fa-sub-actions">
                  <span />
                  <button className="fa-link" onClick={() => { reset(); setScreen("reset"); }}>Забыли пароль?</button>
                </div>
                <button className="fa-btn primary block" style={{ marginTop: 14 }} onClick={submitLogin}>Войти</button>
              </div>
              <div className="fa-foot">
                Нет аккаунта?{" "}
                <button className="fa-link" onClick={() => { reset(); setScreen("role"); }}>Зарегистрироваться</button>
              </div>
            </div>
          )}

          {screen === "reset" && (
            <div className="fa-col">
              <button className="fa-back" onClick={() => { reset(); setScreen("login"); }}>
                <ArrowLeft size={15} /> Ко входу
              </button>
              <div className="fa-head">
                <span className="fa-eyebrow">Сброс пароля</span>
                <h1>Восстановить доступ</h1>
                <p>Укажите почту — пришлём ссылку для нового пароля.</p>
              </div>
              <div className="fa-card">
                <Field label="Почта" type="email" value={f.email} onChange={set("email")} err={errs.email} placeholder="you@example.com" />
                <button className="fa-btn primary block" style={{ marginTop: 8 }} onClick={submitReset}>Отправить ссылку</button>
              </div>
            </div>
          )}

          {screen === "done" && (
            <div className="fa-col">
              <div className="fa-card fa-success">
                <div className="ok"><Check size={28} strokeWidth={2.5} /></div>
                <h2>{doneTitle(doneKind)}</h2>
                <p>{doneText(doneKind)}</p>
                <button className="fa-btn ghost" onClick={() => { reset(); setScreen(doneKind === "login" ? "role" : "login"); }}>
                  {doneKind === "login" ? "На главную" : doneKind === "reset" ? "Вернуться ко входу" : "Перейти ко входу"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- small components ------------------------------------------------------
function Field({ label, value = "", onChange, err, hint, placeholder, type = "text", required = true }) {
  return (
    <div className="fa-field">
      <label>{label} {required && <span className="req">*</span>}</label>
      <input className={"fa-input" + (err ? " bad" : "")} type={type} value={value}
        onChange={onChange} placeholder={placeholder} aria-invalid={!!err} />
      {err ? <div className="fa-err">{err}</div> : hint ? <div className="fa-hint">{hint}</div> : null}
    </div>
  );
}

function PasswordField({ value = "", onChange, err, label = "Пароль", hideHint }) {
  return (
    <div className="fa-field">
      <label>{label} <span className="req">*</span></label>
      <input className={"fa-input" + (err ? " bad" : "")} type="password" value={value}
        onChange={onChange} placeholder="Минимум 8 символов" autoComplete="new-password" aria-invalid={!!err} />
      {err ? <div className="fa-err">{err}</div> : (!hideHint && <div className="fa-hint">Минимум 8 символов.</div>)}
    </div>
  );
}

function Consent({ checked, onToggle, bad }) {
  return (
    <label className={"fa-check" + (bad ? " bad" : "")}>
      <span className={"fa-box" + (checked ? " on" : "")}>{checked && <Check size={14} strokeWidth={3} />}</span>
      <input type="checkbox" checked={checked} onChange={onToggle} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
      <span>Я даю согласие на обработку персональных данных ребёнка в соответствии с 152-ФЗ.</span>
    </label>
  );
}

// ---- success copy ----------------------------------------------------------
function doneTitle(kind) {
  if (kind === "login") return "Вход выполнен";
  if (kind === "reset") return "Проверьте почту";
  if (kind === "teacher") return "Аккаунт создан";
  return "Почти готово";
}
function doneText(kind) {
  switch (kind) {
    case "login": return "Это демо: в приложении здесь открылся бы ваш кабинет.";
    case "reset": return "Если такой адрес есть, мы отправили ссылку для сброса пароля.";
    case "student_junior": return "Аккаунт ребёнка создан. Подтвердите почту родителя — и можно за первое занятие.";
    case "student_teen": return "Аккаунт создан. Мы написали родителю: как только он подтвердит, вы сможете войти.";
    case "student_adult": return "Аккаунт создан. Проверьте почту, чтобы подтвердить адрес и войти.";
    case "parent": return "Аккаунт создан. Проверьте почту для подтверждения, затем добавьте ребёнка.";
    case "teacher": return "Проверьте почту для подтверждения. После входа загрузите диплом — и можно вести занятия.";
    case "admin": return "Аккаунт создан. Данные учреждения уйдут на модерацию после подтверждения почты.";
    default: return "Проверьте почту, чтобы подтвердить адрес.";
  }
}
