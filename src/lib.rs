#![feature(local_key_cell_methods)]

use std::sync::Arc;

use chatsounds::Chatsounds;
use futures::lock::Mutex;
use rand::thread_rng;
use wasm_bindgen::prelude::*;

pub type Result<T> = std::result::Result<T, JsError>;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}

// TODO #[wasm_bindgen(catch)] // for Result

#[wasm_bindgen(start)]
pub fn main() {
    log!("main");
    console_error_panic_hook::set_once();
}

thread_local! {
    static CHATSOUNDS: Arc<Mutex<Option<Chatsounds>>> = Default::default();
}

#[wasm_bindgen]
pub async fn chatsounds_init() {
    log!("chatsounds_init");
    {
        let chatsounds = CHATSOUNDS.with(|rc| rc.clone());
        let mut chatsounds = chatsounds.lock().await;
        *chatsounds = Some(Chatsounds::new().unwrap());
    }
}

#[wasm_bindgen]
pub async fn chatsounds_fetch_and_load_github_api(name: String, path: String) {
    log!("chatsounds_fetch_and_load_github_api {:?} {:?}", name, path);

    let chatsounds = CHATSOUNDS.with(|rc| rc.clone());
    let mut chatsounds = chatsounds.lock().await;
    let chatsounds = chatsounds.as_mut().expect("chatsounds None");

    let data = chatsounds
        .fetch_github_api(&name, &path, false)
        .await
        .unwrap();
    chatsounds.load_github_api(&name, &path, data).unwrap();
}

#[wasm_bindgen]
pub async fn chatsounds_fetch_and_load_github_msgpack(name: String, path: String) {
    log!(
        "chatsounds_fetch_and_load_github_msgpack {:?} {:?}",
        name,
        path
    );

    let chatsounds = CHATSOUNDS.with(|rc| rc.clone());
    let mut chatsounds = chatsounds.lock().await;
    let chatsounds = chatsounds.as_mut().expect("chatsounds None");

    let data = chatsounds
        .fetch_github_msgpack(&name, &path, false)
        .await
        .unwrap();
    chatsounds.load_github_msgpack(&name, &path, data).unwrap();
}

#[wasm_bindgen]
pub async fn chatsounds_play(input: String) {
    log!("chatsounds_play {:?}", &input);

    let chatsounds = CHATSOUNDS.with(|rc| rc.clone());
    let mut chatsounds = chatsounds.lock().await;
    let chatsounds = chatsounds.as_mut().expect("chatsounds None");

    chatsounds.play(&input, thread_rng()).await.unwrap();
}

#[wasm_bindgen]
pub async fn chatsounds_search(input: String) -> String {
    log!("chatsounds_search {:?}", &input);

    let chatsounds = CHATSOUNDS.with(|rc| rc.clone());
    let mut chatsounds = chatsounds.lock().await;
    let chatsounds = chatsounds.as_mut().expect("chatsounds None");

    let mut results = chatsounds.search(&input);
    let results = results
        .drain(..)
        .take(10)
        .map(|(_, str)| str.to_owned())
        .collect::<Vec<_>>();

    results.join("\n")
}
