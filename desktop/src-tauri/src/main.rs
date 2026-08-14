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

/// Свернуть в трей — **and leave the lesson running**.
///
/// 🔴 Sheet D1: «Свёрнутое окно не заканчивает урок». This hides the window and touches nothing
/// else — not the sidecar, not the session, not the room. Pupils stay connected to this machine.
/// Ending a lesson is a different act with its own button, and it is inside the React app where
/// it can actually close the room rather than merely hide a window.
#[tauri::command]
fn minimise_to_tray(window: tauri::Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
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

fn main() {
    tauri::Builder::default()
        .manage(Sidecar(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            minimise_to_tray,
            set_tray_label,
            set_tray_menu
        ])
        .setup(|app| {
            let binary = app
                .path()
                .resolve(
                    "sidecar/flamingo-sidecar",
                    tauri::path::BaseDirectory::Resource,
                )
                .ok();
            if let Some(path) = binary {
                if path.exists() {
                    let child = Command::new(path).spawn().ok();
                    *app.state::<Sidecar>().0.lock().unwrap() = child;
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
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the window is the same act as minimising: the lesson is running, and the
            // red X is not a decision to end it. The app quits from the tray menu, where the
            // word is «Выйти» and the person meant it.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
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
