import * as pdfcpuWraopper from "../wasm/pdfcpu-wrapper-browser.js";

export function impose(snapshot, nup, format) {
    return pdfcpuWraopper.impose(snapshot, nup, format);
}