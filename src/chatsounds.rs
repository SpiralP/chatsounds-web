use chatsounds::Chatsounds;
use futures::{
    lock::{MappedMutexGuard, Mutex, MutexGuard},
    Future,
};
use lazy_static::lazy_static;
use wasm_bindgen::JsError;

use crate::Result;

lazy_static! {
    static ref CHATSOUNDS: Mutex<std::result::Result<Chatsounds, String>> =
        Mutex::new(Chatsounds::new().map_err(|e| e.to_string()));
}

pub async fn with_chatsounds<'a, T, F, P>(f: F) -> Result<T>
where
    F: FnOnce(MappedMutexGuard<'a, std::result::Result<Chatsounds, String>, Chatsounds>) -> P,
    P: Future<Output = Result<T>>,
{
    let guard = CHATSOUNDS.lock().await;
    if let Err(s) = guard.as_ref() {
        Err(JsError::new(s))
    } else {
        let chatsounds = MutexGuard::map(guard, |option| option.as_mut().unwrap());

        f(chatsounds).await
    }
}
