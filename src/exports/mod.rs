use js_sys::Array;
use rand::thread_rng;
use wasm_bindgen::{prelude::*, JsCast};

use crate::{chatsounds::with_chatsounds, log, Result};

#[wasm_bindgen(start)]
pub fn main() {
    log!("main");
    console_error_panic_hook::set_once();
}

// Chatsounds::new() needs user interaction to start the audio library,
// so use an explicit function call on button press
#[wasm_bindgen]
pub async fn setup() -> Result<()> {
    log!("setup");

    with_chatsounds(move |chatsounds| async move {
        drop(chatsounds);

        Ok(())
    })
    .await
}

#[wasm_bindgen]
pub async fn fetch_and_load_github_api(name: String, path: String) -> Result<()> {
    log!("fetch_and_load_github_api {:?} {:?}", name, path);

    with_chatsounds(move |mut chatsounds| async move {
        let data = chatsounds.fetch_github_api(&name, &path, false).await?;
        chatsounds.load_github_api(&name, &path, data)?;

        Ok(())
    })
    .await
}

#[wasm_bindgen]
pub async fn fetch_and_load_github_msgpack(name: String, path: String) -> Result<()> {
    log!("fetch_and_load_github_msgpack {:?} {:?}", name, path);

    with_chatsounds(move |mut chatsounds| async move {
        let data = chatsounds.fetch_github_msgpack(&name, &path, false).await?;
        chatsounds.load_github_msgpack(&name, &path, data)?;

        Ok(())
    })
    .await
}

#[wasm_bindgen]
pub async fn play(input: String) -> Result<()> {
    log!("play {:?}", &input);

    if input.is_empty() {
        return Ok(());
    }

    with_chatsounds(move |mut chatsounds| async move {
        chatsounds.play(&input, thread_rng()).await?;

        Ok(())
    })
    .await
}

// #[wasm_bindgen(typescript_custom_section)]
// pub const SEARCH_RESULT_TYPE: &'static str = r#"
// interface SearchResult {
//     sentence: string;
//     urls: string[];
// }
// "#;

// #[derive(Serialize)]
// pub struct SearchResult {
//     pub sentence: String,
//     pub urls: Vec<String>,
// }

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "string[]")]
    pub type StringArray;

    // #[wasm_bindgen(typescript_type = "SearchResult[]")]
    // pub type SearchResultArray;
}

impl TryFrom<Vec<&String>> for StringArray {
    type Error = serde_wasm_bindgen::Error;

    fn try_from(slice: Vec<&String>) -> std::result::Result<Self, Self::Error> {
        let js_value: JsValue = serde_wasm_bindgen::to_value(&slice)?;
        Ok(js_value.unchecked_into())
    }
}

#[wasm_bindgen]
pub async fn search(input: String) -> Result<StringArray> {
    log!("search {:?}", &input);

    if input.is_empty() {
        return Ok(Array::new().unchecked_into());
    }

    with_chatsounds(move |chatsounds| async move {
        let sentences = chatsounds
            .search(&input)
            .into_iter()
            .map(|(_, sentence)| sentence)
            .collect::<Vec<_>>();

        Ok(sentences.try_into()?)
    })
    .await
}
