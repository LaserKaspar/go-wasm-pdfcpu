// TODO: Uses the BrowserFS import, needs to be changed for serverside
window.global = window;

import {
    downloadFile,
    readFileAsync,
    runWasm,
} from "./Helper.js";

let fs;
let Buffer;

(async () => {
    // Function to handle the selected file and execute the callback
    function handleFileSelection(event) {
        const selectedFile = event.target.files[0];
        
        if (selectedFile) {
            // Here, you can perform any action you want with the selected file.
            // For example, you can display its name or perform file upload operations.

            // For this example, we'll just log the file name.
            startNupingFiles(event.target.files);
            console.log("Selected file: " + selectedFile.name);
        } else {
            console.log("No file selected.");
        }
    }

    configureFs();

    // Attach a change event listener to the file input element
    const fileInput = document.getElementById("fileInput");
    fileInput.addEventListener("change", handleFileSelection);
})();

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
          global.fs = fs;
          global.Buffer = Buffer;

          // load wasm
          const script = document.createElement("script");
          script.src = "wasm_exec.js";
          script.async = true;
          document.body.appendChild(script);
        }
    );
}

async function startNupingFiles(files) {
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