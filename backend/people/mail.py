"""Письмо со ссылкой на смену пароля.

🔴 Отправка почты — единственное место, которому нужен внешний сервис. Пока
в .env нет SMTP, письмо уходит в журнал сервера, а человеку мы всё равно отвечаем
«если такая почта у нас есть, письмо ушло». Так вход не ломается от того, что почта
ещё не настроена, но и врать в интерфейсе не приходится: письма правда нет,
и в журнале это видно.
"""
from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

from config.язык import сейчас

log = logging.getLogger("flamingo.mail")


#: Письма на всех языках сайта. Язык — язык страницы того, кто письмо
#: попросил (`config/язык.py`). Письма на языке нет — уходит английское.
ПИСЬМА: dict[str, dict[str, tuple[str, str]]] = {
    "сброс": {
        "ru": ("Flamingo · смена пароля",
               "{name}, здравствуйте.\n\n"
               "Кто-то попросил сменить пароль во Flamingo. Если это вы — вот ссылка:\n\n"
               "{link}\n\n"
               "Ссылка работает один час и только один раз.\n\n"
               "Если вы ничего не просили — просто не открывайте её. Пароль останется прежним, "
               "а в вашу учётную запись никто не вошёл: одной этой ссылки для входа мало.\n"),
        "en": ("Flamingo · password change",
               "Hello, {name}.\n\n"
               "Someone asked to change the password on Flamingo. If it was you, here is the link:\n\n"
               "{link}\n\n"
               "The link works for one hour and only once.\n\n"
               "If you didn't ask for anything, just don't open it. Your password stays the same, "
               "and nobody has signed in to your account: this link alone is not enough to sign in.\n"),
        "fr": ("Flamingo · changement de mot de passe",
               "Bonjour {name},\n\n"
               "Quelqu’un a demandé à changer le mot de passe sur Flamingo. Si c’est vous, voici le lien :\n\n"
               "{link}\n\n"
               "Le lien fonctionne pendant une heure et une seule fois.\n\n"
               "Si vous n’avez rien demandé, ne l’ouvrez simplement pas. Votre mot de passe reste le même, "
               "et personne ne s’est connecté à votre compte : ce lien seul ne suffit pas pour se connecter.\n"),
        "es": ("Flamingo · cambio de contraseña",
               "Hola, {name}:\n\n"
               "Alguien ha pedido cambiar la contraseña en Flamingo. Si has sido tú, aquí tienes el enlace:\n\n"
               "{link}\n\n"
               "El enlace funciona durante una hora y solo una vez.\n\n"
               "Si no has pedido nada, simplemente no lo abras. Tu contraseña sigue siendo la misma "
               "y nadie ha entrado en tu cuenta: este enlace por sí solo no basta para iniciar sesión.\n"),
        "de": ("Flamingo · Passwort ändern",
               "Hallo {name},\n\n"
               "jemand hat darum gebeten, das Passwort bei Flamingo zu ändern. Wenn du das warst, hier ist der Link:\n\n"
               "{link}\n\n"
               "Der Link funktioniert eine Stunde lang und nur einmal.\n\n"
               "Wenn du nichts angefordert hast, öffne ihn einfach nicht. Dein Passwort bleibt gleich, "
               "und niemand hat sich in dein Konto eingeloggt: Dieser Link allein reicht zum Anmelden nicht aus.\n"),
        "tr": ("Flamingo · şifre değişikliği",
               "Merhaba {name},\n\n"
               "Biri Flamingo’da şifrenin değiştirilmesini istedi. Bu sensen, işte bağlantı:\n\n"
               "{link}\n\n"
               "Bağlantı bir saat boyunca ve yalnızca bir kez çalışır.\n\n"
               "Bir şey istemediysen, bağlantıyı açma yeter. Şifren aynı kalır "
               "ve hesabına kimse girmedi: yalnızca bu bağlantıyla giriş yapılamaz.\n"),
        "ka": ("Flamingo · პაროლის შეცვლა",
               "გამარჯობა, {name}.\n\n"
               "ვიღაცამ Flamingo-ში პაროლის შეცვლა მოითხოვა. თუ ეს თქვენ ხართ — აი ბმული:\n\n"
               "{link}\n\n"
               "ბმული ერთი საათი და მხოლოდ ერთხელ მუშაობს.\n\n"
               "თუ არაფერი გითხოვიათ — უბრალოდ ნუ გახსნით მას. პაროლი იგივე დარჩება, "
               "თქვენს ანგარიშში კი არავინ შესულა: მხოლოდ ამ ბმულით შესვლა შეუძლებელია.\n"),
        "ar": ("Flamingo · تغيير كلمة المرور",
               "مرحبًا {name}،\n\n"
               "طلب أحدهم تغيير كلمة المرور في Flamingo. إن كنت أنت، فهذا هو الرابط:\n\n"
               "{link}\n\n"
               "يعمل الرابط لمدة ساعة واحدة ولمرة واحدة فقط.\n\n"
               "إن لم تطلب شيئًا، فلا تفتحه ببساطة. ستبقى كلمة المرور كما هي، "
               "ولم يدخل أحد إلى حسابك: هذا الرابط وحده لا يكفي لتسجيل الدخول.\n"),
    },
    "приглашение": {
        "ru": ("Flamingo · приглашение на занятия",
               "Здравствуйте.\n\n"
               "{teacher} зовёт вас к себе на занятия во Flamingo. Вот ссылка:\n\n"
               "{link}\n\n"
               "Она работает семь дней и добавляет одного человека. Перейдёте — и вы "
               "увидите друг друга: {teacher} вас в журнале, вы её или его в своих "
               "преподавателях, и у вас появится общий чат.\n\n"
               "Если вы никого не ждали — просто не открывайте ссылку. Ничего не "
               "произойдёт, и о вас никто не узнает.\n"),
        "en": ("Flamingo · invitation to lessons",
               "Hello.\n\n"
               "{teacher} invites you to lessons on Flamingo. Here is the link:\n\n"
               "{link}\n\n"
               "It works for seven days and adds one person. Follow it and you will "
               "see each other: {teacher} will have you in the journal, you will have them among your "
               "teachers, and you will have a shared chat.\n\n"
               "If you weren't expecting anyone, just don't open the link. Nothing will "
               "happen, and nobody will find out about you.\n"),
        "fr": ("Flamingo · invitation à des cours",
               "Bonjour,\n\n"
               "{teacher} vous invite à ses cours sur Flamingo. Voici le lien :\n\n"
               "{link}\n\n"
               "Il fonctionne pendant sept jours et ajoute une personne. Ouvrez-le et vous "
               "vous verrez mutuellement : {teacher} vous verra dans son registre, vous le ou la verrez parmi "
               "vos enseignants, et vous aurez une conversation commune.\n\n"
               "Si vous n’attendiez personne, n’ouvrez simplement pas le lien. Il ne se "
               "passera rien, et personne ne saura rien de vous.\n"),
        "es": ("Flamingo · invitación a clases",
               "Hola:\n\n"
               "{teacher} te invita a sus clases en Flamingo. Aquí tienes el enlace:\n\n"
               "{link}\n\n"
               "Funciona durante siete días y añade a una persona. Ábrelo y os "
               "veréis: {teacher} te tendrá en su diario, tú le tendrás entre tus "
               "docentes, y tendréis un chat en común.\n\n"
               "Si no esperabas a nadie, simplemente no abras el enlace. No pasará "
               "nada y nadie sabrá nada de ti.\n"),
        "de": ("Flamingo · Einladung zum Unterricht",
               "Hallo,\n\n"
               "{teacher} lädt dich zum Unterricht bei Flamingo ein. Hier ist der Link:\n\n"
               "{link}\n\n"
               "Er gilt sieben Tage und fügt eine Person hinzu. Öffne ihn, und ihr "
               "seht einander: {teacher} hat dich im Klassenbuch, du hast die Lehrkraft unter deinen "
               "Lehrkräften, und ihr habt einen gemeinsamen Chat.\n\n"
               "Wenn du niemanden erwartet hast, öffne den Link einfach nicht. Es passiert "
               "nichts, und niemand erfährt etwas über dich.\n"),
        "tr": ("Flamingo · derslere davet",
               "Merhaba,\n\n"
               "{teacher} seni Flamingo’da derslerine davet ediyor. İşte bağlantı:\n\n"
               "{link}\n\n"
               "Yedi gün geçerlidir ve bir kişi ekler. Açtığında birbirinizi "
               "göreceksiniz: {teacher} seni günlüğünde, sen onu "
               "öğretmenlerinin arasında göreceksin ve ortak bir sohbetiniz olacak.\n\n"
               "Kimseyi beklemiyorduysan bağlantıyı açma yeter. Hiçbir şey "
               "olmaz ve kimse senin hakkında bir şey öğrenmez.\n"),
        "ka": ("Flamingo · მოწვევა გაკვეთილებზე",
               "გამარჯობა.\n\n"
               "{teacher} გიწვევთ თავის გაკვეთილებზე Flamingo-ში. აი ბმული:\n\n"
               "{link}\n\n"
               "ის შვიდი დღე მუშაობს და ერთ ადამიანს ამატებს. გადახვალთ — და "
               "ერთმანეთს დაინახავთ: {teacher} თქვენ — ჟურნალში, თქვენ მას — თქვენს "
               "მასწავლებლებს შორის, და გექნებათ საერთო ჩატი.\n\n"
               "თუ არავის ელოდით — უბრალოდ ნუ გახსნით ბმულს. არაფერი "
               "მოხდება და თქვენ შესახებ არავინ გაიგებს.\n"),
        "ar": ("Flamingo · دعوة إلى دروس",
               "مرحبًا،\n\n"
               "يدعوك {teacher} إلى دروسه في Flamingo. هذا هو الرابط:\n\n"
               "{link}\n\n"
               "يعمل سبعة أيام ويضيف شخصًا واحدًا. افتحه وسيرى "
               "كلٌّ منكما الآخر: سيجدك {teacher} في سجله، وستجده بين "
               "معلميك، وستكون لكما دردشة مشتركة.\n\n"
               "إن لم تكن تنتظر أحدًا، فلا تفتح الرابط ببساطة. لن يحدث "
               "شيء، ولن يعرف أحد عنك شيئًا.\n"),
    },
}


def письмо(вид: str, **поля: str) -> tuple[str, str]:
    """Тема и текст письма на языке запроса (нет такого — английское)."""
    варианты = ПИСЬМА[вид]
    тема, текст = варианты.get(сейчас()) or варианты["en"]
    # Подстановка по одному полю: в имени человека могут быть фигурные скобки.
    for ключ, значение in поля.items():
        текст = текст.replace("{" + ключ + "}", значение)
    return тема, текст


def send_reset(email: str, name: str, link: str) -> None:
    subject, text = письмо("сброс", name=name, link=link)
    if not settings.EMAIL_HOST:
        log.warning("ПОЧТА НЕ НАСТРОЕНА. Письмо для %s не ушло. Ссылка: %s", email, link)
        return
    send_mail(
        subject=subject,
        message=text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )


def send_invite(email: str, teacher: str, link: str) -> None:
    """Приглашение ученика в журнал преподавателя.

    🔴 Письмо НЕ говорит, зарегистрирован человек у нас или нет, и не намекает
    на это ни словом: тот же ответ получает и тот, кого у нас нет. Иначе журнал
    становится способом перебором собрать базу почт наших учеников.

    Язык письма — язык страницы преподавателя, который зовёт (`config/язык.py`).
    """
    subject, text = письмо("приглашение", teacher=teacher, link=link)
    if not settings.EMAIL_HOST:
        log.warning("ПОЧТА НЕ НАСТРОЕНА. Приглашение для %s не ушло. Ссылка: %s", email, link)
        return
    send_mail(
        subject=subject,
        message=text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )
