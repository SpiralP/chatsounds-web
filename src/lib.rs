pub mod chatsounds;
pub mod exports;

use wasm_bindgen::JsError;

pub type Result<T> = std::result::Result<T, JsError>;

#[macro_export]
macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}
