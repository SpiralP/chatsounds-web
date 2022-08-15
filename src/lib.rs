#![feature(local_key_cell_methods)]

use chatsounds::Chatsounds;
use futures::lock::Mutex;
use js_sys::Array;
use rand::thread_rng;
use wasm_bindgen::{prelude::*, JsCast};

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

lazy_static::lazy_static! {
    static ref CHATSOUNDS: Mutex<Option<Chatsounds>> = Default::default();
}

#[wasm_bindgen]
pub async fn setup() {
    log!("setup");
    let mut chatsounds = CHATSOUNDS.lock().await;
    *chatsounds = Some(Chatsounds::new().unwrap());
}

#[wasm_bindgen]
pub async fn fetch_and_load_github_api(name: String, path: String) {
    log!("fetch_and_load_github_api {:?} {:?}", name, path);

    let mut chatsounds = CHATSOUNDS.lock().await;
    let chatsounds = chatsounds.as_mut().expect("chatsounds None");

    let data = chatsounds
        .fetch_github_api(&name, &path, false)
        .await
        .unwrap();
    chatsounds.load_github_api(&name, &path, data).unwrap();
}

#[wasm_bindgen]
pub async fn fetch_and_load_github_msgpack(name: String, path: String) {
    log!("fetch_and_load_github_msgpack {:?} {:?}", name, path);

    let mut chatsounds = CHATSOUNDS.lock().await;
    let chatsounds = chatsounds.as_mut().expect("chatsounds None");

    let data = chatsounds
        .fetch_github_msgpack(&name, &path, false)
        .await
        .unwrap();
    chatsounds.load_github_msgpack(&name, &path, data).unwrap();
}

#[wasm_bindgen]
pub async fn play(input: String) {
    log!("play {:?}", &input);

    if input.is_empty() {
        return;
    }

    let mut chatsounds = CHATSOUNDS.lock().await;
    let chatsounds = chatsounds.as_mut().expect("chatsounds None");

    chatsounds.play(&input, thread_rng()).await.unwrap();
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "Array<string>")]
    pub type StringArray;
}

#[wasm_bindgen(typescript_type = "string[]")]
pub async fn search(input: String) -> StringArray {
    log!("search {:?}", &input);

    if input.is_empty() {
        return Array::new().unchecked_into();
    }

    let mut chatsounds = CHATSOUNDS.lock().await;
    let chatsounds = chatsounds.as_mut().expect("chatsounds None");

    let mut results = chatsounds.search(&input);
    results
        .drain(..)
        .take(10)
        .map(|(_, str)| JsValue::from_str(str))
        .collect::<Array>()
        .unchecked_into()
}
