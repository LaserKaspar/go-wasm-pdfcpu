# Build pdfcpu for node & browser environments

## Motivation

I am currently working on a new version of Stirling PDF with the option to run operations on the client. The older builds I have are outdated and don't work with latest tech anymorey primarily js running in strict mode wich is required in vite.

## New attempt at building pdfcpu (v0.7.0 dev go1.22.1)

Follow guide to compile pdfcpu-wasm (worked only on linux/wsl from me)

[wcchoi/go-wasm-pdfcpu](https://github.com/wcchoi/go-wasm-pdfcpu/blob/master/article.md) (First two codeblocks)

## Deploying latest stack (nodejs & browser)

Go to built files if not already
`cd .\pdfcpu\cmd\pdfcpu\`

This will allow us to get support for browser & node.

First we need all relevant wasm_execs
`cp /usr/local/go/misc/wasm/* ./`

This will already run in node (without fs):
`node wasm_exec_node.js pdfcpu.wasm`

Change the fetch from "wasm_exec.html" to the correct file now:
```js
	WebAssembly.instantiateStreaming(fetch("pdfcpu.wasm"), go.importObject).then((result) => {
```

Using the static server from the guide ([aolde/static_server.js](https://gist.github.com/aolde/8104861)) and adding wasm to the mime types
```js
    "wasm": "application/wasm",
```

should now make it possible to run in the browser at [http://localhost:8888/wasm_exec.html](http://localhost:8888/wasm_exec.html) (without fs)
`node static_server.js`

## Updateing fs to use [memfs](https://www.npmjs.com/package/memfs)

Just like wasm_exec_node.js is used to overwrite available function we will do the same with wasm_exec_mem.js.
```js
import memfs  from 'https://cdn.jsdelivr.net/npm/memfs@4.8.1/+esm';

globalThis.fs = memfs.fs;

import "./wasm_exec.js";
```

To get the console working we will use the guide from the beginning again: [wcchoi/go-wasm-pdfcpu](https://github.com/wcchoi/go-wasm-pdfcpu/blob/master/article.md)
We will need to add this code to out wasm_exec_memfs.js

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

After some modifications to wasm_exec.html we should be able to see console outputs again:
```js
    import "./wasm_exec_memfs.js";

    if (!WebAssembly.instantiateStreaming) { // polyfill
    	WebAssembly.instantiateStreaming = async (resp, importObject) => {
    		const source = await (await resp).arrayBuffer();
    		return await WebAssembly.instantiate(source, importObject);
    	};
    }

    const go = new Go();
    let mod, inst;
    WebAssembly.instantiateStreaming(fetch("pdfcpu.wasm"), go.importObject).then((result) => {
    	mod = result.module;
    	inst = result.instance;
    	document.getElementById("runButton").disabled = false;
    }).catch((err) => {
    	console.error(err);
    });

    window.run = async () => {
    	console.clear();
    	await go.run(inst);
    	inst = await WebAssembly.instantiate(mod, go.importObject); // reset instance
    }
```

## Fixing a strange error (Hi, it's me from the future, this is probably fixed in a future version of pdfcpu, so if you don't run into this issue, you can skip this part)

We now need to fix this new error: 

```
pdfcpu: config dir problem: permissions is numeric, got: 0xF0C3
```

And I currently have no idea how...

Debugging Steps:

- Tried running wasm in a different runtime: [Wasmtime](https://wasmtime.dev) - Not comparable because it needs wasm was compiled for wasip1 not for js: [StackOverflow](https://stackoverflow.com/questions/76511991/cant-run-a-wasm-file-in-mac-using-wasmtime)
- Bug report on [github](https://github.com/pdfcpu/pdfcpu/issues/845)

Two days later...

Disabling the config-dir should solve the issue. Thanks <ins>[@henrixapp](https://github.com/henrixapp)</ins>!

[configuration.go#L255](https://github.com/pdfcpu/pdfcpu/blob/6e48669a5b3011851bef11c77eb4f17b9eb75874/pkg/pdfcpu/model/configuration.go#L255)
```js
var ConfigPath string = "disable" 
```

## Reading and writing files in memfs

Next we need to implement the Buffer class in the browser to correctly write files in memfs.

Inside of "wasm_exec.html" we will firstly import the Buffer library, then we will add arguments to our pdfcpu process and lastly write the file to wasmfs and then run the previously set command.
```js
import { Buffer } from 'https://cdn.jsdelivr.net/npm/buffer@6.0.3/+esm'
```
```js
go.argv = ['pdfcpu.wasm', 'validate', '/input.pdf'];
```
```js
window.run = async () => {
    console.clear();

    let buffer = await document.getElementById("fileInput").files[0].arrayBuffer();
    await globalThis.fs.promises.writeFile("/input.pdf", Buffer.from(buffer));

    await go.run(inst);
    inst = await WebAssembly.instantiate(mod, go.importObject); // reset instance
}
```

When we run this inside of the browser we will see the validation pass for the first time 🎉!

```
wasm_exec_memfs.js:17 validating(mode=relaxed) /input.pdf ...
wasm_exec_memfs.js:17 validation ok
```