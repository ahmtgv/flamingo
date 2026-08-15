// Flamingo desktop shell (Р5.3, atlas sheet D1).
//
// The shell does three things and no more: it starts the sidecar, it shows the window, and it
// stops the sidecar when the app really quits. Every screen inside the window is the same React
// the web serves — that reuse is the economics of the whole desktop decision
// (R5_DESKTOP_HOST_BUDGET.md §5), and a feature implemented here instead of there would be a
// feature that exists on one platform only.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Manager, WindowEvent};

/// The sidecar process, kept so it can be stopped. A Django left running after the app quits is
/// a lesson still being hosted by a laptop whose owner thinks they went home.
struct Sidecar(Mutex<Option<Child>>);

/// The two tray menu items, kept so React can rename them from `ru.json`.
struct TrayItems {
    show: MenuItem<tauri::Wry>,
    quit: MenuItem<tauri::Wry>,
}

// 🔒 Where the machine key lives, and the only place it may (PROMPT_14 §2.2.2, §19.4).
//
// The OS keychain is encrypted at rest and scoped to the account. A config file ends up in a
// support archive; localStorage is readable by any script on the page and survives in a
// browser-profile backup. There is deliberately no command that returns the key to the
// webview — nothing in React needs to see it, and a getter would exist only to be logged by
// accident.
const KEYCHAIN_SERVICE: &str = "plus.flamingo.desktop";
const KEYCHAIN_ACCOUNT: &str = "machine-key";

fn keyring() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT).map_err(|e| e.to_string())
}

/// Положить ключ машины в связку ключей. Вызывается ровно один раз — после связывания.
#[tauri::command]
fn store_machine_key(token: String) -> Result<(), String> {
    keyring()?.set_password(&token).map_err(|e| e.to_string())
}

/// Есть ли ключ — без выдачи ключа.
#[tauri::command]
fn has_machine_key() -> bool {
    keyring().and_then(|e| e.get_password().map_err(|x| x.to_string())).is_ok()
}

/// Забыть ключ на этой машине. Серверный отзыв — отдельная мутация в кабинете.
#[tauri::command]
fn forget_machine_key() -> Result<(), String> {
    match keyring()?.delete_credential() {
        Ok(()) => Ok(()),
        // Already absent is the outcome the caller wanted.
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

// --- Р5.5-Б: копия обязана покинуть машину -----------------------------------------------
//
// Копия на том же диске — не копия: тот же пролитый кофе уносит и оригинал, и её. Sidecar
// кладёт файл в папку кабинета; отсюда он уезжает туда, куда преподаватель показал однажды.
//
// 🔒 Адрес выбирается ЗДЕСЬ и живёт здесь. Через GraphQL он не ходит — это то же правило, по
// которому там нет пути к папке кабинета: имя учётной записи в системе нам знать незачем.
const BACKUP_DEST_KEY: &str = "backup-destination";

/// Р5.5-В п.1: «где кабинет» и «куда возить копии» — РАЗНЫЕ вопросы, и диалога должно быть два.
///
/// Одним диалогом они путались, и на практике место копии вообще нельзя было выбрать: команда
/// существовала во фронтенде и не существовала здесь. Это и есть та самая дыра честности.
#[derive(serde::Serialize)]
struct ChosenFolder {
    path: String,
    /// Пусто — всё в порядке. Иначе причина, которую экран переведёт в слова.
    warning: String,
}

/// Выбрать папку кабинета.
#[tauri::command]
async fn choose_cabinet_folder(app: tauri::AppHandle) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;

    app.dialog()
        .file()
        .set_title("Где хранить кабинет")
        .blocking_pick_folder()
        .and_then(|p| p.into_path().ok())
        .map(|p| p.to_string_lossy().to_string())
}

/// Выбрать место для копий — свой диалог, свой заголовок.
///
/// 🔴 Фильтра на съёмные тома НЕТ и не будет: папка облака (iCloud, Яндекс.Диск) — законное
/// место копии, а фильтр отрезал бы её. Вместо запрета — предупреждение словами, когда место
/// лежит внутри папки кабинета или на том же томе: «копия на том же диске не спасёт от
/// поломки». Предупредить и пустить (§2.2-бис).
#[tauri::command]
async fn choose_backup_folder(app: tauri::AppHandle) -> Option<ChosenFolder> {
    use tauri_plugin_dialog::DialogExt;

    let chosen = app
        .dialog()
        .file()
        .set_title("Куда возить копии кабинета")
        .blocking_pick_folder()
        .and_then(|p| p.into_path().ok())?;

    let warning = same_disk_warning(&cabinet_dir(&app), &chosen);
    Some(ChosenFolder {
        path: chosen.to_string_lossy().to_string(),
        warning,
    })
}

/// Лежит ли выбранное место там же, где кабинет.
///
/// Два случая, и первый строго хуже: **внутри** папки кабинета — копия уедет вместе с ней при
/// любом «перенёс кабинет» или «снёс и восстановил». **Тот же том** — копия переживёт удаление
/// папки, но не смерть диска, а именно диск и умирает вместе с ноутбуком.
fn same_disk_warning(cabinet: &std::path::Path, chosen: &std::path::Path) -> String {
    if chosen.starts_with(cabinet) {
        return "inside-cabinet".into();
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        if let (Ok(a), Ok(b)) = (std::fs::metadata(cabinet), std::fs::metadata(chosen)) {
            if a.dev() == b.dev() {
                return "same-volume".into();
            }
        }
    }
    #[cfg(windows)]
    {
        // На Windows том — это буква диска; сравниваем префиксы.
        let root = |p: &std::path::Path| {
            p.components().next().map(|c| c.as_os_str().to_owned())
        };
        if root(cabinet).is_some() && root(cabinet) == root(chosen) {
            return "same-volume".into();
        }
    }
    String::new()
}

/// Показать папку кабинета в файловом менеджере.
#[tauri::command]
fn reveal_cabinet_folder(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    let target = if path.is_empty() {
        cabinet_dir(&app)
    } else {
        std::path::PathBuf::from(path)
    };
    app.opener()
        .open_path(target.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| e.to_string())
}

/// Папка кабинета — одна на оболочку и на sidecar.
fn cabinet_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join("cabinet")
}

fn dest_store(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path()
        .app_config_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join("backup-destination.txt")
}

/// Спросить место один раз. Дальше копии уезжают туда сами.
#[tauri::command]
fn choose_backup_destination(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let target = std::path::PathBuf::from(&path);
    if !target.is_dir() {
        return Err(format!("{BACKUP_DEST_KEY}: not a folder"));
    }
    let store = dest_store(&app);
    if let Some(parent) = store.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&store, &path).map_err(|e| e.to_string())?;
    Ok(path)
}

/// Куда договорились возить копии. Пусто — ещё не спрашивали.
#[tauri::command]
fn backup_destination(app: tauri::AppHandle) -> String {
    std::fs::read_to_string(dest_store(&app)).unwrap_or_default()
}

/// Перенести только что снятую копию наружу.
///
/// 🔴 Возвращает ошибку СЛОВАМИ, когда места нет: внешний диск отключён, папка облака не
/// смонтирована. Молча записать в старую папку — это сделать вид, что копия есть, ровно в тот
/// момент, когда её нет; сообщение обязано быть, и оно на стороне React, где живёт i18n.
#[tauri::command]
fn move_backup_out(app: tauri::AppHandle, file_name: String) -> Result<String, String> {
    copy_out(
        &cabinet_dir(&app).join("backups"),
        &backup_destination(app.clone()),
        &file_name,
    )
}

/// Сам перенос — без Tauri, чтобы его можно было проверить тестом, а не только руками.
///
/// Копируем, а не переносим: на внешнем диске копия появилась, и в кабинете она ещё есть. Если
/// диск выдернут посреди записи, оригинал не потерян вместе с ней.
fn copy_out(backups: &std::path::Path, destination: &str, file_name: &str) -> Result<String, String> {
    if destination.is_empty() {
        return Err("no-destination".into());
    }
    let target_dir = std::path::PathBuf::from(destination);
    if !target_dir.is_dir() {
        // Диск отключён или папку унесли. Это не «почти получилось».
        return Err("destination-missing".into());
    }
    // Принимаем ИМЯ, а не путь: откуда забирать — знание оболочки, и обходной путь вида
    // «../../» не превращается в чтение произвольного файла с машины.
    if file_name.contains('/') || file_name.contains('\\') || file_name.contains("..") {
        return Err("bad-source".into());
    }
    let source = backups.join(file_name);
    if !source.is_file() {
        return Err("bad-source".into());
    }
    let target = target_dir.join(file_name);
    std::fs::copy(&source, &target).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    //! Приёмка Р5.5-Б: копия появилась ВНЕ папки кабинета; диск отключён — сказали об этом.
    use super::copy_out;

    fn scratch(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("flamingo-r55b-{name}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn the_copy_leaves_the_cabinet_folder() {
        let root = scratch("ok");
        let backups = root.join("cabinet/backups");
        let disk = root.join("external-disk");
        std::fs::create_dir_all(&backups).unwrap();
        std::fs::create_dir_all(&disk).unwrap();
        std::fs::write(backups.join("cabinet-1.flamingo"), b"sealed bytes").unwrap();

        let at = copy_out(&backups, disk.to_str().unwrap(), "cabinet-1.flamingo").unwrap();

        let landed = std::path::PathBuf::from(&at);
        assert!(landed.is_file(), "копия не появилась на внешнем диске");
        assert!(!landed.starts_with(&backups), "копия осталась в папке кабинета");
        assert_eq!(std::fs::read(&landed).unwrap(), b"sealed bytes");
        // Оригинал на месте: диск могли выдернуть посреди записи.
        assert!(backups.join("cabinet-1.flamingo").is_file());
    }

    #[test]
    fn an_unplugged_disk_is_said_out_loud_not_written_around() {
        let root = scratch("gone");
        let backups = root.join("cabinet/backups");
        std::fs::create_dir_all(&backups).unwrap();
        std::fs::write(backups.join("cabinet-1.flamingo"), b"x").unwrap();

        let gone = root.join("external-disk-that-was-unplugged");
        let err = copy_out(&backups, gone.to_str().unwrap(), "cabinet-1.flamingo").unwrap_err();
        assert_eq!(err, "destination-missing");
        // И ничего не появилось «где-то ещё»: молчаливая запись в старую папку — это вид,
        // будто копия есть, ровно тогда, когда её нет.
        assert!(!gone.exists());
    }

    #[test]
    fn with_no_destination_chosen_it_says_so() {
        let root = scratch("nodest");
        let backups = root.join("cabinet/backups");
        std::fs::create_dir_all(&backups).unwrap();
        assert_eq!(copy_out(&backups, "", "a.flamingo").unwrap_err(), "no-destination");
    }

    #[test]
    fn a_name_that_climbs_out_of_the_backups_folder_is_refused() {
        let root = scratch("climb");
        let backups = root.join("cabinet/backups");
        let disk = root.join("disk");
        std::fs::create_dir_all(&backups).unwrap();
        std::fs::create_dir_all(&disk).unwrap();
        std::fs::write(root.join("secret.txt"), b"not a backup").unwrap();

        for name in ["../secret.txt", "../../etc/passwd", "sub/dir.flamingo"] {
            assert_eq!(
                copy_out(&backups, disk.to_str().unwrap(), name).unwrap_err(),
                "bad-source",
                "{name} проехал"
            );
        }
    }
}

/// Свернуть окно — **and leave the lesson running**.
///
/// 🔴 Sheet D1: «Свёрнутое окно не заканчивает урок». This touches nothing else — not the
/// sidecar, not the session, not the room. Pupils stay connected to this machine. Ending a
/// lesson is a different act with its own button, and it is inside the React app where it can
/// actually close the room rather than merely put the window away.
///
/// ⚠️ Находка владельца 15.08 №3: «кнопка "свернуть" вешает приложение». Здесь стоял
/// `window.hide()`: окно ИСЧЕЗАЛО, и вернуть его можно было только через значок в трее. Для
/// человека, который про трей не знал, это ровно то же, что зависание — приложение пропало и
/// не отвечает. `minimize()` кладёт окно в Dock, откуда его достают привычным движением.
#[tauri::command]
fn minimise_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

/// Открыть адрес во ВНЕШНЕМ браузере.
///
/// 🔴 Находка владельца 15.08 №2: «"Открыть страницу в браузере" не открывает». Ссылка с
/// `target="_blank"` внутри webview не открывает ничего — окон он не заводит, и нажатие
/// проваливалось молча.
///
/// Разрешены только `http`/`https`. Адрес приходит из React, а React рисует страницы; открыть
/// по строке `file://` что-нибудь с диска — не то, ради чего эта команда заведена.
#[tauri::command]
fn open_external(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("only-http".into());
    }
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

/// What the tray says while the window is away — the title, repeated.
///
/// The text arrives already composed in Russian from the React side, because that is where the
/// i18n layer lives (CLAUDE.md §2.4). The shell must never assemble product text: it would be
/// the one string in the product that no locale file knows about.
#[tauri::command]
fn set_tray_label(app: tauri::AppHandle, label: String) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("flamingo") {
        tray.set_tooltip(Some(&label)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Rename the tray menu from the locale file.
///
/// The tray has to exist before the webview finishes loading — it is what a minimised window
/// falls back to — so its two items are born with Russian defaults. React overwrites them from
/// `ru.json` on mount, which keeps the locale file the single source of product text
/// (CLAUDE.md §2.4) without leaving a window where the tray has no words at all.
#[tauri::command]
fn set_tray_menu(app: tauri::AppHandle, show: String, quit: String) -> Result<(), String> {
    let items = app.state::<TrayItems>();
    items.show.set_text(show).map_err(|e| e.to_string())?;
    items.quit.set_text(quit).map_err(|e| e.to_string())?;
    Ok(())
}

/// Куда оболочка пишет, что с ней происходит при старте.
///
/// 🔴 Заведено 15.08, когда приложение запустилось и не показало окна: процесс жив, вывода нет,
/// сказать нечего. Без этого файла единственным способом узнать, докуда дошёл запуск, была
/// пересборка с печатью — то есть день на каждую догадку.
///
/// Пишется рядом с кабинетом, куда человек и так умеет заглядывать, и содержит ТОЛЬКО ход
/// запуска: ни путей к чужим файлам, ни ключей, ни имени учётной записи.
fn note(app: &tauri::AppHandle, line: &str) {
    use std::io::Write;
    let dir = cabinet_dir(app);
    let _ = std::fs::create_dir_all(&dir);
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(dir.join("start.log"))
    {
        let _ = writeln!(file, "{line}");
    }
    eprintln!("[flamingo] {line}");
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Sidecar(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            minimise_window,
            open_external,
            set_tray_label,
            set_tray_menu,
            store_machine_key,
            has_machine_key,
            forget_machine_key,
            choose_backup_destination,
            backup_destination,
            move_backup_out,
            choose_cabinet_folder,
            choose_backup_folder,
            reveal_cabinet_folder
        ])
        .setup(|app| {
            note(app.handle(), "setup: начали");
            let binary = app
                .path()
                .resolve(
                    "sidecar/flamingo-sidecar",
                    tauri::path::BaseDirectory::Resource,
                )
                .ok();
            if let Some(path) = binary {
                if path.exists() {
                    // Папку кабинета назначает оболочка, а не умолчание внутри sidecar: иначе
                    // она не знает, откуда забирать снятую копию (Р5.5-Б).
                    let child = Command::new(path)
                        .env("FLAMINGO_DATA_DIR", cabinet_dir(app.handle()))
                        .spawn()
                        .ok();
                    *app.state::<Sidecar>().0.lock().unwrap() = child;
                    note(app.handle(), "setup: sidecar запущен");
                }
            }

            // The tray is what a minimised lesson looks like. Clicking it brings the window
            // back; «Завершить урок» is deliberately NOT here — ending a lesson has to go
            // through the app, which knows there is a room to close and people in it.
            // Pre-boot defaults only — React renames both from `ru.json` via `set_tray_menu`.
            let show = MenuItem::with_id(app, "show", "Открыть Flamingo", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Выйти", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;
            app.manage(TrayItems {
                show: show.clone(),
                quit: quit.clone(),
            });
            TrayIconBuilder::with_id("flamingo")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                // Нажатие на сам значок возвращает окно. Без этого единственной дорогой назад
                // было меню — а его ещё надо догадаться открыть.
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button, .. } = event {
                        if button == tauri::tray::MouseButton::Left {
                            if let Some(w) = tray.app_handle().get_webview_window("main") {
                                let _ = w.unminimize();
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            note(app.handle(), "setup: трей собран");

            // Окно описано в конфигурации и создаётся до setup. Если его вдруг нет — сказать
            // об этом здесь, а не оставлять человека с работающим процессом без окна.
            match app.get_webview_window("main") {
                Some(w) => {
                    let _ = w.show();
                    let _ = w.set_focus();
                    note(app.handle(), "setup: окно на месте и показано");
                }
                None => note(app.handle(), "setup: 🔴 ОКНА НЕТ — проверьте app.windows в конфигурации"),
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the window is the same act as minimising: the lesson is running, and the
            // red X is not a decision to end it. The app quits from the tray menu, where the
            // word is «Выйти» and the person meant it.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                // Сворачиваем, а не прячем: спрятанное окно достаётся только из трея, и человек,
                // который про трей не знал, считает, что программа исчезла (находка 15.08 №3).
                let _ = window.minimize();
            }
        })
        .build(tauri::generate_context!())
        .expect("flamingo desktop failed to start")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                if let Some(mut child) = app.state::<Sidecar>().0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        });
}
