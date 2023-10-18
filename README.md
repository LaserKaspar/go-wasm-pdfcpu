# go wasm pdfcpu
Extracted & changed to work with the new backend of [Stirling-PDF](https://github.com/Frooodle/Stirling-PDF)
Running in Browser & Node memfs.

## Features

- [pdfcpu](https://github.com/pdfcpu/pdfcpu#pdfcpu-a-go-pdf-processor) wrapper
- pdf-impose example
- Currently only supports one-to-one (one file in - one file out) functions. Other types need to be implemented [here](/public/wasm/pdfcpu-wrapper-browser.js) and [here](/public/wasm/pdfcpu-wrapper-node.js).

## Usage

```> node ./index.js``` (web) or ```> node ./test-func.js``` (node)\
You'll need to figure out the rest.\
(New functions can be made available from [here(web)](/public/functions/) and [here(server)](/functions/), Changing the current func can be done [here(web)](/public/index.js) and [here(node)](/test-func.js))

## THANKS
Thanks for the base of this @julianfbeck:
https://github.com/julianfbeck/localpdfmerger