import { impose } from "./functions/impose.js";
import * as fs from "fs";

// More elegant way to wait for impose to load.
setTimeout(async () => {
    var myArrayBuffer = new Uint16Array(fs.readFileSync("./testfiles/sample.pdf"));
    console.log(myArrayBuffer);
    const data = await impose(myArrayBuffer, 2, "A4L");
    fs.writeFileSync("./testfiles/out/output.pdf", data);
}, 1000);
