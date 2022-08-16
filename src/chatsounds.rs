use std::{
    ops::{Deref, DerefMut},
    pin::Pin,
};

use async_lock::RwLock;
use chatsounds::Chatsounds;
use futures::Future;
use lazy_static::lazy_static;
use wasm_bindgen::JsError;

use crate::Result;

lazy_static! {
    static ref CHATSOUNDS: RwLock<std::result::Result<Chatsounds, String>> =
        RwLock::new(Chatsounds::new().map_err(|e| e.to_string()));
}

pub async fn with<T, F>(f: F) -> Result<T>
where
    F: FnOnce(&Chatsounds) -> Pin<Box<dyn Future<Output = Result<T>> + '_>>,
{
    let guard = CHATSOUNDS.read().await;
    match guard.deref().as_ref() {
        Err(s) => Err(JsError::new(s)),
        Ok(chatsounds) => f(chatsounds).await,
    }
}

pub async fn with_mut<T, F>(f: F) -> Result<T>
where
    F: FnOnce(&mut Chatsounds) -> Pin<Box<dyn Future<Output = Result<T>> + '_>>,
{
    let mut guard = CHATSOUNDS.write().await;
    match guard.deref_mut().as_mut() {
        Err(s) => Err(JsError::new(s)),
        Ok(chatsounds) => f(chatsounds).await,
    }
}
