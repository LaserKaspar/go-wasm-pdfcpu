# Building pdfcpu for node & browser environments

## Motivation

I am currently working on a new version of Stirling PDF with the option to run operations on the client. The older builds of pdfcpu-wasm I have are outdated and don't work with latest tech anymore. To be exact js running in strict mode, wich is a requirement set by vite and therefore Strling PDF.

---

## Attempting to build pdfcpu (v0.7.0 dev go1.22.1)

Follow guide to compile pdfcpu-wasm (worked only on linux/wsl from me)

[Guide: wcchoi/go-wasm-pdfcpu](https://github.com/wcchoi/go-wasm-pdfcpu/blob/master/article.md?plain=1#L19-L35) (First two codeblocks)

## Testing build in nodejs & browser (without fs)

We'll neet to navigate to the files we've just built `cd .\pdfcpu\cmd\pdfcpu\` and copy over all relevant wasm_execs from our local go installation `cp /usr/local/go/misc/wasm/* ./`.

This setup should already run (albeit very limited) in node and you can check if it does by running `node wasm_exec_node.js pdfcpu.wasm`.

To check if it runs correctly in the browser as well we first need to modify some of the files we just copied. "wasm_exec.html" should be updated to fetch the correct wasm file:

```js
WebAssembly.instantiateStreaming(fetch("pdfcpu.wasm"), go.importObject).then((result) => {
```

And we need a way to serve the files to the browser. For testing I used the static_server.js-script ([aolde/static_server.js](https://gist.github.com/aolde/8104861)) as done in the previously mentioned guide and adding wasm to the mime types to allow it serving .wasm.

```js
"wasm": "application/wasm",
```

After running `node static_server.js` we are able to access pdfcpu at [http://localhost:8888/wasm_exec.html](http://localhost:8888/wasm_exec.html) in a browser.

## Updating fs to use in-memory fs

In order to run it in the browser and to stop node from writing files to disk we need an in-memory filesystem compatible with [nodes fs](https://nodejs.org/api/fs.html) like [memfs](https://github.com/streamich/memfs).

Just like wasm_exec_node.js is used to inject node-fs specific functions, we will create a new file for memfs. 

wasm_exec_memfs.js
```js
import memfs  from 'https://cdn.jsdelivr.net/npm/memfs@4.8.1/+esm';

globalThis.fs = memfs.fs;

import "./wasm_exec.js";
```

After some modifications to wasm_exec.html we should be good to go. We'll remove `<script src="wasm_exec.js"></script>` and replace it with an import statement at the beginning of the next script tag `import "./wasm_exec_memfs.js";` importing our new wasm_exec using memfs.

Testing this you will see, that the console output is broken now. To get the console working again, we will use the guide from the beginning again: [Guide: wcchoi/go-wasm-pdfcpu](https://github.com/wcchoi/go-wasm-pdfcpu/blob/master/article.md?plain=1#L359-L392).

Memfs does not seem to forward STDOUT/STDERR of the wasm module. We will need to add this code to wasm_exec_memfs.js in order to do that:

```js
const encoder = new TextEncoder("utf-8");
const decoder = new TextDecoder("utf-8");
let outputBuf = "";
globalThis.fs.writeSyncOriginal = globalThis.fs.writeSync;
globalThis.fs.writeSync = function(fd, buf) {
    if (fd === 1 || fd === 2) {
        outputBuf += decoder.decode(buf);
        const nl = outputBuf.lastIndexOf("\n");
        if (nl != -1) {
            console.log(outputBuf.substr(0, nl));
            outputBuf = outputBuf.substr(nl + 1);
        }
        return buf.length;
    } else {
        return globalThis.fs.writeSyncOriginal(...arguments);
    }
};

globalThis.fs.writeOriginal = globalThis.fs.write;
globalThis.fs.write = function(fd, buf, offset, length, position, callback) {
    if (fd === 1 || fd === 2) {
        if (offset !== 0 || length !== buf.length || position !== null) {
            throw new Error("not implemented");
        }
        const n = this.writeSync(fd, buf);
        callback(null, n, buf);
    } else {
        return globalThis.fs.writeOriginal(...arguments);
    }
};
```

## Possible error: "pdfcpu: config dir problem: permissions is numeric, got: 0xF0C3"

> [!NOTE]  
> Hi, it's me from the future, this is probably fixed in a future version of pdfcpu, so if you don't run into this issue, you can skip this part.

Error: 

```
pdfcpu: config dir problem: permissions is numeric, got: 0xF0C3
```

Debugging Steps:

- Tried running wasm in a different runtime: [Wasmtime](https://wasmtime.dev) - Not comparable because it needs wasm was compiled for wasip1 not for js: [StackOverflow](https://stackoverflow.com/questions/76511991/cant-run-a-wasm-file-in-mac-using-wasmtime)
- Bug report on [github](https://github.com/pdfcpu/pdfcpu/issues/845)

Two days later...

Disabling the config-dir should solve the issue. Thanks <ins>[@henrixapp](https://github.com/henrixapp)</ins>!

[configuration.go#L255](https://github.com/pdfcpu/pdfcpu/blob/6e48669a5b3011851bef11c77eb4f17b9eb75874/pkg/pdfcpu/model/configuration.go#L255)
```js
var ConfigPath string = "disable" 
```

With this out of our way, let's continue!

## Browser

### Reading files from memfs

To pass files into wasm we need to write them to memfs. Writing should be as simple as writing the buffer of the file but in a browser environment we don't have a buffer readily available, so let's install one.

Inside of "wasm_exec.html" we will firstly import a buffer library.
```js
import { Buffer } from 'https://cdn.jsdelivr.net/npm/buffer@6.0.3/+esm'
```
Then we will add arguments to our pdfcpu process:
```js
const go = new Go();
go.argv = ['pdfcpu.wasm', 'validate', '/input.pdf'];
```
Give the user the option to select a file
```html
<input type="file" id="fileInput" />
```
And lastly write the selected file to wasmfs before executing the wasm binary. 
```js
window.run = async () => {
    console.clear();

    let buffer = await document.getElementById("fileInput").files[0].arrayBuffer();
    await globalThis.fs.promises.writeFile("/input.pdf", Buffer.from(buffer));

    await go.run(inst);
    inst = await WebAssembly.instantiate(mod, go.importObject); // reset instance
}
```

After that we are ready to run the command to validate a pdf-file.

We'll see the validation pass for the first time 🎉!

```
wasm_exec_memfs.js:17 validating(mode=relaxed) /input.pdf ...
wasm_exec_memfs.js:17 validation ok
```

### Writing files to memfs

Awesome, now lets try something that would actually write some data. Like wcchoi lets try extracting the first page:

```js
go.argv = ['pdfcpu.wasm', 'trim', '-pages', '1', '/input.pdf', '/output.pdf'];
```

Downloading the file (as well as some cleanup) is as simple as:

```js
globalThis.fs.promises.unlink("/input.pdf");
const result = await globalThis.fs.promises.readFile("/output.pdf");

var blob = new Blob([result], {type: "application/pdf"});
var objectUrl = URL.createObjectURL(blob);
window.open(objectUrl);

globalThis.fs.promises.unlink("/output.pdf");
```

We now have a fully functioning version of pdfcpu inside our browser!

## Node

Lets setup the same thing in nodejs.

### Reading files from memfs

### Writing files to memfs