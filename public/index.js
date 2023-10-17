import {
    nupFile,
} from "./Helper.js";

(async () => {
    // Function to handle the selected file and execute the callback
    async function handleFileSelection(event) {
        const files = event.target.files;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log("Starting: " + file.name);
            const snap = await readFileToSnapshot(file);
            const result = await nupFile(snap, 2, "A4L");
            download(new Blob([result]), file.name + "_nup.pdf");
        }
    }

    // Attach a change event listener to the file input element
    const fileInput = document.getElementById("fileInput");
    fileInput.addEventListener("change", handleFileSelection);
})();

const readFileToSnapshot = (file) => {
    if(!file.name)  console.error(file);

    return new Promise((resolve, reject) => {
        if (file.isLoaded) return resolve();

        let reader = new FileReader();
        reader.fileName = file.name;

        reader.onload = async (e) => {
            let data = Buffer.from(e.target.result.slice());
            resolve(data);
            file.isLoaded = true;
        };

        reader.onerror = reject;

        reader.readAsArrayBuffer(file);
    });
};
