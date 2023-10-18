import * as pdfcpuWraopper from "../public/wasm/pdfcpu-wrapper-node.js";

export async function impose(snapshot, nup, format) {
    return await pdfcpuWraopper.impose(snapshot, nup, format);
}