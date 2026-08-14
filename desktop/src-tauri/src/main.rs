// Flamingo desktop shell (Р5.3).
//
// The shell does three things and no more: it starts the sidecar, it shows the window, and it
// stops the sidecar when the app quits. Every screen inside the window is the same React the
// web serves — that reuse is the economics of the whole desktop decision
// (R5_DESKTOP_HOST_BUDGET.md §5), and a feature implemented here instead of there would be a
// feature that exists on one platform only.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;

use tauri::Manager;

/// The sidecar process, kept so it can be stopped. A Django left running after the window
/// closes is a lesson still being hosted by a laptop whose owner thinks they went home.
struct Sidecar(Mutex<Option<Child>>);

fn main() {
    tauri::Builder::default()
        .manage(Sidecar(Mutex::new(None)))
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
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(mut child) = window.state::<Sidecar>().0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("flamingo desktop failed to start");
}
