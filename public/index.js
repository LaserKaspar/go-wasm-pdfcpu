import {
    startNupingFiles,
} from "./Helper.js";

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

    // Attach a change event listener to the file input element
    const fileInput = document.getElementById("fileInput");
    fileInput.addEventListener("change", handleFileSelection);
})();