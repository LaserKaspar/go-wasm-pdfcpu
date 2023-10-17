// TODO: uses client side download dep
// TODO: Uses the BrowserFS import, needs to be changed for serverside

let fs;
let Buffer;

configureFs();

async function loadFileAsync(data) {
    console.log(`Writing file to MemoryFS`);
    await fs.writeFile(`/input.pdf`, data);
    let exitCode = await runWasm([
        "pdfcpu.wasm",
        "validate",
        "-c",
        "disable",
        `/input.pdf`,
    ]);

    if (exitCode !== 0) return reject();
}

const runWasm = async (param) => {
    if (window.cachedWasmResponse === undefined) {
        const response = await fetch("pdfcpu.wasm");
        const buffer = await response.arrayBuffer();
        window.cachedWasmResponse = buffer;
        window.go = new Go();
    }
    const { instance } = await WebAssembly.instantiate(
        window.cachedWasmResponse,
        window.go.importObject
    );
    window.go.argv = param;
    await window.go.run(instance);
    return window.go.exitCode;
};

function configureFs() {
    BrowserFS.configure(
        {
          fs: "InMemory",
        },
        function (e) {
          if (e) {
            // An error happened!
            throw e;
          }
          fs = BrowserFS.BFSRequire("fs");
          Buffer = BrowserFS.BFSRequire("buffer").Buffer;
          window.fs = fs;
          window.Buffer = Buffer;

          // load wasm
          const script = document.createElement("script");
          script.src = "wasm_exec.js";
          script.async = true;
          document.body.appendChild(script);
        }
    );
}

export async function nupFile(snapshot, nup, format) {
    await loadFileAsync(snapshot);

    let exitcode = await runWasm([
        "pdfcpu.wasm",
        "nup",
        "-c",
        "disable",
        'f:' + format,
        "output.pdf",
        String(nup),
        "input.pdf",
    ]);

    if (exitcode !== 0) {
        console.error("There was an error nuping your PDFs");
        return;
    }

    await fs.unlink("input.pdf");
    const contents = fs.readFileSync("output.pdf");
    fs.unlink("output.pdf");
    console.log("Your File ist Ready!");
    return contents;
};