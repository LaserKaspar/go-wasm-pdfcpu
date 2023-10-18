// uses client side download dep

import { impose } from "./functions/impose.js";

(async () => {
    // Function to handle the selected file and execute the callback
    async function handleFileSelection(event) {
        const files = event.target.files;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log("Starting: " + file.name);
            const snap = new Uint8Array(await file.arrayBuffer());

            const result = await impose(snap, 2, "A4L");

            download(new Blob([result]), file.name + "_nup.pdf");
        }
    }

    // Attach a change event listener to the file input element
    const fileInput = document.getElementById("fileInput");
    fileInput.addEventListener("change", handleFileSelection);
})();
