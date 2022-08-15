use wasm_bindgen::{prelude::*, JsCast};

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
