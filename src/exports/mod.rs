pub mod types;

use ::chatsounds::{GitHubApiTrees, GitHubMsgpackEntries};
use futures::FutureExt;
use rand::rng;
use wasm_bindgen::prelude::*;

use crate::{chatsounds, exports::types::StringArray, log, Result};

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

    chatsounds::with_mut(|_| async move { Ok(()) }.boxed_local()).await
}

#[wasm_bindgen]
pub struct JsGitHubApiTrees(GitHubApiTrees);

#[wasm_bindgen(js_name = fetchGithubApi)]
pub async fn fetch_github_api(name: String, path: String) -> Result<JsGitHubApiTrees> {
    log!("fetch_github_api {:?} {:?}", name, path);

    let data = chatsounds::with(|chatsounds| {
        async move { Ok(chatsounds.fetch_github_api(&name, &path).await?) }.boxed_local()
    })
    .await?;

    Ok(JsGitHubApiTrees(data))
}

#[wasm_bindgen(js_name = loadGithubApi)]
pub async fn load_github_api(name: String, path: String, data: JsGitHubApiTrees) -> Result<()> {
    log!("load_github_api {:?} {:?}", name, path);

    chatsounds::with_mut(|chatsounds| {
        async move { Ok(chatsounds.load_github_api(&name, &path, data.0)?) }.boxed_local()
    })
    .await
}

#[wasm_bindgen]
pub struct JsGitHubMsgpackEntries(GitHubMsgpackEntries);

#[wasm_bindgen(js_name = fetchGithubMsgpack)]
pub async fn fetch_github_msgpack(name: String, path: String) -> Result<JsGitHubMsgpackEntries> {
    log!("fetch_github_msgpack {:?} {:?}", name, path);

    let data = chatsounds::with(|chatsounds| {
        async move { Ok(chatsounds.fetch_github_msgpack(&name, &path).await?) }.boxed_local()
    })
    .await?;

    Ok(JsGitHubMsgpackEntries(data))
}

#[wasm_bindgen(js_name = loadGithubMsgpack)]
pub async fn load_github_msgpack(
    name: String,
    path: String,
    data: JsGitHubMsgpackEntries,
) -> Result<()> {
    log!("load_github_msgpack {:?} {:?}", name, path);

    chatsounds::with_mut(|chatsounds| {
        async move { Ok(chatsounds.load_github_msgpack(&name, &path, data.0)?) }.boxed_local()
    })
    .await
}

#[wasm_bindgen]
pub async fn play(input: String) -> Result<()> {
    log!("play {:?}", &input);

    if input.is_empty() {
        return Ok(());
    }

    chatsounds::with_mut(|chatsounds| {
        async move {
            if input == "sh" {
                chatsounds.stop_all();
            } else {
                chatsounds.play(&input, rng()).await?;
            }

            Ok(())
        }
        .boxed_local()
    })
    .await
}

#[wasm_bindgen]
pub async fn search(input: String) -> Result<StringArray> {
    log!("search {:?}", &input);

    if input.is_empty() {
        return Ok(vec![].try_into()?);
    }

    chatsounds::with(|chatsounds| {
        async move {
            let sentences = chatsounds
                .search(&input)
                .into_iter()
                .map(|(_, sentence)| sentence)
                .collect::<Vec<_>>();

            Ok(sentences.try_into()?)
        }
        .boxed_local()
    })
    .await
}
