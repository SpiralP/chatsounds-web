import init, {
  chatsounds_fetch_and_load_github_api,
  chatsounds_fetch_and_load_github_msgpack,
  chatsounds_init,
  chatsounds_play,
  chatsounds_search,
} from "wasm-test";

async function load() {
  await chatsounds_init();
  console.log("chatsounds_init done");

  for (const [name, path] of [
    ["NotAwesome2/chatsounds", "sounds"],
    ["Metastruct/garrysmod-chatsounds", "sound/chatsounds/autoadd"],
    ["PAC3-Server/chatsounds", "sounds/chatsounds"],
  ]) {
    await chatsounds_fetch_and_load_github_api(name, path);
    console.log("chatsounds_fetch_and_load_github_api done");
  }

  for (const [name, path] of [
    ["PAC3-Server/chatsounds-valve-games", "csgo"],
    ["PAC3-Server/chatsounds-valve-games", "css"],
    ["PAC3-Server/chatsounds-valve-games", "ep1"],
    ["PAC3-Server/chatsounds-valve-games", "ep2"],
    ["PAC3-Server/chatsounds-valve-games", "hl1"],
    ["PAC3-Server/chatsounds-valve-games", "hl2"],
    ["PAC3-Server/chatsounds-valve-games", "l4d"],
    ["PAC3-Server/chatsounds-valve-games", "l4d2"],
    ["PAC3-Server/chatsounds-valve-games", "portal"],
    ["PAC3-Server/chatsounds-valve-games", "tf2"],
  ]) {
    await chatsounds_fetch_and_load_github_msgpack(name, path);
    console.log("chatsounds_fetch_and_load_github_api done");
  }

  const div = document.createElement("div");
  const input = document.createElement("input");
  input.type = "text";
  input.oninput = async () => {
    const results = await chatsounds_search(input.value);
    div.innerText = results;
  };
  input.onkeydown = async (e) => {
    if (e.key === "Enter") {
      await chatsounds_play(input.value);
    }
  };
  document.body.appendChild(input);
  document.body.appendChild(div);
  input.autofocus = true;
}

async function main() {
  console.log("init");
  await init();
  console.log("init done");

  const button = document.createElement("button");
  button.innerText =
    "click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)click!!! :)";
  button.onclick = async () => {
    button.remove();
    await load();
  };
  document.body.appendChild(button);
}

main();
