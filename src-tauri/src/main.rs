// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use aes_gcm::aead::{generic_array::GenericArray, Aead, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::{engine::general_purpose, Engine as _};
use rand::RngCore;
use std::fs::File;
use std::io::Write;
use tauri::{command, Window};
use tauri_plugin_sql::{Migration, MigrationKind};

const NONCE_SIZE: usize = 12; // 96-bit nonce
const KEY_SIZE: usize = 32; // 256-bit key

#[command]
fn generate_key() -> Result<String, String> {
    let mut key = [0u8; KEY_SIZE];
    OsRng.fill_bytes(&mut key);
    Ok(general_purpose::STANDARD.encode(&key))
}

#[command]
fn encrypt(text: String, base64_key: String) -> Result<String, String> {
    let key = match general_purpose::STANDARD.decode(&base64_key) {
        Ok(k) => k,
        Err(_) => return Err("Invalid base64 key".into()),
    };
    let key = GenericArray::from_slice(&key);
    let cipher = Aes256Gcm::new(key);
    let mut nonce = [0u8; NONCE_SIZE];
    OsRng.fill_bytes(&mut nonce);
    let nonce = Nonce::from_slice(&nonce);

    match cipher.encrypt(nonce, text.as_bytes()) {
        Ok(ciphertext) => {
            let encrypted_data = [nonce.as_slice(), ciphertext.as_slice()].concat();
            Ok(general_purpose::STANDARD.encode(&encrypted_data))
        }
        Err(_) => Err("Encryption failed".into()),
    }
}

#[command]
fn decrypt(encrypted_text: String, base64_key: String) -> Result<String, String> {
    let key = match general_purpose::STANDARD.decode(&base64_key) {
        Ok(k) => k,
        Err(_) => return Err("Invalid base64 key".into()),
    };
    let key = GenericArray::from_slice(&key);
    let cipher = Aes256Gcm::new(key);

    let encrypted_data = match general_purpose::STANDARD.decode(&encrypted_text) {
        Ok(data) => data,
        Err(_) => return Err("Invalid base64 encrypted text".into()),
    };

    if encrypted_data.len() < NONCE_SIZE {
        return Err("Invalid encrypted data".into());
    }

    let (nonce, ciphertext) = encrypted_data.split_at(NONCE_SIZE);
    let nonce = Nonce::from_slice(nonce);

    match cipher.decrypt(nonce, ciphertext) {
        Ok(plaintext) => {
            Ok(String::from_utf8(plaintext).unwrap_or_else(|_| "Invalid UTF-8".into()))
        }
        Err(_) => Err("Decryption failed".into()),
    }
}

#[derive(Clone, serde::Serialize)]
struct DownloadPayload {
    src: String,
    name: String,
    downloaded: u64,
    total: u64,
    complete: bool,
}

#[command]
async fn download_file(
    url: String,
    destination: String,
    name: String,
    window: Window,
) -> Result<(), String> {
    let mut response = reqwest::get(&url).await.map_err(|e| e.to_string())?;

    let total_size = response.content_length().unwrap();

    let mut file = File::create(&destination).map_err(|e| e.to_string())?;

    let mut payload = DownloadPayload {
        src: url,
        name: name,
        downloaded: 0,
        total: total_size,
        complete: false,
    };

    let mut i: u8 = 0;
    while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        payload.downloaded += chunk.len() as u64;

        i += 1;
        if i == 100 {
            // reduce event emmisions
            window.emit("downloading", payload.clone()).unwrap();
            i = 0;
        }
    }

    payload.complete = true;
    window.emit("downloading", payload.clone()).unwrap();

    Ok(())
}

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
                                                        feedUrl TEXT UNIQUE
                                                        );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "episodes_history",
            sql: "CREATE TABLE episodes_history (id INTEGER PRIMARY KEY,
                                                        podcast TEXT,
                                                        episode TEXT UNIQUE,
                                                        position INTEGER,
                                                        total INTEGER,
                                                        timestamp INTEGER
                                                        );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "misc",
            sql: "CREATE TABLE misc (id INTEGER PRIMARY KEY,
                                        description TEXT UNIQUE,
                                        value TEXT
                                                    );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "queue",
            sql: "CREATE TABLE queue (id INTEGER PRIMARY KEY,
                                        title TEXT,
                                        description TEXT,
                                        src TEXT UNIQUE,
                                        pubDate INTEGER,
                                        duration INTEGER,
                                        size INTEGER,
                                        podcastUrl TEXT,
                                        coverUrl TEXT
                                                    );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "subscriptions episodes",
            sql: "CREATE TABLE subscriptions_episodes (id INTEGER PRIMARY KEY,
                                        title TEXT,
                                        description TEXT,
                                        src TEXT UNIQUE,
                                        pubDate INTEGER,
                                        duration INTEGER,
                                        size INTEGER,
                                        podcastUrl TEXT,
                                        coverUrl TEXT
                                                    );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "podcast description",
            sql: "ALTER TABLE subscriptions
            ADD COLUMN description TEXT
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "downloaded podcasts",
            sql: "CREATE TABLE downloads (id INTEGER PRIMARY KEY,
                                        title TEXT,
                                        description TEXT,
                                        src TEXT UNIQUE,
                                        pubDate INTEGER,
                                        duration INTEGER,
                                        size INTEGER,
                                        podcastUrl TEXT,
                                        coverUrl TEXT,
                                        localFile TEXT
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "Episodes count for each subscription to detect new episodes",
            sql: "
            DELETE FROM misc WHERE description = 'lastFeedDownload';
            
            ALTER TABLE subscriptions ADD COLUMN episode_count INTEGER DEFAULT 0;

            UPDATE subscriptions
            SET episode_count = (
                SELECT COUNT(se.src)
                FROM subscriptions_episodes se
                WHERE se.podcastUrl = subscriptions.feedUrl
            );
            ",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            encrypt,
            decrypt,
            generate_key,
            download_file
        ])
        .setup(|app| {
            let app_handle = app.handle();

            let app_data_dir = app.path_resolver().app_data_dir().unwrap();

            let db_path = app_data_dir.join("db.sqlite");
            let db_path_str = String::from("sqlite:") + db_path.to_str().unwrap();

            app_handle
                .plugin(
                    tauri_plugin_sql::Builder::default()
                        .add_migrations(&db_path_str, migrations)
                        .build(),
                )
                .expect("error while building sql plugin");

            Ok(())
        })
        .plugin(tauri_plugin_context_menu::init())
        .plugin(tauri_plugin_single_instance::init(|_, _, _| {}))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
