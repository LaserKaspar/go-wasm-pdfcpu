import * as pdfcpuWraopper from "../wasm/pdfcpu-wrapper-browser.js";

export async function impose(snapshot, nup, format) {
    return await pdfcpuWraopper.oneToOne([
            "pdfcpu.wasm",
            "nup",
            "-c",
            "disable",
            'f:' + format,
            "/output.pdf",
            String(nup),
            "input.pdf",
        ], snapshot);
}