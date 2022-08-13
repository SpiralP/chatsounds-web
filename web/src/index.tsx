import loadWasm, {
  fetch_and_load_github_api,
  fetch_and_load_github_msgpack,
  play,
  search,
  setup,
} from "chatsounds-web";

async function load() {
  await setup();
  console.log("setup done");

  for (const [name, path] of [
    ["NotAwesome2/chatsounds", "sounds"],
    ["Metastruct/garrysmod-chatsounds", "sound/chatsounds/autoadd"],
    ["PAC3-Server/chatsounds", "sounds/chatsounds"],
  ]) {
    await fetch_and_load_github_api(name, path);
    console.log("fetch_and_load_github_api done");
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
    await fetch_and_load_github_msgpack(name, path);
    console.log("fetch_and_load_github_api done");
  }

  const div = document.createElement("div");
  const input = document.createElement("input");
  input.type = "text";
  input.oninput = async () => {
    const results = await search(input.value);
    div.innerText = results;
  };
  input.onkeydown = async (e) => {
    if (e.key === "Enter") {
      await play(input.value);
    }
  };
  document.body.appendChild(input);
  document.body.appendChild(div);
  input.autofocus = true;
}

async function main() {
  console.log("loadWasm");
  await loadWasm();
  console.log("loadWasm done");

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
