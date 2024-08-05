// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri_plugin_sql::{Migration, MigrationKind};

fn main() {

    let migrations = vec![
        Migration {
            version: 1,
            description: "subscriptions",
            sql: "CREATE TABLE subscriptions (id INTEGER PRIMARY KEY,
                                                        podcastName TEXT,
                                                        artistName TEXT,
                                                        coverUrl TEXT,
                                                        coverUrlLarge TEXT,
                                                        feedUrl TEXT
                                                        );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "episodes_history",
            sql: "CREATE TABLE episodes_history (id INTEGER PRIMARY KEY,
                                                        podcast TEXT,
                                                        episode TEXT,
                                                        position TEXT,
                                                        total TEXT,
                                                        timestamp INTEGER
                                                        );",
            kind: MigrationKind::Up,
        }
    ];


    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![])
        .setup(|app| {
            let app_handle = app.handle();

            let app_data_dir = app.path_resolver()
                .app_data_dir().unwrap();
      
            let db_path = app_data_dir.join("db.sqlite");
            let db_path_str = db_path.to_str().unwrap();

            app_handle.plugin(
                tauri_plugin_sql::Builder::default()
                .add_migrations(db_path_str, migrations)
                .build())
                .expect("error while building sql plugin");

            Ok(())
            
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
