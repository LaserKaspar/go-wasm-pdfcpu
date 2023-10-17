// TODO: uses client side download dep
window.global = window;

export const downloadFile = async (filename) => {
    await fs.readFile(filename, function(err, contents) {
        download(new Blob([contents]), filename);
	});
};

export const readFileAsync = (file) => {
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

export const runWasm = async (param) => {
    if (window.cachedWasmResponse === undefined) {
        const response = await fetch("pdfcpu.wasm");
        const buffer = await response.arrayBuffer();
        window.cachedWasmResponse = buffer;
        global.go = new Go();
    }
    const { instance } = await WebAssembly.instantiate(
        window.cachedWasmResponse,
        window.go.importObject
    );
    window.go.argv = param;
    await window.go.run(instance);
    return window.go.exitCode;
};
