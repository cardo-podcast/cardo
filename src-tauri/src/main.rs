// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri_plugin_sql::{Migration, MigrationKind};
use aes_gcm::aead::{Aead, KeyInit, OsRng, generic_array::GenericArray};
use aes_gcm::{Aes256Gcm, Nonce};
use rand::RngCore;
use tauri::command;
use base64::{Engine as _, engine::general_purpose};

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
        },
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
        Ok(plaintext) => Ok(String::from_utf8(plaintext).unwrap_or_else(|_| "Invalid UTF-8".into())),
        Err(_) => Err("Decryption failed".into()),
    }
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
                                        description TEXT,
                                        value TEXT
                                                    );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "queue",
            sql: "CREATE TABLE queue (id INTEGER PRIMARY KEY,
                                        queuePosition INTEGER,
                                        title TEXT,
                                        description TEXT,
                                        src TEXT,
                                        pubDate INTEGER,
                                        duration TEXT,
                                        size TEXT,
                                        podcastUrl TEXT,
                                        coverUrl TEXT
                                                    );",
            kind: MigrationKind::Up,
        }
    ];


    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![encrypt, decrypt, generate_key])
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
