{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    chatsounds-cli-repo = {
      url = "github:SpiralP/chatsounds-cli";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, chatsounds-cli-repo }:
    let
      inherit (nixpkgs) lib;

      nodeManifest = lib.importJSON ./package.json;
      rustManifest = lib.importTOML ./Cargo.toml;

      revSuffix = lib.optionalString (self ? shortRev || self ? dirtyShortRev)
        "-${self.shortRev or self.dirtyShortRev}";

      makePackage = (system: dev:
        let
          pkgs = import nixpkgs {
            inherit system;
          };
          chatsounds-cli = chatsounds-cli-repo.outputs.packages.${system}.default;

          hl1-msgpack = pkgs.fetchurl {
            url = "https://raw.githubusercontent.com/PAC3-Server/chatsounds-valve-games/HEAD/hl1/list.msgpack";
            hash = "sha256-ArdqCFv0wjiElqp6cwRZA/iFuaALr2silJh3STBgCl8=";
          };
          hl1-test-sound = pkgs.fetchurl {
            url = "https://raw.githubusercontent.com/PAC3-Server/chatsounds-valve-games/HEAD/hl1/scientist/ah%20hello%20gordon%20freeman%20its%20good%20to%20see%20you.ogg";
            hash = "sha256-QHHEXW18p2dtH/4ph0XGLZ5uvVokBQf+Njce37QWXnc=";
          };

          # use FC_DEBUG=1024 when running to debug what config files are loaded
          fontconfig = pkgs.runCommand "fontconfig"
            {
              nativeBuildInputs = with pkgs; [ sd ];
            }
            ''
              mkdir -vp "$out/conf.d"
              ln -vs ${pkgs.fontconfig.out}/etc/fonts/conf.d/* "$out/conf.d/"

              cat '${pkgs.fontconfig.out}/etc/fonts/fonts.conf' > "$out/fonts.conf"
              sd --fixed-strings '${pkgs.dejavu_fonts.minimal}' '${pkgs.noto-fonts}' "$out/fonts.conf"
              sd --fixed-strings '/etc/fonts/conf.d' "$out/conf.d" "$out/fonts.conf"
              sd --fixed-strings '/var/cache/fontconfig' "/tmp/fontconfig" "$out/fonts.conf"
            '';
        in
        rec {
          default = pkgs.buildNpmPackage rec {
            pname = nodeManifest.name;
            version = nodeManifest.version + revSuffix;

            src = lib.sourceByRegex ./. [
              "^\.gitignore$"
              # need npmignore or else dist isn't copied
              "^\.npmignore$"
              "^package-lock\.json$"
              "^package\.json$"
              "^web(/.*)?$"
            ];

            npmConfigHook = pkgs.importNpmLock.npmConfigHook;
            npmDeps = pkgs.importNpmLock {
              npmRoot = src;
              packageSourceOverrides = {
                "node_modules/chatsounds-web" = "${wasm}/pkg";
              };
            };

            nativeBuildInputs = (with pkgs; [
              # for tests
              chatsounds-cli
              ffmpeg
              procps
            ])
            ++ (if dev then
              (wasm.nativeBuildInputs ++ (with pkgs; [
                clippy
                rust-analyzer
                (rustfmt.override { asNightly = true; })
              ])) else [ ]);

            buildInputs =
              if dev
              then wasm.buildInputs
              else [ ];

            PUPPETEER_SKIP_DOWNLOAD = true;
            PUPPETEER_EXECUTABLE_PATH = "${lib.getExe pkgs.chromium}";

            postFixup = with pkgs; ''
              wrapProgram $out/bin/chatsounds-web \
                --prefix PATH : ${lib.makeBinPath [ chatsounds-cli ffmpeg ]}
            '';

            FONTCONFIG_FILE = "${fontconfig.out}/fonts.conf";
            FONTCONFIG_PATH = "${fontconfig.out}/";
            doCheck = true;
            preCheck =
              let
                cache-path = (fetched:
                  builtins.concatStringsSep "/" (
                    [ "chatsounds" ] ++
                    builtins.match "(..)(.+)" (
                      builtins.hashString "sha256" (
                        builtins.replaceStrings [ "%20" ] [ " " ] fetched.url
                      )
                    )
                  )
                );
              in
              ''
                mkdir -vp \
                  "$(dirname ${cache-path hl1-msgpack})" \
                  "$(dirname ${cache-path hl1-test-sound})"
                cp -v ${hl1-msgpack} "${cache-path hl1-msgpack}"
                cp -v ${hl1-test-sound} "${cache-path hl1-test-sound}"
                stat ${cache-path hl1-msgpack}
                stat ${cache-path hl1-test-sound}
                chatsounds-cli 'search ah hello gordon freeman its good to see you' | grep 'ah hello gordon freeman its good to see you'
                chatsounds-cli 'ah hello gordon freeman its good to see you'
                ln -vs ../chatsounds web/chatsounds
              '';
            checkPhase = ''
              runHook preCheck
              npm run test
              runHook postCheck
            '';

            meta.mainProgram = "chatsounds-web";
          };

          # version needs to match wasm-bindgen's version in Cargo.toml
          wasm-bindgen-cli = pkgs.wasm-bindgen-cli_0_2_100;

          wasm = pkgs.rustPlatform.buildRustPackage {
            pname = "${rustManifest.package.name}-wasm";
            version = rustManifest.package.version + revSuffix;

            src = lib.sourceByRegex ./. [
              "^\.cargo(/.*)?$"
              "^build\.rs$"
              "^Cargo\.(lock|toml)$"
              "^src(/.*)?$"
            ];

            buildInputs = with pkgs; [
              openssl
              alsa-lib
            ];

            nativeBuildInputs = with pkgs; [
              wasm-pack
              wasm-bindgen-cli
              pkg-config
              rustc-wasm32
              rustc-wasm32.llvmPackages.lld
              cargo
              rustPlatform.bindgenHook
            ];

            # fix "linker `rust-lld` not found"
            CARGO_TARGET_WASM32_UNKNOWN_UNKNOWN_LINKER = "lld";
            # in order to use wasm32-unknown-unknown
            RUSTFLAGS = "--cfg getrandom_backend=\"wasm_js\"";

            buildPhase = ''
              wasm-bindgen --version
              HOME=$TMPDIR RUST_LOG=info wasm-pack -vvvv build --target web --mode no-install
            '';

            doCheck = false;

            installPhase = ''
              mkdir -p $out
              cp -av pkg $out/
            '';

            cargoLock = {
              lockFile = ./Cargo.lock;
              allowBuiltinFetchGit = true;
            };
          };

          docker = pkgs.dockerTools.streamLayeredImage {
            name = "chatsounds-web";
            tag = "latest";

            fakeRootCommands = ''
              mkdir tmp \
                && chmod -v 1777 tmp
            '';
            contents = with pkgs; with pkgs.dockerTools; [
              default

              binSh
              caCertificates
              coreutils
              usrBinEnv
              (fakeNss.override {
                extraPasswdLines = [ "user:x:1000:1000:user:/tmp:/bin/sh" ];
                extraGroupLines = [ "user:x:1000:1000" ];
              })
            ];

            config = {
              Entrypoint = [
                "${pkgs.tini}/bin/tini"
                "--"
              ];
              Cmd = [ (lib.getExe default) ];
              Env = [
                "NODE_ENV=production"
              ];

              ExposedPorts = { "8080/tcp" = { }; };
              User = "1000:1000";
              WorkingDir = "/tmp";
            };
          };
        }
      );
    in
    builtins.foldl' lib.recursiveUpdate { } (builtins.map
      (system: {
        devShells.${system} = makePackage system true;
        packages.${system} = makePackage system false;
      })
      lib.systems.flakeExposed);
}
