// TODO: uses client side download dep
// TODO: Uses the BrowserFS import, needs to be changed for serverside

let fs;
let Buffer;

configureFs();

const downloadFile = async (filename) => {
    await fs.readFile(filename, function(err, contents) {
        download(new Blob([contents]), filename);
	});
};

const readFileAsync = (file) => {
    if(!file.name)
        console.error(file);
    return new Promise((resolve, reject) => {
        console.log(`Writing ${file.name} to disk`);
        if (file.isLoaded) return resolve();

        let reader = new FileReader();
        reader.fileName = file.name;

        reader.onload = async (e) => {
            let data = e.target.result.slice();
            await fs.writeFile(`/${e.target.fileName}`, Buffer.from(data));
            let exitCode = await runWasm([
                "pdfcpu.wasm",
                "validate",
                "-c",
                "disable",
                `/${e.target.fileName}`,
            ]);

            if (exitCode !== 0) return reject();
            file.isLoaded = true;
            resolve(reader.result);
        };

        reader.onerror = reject;

        reader.readAsArrayBuffer(file);
    });
};

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

export async function startNupingFiles(files) {
    for (let i = 0; i < files.length; i++) {
        await readFileAsync(files[i]);

        let newFileName = files[i].name.replace(/\.[^/.]+$/, "") + "-nuped.pdf";

        let exitcode = await runWasm([
            "pdfcpu.wasm",
            "nup",
            "-c",
            "disable",
            'f:' + "A4L",
            newFileName,
            String(2),
            files[i].name,
        ]);

        if (exitcode !== 0) {
            console.error("There was an error nuping your PDFs");
            return;
        }

        await fs.unlink(files[i].name);
        await downloadFile(newFileName);
        await fs.unlink(newFileName);
        console.log("Your File ist Ready!");
    }
    files = [];
    return;
};